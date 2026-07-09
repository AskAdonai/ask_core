import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import pino from 'pino';

const logger = pino();

let s3Client: S3Client | null = null;
let warnedMissingCredentials = false;

function getBucketName(): string {
  return process.env.R2_BUCKET_NAME || '';
}

function getS3Client(): S3Client {
  if (s3Client) return s3Client;

  const accountId = process.env.R2_ACCOUNT_ID || '';
  const accessKeyId = process.env.R2_ACCESS_KEY_ID || '';
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY || '';

  if (!accountId || !accessKeyId || !secretAccessKey) {
    if (!warnedMissingCredentials) {
      logger.warn('Cloudflare R2 credentials missing. Media upload will not work.');
      warnedMissingCredentials = true;
    }
    throw new Error('Cloudflare R2 is not configured on the server.');
  }

  s3Client = new S3Client({
    region: 'auto',
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
    // Browser PUTs cannot send SDK checksum headers embedded in presigned URLs.
    requestChecksumCalculation: 'WHEN_REQUIRED',
    responseChecksumValidation: 'WHEN_REQUIRED',
  });
  logger.info('Cloudflare R2 client initialized');
  return s3Client;
}

/**
 * Generates a presigned URL for uploading a file directly to Cloudflare R2
 * @param filename The final path/filename in the bucket (e.g. "declarations/audio1.mp3")
 * @param contentType The MIME type (e.g. "audio/mpeg")
 * @returns The presigned URL to PUT the file to
 */
export const generateUploadUrl = async (filename: string, contentType: string): Promise<string> => {
  const client = getS3Client();
  const bucket = getBucketName();

  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: filename,
    ContentType: contentType,
  });

  // URL valid for 1 hour
  const url = await getSignedUrl(client, command, { expiresIn: 3600 });
  return url;
};

export function sanitizeObjectFilename(filename: string): string {
  const base = filename.split(/[/\\]/).pop() || 'upload.bin';
  const cleaned = base.replace(/[^a-zA-Z0-9._-]/g, '_');
  return cleaned || 'upload.bin';
}

export function sanitizeResourceSegment(value: string): string {
  const cleaned = value.trim().replace(/[^a-zA-Z0-9._-]/g, '_');
  return cleaned || 'resource';
}

export function extensionFromFilename(filename: string): string {
  const match = sanitizeObjectFilename(filename).match(/\.([a-zA-Z0-9]+)$/);
  return match ? match[1].toLowerCase() : '';
}

export function extensionFromContentType(contentType: string): string {
  const normalized = contentType.split(';')[0].trim().toLowerCase();
  const map: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/jpg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/gif': 'gif',
    'audio/mpeg': 'mp3',
    'audio/mp3': 'mp3',
    'audio/wav': 'wav',
    'audio/x-wav': 'wav',
    'audio/mp4': 'm4a',
    'audio/aac': 'aac',
    'audio/ogg': 'ogg',
    'audio/webm': 'webm',
  };
  return map[normalized] || 'bin';
}

function normalizeExtension(ext: string, fallback: string): string {
  const safe = ext.replace(/[^a-z0-9]/gi, '').toLowerCase();
  return safe || fallback;
}

export function buildQuestIntroKey(weekNumber: number, ext: string): string {
  const safeExt = normalizeExtension(ext, 'jpg');
  return `uploads/quests/${weekNumber}/intro.${safeExt}`;
}

export function buildPrayerAudioKey(themeId: string, prayerId: string, ext: string): string {
  const safeExt = normalizeExtension(ext, 'mp3');
  return `uploads/prayers/${sanitizeResourceSegment(themeId)}/${sanitizeResourceSegment(prayerId)}/declaration.${safeExt}`;
}

export function buildKnockPrayerAudioKey(themeId: string, prayerId: string, ext: string): string {
  const safeExt = normalizeExtension(ext, 'mp3');
  return `uploads/prayers/${sanitizeResourceSegment(themeId)}/${sanitizeResourceSegment(prayerId)}/prayer-audio.${safeExt}`;
}

export function buildDevotionAudioKey(
  stage: number,
  day: number,
  ext: string,
): string {
  const safeExt = normalizeExtension(ext, 'mp3');
  return `uploads/devotion/stage${stage}/day${day}/audio.${safeExt}`;
}

export function buildDevotionDeclarationAudioKey(
  stage: number,
  day: number,
  ext: string,
): string {
  const safeExt = normalizeExtension(ext, 'mp3');
  return `uploads/devotion/stage${stage}/day${day}/declaration.${safeExt}`;
}

export function buildDevotionImageKey(
  stage: number,
  day: number,
  ext: string,
): string {
  const safeExt = normalizeExtension(ext, 'jpg');
  return `uploads/devotion/stage${stage}/day${day}/image.${safeExt}`;
}

export function buildObjectKey(mediaId: string, filename: string): string {
  return `uploads/${mediaId}/${sanitizeObjectFilename(filename)}`;
}

