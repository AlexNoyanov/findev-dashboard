import { spawnSync } from 'node:child_process';

const result = spawnSync(
  'node_modules/.bin/asc',
  [
    'assembly/producer.ts',
    '--outFile',
    'public/market-producer.wasm',
    '--optimize',
    '--runtime',
    'stub',
    '--initialMemory',
    '2',
  ],
  { stdio: 'inherit' },
);

if (result.error) {
  console.error(result.error.message);
  process.exit(1);
}

process.exit(result.status ?? 1);
