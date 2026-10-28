import { makeDay, MINUTE, OPEN, SECOND } from "../__fixtures__/makeDay";
import {
  type Account,
  BROKERAGE_PER_ORDER,
  checkStopLoss,
  createAccount,
  equity,
  maxQuantity,
  netPnl,
  type Order,
  placeOrder,
  setStopLoss,
  unrealizedPnl,
} from "../paperBroker";

const FEE = BROKERAGE_PER_ORDER;

function order(side: Order["side"], quantity: number, price: number): Order {
  return { side, quantity, price, time: OPEN };
}

/** Places orders one after another and fails the test if any is rejected. */
function fill(account: Account, ...orders: Order[]): Account {
  return orders.reduce((acc, o) => {
    const result = placeOrder(acc, o);
    if (!result.ok) throw new Error(`Order rejected: ${result.reason}`);
    return result.account;
  }, account);
}

describe("placeOrder", () => {
  it("opens a long position", () => {
    const account = fill(createAccount(100_000), order("buy", 2, 20_000));

    expect(account.position).toBe(2);
    expect(account.avgPrice).toBe(20_000);
    expect(account.cash).toBe(100_000 - 40_000 - FEE);
    expect(account.trades).toHaveLength(1);
  });

  it("blends the average price when adding to a position", () => {
    const account = fill(
      createAccount(),
      order("buy", 1, 20_000),
      order("buy", 3, 22_000),
    );

    expect(account.position).toBe(4);
    expect(account.avgPrice).toBe(21_500);
  });

  it("books P&L on a partial close and keeps the average price", () => {
    const account = fill(
      createAccount(),
      order("buy", 4, 20_000),
      order("sell", 1, 21_000),
    );

    expect(account.position).toBe(3);
    expect(account.avgPrice).toBe(20_000);
    expect(account.realizedPnl).toBe(1_000);
    expect(account.trades.at(-1)!.realizedPnl).toBe(1_000);
  });

  it("allows short selling and profits when price falls", () => {
    const account = fill(
      createAccount(),
      order("sell", 2, 23_000),
      order("buy", 2, 22_000),
    );

    expect(account.position).toBe(0);
    expect(account.realizedPnl).toBe(2_000);
    expect(netPnl(account, 22_000)).toBe(2_000 - 2 * FEE);
  });

  it("flips from long to short in one order", () => {
    const account = fill(
      createAccount(),
      order("buy", 2, 20_000),
      order("sell", 5, 21_000),
    );

    expect(account.position).toBe(-3);
    // The leftover 3 units open fresh at the fill price
    expect(account.avgPrice).toBe(21_000);
    expect(account.realizedPnl).toBe(2_000);
  });

  it("resets the average price when the position is closed", () => {
    const account = fill(
      createAccount(),
      order("buy", 2, 20_000),
      order("sell", 2, 20_500),
    );

    expect(account.position).toBe(0);
    expect(account.avgPrice).toBe(0);
  });

  it("rejects orders bigger than the account can afford", () => {
    const result = placeOrder(createAccount(100_000), order("buy", 5, 22_000));

    expect(result).toEqual({
      ok: false,
      reason: "Not enough funds. You can buy up to 4.",
    });
  });

  it("counts brokerage when checking funds", () => {
    // Exactly 2 × 50,000 would fit, but not once the fee is added
    const result = placeOrder(createAccount(100_000), order("buy", 2, 50_000));

    expect(result.ok).toBe(false);
  });

  it("applies the same limit to shorts", () => {
    const result = placeOrder(createAccount(100_000), order("sell", 5, 22_000));

    expect(result.ok).toBe(false);
  });

  it("always lets you close a position, even after heavy losses", () => {
    const opened = fill(createAccount(100_000), order("buy", 4, 22_000));

    // Price has collapsed, so equity is tiny compared with the position
    const result = placeOrder(opened, order("sell", 4, 1_000));

    expect(result.ok).toBe(true);
  });

  it.each([
    ["zero quantity", order("buy", 0, 20_000)],
    ["fractional quantity", order("buy", 1.5, 20_000)],
    ["negative quantity", order("sell", -1, 20_000)],
    ["no price", order("buy", 1, 0)],
  ])("rejects %s", (_label, bad) => {
    expect(placeOrder(createAccount(), bad).ok).toBe(false);
  });

  it("doesn't leave floating point dust in the cash balance", () => {
    let account = createAccount();
    for (let i = 0; i < 25; i++) {
      account = fill(account, order("buy", 3, 22_123.15), order("sell", 3, 22_123.15));
    }

    expect(account.cash).toBe(10_00_000 - 50 * FEE);
    expect(account.realizedPnl).toBe(0);
  });

  it("doesn't change the original account", () => {
    const original = createAccount();
    fill(original, order("buy", 1, 20_000));

    expect(original).toEqual(createAccount());
  });
});

