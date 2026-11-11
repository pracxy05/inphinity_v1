// Creates (or resets the password of) a staff account.
// Usage: DATABASE_URL=... node scripts/create-admin.mjs you@example.com "Your Name" 'a-long-password' [Owner|Operations lead|...]
import bcrypt from 'bcryptjs';
import pg from 'pg';

const [email, name, password, adminRole = 'Owner'] = process.argv.slice(2);
const url = process.env.DATABASE_URL;
const ROLES = ['Owner', 'Operations lead', 'Verification admin', 'Finance admin', 'Security admin', 'Support agent'];
if (!url || !email || !name || !password) { console.error('Usage: DATABASE_URL=... node scripts/create-admin.mjs <email> <name> <password> [role]'); process.exit(1); }
if (password.length < 10) { console.error('Use a password of at least 10 characters.'); process.exit(1); }
if (!ROLES.includes(adminRole)) { console.error('Role must be one of: ' + ROLES.join(', ')); process.exit(1); }

const client = new pg.Client({ connectionString: url, ssl: /localhost|127\.0\.0\.1/.test(url) ? false : { rejectUnauthorized: false } });
await client.connect();
const hash = await bcrypt.hash(password, 12);
const r = await client.query(
  `insert into users (email, password_hash, name, role, admin_role, dob) values ($1,$2,$3,'admin',$4,'1990-01-01')
   on conflict ((lower(email))) do update set password_hash = excluded.password_hash, name = excluded.name, role = 'admin', admin_role = excluded.admin_role, failed_logins = 0, locked_until = null
   returning id`,
  [email.toLowerCase(), hash, name, adminRole],
);
console.log(`Staff account ready: ${email} (${adminRole})`);
await client.end();
