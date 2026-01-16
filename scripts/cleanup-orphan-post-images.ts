/* scripts/cleanup-orphan-post-images.ts */

//run this ( npx tsx --env-file .env.local scripts/cleanup-orphan-post-images.ts )
//at ( kioh@kioh-Modern-14-B11MOU:~/JEARN/kioh$ ) to check
//are there still unnecessary imgs storing in cdn but not using in any post content

// -----------------------------------------------------------------------------
// ENV SETUP (must be first)
// -----------------------------------------------------------------------------
import dotenv from "dotenv";

// Try .env.local first, fallback to .env
dotenv.config({ path: ".env.local" });
dotenv.config();

function requireEnv(name: string) {
  const v = process.env[name];
  if (!v) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return v;
}

// -----------------------------------------------------------------------------
// IMPORTS
// -----------------------------------------------------------------------------
import clientPromise from "@/lib/mongodb";
import {
  S3Client,
  ListObjectsV2Command,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { extractPostImageKeys } from "@/lib/media/media";

// -----------------------------------------------------------------------------
// CONFIG
// -----------------------------------------------------------------------------
const DRY_RUN = true; // 🔥 SET TO false TO ACTUALLY DELETE

const R2_ACCOUNT_ID = requireEnv("R2_ACCOUNT_ID");
const R2_ACCESS_KEY_ID = requireEnv("R2_ACCESS_KEY_ID");
const R2_SECRET_ACCESS_KEY = requireEnv("R2_SECRET_ACCESS_KEY");
const R2_BUCKET_NAME = requireEnv("R2_BUCKET_NAME");

// -----------------------------------------------------------------------------
// R2 CLIENT
// -----------------------------------------------------------------------------
const r2 = new S3Client({
  region: "auto",
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
  },
});

// -----------------------------------------------------------------------------
// COLLECT USED IMAGE KEYS
// -----------------------------------------------------------------------------
async function getAllUsedImageKeys(): Promise<Set<string>> {
  const client = await clientPromise;
  const db = client.db("jearn");
  const posts = db.collection("posts");

  const used = new Set<string>();

  const cursor = posts.find(
    {},
    { projection: { content: 1, mediaRefs: 1 } }
  );

  for await (const post of cursor) {
    // Prefer authoritative mediaRefs
    if (Array.isArray(post.mediaRefs)) {
      for (const key of post.mediaRefs) {
        if (typeof key === "string" && key.startsWith("posts/")) {
          used.add(key);
        }
      }
      continue;
    }

    // Legacy fallback: parse content
    if (typeof post.content === "string") {
      const keys = extractPostImageKeys(post.content);
      for (const k of keys) used.add(k);
    }
  }

  return used;
}

// -----------------------------------------------------------------------------
// LIST ALL R2 POST IMAGES
// -----------------------------------------------------------------------------
async function getAllR2PostImages(): Promise<string[]> {
  const keys: string[] = [];
  let continuationToken: string | undefined;

  do {
    const res = await r2.send(
      new ListObjectsV2Command({
        Bucket: R2_BUCKET_NAME,
        Prefix: "posts/",
        ContinuationToken: continuationToken,
      })
    );

    for (const obj of res.Contents ?? []) {
      if (obj.Key) keys.push(obj.Key);
    }

    continuationToken = res.NextContinuationToken;
  } while (continuationToken);

  return keys;
}

// -----------------------------------------------------------------------------
// MAIN
// -----------------------------------------------------------------------------
async function main() {
  console.log("🔍 Collecting used image references...");
  const usedKeys = await getAllUsedImageKeys();
  console.log(`✅ Used images: ${usedKeys.size}`);

  console.log("📦 Listing R2 post images...");
  const allKeys = await getAllR2PostImages();
  console.log(`📦 Total images in R2/posts/: ${allKeys.length}`);

  const orphaned = allKeys.filter((k) => !usedKeys.has(k));
  console.log(`🧹 Orphaned images: ${orphaned.length}`);

  if (orphaned.length === 0) {
    console.log("🎉 Nothing to delete");
    return;
  }

  for (const key of orphaned) {
    if (!key.startsWith("posts/")) continue;

    if (DRY_RUN) {
      console.log(`[DRY RUN] Would delete: ${key}`);
    } else {
      try {
        await r2.send(
          new DeleteObjectCommand({
            Bucket: R2_BUCKET_NAME,
            Key: key,
          })
        );
        console.log(`🗑️ Deleted: ${key}`);
      } catch (err) {
        console.error(`❌ Failed to delete ${key}`, err);
      }
    }
  }

  console.log(
    DRY_RUN
      ? "🧪 Dry run complete. Set DRY_RUN=false to delete."
      : "🔥 Cleanup complete."
  );
}

main().catch((err) => {
  console.error("🔥 Cleanup failed:", err);
  process.exit(1);
});
