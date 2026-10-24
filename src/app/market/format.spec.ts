import { describe, expect, it } from 'vitest';

import {
  formatImbalance,
  formatPriceCents,
  formatStatus,
  formatUpdatesPerSecond,
  formatVolume,
  UNAVAILABLE,
} from './format';
import { DEFAULT_SETTINGS } from './model';

describe('display formatting', () => {
  it('renders the worked example', () => {
    expect(formatPriceCents(10200)).toBe('$102.00');
    expect(formatPriceCents(10150)).toBe('$101.50');
    expect(formatPriceCents(4)).toBe('$0.04');
    expect(formatImbalance(0.2)).toBe('+0.20');
    expect(formatVolume(40)).toBe('40');
  });

  it('uses an em dash when a price or the imbalance is unavailable', () => {
    expect(formatPriceCents(null)).toBe(UNAVAILABLE);
    expect(formatImbalance(null)).toBe(UNAVAILABLE);
    expect(formatVolume(0)).toBe('0');
    expect(formatImbalance(0)).toBe('0.00');
    expect(formatImbalance(-0.5)).toBe('-0.50');
  });

  it('describes the configured rate, including a fractional one', () => {
    expect(formatUpdatesPerSecond(DEFAULT_SETTINGS)).toBe('200 updates/s');
    expect(
      formatUpdatesPerSecond({ instrumentCount: 1, updatesPerBatch: 1, batchIntervalMs: 2000 }),
    ).toBe('0.5 updates/s');
  });

  it('keeps the status line short before the producer is up', () => {
    expect(formatStatus({ phase: 'starting', settings: DEFAULT_SETTINGS, updates: 0 })).toBe(
      'Starting',
    );
    expect(formatStatus({ phase: 'running', settings: DEFAULT_SETTINGS, updates: 12400 })).toBe(
      'Running · 5 instruments · 200 updates/s · 12,400 updates',
    );
  });
});
