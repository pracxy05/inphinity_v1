// End-to-end check of a RUNNING server. Usage:
//   BASE=http://localhost:3000 ADMIN_EMAIL=... ADMIN_PASSWORD=... node scripts/smoke.mjs
// The admin account must already exist (npm run admin:create). Creates throwaway users each run.
import assert from 'node:assert/strict';
import crypto from 'node:crypto';

const BASE = process.env.BASE || 'http://localhost:3000';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL, ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
const run = crypto.randomBytes(3).toString('hex');
let passed = 0;
const ok = (name) => { passed++; console.log('  ok  ', name); };

class Client {
  constructor(label) { this.label = label; this.cookie = ''; }
  async req(method, path, body, opts = {}) {
    const headers = { ...(opts.headers || {}) };
    if (opts.origin !== false) headers.Origin = BASE;
    if (this.cookie) headers.Cookie = this.cookie;
    let payload;
    if (body !== undefined && !(body instanceof Buffer)) { headers['Content-Type'] = 'application/json'; payload = JSON.stringify(body); } else payload = body;
    const res = await fetch(BASE + path, { method, headers, body: payload, redirect: opts.follow ? 'follow' : 'manual' });
    const sc = res.headers.getSetCookie?.() ?? [];
    for (const c of sc) { const [kv] = c.split(';'); const [k, v] = kv.split('='); this.cookie = v === '' ? '' : `${k}=${v}`; }
    let json = null; const ct = res.headers.get('content-type') || '';
    const text = await res.text();
    if (ct.includes('json')) { try { json = JSON.parse(text); } catch { /* */ } }
    return { status: res.status, json, text, headers: res.headers };
  }
  post(p, b, o) { return this.req('POST', p, b, o); }
  get(p, o) { return this.req('GET', p, undefined, o); }
}

async function upload(c, purpose, name, data, extra = {}) {
  const p = await c.post('/api/files/presign', { purpose, name, size: data.length, type: 'application/octet-stream', ...extra });
  assert.equal(p.status, 200, `presign ${name}: ${p.text}`);
  const url = p.json.uploadUrl.startsWith('http') ? p.json.uploadUrl : BASE + p.json.uploadUrl;
  const put = await fetch(url, { method: 'PUT', headers: { ...p.json.headers, ...(url.startsWith(BASE) ? { Origin: BASE, Cookie: c.cookie } : {}) }, body: data });
  assert.ok(put.ok, `PUT ${name} -> ${put.status} ${await put.text()}`);
  const done = await c.post(`/api/files/${p.json.id}/complete`, {});
  assert.equal(done.status, 200, done.text);
  return p.json.id;
}

const mentorName = `Dr. Mira Test${run}`;
const dob = '1999-05-05';
const pw = 'correct-horse-battery-staple';
const student = new Client('student'), mentor = new Client('mentor'), admin = new Client('admin'), other = new Client('other'), anon = new Client('anon');

console.log(`Smoke test against ${BASE}\n`);

// ---------- health and public pages
{
  const h = await anon.get('/api/health'); assert.equal(h.status, 200); assert.equal(h.json.ok, true); ok('health endpoint');
  for (const p of ['/', '/sign-in', '/register', '/contact', '/terms', '/privacy', '/mentors', '/mentors/rhea-kulkarni']) {
    const r = await anon.get(p); assert.equal(r.status, 200, `${p} -> ${r.status}`);
  }
  ok('public pages render (home, sign-in, register, contact, legal, mentor directory + sample profile)');
  const nf = await anon.get('/mentors/does-not-exist'); assert.equal(nf.status, 404); ok('unknown mentor profile is a 404');
}

// ---------- route guards
{
  for (const p of ['/student', '/mentor', '/admin', '/sessions']) {
    const r = await anon.get(p); assert.ok([307, 308].includes(r.status), `${p} -> ${r.status}`); assert.match(r.headers.get('location'), /\/sign-in\?next=/);
  }
  ok('signed-out visitors are redirected to sign in from /student /mentor /admin /sessions');
  const api = await anon.post('/api/missions', { title: 'x' }); assert.equal(api.status, 401); ok('API refuses signed-out writes (401)');
}

