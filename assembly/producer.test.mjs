import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const STRIDE = 7;

async function load() {
  const bytes = await readFile(new URL('../public/market-producer.wasm', import.meta.url));
  const module = await WebAssembly.compile(bytes);
  const instance = await WebAssembly.instantiate(module, {
    env: {
      abort(_message, _file, line, column) {
        throw new Error(`abort ${line}:${column}`);
      },
    },
  });
  return instance.exports;
}

function readBatch(wasm, count) {
  const pointer = wasm.producer_output_ptr();
  const words = new Uint32Array(wasm.memory.buffer, pointer, count * STRIDE);
  const rows = [];
  for (let index = 0; index < count; index++) {
    const offset = index * STRIDE;
    rows.push({
      instrument: words[offset],
      price: words[offset + 1],
      quantity: words[offset + 2],
      bid: words[offset + 3],
      ask: words[offset + 4],
      bidQuantity: words[offset + 5],
      askQuantity: words[offset + 6],
    });
  }
  return rows;
}

function assertRow(row, instrumentCount) {
  assert.ok(row.instrument >= 0 && row.instrument < instrumentCount);
  assert.ok(row.bid > 0);
  assert.ok(row.ask > row.bid);
  assert.ok(row.price === row.bid || row.price === row.ask);
  assert.ok(row.quantity > 0);
  assert.ok(row.bidQuantity >= 0);
  assert.ok(row.askQuantity >= 0);
  assert.ok(row.price < 1_000_000);
}

test('writes the requested batch and keeps every value tradable', async () => {
  const wasm = await load();
  assert.equal(wasm.producer_init(5, 42), 0);
  assert.equal(wasm.producer_generate(100), 100);
  for (const row of readBatch(wasm, 100)) assertRow(row, 5);
  assert.equal(wasm.producer_generate(1000), 1000);
  for (const row of readBatch(wasm, 1000)) assertRow(row, 5);
});

test('can print the same instrument more than once in a batch', async () => {
  const wasm = await load();
  wasm.producer_init(2, 7);
  wasm.producer_generate(30);
  const seen = [0, 0];
  for (const row of readBatch(wasm, 30)) seen[row.instrument] += 1;
  assert.ok(seen[0] > 1 || seen[1] > 1);
});

test('keeps the book between calls and resets it on init', async () => {
  const wasm = await load();
  wasm.producer_init(4, 123456);
  wasm.producer_generate(32);
  const first = readBatch(wasm, 32);
  wasm.producer_generate(32);
  const second = readBatch(wasm, 32);
  assert.notDeepEqual(second, first);

  wasm.producer_init(4, 123456);
  wasm.producer_generate(32);
  assert.deepEqual(readBatch(wasm, 32), first);
});

test('pins the first update for seed 42', async () => {
  const wasm = await load();
  wasm.producer_init(5, 42);
  wasm.producer_generate(1);
  assert.deepEqual(readBatch(wasm, 1)[0], {
    instrument: 1,
    price: 5428,
    quantity: 182,
    bid: 5421,
    ask: 5428,
    bidQuantity: 590,
    askQuantity: 495,
  });
});

test('rejects a count or a batch outside the supported range', async () => {
  const wasm = await load();
  assert.equal(wasm.producer_init(0, 1), -1);
  assert.equal(wasm.producer_init(51, 1), -1);
  assert.equal(wasm.producer_init(1, 1), 0);
  assert.equal(wasm.producer_generate(0), 0);
  assert.equal(wasm.producer_generate(1001), 0);
  assert.equal(wasm.producer_generate(1000), 1000);
});
