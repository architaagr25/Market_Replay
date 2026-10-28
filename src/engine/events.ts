import type { TradingDay } from "@/data/types";

import { detectHalts, tradingWindows } from "./halts";
import { firstCrossing, MINUTE } from "./pricePath";

export interface MarketEvent {
  id: string;
  time: number;
  title: string;
  body?: string;
  kind: "news" | "milestone" | "halt";
  /** Which way the market moved, for price milestones. */
  tone?: "up" | "down";
}

/** Hand-written context for a day, with an IST clock time like "11:00". */
export interface NewsItem {
  at: string;
  title: string;
  body?: string;
}

// Moves from the previous close worth calling out, in percent
const MILESTONES = [2, 4, 6, 8, 10];

// An open this far from the previous close counts as a gap
const GAP_PERCENT = 1;

/**
 * Everything worth a pop-up during the replay, in time order: the day's news,
 * plus events worked out from the prices themselves.
 *
 * Milestones fire when price first reaches a level during the session, using
 * the same path walk as stop-losses, so they appear at the moment it happened
 * and never early.
 */
export function eventsForDay(
  day: TradingDay,
  news: readonly NewsItem[] = [],
): MarketEvent[] {
  const { candles, prevClose, date } = day;
  const start = candles[0]!.time;
  const end = candles[candles.length - 1]!.time + MINUTE;
  const open = candles[0]!.open;
  const events: MarketEvent[] = [];
  const halts = detectHalts(candles);
  // Pre-open prices during a halt aren't trades, so they don't count as moves
  const windows = tradingWindows(halts, start, end);

  for (const item of news) {
    const time = Date.parse(`${date}T${item.at}:00+05:30`);
    events.push({
      id: `news-${item.at}`,
      time,
      title: item.title,
      body: item.body,
      kind: "news",
    });
  }

  const gap = ((open - prevClose) / prevClose) * 100;
  if (Math.abs(gap) >= GAP_PERCENT) {
    events.push({
      id: "gap",
      time: start,
      title: `Opens ${Math.abs(gap).toFixed(1)}% ${gap > 0 ? "higher" : "lower"}`,
      body: "The first trade is far from yesterday's close.",
      kind: "milestone",
      tone: gap > 0 ? "up" : "down",
    });
  }

  for (const percent of MILESTONES) {
    for (const direction of ["down", "up"] as const) {
      const level = prevClose * (1 + (direction === "up" ? percent : -percent) / 100);
      // Already past this level at the open: the gap event covers it
      if (direction === "down" ? open <= level : open >= level) continue;

      let hit = null;
      for (const [from, to] of windows) {
        hit = firstCrossing(candles, from, to, level, direction);
        if (hit) break;
      }
      if (!hit) continue;

      events.push({
        id: `move-${direction}-${percent}`,
        time: Math.ceil(hit.time),
        title: `Nifty ${direction} ${percent}% on the day`,
        kind: "milestone",
        tone: direction,
      });
    }
  }

  for (const halt of halts) {
    events.push({
      id: `resume-${halt.end}`,
      time: halt.end,
      title: "Trading resumes",
      body: "Orders can be placed again.",
      kind: "halt",
    });
  }

  return events.sort((a, b) => a.time - b.time);
}

/** The most recent event at or before `time`, or null if none has happened yet. */
export function latestEvent(
  events: readonly MarketEvent[],
  time: number,
): MarketEvent | null {
  let latest: MarketEvent | null = null;
  for (const event of events) {
    if (event.time > time) break;
    latest = event;
  }
  return latest;
}
