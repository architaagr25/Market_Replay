import { renderHook } from "@testing-library/react-native";
import * as Haptics from "expo-haptics";

import type { Trade } from "@/engine/paperBroker";

import { useStopHitFeedback } from "../useStopHitFeedback";

function trade(id: number, reason: Trade["reason"]): Trade {
  return { id, side: "sell", quantity: 1, price: 100, time: 0, reason, realizedPnl: 0 };
}

describe("useStopHitFeedback", () => {
  it("buzzes when a stop-loss trade appears", async () => {
    const { rerender } = await renderHook(
      ({ trades }: { trades: Trade[] }) => useStopHitFeedback(trades),
      { initialProps: { trades: [trade(1, "manual")] } },
    );

    await rerender({ trades: [trade(1, "manual"), trade(2, "stop")] });

    expect(Haptics.notificationAsync).toHaveBeenCalledWith("warning");
  });

  it("stays quiet for trades placed by hand", async () => {
    const { rerender } = await renderHook(
      ({ trades }: { trades: Trade[] }) => useStopHitFeedback(trades),
      { initialProps: { trades: [] as Trade[] } },
    );

    await rerender({ trades: [trade(1, "manual")] });

    expect(Haptics.notificationAsync).not.toHaveBeenCalled();
  });

  it("doesn't buzz for stops that were already there", async () => {
    await renderHook(() => useStopHitFeedback([trade(1, "stop")]));

    expect(Haptics.notificationAsync).not.toHaveBeenCalled();
  });
});
