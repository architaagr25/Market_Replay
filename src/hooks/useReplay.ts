import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AppState } from "react-native";

import type { TradingDay } from "@/data/types";
import { snapshotAt } from "@/engine/candleBuilder";
import { detectHalts, haltAt } from "@/engine/halts";
import {
  type Account,
  type BrokerResult,
  checkStopLoss,
  createAccount,
  setStopLoss as applyStopLoss,
  type Side,
  submitOrder,
} from "@/engine/paperBroker";
import { MINUTE, priceAt } from "@/engine/pricePath";
import { DEFAULT_SPEED, ReplayClock } from "@/engine/replayClock";

// If the JS thread stalls (a GC pause, a slow device), the next frame could
// report a huge delta and the replay would visibly leap ahead. Capping it makes
// a stall look like a brief slowdown instead. Nothing is skipped either way,
// because stop-losses walk the full path between frames.
const MAX_FRAME_MS = 250;

export type SeekResult = { ok: true } | { ok: false; reason: string };

/**
 * Runs a replay of one trading day: drives the clock from requestAnimationFrame,
 * exposes what the market looks like right now, and holds the practice account.
 *
 * Expects a fresh mount per day. Screens should key it on the day's date.
 */
export function useReplay(day: TradingDay) {
  const { candles } = day;
  const halts = useMemo(() => detectHalts(candles), [candles]);

  const [clock] = useState(
    () => new ReplayClock(candles[0]!.time, candles[candles.length - 1]!.time + MINUTE),
  );

  const [time, setTime] = useState(clock.time);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeedState] = useState(DEFAULT_SPEED);

  // The account lives in a ref as well as in state. The frame loop and the
  // order buttons both change it, and they need to see each other's changes
  // immediately, not after the next render.
  const [initialAccount] = useState(createAccount);
  const accountRef = useRef<Account>(initialAccount);
  const [account, setAccountState] = useState(initialAccount);

  const commitAccount = useCallback((next: Account) => {
    if (next === accountRef.current) return;
    accountRef.current = next;
    setAccountState(next);
  }, []);

  useEffect(() => {
    if (!isPlaying) return;

    let frame = 0;
    let lastFrameAt: number | null = null;

    const onFrame = (now: number) => {
      if (lastFrameAt !== null) {
        const from = clock.time;
        const to = clock.advance(Math.min(now - lastFrameAt, MAX_FRAME_MS));

        if (to !== from) {
          // Both updates happen in the same callback, so React batches them
          // into a single render: at most one render per frame however fast
          // the replay is running.
          setTime(to);
          commitAccount(checkStopLoss(accountRef.current, candles, from, to, halts));
        }
      }
      lastFrameAt = now;

      if (clock.isPlaying) {
        frame = requestAnimationFrame(onFrame);
      } else {
        setIsPlaying(false); // reached the close
      }
    };

    frame = requestAnimationFrame(onFrame);
    return () => cancelAnimationFrame(frame);
  }, [isPlaying, clock, candles, halts, commitAccount]);

  const play = useCallback(() => {
    if (clock.isFinished && accountRef.current.trades.length > 0) {
      // Restarting from the open would put trades in the "future". Starting a
      // new session is reset()'s job.
      return;
    }
    clock.play();
    setTime(clock.time);
    setIsPlaying(true);
  }, [clock]);

  const pause = useCallback(() => {
    clock.pause();
    setIsPlaying(false);
  }, [clock]);

  // Pause when the app leaves the foreground. Android stops delivering
  // animation frames in the background anyway, but the clock would still think
  // it was playing, and someone coming back mid-crash should find the replay
  // where they left it. It stays paused on return; resuming is their call.
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      if (state !== "active") pause();
    });
    return () => subscription.remove();
  }, [pause]);

  const setSpeed = useCallback(
    (next: number) => {
      clock.setSpeed(next);
      setSpeedState(next);
    },
    [clock],
  );

  /**
   * Jumping forward is a fast-forward: anything that would have happened on
   * the way, like a stop-loss being hit, still happens.
   *
   * Jumping back is only allowed before the first trade. Rewinding past your
   * own orders would mean holding a position you haven't bought yet, so after
   * trading the way back is reset().
   */
  const seek = useCallback(
    (target: number): SeekResult => {
      const from = clock.time;
      if (target < from && accountRef.current.trades.length > 0) {
        return { ok: false, reason: "Reset the session to rewind after trading" };
      }

      clock.seek(target);
      const to = clock.time;
      if (to > from) {
        commitAccount(checkStopLoss(accountRef.current, candles, from, to, halts));
      }
      setTime(to);
      return { ok: true };
    },
    [clock, candles, halts, commitAccount],
  );

  /** Back to the open with a fresh account. */
  const reset = useCallback(() => {
    clock.pause();
    clock.seek(clock.start);
    setIsPlaying(false);
    setTime(clock.time);
    commitAccount(createAccount());
  }, [clock, commitAccount]);

  /** Fresh account, from the open, already playing. */
  const restart = useCallback(() => {
    reset();
    clock.play();
    setIsPlaying(true);
  }, [reset, clock]);

  const placeOrder = useCallback(
    (side: Side, quantity: number): BrokerResult => {
      // Read the clock directly rather than `time` from the last render, so the
      // fill matches the moment the button was pressed.
      const now = clock.time;
      const price = priceAt(candles, now) ?? 0;

      const result = submitOrder(
        accountRef.current,
        { side, quantity, price, time: now },
        halts,
      );
      if (result.ok) commitAccount(result.account);
      return result;
    },
    [clock, candles, halts, commitAccount],
  );

  const setStopLoss = useCallback(
    (level: number | null): BrokerResult => {
      const price = priceAt(candles, clock.time) ?? 0;
      const result = applyStopLoss(accountRef.current, level, price);
      if (result.ok) commitAccount(result.account);
      return result;
    },
    [clock, candles, commitAccount],
  );

  const snapshot = useMemo(() => snapshotAt(day, time), [day, time]);

  return {
    day,
    time,
    start: clock.start,
    end: clock.end,
    isPlaying,
    isFinished: time >= clock.end,
    speed,
    snapshot,
    halt: haltAt(halts, time),
    halts,
    account,
    play,
    pause,
    setSpeed,
    seek,
    reset,
    restart,
    placeOrder,
    setStopLoss,
  };
}
