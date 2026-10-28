import { ReplayClock } from "../replayClock";

const MINUTE = 60_000;
const OPEN = Date.parse("2024-06-04T09:15:00+05:30");
const CLOSE = OPEN + 375 * MINUTE;

describe("ReplayClock", () => {
  it("starts paused at the open", () => {
    const clock = new ReplayClock(OPEN, CLOSE);

    expect(clock.time).toBe(OPEN);
    expect(clock.isPlaying).toBe(false);
    expect(clock.progress).toBe(0);
  });

  it("doesn't move while paused", () => {
    const clock = new ReplayClock(OPEN, CLOSE, 10);

    clock.advance(5_000);

    expect(clock.time).toBe(OPEN);
  });

  it("moves 10 minutes of market time per real minute at 10×", () => {
    const clock = new ReplayClock(OPEN, CLOSE, 10);
    clock.play();

    // Sixty one-second frames rather than one big step, like a real driver
    for (let i = 0; i < 60; i++) clock.advance(1_000);

    expect(clock.time).toBe(OPEN + 10 * MINUTE);
  });

  it("doesn't jump when the speed changes mid-replay", () => {
    const clock = new ReplayClock(OPEN, CLOSE, 1);
    clock.play();
    clock.advance(30_000);

    clock.setSpeed(300);
    expect(clock.time).toBe(OPEN + 30_000);

    clock.advance(1_000);
    expect(clock.time).toBe(OPEN + 30_000 + 300_000);
  });

  it("carries on from the same spot after pause and resume", () => {
    const clock = new ReplayClock(OPEN, CLOSE, 60);
    clock.play();
    clock.advance(1_000);

    clock.pause();
    clock.advance(10_000);
    clock.play();
    clock.advance(1_000);

    expect(clock.time).toBe(OPEN + 2 * MINUTE);
  });

  it("stops and pauses at the close instead of overshooting", () => {
    const clock = new ReplayClock(OPEN, CLOSE, 300);
    clock.play();

    clock.advance(10 * 60_000);

    expect(clock.time).toBe(CLOSE);
    expect(clock.isFinished).toBe(true);
    expect(clock.isPlaying).toBe(false);
  });

  it("restarts from the open when played after finishing", () => {
    const clock = new ReplayClock(OPEN, CLOSE);
    clock.seek(CLOSE);

    clock.play();

    expect(clock.time).toBe(OPEN);
    expect(clock.isPlaying).toBe(true);
  });

  it("clamps seeks to the session", () => {
    const clock = new ReplayClock(OPEN, CLOSE);

    clock.seek(OPEN - MINUTE);
    expect(clock.time).toBe(OPEN);

    clock.seek(CLOSE + MINUTE);
    expect(clock.time).toBe(CLOSE);
  });

  it("ignores negative and NaN frame deltas", () => {
    const clock = new ReplayClock(OPEN, CLOSE);
    clock.play();

    clock.advance(-1_000);
    clock.advance(NaN);

    expect(clock.time).toBe(OPEN);
  });

  it("rejects nonsense speeds and ranges", () => {
    expect(() => new ReplayClock(OPEN, CLOSE, 0)).toThrow(RangeError);
    expect(() => new ReplayClock(OPEN, OPEN)).toThrow(RangeError);
    expect(() => new ReplayClock(OPEN, CLOSE).setSpeed(-10)).toThrow(RangeError);
  });
});
