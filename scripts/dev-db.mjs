// Starts a throwaway local Postgres on port 54329 (data kept in .data/pg) so you can run the app
// on your own computer without installing or paying for anything. Leave this window open.
import EmbeddedPostgres from 'embedded-postgres';
import fs from 'node:fs';

const dir = process.env.PG_DIR || '.data/pg';
const first = !fs.existsSync(dir);
const pg = new EmbeddedPostgres({ databaseDir: dir, user: 'inphinity', password: 'inphinity', port: 54329, persistent: true });
if (first) await pg.initialise();
await pg.start();
if (first) await pg.createDatabase('inphinity');
console.log('\nLocal database ready:\n  DATABASE_URL=postgres://inphinity:inphinity@localhost:54329/inphinity\nPress Ctrl+C to stop.\n');
const stop = async () => { await pg.stop(); process.exit(0); };
process.on('SIGINT', stop); process.on('SIGTERM', stop);
setInterval(() => {}, 1 << 30);
