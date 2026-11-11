import 'server-only';
import { query, one } from './db';
import { daysUntil, type DomainId, type Mentor, type MissionStatus } from '@/lib/data';

export type MentorRow = {
  id: string; user_id: string | null; slug: string; applicant_no: number; is_sample: boolean; name: string; initials: string;
  title: string; background: string; bio: string; employer: string; job_role: string; domains: string[];
  trl_lo: number; trl_hi: number; years: number; languages: string[]; timezone: string; availability: string;
  grid: boolean[][]; formats: string[]; topics: string[]; tier: 'A' | 'B' | 'C';
  verified: Mentor['verified']; defence_cleared: boolean; defence_opt_in: boolean; review_slot: string | null;
  status: 'draft' | 'submitted' | 'in_review' | 'needs_info' | 'approved' | 'rejected'; review_note: string | null;
  submitted_at: Date | null; decided_at: Date | null;
};

export function toMentor(r: MentorRow): Mentor {
  return {
    id: r.slug, name: r.name, initials: r.initials, title: r.title, background: r.background,
    domains: r.domains as DomainId[], trl: [r.trl_lo, r.trl_hi], years: r.years, languages: r.languages,
    timezone: r.timezone, availability: r.availability, grid: r.grid, formats: r.formats, tier: r.tier,
    verified: r.verified, defenceCleared: r.defence_cleared, bio: r.bio, topics: r.topics, isSample: r.is_sample,
  };
}

export async function listApprovedMentors(): Promise<Mentor[]> {
  const rows = await query<MentorRow>(`select * from mentor_profiles where status = 'approved' order by years desc, name`);
  return rows.map(toMentor);
}
export async function getApprovedMentor(slug: string): Promise<Mentor | null> {
  const r = await one<MentorRow>(`select * from mentor_profiles where slug = $1 and status = 'approved'`, [slug]);
  return r ? toMentor(r) : null;
}
export async function getMentorProfileByUser(userId: string): Promise<MentorRow | null> {
  return one<MentorRow>('select * from mentor_profiles where user_id = $1', [userId]);
}

export type MissionRow = {
  id: string; code: string; student_id: string; title: string; domain: DomainId; summary: string; trl: number; team_size: number;
  pdc: string; needs: string[]; formats: string[]; language: string; status: 'Awaiting mentor' | 'On track' | 'At risk' | 'Completed';
  progress: number; next_step: string; mentor_id: string | null; preferred_mentor_id: string | null;
  compliance_status: 'not_required' | 'held' | 'cleared' | 'rejected'; created_at: Date; updated_at: Date;
  mentor_slug?: string | null; mentor_name?: string | null; student_name?: string | null;
};

/** Status shown to people: a mission past its date that is not completed reads as Overdue. */
export function effectiveStatus(m: Pick<MissionRow, 'status' | 'pdc'>): MissionStatus {
  if (m.status !== 'Completed' && daysUntil(m.pdc) < 0) return 'Overdue';
  return m.status;
}

// pdc is a date column: return it as 'YYYY-MM-DD' text.
const MISSION_COLS = `m.id, m.code, m.student_id, m.title, m.domain, m.summary, m.trl, m.team_size, to_char(m.pdc,'YYYY-MM-DD') as pdc,
  m.needs, m.formats, m.language, m.status, m.progress, m.next_step, m.mentor_id, m.preferred_mentor_id, m.compliance_status,
  m.created_at, m.updated_at, p.slug as mentor_slug, p.name as mentor_name, u.name as student_name`;
const MISSION_FROM = `from missions m left join mentor_profiles p on p.id = m.mentor_id left join users u on u.id = m.student_id`;

export const missionsForStudent = (userId: string) =>
  query<MissionRow>(`select ${MISSION_COLS} ${MISSION_FROM} where m.student_id = $1 order by m.created_at desc`, [userId]);

export const missionsForMentor = (profileId: string) =>
  query<MissionRow>(`select ${MISSION_COLS} ${MISSION_FROM} where m.mentor_id = $1 order by m.pdc`, [profileId]);

export const getMission = (id: string) => one<MissionRow>(`select ${MISSION_COLS} ${MISSION_FROM} where m.id = $1`, [id]);

export type OpenRequest = MissionRow & { match: number; proposal_id: string | null; requested_you: boolean };

/** Open missions a mentor may see: right domain, overlapping readiness, compliance cleared if needed. */
export async function requestsForMentor(profile: MentorRow): Promise<OpenRequest[]> {
  const rows = await query<MissionRow & { proposal_id: string | null; requested_you: boolean }>(
    `select ${MISSION_COLS},
       (select pr.id from proposals pr where pr.mission_id = m.id and pr.mentor_id = $1 and pr.status = 'sent') as proposal_id,
       (m.preferred_mentor_id = $1) as requested_you
     ${MISSION_FROM}
     where m.mentor_id is null and m.status = 'Awaiting mentor'
       and m.compliance_status in ('not_required','cleared')
       and m.domain = any($2::text[])
       and ($3 or m.domain <> 'defence')
     order by m.created_at desc limit 60`,
    [profile.id, profile.domains, profile.defence_cleared],
  );
  return rows.map((m) => ({ ...m, match: matchScore(profile, m) }));
}

export function matchScore(p: Pick<MentorRow, 'trl_lo' | 'trl_hi' | 'languages' | 'formats'>, m: Pick<MissionRow, 'trl' | 'language' | 'formats'>) {
  let s = 50; // domain already matched by the query
  if (m.trl >= p.trl_lo && m.trl <= p.trl_hi) s += 30;
  else s += Math.max(0, 30 - 10 * Math.min(Math.abs(m.trl - p.trl_lo), Math.abs(m.trl - p.trl_hi)));
  if (p.languages.includes(m.language)) s += 10;
  if (m.formats.some((f) => p.formats.includes(f))) s += 10;
  return Math.min(100, s);
}

export type SessionRow = {
  id: string; mission_id: string | null; mentor_id: string; student_id: string; kind: 'session' | 'intro'; title: string;
  starts_at: Date; status: string; notes: string; room_key: string; mission_code: string | null;
  mentor_name: string; mentor_initials: string; mentor_user_id: string | null; student_name: string;
};
const SESSION_SELECT = `select s.id, s.mission_id, s.mentor_id, s.student_id, s.kind, s.title, s.starts_at, s.status, s.notes, s.room_key,
  m.code as mission_code, p.name as mentor_name, p.initials as mentor_initials, p.user_id as mentor_user_id, u.name as student_name
  from sessions s left join missions m on m.id = s.mission_id join mentor_profiles p on p.id = s.mentor_id join users u on u.id = s.student_id`;

export const getSession = (id: string) => one<SessionRow>(`${SESSION_SELECT} where s.id = $1`, [id]);
export const sessionsForUser = (userId: string, role: 'student' | 'mentor') =>
  query<SessionRow>(`${SESSION_SELECT} where ${role === 'student' ? 's.student_id' : 'p.user_id'} = $1 order by s.starts_at`, [userId]);

export function canAccessSession(userId: string, s: SessionRow) {
  return s.student_id === userId || s.mentor_user_id === userId;
}
