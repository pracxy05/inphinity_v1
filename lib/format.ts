const TZ = 'Asia/Kolkata';

const tm = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: TZ });
const dm = new Intl.DateTimeFormat('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', timeZone: TZ });
const day = new Intl.DateTimeFormat('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: TZ });
const short = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: TZ });

/** "Sat, 14 Nov 2026, 10:00 IST". Fixed time zone so the server and browser always agree. */
export const fmtDateTime = (d: Date | string) => `${fmtDayShort(d)}, ${fmtTime(d)} IST`;
export const fmtTime = (d: Date | string) => tm.format(new Date(d));
export const fmtDayShort = (d: Date | string) => dm.format(new Date(d));
export const fmtToday = () => day.format(new Date());
export const fmtShort = (d: Date | string) => short.format(new Date(d));

export function ago(d: Date | string, now = Date.now()) {
  const s = Math.max(0, Math.round((now - new Date(d).getTime()) / 1000));
  if (s < 60) return 'Just now';
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`;
  return fmtShort(d);
}

export function maskEmail(e: string) {
  const [u, d] = e.split('@');
  return `${u.slice(0, 2)}${'*'.repeat(Math.max(1, u.length - 2))}@${d}`;
}
