import { S3Client, DeleteObjectCommand } from "@aws-sdk/client-s3";

const r2 = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

export async function deleteMediaUrls(urls: string[]) {
  console.error("🧹 [deleteMediaUrls] CALLED", urls);
  console.log("🧹 [deleteMediaUrls] CALLED");
  console.log("🧹 [deleteMediaUrls] urls:", urls);

  const rawCDN = process.env.R2_PUBLIC_URL;
  const bucket = process.env.R2_BUCKET_NAME;

  if (!rawCDN || !bucket) {
    console.error("❌ [deleteMediaUrls] Missing ENV");
    return;
  }

  // ✅ normalize CDN once
  const CDN = rawCDN.replace(/\/+$/, "");

  console.log("🧹 [deleteMediaUrls] ENV", {
    CDN,
    bucket,
    hasAccountId: !!process.env.R2_ACCOUNT_ID,
    hasAccessKey: !!process.env.R2_ACCESS_KEY_ID,
  });

  if (!CDN || !bucket) {
    console.error("❌ [deleteMediaUrls] Missing ENV");
    return;
  }

  for (const url of urls) {
    try {
      const normalizedUrl = url.replace(/\/+$/, "");

      console.log("➡️ processing:", normalizedUrl);

      if (!normalizedUrl.startsWith(CDN + "/")) {
        console.warn("⏭️ skipped (not CDN):", normalizedUrl);
        continue;
      }

      const key = new URL(normalizedUrl).pathname.replace(/^\/+/, "");

      if (!key.startsWith("posts/")) {
        console.warn("⏭️ skipped (not posts/*):", key);
        continue;
      }

      console.log("🗑️ deleting:", key);

      await r2.send(
        new DeleteObjectCommand({
          Bucket: bucket,
          Key: key,
        })
      );

      console.log("✅ deleted:", key);
    } catch (err) {
      console.error("❌ delete failed:", url, err);
    }
  }

  console.log("🧹 [deleteMediaUrls] DONE");
}