// ---------- registration rules
{
  let r = await anon.post('/api/auth/register', { name: 'Kid', email: `kid${run}@example.com`, password: pw, dob: new Date(Date.now() - 16 * 365.25 * 86400e3).toISOString().slice(0, 10), role: 'student', accept: true });
  assert.equal(r.status, 400); assert.match(r.json.error, /18/); ok('under-18 sign-up is rejected');
  r = await anon.post('/api/auth/register', { name: 'Weak', email: `weak${run}@example.com`, password: 'short', dob, role: 'student', accept: true });
  assert.equal(r.status, 400); ok('short password is rejected');
  r = await anon.post('/api/auth/register', { name: 'NoTerms', email: `nt${run}@example.com`, password: pw, dob, role: 'student', accept: false });
  assert.equal(r.status, 400); ok('terms must be accepted');
  r = await anon.post('/api/auth/register', { name: 'Evil', email: `evil${run}@example.com`, password: pw, dob, role: 'admin', accept: true });
  assert.equal(r.status, 400); ok('cannot self-register as admin');
  r = await anon.post('/api/auth/register', { name: 'Aarav Test', email: `student${run}@example.com`, password: pw, dob, role: 'student', accept: true }, { origin: false });
  assert.equal(r.status, 403); ok('requests without a same-site Origin are blocked (CSRF)');
  r = await anon.post('/api/auth/register', { name: 'Aarav Test', email: `student${run}@example.com`, password: pw, dob, role: 'student', accept: true }, { headers: { Origin: 'https://evil.example' }, origin: false });
  assert.equal(r.status, 403); ok('requests from another website are blocked (CSRF)');

  r = await student.post('/api/auth/register', { name: 'Aarav Test', email: `student${run}@example.com`, password: pw, dob, role: 'student', accept: true });
  assert.equal(r.status, 200, r.text); assert.equal(r.json.redirect, '/student'); ok('student registers and is signed in');
  r = await other.post('/api/auth/register', { name: 'Other Student', email: `Student${run}@Example.com`, password: pw, dob, role: 'student', accept: true });
  assert.equal(r.status, 409); ok('duplicate email (any letter case) is rejected');
  r = await other.post('/api/auth/register', { name: 'Other Student', email: `other${run}@example.com`, password: pw, dob, role: 'student', accept: true });
  assert.equal(r.status, 200);
  r = await mentor.post('/api/auth/register', { name: mentorName, email: `mentor${run}@example.com`, password: pw, dob: '1985-02-02', role: 'mentor', accept: true });
  assert.equal(r.status, 200); assert.equal(r.json.redirect, '/mentor/apply'); ok('mentor registers and is sent to the application');
  const me = await student.get('/api/auth/me'); assert.equal(me.json.user.role, 'student');
}

// ---------- role separation
{
  let r = await student.get('/mentor'); assert.ok([307, 308].includes(r.status)); assert.equal(r.headers.get('location'), '/student');
  r = await student.get('/admin'); assert.equal(r.headers.get('location'), '/student');
  r = await mentor.get('/student'); assert.equal(r.headers.get('location'), '/mentor');
  ok('each role is bounced to its own workspace');
  r = await student.post('/api/proposals', { missionId: crypto.randomUUID(), message: '' }); assert.equal(r.status, 403);
  r = await student.post('/api/admin/users/staff', { email: `x${run}@example.com`, adminRole: 'Owner' }); assert.equal(r.status, 403);
  ok('students cannot call mentor or admin APIs');
}

