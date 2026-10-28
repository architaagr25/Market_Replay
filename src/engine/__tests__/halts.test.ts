import { DAYS } from "@/data/catalog";
import { loadDay } from "@/data/loadDay";

import { makeDay, MINUTE, OPEN } from "../__fixtures__/makeDay";
import { detectHalts, haltAt, tradingWindows } from "../halts";
import { checkStopLoss, createAccount, placeOrder, submitOrder } from "../paperBroker";

const moving = [100, 101, 99, 100] as [number, number, number, number];
const flat = (price: number) =>
  [price, price, price, price] as [number, number, number, number];

describe("detectHalts", () => {
  it("finds a long run of flat candles", () => {
    const { candles } = makeDay([moving, ...Array(6).fill(flat(95)), moving]);

    expect(detectHalts(candles)).toEqual([
      { start: OPEN + MINUTE, end: OPEN + 7 * MINUTE },
    ]);
  });

  it("ignores a few quiet minutes", () => {
    const { candles } = makeDay([moving, flat(100), flat(100), flat(100), moving]);

    expect(detectHalts(candles)).toEqual([]);
  });

  it("merges a halt and the pre-open session after it", () => {
    const { candles } = makeDay([
      moving,
      ...Array(10).fill(flat(95)), // halted
      ...Array(8).fill(moving), // pre-open price discovery
      ...Array(6).fill(flat(97)), // waiting for the reopen
      moving,
    ]);

    expect(detectHalts(candles)).toEqual([
      { start: OPEN + MINUTE, end: OPEN + 25 * MINUTE },
    ]);
  });

  it("keeps halts far apart separate", () => {
    const { candles } = makeDay([
      ...Array(6).fill(flat(95)),
      ...Array(30).fill(moving),
      ...Array(6).fill(flat(90)),
      moving,
    ]);

    expect(detectHalts(candles)).toHaveLength(2);
  });

  it("doesn't count a flat finish to the session as a halt", () => {
    const { candles } = makeDay([moving, ...Array(8).fill(flat(100))]);

    expect(detectHalts(candles)).toEqual([]);
  });

  it("finds the circuit breaker on 13 March 2020 and nothing on the other days", () => {
    const found = Object.fromEntries(
      DAYS.map((entry) => [entry.id, detectHalts(loadDay(entry).candles)]),
    );

    expect(found["2020-03-13"]).toEqual([
      {
        start: Date.parse("2020-03-13T09:22:00+05:30"),
        end: Date.parse("2020-03-13T10:21:00+05:30"),
      },
    ]);
    expect(found["2021-02-01"]).toEqual([]);
    expect(found["2024-06-04"]).toEqual([]);
  });
});

describe("haltAt", () => {
  const halts = [{ start: OPEN + 5 * MINUTE, end: OPEN + 10 * MINUTE }];

  it("covers the start but not the moment trading resumes", () => {
    expect(haltAt(halts, OPEN + 5 * MINUTE)).toBe(halts[0]);
    expect(haltAt(halts, OPEN + 10 * MINUTE - 1)).toBe(halts[0]);
    expect(haltAt(halts, OPEN + 10 * MINUTE)).toBeNull();
    expect(haltAt(halts, OPEN)).toBeNull();
  });
});

describe("tradingWindows", () => {
  const halts = [{ start: OPEN + 5 * MINUTE, end: OPEN + 10 * MINUTE }];

  it("cuts a halt out of the middle", () => {
    expect(tradingWindows(halts, OPEN, OPEN + 20 * MINUTE)).toEqual([
      [OPEN, OPEN + 5 * MINUTE],
      [OPEN + 10 * MINUTE, OPEN + 20 * MINUTE],
    ]);
  });

  it("is empty while fully inside a halt", () => {
    expect(tradingWindows(halts, OPEN + 6 * MINUTE, OPEN + 7 * MINUTE)).toEqual([]);
  });

  it("is the whole range when there are no halts", () => {
    expect(tradingWindows([], OPEN, OPEN + MINUTE)).toEqual([[OPEN, OPEN + MINUTE]]);
  });
});

describe("trading around a halt", () => {
  const day = makeDay([
    moving,
    ...Array(6).fill(flat(95)),
    [95, 96, 60, 96], // pre-open style swing, with an indicative low of 60
    ...Array(6).fill(flat(96)),
    [96, 97, 95, 96],
  ]);
  const halts = detectHalts(day.candles);

  it("rejects orders while halted", () => {
    const result = submitOrder(
      createAccount(),
      { side: "buy", quantity: 1, price: 95, time: OPEN + 3 * MINUTE },
      halts,
    );

    expect(result).toEqual({
      ok: false,
      reason: "Trading is halted. Orders open again when the market resumes.",
    });
  });

  it("accepts orders once trading resumes", () => {
    const result = submitOrder(
      createAccount(),
      { side: "buy", quantity: 1, price: 96, time: OPEN + 14 * MINUTE },
      halts,
    );

    expect(result.ok).toBe(true);
  });

  it("doesn't fire a stop-loss on a pre-open price nobody could trade at", () => {
    const opened = placeOrder(createAccount(), {
      side: "buy",
      quantity: 1,
      price: 100,
      time: OPEN,
    });
    if (!opened.ok) throw new Error(opened.reason);
    const account = { ...opened.account, stopLoss: 80 };

    // Without halts the 60 would trigger it; with them it's ignored
    expect(checkStopLoss(account, day.candles, OPEN, OPEN + 15 * MINUTE).position).toBe(
      0,
    );
    expect(
      checkStopLoss(account, day.candles, OPEN, OPEN + 15 * MINUTE, halts).position,
    ).toBe(1);
  });
});
