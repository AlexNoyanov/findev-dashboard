import { describe, expect, it } from 'vitest';

import { DEFAULT_SETTINGS, LIMITS, parseSettings, SYMBOLS, updatesPerSecond } from './model';

describe('producer settings', () => {
  it('accepts the defaults and the edges of each range', () => {
    expect(parseSettings(DEFAULT_SETTINGS)).toEqual({ ok: true, value: DEFAULT_SETTINGS });
    expect(updatesPerSecond(DEFAULT_SETTINGS)).toBe(200);

    const edges = parseSettings({ instrumentCount: 1, updatesPerBatch: 1000, batchIntervalMs: 50 });
    expect(edges.ok).toBe(true);
    if (edges.ok) expect(updatesPerSecond(edges.value)).toBe(20000);

    const slow = parseSettings({
      instrumentCount: '50',
      updatesPerBatch: '1',
      batchIntervalMs: '2000',
    });
    expect(slow.ok).toBe(true);
    if (slow.ok) expect(updatesPerSecond(slow.value)).toBe(0.5);
  });

  it('rejects values outside the brief', () => {
    const parsed = parseSettings({
      instrumentCount: 0,
      updatesPerBatch: 1.5,
      batchIntervalMs: 2001,
    });
    expect(parsed.ok).toBe(false);
    if (!parsed.ok) {
      expect(parsed.errors.instrumentCount).toContain(`${LIMITS.instrumentCount.min}`);
      expect(parsed.errors.updatesPerBatch).toContain('whole number');
      expect(parsed.errors.batchIntervalMs).toContain(`${LIMITS.batchIntervalMs.max}`);
    }
  });

  it('rejects a blank field', () => {
    const parsed = parseSettings({ ...DEFAULT_SETTINGS, batchIntervalMs: '' });
    expect(parsed.ok).toBe(false);
  });

  it('has one symbol per allowed instrument', () => {
    expect(SYMBOLS).toHaveLength(LIMITS.instrumentCount.max);
    expect(new Set(SYMBOLS).size).toBe(SYMBOLS.length);
  });
});
