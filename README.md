# Market tape

Angular desk over an AssemblyScript producer. The module walks quotes and emits trades. The worker folds them into last, spread, volume, VWAP, and imbalance. The table paints a snapshot, about ten times a second.

Prices stay in integer cents until `format.ts`.

## Run

```bash
npm install
npm start
```

http://localhost:4200

`npm start` compiles `assembly/producer.ts` before `ng serve`. Restart after changing that file.

## Test

```bash
npm test
```

That builds the module, runs the Angular unit tests, then executes the wasm in Node. `npm run test:unit` and `npm run test:wasm` are the two halves.

## Build

```bash
npm run build
```

Output is `dist/findev-dashboard/browser`. The script also copies `index.html` to `404.html`, so a refresh on `/settings` still loads the app on GitHub Pages. Actions sets `BASE_HREF` to `/<repository>/`.

## Where things live

The generator is `assembly/producer.ts`. `wasm-producer.ts` copies seven `u32`s out of its memory. `book.ts` keeps cumulative volume and VWAP and does not store the trades. `session.ts` and `desk.ts` own pause, resume, and which snapshot is still current. `market.worker.ts` owns the timer. Both pages read one root `MarketService`.

Apply replaces the run id, clears the book, and starts generation even if the desk was paused. Pause clears the interval. Resume does not emit the batches that would have landed in the gap. A snapshot with a different run id or command sequence is ignored.

Each name opens at $50.00 plus $4.25 per index, spread 4 cents, so the tape is not five copies of one price. From there the mid moves by a few cents. The same seed replays. The first update for seed 42 is pinned in `assembly/producer.test.mjs`.

The module's only import is `env.abort`.

## Deploy

`.github/workflows/deploy.yml` tests and publishes GitHub Pages on every push to `main`.

Once, on the repository: **Pages → Build and deployment → Source: GitHub Actions**. The first green run prints the URL.

Cloudflare Pages: build command `npm run build`, output `dist/findev-dashboard/browser`, and leave `BASE_HREF` unset.
