import 'server-only';
import fs from 'node:fs/promises';
import path from 'node:path';
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { env } from './env';

/**
 * Two storage drivers behind one interface:
 *  - "s3":    any S3-compatible bucket (Cloudflare R2, Backblaze B2, Supabase Storage, AWS S3, MinIO).
 *             The browser uploads and downloads DIRECTLY to the bucket with short-lived signed links,
 *             which avoids Vercel's 4.5 MB request limit and keeps files private.
 *  - "local": files on disk under .data/uploads. For running on your own laptop only.
 */
export const driver: 's3' | 'local' = env.s3.configured ? 's3' : 'local';

let client: S3Client | null = null;
function s3() {
  if (!client) {
    client = new S3Client({
      region: env.s3.region,
      endpoint: env.s3.endpoint,
      forcePathStyle: env.s3.forcePathStyle,
      credentials: { accessKeyId: env.s3.accessKeyId, secretAccessKey: env.s3.secretAccessKey },
      requestChecksumCalculation: 'WHEN_REQUIRED',
      responseChecksumValidation: 'WHEN_REQUIRED',
    });
  }
  return client;
}

const SIGN_SECONDS = 300;

/** Link the browser PUTs the file to. */
export async function signedUploadUrl(key: string, contentType: string): Promise<string | null> {
  if (driver !== 's3') return null;
  return getSignedUrl(s3(), new PutObjectCommand({ Bucket: env.s3.bucket, Key: key, ContentType: contentType }), { expiresIn: SIGN_SECONDS });
}

/** Link the browser downloads the file from. */
export async function signedDownloadUrl(key: string, filename: string, contentType: string): Promise<string | null> {
  if (driver !== 's3') return null;
  const safe = filename.replace(/[^\w.\- ]/g, '_');
  return getSignedUrl(
    s3(),
    new GetObjectCommand({
      Bucket: env.s3.bucket, Key: key,
      ResponseContentDisposition: `attachment; filename="${safe}"`,
      ResponseContentType: contentType,
    }),
    { expiresIn: SIGN_SECONDS },
  );
}

/** Confirms the upload really arrived and returns its true size. */
export async function objectSize(key: string): Promise<number | null> {
  if (driver === 's3') {
    try {
      const h = await s3().send(new HeadObjectCommand({ Bucket: env.s3.bucket, Key: key }));
      return Number(h.ContentLength ?? 0);
    } catch { return null; }
  }
  try { return (await fs.stat(localPath(key))).size; } catch { return null; }
}

export async function removeObject(key: string) {
  if (driver === 's3') { await s3().send(new DeleteObjectCommand({ Bucket: env.s3.bucket, Key: key })).catch(() => {}); return; }
  await fs.rm(localPath(key), { force: true });
}

// ---- local driver helpers
export function localPath(key: string) {
  const root = path.resolve(env.localUploadDir);
  const p = path.resolve(root, key);
  if (!p.startsWith(root + path.sep)) throw new Error('Bad storage key');
  return p;
}
export async function localWrite(key: string, data: Buffer) {
  const p = localPath(key);
  await fs.mkdir(path.dirname(p), { recursive: true });
  await fs.writeFile(p, data);
}
export async function localRead(key: string) { return fs.readFile(localPath(key)); }
