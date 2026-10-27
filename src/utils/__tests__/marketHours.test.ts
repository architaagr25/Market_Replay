import { isWithinMarketHours, istMinuteOfDay } from "../marketHours";

// 4 June 2024, written in UTC. IST is UTC+5:30.
const at = (hhmmUtc: string) => Date.parse(`2024-06-04T${hhmmUtc}:00Z`);

describe("istMinuteOfDay", () => {
  it("converts UTC to IST minutes", () => {
    expect(istMinuteOfDay(at("03:45"))).toBe(9 * 60 + 15);
  });

  it("wraps past midnight IST", () => {
    // 20:00 UTC is 01:30 the next day in IST
    expect(istMinuteOfDay(at("20:00"))).toBe(90);
  });
});

describe("isWithinMarketHours", () => {
  it("includes the opening minute", () => {
    expect(isWithinMarketHours(at("03:45"))).toBe(true);
  });

  it("excludes the minute before the open", () => {
    expect(isWithinMarketHours(at("03:44"))).toBe(false);
  });

  it("includes the last candle at 15:29 and excludes 15:30", () => {
    expect(isWithinMarketHours(at("09:59"))).toBe(true);
    expect(isWithinMarketHours(at("10:00"))).toBe(false);
  });
});
