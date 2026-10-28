import type { Candle } from "@/data/types";
import { istMinuteOfDay } from "@/utils/marketHours";

const NICE_FRACTIONS = [1, 2, 2.5, 5, 10];

/**
 * A "nice" gap between price labels: 1, 2, 2.5 or 5 times a power of ten,
 * picked so roughly `target` labels fit in the range. This is why charts
 * label 22,000 / 22,050 / 22,100 instead of 21,987.3 / 22,041.9 / ...
 */
export function niceStep(range: number, target = 4): number {
  if (!(range > 0)) return 1;

  const rough = range / target;
  const magnitude = 10 ** Math.floor(Math.log10(rough));
  const fraction = rough / magnitude;

  const nice = NICE_FRACTIONS.find((n) => fraction <= n) ?? 10;
  return nice * magnitude;
}

/** Price levels to label between min and max, all multiples of a nice step. */
export function priceTicks(min: number, max: number, target = 4): number[] {
  const step = niceStep(max - min, target);
  const ticks: number[] = [];

  // Rounding avoids labels like 22049.999999999996 from repeated adding
  for (let value = Math.ceil(min / step) * step; value <= max; value += step) {
    ticks.push(Math.round(value * 100) / 100);
  }
  return ticks;
}

// Label spacings to choose from, in minutes. All of them divide an hour, so
// labels land on round clock times.
const TIME_INTERVALS = [5, 10, 15, 30, 60];

/**
 * Indices of candles that get a time label: ones on round clock times (every
 * 10 minutes, 15, 30...), spaced so the labels don't overlap.
 */
export function timeTicks(
  candles: readonly Candle[],
  firstIndex: number,
  spacing: number,
  minLabelGap = 56,
): number[] {
  const interval =
    TIME_INTERVALS.find((minutes) => minutes * spacing >= minLabelGap) ?? 60;

  const ticks: number[] = [];
  for (let i = firstIndex; i < candles.length; i++) {
    if (istMinuteOfDay(candles[i]!.time) % interval === 0) ticks.push(i);
  }
  return ticks;
}
