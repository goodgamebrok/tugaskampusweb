import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import sharp from "sharp";
import crypto from "crypto";

// Ensure environment variables are loaded (usually happens in index.ts)
// Requires: R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME, R2_PUBLIC_URL

const getS3Client = () => {
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;

  if (!accountId || !accessKeyId || !secretAccessKey) {
    throw new Error("Missing R2 credentials in environment variables.");
  }

  return new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  });
};

export async function processAndUploadAvatar(buffer: Buffer): Promise<string> {
  const bucketName = process.env.R2_BUCKET_NAME;
  const publicUrl = process.env.R2_PUBLIC_URL;

  if (!bucketName || !publicUrl) {
    throw new Error("Missing R2 bucket configuration (R2_BUCKET_NAME or R2_PUBLIC_URL).");
  }

  // Process image with Sharp: resize to 256x256, convert to webp, compress
  const processedBuffer = await sharp(buffer)
    .resize(256, 256, { fit: "cover", position: "center" })
    .webp({ quality: 80 })
    .toBuffer();

  const fileHash = crypto.createHash("md5").update(processedBuffer).digest("hex").substring(0, 10);
  const fileName = `fotouser/${Date.now()}-${fileHash}.webp`;

  const client = getS3Client();

  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: fileName,
    Body: processedBuffer,
    ContentType: "image/webp",
  });

  await client.send(command);

  // Return the public URL
  // Make sure publicUrl doesn't have a trailing slash
  const baseUrl = publicUrl.endsWith("/") ? publicUrl.slice(0, -1) : publicUrl;
  return `${baseUrl}/${fileName}`;
}
