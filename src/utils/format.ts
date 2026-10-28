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

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

/**
 * "Tue, 4 Jun 2024" from "2024-06-04". Done by hand rather than with
 * toLocaleDateString so it can't shift a day depending on the phone's time zone.
 */
export function formatDate(isoDate: string): string {
  const [year, month, day] = isoDate.split("-").map(Number) as [number, number, number];
  const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
  return `${WEEKDAYS[weekday]}, ${day} ${MONTHS[month - 1]} ${year}`;
}

/** "-966.10 (-10.07%)": move since the previous close, in points and percent. */
export function formatChange(price: number, prevClose: number): string {
  const points = price - prevClose;
  const percent = (points / prevClose) * 100;
  const sign = (value: number) => (value > 0 ? "+" : value < 0 ? "-" : "");
  return `${sign(points)}${formatPrice(Math.abs(points))} (${sign(percent)}${Math.abs(percent).toFixed(2)}%)`;
}
