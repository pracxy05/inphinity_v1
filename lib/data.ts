import type { IconName } from '@/components/Icons';

/* Shared constants and types. People, missions and requests now live in the database (see db/migrations).
   No prices are set anywhere: rates come from a rate card the company will publish. */

export type DomainId = 'uav' | 'cubesat' | 'cansat' | 'rocketry' | 'avionics' | 'rf' | 'gnc' | 'payload' | 'ground' | 'defence';

export const domains: { id: DomainId; name: string; icon: IconName; blurb: string }[] = [
  { id: 'uav', name: 'UAV and autopilot', icon: 'uav', blurb: 'Fixed-wing, multirotor and VTOL airframes, flight controllers and tuning.' },
  { id: 'cubesat', name: 'CubeSats and nanosatellites', icon: 'cubesat', blurb: 'Bus design, power, attitude control and mission operations.' },
  { id: 'cansat', name: 'CanSat', icon: 'cansat', blurb: 'Soda-can-sized satellites for competitions and education.' },
  { id: 'rocketry', name: 'Rockets and propulsion', icon: 'rocket', blurb: 'Sounding rockets, motors, recovery systems and range safety.' },
  { id: 'avionics', name: 'Avionics and embedded', icon: 'avionics', blurb: 'Flight computers, sensors, firmware and real-time software.' },
  { id: 'rf', name: 'RF and telemetry', icon: 'rf', blurb: 'Link budgets, antennas, LoRa and S-band, air-to-ground links.' },
  { id: 'gnc', name: 'Guidance, navigation and control', icon: 'gnc', blurb: 'State estimation, control laws, orbit determination and simulation.' },
  { id: 'payload', name: 'Payloads and sensors', icon: 'payload', blurb: 'Imaging, atmospheric and science instruments with their data chains.' },
  { id: 'ground', name: 'Ground segment', icon: 'ground', blurb: 'Ground stations, mission control software and data pipelines.' },
  { id: 'defence', name: 'Defence and dual-use', icon: 'defence', blurb: 'Security-sensitive systems. A compliance review applies before matching.' },
];

export const domainName = (id: DomainId) => domains.find((d) => d.id === id)?.name ?? id;

export const trlLevels = [
  { n: 1, short: 'Basic principles', long: 'Basic principles observed and reported.' },
  { n: 2, short: 'Concept formulated', long: 'Technology concept and application formulated.' },
  { n: 3, short: 'Proof of concept', long: 'Analytical and experimental proof of concept.' },
  { n: 4, short: 'Lab validation', long: 'Component or breadboard validated in a laboratory.' },
  { n: 5, short: 'Relevant environment', long: 'Component or breadboard validated in a relevant environment.' },
  { n: 6, short: 'Prototype demonstrated', long: 'System or prototype demonstrated in a relevant environment.' },
  { n: 7, short: 'Operational demo', long: 'System prototype demonstrated in an operational environment.' },
  { n: 8, short: 'System qualified', long: 'Actual system completed and qualified through test and demonstration.' },
  { n: 9, short: 'Proven in service', long: 'Actual system proven through successful mission operations.' },
];

export type Mentor = {
  id: string; // the profile's URL slug
  name: string;
  initials: string;
  title: string;
  background: string;
  domains: DomainId[];
  trl: [number, number];
  years: number;
  languages: string[];
  timezone: string;
  availability: string;
  /** 3 rows (morning, afternoon, evening) by 7 columns (Mon to Sun) */
  grid: boolean[][];
  formats: string[];
  tier: 'A' | 'B' | 'C';
  verified: { identity: boolean; credentials: boolean; domainReview: boolean; background: boolean };
  defenceCleared: boolean;
  bio: string;
  topics: string[];
  isSample?: boolean;
};

export const formatOptions = ['Hourly session', 'Monthly package', 'Fixed-price milestone'];

export type MissionStatus = 'On track' | 'At risk' | 'Awaiting mentor' | 'Overdue' | 'Completed';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
/** Deterministic date format so server and browser always render the same text. */
export function fmtDate(iso: string): string {
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
  return `${d} ${MONTHS[m - 1]} ${y}`;
}

/** Whole days from today (UTC) to an ISO date. Call on the server, where "today" is one consistent value. */
export function daysUntil(iso: string, now: Date = new Date()): number {
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  return Math.round((Date.UTC(y, m - 1, d) - today) / 86400000);
}
