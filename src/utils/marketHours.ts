// NSE cash market hours, in minutes since midnight IST.
export const MARKET_OPEN_MINUTE = 9 * 60 + 15; // 09:15
export const MARKET_CLOSE_MINUTE = 15 * 60 + 30; // 15:30

const IST_OFFSET_MINUTES = 5 * 60 + 30;
const MINUTES_PER_DAY = 24 * 60;

/**
 * Minutes since midnight in IST for a UTC timestamp.
 * India has no daylight saving, so a fixed offset is enough and we avoid
 * depending on the device's time zone.
 */
export function istMinuteOfDay(timestamp: number): number {
  const minutes = Math.floor(timestamp / 60_000) + IST_OFFSET_MINUTES;
  return ((minutes % MINUTES_PER_DAY) + MINUTES_PER_DAY) % MINUTES_PER_DAY;
}

/**
 * True if a one-minute candle starting at this timestamp belongs to the
 * regular session. The last candle starts at 15:29, so the close is exclusive.
 */
export function isWithinMarketHours(timestamp: number): boolean {
  const minute = istMinuteOfDay(timestamp);
  return minute >= MARKET_OPEN_MINUTE && minute < MARKET_CLOSE_MINUTE;
}

/** The IST calendar date ("YYYY-MM-DD") a UTC timestamp falls on. */
export function istDate(timestamp: number): string {
  return new Date(timestamp + IST_OFFSET_MINUTES * 60_000).toISOString().slice(0, 10);
}