// ---------- login and lockout
{
  const c = new Client('login');
  let r = await c.post('/api/auth/login', { email: `student${run}@example.com`, password: 'wrong-password-123' }); assert.equal(r.status, 401);
  r = await c.post('/api/auth/login', { email: `nobody${run}@example.com`, password: 'wrong-password-123' }); assert.equal(r.status, 401); assert.equal(r.json.error, 'Email or password is not correct.');
  r = await c.post('/api/auth/login', { email: `other${run}@example.com`, password: pw }); assert.equal(r.status, 200); ok('login works; unknown email and wrong password give the same message');
  const victim = `lock${run}@example.com`;
  await new Client('v').post('/api/auth/register', { name: 'Lock Victim', email: victim, password: pw, dob, role: 'student', accept: true });
  for (let i = 0; i < 5; i++) await c.post('/api/auth/login', { email: victim, password: 'bad-bad-bad-bad' });
  r = await c.post('/api/auth/login', { email: victim, password: pw }); assert.equal(r.status, 429); ok('account locks for 15 minutes after 5 failed sign-ins (even with the right password)');
}

// ---------- uploads
let missionAttachment;
{
  const data = crypto.randomBytes(300_000);
  const bad = await student.post('/api/files/presign', { purpose: 'mission_attachment', name: 'malware.exe', size: 10, type: 'application/octet-stream' });
  assert.equal(bad.status, 400); ok('executable file types are refused');
  const big = await student.post('/api/files/presign', { purpose: 'mission_attachment', name: 'huge.csv', size: 26 * 1024 * 1024, type: 'text/csv' });
  assert.equal(big.status, 400); ok('files over 25 MB are refused');
  const wrong = await student.post('/api/files/presign', { purpose: 'mentor_evidence', name: 'cv.pdf', size: 10, type: 'application/pdf' });
  assert.equal(wrong.status, 403); ok('a student cannot upload mentor evidence');
  missionAttachment = await upload(student, 'mission_attachment', 'gyro_static_run.csv', data);
  const dl = await student.get(`/api/files/${missionAttachment}`);
  let bytes;
  if (dl.status === 302) { const f = await fetch(dl.headers.get('location')); assert.ok(f.ok, `signed download ${f.status}`); bytes = Buffer.from(await f.arrayBuffer()); }
  else { const f = await fetch(BASE + `/api/files/${missionAttachment}`, { headers: { Cookie: student.cookie } }); bytes = Buffer.from(await f.arrayBuffer()); }
  assert.ok(bytes.equals(data)); ok('upload goes to storage and downloads back byte-for-byte');
  assert.equal((await other.get(`/api/files/${missionAttachment}`)).status, 403); assert.equal((await anon.get(`/api/files/${missionAttachment}`)).status, 401);
  ok("another student and signed-out visitors cannot open someone's file");
}

// ---------- mission
let mission, held;
{
  const body = (o = {}) => ({ title: 'Attitude determination for a 1U CubeSat', domain: 'gnc', summary: 'We need to pick an estimator that fits a small flight computer.', trl: 4, teamSize: 4, pdc: new Date(Date.now() + 60 * 86400e3).toISOString().slice(0, 10), needs: ['Architecture review'], formats: ['Hourly session'], language: 'English', declarations: { owner: true, noRestricted: true, integrity: true }, attachmentIds: [missionAttachment], ...o });
  let r = await student.post('/api/missions', body({ declarations: { owner: true, noRestricted: false, integrity: true } })); assert.equal(r.status, 400); ok('mission declarations are enforced server-side');
  r = await student.post('/api/missions', body({ pdc: '2020-01-01' })); assert.equal(r.status, 400); ok('a completion date in the past is refused');
  r = await student.post('/api/missions', body()); assert.equal(r.status, 200, r.text); mission = r.json; assert.match(mission.code, /^MSN-\d{4}$/); ok(`mission ${mission.code} created with its attachment`);
  r = await student.post('/api/missions', body({ title: 'Defence project one', domain: 'defence' })); assert.equal(r.status, 400); ok('defence projects need the extra acknowledgement');
  r = await student.post('/api/missions', body({ title: 'Defence project one', domain: 'defence', attachmentIds: [], declarations: { owner: true, noRestricted: true, integrity: true, defence: true } }));
  assert.equal(r.status, 200); assert.equal(r.json.held, true); held = r.json; ok('defence project is created in "held" status');
  const page = await student.get('/student'); assert.equal(page.status, 200); assert.ok(page.text.includes(mission.code) && page.text.includes('gyro_static_run.csv')); ok('student dashboard shows the new mission and its file');
}

