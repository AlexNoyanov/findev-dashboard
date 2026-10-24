import { ProducerSettings } from './model';
import { SessionSnapshot } from './session';

export type WorkerCommand =
  | { type: 'boot'; wasmUrl: string }
  | { type: 'start'; runId: number; commandSeq: number; settings: ProducerSettings }
  | { type: 'pause'; runId: number; commandSeq: number }
  | { type: 'resume'; runId: number; commandSeq: number }
  | { type: 'stop' };

export type WorkerEvent =
  | { type: 'ready' }
  | { type: 'snapshot'; snapshot: SessionSnapshot }
  | { type: 'error'; message: string };
