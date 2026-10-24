import { describe, expect, it } from 'vitest';

import { acceptSnapshot, beginRun, createDesk, requestPause, requestResume } from './desk';
import { DEFAULT_SETTINGS } from './model';
import { SessionSnapshot } from './session';

function snapshot(patch: Partial<SessionSnapshot> = {}): SessionSnapshot {
  const desk = createDesk();
  return {
    runId: desk.runId,
    commandSeq: desk.commandSeq,
    phase: 'running',
    rows: desk.rows.map((row, index) =>
      index === 0 ? { ...row, volume: 40, vwapCents: 10150 } : row,
    ),
    updates: 40,
    batches: 1,
    ...patch,
  };
}

describe('desk', () => {
  it('clears totals and resumes when settings are applied', () => {
    let state = createDesk();
    state = { ...state, booted: true, phase: 'paused', updates: 40, batches: 1 };
    state = {
      ...state,
      rows: state.rows.map((row, index) => (index === 0 ? { ...row, volume: 40 } : row)),
    };

    const next = beginRun(state, { ...DEFAULT_SETTINGS, instrumentCount: 2 });

    expect(next.runId).toBe(state.runId + 1);
    expect(next.phase).toBe('running');
    expect(next.updates).toBe(0);
    expect(next.batches).toBe(0);
    expect(next.rows).toHaveLength(2);
    expect(next.rows.every((row) => row.volume === 0 && row.lastPriceCents === null)).toBe(true);
    expect(next.settings.instrumentCount).toBe(2);
  });

  it('ignores a snapshot from the previous run', () => {
    const state = beginRun({ ...createDesk(), booted: true }, DEFAULT_SETTINGS);
    const stale = snapshot({ runId: state.runId - 1, commandSeq: state.commandSeq });

    const next = acceptSnapshot(state, stale);
    expect(next).toBe(state);
    expect(next.rows[0].volume).toBe(0);
    expect(next.updates).toBe(0);
  });

  it('does not let an in-flight snapshot undo pause', () => {
    let state = { ...createDesk(), booted: true, phase: 'running' as const };
    state = {
      ...state,
      rows: state.rows.map((row, index) => (index === 0 ? { ...row, volume: 15 } : row)),
      updates: 15,
    };
    const paused = requestPause(state);

    expect(paused.phase).toBe('paused');
    expect(paused.rows[0].volume).toBe(15);
    expect(requestPause(paused)).toBe(paused);

    const late = snapshot({
      runId: paused.runId,
      commandSeq: paused.commandSeq - 1,
      phase: 'running',
      updates: 80,
    });
    const next = acceptSnapshot(paused, late);
    expect(next.phase).toBe('paused');
    expect(next.updates).toBe(15);
    expect(next.rows[0].volume).toBe(15);
  });

  it('applies the pause acknowledgement and a later resume', () => {
    let state = requestPause({ ...createDesk(), booted: true, phase: 'running' });
    const ack = snapshot({
      runId: state.runId,
      commandSeq: state.commandSeq,
      phase: 'paused',
      updates: 0,
      rows: state.rows,
    });
    state = acceptSnapshot(state, ack);
    expect(state.phase).toBe('paused');

    const resumed = requestResume(state);
    expect(resumed.phase).toBe('running');
    expect(resumed.commandSeq).toBe(state.commandSeq + 1);
    expect(requestResume(resumed)).toBe(resumed);
  });
});