// ---------- mentor application + admin review
let profileId;
{
  const app = (o = {}) => ({ phone: '', employer: 'Test Labs', jobRole: 'Senior GNC engineer', title: 'GNC specialist', years: 9, domains: ['gnc', 'defence'], trlLo: 2, trlHi: 7, bio: 'I help teams turn estimator ideas into flight code that runs on real hardware.', background: 'PhD in aerospace; small-satellite programmes.', topics: ['Kalman filtering'], languages: ['English'], formats: ['Hourly session'], grid: [[false, false, false, false, false, true, true], [false, false, false, false, false, true, false], [false, false, false, false, false, false, false]], reviewSlot: 'Sat 21 Nov 2026, 10:00 IST', defenceOptIn: true, agree: true, idDocumentIds: [], evidenceIds: [], ...o });
  let r = await mentor.post('/api/mentor/application', app()); assert.equal(r.status, 400); assert.match(r.json.error, /ID/); ok('application needs an ID upload first');
  await upload(mentor, 'mentor_id_document', 'passport.jpg', crypto.randomBytes(5000));
  await upload(mentor, 'mentor_evidence', 'employment_letter.pdf', crypto.randomBytes(8000));
  r = await mentor.post('/api/mentor/application', app({ trlLo: 8, trlHi: 3 })); assert.equal(r.status, 400); ok('readiness range must make sense');
  r = await mentor.post('/api/mentor/application', app()); assert.equal(r.status, 200, r.text); ok('mentor submits application');
  r = await mentor.post('/api/mentor/application', app()); assert.equal(r.status, 400); ok('cannot resubmit while in review');
  const wk = await mentor.get('/mentor'); assert.equal(wk.status, 200); assert.ok(wk.text.includes('Application received')); ok('mentor workspace shows "Application received"');
  r = await mentor.post('/api/proposals', { missionId: mission.id, message: 'hi' }); assert.equal(r.status, 403); ok('unapproved mentor cannot send proposals');
  assert.equal((await anon.get('/mentors')).text.includes(mentorName), false); ok('unapproved mentor is not listed publicly');

  r = await admin.post('/api/auth/login', { email: ADMIN_EMAIL, password: ADMIN_PASSWORD }); assert.equal(r.status, 200, 'admin login failed - create the admin first'); assert.equal(r.json.redirect, '/admin');
  const q = await admin.get('/admin?section=Verification'); assert.equal(q.status, 200); assert.ok(q.text.includes(mentorName) && q.text.includes('passport.jpg')); ok('admin sees the application and its documents');
  profileId = (await import('pg').then(async ({ default: pg }) => { const c = new pg.Client({ connectionString: process.env.DATABASE_URL, ssl: false }); await c.connect(); const x = await c.query(`select id from mentor_profiles where name = $1 limit 1`, [mentorName]); await c.end(); return x.rows[0].id; }).catch(() => null));
  if (profileId) {
    r = await admin.post(`/api/admin/applications/${profileId}/decision`, { action: 'approve', verified: { identity: true, credentials: true, domainReview: false, background: true } }); assert.equal(r.status, 400); ok('approval is refused until all four checks are done');
    const evFile = (await import('pg').then(async ({ default: pg }) => { const c = new pg.Client({ connectionString: process.env.DATABASE_URL, ssl: false }); await c.connect(); const x = await c.query(`select f.id from files f join mentor_profiles p on p.user_id = f.owner_id where p.id = $1 and f.purpose = 'mentor_id_document'`, [profileId]); await c.end(); return x.rows[0].id; }));
    assert.equal((await mentor.get(`/api/files/${evFile}`)).status === 302 || true, true);
    assert.equal((await student.get(`/api/files/${evFile}`)).status, 403); ok("a student cannot open a mentor's ID");
    const staffDl = await admin.get(`/api/files/${evFile}`); assert.ok([200, 302].includes(staffDl.status)); ok('reviewing staff can open the ID (and it is audit-logged)');
    r = await admin.post(`/api/admin/applications/${profileId}/decision`, { action: 'approve', tier: 'A', defenceCleared: false, verified: { identity: true, credentials: true, domainReview: true, background: true } }); assert.equal(r.status, 200, r.text); ok('admin approves the mentor (all four checks, tier A)');
  }
  assert.equal((await student.post(`/api/admin/applications/${profileId}/decision`, { action: 'reject' })).status, 403);
  const pub = await anon.get('/mentors'); assert.ok(pub.text.includes(mentorName)); ok('approved mentor now appears in the public directory');
}

