-- InΦnity initial schema. Run with: npm run db:migrate
create extension if not exists pgcrypto;

create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  password_hash text not null,
  name text not null,
  role text not null check (role in ('student','mentor','admin')),
  admin_role text check (admin_role in ('Owner','Operations lead','Verification admin','Finance admin','Security admin','Support agent')),
  dob date not null,
  phone text,
  failed_logins int not null default 0,
  locked_until timestamptz,
  last_login_at timestamptz,
  created_at timestamptz not null default now(),
  check ((role = 'admin') = (admin_role is not null))
);
create unique index if not exists users_email_key on users (lower(email));

create sequence if not exists applicant_seq start 400;
create table if not exists mentor_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique references users(id) on delete cascade,
  slug text not null unique,
  applicant_no int not null default nextval('applicant_seq'),
  is_sample boolean not null default false,
  name text not null,
  initials text not null,
  title text not null default '',
  background text not null default '',
  bio text not null default '',
  employer text not null default '',
  job_role text not null default '',
  domains text[] not null default '{}',
  trl_lo int not null default 1 check (trl_lo between 1 and 9),
  trl_hi int not null default 9 check (trl_hi between 1 and 9),
  years int not null default 0,
  languages text[] not null default '{English}',
  timezone text not null default 'IST (UTC+5:30)',
  availability text not null default '',
  grid jsonb not null default '[[false,false,false,false,false,false,false],[false,false,false,false,false,false,false],[false,false,false,false,false,false,false]]',
  formats text[] not null default '{"Hourly session","Monthly package","Fixed-price milestone"}',
  topics text[] not null default '{}',
  tier text not null default 'C' check (tier in ('A','B','C')),
  verified jsonb not null default '{"identity":false,"credentials":false,"domainReview":false,"background":false}',
  defence_cleared boolean not null default false,
  defence_opt_in boolean not null default false,
  review_slot text,
  status text not null default 'draft' check (status in ('draft','submitted','in_review','needs_info','approved','rejected')),
  review_note text,
  submitted_at timestamptz,
  decided_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists mentor_profiles_status_idx on mentor_profiles (status);

create sequence if not exists mission_seq start 200;
create table if not exists missions (
  id uuid primary key default gen_random_uuid(),
  code text not null unique default ('MSN-' || lpad(nextval('mission_seq')::text, 4, '0')),
  student_id uuid not null references users(id) on delete cascade,
  title text not null,
  domain text not null,
  summary text not null,
  trl int not null check (trl between 1 and 9),
  team_size int not null default 1 check (team_size between 1 and 50),
  pdc date not null,
  needs text[] not null default '{}',
  formats text[] not null default '{}',
  language text not null default 'English',
  status text not null default 'Awaiting mentor' check (status in ('Awaiting mentor','On track','At risk','Completed')),
  progress int not null default 0 check (progress between 0 and 100),
  next_step text not null default 'Choose a mentor',
  mentor_id uuid references mentor_profiles(id) on delete set null,
  preferred_mentor_id uuid references mentor_profiles(id) on delete set null,
  compliance_status text not null default 'not_required' check (compliance_status in ('not_required','held','cleared','rejected')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists missions_student_idx on missions (student_id);
create index if not exists missions_mentor_idx on missions (mentor_id);

create table if not exists proposals (
  id uuid primary key default gen_random_uuid(),
  mission_id uuid not null references missions(id) on delete cascade,
  mentor_id uuid not null references mentor_profiles(id) on delete cascade,
  message text not null default '',
  status text not null default 'sent' check (status in ('sent','accepted','declined','withdrawn')),
  created_at timestamptz not null default now(),
  unique (mission_id, mentor_id)
);

create table if not exists sessions (
  id uuid primary key default gen_random_uuid(),
  mission_id uuid references missions(id) on delete cascade,
  mentor_id uuid not null references mentor_profiles(id) on delete cascade,
  student_id uuid not null references users(id) on delete cascade,
  kind text not null default 'session' check (kind in ('session','intro')),
  title text not null,
  starts_at timestamptz not null,
  status text not null default 'scheduled' check (status in ('scheduled','completed','cancelled')),
  notes text not null default '',
  room_key text not null default encode(gen_random_bytes(12), 'hex'),
  created_by uuid references users(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists sessions_student_idx on sessions (student_id);
create index if not exists sessions_mentor_idx on sessions (mentor_id);

create table if not exists session_messages (
  id bigserial primary key,
  session_id uuid not null references sessions(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);
create index if not exists session_messages_idx on session_messages (session_id, id);

create table if not exists action_items (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references sessions(id) on delete cascade,
  text text not null,
  done boolean not null default false,
  created_by uuid references users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists files (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references users(id) on delete cascade,
  purpose text not null check (purpose in ('mission_attachment','mentor_evidence','mentor_id_document','session_data')),
  mission_id uuid references missions(id) on delete cascade,
  session_id uuid references sessions(id) on delete cascade,
  original_name text not null,
  content_type text not null,
  size_bytes bigint not null,
  storage_key text not null unique,
  status text not null default 'pending' check (status in ('pending','ready')),
  created_at timestamptz not null default now()
);
create index if not exists files_owner_idx on files (owner_id);
create index if not exists files_mission_idx on files (mission_id);

create sequence if not exists enquiry_seq start 1100;
create table if not exists contact_messages (
  id uuid primary key default gen_random_uuid(),
  ref text not null unique default ('ENQ-' || nextval('enquiry_seq')::text),
  name text not null,
  email text not null,
  subject text not null,
  message text not null,
  status text not null default 'Open' check (status in ('Open','Resolved','Escalated')),
  created_at timestamptz not null default now()
);

create table if not exists audit_log (
  id bigserial primary key,
  at timestamptz not null default now(),
  actor_id uuid references users(id) on delete set null,
  actor_label text not null,
  event text not null,
  result text not null default 'Allowed',
  tone text not null default 'ok' check (tone in ('ok','warn','crit')),
  detail jsonb not null default '{}'
);
create index if not exists audit_log_at_idx on audit_log (at desc);
create index if not exists audit_log_actor_idx on audit_log (actor_id, at desc);

create table if not exists rate_limits (
  key text primary key,
  window_start timestamptz not null default now(),
  count int not null default 0
);
