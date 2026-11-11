// Sets a new password for any account (use when someone writes to you saying they are locked out).
// Usage: DATABASE_URL=... node scripts/reset-password.mjs person@example.com 'a-new-long-password'
import bcrypt from 'bcryptjs';
import pg from 'pg';

const [email, password] = process.argv.slice(2);
const url = process.env.DATABASE_URL;
if (!url || !email || !password) { console.error("Usage: DATABASE_URL=... node scripts/reset-password.mjs <email> '<new password>'"); process.exit(1); }
if (password.length < 10) { console.error('Use at least 10 characters.'); process.exit(1); }
const client = new pg.Client({ connectionString: url, ssl: /localhost|127\.0\.0\.1/.test(url) ? false : { rejectUnauthorized: false } });
await client.connect();
const r = await client.query('update users set password_hash = $2, failed_logins = 0, locked_until = null where lower(email) = lower($1)', [email, await bcrypt.hash(password, 12)]);
console.log(r.rowCount ? `Password changed for ${email}. Tell them to sign in and use this one.` : `No account found for ${email}.`);
await client.end();