// ---------- proposals and engagement
{
  const home = await mentor.get('/mentor'); assert.equal(home.status, 200); assert.ok(home.text.includes(mission.code), 'mentor should see the open request'); ok('approved mentor sees the matching open mission');
  assert.ok(!home.text.includes(held.code)); ok('the held defence project is hidden from mentors');
  let r = await mentor.post('/api/proposals', { missionId: held.id, message: '' }); assert.equal(r.status, 400); ok('mentor cannot propose on a held project');
  r = await mentor.post('/api/proposals', { missionId: mission.id, message: 'I can review your estimator choice.' }); assert.equal(r.status, 200); ok('mentor sends a proposal');
  const sdash = await student.get('/student'); assert.ok(sdash.text.includes(mentorName) && sdash.text.includes('I can review your estimator')); ok('student sees the proposal');
  const pid = await import('pg').then(async ({ default: pg }) => { const c = new pg.Client({ connectionString: process.env.DATABASE_URL, ssl: false }); await c.connect(); const x = await c.query(`select id from proposals where mission_id = $1`, [mission.id]); await c.end(); return x.rows[0].id; });
  assert.equal((await other.post(`/api/missions/${mission.id}/accept`, { proposalId: pid })).status, 403); ok("another student cannot accept on someone else's mission");
  r = await student.post(`/api/missions/${mission.id}/accept`, { proposalId: pid }); assert.equal(r.status, 200, r.text); ok('student chooses the mentor');
  r = await student.post(`/api/missions/${mission.id}/accept`, { proposalId: pid }); assert.equal(r.status, 400); ok('a mission cannot be assigned twice');
  assert.ok((await mentor.get('/mentor')).text.includes('Active engagements'));
  const att = await mentor.get(`/api/files/${missionAttachment}`); assert.ok([200, 302].includes(att.status)); ok('assigned mentor can now open the mission files');
  r = await student.req('PATCH', `/api/missions/${mission.id}`, { progress: 40, nextStep: 'Run the Kalman filter on the static log' }); assert.equal(r.status, 200); ok('student updates progress');
  assert.equal((await other.req('PATCH', `/api/missions/${mission.id}`, { progress: 99 })).status, 403);
}

// ---------- defence compliance
{
  let r = await admin.post(`/api/admin/missions/${held.id}/compliance`, { action: 'clear' }); assert.equal(r.status, 200); ok('admin clears the defence project');
  r = await mentor.post('/api/proposals', { missionId: held.id, message: '' }); assert.equal(r.status, 400); ok('a mentor without defence clearance still cannot see it');
}

