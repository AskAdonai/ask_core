/**
 * One-time script: configure R2 bucket CORS so the dashboard can PUT uploads directly.
 *
 * Usage (from functions/):
 *   npx tsx set_cors.ts
 *
 * Requires R2_ACCOUNT_ID, R2_BUCKET_NAME in .env.yaml and
 * R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY in .env (or env vars).
 */
import { S3Client, PutBucketCorsCommand } from '@aws-sdk/client-s3';
import { readFileSync, existsSync } from 'fs';
import * as yaml from 'yaml';

function loadEnvFile(path: string): Record<string, string> {
  if (!existsSync(path)) return {};
  const out: Record<string, string> = {};
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    out[key] = value;
  }
  return out;
}

function parseOrigins(raw: string | undefined): string[] {
  if (!raw?.trim()) {
    return ['https://dashboard.askadonai.com', 'http://localhost:3000'];
  }
  return raw.split(',').map((o) => o.trim()).filter(Boolean);
}

async function setCors() {
  const yamlEnv = existsSync('./.env.yaml')
    ? (yaml.parse(readFileSync('./.env.yaml', 'utf8')) as Record<string, string>)
    : {};
  const dotEnv = loadEnvFile('./.env');
  const rootEnv = loadEnvFile('../.env');
  const env = { ...yamlEnv, ...rootEnv, ...dotEnv, ...process.env };

  const accountId = env.R2_ACCOUNT_ID;
  const bucket = env.R2_BUCKET_NAME;
  const accessKeyId = env.R2_ACCESS_KEY_ID;
  const secretAccessKey = env.R2_SECRET_ACCESS_KEY;
  const origins = parseOrigins(env.ALLOWED_ADMIN_ORIGINS);

  if (!accountId || !bucket || !accessKeyId || !secretAccessKey) {
    console.error('Missing R2 credentials. Set R2_ACCOUNT_ID, R2_BUCKET_NAME in .env.yaml and keys in .env');
    process.exit(1);
  }

  const s3Client = new S3Client({
    region: 'auto',
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
  });

  const command = new PutBucketCorsCommand({
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
  });

  await s3Client.send(command);
  console.log(`CORS configured on bucket "${bucket}" for origins: ${origins.join(', ')}`);
}

setCors().catch((err) => {
  console.error('Error setting CORS:', err);
  process.exit(1);
});
