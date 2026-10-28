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

/**
 * "₹1,23,456.78". With `signed`, gains get a "+" and losses a "-" in front of
 * the rupee sign, the way P&L is usually shown in Indian broker apps.
 */
export function formatRupees(amount: number, { signed = false } = {}): string {
  const digits = Math.abs(amount).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  // Something that rounds to 0.00 shouldn't show up as "-₹0.00"
  const isZero = Math.abs(amount) < 0.005;
  const sign = amount < 0 && !isZero ? "-" : signed && !isZero ? "+" : "";
  return `${sign}₹${digits}`;
}