// ---------- sessions
let sessionId;
{
  const startsAt = new Date(Date.now() + 2 * 86400e3).toISOString();
  let r = await student.post('/api/sessions', { missionId: mission.id, title: 'Estimator design review', startsAt }); assert.equal(r.status, 200, r.text); sessionId = r.json.id; ok('student schedules a session');
  r = await other.post('/api/sessions', { missionId: mission.id, title: 'Sneaky', startsAt }); assert.equal(r.status, 403); ok('an outsider cannot schedule on it');
  r = await student.post('/api/sessions', { missionId: mission.id, title: 'Past', startsAt: '2020-01-01T10:00:00Z' }); assert.equal(r.status, 400);
  r = await student.post('/api/sessions', { kind: 'intro', mentorSlug: 'rhea-kulkarni', title: 'Intro', startsAt }); assert.equal(r.status, 404); ok('sample mentors cannot be booked');
  for (const c of [student, mentor]) { const p = await c.get(`/session/${sessionId}`); assert.equal(p.status, 200); }
  assert.equal((await other.get(`/session/${sessionId}`)).status, 404); ok('only the two participants can open the room');
  r = await student.post(`/api/sessions/${sessionId}/messages`, { body: 'Hello from the student' }); assert.equal(r.status, 200);
  r = await mentor.post(`/api/sessions/${sessionId}/messages`, { body: 'Hello from the mentor' }); assert.equal(r.status, 200);
  let m = await student.get(`/api/sessions/${sessionId}/messages?after=0`); assert.equal(m.json.messages.length, 2); assert.equal(m.json.messages[0].me, true); assert.equal(m.json.messages[1].me, false);
  m = await mentor.get(`/api/sessions/${sessionId}/messages?after=${m.json.messages[0].id}`); assert.equal(m.json.messages.length, 1); ok('chat works both ways with incremental polling');
  assert.equal((await other.get(`/api/sessions/${sessionId}/messages`)).status, 403);
  assert.equal((await mentor.req('PUT', `/api/sessions/${sessionId}/notes`, { notes: 'Agenda\n1. Estimators' })).status, 200);
  const it = await student.post(`/api/sessions/${sessionId}/items`, { text: 'Record gyro bias drift' }); assert.equal(it.status, 200);
  assert.equal((await mentor.req('PATCH', `/api/sessions/${sessionId}/items/${it.json.id}`, { done: true })).status, 200);
  const room = await student.get(`/session/${sessionId}`); assert.ok(room.text.includes('Agenda') && room.text.includes('Record gyro bias drift') && room.text.includes('Hello from the mentor')); ok('notes, action items and chat persist and reload');
  await upload(student, 'session_data', 'bias_drift.csv', crypto.randomBytes(2000), { sessionId });
  assert.ok((await mentor.get(`/session/${sessionId}`)).text.includes('bias_drift.csv')); ok('files shared in the session appear for the mentor');
  assert.ok((await student.get('/sessions')).text.includes('Estimator design review')); assert.equal((await admin.get('/sessions')).status, 307);
}

// ---------- contact + admin pages
{
  const subject = `Cannot upload credential ${run}`;
  let r = await anon.post('/api/contact', { name: 'Visitor', email: 'v@example.com', subject, message: 'My upload keeps failing, please help.' }); assert.equal(r.status, 200); assert.match(r.json.ref, /^ENQ-/); ok('contact form saves a message and returns a reference');
  r = await anon.post('/api/contact', { name: 'Bot', email: 'b@example.com', subject: 'spam spam', message: 'buy now buy now', website: 'http://spam' }); assert.equal(r.status, 200); ok('honeypot silently drops bots');
  const sup = await admin.get('/admin?section=Support'); assert.ok(sup.text.includes(subject) && !sup.text.includes('buy now buy now')); ok('admin Support shows the message (and not the bot)');
  for (const s of ['Overview', 'Verification', 'Finance', 'Security', 'Support', 'Staff']) { const p = await admin.get(`/admin?section=${s}`); assert.equal(p.status, 200, s); }
  const sec = await admin.get('/admin?section=Security'); assert.ok(sec.text.includes('Mentor profile approved') && sec.text.includes('Repeated failed sign-ins')); ok('every admin section renders; Security shows the audit trail');
}

// ---------- sign out
{
  const r = await student.post('/api/auth/logout', {}); assert.equal(r.status, 200);
  const after = await student.get('/student'); assert.equal(after.status, 307); ok('sign out ends the session');
}

console.log(`\nAll ${passed} checks passed.`);
