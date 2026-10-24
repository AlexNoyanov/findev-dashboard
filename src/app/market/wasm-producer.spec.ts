import { describe, expect, it } from 'vitest';

import { decodeUpdates } from './wasm-producer';

describe('wasm batch layout', () => {
  it('reads the seven fields of an update', () => {
    const words = new Uint32Array([1, 10200, 30, 10196, 10200, 600, 400]);
    expect(decodeUpdates(words, 1)).toEqual([
      {
        instrumentIndex: 1,
        priceCents: 10200,
        tradeQuantity: 30,
        bidCents: 10196,
        askCents: 10200,
        bidQuantity: 600,
        askQuantity: 400,
      },
    ]);
  });

  it('refuses a short buffer', () => {
    expect(() => decodeUpdates(new Uint32Array(6), 1)).toThrow(/too small/);
  });
});
