import { z } from 'zod';
import { domains, formatOptions } from '@/lib/data';

const domainIds = domains.map((d) => d.id) as [string, ...string[]];

export const email = z.string().trim().toLowerCase().email('Enter a valid email address.').max(254);
export const password = z.string().min(10, 'Use at least 10 characters.').max(200);
const text = (min: number, max: number) => z.string().trim().min(min).max(max);
export const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use a date like 2027-03-15.').refine((s) => !Number.isNaN(Date.parse(s)), 'Not a real date.');

export const registerBody = z.object({
  name: text(2, 100),
  email,
  password,
  dob: isoDate,
  role: z.enum(['student', 'mentor']),
  accept: z.literal(true, { message: 'You must accept the terms.' }),
});
export const loginBody = z.object({ email, password: z.string().min(1).max(200) });

export const contactBody = z.object({ name: text(2, 100), email, subject: text(3, 150), message: text(10, 4000), website: z.string().max(500).optional() });

export const missionBody = z.object({
  title: text(4, 150),
  domain: z.enum(domainIds),
  summary: text(11, 4000),
  trl: z.number().int().min(1).max(9),
  teamSize: z.number().int().min(1).max(50),
  pdc: isoDate,
  needs: z.array(text(1, 80)).min(1).max(12),
  formats: z.array(z.enum(formatOptions as [string, ...string[]])).min(1),
  language: text(2, 40),
  declarations: z.object({ owner: z.literal(true), noRestricted: z.literal(true), integrity: z.literal(true), defence: z.boolean().optional() }),
  attachmentIds: z.array(z.string().uuid()).max(20).default([]),
  preferredMentor: z.string().max(80).optional(),
});

export const missionUpdateBody = z.object({
  progress: z.number().int().min(0).max(100).optional(),
  nextStep: text(1, 200).optional(),
  status: z.enum(['On track', 'At risk', 'Completed']).optional(),
});

export const applicationBody = z.object({
  phone: z.string().trim().max(30).optional().default(''),
  employer: text(2, 150),
  jobRole: text(2, 150),
  title: text(3, 150),
  years: z.number().int().min(0).max(60),
  domains: z.array(z.enum(domainIds)).min(1).max(10),
  trlLo: z.number().int().min(1).max(9),
  trlHi: z.number().int().min(1).max(9),
  bio: text(20, 1500),
  background: text(10, 600),
  topics: z.array(text(2, 60)).min(1).max(10),
  languages: z.array(text(2, 30)).min(1).max(8),
  formats: z.array(z.enum(formatOptions as [string, ...string[]])).min(1),
  grid: z.array(z.array(z.boolean()).length(7)).length(3),
  reviewSlot: text(3, 80),
  defenceOptIn: z.boolean(),
  agree: z.literal(true),
  idDocumentIds: z.array(z.string().uuid()).max(5).default([]),
  evidenceIds: z.array(z.string().uuid()).max(15).default([]),
}).refine((v) => v.trlLo <= v.trlHi, { message: 'Lowest readiness level must not be above the highest.', path: ['trlHi'] });

export const presignBody = z.object({
  purpose: z.enum(['mission_attachment', 'mentor_evidence', 'mentor_id_document', 'session_data']),
  name: text(1, 200),
  size: z.number().int().min(1),
  type: z.string().max(120).default('application/octet-stream'),
  missionId: z.string().uuid().optional(),
  sessionId: z.string().uuid().optional(),
});

export const proposalBody = z.object({ missionId: z.string().uuid(), message: z.string().trim().max(1500).default('') });
export const sessionBody = z.object({
  missionId: z.string().uuid().optional(),
  mentorSlug: z.string().max(80).optional(),
  kind: z.enum(['session', 'intro']).default('session'),
  title: text(3, 150),
  startsAt: z.string().refine((s) => !Number.isNaN(Date.parse(s)), 'Not a real date and time.'),
});
export const messageBody = z.object({ body: text(1, 2000) });
export const notesBody = z.object({ notes: z.string().max(20000) });
export const itemBody = z.object({ text: text(1, 300) });
export const itemToggleBody = z.object({ done: z.boolean() });

export const decisionBody = z.object({
  action: z.enum(['approve', 'reject', 'needs_info', 'in_review']),
  note: z.string().trim().max(1000).optional().default(''),
  verified: z.object({ identity: z.boolean(), credentials: z.boolean(), domainReview: z.boolean(), background: z.boolean() }).optional(),
  tier: z.enum(['A', 'B', 'C']).optional(),
  defenceCleared: z.boolean().optional(),
});
export const complianceBody = z.object({ action: z.enum(['clear', 'reject']) });
export const contactStatusBody = z.object({ status: z.enum(['Open', 'Resolved', 'Escalated']) });
export const staffBody = z.object({
  email,
  adminRole: z.enum(['Owner', 'Operations lead', 'Verification admin', 'Finance admin', 'Security admin', 'Support agent']),
});
