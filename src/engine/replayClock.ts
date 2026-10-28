/** Playback speeds offered in the UI. At 300× a full session takes about 75 seconds. */
export const SPEEDS = [1, 10, 60, 300] as const;

export const DEFAULT_SPEED = 60;

/**
 * Keeps track of "market time" during a replay, separately from wall-clock time.
 *
 * The clock never reads Date.now() or schedules anything itself. Whoever drives
 * it (a requestAnimationFrame loop in the app, a plain loop in tests) passes in
 * how much real time has passed, and the clock moves market time forward by
 * that amount × speed. That keeps it deterministic, so speed changes and pauses
 * can be tested without fake timers.
 */
export class ReplayClock {
  readonly start: number;
  readonly end: number;

  private _time: number;
  private _speed: number;
  private _playing = false;

  constructor(start: number, end: number, speed: number = DEFAULT_SPEED) {
    if (!(end > start)) {
      throw new RangeError("Replay must end after it starts");
    }
    assertValidSpeed(speed);

    this.start = start;
    this.end = end;
    this._time = start;
    this._speed = speed;
  }

  get time() {
    return this._time;
  }

  get speed() {
    return this._speed;
  }

  get isPlaying() {
    return this._playing;
  }

  get isFinished() {
    return this._time >= this.end;
  }

  /** Fraction of the session that has been replayed, 0 to 1. Handy for the scrubber. */
  get progress() {
    return (this._time - this.start) / (this.end - this.start);
  }

  play() {
    // Pressing play at the end shouldn't silently do nothing forever, so it
    // starts again from the open, like a video player would.
    if (this.isFinished) this._time = this.start;
    this._playing = true;
  }

  pause() {
    this._playing = false;
  }

  /**
   * Changing speed only affects time that passes from now on. Market time that
   * has already elapsed stays put, so there's no jump when switching 1× → 300×.
   */
  setSpeed(speed: number) {
    assertValidSpeed(speed);
    this._speed = speed;
  }

  /** Jump to a market time. Out-of-range values are clamped to the session. */
  seek(time: number) {
    this._time = Math.min(this.end, Math.max(this.start, time));
  }

  /**
   * Move market time forward by `realElapsedMs` of real time. Returns the new
   * market time. Stops at the end of the session and pauses there.
   */
  advance(realElapsedMs: number): number {
    // A negative or NaN delta would come from a clock hiccup in the driver.
    // Ignoring it is safer than letting market time run backwards.
    if (!this._playing || !(realElapsedMs > 0)) return this._time;

    this._time = Math.min(this.end, this._time + realElapsedMs * this._speed);
    if (this._time >= this.end) this._playing = false;

    return this._time;
  }
}

function assertValidSpeed(speed: number) {
  if (!Number.isFinite(speed) || speed <= 0) {
    throw new RangeError(`Invalid replay speed: ${speed}`);
  }
}
