import { InstrumentRow, MarketUpdate, symbolAt } from './model';

const SCALE = 1_000_000n;

export function spreadCents(bidCents: number, askCents: number): number {
  return askCents - bidCents;
}

/** Whole cents via bigint; the fraction comes from the remainder. */
export function vwapCents(notionalCents: bigint, volume: bigint): number | null {
  if (volume <= 0n) return null;
  const whole = notionalCents / volume;
  const remainder = notionalCents % volume;
  const fraction = Number((remainder * SCALE) / volume) / Number(SCALE);
  return Number(whole) + fraction;
}

export function imbalance(bidQuantity: number, askQuantity: number): number | null {
  const total = bidQuantity + askQuantity;
  if (total === 0) return null;
  return (bidQuantity - askQuantity) / total;
}

interface Accumulator {
  lastPriceCents: number | null;
  bidCents: number | null;
  askCents: number | null;
  bidQuantity: number;
  askQuantity: number;
  hasQuote: boolean;
  volume: bigint;
  notional: bigint;
}

export class MarketBook {
  private readonly rows: Accumulator[];

  constructor(instrumentCount: number) {
    this.rows = Array.from({ length: instrumentCount }, () => emptyAccumulator());
  }

  apply(update: MarketUpdate): boolean {
    if (!isValidUpdate(update, this.rows.length)) return false;
    const row = this.rows[update.instrumentIndex];
    row.lastPriceCents = update.priceCents;
    row.bidCents = update.bidCents;
    row.askCents = update.askCents;
    row.bidQuantity = update.bidQuantity;
    row.askQuantity = update.askQuantity;
    row.hasQuote = true;
    const quantity = BigInt(update.tradeQuantity);
    row.volume += quantity;
    row.notional += BigInt(update.priceCents) * quantity;
    return true;
  }

  snapshot(): InstrumentRow[] {
    return this.rows.map((row, index) => ({
      symbol: symbolAt(index),
      lastPriceCents: row.lastPriceCents,
      spreadCents:
        row.hasQuote && row.bidCents !== null && row.askCents !== null
          ? spreadCents(row.bidCents, row.askCents)
          : null,
      volume: Number(row.volume),
      vwapCents: vwapCents(row.notional, row.volume),
      imbalance: row.hasQuote ? imbalance(row.bidQuantity, row.askQuantity) : null,
    }));
  }
}

export function emptyRows(instrumentCount: number): InstrumentRow[] {
  return new MarketBook(instrumentCount).snapshot();
}

function emptyAccumulator(): Accumulator {
  return {
    lastPriceCents: null,
    bidCents: null,
    askCents: null,
    bidQuantity: 0,
    askQuantity: 0,
    hasQuote: false,
    volume: 0n,
    notional: 0n,
  };
}

function isValidUpdate(update: MarketUpdate, instrumentCount: number): boolean {
  return (
    Number.isInteger(update.instrumentIndex) &&
    update.instrumentIndex >= 0 &&
    update.instrumentIndex < instrumentCount &&
    isPositiveInt(update.priceCents) &&
    isPositiveInt(update.tradeQuantity) &&
    isPositiveInt(update.bidCents) &&
    isPositiveInt(update.askCents) &&
    update.askCents > update.bidCents &&
    isNonNegativeInt(update.bidQuantity) &&
    isNonNegativeInt(update.askQuantity)
  );
}

function isPositiveInt(value: number): boolean {
  return Number.isSafeInteger(value) && value > 0;
}

function isNonNegativeInt(value: number): boolean {
  return Number.isSafeInteger(value) && value >= 0;
}
