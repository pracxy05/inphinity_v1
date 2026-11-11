import 'server-only';
import { one } from './db';
import { tooMany } from './http';

/** Fixed-window limiter stored in the database, so it works across serverless instances. */
export async function rateLimit(key: string, max: number, windowSec: number) {
  const r = await one<{ count: number }>(
    `insert into rate_limits (key, window_start, count) values ($1, now(), 1)
     on conflict (key) do update set
       count = case when rate_limits.window_start < now() - make_interval(secs => $2) then 1 else rate_limits.count + 1 end,
       window_start = case when rate_limits.window_start < now() - make_interval(secs => $2) then now() else rate_limits.window_start end
     returning count`,
    [key, windowSec],
  );
  if (r && r.count > max) throw tooMany();
}
