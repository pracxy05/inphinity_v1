// A tiny fake S3 server for testing uploads without a real bucket. Not for production.
import S3rver from 's3rver';
import fs from 'node:fs';
const dir = process.env.S3_DIR || '/tmp/s3data';
fs.mkdirSync(dir, { recursive: true });
const s = new S3rver({ port: 4568, address: '127.0.0.1', silent: true, directory: dir, configureBuckets: [{ name: 'inphinity-files', configs: [] }] });
await s.run();
console.log('fake S3 on http://127.0.0.1:4568');
setInterval(() => {}, 1 << 30);
