import { istMinuteOfDay } from "./marketHours";

/** "09:15" style IST clock time for a UTC timestamp. */
export function formatTime(timestamp: number): string {
  const minute = istMinuteOfDay(timestamp);
  const hh = String(Math.floor(minute / 60)).padStart(2, "0");
  const mm = String(minute % 60).padStart(2, "0");
  return `${hh}:${mm}`;
}

/** "22,104.35": index level with Indian digit grouping and two decimals. */
export function formatPrice(price: number): string {
  return price.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}
