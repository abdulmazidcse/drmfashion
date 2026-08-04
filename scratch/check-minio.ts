import { HeadObjectCommand } from "@aws-sdk/client-s3";
import { s3Client } from "@/lib/minio";

async function main() {
  const bucketName = process.env.MINIO_BUCKET_NAME || "fashion-store-bucket";
  const key = "fashion-1784543230073-591885608.mp4";

  console.log(`Checking object metadata in MinIO: Bucket=${bucketName}, Key=${key}`);

  try {
    const meta = await s3Client.send(
      new HeadObjectCommand({
        Bucket: bucketName,
        Key: key
      })
    );

    console.log("Object details:");
    console.log(`- Size: ${meta.ContentLength} bytes`);
    console.log(`- ContentType: ${meta.ContentType}`);
    console.log(`- Metadata:`, meta.Metadata);
  } catch (error: any) {
    console.error("Error retrieving object metadata:", error.message || error);
  }
}

main();
