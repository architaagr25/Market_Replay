const MINUTE = 60_000;

/**
 * Market time for a touch at `x` on a track `width` wide. Snaps down to the
 * start of a minute, so a jump lands on a candle boundary instead of 37
 * seconds into one. Runs on the UI thread while dragging.
 */
export function timeAtPosition(
  x: number,
  width: number,
  start: number,
  end: number,
): number {
  "worklet";
  if (width <= 0) return start;
  const fraction = Math.min(1, Math.max(0, x / width));
  const minutes = Math.floor((fraction * (end - start)) / MINUTE);
  return Math.min(end, start + minutes * MINUTE);
}

/** Where on the track a market time sits, from 0 to `width`. */
export function positionOfTime(
  time: number,
  width: number,
  start: number,
  end: number,
): number {
  "worklet";
  if (end <= start) return 0;
  return ((Math.min(end, Math.max(start, time)) - start) / (end - start)) * width;
}
