import {
  ProducerPhase,
  ProducerSettings,
  updatesPerSecond,
  type SettingsDraft,
  parseSettings,
} from './model';

const currency = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
});

const imbalanceFormat = new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
  signDisplay: 'exceptZero',
});

const units = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 });
const tenths = new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

export const UNAVAILABLE = '—';

export function formatPriceCents(cents: number | null): string {
  if (cents === null || !Number.isFinite(cents)) return UNAVAILABLE;
  return currency.format(cents / 100);
}

export function formatImbalance(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return UNAVAILABLE;
  return imbalanceFormat.format(value);
}

export function formatVolume(volume: number): string {
  return units.format(volume);
}

export function formatUpdatesPerSecond(settings: ProducerSettings): string {
  const rounded = Math.round(updatesPerSecond(settings) * 10) / 10;
  const text = Number.isInteger(rounded) ? units.format(rounded) : tenths.format(rounded);
  return `${text} updates/s`;
}

export function formatDraftRate(draft: SettingsDraft): string {
  const parsed = parseSettings(draft);
  return parsed.ok ? formatUpdatesPerSecond(parsed.value) : UNAVAILABLE;
}

export function formatPhase(phase: ProducerPhase): string {
  switch (phase) {
    case 'starting':
      return 'Starting';
    case 'running':
      return 'Running';
    case 'paused':
      return 'Paused';
    case 'error':
      return 'Error';
  }
}

export function formatStatus(input: {
  phase: ProducerPhase;
  settings: ProducerSettings;
  updates: number;
}): string {
  if (input.phase === 'starting' || input.phase === 'error') {
    return formatPhase(input.phase);
  }
  return `${formatPhase(input.phase)} · ${input.settings.instrumentCount} instruments · ${formatUpdatesPerSecond(input.settings)} · ${formatVolume(input.updates)} updates`;
}
