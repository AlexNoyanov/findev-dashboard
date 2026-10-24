import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';

import { formatImbalance, formatPriceCents, formatVolume } from '../market/format';
import { MarketService } from '../market/market.service';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Dashboard {
  protected readonly market = inject(MarketService);
  protected readonly formatPriceCents = formatPriceCents;
  protected readonly formatVolume = formatVolume;
  protected readonly formatImbalance = formatImbalance;
  protected readonly batchesLabel = computed(() => {
    const count = this.market.batches();
    return `${formatVolume(count)} ${count === 1 ? 'batch' : 'batches'}`;
  });

  protected direction(value: number | null): 'up' | 'down' | 'flat' {
    if (value === null || value === 0) return 'flat';
    return value > 0 ? 'up' : 'down';
  }
}
