import type { TradingDay } from "@/data/types";

import {
  type Account,
  BROKERAGE_PER_ORDER,
  createAccount,
  maxQuantity,
  netPnl,
  STARTING_CASH,
  type Trade,
} from "./paperBroker";

export interface SessionSummary {
  netPnl: number;
  /** Net P&L as a percentage of the starting cash. */
  returnPercent: number;
  charges: number;
  tradeCount: number;
  /** Trades that closed some or all of a position, so they have a result. */
  closingTrades: number;
  winners: number;
  losers: number;
  /** Share of closing trades that made money, 0 to 1. Null if nothing was closed. */
  winRate: number | null;
  bestTrade: Trade | null;
  worstTrade: Trade | null;
  /** Units still held at the close. Valued at the closing price in netPnl. */
  openPosition: number;
  closePrice: number;
  /** The benchmark: put everything into the index at the open and do nothing. */
  buyAndHold: { quantity: number; pnl: number };
}

/** How the session went, for the result screen. */
export function summarizeSession(account: Account, day: TradingDay): SessionSummary {
  const first = day.candles[0]!;
  const closePrice = day.candles[day.candles.length - 1]!.close;

  // A trade's realizedPnl can be exactly zero (closed at the entry price), so
  // whether it closed something is worked out from the running position
  // instead of from the P&L.
  const closing: Trade[] = [];
  let position = 0;
  for (const trade of account.trades) {
    const signed = trade.side === "buy" ? trade.quantity : -trade.quantity;
    if (position !== 0 && Math.sign(signed) !== Math.sign(position)) closing.push(trade);
    position += signed;
  }

  const winners = closing.filter((t) => t.realizedPnl > 0).length;
  const losers = closing.filter((t) => t.realizedPnl < 0).length;
  const byResult = [...closing].sort((a, b) => b.realizedPnl - a.realizedPnl);

  const total = netPnl(account, closePrice);

  const holdQuantity = maxQuantity(createAccount(), "buy", first.open);
  const holdPnl = holdQuantity * (closePrice - first.open) - 2 * BROKERAGE_PER_ORDER;

  return {
    netPnl: total,
    returnPercent: (total / STARTING_CASH) * 100,
    charges: account.charges,
    tradeCount: account.trades.length,
    closingTrades: closing.length,
    winners,
    losers,
    winRate: closing.length > 0 ? winners / closing.length : null,
    bestTrade: byResult[0] ?? null,
    worstTrade: byResult[byResult.length - 1] ?? null,
    openPosition: account.position,
    closePrice,
    buyAndHold: { quantity: holdQuantity, pnl: Math.round(holdPnl * 100) / 100 },
  };
}
