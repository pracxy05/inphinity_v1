import 'server-only';

/** Reads required settings once and fails with a clear message instead of a vague crash later. */
function required(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing environment variable ${name}. See .env.example.`);
  return v;
}

export const env = {
  get databaseUrl() { return required('DATABASE_URL'); },
  get authSecret() {
    const s = required('AUTH_SECRET');
    if (s.length < 32) throw new Error('AUTH_SECRET must be at least 32 characters. Generate one with: openssl rand -base64 48');
    return s;
  },
  get isProd() { return process.env.NODE_ENV === 'production'; },
  /** Public site address, e.g. https://inphinity.vercel.app. Used for the same-origin check. */
  get appUrl() { return process.env.APP_URL || ''; },
  s3: {
    get configured() { return Boolean(process.env.S3_BUCKET && process.env.S3_ACCESS_KEY_ID && process.env.S3_SECRET_ACCESS_KEY); },
    get endpoint() { return process.env.S3_ENDPOINT || undefined; },
    get region() { return process.env.S3_REGION || 'auto'; },
    get bucket() { return required('S3_BUCKET'); },
    get accessKeyId() { return required('S3_ACCESS_KEY_ID'); },
    get secretAccessKey() { return required('S3_SECRET_ACCESS_KEY'); },
    get forcePathStyle() { return process.env.S3_FORCE_PATH_STYLE === 'true'; },
  },
  get localUploadDir() { return process.env.LOCAL_UPLOAD_DIR || '.data/uploads'; },
};
