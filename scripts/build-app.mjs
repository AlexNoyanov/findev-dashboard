import { spawnSync } from 'node:child_process';
import { copyFileSync } from 'node:fs';

const wasm = spawnSync(process.execPath, ['scripts/build-wasm.mjs'], { stdio: 'inherit' });
if (wasm.status !== 0) process.exit(wasm.status ?? 1);

const baseHref = process.env.BASE_HREF ?? '/';
const ng = spawnSync('node_modules/.bin/ng', ['build', '--base-href', baseHref], {
  stdio: 'inherit',
});
if (ng.status !== 0) process.exit(ng.status ?? 1);

// GitHub Pages serves this for unknown paths, so a refresh on /settings
// still boots the Angular app.
copyFileSync('dist/findev-dashboard/browser/index.html', 'dist/findev-dashboard/browser/404.html');
