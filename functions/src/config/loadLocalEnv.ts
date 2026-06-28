/**
 * Local dev: load non-secret config from `.env.yaml`, then secrets from `.env`.
 * Secrets in `.env` always win if the same key exists in both files.
 */
import dotenv from 'dotenv';
import { existsSync, readFileSync } from 'fs';
import path from 'path';
import yaml from 'yaml';

const FUNCTIONS_DIR = path.resolve(__dirname, '../..');

const SECRET_KEYS = new Set([
  'TWILIO_ACCOUNT_SID',
  'TWILIO_AUTH_TOKEN',
  'TWILIO_WHATSAPP_NUMBER',
  'TWILIO_API_KEY_SID',
  'TWILIO_API_KEY_SECRET',
  'R2_ACCESS_KEY_ID',
  'R2_SECRET_ACCESS_KEY',
]);

export function loadLocalEnv(): void {
  const configPath = path.join(FUNCTIONS_DIR, '.env.yaml');
  if (existsSync(configPath)) {
    const parsed = yaml.parse(readFileSync(configPath, 'utf8')) as Record<string, unknown> | null;
    if (parsed && typeof parsed === 'object') {
      for (const [key, value] of Object.entries(parsed)) {
        if (SECRET_KEYS.has(key) || value == null) continue;
        if (process.env[key] === undefined) {
          process.env[key] = String(value);
        }
      }
    }
  }

  dotenv.config({ path: path.join(FUNCTIONS_DIR, '.env') });
}
