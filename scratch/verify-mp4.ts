import { GetObjectCommand } from "@aws-sdk/client-s3";
import { s3Client } from "@/lib/minio";

async function main() {
  const bucketName = process.env.MINIO_BUCKET_NAME || "fashion-store-bucket";
  const key = "fashion-1784543230073-591885608.mp4";

  console.log(`Downloading first 100 bytes of ${key} from MinIO...`);

  try {
    const response = await s3Client.send(
      new GetObjectCommand({
        Bucket: bucketName,
        Key: key
      })
    );

    if (!response.Body) {
      console.error("No body in response");
      return;
    }

    const stream = response.Body as any;
    
    // Read first chunk
    const chunks: any[] = [];
    let bytesRead = 0;
    
    for await (const chunk of stream) {
      chunks.push(chunk);
      bytesRead += chunk.length;
      if (bytesRead >= 100) break;
    }

    const buffer = Buffer.concat(chunks);
    console.log(`Successfully read ${buffer.length} bytes.`);
    console.log("Hex representation:");
    console.log(buffer.slice(0, 50).toString("hex"));
    console.log("String representation:");
    console.log(buffer.slice(0, 50).toString("ascii").replace(/[^ -~]/g, "."));

    // Check for MP4 signature (usually 'ftyp' at offset 4)
    const hasFtyp = buffer.slice(4, 8).toString("ascii") === "ftyp";
    console.log(`Valid MP4 'ftyp' signature found: ${hasFtyp}`);
  } catch (error: any) {
    console.error("Error reading file:", error.message || error);
  }
}

main();
