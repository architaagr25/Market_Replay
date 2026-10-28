import { useEffect, useState } from "react";

// A little longer than the default Android and iOS push animation
const TRANSITION_MS = 400;

/**
 * False until the screen has finished sliding in.
 *
 * On Android a Skia canvas created mid-transition loses its first frame. A
 * chart that keeps redrawing recovers on the next one, but a still chart (a
 * paused replay, the end-of-day overview) stays blank until something changes.
 * Mounting the canvas once the screen has settled avoids that, and keeps the
 * transition itself smooth.
 */
export function useMountAfterTransition(): boolean {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setReady(true), TRANSITION_MS);
    return () => clearTimeout(timer);
  }, []);

  return ready;
}
