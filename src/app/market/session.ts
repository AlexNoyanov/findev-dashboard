import { MarketBook } from './book';
import { InstrumentRow, MarketUpdate, ProducerSettings } from './model';

export interface SessionSnapshot {
  runId: number;
  commandSeq: number;
  phase: 'running' | 'paused';
  rows: InstrumentRow[];
  updates: number;
  batches: number;
}

/** Book for a single apply. A paused or foreign runId does not move totals. */
export class RunSession {
  readonly runId: number;
  readonly settings: ProducerSettings;
  commandSeq: number;
  phase: 'running' | 'paused' = 'running';
  private readonly book: MarketBook;
  private updates = 0;
  private batches = 0;

  private constructor(runId: number, commandSeq: number, settings: ProducerSettings) {
    this.runId = runId;
    this.commandSeq = commandSeq;
    this.settings = settings;
    this.book = new MarketBook(settings.instrumentCount);
  }

  static start(runId: number, commandSeq: number, settings: ProducerSettings): RunSession {
    return new RunSession(runId, commandSeq, settings);
  }

  pause(commandSeq: number): void {
    this.commandSeq = commandSeq;
    this.phase = 'paused';
  }

  resume(commandSeq: number): void {
    this.commandSeq = commandSeq;
    this.phase = 'running';
  }

  accept(runId: number, updates: readonly MarketUpdate[]): boolean {
    if (runId !== this.runId || this.phase !== 'running') return false;

    let applied = 0;
    for (const update of updates) {
      if (this.book.apply(update)) applied += 1;
    }
    this.updates += applied;
    this.batches += 1;
    return true;
  }

  snapshot(): SessionSnapshot {
    return {
      runId: this.runId,
      commandSeq: this.commandSeq,
      phase: this.phase,
      rows: this.book.snapshot(),
      updates: this.updates,
      batches: this.batches,
    };
  }
}
