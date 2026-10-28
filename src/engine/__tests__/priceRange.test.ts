import { DAYS } from "@/data/catalog";
import { loadDay } from "@/data/loadDay";

import { makeDay, MINUTE, OPEN, SECOND } from "../__fixtures__/makeDay";
import { firstCrossing, pathBetween, priceAt, priceRange } from "../pricePath";

describe("pathBetween", () => {
  const { candles } = makeDay([
    [100, 104, 99, 103], // green: 100 -> 99 -> 104 -> 103
    [105, 106, 104, 104], // opens on a jump up from 103
    null,
    [101, 102, 100, 102],
  ]);

  it("lists the turning points inside one minute", () => {
    expect(pathBetween(candles, OPEN, OPEN + 30 * SECOND)).toEqual([
      [OPEN, 100],
      [OPEN + 20 * SECOND, 99],
      [OPEN + 30 * SECOND, 101.5],
    ]);
  });

  it("marks a jump between candles with two points at the same time", () => {
    const path = pathBetween(candles, OPEN + 50 * SECOND, OPEN + MINUTE + 5 * SECOND);

    expect(path).toContainEqual([OPEN + MINUTE, 103]);
    expect(path).toContainEqual([OPEN + MINUTE, 105]);
  });

  it("stays flat through missing minutes", () => {
    const path = pathBetween(candles, OPEN + 2 * MINUTE, OPEN + 3 * MINUTE);

    expect(path).toEqual([
      [OPEN + 2 * MINUTE, 104],
      [OPEN + 3 * MINUTE, 104],
      [OPEN + 3 * MINUTE, 101],
    ]);
  });

  it("is a single point when from and to are equal", () => {
    expect(pathBetween(candles, OPEN, OPEN)).toEqual([[OPEN, 100]]);
  });

  it("is empty before the open", () => {
    expect(pathBetween(candles, OPEN - MINUTE, OPEN - SECOND)).toEqual([]);
  });
});

describe("priceRange", () => {
  it("catches a spike that happened between two frames", () => {
    const { candles } = makeDay([
      [100, 101, 99, 100],
      [100, 101, 99, 100],
      [100, 130, 70, 100], // the spike
      [100, 101, 99, 100],
      [100, 101, 99, 100],
    ]);

    // One frame at 300× covers five minutes
    const range = priceRange(
      candles,
      OPEN + 10 * SECOND,
      OPEN + 4 * MINUTE + 50 * SECOND,
    );

    expect(range).toMatchObject({ high: 130, low: 70 });
  });

  const { candles } = loadDay(DAYS[0]!);

  // Brute force: sample the price every second, and 1 ms before every second
  // to catch the close at the very end of each minute.
  function sampledRange(from: number, to: number) {
    let high = -Infinity;
    let low = Infinity;
    for (let t = from; t <= to; t += SECOND) {
      for (const sample of [
        priceAt(candles, t)!,
        priceAt(candles, Math.max(from, t - 1))!,
      ]) {
        high = Math.max(high, sample);
        low = Math.min(low, sample);
      }
    }
    return { high, low };
  }

  it.each([
    ["one second", 0, 1],
    ["most of a minute", 7, 52],
    ["across a minute boundary", 45, 75],
    ["five minutes, like a 300× frame", 30, 330],
    ["half an hour", 3_600, 5_400],
  ])("matches brute-force sampling over %s", (_label, fromSec, toSec) => {
    const from = candles[0]!.time + fromSec * SECOND;
    const to = candles[0]!.time + toSec * SECOND;

    const range = priceRange(candles, from, to)!;
    const sampled = sampledRange(from, to);

    expect(range.high).toBeCloseTo(sampled.high, 1);
    expect(range.low).toBeCloseTo(sampled.low, 1);
  });
});

describe("firstCrossing", () => {
  it("finds where price moves smoothly through a level", () => {
    // Red candle: 102 -> 110 at 20s -> 90 at 40s -> 95
    const { candles } = makeDay([[102, 110, 90, 95]]);

    const hit = firstCrossing(candles, OPEN, OPEN + MINUTE, 100, "down");

    // On the way down from 110 to 90, halfway between 20s and 40s
    expect(hit).toEqual({ time: OPEN + 30 * SECOND, price: 100 });
  });

  it("fills at the open, not the level, when price jumps past it", () => {
    // Flat during a halt, then trading resumes far lower
    const { candles } = makeDay([
      [100, 100, 100, 100],
      [100, 100, 100, 100],
      [80, 82, 79, 81],
    ]);

    const hit = firstCrossing(candles, OPEN, OPEN + 3 * MINUTE, 95, "down");

    expect(hit).toEqual({ time: OPEN + 2 * MINUTE, price: 80 });
  });

  it("triggers immediately if price is already past the level", () => {
    const { candles } = makeDay([[100, 101, 99, 100]]);

    expect(firstCrossing(candles, OPEN, OPEN + MINUTE, 105, "down")).toEqual({
      time: OPEN,
      price: 100,
    });
  });

  it("works upwards too", () => {
    const { candles } = makeDay([[100, 110, 95, 108]]);

    // Green: dips to 95 at 20s, then climbs to 110 at 40s
    const hit = firstCrossing(candles, OPEN, OPEN + MINUTE, 105, "up")!;

    expect(hit.price).toBe(105);
    expect(hit.time).toBeCloseTo(OPEN + 20 * SECOND + (10 / 15) * 20 * SECOND);
  });

  it("returns null when the level is never reached", () => {
    const { candles } = makeDay([[100, 101, 99, 100]]);

    expect(firstCrossing(candles, OPEN, OPEN + MINUTE, 90, "down")).toBeNull();
  });

  it("finds the slide to the lower circuit on 13 March 2020 in one big step", () => {
    const covidDay = loadDay(DAYS.find((d) => d.id === "2020-03-13")!);
    const open = covidDay.candles[0]!.time;

    // Fifteen minutes in one call, far more than any real frame covers
    const hit = firstCrossing(covidDay.candles, open, open + 15 * MINUTE, 8630, "down")!;

    expect(hit.price).toBe(8630);
    // It happens during the 09:21 candle
    expect(hit.time).toBeGreaterThanOrEqual(open + 6 * MINUTE);
    expect(hit.time).toBeLessThan(open + 7 * MINUTE);
  });
});
