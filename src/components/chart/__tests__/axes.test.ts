import { makeDay } from "@/engine/__fixtures__/makeDay";

import { niceStep, priceTicks, timeTicks } from "../axes";

describe("niceStep", () => {
  it.each([
    [400, 100],
    [180, 50],
    [90, 25],
    [37, 10],
    [7.3, 2],
  ])("picks a round step for a range of %d", (range, expected) => {
    expect(niceStep(range)).toBe(expected);
  });

  it("doesn't blow up on a zero range", () => {
    expect(niceStep(0)).toBe(1);
  });
});

describe("priceTicks", () => {
  it("labels round levels inside the range", () => {
    expect(priceTicks(21_987.3, 22_170.6)).toEqual([22_000, 22_050, 22_100, 22_150]);
  });

  it("doesn't produce float noise", () => {
    for (const tick of priceTicks(0.3, 1.1)) {
      expect(String(tick)).not.toMatch(/\d{5,}$/);
    }
  });
});

describe("timeTicks", () => {
  const candles = makeDay(
    Array.from(
      { length: 60 },
      () => [100, 101, 99, 100] as [number, number, number, number],
    ),
  ).candles;

  it("labels round clock times", () => {
    // 8 pt per candle needs 10-minute gaps to fit 56 pt labels
    const ticks = timeTicks(candles, 0, 8);

    // 09:20, 09:30, ... from a 09:15 start
    expect(ticks).toEqual([5, 15, 25, 35, 45, 55]);
  });

  it("spreads labels out on a tighter chart", () => {
    expect(timeTicks(candles, 0, 2)).toEqual([15, 45]); // 09:30 and 10:00
  });

  it("only labels visible candles", () => {
    expect(timeTicks(candles, 30, 8)).toEqual([35, 45, 55]);
  });
});
