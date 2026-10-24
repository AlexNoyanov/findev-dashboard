# Market tape

A small Angular desk for simulated instruments. A WebAssembly module generates trades and quotes. A Web Worker folds those trades into last price, spread, volume, VWAP, and order-book imbalance. The page only paints a snapshot.

Prices are integer cents inside the producer. Currency rounding happens in the formatter, and only there.

## Run

```bash
npm install
npm start
```

Open http://localhost:4200. The dashboard is the tape. Settings edits the producer and does nothing until **Apply and restart**.

`npm start` compiles `assembly/producer.ts` first. After a change to that file, start the dev server again.

## Test

```bash
npm test
```

That compiles the producer, runs the Angular unit tests, then executes the Wasm module in Node. `npm run test:unit` and `npm run test:wasm` run the two halves on their own.

## Build

```bash
npm run build
```

Output: `dist/findev-dashboard/browser`. GitHub Actions sets `BASE_HREF` to `/<repository>/` so the same build works as a project site.

## How it is put together

| Piece              | Where                                  | Job                                                                  |
| ------------------ | -------------------------------------- | -------------------------------------------------------------------- |
| Quote walk and RNG | `assembly/producer.ts`                 | Stateful generator. This is the Wasm.                                |
| Batch layout       | `src/app/market/wasm-producer.ts`      | Copies seven `u32`s out of Wasm memory.                              |
| Metrics            | `src/app/market/book.ts`               | Cumulative volume and VWAP. No trade log.                            |
| Run lifecycle      | `src/app/market/session.ts`, `desk.ts` | Pause, resume, and rejection of a stale run.                         |
| Worker             | `src/app/market/market.worker.ts`      | Owns the timer and the module. Paints about 10 times a second.       |
| Pages              | `dashboard/`, `settings/`              | One root `MarketService`, so routing does not start a second worker. |

The worker applies every trade before it decides whether to paint. A slower table does not drop volume.

Pause clears the timer. Resume starts it again and does not emit the batches that would have fallen inside the gap. Apply replaces the run id, resets the book, and starts generation even if the previous run was paused. A snapshot whose run id or command sequence does not match the desk is ignored, so a batch already in flight cannot write over the new run.

## Price model

Each instrument opens at $50.00 plus $4.25 per index, with a 4 cent spread. An update:

1. Picks an instrument from the xorshift state. The same name can appear twice in one batch.
2. Moves the mid by −3 to +3 cents and clamps it.
3. Draws a spread of 1 to 12 cents, with the bid strictly below the ask.
4. Prints the trade at that update's bid or ask. Trade size is 1 to 250. Book sizes are 0 to 1000 and do not count as volume.

`producer_init` replaces the book. The same seed replays the same batches. The pinned first update for seed 42 lives in `assembly/producer.test.mjs`.

The only JavaScript import is `env.abort`, and it only runs when a bounds check fails.

## Deploy

The workflow in `.github/workflows/deploy.yml` tests and publishes GitHub Pages on every push to `main`.

Once, in the repository settings: **Pages → Build and deployment → Source: GitHub Actions**. The first successful run prints the site URL.

For Cloudflare Pages instead, use build command `npm run build`, output directory `dist/findev-dashboard/browser`, and leave `BASE_HREF` unset so the base stays `/`.
