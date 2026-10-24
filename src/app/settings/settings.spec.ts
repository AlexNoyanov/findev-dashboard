import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { describe, expect, it, vi } from 'vitest';

import { MarketService } from '../market/market.service';
import { DEFAULT_SETTINGS, ProducerPhase } from '../market/model';
import { Settings } from './settings';

describe('Settings page', () => {
  it('keeps edits local until apply, and refuses an invalid form', async () => {
    const market = {
      settings: signal(DEFAULT_SETTINGS),
      phase: signal<ProducerPhase>('paused'),
      apply: vi.fn(),
    };

    await TestBed.configureTestingModule({
      providers: [{ provide: MarketService, useValue: market }],
    }).compileComponents();

    const fixture = TestBed.createComponent(Settings);
    fixture.detectChanges();

    fixture.componentInstance.form.controls.instrumentCount.setValue(9);
    expect(market.apply).not.toHaveBeenCalled();

    submit(fixture);
    expect(market.apply).toHaveBeenCalledWith({ ...DEFAULT_SETTINGS, instrumentCount: 9 });

    market.apply.mockClear();
    fixture.componentInstance.form.controls.instrumentCount.setValue(0);
    submit(fixture);
    fixture.detectChanges();

    expect(market.apply).not.toHaveBeenCalled();
    expect(fixture.nativeElement.textContent).toContain('between 1 and 50');
  });
});

function submit(fixture: ComponentFixture<Settings>): void {
  const form = fixture.nativeElement.querySelector('form') as HTMLFormElement;
  form.dispatchEvent(new Event('submit'));
  fixture.detectChanges();
}
