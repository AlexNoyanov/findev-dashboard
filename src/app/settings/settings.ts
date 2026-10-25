import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
} from '@angular/forms';
import { map, startWith } from 'rxjs';

import { formatDraftRate, formatPhase, formatUpdatesPerSecond } from '../market/format';
import { MarketService } from '../market/market.service';
import { LIMITS, parseSettings, SettingsDraft } from '../market/model';

@Component({
  selector: 'app-settings',
  imports: [ReactiveFormsModule],
  templateUrl: './settings.html',
  styleUrl: './settings.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Settings {
  private readonly market = inject(MarketService);
  private readonly formBuilder = inject(FormBuilder);

  protected readonly limits = LIMITS;
  protected readonly applied = this.market.settings;
  protected readonly notice = signal<string | null>(null);

  readonly form = this.formBuilder.group(
    {
      instrumentCount: this.formBuilder.control<number | null>(this.applied().instrumentCount),
      updatesPerBatch: this.formBuilder.control<number | null>(this.applied().updatesPerBatch),
      batchIntervalMs: this.formBuilder.control<number | null>(this.applied().batchIntervalMs),
    },
    { validators: validateSettingsGroup },
  );

  protected readonly draftRate = toSignal(
    this.form.valueChanges.pipe(
      map(() => formatDraftRate(this.form.getRawValue())),
      startWith(formatDraftRate(this.form.getRawValue())),
    ),
    { initialValue: formatDraftRate(this.form.getRawValue()) },
  );

  protected readonly activeSummary = computed(() => {
    const settings = this.applied();
    return `${formatPhase(this.market.phase())} · ${settings.instrumentCount} instruments · ${settings.updatesPerBatch} updates / ${settings.batchIntervalMs} ms · ${formatUpdatesPerSecond(settings)}`;
  });

  constructor() {
    this.form.valueChanges.pipe(takeUntilDestroyed()).subscribe(() => this.notice.set(null));
  }

  protected errorId(
    key: 'instrumentCount' | 'updatesPerBatch' | 'batchIntervalMs',
    id: string,
  ): string | null {
    return this.form.controls[key].touched && this.form.hasError(key) ? id : null;
  }

  protected apply(): void {
    this.form.markAllAsTouched();
    const parsed = parseSettings(this.form.getRawValue());
    if (!parsed.ok) return;
    this.market.apply(parsed.value);
    this.notice.set('Restarted.');
  }
}

function validateSettingsGroup(control: AbstractControl): ValidationErrors | null {
  const parsed = parseSettings(control.value as SettingsDraft);
  return parsed.ok ? null : parsed.errors;
}
