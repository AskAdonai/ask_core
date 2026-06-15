import { S3Client, PutBucketCorsCommand } from '@aws-sdk/client-s3';
import { readFileSync } from 'fs';
import * as yaml from 'yaml';

async function setCors() {
  const envRaw = readFileSync('./.env.yaml', 'utf8');
  const env = yaml.parse(envRaw);
  
  const s3Client = new S3Client({
    region: 'auto',
    endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: env.R2_ACCESS_KEY_ID,
      secretAccessKey: env.R2_SECRET_ACCESS_KEY,
    },
  });

  const command = new PutBucketCorsCommand({
    Bucket: env.R2_BUCKET_NAME,
    CORSConfiguration: {
      CORSRules: [
        {
          AllowedHeaders: ["*"],
          AllowedMethods: ["GET", "PUT", "POST", "DELETE", "HEAD"],
          AllowedOrigins: ["*"],
          ExposeHeaders: ["ETag"],
          MaxAgeSeconds: 3600
        }
      ]
    }
  });

  try {
    await s3Client.send(command);
    console.log("CORS configured successfully on bucket " + env.R2_BUCKET_NAME);
  } catch (err) {
    console.error("Error setting CORS:", err);
  }
}

setCors();
