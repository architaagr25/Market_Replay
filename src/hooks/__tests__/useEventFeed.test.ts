import { act, renderHook } from "@testing-library/react-native";

import type { MarketEvent } from "@/engine/events";

import { useEventFeed } from "../useEventFeed";

const events: MarketEvent[] = [
  { id: "a", time: 100, title: "First", kind: "news" },
  { id: "b", time: 200, title: "Second", kind: "news" },
  { id: "c", time: 300, title: "Third", kind: "news" },
];

beforeEach(() => jest.useFakeTimers());
afterEach(() => jest.useRealTimers());

describe("useEventFeed", () => {
  it("shows nothing before the first event", async () => {
    const { result } = await renderHook(() => useEventFeed(events, 50));

    expect(result.current.event).toBeNull();
  });

  it("shows only the latest event after jumping past several", async () => {
    const { result } = await renderHook(() => useEventFeed(events, 250));

    expect(result.current.event?.title).toBe("Second");
  });

  it("hides itself after a few seconds", async () => {
    const { result } = await renderHook(() => useEventFeed(events, 150));

    await act(async () => {
      jest.advanceTimersByTime(5_000);
    });

    expect(result.current.event).toBeNull();
  });

  it("can be dismissed, and the next event still appears", async () => {
    const { result, rerender } = await renderHook(
      ({ time }: { time: number }) => useEventFeed(events, time),
      {
        initialProps: { time: 150 },
      },
    );

    await act(async () => result.current.dismiss());
    expect(result.current.event).toBeNull();

    await rerender({ time: 320 });
    expect(result.current.event?.title).toBe("Third");
  });
});
