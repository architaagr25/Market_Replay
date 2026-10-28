import { makeDay } from "../__fixtures__/makeDay";
import { type Account, createAccount, type Order, placeOrder } from "../paperBroker";
import { summarizeSession } from "../sessionSummary";

// Opens at 20,000, closes at 21,000
const day = makeDay([
  [20_000, 20_100, 19_900, 20_050],
  [20_050, 20_600, 20_000, 20_500],
  [20_500, 21_100, 20_400, 21_000],
]);

function trade(account: Account, side: Order["side"], quantity: number, price: number) {
  const result = placeOrder(account, { side, quantity, price, time: 0 });
  if (!result.ok) throw new Error(result.reason);
  return result.account;
}

describe("summarizeSession", () => {
  it("summarises a session with no trades", () => {
    const summary = summarizeSession(createAccount(), day);

    expect(summary.netPnl).toBe(0);
    expect(summary.tradeCount).toBe(0);
    expect(summary.winRate).toBeNull();
    expect(summary.bestTrade).toBeNull();
  });

  it("counts winners and losers among closing trades only", () => {
    let account = createAccount();
    account = trade(account, "buy", 2, 20_000); // opens
    account = trade(account, "sell", 1, 20_500); // +500
    account = trade(account, "sell", 1, 19_900); // -100
    account = trade(account, "sell", 1, 20_000); // opens a short
    account = trade(account, "buy", 1, 20_000); // closes at entry: 0

    const summary = summarizeSession(account, day);

    expect(summary.tradeCount).toBe(5);
    expect(summary.closingTrades).toBe(3);
    expect(summary.winners).toBe(1);
    expect(summary.losers).toBe(1);
    expect(summary.winRate).toBeCloseTo(1 / 3);
    expect(summary.bestTrade!.realizedPnl).toBe(500);
    expect(summary.worstTrade!.realizedPnl).toBe(-100);
    expect(summary.charges).toBe(100);
  });

  it("values a position still open at the close at the closing price", () => {
    const account = trade(createAccount(), "buy", 10, 20_000);

    const summary = summarizeSession(account, day);

    expect(summary.openPosition).toBe(10);
    expect(summary.netPnl).toBe(10 * 1_000 - 20);
    expect(summary.returnPercent).toBeCloseTo(0.998);
  });

  it("compares against buying the maximum at the open and holding", () => {
    const summary = summarizeSession(createAccount(), day);

    // (10,00,000 - 20) / 20,000 = 49 units, up 1,000 each, minus two fees
    expect(summary.buyAndHold).toEqual({ quantity: 49, pnl: 49_000 - 40 });
  });
});
