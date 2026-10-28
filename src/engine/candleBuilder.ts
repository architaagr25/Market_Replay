import type { Candle, TradingDay } from "@/data/types";

import { findCandleIndex, MINUTE, minutePath, priceAt } from "./pricePath";

export interface ReplaySnapshot {
  /** Market time this snapshot describes. */
  time: number;
  /**
   * Everything that would be on screen at `time`: finished candles, plus the
   * one still forming, if any, as the last element.
   */
  candles: Candle[];
  /** Whether the last element of `candles` is still forming. */
  isForming: boolean;
  /** Last traded price. The previous close before the first candle opens. */
  lastPrice: number;
}

/**
 * What the market looked like at `time`, using only information available at
 * that moment.
 *
 * This is a pure function of (day, time). The replay never builds state up
 * tick by tick, so jumping straight to 14:00 gives exactly the same result as
 * playing until 14:00, and there's no accumulated state to drift or go stale.
 */
export function snapshotAt(day: TradingDay, time: number): ReplaySnapshot {
  const { candles } = day;
  const index = findCandleIndex(candles, time);

  if (index < 0) {
    return { time, candles: [], isForming: false, lastPrice: day.prevClose };
  }

  const current = candles[index]!;
  const lastPrice = priceAt(candles, time)!;

  // The covering candle's minute is over: it's complete, along with
  // everything before it.
  if (time >= current.time + MINUTE) {
    return { time, candles: candles.slice(0, index + 1), isForming: false, lastPrice };
  }

  return {
    time,
    candles: [...candles.slice(0, index), formingCandle(current, time, lastPrice)],
    isForming: true,
    lastPrice,
  };
}

/**
 * The part of a candle that has happened so far. Its high and low only count
 * points on the path already passed, so a spike later in the same minute
 * doesn't show up early.
 */
function formingCandle(candle: Candle, time: number, price: number): Candle {
  let high = price;
  let low = price;

  for (const [t, p] of minutePath(candle)) {
    if (t > time) break;
    if (p > high) high = p;
    if (p < low) low = p;
  }

  return { time: candle.time, open: candle.open, high, low, close: price };
}
