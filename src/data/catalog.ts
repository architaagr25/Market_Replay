import budget2021 from "./days/2021-02-01.json";
import election2024 from "./days/2024-06-04.json";
import covidCrash2020 from "./days/2020-03-13.json";

import type { NewsItem } from "@/engine/events";

export type DayMood = "crash" | "rally" | "whipsaw";

export interface DayEntry {
  /** ISO date, also used as the route param. */
  id: string;
  title: string;
  summary: string;
  mood: DayMood;
  /** Contents of the bundled JSON file. Not trusted until it's been validated. */
  source: unknown;
  /**
   * A little context shown as the replay passes each time. Kept to things
   * that are well documented; moves in the index itself are announced
   * automatically from the data.
   */
  news: NewsItem[];
}

// Newest first. The summaries are deliberately short; the replay itself is the
// story, so they only set the scene.
export const DAYS: readonly DayEntry[] = [
  {
    id: "2024-06-04",
    title: "Election results day",
    summary:
      "Vote counting shows a much closer Lok Sabha result than the exit polls predicted, and Nifty slides almost 6%.",
    mood: "crash",
    source: election2024,
    news: [
      {
        at: "09:15",
        title: "Vote counting under way",
        body: "Counting began at 8 am. Early trends point to a much closer result than the exit polls suggested.",
      },
    ],
  },
  {
    id: "2021-02-01",
    title: "Budget day rally",
    summary:
      "The first post-pandemic Union Budget bets on spending to revive growth, and the market rallies hard through the afternoon.",
    mood: "rally",
    source: budget2021,
    news: [
      {
        at: "11:00",
        title: "Budget speech begins",
        body: "Finance Minister Nirmala Sitharaman starts presenting the Union Budget for 2021-22.",
      },
    ],
  },
  {
    id: "2020-03-13",
    title: "COVID crash and circuit breaker",
    summary:
      "Nifty falls 10% minutes after the open as COVID-19 panic spreads, trading is halted, and then the index stages a sharp recovery.",
    mood: "whipsaw",
    source: covidCrash2020,
    news: [
      {
        at: "10:05",
        title: "Pre-open session",
        body: "Orders are being matched to set the price trading will restart at.",
      },
    ],
  },
];

export function findDay(id: string): DayEntry | undefined {
  return DAYS.find((day) => day.id === id);
}