export function resolveUploadObjectKey(params: {
  filename: string;
  contentType: string;
  scope?: string;
  weekNumber?: number;
  themeId?: string;
  prayerId?: string;
  journeyStage?: number;
  dayIndex?: number;
  deliveryOrder?: number;
  randomId?: string;
}): string {
  const ext = extensionFromFilename(params.filename) || extensionFromContentType(params.contentType);

  switch (params.scope) {
    case 'quest-intro': {
      const week = Number(params.weekNumber);
      if (!Number.isFinite(week) || week < 1) {
        throw new Error('weekNumber is required for quest-intro uploads');
      }
      return buildQuestIntroKey(week, ext);
    }
    case 'prayer-audio': {
      if (!params.themeId?.trim() || !params.prayerId?.trim()) {
        throw new Error('themeId and prayerId are required for prayer-audio uploads');
      }
      return buildPrayerAudioKey(params.themeId, params.prayerId, ext);
    }
    case 'knock-prayer-audio': {
      if (!params.themeId?.trim() || !params.prayerId?.trim()) {
        throw new Error('themeId and prayerId are required for knock-prayer-audio uploads');
      }
      return buildKnockPrayerAudioKey(params.themeId, params.prayerId, ext);
    }
    case 'devotion-audio': {
      const stage = Number(params.journeyStage);
      const day = Number(params.deliveryOrder ?? params.dayIndex);
      if (!Number.isFinite(stage) || stage < 1 || !Number.isFinite(day) || day < 1) {
        throw new Error('journeyStage and deliveryOrder (or dayIndex) are required for devotion-audio uploads');
      }
      return buildDevotionAudioKey(stage, day, ext);
    }
    case 'devotion-declaration-audio': {
      const stage = Number(params.journeyStage);
      const day = Number(params.deliveryOrder ?? params.dayIndex);
      if (!Number.isFinite(stage) || stage < 1 || !Number.isFinite(day) || day < 1) {
        throw new Error('journeyStage and deliveryOrder (or dayIndex) are required for devotion-declaration-audio uploads');
      }
      return buildDevotionDeclarationAudioKey(stage, day, ext);
    }
    case 'devotion-image': {
      const stage = Number(params.journeyStage);
      const day = Number(params.deliveryOrder ?? params.dayIndex);
      if (!Number.isFinite(stage) || stage < 1 || !Number.isFinite(day) || day < 1) {
        throw new Error('journeyStage and deliveryOrder (or dayIndex) are required for devotion-image uploads');
      }
      return buildDevotionImageKey(stage, day, ext);
    }
    default: {
      if (!params.randomId) {
        throw new Error('randomId is required for generic uploads');
      }
      return buildObjectKey(params.randomId, params.filename);
    }
  }
}

export function objectKeyFromPublicUrl(publicUrl: string): string | null {
  const base = process.env.R2_PUBLIC_URL?.trim();
  if (!base || !publicUrl?.trim()) return null;

  const host = base.replace(/^https?:\/\//, '').replace(/\/$/, '');
  try {
    const url = new URL(publicUrl.trim());
    if (url.hostname !== host && !url.hostname.endsWith(`.${host}`)) {
      return null;
    }
    const key = url.pathname.replace(/^\//, '');
    return key || null;
  } catch {
    return null;
  }
}

export async function deleteReplacedMediaUrl(
  oldUrl: string | undefined,
  newUrl: string | undefined,
): Promise<void> {
  const previous = oldUrl?.trim();
  const next = newUrl?.trim();
  if (!previous || !next || previous === next) return;

  const key = objectKeyFromPublicUrl(previous);
  if (!key) return;

  try {
    await deleteFile(key);
  } catch (error) {
    logger.warn({ error, key }, 'Failed to delete replaced media file from R2');
  }
}

export function getPublicUrl(objectKey: string): string {
  const base = process.env.R2_PUBLIC_URL?.trim();
  if (!base) {
    throw new Error('R2_PUBLIC_URL is not configured on the server.');
  }
  const host = base.replace(/^https?:\/\//, '').replace(/\/$/, '');
  const key = objectKey.replace(/^\//, '');
  return `https://${host}/${key}`;
}

export function mediaTypeFromContentType(contentType: string): 'audio' | 'image' | 'video' {
  if (contentType.startsWith('image/')) return 'image';
  if (contentType.startsWith('video/')) return 'video';
  return 'audio';
}

/**
 * Directly uploads a buffer to Cloudflare R2 from the backend.
 * @param filename The path/filename to save as
 * @param fileBuffer The file buffer
 * @param contentType The MIME type
 */
export const uploadFile = async (filename: string, fileBuffer: Buffer, contentType: string): Promise<void> => {
  const client = getS3Client();
  const bucket = getBucketName();

  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: filename,
    Body: fileBuffer,
    ContentType: contentType,
  });

  await client.send(command);
  logger.info(`Uploaded ${filename} to R2 directly`);
};

/**
 * Deletes a file from Cloudflare R2
 * @param filename The exact path/filename in the bucket
 */
export const deleteFile = async (filename: string): Promise<void> => {
  const client = getS3Client();
  const bucket = getBucketName();

  const command = new DeleteObjectCommand({
    Bucket: bucket,
    Key: filename,
  });

  await client.send(command);
  logger.info(`Deleted ${filename} from R2`);
};
