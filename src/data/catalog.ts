import budget2021 from "./days/2021-02-01.json";
import election2024 from "./days/2024-06-04.json";
import covidCrash2020 from "./days/2020-03-13.json";

export type DayMood = "crash" | "rally" | "whipsaw";

export interface DayEntry {
  /** ISO date, also used as the route param. */
  id: string;
  title: string;
  summary: string;
  mood: DayMood;
  /** Contents of the bundled JSON file. Not trusted until it's been validated. */
  source: unknown;
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
  },
  {
    id: "2021-02-01",
    title: "Budget day rally",
    summary:
      "The first post-pandemic Union Budget bets on spending to revive growth, and the market rallies hard through the afternoon.",
    mood: "rally",
    source: budget2021,
  },
  {
    id: "2020-03-13",
    title: "COVID crash and circuit breaker",
    summary:
      "Nifty falls 10% minutes after the open as COVID-19 panic spreads, trading is halted, and then the index stages a sharp recovery.",
    mood: "whipsaw",
    source: covidCrash2020,
  },
];

export function findDay(id: string): DayEntry | undefined {
  return DAYS.find((day) => day.id === id);
}
