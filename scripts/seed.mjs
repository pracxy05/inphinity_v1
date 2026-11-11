// Adds the eight clearly-labelled SAMPLE mentor profiles so the directory is not empty on day one.
// Safe to run repeatedly. Remove them later with: npm run db:unseed
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const url = process.env.DATABASE_URL;
if (!url) { console.error('DATABASE_URL is not set.'); process.exit(1); }
const file = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'db', 'sample-mentors.json');
const mentors = JSON.parse(fs.readFileSync(file, 'utf8'));

const client = new pg.Client({ connectionString: url, ssl: /localhost|127\.0\.0\.1/.test(url) ? false : { rejectUnauthorized: false } });
await client.connect();

if (process.argv.includes('--remove')) {
  const r = await client.query('delete from mentor_profiles where is_sample = true');
  console.log(`Removed ${r.rowCount} sample mentors.`);
  await client.end();
  process.exit(0);
}

let added = 0;
for (const m of mentors) {
  const r = await client.query(
    `insert into mentor_profiles (slug, is_sample, name, initials, title, background, bio, domains, trl_lo, trl_hi, years, languages,
       timezone, availability, grid, formats, topics, tier, verified, defence_cleared, status)
     values ($1,true,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,'approved')
     on conflict (slug) do nothing`,
    [m.id, m.name, m.initials, m.title, m.background, m.bio, m.domains, m.trl[0], m.trl[1], m.years, m.languages, m.timezone,
     m.availability, JSON.stringify(m.grid), m.formats, m.topics, m.tier, JSON.stringify(m.verified), m.defenceCleared],
  );
  added += r.rowCount;
}
console.log(`Sample mentors added: ${added} (of ${mentors.length}).`);
await client.end();
