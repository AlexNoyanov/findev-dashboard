/**
 * Quote walk in cents. An update nudges one instrument's mid, then prints
 * the trade at the new bid or the new ask. No matching.
 *
 * Seven u32s: instrument, price, qty, bid, ask, bid qty, ask qty.
 * producer_init drops the previous book.
 */

const MAX_INSTRUMENTS: i32 = 50;
const MAX_BATCH: i32 = 1000;
const STRIDE: i32 = 7;

const SHOCK_SPAN: u32 = 7; // 0..6 becomes -3..+3 cents
const MAX_SPREAD: u32 = 12; // spread is 1..12 cents
const MAX_TRADE_QTY: u32 = 250; // trade quantity is 1..250
const BOOK_QTY_SPAN: u32 = 1001; // book quantity is 0..1000

let instrumentCount: i32 = 0;
let rng: u64 = 1;

const bids = new StaticArray<u32>(50);
const asks = new StaticArray<u32>(50);
const output = new StaticArray<u32>(7000);

function nextU32(): u32 {
  let x: u64 = rng;
  x ^= x << 13;
  x ^= x >> 7;
  x ^= x << 17;
  if (x == (0 as u64)) {
    x = 1;
  }
  rng = x;
  return (x >> 32) as u32;
}

function openingBid(index: i32): u32 {
  // $50.00, then $4.25 higher for each following instrument, so the tape
  // does not open as five copies of the same price.
  return (5000 as u32) + (index as u32) * (425 as u32);
}

export function producer_init(count: i32, seed: u32): i32 {
  if (count < 1 || count > MAX_INSTRUMENTS) {
    instrumentCount = 0;
    return -1;
  }

  instrumentCount = count;
  // The low bit stays on, so a seed of 0 still walks.
  rng = ((seed as u64) << 1) | (1 as u64);

  for (let index: i32 = 0; index < count; index++) {
    const bid = openingBid(index);
    bids[index] = bid;
    asks[index] = bid + 4;
  }
  return 0;
}

export function producer_output_ptr(): usize {
  // StaticArray's pointer is the first element. The object header sits before it.
  return changetype<usize>(output);
}

export function producer_generate(batchSize: i32): i32 {
  if (instrumentCount < 1 || batchSize < 1 || batchSize > MAX_BATCH) {
    return 0;
  }

  for (let step: i32 = 0; step < batchSize; step++) {
    const index = (nextU32() % (instrumentCount as u32)) as i32;
    let mid =
      (((bids[index] + asks[index]) / 2) as i32) + ((nextU32() % SHOCK_SPAN) as i32) - 3;
    if (mid < 50) mid = 50;
    if (mid > 500000) mid = 500000;

    const spread = (1 + (nextU32() % MAX_SPREAD)) as i32;
    let bid = mid - spread / 2;
    if (bid < 1) bid = 1;
    const ask = bid + spread;

    bids[index] = bid as u32;
    asks[index] = ask as u32;

    const takeAsk = (nextU32() & 1) == 1;
    const price: u32 = takeAsk ? asks[index] : bids[index];
    const tradeQty = 1 + (nextU32() % MAX_TRADE_QTY);
    const bidQty = nextU32() % BOOK_QTY_SPAN;
    const askQty = nextU32() % BOOK_QTY_SPAN;
    const offset = step * STRIDE;

    output[offset] = index as u32;
    output[offset + 1] = price;
    output[offset + 2] = tradeQty;
    output[offset + 3] = bids[index];
    output[offset + 4] = asks[index];
    output[offset + 5] = bidQty;
    output[offset + 6] = askQty;
  }

  return batchSize;
}
