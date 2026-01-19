/* scripts/cleanup-orphan-post-images.ts */

import dotenv from "dotenv";
import { MongoClient } from "mongodb";
import {
  S3Client,
  ListObjectsV2Command,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";

// -----------------------------------------------------------------------------
// ENV (ONLY R2)
/// -----------------------------------------------------------------------------
dotenv.config({ path: ".env.local" });
dotenv.config();

function requireEnv(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
}

// -----------------------------------------------------------------------------
// HARD-CODED Mongo (local replica)
// -----------------------------------------------------------------------------
const MONGODB_URI =
  "mongodb://127.0.0.1:27018/test?replicaSet=rs0&directConnection=true";

// -----------------------------------------------------------------------------
// CONFIG
// -----------------------------------------------------------------------------
const DRY_RUN = false;

// -----------------------------------------------------------------------------
// R2 Client
// -----------------------------------------------------------------------------
const R2 = new S3Client({
  region: "auto",
  endpoint: `https://${requireEnv("R2_ACCOUNT_ID")}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: requireEnv("R2_ACCESS_KEY_ID"),
    secretAccessKey: requireEnv("R2_SECRET_ACCESS_KEY"),
  },
});

const BUCKET = requireEnv("R2_BUCKET_NAME");

// -----------------------------------------------------------------------------
// Extract keys from HTML manually
// -----------------------------------------------------------------------------
function extractKeys(html: string): string[] {
  const regex = /posts\/[a-zA-Z0-9_\-./]+/g;
  return html.match(regex) ?? [];
}

// -----------------------------------------------------------------------------
// Used image keys from Mongo
// -----------------------------------------------------------------------------
async function getUsedKeys() {
  const client = new MongoClient(MONGODB_URI);
  await client.connect();

  const posts = client.db("jearn").collection("posts");
  const used = new Set<string>();

  for await (const p of posts.find({}, { projection: { content: 1, mediaRefs: 1 } })) {
    if (Array.isArray(p.mediaRefs)) {
      p.mediaRefs.forEach((k: string) => k.startsWith("posts/") && used.add(k));
      continue;
    }

    if (typeof p.content === "string") {
      extractKeys(p.content).forEach((k) => used.add(k));
    }
  }

  await client.close();
  return used;
}

// -----------------------------------------------------------------------------
// List all R2 post images
// -----------------------------------------------------------------------------
async function getAllR2() {
  const keys: string[] = [];
  let token: string | undefined;

  do {
    const res = await R2.send(
      new ListObjectsV2Command({
        Bucket: BUCKET,
        Prefix: "posts/",
        ContinuationToken: token,
      }),
    );

    res.Contents?.forEach((o) => o.Key && keys.push(o.Key));
    token = res.NextContinuationToken;
  } while (token);

  return keys;
}

// -----------------------------------------------------------------------------
// MAIN
// -----------------------------------------------------------------------------
(async () => {
  console.log("🔍 Loading used keys...");
  const used = await getUsedKeys();
  console.log("✅ Used:", used.size);

  console.log("📦 Listing R2...");
  const all = await getAllR2();
  console.log("📦 Total:", all.length);

  const orphan = all.filter((k) => !used.has(k));
  console.log("🧹 Orphan:", orphan.length);

  for (const key of orphan) {
    if (DRY_RUN) {
      console.log("[DRY]", key);
    } else {
      await R2.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }));
      console.log("🗑 Deleted:", key);
    }
  }

  console.log("🎉 Done");
})();
