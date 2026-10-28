import { makeDay, MINUTE, OPEN, SECOND } from "@/engine/__fixtures__/makeDay";
import type { Trade } from "@/engine/paperBroker";

import { computeLayout, PRICE_AXIS_WIDTH } from "../chartLayout";
import { tradeMarkers } from "../markers";

const candles = makeDay(
  Array.from(
    { length: 20 },
    () => [100, 102, 98, 101] as [number, number, number, number],
  ),
).candles;

// Room for 8 candles, so candles 12 to 19 are visible
const layout = computeLayout({
  candles,
  width: 64 + PRICE_AXIS_WIDTH,
  height: 240,
  lastPrice: 101,
});

function trade(
  id: number,
  side: Trade["side"],
  minute: number,
  reason: Trade["reason"] = "manual",
): Trade {
  return {
    id,
    side,
    quantity: 1,
    price: 100,
    time: OPEN + minute * MINUTE + 30 * SECOND,
    reason,
    realizedPnl: 0,
  };
}

describe("tradeMarkers", () => {
  it("puts buys below the candle and sells above it", () => {
    const [buy, sell] = tradeMarkers(
      [trade(1, "buy", 14), trade(2, "sell", 16)],
      candles,
      layout,
    );

    expect(buy!.x).toBe(layout.x(14));
    expect(buy!.y).toBeGreaterThan(layout.y(98));
    expect(sell!.x).toBe(layout.x(16));
    expect(sell!.y).toBeLessThan(layout.y(102));
  });

  it("leaves out trades that have scrolled off screen", () => {
    const markers = tradeMarkers(
      [trade(1, "buy", 3), trade(2, "sell", 15)],
      candles,
      layout,
    );

    expect(markers.map((m) => m.id)).toEqual([2]);
  });

  it("keeps whether a stop-loss made the trade", () => {
    const [marker] = tradeMarkers([trade(1, "sell", 18, "stop")], candles, layout);

    expect(marker!.reason).toBe("stop");
  });
});
