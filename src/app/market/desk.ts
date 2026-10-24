import { emptyRows } from './book';
import { DEFAULT_SETTINGS, InstrumentRow, ProducerPhase, ProducerSettings } from './model';
import { SessionSnapshot } from './session';

export interface DeskState {
  booted: boolean;
  runId: number;
  commandSeq: number;
  phase: ProducerPhase;
  settings: ProducerSettings;
  rows: InstrumentRow[];
  updates: number;
  batches: number;
  error: string | null;
}

export function createDesk(settings: ProducerSettings = DEFAULT_SETTINGS): DeskState {
  return {
    booted: false,
    runId: 1,
    commandSeq: 1,
    phase: 'starting',
    settings,
    rows: emptyRows(settings.instrumentCount),
    updates: 0,
    batches: 0,
    error: null,
  };
}

export function beginRun(state: DeskState, settings: ProducerSettings): DeskState {
  return {
    ...state,
    runId: state.runId + 1,
    commandSeq: state.commandSeq + 1,
    phase: state.booted ? 'running' : 'starting',
    settings,
    rows: emptyRows(settings.instrumentCount),
    updates: 0,
    batches: 0,
    error: null,
  };
}

export function requestPause(state: DeskState): DeskState {
  if (state.phase !== 'running') return state;
  return { ...state, phase: 'paused', commandSeq: state.commandSeq + 1 };
}

export function requestResume(state: DeskState): DeskState {
  if (state.phase !== 'paused') return state;
  return { ...state, phase: 'running', commandSeq: state.commandSeq + 1 };
}

export function markReady(state: DeskState): DeskState {
  return {
    ...state,
    booted: true,
    error: null,
    phase: state.phase === 'paused' ? 'paused' : 'running',
  };
}

export function fail(state: DeskState, message: string): DeskState {
  return { ...state, phase: 'error', error: message };
}

/**
 * Drops a snapshot from a replaced run, or one that was already in flight
 * when pause, resume, or apply moved the command sequence forward.
 */
export function acceptSnapshot(state: DeskState, snapshot: SessionSnapshot): DeskState {
  if (state.phase === 'error') return state;
  if (snapshot.runId !== state.runId || snapshot.commandSeq !== state.commandSeq) {
    return state;
  }
  return {
    ...state,
    phase: snapshot.phase,
    rows: snapshot.rows,
    updates: snapshot.updates,
    batches: snapshot.batches,
    error: null,
  };
}
