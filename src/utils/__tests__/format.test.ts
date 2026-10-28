import {
  formatChange,
  formatDate,
  formatPrice,
  formatRupees,
  formatTime,
} from "../format";

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

describe("formatDate", () => {
  it("writes the date out with its weekday", () => {
    expect(formatDate("2024-06-04")).toBe("Tue, 4 Jun 2024");
    expect(formatDate("2020-03-13")).toBe("Fri, 13 Mar 2020");
  });
});

describe("formatChange", () => {
  it("shows the move in points and percent", () => {
    expect(formatChange(8624.05, 9590.15)).toBe("-966.10 (-10.07%)");
    expect(formatChange(14281.2, 13634.6)).toBe("+646.60 (+4.74%)");
  });

  it("has no sign when unchanged", () => {
    expect(formatChange(100, 100)).toBe("0.00 (0.00%)");
  });
});
