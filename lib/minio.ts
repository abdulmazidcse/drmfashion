import { S3Client } from "@aws-sdk/client-s3";

// Configure the S3 Client for MinIO
export const s3Client = new S3Client({
  region: "us-east-1", // Region is required but doesn't matter for MinIO
  endpoint: process.env.MINIO_ENDPOINT || "http://localhost:9000",
  credentials: {
    accessKeyId: process.env.MINIO_ACCESS_KEY || "admin",
    secretAccessKey: process.env.MINIO_SECRET_KEY || "password123",
  },
  forcePathStyle: true, // Required for MinIO
});
