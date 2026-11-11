// Applies db/migrations/*.sql in order. Safe to run repeatedly.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const url = process.env.DATABASE_URL;
if (!url) { console.error('DATABASE_URL is not set.'); process.exit(1); }

const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'db', 'migrations');
const client = new pg.Client({ connectionString: url, ssl: /localhost|127\.0\.0\.1/.test(url) ? false : { rejectUnauthorized: false } });
await client.connect();
await client.query('create table if not exists schema_migrations (name text primary key, applied_at timestamptz not null default now())');
const done = new Set((await client.query('select name from schema_migrations')).rows.map((r) => r.name));
for (const file of fs.readdirSync(dir).filter((f) => f.endsWith('.sql')).sort()) {
  if (done.has(file)) { console.log('skip   ', file); continue; }
  const sql = fs.readFileSync(path.join(dir, file), 'utf8');
  try {
    await client.query('begin');
    await client.query(sql);
    await client.query('insert into schema_migrations(name) values ($1)', [file]);
    await client.query('commit');
    console.log('applied', file);
  } catch (e) {
    await client.query('rollback');
    console.error('FAILED ', file, e.message);
    process.exit(1);
  }
}
await client.end();
