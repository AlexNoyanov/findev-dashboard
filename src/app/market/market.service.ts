import { DestroyRef, Injectable, inject, signal } from '@angular/core';

import {
  acceptSnapshot,
  beginRun,
  createDesk,
  DeskState,
  fail,
  markReady,
  requestPause,
  requestResume,
} from './desk';
import { ProducerSettings } from './model';
import { WorkerCommand, WorkerEvent } from './protocol';

/**
 * One worker for the whole app. The dashboard and the settings page both
 * read this service, so navigation does not start a second producer.
 */
@Injectable({ providedIn: 'root' })
export class MarketService {
  private readonly destroyRef = inject(DestroyRef);
  private worker: Worker | null = null;
  private state: DeskState = createDesk();

  readonly phase = signal(this.state.phase);
  readonly rows = signal(this.state.rows);
  readonly settings = signal(this.state.settings);
  readonly updates = signal(this.state.updates);
  readonly batches = signal(this.state.batches);
  readonly error = signal(this.state.error);

  constructor() {
    const worker = new Worker(new URL('./market.worker', import.meta.url), { type: 'module' });
    worker.onmessage = (event: MessageEvent<WorkerEvent>) => this.onEvent(event.data);
    worker.onerror = () => {
      this.state = fail(
        this.state,
        'The market worker crashed. Reload the page to start it again.',
      );
      this.publish();
    };
    this.worker = worker;
    // Resolved against <base href>, so GitHub Pages and a local server
    // both find the file. The worker bundle URL is not a stable place for it.
    const wasmUrl = new URL('market-producer.wasm', document.baseURI).href;
    this.post({ type: 'boot', wasmUrl });
    this.destroyRef.onDestroy(() => this.shutdown());
  }

  apply(settings: ProducerSettings): void {
    this.state = beginRun(this.state, settings);
    this.publish();
    if (this.state.booted) this.postStart();
  }

  pause(): void {
    const next = requestPause(this.state);
    if (next === this.state) return;
    this.state = next;
    this.publish();
    this.post({ type: 'pause', runId: this.state.runId, commandSeq: this.state.commandSeq });
  }

  resume(): void {
    const next = requestResume(this.state);
    if (next === this.state) return;
    this.state = next;
    this.publish();
    this.post({ type: 'resume', runId: this.state.runId, commandSeq: this.state.commandSeq });
  }

  private onEvent(event: WorkerEvent): void {
    if (event.type === 'ready') {
      this.state = markReady(this.state);
      this.publish();
      this.postStart();
      return;
    }
    if (event.type === 'error') {
      this.state = fail(this.state, event.message);
      this.publish();
      return;
    }
    this.state = acceptSnapshot(this.state, event.snapshot);
    this.publish();
  }

  private postStart(): void {
    this.post({
      type: 'start',
      runId: this.state.runId,
      commandSeq: this.state.commandSeq,
      settings: this.state.settings,
    });
  }

  private post(command: WorkerCommand): void {
    this.worker?.postMessage(command);
  }

  private publish(): void {
    this.phase.set(this.state.phase);
    this.rows.set(this.state.rows);
    this.settings.set(this.state.settings);
    this.updates.set(this.state.updates);
    this.batches.set(this.state.batches);
    this.error.set(this.state.error);
  }

  private shutdown(): void {
    this.worker?.postMessage({ type: 'stop' } satisfies WorkerCommand);
    this.worker?.terminate();
    this.worker = null;
  }
}
