import { ProducerSettings } from './model';
import { WorkerCommand, WorkerEvent } from './protocol';
import { RunSession } from './session';
import { loadProducer, WasmProducer } from './wasm-producer';

const FRAME_MS = 100;

let producer: WasmProducer | null = null;
let session: RunSession | null = null;
let timer: ReturnType<typeof setInterval> | null = null;
let lastPublish = 0;

self.onmessage = (event: MessageEvent<WorkerCommand>) => {
  const message = event.data;
  switch (message.type) {
    case 'boot':
      void boot(message.wasmUrl);
      break;
    case 'start':
      start(message.runId, message.commandSeq, message.settings);
      break;
    case 'pause':
      pause(message.runId, message.commandSeq);
      break;
    case 'resume':
      resume(message.runId, message.commandSeq);
      break;
    case 'stop':
      stop();
      break;
  }
};

async function boot(wasmUrl: string): Promise<void> {
  try {
    producer = await loadProducer(wasmUrl);
    post({ type: 'ready' });
  } catch (error) {
    post({ type: 'error', message: messageOf(error) });
  }
}

function start(runId: number, commandSeq: number, settings: ProducerSettings): void {
  if (!producer) {
    post({ type: 'error', message: 'The producer is not loaded. Reload the page.' });
    return;
  }

  clearTimer();
  try {
    producer.init(settings.instrumentCount, freshSeed());
    session = RunSession.start(runId, commandSeq, settings);
    publish();
    pump();
    publish();
  } catch (error) {
    post({ type: 'error', message: messageOf(error) });
    return;
  }

  timer = setInterval(() => {
    try {
      if (!pump()) return;
    } catch (error) {
      clearTimer();
      post({ type: 'error', message: messageOf(error) });
      return;
    }
    if (performance.now() - lastPublish >= FRAME_MS) publish();
  }, settings.batchIntervalMs);
}

function pause(runId: number, commandSeq: number): void {
  if (!session || session.runId !== runId) return;
  clearTimer();
  session.pause(commandSeq);
  publish();
}

function resume(runId: number, commandSeq: number): void {
  if (!session || session.runId !== runId) return;
  // Fresh timer. The pause gap is not filled in.
  session.resume(commandSeq);
  publish();
  timer = setInterval(() => {
    try {
      if (!pump()) return;
    } catch (error) {
      clearTimer();
      post({ type: 'error', message: messageOf(error) });
      return;
    }
    if (performance.now() - lastPublish >= FRAME_MS) publish();
  }, session.settings.batchIntervalMs);
}

function stop(): void {
  clearTimer();
  session = null;
  producer = null;
}

function pump(): boolean {
  if (!session || !producer || session.phase !== 'running') return false;
  const updates = producer.generate(session.settings.updatesPerBatch);
  return session.accept(session.runId, updates);
}

function publish(): void {
  if (!session) return;
  lastPublish = performance.now();
  post({ type: 'snapshot', snapshot: session.snapshot() });
}

function post(event: WorkerEvent): void {
  self.postMessage(event);
}

function clearTimer(): void {
  if (timer !== null) {
    clearInterval(timer);
    timer = null;
  }
}

function freshSeed(): number {
  const buffer = new Uint32Array(1);
  crypto.getRandomValues(buffer);
  return buffer[0] ?? 1;
}

function messageOf(error: unknown): string {
  return error instanceof Error && error.message ? error.message : 'The producer failed.';
}
