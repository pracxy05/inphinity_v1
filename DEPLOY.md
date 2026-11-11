# Putting InΦnity online (free, for 6+ months)

You will use four free services. Total cost: ₹0. Time: about 45 minutes the first time.

| What | Service | Why this one | Free limits (checked Nov 2026) |
|---|---|---|---|
| Website + API | **Vercel** (Hobby) | Built for Next.js, no sleeping, free `.vercel.app` address | 100 GB bandwidth/month. **Hobby is for non-commercial use.** |
| Database | **Neon** (Postgres) | Never expires, wakes in milliseconds when idle | 1 GB storage, 100 compute-hours/month |
| File uploads | **Cloudflare R2** | S3-compatible, private, no download fees | 10 GB storage, 1M writes + 10M reads/month. May ask for a card to activate (not charged inside the free tier). |
| Code | **GitHub** | Vercel deploys from it automatically | Free |

**Why not Render?** Its free database is deleted 30 days after creation, and its free web service sleeps after 15 minutes idle (the next visitor waits ~1 minute). Fine for a quick demo, wrong for 6 months. Render's paid web service ($7/month) plus Neon would also work if you ever outgrow Vercel's non-commercial rule.

**Why not Supabase?** Its free projects pause after 7 days without activity, so a quiet demo would go offline.

---

## Step 0. Put the code on GitHub

1. Make sure the new code is on your repo `pracxy05/inphinity` (branch `feature/backend`, or merge it to `main`).
2. Never commit `.env.local`. It is already in `.gitignore`.

## Step 1. Database (Neon)

1. Sign up at neon.com, **Create project**. Name `inphinity`. Pick the region closest to your users (Singapore is good for India).
2. On the project dashboard click **Connect**. Turn **Connection pooling ON**. Copy the connection string. It looks like  
   `postgresql://user:pass@ep-xxxx-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require`  
   Keep it private. This is your `DATABASE_URL`.
3. Create the tables. Easiest way: in Neon open **SQL Editor**, paste the whole contents of `db/migrations/001_init.sql`, click **Run**.  
   (Or from your computer: `DATABASE_URL="<string>" npm run db:migrate` on Mac/Linux; on Windows PowerShell: `$env:DATABASE_URL="<string>"; npm run db:migrate`.)
4. Create **your owner account** (this is how you get into `/admin`). In the SQL Editor run, with your own email, name and a long password:
   ```sql
   insert into users (email, password_hash, name, role, admin_role, dob)
   values ('you@example.com', crypt('PUT-A-LONG-PASSWORD-HERE', gen_salt('bf', 12)), 'Your Name', 'admin', 'Owner', '1990-01-01');
   ```
5. Optional: add the 8 clearly-labelled **sample mentors** so the directory is not empty on day one: `DATABASE_URL="<string>" npm run db:seed`. Remove them any time with `npm run db:unseed`.

## Step 2. File storage (Cloudflare R2)

1. Sign up at cloudflare.com → **R2 Object Storage** → **Create bucket**, name `inphinity-files`. Leave it **private**.
2. **Manage R2 API Tokens → Create API token** → permission **Object Read & Write**, limited to that bucket. Copy the **Access Key ID** and **Secret Access Key** (shown once).
3. Note your **Account ID** (R2 overview page). Your endpoint is `https://<ACCOUNT_ID>.r2.cloudflarestorage.com`.
4. Bucket → **Settings → CORS policy** → add (replace the origin with your real site address; add your custom domain later too):
   ```json
   [
     {
       "AllowedOrigins": ["https://YOUR-PROJECT.vercel.app"],
       "AllowedMethods": ["PUT", "GET"],
       "AllowedHeaders": ["Content-Type"],
       "MaxAgeSeconds": 3600
     }
   ]
   ```
   Without this, uploads fail in the browser with a "storage failed" message.

*No card for R2?* Any S3-compatible bucket works with the same five settings (Backblaze B2, Supabase Storage S3). I tested the upload flow against a fake S3 server, not against these providers directly, so test one upload after setup.

## Step 3. Website (Vercel)

