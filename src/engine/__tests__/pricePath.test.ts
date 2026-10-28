import { makeDay, MINUTE, OPEN, SECOND } from "../__fixtures__/makeDay";
import { findCandleIndex, minutePath, priceAt } from "../pricePath";

describe("findCandleIndex", () => {
  // Minutes 0, 1 and 3; minute 2 is missing
  const { candles } = makeDay([
    [100, 101, 99, 100],
    [100, 101, 99, 100],
    null,
    [100, 101, 99, 100],
  ]);

  it.each([
    ["before the first candle", OPEN - 1, -1],
    ["exactly at a candle's start", OPEN + MINUTE, 1],
    ["partway through a minute", OPEN + MINUTE + 30 * SECOND, 1],
    ["inside a gap", OPEN + 2 * MINUTE + 10 * SECOND, 1],
    ["after the last candle", OPEN + 10 * MINUTE, 2],
  ])("finds the covering candle %s", (_label, time, expected) => {
    expect(findCandleIndex(candles, time)).toBe(expected);
  });

  it("returns -1 for an empty day", () => {
    expect(findCandleIndex([], OPEN)).toBe(-1);
  });
});

describe("minutePath", () => {
  it("dips to the low before the high on a green candle", () => {
    const [candle] = makeDay([[100, 110, 95, 105]]).candles;

    expect(minutePath(candle!).map(([, price]) => price)).toEqual([100, 95, 110, 105]);
  });

  it("hits the high before the low on a red candle", () => {
    const [candle] = makeDay([[100, 110, 95, 98]]).candles;

    expect(minutePath(candle!).map(([, price]) => price)).toEqual([100, 110, 95, 98]);
  });
});

describe("priceAt", () => {
  const { candles } = makeDay([[100, 110, 95, 105], null, [107, 108, 106, 107]]);

  it("is null before the open", () => {
    expect(priceAt(candles, OPEN - 1)).toBeNull();
  });

  it("starts the minute at the open", () => {
    expect(priceAt(candles, OPEN)).toBe(100);
  });

  it("moves in a straight line between waypoints", () => {
    // Halfway from the open (100) to the low (95), which is reached at 20s
    expect(priceAt(candles, OPEN + 10 * SECOND)).toBe(97.5);
    expect(priceAt(candles, OPEN + 40 * SECOND)).toBe(110);
  });

  it("holds the close through a gap, then jumps to the next open", () => {
    expect(priceAt(candles, OPEN + MINUTE)).toBe(105);
    expect(priceAt(candles, OPEN + 2 * MINUTE - 1)).toBe(105);
    expect(priceAt(candles, OPEN + 2 * MINUTE)).toBe(107);
  });

  it("holds the last close after the session", () => {
    expect(priceAt(candles, OPEN + 60 * MINUTE)).toBe(107);
  });
});
