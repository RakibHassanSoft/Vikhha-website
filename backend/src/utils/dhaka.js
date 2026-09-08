/**
 * The portal's business day is the Bangladesh day (Asia/Dhaka, UTC+6).
 * Daily collection counters reset on that boundary, not on UTC midnight.
 */
const DHAKA_OFFSET_MS = 6 * 60 * 60 * 1000;

/** Returns the Bangladesh calendar date as `YYYY-MM-DD`. */
export function dhakaDateKey(date = new Date()) {
  return new Date(date.getTime() + DHAKA_OFFSET_MS).toISOString().slice(0, 10);
}

/** The UTC instant at which the current Bangladesh day began. */
export function dhakaDayStart(date = new Date()) {
  const key = dhakaDateKey(date);
  return new Date(Date.parse(`${key}T00:00:00.000Z`) - DHAKA_OFFSET_MS);
}
