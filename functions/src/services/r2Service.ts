import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import pino from 'pino';

const logger = pino();

const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID || '';
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID || '';
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY || '';
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME || '';

let s3Client: S3Client | null = null;

if (R2_ACCOUNT_ID && R2_ACCESS_KEY_ID && R2_SECRET_ACCESS_KEY) {
  s3Client = new S3Client({
    region: 'auto',
    endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: R2_ACCESS_KEY_ID,
      secretAccessKey: R2_SECRET_ACCESS_KEY,
    },
  });
  logger.info('✅ Cloudflare R2 Client initialized');
} else {
  logger.warn('⚠️ Cloudflare R2 credentials missing. Media upload will not work.');
}

/**
 * Generates a presigned URL for uploading a file directly to Cloudflare R2
 * @param filename The final path/filename in the bucket (e.g. "declarations/audio1.mp3")
 * @param contentType The MIME type (e.g. "audio/mpeg")
 * @returns The presigned URL to PUT the file to
 */
export const generateUploadUrl = async (filename: string, contentType: string): Promise<string> => {
  if (!s3Client) {
    throw new Error('Cloudflare R2 is not configured on the server.');
  }

  const command = new PutObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: filename,
    ContentType: contentType,
  });

  // URL valid for 1 hour
  const url = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
  return url;
};

/**
 * Directly uploads a buffer to Cloudflare R2 from the backend.
 * @param filename The path/filename to save as
 * @param fileBuffer The file buffer
 * @param contentType The MIME type
 */
export const uploadFile = async (filename: string, fileBuffer: Buffer, contentType: string): Promise<void> => {
  if (!s3Client) throw new Error('Cloudflare R2 is not configured.');

  const command = new PutObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: filename,
    Body: fileBuffer,
    ContentType: contentType,
  });

  await s3Client.send(command);
  logger.info(`✅ Uploaded ${filename} to R2 directly`);
};

/**
 * Deletes a file from Cloudflare R2
 * @param filename The exact path/filename in the bucket
 */
export const deleteFile = async (filename: string): Promise<void> => {
  if (!s3Client) throw new Error('Cloudflare R2 is not configured.');

  const command = new DeleteObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: filename,
  });

  await s3Client.send(command);
  logger.info(`🗑️ Deleted ${filename} from R2`);
};
