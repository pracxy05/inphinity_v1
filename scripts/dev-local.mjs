// One command to run the whole app on your own computer, free, with no accounts:
//   npm run dev:local
// Starts a local Postgres, creates the tables, adds sample mentors, makes a local admin, then starts the site.
import { spawn, spawnSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import EmbeddedPostgres from 'embedded-postgres';

const PORT = Number(process.env.PG_PORT || 54329);
const dir = process.env.PG_DIR || '.data/pg';
const url = `postgres://inphinity:inphinity@localhost:${PORT}/inphinity`;

// 1. .env.local with a private secret (created once)
if (!fs.existsSync('.env.local')) {
  fs.writeFileSync('.env.local', `DATABASE_URL=${url}\nAUTH_SECRET=${crypto.randomBytes(36).toString('base64')}\n`);
  console.log('Created .env.local');
}

// 2. Postgres
const first = !fs.existsSync(dir);
const pg = new EmbeddedPostgres({ databaseDir: dir, user: 'inphinity', password: 'inphinity', port: PORT, persistent: true });
if (first) await pg.initialise();
await pg.start();
if (first) await pg.createDatabase('inphinity');

const env = { ...process.env, DATABASE_URL: url };
const run = (args) => { const r = spawnSync(process.execPath, args, { stdio: 'inherit', env }); if (r.status) throw new Error(`${args[0]} failed`); };

// 3. tables, sample mentors, a local admin
run(['scripts/migrate.mjs']);
run(['scripts/seed.mjs']);
const adminPass = 'local-admin-password';
run(['scripts/create-admin.mjs', 'admin@local.test', 'Local Admin', adminPass, 'Owner']);

console.log('\n  Site:    http://localhost:3000');
console.log('  Staff:   admin@local.test / ' + adminPass + '   (local only)\n');

// 4. the site
const next = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'dev'], { stdio: 'inherit', env });
const stop = async () => { next.kill(); await pg.stop(); process.exit(0); };
process.on('SIGINT', stop); process.on('SIGTERM', stop);
next.on('exit', stop);
