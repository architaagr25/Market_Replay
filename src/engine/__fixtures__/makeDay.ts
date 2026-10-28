import type { Candle, TradingDay } from "@/data/types";

export const MINUTE = 60_000;
export const SECOND = 1_000;

/** 09:15 IST on 4 June 2024. */
export const OPEN = Date.parse("2024-06-04T09:15:00+05:30");

type Ohlc = [open: number, high: number, low: number, close: number];

/**
 * Builds a small trading day for tests, one row per minute from 09:15.
 * A `null` row leaves that minute out, to simulate a gap in the feed.
 */
export function makeDay(rows: (Ohlc | null)[], prevClose = 100): TradingDay {
  const candles: Candle[] = [];
  rows.forEach((row, minute) => {
    if (!row) return;
    const [open, high, low, close] = row;
    candles.push({ time: OPEN + minute * MINUTE, open, high, low, close });
  });
  return { date: "2024-06-04", prevClose, candles };
}
