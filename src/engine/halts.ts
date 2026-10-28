import type { Candle } from "@/data/types";

import { MINUTE } from "./pricePath";

/** A period when normal trading was stopped. `end` is when trading resumed. */
export interface Halt {
  start: number;
  end: number;
}

// An index made of 50 stocks basically never goes a whole minute without
// moving, let alone five in a row. A run that long means nothing traded.
const MIN_FLAT_MINUTES = 5;

// After a market-wide halt NSE runs a 15-minute pre-open session before normal
// trading restarts. Prices move during it (orders are being matched for the
// reopening price) but nobody can trade at them. Flat runs this close
// together are treated as one halt with the pre-open in between.
const MAX_PREOPEN_MINUTES = 15;

/**
 * Finds trading halts by looking for long runs of completely flat candles,
 * where open, high, low and close are all the same.
 *
 * The dataset has no halt flag, so this is inferred from the prices. On
 * 13 March 2020 it finds the circuit-breaker halt from 09:22 to 10:21.
 */
export function detectHalts(candles: readonly Candle[]): Halt[] {
  const runs: { first: number; last: number }[] = [];
  let runStart = -1;

  candles.forEach((candle, i) => {
    if (isFlat(candle)) {
      if (runStart < 0) runStart = i;
      return;
    }
    if (runStart >= 0 && i - runStart >= MIN_FLAT_MINUTES) {
      runs.push({ first: runStart, last: i - 1 });
    }
    runStart = -1;
  });

  // A flat run reaching the close is just the session ending quietly, not a
  // halt anyone could wait out, so it's deliberately left out.

  const halts: Halt[] = [];
  for (const run of runs) {
    const start = candles[run.first]!.time;
    // Trading resumes with the first candle after the run
    const end = candles[run.last + 1]!.time;

    const previous = halts[halts.length - 1];
    if (previous && start - previous.end <= MAX_PREOPEN_MINUTES * MINUTE) {
      previous.end = end;
    } else {
      halts.push({ start, end });
    }
  }

  return halts;
}

/** The halt in force at `time`, if any. */
export function haltAt(halts: readonly Halt[], time: number): Halt | null {
  return halts.find((halt) => time >= halt.start && time < halt.end) ?? null;
}

/**
 * Splits [from, to] into the parts where trading was open, skipping halts.
 * Used so a stop-loss can't fire on a pre-open price nobody could trade at.
 */
export function tradingWindows(
  halts: readonly Halt[],
  from: number,
  to: number,
): [number, number][] {
  const windows: [number, number][] = [];
  let cursor = from;

  for (const halt of halts) {
    if (halt.end <= cursor || halt.start >= to) continue;
    if (halt.start > cursor) windows.push([cursor, halt.start]);
    cursor = halt.end;
  }

  if (cursor <= to) windows.push([cursor, to]);
  return windows;
}

function isFlat(candle: Candle): boolean {
  return (
    candle.open === candle.high &&
    candle.high === candle.low &&
    candle.low === candle.close
  );
}
