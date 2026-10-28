import { formatPrice, formatRupees, formatTime } from "../format";

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

describe("formatRupees", () => {
  it("formats amounts in lakhs", () => {
    expect(formatRupees(1000000)).toBe("₹10,00,000.00");
  });

  it("puts the sign before the rupee symbol", () => {
    expect(formatRupees(-1234.5)).toBe("-₹1,234.50");
    expect(formatRupees(1234.5, { signed: true })).toBe("+₹1,234.50");
  });

  it("never shows a signed zero", () => {
    expect(formatRupees(-0.001, { signed: true })).toBe("₹0.00");
    expect(formatRupees(0, { signed: true })).toBe("₹0.00");
  });
});
