import { act, renderHook } from "@testing-library/react-native";
import { AppState, type AppStateStatus } from "react-native";

import { makeDay, MINUTE, OPEN, SECOND } from "@/engine/__fixtures__/makeDay";

import { useReplay } from "../useReplay";

// React Native's Jest setup runs animation frames on a zero-delay timer, which
// would spin forever under fake timers. A 60 fps frame is closer to reality.
const FRAME_MS = 16;

beforeEach(() => {
  jest.useFakeTimers();
  jest
    .spyOn(globalThis, "requestAnimationFrame")
    .mockImplementation((cb: FrameRequestCallback) =>
      Number(setTimeout(() => cb(Date.now()), FRAME_MS)),
    );
  jest
    .spyOn(globalThis, "cancelAnimationFrame")
    .mockImplementation((id) => clearTimeout(id ?? undefined));
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

const day = makeDay([
  [22_000, 22_010, 21_990, 22_000],
  [22_000, 22_005, 21_800, 21_850],
  [21_850, 21_900, 21_840, 21_890],
  [21_890, 21_950, 21_880, 21_940],
]);

async function setup() {
  return renderHook(() => useReplay(day));
}

async function advance(ms: number) {
  await act(async () => {
    jest.advanceTimersByTime(ms);
  });
}

describe("useReplay", () => {
  it("starts paused at the open with the opening price", async () => {
    const { result } = await setup();

    expect(result.current.time).toBe(OPEN);
    expect(result.current.isPlaying).toBe(false);
    expect(result.current.snapshot.lastPrice).toBe(22_000);
  });

  it("moves market time while playing and stops when paused", async () => {
    const { result } = await setup();

    await act(async () => result.current.setSpeed(60));
    await act(async () => result.current.play());
    await advance(1_000);

    // About a minute of market time per real second at 60×. Not exact,
    // because the first frame only records a starting timestamp.
    const playedTo = result.current.time;
    expect(playedTo - OPEN).toBeGreaterThan(55 * SECOND);
    expect(playedTo - OPEN).toBeLessThanOrEqual(MINUTE);

    await act(async () => result.current.pause());
    await advance(1_000);

    expect(result.current.time).toBe(playedTo);
  });

  it("renders at most once per frame", async () => {
    let renders = 0;
    const { result } = await renderHook(() => {
      renders++;
      return useReplay(day);
    });

    await act(async () => result.current.setSpeed(10));
    await act(async () => result.current.play());
    renders = 0;
    await advance(1_000);

    // ~62 frames fit in a second at 16 ms each
    expect(renders).toBeLessThanOrEqual(Math.ceil(1_000 / FRAME_MS));
  });

  it("stops by itself at the close", async () => {
    const { result } = await setup();

    await act(async () => result.current.setSpeed(300));
    await act(async () => result.current.play());
    await advance(5_000);

    expect(result.current.time).toBe(OPEN + 4 * MINUTE);
    expect(result.current.isFinished).toBe(true);
    expect(result.current.isPlaying).toBe(false);
  });

  it("fills orders at the price at that moment", async () => {
    const { result } = await setup();
    await act(async () => {
      result.current.seek(OPEN + 2 * MINUTE);
    });

    let outcome;
    await act(async () => {
      outcome = result.current.placeOrder("buy", 2);
    });

    expect(outcome).toEqual({ ok: true, account: result.current.account });
    expect(result.current.account.trades[0]).toMatchObject({
      price: 21_850,
      quantity: 2,
    });
  });

  it("triggers a stop-loss during playback", async () => {
    const { result } = await setup();

    await act(async () => {
      result.current.placeOrder("buy", 10);
    });
    await act(async () => {
      result.current.setStopLoss(21_900);
    });
    await act(async () => result.current.setSpeed(300));
    await act(async () => result.current.play());
    await advance(1_000);

    expect(result.current.account.position).toBe(0);
    expect(result.current.account.trades.at(-1)).toMatchObject({
      reason: "stop",
      price: 21_900,
    });
  });

  it("checks stop-losses on a forward jump too", async () => {
    const { result } = await setup();

    await act(async () => {
      result.current.placeOrder("buy", 10);
      result.current.setStopLoss(21_900);
    });
    await act(async () => {
      result.current.seek(OPEN + 3 * MINUTE);
    });

    expect(result.current.account.trades.at(-1)).toMatchObject({ reason: "stop" });
  });

  it("refuses to rewind after a trade, until reset", async () => {
    const { result } = await setup();
    await act(async () => {
      result.current.seek(OPEN + 2 * MINUTE);
      result.current.placeOrder("buy", 1);
    });

    let rewind;
    await act(async () => {
      rewind = result.current.seek(OPEN);
    });
    expect(rewind).toEqual({
      ok: false,
      reason: "Reset the session to rewind after trading",
    });
    expect(result.current.time).toBe(OPEN + 2 * MINUTE);

    await act(async () => result.current.reset());

    expect(result.current.time).toBe(OPEN);
    expect(result.current.account.trades).toEqual([]);
  });

  it("restarts from the open with a fresh account after the close", async () => {
    const { result } = await setup();
    await act(async () => {
      result.current.placeOrder("buy", 1);
      result.current.seek(OPEN + 4 * MINUTE);
    });

    await act(async () => result.current.restart());

    expect(result.current.time).toBe(OPEN);
    expect(result.current.isPlaying).toBe(true);
    expect(result.current.account.trades).toEqual([]);
  });

  it("allows rewinding freely before trading", async () => {
    const { result } = await setup();

    await act(async () => {
      result.current.seek(OPEN + 3 * MINUTE);
      result.current.seek(OPEN + MINUTE);
    });

    expect(result.current.time).toBe(OPEN + MINUTE);
  });
});

describe("app going to the background", () => {
  // Grab the listener the hook registers so the test can play the OS
  function captureAppStateListener() {
    let listener: ((state: AppStateStatus) => void) | undefined;
    const remove = jest.fn();
    jest.spyOn(AppState, "addEventListener").mockImplementation((_type, handler) => {
      listener = handler;
      return { remove };
    });
    return { send: (state: AppStateStatus) => listener?.(state), remove };
  }

  it("pauses the replay and keeps the position", async () => {
    const appState = captureAppStateListener();
    const { result } = await setup();

    await act(async () => result.current.play());
    await advance(500);
    const leftAt = result.current.time;

    await act(async () => appState.send("background"));
    await advance(5_000);

    expect(result.current.isPlaying).toBe(false);
    expect(result.current.time).toBe(leftAt);
  });

  it("stays paused when the app comes back", async () => {
    const appState = captureAppStateListener();
    const { result } = await setup();

    await act(async () => result.current.play());
    await act(async () => appState.send("background"));
    await act(async () => appState.send("active"));

    expect(result.current.isPlaying).toBe(false);
  });

  it("stops listening on unmount", async () => {
    const appState = captureAppStateListener();
    const { unmount } = await setup();

    await unmount();

    expect(appState.remove).toHaveBeenCalled();
  });
});
