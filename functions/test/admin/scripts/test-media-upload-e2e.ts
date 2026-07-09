/**
 * End-to-end media upload test (presigned URL → direct R2 PUT).
 *
 * Usage:
 *   npx ts-node test/admin/scripts/test-media-upload-e2e.ts
 *
 * Requires R2 credentials in functions/.env and config in .env.yaml.
 */
import type { Server } from 'http';
import { loadLocalEnv } from '../../../src/config/loadLocalEnv';
import { initializeApp, getApps } from 'firebase-admin/app';
import { S3Client, DeleteObjectCommand } from '@aws-sdk/client-s3';

loadLocalEnv();

const PORT = parseInt(process.env.ADMIN_LOCAL_PORT || '8791', 10);
const DASHBOARD_ORIGIN = process.env.TEST_UPLOAD_ORIGIN || 'https://dashboard.askadonai.com';
const USE_PRODUCTION_API = process.env.TEST_AGAINST_PRODUCTION === 'true';
const PRODUCTION_API_BASE =
  process.env.ADMIN_API_URL || 'https://us-central1-askwhatsappbot.cloudfunctions.net/adminApi/admin';

// 1x1 JPEG
const TEST_JPEG = Buffer.from(
  '/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////2wBDAf//////////////////////////////////////////////////////////////////////////////////////wAARCAABAAEDASIAAhEBAxEB/8QAFwABAQEBAAAAAAAAAAAAAAAAAAUGB//EABQBAQAAAAAAAAAAAAAAAAAAAAD/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIQAxAAAAGfAP/EABQRAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQIBAT8Cf//EABQRAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQMBAT8Cf//Z',
  'base64',
);

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function startAdminApi(): Promise<Server> {
  process.env.ADMIN_AUTH_BYPASS = 'true';
  process.env.ADMIN_AUTH_BYPASS_ROLE = 'editor';

  if (!getApps().length) {
    initializeApp({
      projectId: process.env.GOOGLE_CLOUD_PROJECT || process.env.FIREBASE_PROJECT_ID || 'askwhatsappbot',
    });
  }

  const { createAdminApp } = await import('../../../src/admin/adminApp');
  const app = createAdminApp();

  return new Promise((resolve, reject) => {
    const server = app.listen(PORT, () => resolve(server));
    server.on('error', reject);
  });
}

async function tryConfigureR2Cors(): Promise<void> {
  const accountId = process.env.R2_ACCOUNT_ID;
  const bucket = process.env.R2_BUCKET_NAME;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  const origins = (process.env.ALLOWED_ADMIN_ORIGINS || DASHBOARD_ORIGIN)
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);

  if (!accountId || !bucket || !accessKeyId || !secretAccessKey) return;

  try {
    const { PutBucketCorsCommand } = await import('@aws-sdk/client-s3');
    const client = new S3Client({
      region: 'auto',
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: { accessKeyId, secretAccessKey },
    });
    await client.send(
      new PutBucketCorsCommand({
        Bucket: bucket,
        CORSConfiguration: {
          CORSRules: [
            {
              AllowedHeaders: ['*'],
              AllowedMethods: ['GET', 'PUT', 'POST', 'DELETE', 'HEAD'],
              AllowedOrigins: origins,
              ExposeHeaders: ['ETag'],
              MaxAgeSeconds: 3600,
            },
          ],
        },
      }),
    );
    console.log(`  R2 CORS updated for: ${origins.join(', ')}`);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.warn(`  Warning: could not set R2 CORS (${message}) — check Cloudflare dashboard if browser upload fails`);
  }
}

async function deleteObject(key: string): Promise<void> {
  const accountId = process.env.R2_ACCOUNT_ID;
  const bucket = process.env.R2_BUCKET_NAME;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  if (!accountId || !bucket || !accessKeyId || !secretAccessKey) return;

  const client = new S3Client({
    region: 'auto',
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
  });

  await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
}

