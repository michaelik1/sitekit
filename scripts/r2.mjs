import { S3Client } from '@aws-sdk/client-s3';
import { readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';

export const root = resolve(import.meta.dirname, '..');

export async function loadDotEnv() {
  const source = await readFile(join(root, '.env'), 'utf8').catch(() => '');
  for (const raw of source.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!match || process.env[match[1]] !== undefined) continue;
    process.env[match[1]] = match[2].trim().replace(/^(['"])(.*)\1$/, '$2');
  }
}

export function r2Config() {
  const endpoint = process.env.DECOY_R2_ENDPOINT?.replace(/\/+$/, '');
  const bucket = process.env.DECOY_R2_BUCKET;
  const accessKeyId = process.env.DECOY_R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.DECOY_R2_SECRET_ACCESS_KEY;
  const values = [endpoint, bucket, accessKeyId, secretAccessKey];
  if (values.every(Boolean)) return { endpoint, bucket, accessKeyId, secretAccessKey };
  if (values.some(Boolean)) throw new Error('Set all DECOY_R2_* values in decoy/.env, or remove all of them to use HTTP media storage.');
  return null;
}

export function r2Client(config) {
  return new S3Client({
    region: 'auto',
    endpoint: config.endpoint,
    credentials: { accessKeyId: config.accessKeyId, secretAccessKey: config.secretAccessKey },
  });
}
