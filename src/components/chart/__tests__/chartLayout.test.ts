import { makeDay } from "@/engine/__fixtures__/makeDay";

import {
  CANDLE_SPACING,
  computeLayout,
  PRICE_AXIS_WIDTH,
  TIME_AXIS_HEIGHT,
} from "../chartLayout";

const WIDTH = 64 + PRICE_AXIS_WIDTH; // room for exactly 8 candles
const HEIGHT = 200 + 8 + TIME_AXIS_HEIGHT;

function day(count: number, priceOf: (i: number) => number = () => 100) {
  return makeDay(
    Array.from({ length: count }, (_, i) => {
      const p = priceOf(i);
      return [p, p + 1, p - 1, p] as [number, number, number, number];
    }),
  ).candles;
}

describe("computeLayout", () => {
  it("fills from the left while the candles still fit", () => {
    const layout = computeLayout({
      candles: day(3),
      width: WIDTH,
      height: HEIGHT,
      lastPrice: 100,
    });

    expect(layout.firstIndex).toBe(0);
    expect(layout.x(0)).toBe(CANDLE_SPACING / 2);
  });

  it("scrolls so the newest candle is always on screen", () => {
    const layout = computeLayout({
      candles: day(20),
      width: WIDTH,
      height: HEIGHT,
      lastPrice: 100,
    });

    expect(layout.firstIndex).toBe(12);
    expect(layout.x(19)).toBeLessThan(layout.plot.right);
    expect(layout.x(12)).toBe(CANDLE_SPACING / 2);
  });

  it("scales prices to the visible candles only", () => {
    // An early crash to 50 that has scrolled off screen
    const candles = day(20, (i) => (i < 5 ? 50 : 100));
    const layout = computeLayout({
      candles,
      width: WIDTH,
      height: HEIGHT,
      lastPrice: 100,
    });

    expect(layout.minPrice).toBeGreaterThan(90);
  });

  it("keeps every visible high and low inside the plot", () => {
    const candles = day(8, (i) => 100 + i * 3);
    const layout = computeLayout({
      candles,
      width: WIDTH,
      height: HEIGHT,
      lastPrice: 121,
    });

    for (const candle of candles) {
      expect(layout.y(candle.high)).toBeGreaterThan(layout.plot.top);
      expect(layout.y(candle.low)).toBeLessThan(layout.plot.bottom);
    }
  });

  it("puts higher prices nearer the top", () => {
    const layout = computeLayout({
      candles: day(5),
      width: WIDTH,
      height: HEIGHT,
      lastPrice: 100,
    });

    expect(layout.y(100.5)).toBeLessThan(layout.y(99.5));
  });

  it("can turn a y position back into a price", () => {
    const layout = computeLayout({
      candles: day(5),
      width: WIDTH,
      height: HEIGHT,
      lastPrice: 100,
    });

    expect(layout.priceAt(layout.y(100.37))).toBeCloseTo(100.37);
  });

  it("gives a flat stretch some height instead of dividing by zero", () => {
    const flat = makeDay([
      [100, 100, 100, 100],
      [100, 100, 100, 100],
    ]).candles;
    const layout = computeLayout({
      candles: flat,
      width: WIDTH,
      height: HEIGHT,
      lastPrice: 100,
    });

    expect(layout.maxPrice).toBeGreaterThan(layout.minPrice);
    expect(Number.isFinite(layout.y(100))).toBe(true);
  });

  it("keeps the last price in range even with no candles yet", () => {
    const layout = computeLayout({
      candles: [],
      width: WIDTH,
      height: HEIGHT,
      lastPrice: 100,
    });

    expect(layout.y(100)).toBeGreaterThan(layout.plot.top);
    expect(layout.y(100)).toBeLessThan(layout.plot.bottom);
  });
});
