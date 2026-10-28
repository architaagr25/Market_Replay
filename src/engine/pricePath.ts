import type { Candle } from "@/data/types";

export const MINUTE = 60_000;

// Where inside the minute the two extremes are placed. Thirds keep the path
// evenly paced: open, first extreme, second extreme, close.
const FIRST_EXTREME_AT = 20_000;
const SECOND_EXTREME_AT = 40_000;

export type PathPoint = [time: number, price: number];

/**
 * Index of the candle covering `time`: the last one that started at or before
 * it. -1 if `time` is before the first candle.
 *
 * Plain binary search. The candles are validated as sorted and unique on load,
 * which is what makes this safe.
 */
export function findCandleIndex(candles: readonly Candle[], time: number): number {
  let lo = 0;
  let hi = candles.length - 1;
  let found = -1;

  while (lo <= hi) {
    const mid = (lo + hi) >>> 1;
    if (candles[mid]!.time <= time) {
      found = mid;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }

  return found;
}

/**
 * The route price takes through one minute.
 *
 * The data only has open, high, low and close per minute, not the order things
 * happened in. To animate a candle forming we need some path, so this uses the
 * common backtesting convention: a green candle dips to its low before rallying
 * to its high, and a red candle does the opposite. Either way it touches both
 * extremes and ends on the close.
 *
 * The last point sits exactly at the end of the minute. At that instant the
 * next candle's open takes over (see priceAt).
 */
export function minutePath(candle: Candle): PathPoint[] {
  const { time, open, high, low, close } = candle;
  const [first, second] = close >= open ? [low, high] : [high, low];

  return [
    [time, open],
    [time + FIRST_EXTREME_AT, first],
    [time + SECOND_EXTREME_AT, second],
    [time + MINUTE, close],
  ];
}

/**
 * Price at a market time. Between waypoints price moves in a straight line.
 * After a candle's minute is over (a gap in the data, or after the last
 * candle) the price sits at that candle's close until the next one opens.
 *
 * Returns null before the first candle, since nothing has traded yet.
 */
export function priceAt(candles: readonly Candle[], time: number): number | null {
  const index = findCandleIndex(candles, time);
  if (index < 0) return null;

  const candle = candles[index]!;
  if (time >= candle.time + MINUTE) return candle.close;

  return interpolate(minutePath(candle), time);
}

function interpolate(path: PathPoint[], time: number): number {
  for (let i = 1; i < path.length; i++) {
    const [t1, p1] = path[i]!;
    if (time <= t1) {
      const [t0, p0] = path[i - 1]!;
      return p0 + ((p1 - p0) * (time - t0)) / (t1 - t0);
    }
  }
  return path[path.length - 1]![1];
}
