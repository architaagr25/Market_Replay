import { DAYS } from "../catalog";
import { DayDataError, loadDay, parseDay } from "../loadDay";
import type { RawCandle } from "../types";

// 09:15 IST on 4 June 2024
const OPEN = Date.parse("2024-06-04T09:15:00+05:30");
const MINUTE = 60_000;

function candle(
  minute: number,
  overrides: Partial<Record<number, number>> = {},
): RawCandle {
  const row: RawCandle = [OPEN + minute * MINUTE, 100, 102, 99, 101];
  for (const [index, value] of Object.entries(overrides)) {
    row[Number(index)] = value!;
  }
  return row;
}

function day(candles: unknown[], extra: object = {}) {
  return { date: "2024-06-04", prevClose: 100, candles, ...extra };
}

describe("parseDay", () => {
  it("turns tuples into candle objects", () => {
    const result = parseDay(day([candle(0), candle(1)]));

    expect(result.prevClose).toBe(100);
    expect(result.candles).toEqual([
      { time: OPEN, open: 100, high: 102, low: 99, close: 101 },
      { time: OPEN + MINUTE, open: 100, high: 102, low: 99, close: 101 },
    ]);
  });

  it("allows missing minutes", () => {
    expect(() => parseDay(day([candle(0), candle(5)]))).not.toThrow();
  });

  it.each([
    ["a non-object", null],
    ["a bad date", day([candle(0)], { date: "4 June" })],
    ["a missing prevClose", day([candle(0)], { prevClose: undefined })],
    ["no candles", day([])],
    ["a short tuple", day([[OPEN, 1, 2, 3]])],
    ["a time off the minute", day([candle(0, { 0: OPEN + 30_000 })])],
    ["a zero price", day([candle(0, { 4: 0 })])],
    ["a NaN price", day([candle(0, { 1: NaN })])],
    ["a low above the close", day([candle(0, { 3: 101.5 })])],
    ["a high below the open", day([candle(0, { 2: 99.5 })])],
    ["a candle before the open", day([candle(-1)])],
    ["a candle at 15:30", day([candle(375)])],
    ["a candle from another day", day([candle(24 * 60)])],
    ["duplicate minutes", day([candle(0), candle(0)])],
    ["candles out of order", day([candle(1), candle(0)])],
  ])("rejects %s", (_label, source) => {
    expect(() => parseDay(source)).toThrow(DayDataError);
  });

  it("says which candle is wrong", () => {
    expect(() => parseDay(day([candle(0), candle(1, { 3: 200 })]))).toThrow(
      "2024-06-04: candle 1 has a low above its open or close",
    );
  });
});

describe("bundled days", () => {
  it.each(DAYS.map((entry) => [entry.id, entry] as const))(
    "%s is valid",
    (_id, entry) => {
      const result = loadDay(entry);

      expect(result.date).toBe(entry.id);
      // A full session is 09:15 to 15:29, one candle per minute
      expect(result.candles).toHaveLength(375);
    },
  );
});
