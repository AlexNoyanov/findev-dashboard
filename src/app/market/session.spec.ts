import { describe, expect, it } from 'vitest';

import { DEFAULT_SETTINGS, MarketUpdate } from './model';
import { RunSession } from './session';

const trade: MarketUpdate = {
  instrumentIndex: 0,
  priceCents: 10000,
  tradeQuantity: 10,
  bidCents: 9996,
  askCents: 10000,
  bidQuantity: 100,
  askQuantity: 80,
};

describe('producer run', () => {
  it('stops accumulating while paused and continues from the same totals', () => {
    const session = RunSession.start(1, 1, DEFAULT_SETTINGS);
    expect(session.accept(1, [trade])).toBe(true);
    session.pause(2);

    expect(session.accept(1, [trade])).toBe(false);
    expect(session.snapshot().phase).toBe('paused');
    expect(session.snapshot().rows[0].volume).toBe(10);

    session.resume(3);
    expect(session.accept(1, [trade])).toBe(true);
    expect(session.snapshot().rows[0].volume).toBe(20);
    expect(session.snapshot().phase).toBe('running');
  });

  it('rejects a batch from the run that apply replaced', () => {
    const previous = RunSession.start(1, 1, DEFAULT_SETTINGS);
    previous.accept(1, [trade]);

    const next = RunSession.start(2, 2, { ...DEFAULT_SETTINGS, instrumentCount: 2 });
    expect(next.accept(previous.runId, [trade, { ...trade, instrumentIndex: 1 }])).toBe(false);

    const rows = next.snapshot().rows;
    expect(rows).toHaveLength(2);
    expect(rows.every((row) => row.volume === 0)).toBe(true);
    expect(rows.every((row) => row.vwapCents === null)).toBe(true);

    expect(next.accept(2, [{ ...trade, instrumentIndex: 1 }])).toBe(true);
    expect(next.snapshot().rows[0].volume).toBe(0);
    expect(next.snapshot().rows[1].volume).toBe(10);
  });
});
