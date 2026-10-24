export interface ProducerSettings {
  instrumentCount: number;
  updatesPerBatch: number;
  batchIntervalMs: number;
}

export const DEFAULT_SETTINGS: ProducerSettings = {
  instrumentCount: 5,
  updatesPerBatch: 100,
  batchIntervalMs: 500,
};

export const SYMBOLS = [
  'ALFA',
  'BETA',
  'GAMMA',
  'DELTA',
  'EPSIL',
  'ZETA',
  'THETA',
  'IOTA',
  'KAPPA',
  'LAMBDA',
  'SIGMA',
  'OMEGA',
  'AURUM',
  'ARGNT',
  'NICKL',
  'COBALT',
  'PLAT',
  'PALLAD',
  'ZINC',
  'COPPER',
  'HELI',
  'NEON',
  'ARGON',
  'KRYPT',
  'XENON',
  'LITH',
  'SODM',
  'MAGN',
  'CALC',
  'TITAN',
  'VANAD',
  'CHROM',
  'MANG',
  'FERR',
  'GALL',
  'GERM',
  'ARSEN',
  'SELEN',
  'BROMI',
  'STRNT',
  'YTTR',
  'ZIRC',
  'NIOB',
  'MOLY',
  'TECH',
  'RUTH',
  'RHOD',
  'CADM',
  'INDI',
  'TIN',
] as const;

export const LIMITS = {
  instrumentCount: { min: 1, max: SYMBOLS.length },
  updatesPerBatch: { min: 1, max: 1000 },
  batchIntervalMs: { min: 50, max: 2000 },
} as const;

export type ProducerPhase = 'starting' | 'running' | 'paused' | 'error';

export interface MarketUpdate {
  instrumentIndex: number;
  priceCents: number;
  tradeQuantity: number;
  bidCents: number;
  askCents: number;
  bidQuantity: number;
  askQuantity: number;
}

export interface InstrumentRow {
  symbol: string;
  lastPriceCents: number | null;
  spreadCents: number | null;
  volume: number;
  /** Null when the instrument has not traded. Fractional cents are allowed. */
  vwapCents: number | null;
  /** Null when the latest book has no size on either side. */
  imbalance: number | null;
}

export interface SettingsDraft {
  instrumentCount: unknown;
  updatesPerBatch: unknown;
  batchIntervalMs: unknown;
}

export type SettingsErrors = Partial<Record<keyof ProducerSettings, string>>;

export type ParsedSettings =
  { ok: true; value: ProducerSettings } | { ok: false; errors: SettingsErrors };

export function symbolAt(index: number): string {
  if (!Number.isInteger(index) || index < 0 || index >= SYMBOLS.length) {
    throw new Error(`No symbol for instrument ${index}`);
  }
  return SYMBOLS[index];
}

export function updatesPerSecond(settings: ProducerSettings): number {
  return (settings.updatesPerBatch / settings.batchIntervalMs) * 1000;
}

export function parseSettings(draft: SettingsDraft): ParsedSettings {
  const errors: SettingsErrors = {};
  const instrumentCount = readField(
    draft.instrumentCount,
    'Instrument count',
    LIMITS.instrumentCount,
    errors,
    'instrumentCount',
  );
  const updatesPerBatch = readField(
    draft.updatesPerBatch,
    'Updates per batch',
    LIMITS.updatesPerBatch,
    errors,
    'updatesPerBatch',
  );
  const batchIntervalMs = readField(
    draft.batchIntervalMs,
    'Batch interval',
    LIMITS.batchIntervalMs,
    errors,
    'batchIntervalMs',
  );

  if (instrumentCount === null || updatesPerBatch === null || batchIntervalMs === null) {
    return { ok: false, errors };
  }

  return { ok: true, value: { instrumentCount, updatesPerBatch, batchIntervalMs } };
}

function readField(
  value: unknown,
  label: string,
  range: { min: number; max: number },
  errors: SettingsErrors,
  key: keyof ProducerSettings,
): number | null {
  const parsed = readWholeNumber(value);
  if (parsed === null) {
    errors[key] = `${label} must be a whole number.`;
    return null;
  }
  if (parsed < range.min || parsed > range.max) {
    errors[key] = `${label} must be between ${range.min} and ${range.max}.`;
    return null;
  }
  return parsed;
}

function readWholeNumber(value: unknown): number | null {
  if (typeof value === 'string') {
    if (!/^\d+$/.test(value)) return null;
    return readWholeNumber(Number(value));
  }
  if (typeof value !== 'number' || !Number.isSafeInteger(value)) return null;
  return value;
}
