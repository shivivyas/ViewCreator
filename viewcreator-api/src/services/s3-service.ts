import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

// Initialize S3 Client
export const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },
});

/**
 * Uploads a generated image/video to S3 for persistent storage.
 * @returns The public S3 URL of the uploaded file.
 */
export async function uploadToS3(
  dataUri: string,
  userId: string,
  mediaType: 'image' | 'video'
): Promise<string> {
  const bucketName = process.env.AWS_S3_BUCKET;
  if (!bucketName) {
    throw new Error('S3 bucket name is not configured. Please check the AWS_S3_BUCKET setting.');
  }

  const mimePrefix = mediaType === 'video' ? 'video' : 'image';
  const match = dataUri.match(new RegExp(`^data:(${mimePrefix}\\/[\\w.+-]+);base64,(.+)$`));
  if (!match) {
    throw new Error(`Invalid base64 ${mediaType} data format`);
  }

  const mimeType = match[1];
  const base64Data = match[2];
  const buffer = Buffer.from(base64Data, 'base64');
  const extMatch = mimeType.split('/')[1];
  const extension = extMatch?.replace('webp', 'webp').replace('jpeg', 'jpg') || (mediaType === 'video' ? 'mp4' : 'png');
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 9);
  const s3Key = `generations/${userId}/${mediaType}/${timestamp}-${random}.${extension}`;

  await s3Client.send(
    new PutObjectCommand({
      Bucket: bucketName,
      Key: s3Key,
      Body: buffer,
      ContentType: mimeType,
    })
  );

  const region = process.env.AWS_REGION || 'us-east-1';
  return `https://${bucketName}.s3.${region}.amazonaws.com/${s3Key}`;
}

/**
 * Downloads a public S3 template image and converts it to base64 format for Gemini
 */
export async function fetchS3ImageAsBase64(url: string): Promise<{ mimeType: string; data: string }> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch template image from S3: ${response.statusText}`);
  }
  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const mimeType = response.headers.get('content-type') || 'image/webp';
  const data = buffer.toString('base64');
  return { mimeType, data };
}
