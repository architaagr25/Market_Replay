import { useEffect, useRef } from "react";

import type { Trade } from "@/engine/paperBroker";
import { haptics } from "@/utils/haptics";

/**
 * Buzzes when a stop-loss closes the position. Stops fire inside the replay
 * loop rather than from a button press, so without this they'd be easy to
 * miss while watching the chart.
 */
export function useStopHitFeedback(trades: readonly Trade[]) {
  const seen = useRef(trades.length);

  useEffect(() => {
    const fresh = trades.slice(seen.current);
    seen.current = trades.length;
    if (fresh.some((trade) => trade.reason === "stop")) haptics.stopHit();
  }, [trades]);
}
