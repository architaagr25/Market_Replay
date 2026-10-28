import { DAYS } from "@/data/catalog";
import { loadDay } from "@/data/loadDay";

import { makeDay, MINUTE, OPEN, SECOND } from "../__fixtures__/makeDay";
import { snapshotAt } from "../candleBuilder";
import { ReplayClock } from "../replayClock";

const day = makeDay([
  [100, 104, 99, 103],
  [103, 112, 101, 102], // red: up to 112 at 20s, down to 101 at 40s
  [102, 103, 100, 101],
]);

describe("snapshotAt", () => {
  it("shows only the previous close before the open", () => {
    const snap = snapshotAt(day, OPEN - SECOND);

    expect(snap.candles).toEqual([]);
    expect(snap.lastPrice).toBe(100);
  });

  it("starts with a flat forming candle at the opening price", () => {
    const snap = snapshotAt(day, OPEN);

    expect(snap.isForming).toBe(true);
    expect(snap.candles).toEqual([
      { time: OPEN, open: 100, high: 100, low: 100, close: 100 },
    ]);
  });

  it("doesn't reveal a spike later in the same minute", () => {
    // 10s into minute 1, price is halfway to the 112 spike
    const snap = snapshotAt(day, OPEN + MINUTE + 10 * SECOND);
    const forming = snap.candles.at(-1)!;

    expect(forming.close).toBe(107.5);
    expect(forming.high).toBe(107.5);
    expect(forming.low).toBe(103);
  });

  it("includes the spike once price has passed it", () => {
    const forming = snapshotAt(day, OPEN + MINUTE + 30 * SECOND).candles.at(-1)!;

    expect(forming.high).toBe(112);
    expect(forming.close).toBe(106.5);
  });

  it("treats finished minutes as complete candles", () => {
    const snap = snapshotAt(day, OPEN + 3 * MINUTE);

    expect(snap.isForming).toBe(false);
    expect(snap.candles).toEqual(day.candles);
    expect(snap.lastPrice).toBe(101);
  });

  it("gives the same result whether you play to a time or jump to it", () => {
    const clock = new ReplayClock(OPEN, OPEN + 3 * MINUTE, 10);
    clock.play();

    // Uneven frame times, like a real device
    const frames = [16, 17, 33, 16, 250, 16, 1000, 8];
    let i = 0;
    while (!clock.isFinished) {
      clock.advance(frames[i++ % frames.length]!);
      const played = snapshotAt(day, clock.time);

      const jumper = new ReplayClock(OPEN, OPEN + 3 * MINUTE);
      jumper.seek(clock.time);

      expect(snapshotAt(day, jumper.time)).toEqual(played);
    }
  });
});

describe.each(DAYS.map((entry) => [entry.id, loadDay(entry)] as const))(
  "no look-ahead on %s",
  (_id, realDay) => {
    it("never shows data from after the replay time", () => {
      const start = realDay.candles[0]!.time;
      const end = realDay.candles.at(-1)!.time + MINUTE;

      // Every 7 seconds, so checks land at many different points in a minute
      for (let time = start; time <= end; time += 7 * SECOND) {
        const snap = snapshotAt(realDay, time);
        const last = snap.candles.at(-1)!;
        const source = realDay.candles[snap.candles.length - 1]!;

        expect(last.time).toBeLessThanOrEqual(time);
        expect(snap.candles.length).toBeLessThanOrEqual(
          Math.floor((time - start) / MINUTE) + 1,
        );

        // A forming candle can only be inside the real candle's range
        expect(last.high).toBeLessThanOrEqual(source.high);
        expect(last.low).toBeGreaterThanOrEqual(source.low);
        expect(last.close).toBe(snap.lastPrice);
      }
    });
  },
);
