import type { Candle } from "@/data/types";
import type { Trade } from "@/engine/paperBroker";
import { findCandleIndex } from "@/engine/pricePath";

import type { ChartLayout } from "./chartLayout";

/** Gap between a marker and the wick it points at. */
const MARKER_OFFSET = 8;

export interface TradeMarker {
  id: number;
  x: number;
  /** Where the marker's tip touches, just beyond the candle's wick. */
  y: number;
  side: Trade["side"];
  reason: Trade["reason"];
}

/**
 * Where to draw each trade on the chart. Buys get an arrow under the candle
 * pointing up, sells an arrow above pointing down, matching how most trading
 * apps show fills. Trades on candles that have scrolled off screen are left out.
 */
export function tradeMarkers(
  trades: readonly Trade[],
  candles: readonly Candle[],
  layout: ChartLayout,
): TradeMarker[] {
  const markers: TradeMarker[] = [];

  for (const trade of trades) {
    const index = findCandleIndex(candles, trade.time);
    if (index < layout.firstIndex) continue;

    const candle = candles[index]!;
    const y =
      trade.side === "buy"
        ? layout.y(candle.low) + MARKER_OFFSET
        : layout.y(candle.high) - MARKER_OFFSET;

    markers.push({
      id: trade.id,
      x: layout.x(index),
      y,
      side: trade.side,
      reason: trade.reason,
    });
  }

  return markers;
}
