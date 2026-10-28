/** One minute of index prices. `time` is the minute's start, as UTC epoch ms. */
export interface Candle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
}

/** A candle as stored in the bundled JSON: [time, open, high, low, close]. */
export type RawCandle = [
  time: number,
  open: number,
  high: number,
  low: number,
  close: number,
];

/** Shape of a file in src/data/days, as written by scripts/extract-days.mjs. */
export interface RawDay {
  date: string;
  prevClose: number;
  candles: RawCandle[];
}

/** A day that has been loaded and checked, ready for the replay engine. */
export interface TradingDay {
  date: string;
  prevClose: number;
  candles: Candle[];
}
