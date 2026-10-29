import { useEffect, useMemo, useState } from "react";

import { latestEvent, type MarketEvent } from "@/engine/events";

// Real seconds a pop-up stays up. Measured in wall-clock time, not market
// time, so it's readable at 300× too.
const SHOW_FOR_MS = 4_500;

/**
 * The event to show as a pop-up right now, if any.
 *
 * Always the most recent event the replay has passed, so jumping ahead over
 * several only shows the latest instead of a queue of stale ones. It hides
 * itself after a few seconds or when dismissed.
 */
export function useEventFeed(events: readonly MarketEvent[], time: number) {
  const latest = useMemo(() => latestEvent(events, time), [events, time]);
  const [dismissedId, setDismissedId] = useState<string | null>(null);

  const visible = latest && latest.id !== dismissedId ? latest : null;

  useEffect(() => {
    if (!visible) return;
    const timer = setTimeout(() => setDismissedId(visible.id), SHOW_FOR_MS);
    return () => clearTimeout(timer);
  }, [visible]);

  const dismiss = () => {
    if (visible) setDismissedId(visible.id);
  };

  return { event: visible, dismiss };
}