async function main() {
  if (!process.env.R2_ACCESS_KEY_ID || !process.env.R2_SECRET_ACCESS_KEY) {
    throw new Error('R2 credentials missing in functions/.env — cannot run e2e upload test');
  }

  const authToken = process.env.FIREBASE_ID_TOKEN;
  if (USE_PRODUCTION_API && !authToken) {
    throw new Error('Set FIREBASE_ID_TOKEN when TEST_AGAINST_PRODUCTION=true');
  }

  console.log('Step 1/5: Try configuring R2 bucket CORS...');
  await tryConfigureR2Cors();

  let server: Server | null = null;
  const apiBase = USE_PRODUCTION_API ? PRODUCTION_API_BASE : `http://localhost:${PORT}/admin`;

  if (!USE_PRODUCTION_API) {
    console.log('Step 2/5: Start local admin API...');
    server = await startAdminApi();
    console.log(`  Listening on ${apiBase}`);
  } else {
    console.log('Step 2/5: Using production admin API...');
    console.log(`  ${apiBase}`);
  }

  let objectKey = '';

  try {
    console.log('Step 3/5: Request presigned upload URL...');
    const signatureRes = await fetch(`${apiBase}/media/upload-url`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: USE_PRODUCTION_API ? `Bearer ${authToken}` : 'Bearer test-token',
        Origin: DASHBOARD_ORIGIN,
      },
      body: JSON.stringify({
        filename: `e2e-test-${Date.now()}.jpg`,
        contentType: 'image/jpeg',
      }),
    });

    if (!signatureRes.ok) {
      const body = await signatureRes.text();
      throw new Error(`upload-url failed (${signatureRes.status}): ${body}`);
    }

    const { uploadUrl, publicUrl, mediaId, filename } = (await signatureRes.json()) as {
      uploadUrl: string;
      publicUrl?: string;
      mediaId?: string;
      filename?: string;
    };

    if (!uploadUrl?.includes('r2.cloudflarestorage.com')) {
      throw new Error(`Unexpected uploadUrl host: ${uploadUrl}`);
    }

    // Production may still be on the old contract until redeployed.
    if (!publicUrl || !mediaId || !filename) {
      throw new Error(
        `upload-url missing fields (publicUrl/mediaId/filename). Redeploy adminApi — got: ${JSON.stringify({ publicUrl, mediaId, filename })}`,
      );
    }

    objectKey = filename;
    console.log(`  mediaId=${mediaId}`);
    console.log(`  objectKey=${objectKey}`);

    console.log('Step 4/5: PUT to R2 (server-side, no CORS)...');
    const putRes = await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': 'image/jpeg',
      },
      body: TEST_JPEG,
    });

    if (!putRes.ok) {
      const body = await putRes.text();
      throw new Error(
        `R2 PUT failed (${putRes.status}): ${body}. Check R2 API token has Object Write permission on bucket "${process.env.R2_BUCKET_NAME}".`,
      );
    }
    console.log(`  R2 PUT OK (${putRes.status})`);

    console.log('Step 5/5: Browser CORS preflight + public URL check...');
    const preflight = await fetch(uploadUrl, {
      method: 'OPTIONS',
      headers: {
        Origin: DASHBOARD_ORIGIN,
        'Access-Control-Request-Method': 'PUT',
        'Access-Control-Request-Headers': 'content-type',
      },
    });

    const allowOrigin = preflight.headers.get('access-control-allow-origin');
    if (!allowOrigin) {
      throw new Error(
        'R2 bucket CORS is not configured for the dashboard origin. In Cloudflare: R2 → bucket → Settings → CORS → allow PUT from https://dashboard.askadonai.com',
      );
    }
    console.log(`  CORS allow-origin: ${allowOrigin}`);

    const publicRes = await fetch(publicUrl, { method: 'GET' });
    if (!publicRes.ok) {
      throw new Error(`Public URL not reachable (${publicRes.status}): ${publicUrl}`);
    }
    const contentType = publicRes.headers.get('content-type') || '';
    if (!contentType.includes('image')) {
      throw new Error(`Public URL returned unexpected content-type: ${contentType}`);
    }

    console.log('\n✅ Media upload e2e test passed');
    console.log(`   Presigned URL → R2 PUT → ${publicUrl}`);
  } finally {
    if (server) {
      await new Promise<void>((resolve) => server!.close(() => resolve()));
    }
    if (objectKey) {
      try {
        await deleteObject(objectKey);
        console.log(`   Cleaned up test object: ${objectKey}`);
      } catch (err) {
        console.warn(`   Could not delete test object ${objectKey}:`, err);
      }
    }
  }
}

main().catch((err) => {
  console.error('\n❌ Media upload e2e test failed');
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
