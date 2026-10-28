import type { Candle } from "@/data/types";

import { type Halt, haltAt, tradingWindows } from "./halts";
import { firstCrossing } from "./pricePath";

/** ₹10 lakh of practice money. */
export const STARTING_CASH = 10_00_000;

/** Flat fee per executed order, the way most Indian discount brokers charge. */
export const BROKERAGE_PER_ORDER = 20;

export type Side = "buy" | "sell";

export interface Trade {
  id: number;
  side: Side;
  quantity: number;
  price: number;
  /** Market time of the fill. */
  time: number;
  /** "stop" when a stop-loss closed the position rather than the user. */
  reason: "manual" | "stop";
  /** Profit or loss this trade locked in by closing some or all of a position. */
  realizedPnl: number;
}

/**
 * The practice account. Positions are signed: positive is long, negative is
 * short, so selling on a crash day is allowed.
 *
 * Every function here returns a new account rather than changing the old one.
 * That makes it trivial to keep in React state, and to test.
 */
export interface Account {
  cash: number;
  position: number;
  /** Average entry price of the open position. 0 when flat. */
  avgPrice: number;
  /** Booked profit and loss from closed trades, before charges. */
  realizedPnl: number;
  charges: number;
  stopLoss: number | null;
  trades: Trade[];
}

export interface Order {
  side: Side;
  quantity: number;
  price: number;
  time: number;
}

export type BrokerResult = { ok: true; account: Account } | { ok: false; reason: string };

export function createAccount(cash: number = STARTING_CASH): Account {
  return {
    cash,
    position: 0,
    avgPrice: 0,
    realizedPnl: 0,
    charges: 0,
    stopLoss: null,
    trades: [],
  };
}

/** What the account would be worth if everything were closed at `price`. */
export function equity(account: Account, price: number): number {
  return roundMoney(account.cash + account.position * price);
}

export function unrealizedPnl(account: Account, price: number): number {
  return roundMoney(account.position * (price - account.avgPrice));
}

/** Total profit or loss since the start, after charges. */
export function netPnl(
  account: Account,
  price: number,
  startingCash = STARTING_CASH,
): number {
  return roundMoney(equity(account, price) - startingCash);
}

/**
 * Fills a market order at `price`.
 *
 * Orders that grow the position are limited to 1× the account's equity, with
 * no leverage. Orders that shrink it are always allowed, so a user can never
 * get stuck unable to close a losing trade.
 */
export function placeOrder(
  account: Account,
  order: Order,
  reason: Trade["reason"] = "manual",
): BrokerResult {
  const { side, quantity, price, time } = order;

  if (!Number.isInteger(quantity) || quantity <= 0) {
    return { ok: false, reason: "Quantity must be a whole number above zero" };
  }
  if (!(price > 0)) {
    return { ok: false, reason: "No price to trade at yet" };
  }

  const signed = side === "buy" ? quantity : -quantity;
  const before = account.position;
  const after = before + signed;

  if (Math.abs(after) > Math.abs(before)) {
    const buyingPower = equity(account, price) - BROKERAGE_PER_ORDER;
    if (Math.abs(after) * price > buyingPower) {
      const max = Math.max(0, Math.floor(buyingPower / price) - Math.abs(before));
      return {
        ok: false,
        reason:
          max > 0
            ? `Not enough funds. You can ${side} up to ${max}.`
            : "Not enough funds",
      };
    }
  }

  const { avgPrice, realized } = applyFill(before, account.avgPrice, signed, price);

  // The stop belonged to the old position. If it's been closed or flipped
  // to the other side, the stop no longer makes sense.
  const keepStop = after !== 0 && Math.sign(after) === Math.sign(before);

  const trade: Trade = {
    id: account.trades.length + 1,
    side,
    quantity,
    price,
    time,
    reason,
    realizedPnl: realized,
  };

  return {
    ok: true,
    account: {
      cash: roundMoney(account.cash - signed * price - BROKERAGE_PER_ORDER),
      position: after,
      avgPrice,
      realizedPnl: roundMoney(account.realizedPnl + realized),
      charges: roundMoney(account.charges + BROKERAGE_PER_ORDER),
      stopLoss: keepStop ? account.stopLoss : null,
      trades: [...account.trades, trade],
    },
  };
}

/**
 * Average price and booked P&L after a fill. Three cases:
 *  - adding to a position (or opening one): blend the average price
 *  - reducing it: average stays, the closed part books P&L
 *  - flipping from long to short or back: close everything, and the
 *    leftover opens a new position at the fill price
 */
