import { describe, expect, it } from 'vitest';

import { imbalance, MarketBook, spreadCents, vwapCents } from './book';
import { MarketUpdate } from './model';

function update(
  patch: Partial<MarketUpdate> & Pick<MarketUpdate, 'instrumentIndex'>,
): MarketUpdate {
  return {
    priceCents: 10000,
    tradeQuantity: 10,
    bidCents: 9996,
    askCents: 10000,
    bidQuantity: 100,
    askQuantity: 100,
    ...patch,
  };
}

describe('metric formulas', () => {
  it('matches the worked example', () => {
    const book = new MarketBook(1);
    book.apply(
      update({
        instrumentIndex: 0,
        priceCents: 10000,
        tradeQuantity: 10,
        bidCents: 9996,
        askCents: 10000,
      }),
    );
    book.apply(
      update({
        instrumentIndex: 0,
        priceCents: 10200,
        tradeQuantity: 30,
        bidCents: 10196,
        askCents: 10200,
        bidQuantity: 600,
        askQuantity: 400,
      }),
    );

    const row = book.snapshot()[0];
    expect(row.lastPriceCents).toBe(10200);
    expect(row.volume).toBe(40);
    expect(row.vwapCents).toBe(10150);
    expect(row.spreadCents).toBe(4);
    expect(row.imbalance).toBeCloseTo(0.2, 10);
  });

  it('returns nothing for a zero denominator', () => {
    expect(vwapCents(0n, 0n)).toBeNull();
    expect(imbalance(0, 0)).toBeNull();

    const row = new MarketBook(1).snapshot()[0];
    expect(row.lastPriceCents).toBeNull();
    expect(row.spreadCents).toBeNull();
    expect(row.vwapCents).toBeNull();
    expect(row.imbalance).toBeNull();
    expect(row.volume).toBe(0);
  });

  it('keeps an unavailable imbalance when the book is empty but the trade counts', () => {
    const book = new MarketBook(1);
    book.apply(
      update({
        instrumentIndex: 0,
        priceCents: 10000,
        tradeQuantity: 10,
        bidQuantity: 0,
        askQuantity: 0,
      }),
    );

    const row = book.snapshot()[0];
    expect(row.volume).toBe(10);
    expect(row.vwapCents).toBe(10000);
    expect(row.imbalance).toBeNull();
    expect(row.spreadCents).toBe(spreadCents(9996, 10000));
  });

  it('does not let book size into the volume', () => {
    const book = new MarketBook(1);
    book.apply(
      update({
        instrumentIndex: 0,
        tradeQuantity: 10,
        bidQuantity: 600,
        askQuantity: 400,
      }),
    );
    expect(book.snapshot()[0].volume).toBe(10);
  });

  it('does not mix instruments', () => {
    const book = new MarketBook(2);
    book.apply(update({ instrumentIndex: 1, priceCents: 10200, tradeQuantity: 30 }));

    const [untouched, traded] = book.snapshot();
    expect(untouched.volume).toBe(0);
    expect(untouched.vwapCents).toBeNull();
    expect(untouched.lastPriceCents).toBeNull();
    expect(traded.symbol).toBe('BETA');
    expect(traded.volume).toBe(30);
    expect(traded.vwapCents).toBe(10200);
  });

  it('ignores an update for another instrument without moving the book', () => {
    const book = new MarketBook(1);
    expect(book.apply(update({ instrumentIndex: 1 }))).toBe(false);
    expect(book.snapshot()[0].volume).toBe(0);
  });

  it('keeps a fractional cent in the average', () => {
    expect(vwapCents(10000n + 10001n, 2n)).toBe(10000.5);
  });
});
