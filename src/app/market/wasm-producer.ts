import { MarketUpdate } from './model';

const STRIDE = 7;

interface ProducerExports {
  memory: WebAssembly.Memory;
  producer_init: (count: number, seed: number) => number;
  producer_generate: (batchSize: number) => number;
  producer_output_ptr: () => number;
}

export function decodeUpdates(words: Uint32Array, count: number): MarketUpdate[] {
  if (!Number.isInteger(count) || count < 0 || count * STRIDE > words.length) {
    throw new Error(`Producer buffer is too small for ${count} updates.`);
  }

  const updates: MarketUpdate[] = new Array(count);
  for (let index = 0; index < count; index++) {
    const offset = index * STRIDE;
    updates[index] = {
      instrumentIndex: words[offset],
      priceCents: words[offset + 1],
      tradeQuantity: words[offset + 2],
      bidCents: words[offset + 3],
      askCents: words[offset + 4],
      bidQuantity: words[offset + 5],
      askQuantity: words[offset + 6],
    };
  }
  return updates;
}

export async function loadProducer(url: URL | string): Promise<WasmProducer> {
  let response: Response;
  try {
    response = await fetch(url);
  } catch {
    throw new Error('Could not reach the market producer.');
  }
  if (!response.ok) {
    throw new Error(`Could not download the market producer (${response.status}).`);
  }

  const bytes = await response.arrayBuffer();
  let module: WebAssembly.Module;
  try {
    module = await WebAssembly.compile(bytes);
  } catch (error) {
    throw new Error(`Could not compile the market producer: ${messageOf(error)}`);
  }

  const imports = WebAssembly.Module.imports(module);
  const importObject: WebAssembly.Imports = {};
  for (const entry of imports) {
    if (entry.kind !== 'function' || entry.module !== 'env' || entry.name !== 'abort') {
      throw new Error(`Unexpected producer import ${entry.module}.${entry.name}.`);
    }
    importObject['env'] = {
      abort: (_message: number, _file: number, line: number, column: number) => {
        throw new Error(`Producer aborted at line ${line}, column ${column}.`);
      },
    };
  }

  let instance: WebAssembly.Instance;
  try {
    instance = await WebAssembly.instantiate(module, importObject);
  } catch (error) {
    throw new Error(`Could not instantiate the market producer: ${messageOf(error)}`);
  }

  return new WasmProducer(readExports(instance));
}

export class WasmProducer {
  constructor(private readonly wasm: ProducerExports) {}

  init(instrumentCount: number, seed: number): void {
    const code = this.wasm.producer_init(instrumentCount, seed >>> 0);
    if (code !== 0) {
      throw new Error(`Producer rejected an instrument count of ${instrumentCount}.`);
    }
  }

  generate(batchSize: number): MarketUpdate[] {
    const written = this.wasm.producer_generate(batchSize);
    if (written !== batchSize) {
      throw new Error(`Producer returned ${written} updates for a batch of ${batchSize}.`);
    }
    const pointer = this.wasm.producer_output_ptr();
    const words = new Uint32Array(this.wasm.memory.buffer, pointer, written * STRIDE);
    return decodeUpdates(words, written);
  }
}

function readExports(instance: WebAssembly.Instance): ProducerExports {
  const exported = instance.exports;
  const memory = exported['memory'];
  const init = exported['producer_init'];
  const generate = exported['producer_generate'];
  const outputPtr = exported['producer_output_ptr'];

  if (!(memory instanceof WebAssembly.Memory)) {
    throw new Error('Producer did not export its memory.');
  }
  if (
    typeof init !== 'function' ||
    typeof generate !== 'function' ||
    typeof outputPtr !== 'function'
  ) {
    throw new Error('Producer is missing init, generate, or the output pointer.');
  }

  return {
    memory,
    producer_init: init as ProducerExports['producer_init'],
    producer_generate: generate as ProducerExports['producer_generate'],
    producer_output_ptr: outputPtr as ProducerExports['producer_output_ptr'],
  };
}

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : 'unknown error';
}
