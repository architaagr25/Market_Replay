import { istDate, isWithinMarketHours } from "@/utils/marketHours";

import type { DayEntry } from "./catalog";
import type { Candle, TradingDay } from "./types";

export class DayDataError extends Error {
  override name = "DayDataError";
}

const MINUTE = 60_000;

/**
 * Turns a bundled day file into a TradingDay, or throws a DayDataError saying
 * exactly what's wrong with it.
 *
 * The engine assumes candles are sorted, unique, minute-aligned and inside the
 * session, and binary searches on that. Checking once here means a bad file
 * fails loudly on load instead of producing a subtly wrong replay.
 *
 * Missing minutes are allowed. Real feeds occasionally drop one, and the engine
 * handles gaps fine.
 */
export function parseDay(source: unknown): TradingDay {
  if (typeof source !== "object" || source === null) {
    throw new DayDataError("Day data is not an object");
  }

  const { date, prevClose, candles } = source as Record<string, unknown>;

  if (typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new DayDataError(`Invalid date: ${String(date)}`);
  }
  if (!isPositiveNumber(prevClose)) {
    throw new DayDataError(`${date}: invalid prevClose ${String(prevClose)}`);
  }
  if (!Array.isArray(candles) || candles.length === 0) {
    throw new DayDataError(`${date}: no candles`);
  }

  const parsed: Candle[] = candles.map((row: unknown, i) => {
    const fail = (reason: string): never => {
      throw new DayDataError(`${date}: candle ${i} ${reason}`);
    };

    if (!Array.isArray(row) || row.length !== 5) fail("is not a 5-value tuple");
    const [time, open, high, low, close] = row as unknown[];

    if (typeof time !== "number" || !Number.isInteger(time) || time % MINUTE !== 0) {
      fail("has a time that isn't on a minute boundary");
    }
    if (![open, high, low, close].every(isPositiveNumber)) {
      fail("has a non-positive or non-numeric price");
    }

    const candle = { time, open, high, low, close } as Candle;

    if (candle.low > Math.min(candle.open, candle.close)) {
      fail("has a low above its open or close");
    }
    if (candle.high < Math.max(candle.open, candle.close)) {
      fail("has a high below its open or close");
    }
    if (istDate(candle.time) !== date) {
      fail(`falls on ${istDate(candle.time)}, not ${date}`);
    }
    if (!isWithinMarketHours(candle.time)) {
      fail("is outside market hours");
    }

    return candle;
  });

  for (let i = 1; i < parsed.length; i++) {
    // Non-null: i and i - 1 are both in range.
    if (parsed[i]!.time <= parsed[i - 1]!.time) {
      throw new DayDataError(`${date}: candle ${i} is out of order or duplicated`);
    }
  }

  return { date, prevClose, candles: parsed };
}

const cache = new Map<string, TradingDay>();

/** Parses a catalogue entry once and reuses the result on later visits. */
export function loadDay(entry: DayEntry): TradingDay {
  let day = cache.get(entry.id);
  if (!day) {
    day = parseDay(entry.source);
    if (day.date !== entry.id) {
      throw new DayDataError(
        `Catalogue entry ${entry.id} points at data for ${day.date}`,
      );
    }
    cache.set(entry.id, day);
  }
  return day;
}

function isPositiveNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}
