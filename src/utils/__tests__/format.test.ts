import { formatPrice, formatTime } from "../format";

describe("formatTime", () => {
  it("shows IST wall-clock time", () => {
    expect(formatTime(Date.parse("2024-06-04T09:15:00+05:30"))).toBe("09:15");
    expect(formatTime(Date.parse("2024-06-04T15:29:00+05:30"))).toBe("15:29");
  });
});

describe("formatPrice", () => {
  it("uses Indian digit grouping and two decimals", () => {
    expect(formatPrice(22104.3)).toBe("22,104.30");
    expect(formatPrice(123456.789)).toBe("1,23,456.79");
  });
});