describe("valuation", () => {
  it("marks open positions to the current price", () => {
    const account = fill(createAccount(), order("sell", 2, 23_000));

    expect(unrealizedPnl(account, 22_500)).toBe(1_000);
    expect(equity(account, 22_500)).toBe(10_00_000 - FEE + 1_000);
  });
});

describe("stop-loss", () => {
  const day = makeDay([
    [22_000, 22_010, 21_990, 22_000],
    [22_000, 22_005, 21_800, 21_850], // red: up to 22,005, then down to 21,800
    [21_850, 21_900, 21_840, 21_890],
  ]);

  const long = fill(createAccount(), order("buy", 10, 22_000));

  it("must be on the losing side of the current price", () => {
    expect(setStopLoss(long, 22_100, 22_000).ok).toBe(false);
    expect(setStopLoss(long, 21_900, 22_000).ok).toBe(true);
  });

  it("needs an open position", () => {
    expect(setStopLoss(createAccount(), 21_900, 22_000).ok).toBe(false);
  });

  it("closes the position at the stop price when hit between frames", () => {
    const withStop = (setStopLoss(long, 21_900, 22_000) as { account: Account }).account;

    // One frame covering two minutes, the way 300× would
    const after = checkStopLoss(withStop, day.candles, OPEN, OPEN + 2 * MINUTE);

    expect(after.position).toBe(0);
    expect(after.stopLoss).toBeNull();
    expect(after.trades.at(-1)).toMatchObject({
      side: "sell",
      quantity: 10,
      price: 21_900,
      reason: "stop",
      realizedPnl: -1_000,
    });
    // Fills during minute 1, on the way down from 22,005
    expect(after.trades.at(-1)!.time).toBeGreaterThan(OPEN + MINUTE + 20 * SECOND);
    expect(after.trades.at(-1)!.time).toBeLessThan(OPEN + MINUTE + 40 * SECOND);
  });

  it("fills at the reopening price when trading resumes past the stop", () => {
    // A short with a stop above, then a halt and a big gap up, like the
    // recovery on 13 March 2020
    const halt = makeDay([
      [8_600, 8_600, 8_600, 8_600],
      [8_600, 8_600, 8_600, 8_600],
      [9_080, 9_150, 9_050, 9_140],
    ]);
    const short = fill(createAccount(), order("sell", 10, 8_600));
    const withStop = (setStopLoss(short, 8_800, 8_600) as { account: Account }).account;

    const after = checkStopLoss(withStop, halt.candles, OPEN, OPEN + 3 * MINUTE);

    expect(after.position).toBe(0);
    expect(after.trades.at(-1)).toMatchObject({
      side: "buy",
      price: 9_080,
      realizedPnl: -4_800,
    });
  });

  it("does nothing when the stop isn't reached", () => {
    const withStop = (setStopLoss(long, 21_500, 22_000) as { account: Account }).account;

    expect(checkStopLoss(withStop, day.candles, OPEN, OPEN + 3 * MINUTE)).toBe(withStop);
  });

  it("is dropped when the position is closed by hand", () => {
    const withStop = (setStopLoss(long, 21_900, 22_000) as { account: Account }).account;

    expect(fill(withStop, order("sell", 10, 22_000)).stopLoss).toBeNull();
  });

  it("is kept when the position is only reduced", () => {
    const withStop = (setStopLoss(long, 21_900, 22_000) as { account: Account }).account;

    expect(fill(withStop, order("sell", 4, 22_000)).stopLoss).toBe(21_900);
  });
});

describe("maxQuantity", () => {
  it("is what the cash covers when flat", () => {
    // (1,00,000 - 20) / 22,000 = 4.5
    expect(maxQuantity(createAccount(100_000), "buy", 22_000)).toBe(4);
    expect(maxQuantity(createAccount(100_000), "sell", 22_000)).toBe(4);
  });

  it("counts what's already held when adding to a position", () => {
    const account = fill(createAccount(100_000), order("buy", 3, 22_000));

    expect(maxQuantity(account, "buy", 22_000)).toBe(1);
  });

  it("allows closing and then flipping the other way", () => {
    const account = fill(createAccount(100_000), order("buy", 3, 22_000));

    // Close 3, then open up to 4 short
    expect(maxQuantity(account, "sell", 22_000)).toBe(7);
  });

  it("never suggests an order that placeOrder would reject", () => {
    const cases: [Account, Order["side"], number][] = [
      [createAccount(100_000), "buy", 22_000],
      [fill(createAccount(100_000), order("buy", 3, 22_000)), "buy", 21_000],
      [fill(createAccount(100_000), order("buy", 3, 22_000)), "sell", 15_000],
      [fill(createAccount(100_000), order("sell", 4, 22_000)), "buy", 30_000],
      [fill(createAccount(100_000), order("sell", 4, 22_000)), "sell", 24_000],
    ];

    for (const [account, side, price] of cases) {
      const max = maxQuantity(account, side, price);
      if (max > 0) expect(placeOrder(account, order(side, max, price)).ok).toBe(true);
      expect(placeOrder(account, order(side, max + 1, price)).ok).toBe(false);
    }
  });
});