1. Sign up at vercel.com with GitHub → **Add New → Project** → import `inphinity`.
2. Before clicking Deploy, open **Environment Variables** and add:

   | Name | Value |
   |---|---|
   | `DATABASE_URL` | the Neon string from Step 1 |
   | `AUTH_SECRET` | 48 random characters. Make one: `openssl rand -base64 48` (or any password generator, 40+ characters) |
   | `APP_URL` | `https://YOUR-PROJECT.vercel.app` (your real address; change it if you add a domain) |
   | `S3_ENDPOINT` | `https://<ACCOUNT_ID>.r2.cloudflarestorage.com` |
   | `S3_REGION` | `auto` |
   | `S3_BUCKET` | `inphinity-files` |
   | `S3_ACCESS_KEY_ID` | from Step 2 |
   | `S3_SECRET_ACCESS_KEY` | from Step 2 |

3. Click **Deploy**. Wait ~2 minutes.
4. **Speed tip:** Vercel project → **Settings → Functions → Function Region**: choose the region nearest your Neon database (Singapore `sin1` if you picked Singapore). Redeploy.

## Step 4. Check it works (5 minutes)

1. Open `https://YOUR-PROJECT.vercel.app/api/health`. You should see `{"ok":true,"storage":"s3"}`. If `storage` says `local`, the S3 variables are missing.
2. Register a student account. Create a mission request and attach a file. Open the file from the dashboard.
3. Sign in at `/sign-in` with your owner account → you land on `/admin`. Check **Overview → Platform health**: all green.
4. Register a second (mentor) account in a private window, submit an application with an ID photo, approve it in **Admin → Verification**, then watch the mentor see the student's request.

## Step 5. Your own domain (later)

1. Buy a domain anywhere. In Vercel → **Settings → Domains → Add**, follow the DNS instructions (an `A` record for the root, a `CNAME` for `www`). HTTPS is automatic.
2. Update `APP_URL` in Vercel to the new address and redeploy.
3. Add the new address to the R2 CORS list from Step 2.

---

## Running it day to day

- **People forgot their password:** there is no email sending yet (it needs a domain). They use **Contact**; you reset it: `DATABASE_URL="<string>" npm run user:reset-password -- person@example.com 'new-long-password'`.
- **Give someone staff access:** they register as a normal student first, then **Admin → Staff** (Owner only).
- **Backups:** Neon's free plan only restores the last ~6 hours. About once a week run `pg_dump "<DATABASE_URL>" > inphinity-backup.sql` and keep the file safe (install PostgreSQL client tools to get `pg_dump`).
- **Limits to watch:** Neon 1 GB, R2 10 GB, Vercel 100 GB bandwidth. Each user is capped at 500 MB of uploads and 25 MB per file.
- **Uptime alerts (optional):** free UptimeRobot, monitor `https://your-site/api/health` every 5 minutes.
- **Security updates:** every few weeks run `npm audit` and `npm update`, then push. Vercel redeploys on its own.

## Troubleshooting

| Symptom | Fix |
|---|---|
| Build fails: `Missing environment variable` | Add it in Vercel → Settings → Environment Variables → redeploy |
| Database errors mentioning `channel_binding` | Delete `&channel_binding=require` from the end of `DATABASE_URL` |
| `Cross-site request blocked` | `APP_URL` does not match the address in the browser |
| Upload says "storage failed" | R2 CORS policy missing your site's address (Step 2.4) |
| Upload says "File storage is not configured" | The `S3_*` variables are missing in Vercel |
| First page after a quiet spell is slow (~1 s) | Neon waking up. Normal on the free plan |

## Before you invite the public

- **Terms and Privacy** pages are plain-language **drafts**. Have a lawyer replace them. You collect dates of birth and photo IDs, which are sensitive personal data (India's DPDP Act applies); get advice on consent, retention and deletion.
- **Defence/export-control** handling is a product gate only. Get legal advice before accepting real defence projects (see `docs/BLUEPRINT_v2.md` §6).
- **Vercel Hobby is non-commercial.** If InΦnity starts charging mentors or students, move to Vercel Pro or another host.
- No payments, no email, and no automatic virus scanning of uploads exist yet. Files are only type-checked and size-limited, and are downloaded as attachments (never rendered in the browser).
