import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

import { formatStatus } from './market/format';
import { MarketService } from './market/market.service';

@Component({
  selector: 'app-root',
  imports: [RouterLink, RouterLinkActive, RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {
  protected readonly market = inject(MarketService);

  protected readonly statusText = computed(() =>
    formatStatus({
      phase: this.market.phase(),
      settings: this.market.settings(),
      updates: this.market.updates(),
    }),
  );

  protected readonly pauseLabel = computed(() =>
    this.market.phase() === 'paused' ? 'Resume' : 'Pause',
  );

  protected readonly pauseDisabled = computed(() => {
    const phase = this.market.phase();
    return phase === 'starting' || phase === 'error';
  });

  protected toggle(): void {
    if (this.market.phase() === 'paused') this.market.resume();
    else this.market.pause();
  }
}