function applyFill(position: number, avgPrice: number, signed: number, price: number) {
  if (position === 0 || Math.sign(position) === Math.sign(signed)) {
    const total = position + signed;
    return {
      avgPrice:
        (Math.abs(position) * avgPrice + Math.abs(signed) * price) / Math.abs(total),
      realized: 0,
    };
  }

  const closing = Math.min(Math.abs(signed), Math.abs(position));
  const realized = roundMoney(closing * (price - avgPrice) * Math.sign(position));
  const after = position + signed;

  if (after === 0) return { avgPrice: 0, realized };
  if (Math.sign(after) === Math.sign(position)) return { avgPrice, realized };
  return { avgPrice: price, realized };
}

/**
 * The biggest order on `side` that placeOrder would accept at `price`.
 *
 * An order against the current position first closes it, which is always
 * allowed, and anything beyond that opens a new position, which has to fit
 * the buying power. Mirrors the rule in placeOrder so the "Max" button never
 * suggests an order that then gets rejected.
 */
export function maxQuantity(account: Account, side: Side, price: number): number {
  if (!(price > 0)) return 0;

  const buyingPower = equity(account, price) - BROKERAGE_PER_ORDER;
  const affordable = Math.max(0, Math.floor(buyingPower / price));
  const held = Math.abs(account.position);
  const sameDirection =
    account.position === 0 || account.position > 0 === (side === "buy");

  if (sameDirection) return Math.max(0, affordable - held);
  // Close the whole position, then open up to whichever is larger: what's
  // affordable, or a flip no bigger than the position just closed (which
  // placeOrder allows because it doesn't grow the exposure).
  return held + Math.max(affordable, held);
}

/**
 * Sets or clears a stop-loss on the open position. A long's stop has to be
 * below the current price and a short's above it, otherwise it would fire
 * straight away.
 */
export function setStopLoss(
  account: Account,
  level: number | null,
  price: number,
): BrokerResult {
  if (level === null) return { ok: true, account: { ...account, stopLoss: null } };

  if (account.position === 0) {
    return { ok: false, reason: "Open a position before setting a stop-loss" };
  }
  if (!(level > 0)) {
    return { ok: false, reason: "Stop-loss must be a positive price" };
  }
  if (account.position > 0 && level >= price) {
    return { ok: false, reason: "Stop-loss for a buy must be below the current price" };
  }
  if (account.position < 0 && level <= price) {
    return { ok: false, reason: "Stop-loss for a sell must be above the current price" };
  }

  return { ok: true, account: { ...account, stopLoss: level } };
}

/**
 * What the order ticket calls: placeOrder, but refused while trading is
 * halted, the way a real exchange would reject it.
 */
export function submitOrder(
  account: Account,
  order: Order,
  halts: readonly Halt[],
): BrokerResult {
  if (haltAt(halts, order.time)) {
    return {
      ok: false,
      reason: "Trading is halted. Orders open again when the market resumes.",
    };
  }
  return placeOrder(account, order);
}

/**
 * Checks whether the stop-loss was hit between two market times (normally the
 * previous frame and this one) and, if so, closes the position at the price
 * the stop would really have filled at.
 *
 * Stops only fire while trading is open. During a halt (including the
 * pre-open session before trading resumes) prices can move but nothing
 * actually trades, so the stop waits until the reopen.
 *
 * Returns the account unchanged if nothing happened.
 */
export function checkStopLoss(
  account: Account,
  candles: readonly Candle[],
  from: number,
  to: number,
  halts: readonly Halt[] = [],
): Account {
  const { stopLoss, position } = account;
  if (stopLoss === null || position === 0) return account;

  const direction = position > 0 ? "down" : "up";
  let hit = null;
  for (const [start, end] of tradingWindows(halts, from, to)) {
    hit = firstCrossing(candles, start, end, stopLoss, direction);
    if (hit) break;
  }
  if (!hit) return account;

  const result = placeOrder(
    account,
    {
      side: position > 0 ? "sell" : "buy",
      quantity: Math.abs(position),
      price: hit.price,
      time: hit.time,
    },
    "stop",
  );

  // Closing a position always passes the funds check, so this can't fail,
  // but don't throw inside a frame loop if it somehow does.
  return result.ok ? result.account : account;
}

/** Rounds to the paisa, so repeated float maths doesn't leave 0.0000001 rupees lying around. */
function roundMoney(value: number): number {
  // `+ 0` turns -0 into 0, which otherwise shows up as "-₹0.00"
  return Math.round(value * 100) / 100 + 0;
}
