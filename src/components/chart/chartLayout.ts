import type { Candle } from "@/data/types";

/** Horizontal space per candle, in points. */
export const CANDLE_SPACING = 8;

/** Room kept on the right for price labels. */
export const PRICE_AXIS_WIDTH = 64;

/** Room kept at the bottom for time labels. */
export const TIME_AXIS_HEIGHT = 20;

// Space above the highest high and below the lowest low, as a fraction of the
// visible range, so wicks never touch the edges.
const PRICE_PADDING = 0.08;

export interface ChartLayout {
  width: number;
  height: number;
  plot: { left: number; top: number; right: number; bottom: number };
  /** Index of the leftmost candle on screen. */
  firstIndex: number;
  minPrice: number;
  maxPrice: number;
  /** Centre x of the candle at `index` (an index into the full candle array). */
  x: (index: number) => number;
  y: (price: number) => number;
  /** Inverse of y, for turning a touch position back into a price. */
  priceAt: (y: number) => number;
}

interface LayoutInput {
  candles: readonly Candle[];
  width: number;
  height: number;
  /** Always kept in range, even if it's outside the visible candles. */
  lastPrice: number;
  spacing?: number;
}

/**
 * Works out which candles fit and how prices map to the screen.
 *
 * The chart always follows the latest candle. Early in the session the
 * candles start from the left edge and fill rightwards; once they no longer fit,
 * the oldest ones scroll off to the left.
 *
 * The price range only covers what's visible, so a 6% crash earlier in the
 * day doesn't squash the last hour into a flat line.
 */
export function computeLayout({
  candles,
  width,
  height,
  lastPrice,
  spacing = CANDLE_SPACING,
}: LayoutInput): ChartLayout {
  const plot = {
    left: 0,
    top: 8,
    right: Math.max(0, width - PRICE_AXIS_WIDTH),
    bottom: Math.max(8, height - TIME_AXIS_HEIGHT),
  };

  const fits = Math.max(1, Math.floor((plot.right - plot.left) / spacing));
  const firstIndex = Math.max(0, candles.length - fits);

  let low = lastPrice;
  let high = lastPrice;
  for (let i = firstIndex; i < candles.length; i++) {
    const candle = candles[i]!;
    if (candle.low < low) low = candle.low;
    if (candle.high > high) high = candle.high;
  }

  // A completely flat stretch (like a trading halt) would give a zero range
  // and divide by zero, so give it a little height around the price.
  const range = high - low || lastPrice * 0.005;
  const minPrice = low - range * PRICE_PADDING;
  const maxPrice = high + range * PRICE_PADDING;

  const plotHeight = plot.bottom - plot.top;
  const y = (price: number) =>
    plot.top + ((maxPrice - price) / (maxPrice - minPrice)) * plotHeight;
  const priceAt = (py: number) =>
    maxPrice - ((py - plot.top) / plotHeight) * (maxPrice - minPrice);
  const x = (index: number) => plot.left + (index - firstIndex + 0.5) * spacing;

  return { width, height, plot, firstIndex, minPrice, maxPrice, x, y, priceAt };
}
