# InΦnity

Expert mentorship marketplace for student and startup teams building UAVs, CubeSats, CanSats, rockets and defence systems.

**v0.2: working platform.** Real accounts, mission requests, file uploads, mentor applications and verification, proposals, scheduled sessions with chat and notes, a contact form, and a role-based admin console, all stored in a database.

## Try it on your computer (free, no accounts)

You need **Node.js 20.9 or newer** (LTS from https://nodejs.org).

| System | What to do |
|---|---|
| Windows | Double-click `start.bat` |
| macOS or Linux | `./start.sh` (first time: `chmod +x start.sh`) |
| Any system | `npm install`, then `npm run dev:local` |

Open http://localhost:3000. The first start takes a minute: it downloads a small local database, creates the tables, adds 8 sample mentors and a local staff login (`admin@local.test` / `local-admin-password`, printed in the window). Uploaded files are kept in `.data/uploads`.

## Put it online

See **[DEPLOY.md](DEPLOY.md)**: Vercel + Neon + Cloudflare R2, all free.

## How it works

| Piece | Where |
|---|---|
| Pages (server-rendered, read the database directly) | `app/**/page.tsx` |
| API for every change (sign-up, missions, uploads, review…) | `app/api/**/route.ts` |
| Database tables | `db/migrations/*.sql` (add new numbered files for changes, then `npm run db:migrate`) |
| Sign-in, roles, sessions | `lib/server/auth.ts` (password hashes + signed HttpOnly cookie) |
| Who may see which file | `lib/server/files.ts` |
| File storage (S3-compatible bucket, or local disk in development) | `lib/server/storage.ts` |
| Colours, fonts, components | `app/globals.css` |

### Who can do what

- **Student:** create missions (with files), choose a mentor from proposals, schedule sessions, track progress.
- **Mentor:** apply (ID + evidence), after approval see matching requests, send proposals, run sessions.
- **Staff (admin):** Owner, Operations lead, Verification admin, Finance admin, Security admin, Support agent. Each sees only its own sections. Verification reviews applications and defence-flagged projects; opening an ID or evidence file is written to the audit log.

### Useful commands

| Command | Does |
|---|---|
| `npm run dev:local` | Everything local (database + site) |
| `npm run db:migrate` | Create/upgrade tables (`DATABASE_URL` required) |
| `npm run db:seed` / `db:unseed` | Add / remove the sample mentors |
| `npm run admin:create -- email "Name" 'password' [Role]` | Create a staff account |
| `npm run user:reset-password -- email 'new password'` | Reset anyone's password |
| `npm run smoke` | 66-check end-to-end test of a running site (`BASE`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`) |
| `npm run typecheck` | TypeScript check |

## Not built yet

Payments and the rate card, outgoing email (verification, password reset), an in-page video call (sessions open a private Jitsi room instead), automated virus scanning of uploads, passkeys / two-factor for staff, and real Terms/Privacy text. The security wording on the landing page says *aligned to* ISO 27001 / SOC 2, not certified.
