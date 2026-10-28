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

/**
 * Every turning point price passes through between two market times, in order,
 * starting with the price at `from` and ending with the price at `to`.
 *
 * This is what makes high speeds safe. At 300× one frame can cover several
 * minutes, so sampling the price once per frame would step straight over a
 * spike in the middle. Walking the path instead means nothing in between is
 * skipped.
 *
 * Two points with the same time mean an instant jump: the next candle opening
 * away from the previous close, or trading resuming after a halt.
 */
export function pathBetween(
  candles: readonly Candle[],
  from: number,
  to: number,
): PathPoint[] {
  if (to < from) throw new RangeError("pathBetween: `to` is before `from`");

  const endPrice = priceAt(candles, to);
  if (endPrice === null) return [];

  // If `from` is before the open, the path starts when trading does.
  const first = Math.max(findCandleIndex(candles, from), 0);
  const start = Math.max(from, candles[first]!.time);
  const points: PathPoint[] = [[start, priceAt(candles, start)!]];

  const push = (time: number, price: number) => {
    const last = points[points.length - 1]!;
    if (last[0] !== time || last[1] !== price) points.push([time, price]);
  };

  for (let i = first; i < candles.length && candles[i]!.time <= to; i++) {
    const candle = candles[i]!;
    const prev = candles[i - 1];

    // Missing minutes before this candle: price was flat at the previous
    // close until now, then jumps to this open.
    if (prev && candle.time > prev.time + MINUTE && candle.time > start) {
      push(candle.time, prev.close);
    }

    for (const [time, price] of minutePath(candle)) {
      if (time > start && time <= to) push(time, price);
    }
  }

  push(to, endPrice);
  return points;
}

export interface PriceRange {
  open: number;
  high: number;
  low: number;
  close: number;
}

/** Open, high, low and close of everything traded between two market times. */
export function priceRange(
  candles: readonly Candle[],
  from: number,
  to: number,
): PriceRange | null {
  const path = pathBetween(candles, from, to);
  if (path.length === 0) return null;

  let high = -Infinity;
  let low = Infinity;
  for (const [, price] of path) {
    if (price > high) high = price;
    if (price < low) low = price;
  }

  return { open: path[0]![1], high, low, close: path[path.length - 1]![1] };
}

export interface Crossing {
  time: number;
  /** The price a stop at this level would actually fill at. */
  price: number;
}

/**
 * The first moment between `from` and `to` that price reaches `level`, moving
 * down to it or up to it. Used to trigger stop-losses.
 *
 * If price moves smoothly through the level, the fill is at the level. If it
 * jumps past it (a gap at the open of a minute, or trading resuming after a
 * halt), the fill is at the first price available after the jump, which is
 * worse than the level. Real stop orders behave like that too.
 */
export function firstCrossing(
  candles: readonly Candle[],
  from: number,
  to: number,
  level: number,
  direction: "down" | "up",
): Crossing | null {
  const path = pathBetween(candles, from, to);
  if (path.length === 0) return null;

  const reached = (price: number) =>
    direction === "down" ? price <= level : price >= level;

  const [startTime, startPrice] = path[0]!;
  if (reached(startPrice)) return { time: startTime, price: startPrice };

  for (let i = 1; i < path.length; i++) {
    const [t1, p1] = path[i]!;
    if (!reached(p1)) continue;

    const [t0, p0] = path[i - 1]!;
    if (t1 === t0) return { time: t1, price: p1 };

    return { time: t0 + ((p0 - level) / (p0 - p1)) * (t1 - t0), price: level };
  }

  return null;
}
