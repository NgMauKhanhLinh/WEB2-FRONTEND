import {
  Component,
  computed,
  EventEmitter,
  HostListener,
  Input,
  OnChanges,
  Output,
  signal,
  SimpleChanges,
} from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { take } from 'rxjs';
import {
  DEFAULT_PRICING,
  PRICING_COLUMNS,
  PricingFilter,
  PricingGroup,
  PricingRow,
  ServicePricingService,
} from './service-pricing.service';

@Component({
  selector: 'app-service-pricing',
  standalone: true,
  imports: [],
  templateUrl: './service-pricing.html',
  styleUrl: './service-pricing.css',
})
export class ServicePricingComponent implements OnChanges {
  @Input() open = false;
  @Output() closed = new EventEmitter<void>();

  readonly filters: Array<{ value: PricingFilter; label: string }> = [
    { value: 'all', label: 'Tất cả' },
    { value: 'medical', label: 'Khám & Điều trị' },
    { value: 'grooming', label: 'Grooming & Spa' },
    { value: 'combo', label: 'Combo spa' },
  ];

  readonly selectedFilter = signal<PricingFilter>('all');
  readonly isLoading = signal(false);
  readonly errorMessage = signal('');
  private requestVersion = 0;
  private readonly pricing = signal(DEFAULT_PRICING);

  constructor(private readonly pricingService: ServicePricingService) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (!changes['open']) return;
    if (!this.open) {
      this.requestVersion++;
      return;
    }
    this.selectedFilter.set('all');
    this.errorMessage.set('');
    this.loadPricing();
  }

  readonly rows = computed(() => {
    const filter = this.selectedFilter();
    const pricing = this.pricing();
    if (filter !== 'all') return pricing[filter].rows;
    return [...pricing.medical.rows, ...pricing.grooming.rows, ...pricing.combo.rows];
  });
  readonly columns = computed(() => {
    const filter = this.selectedFilter();
    const pricing = this.pricing();
    if (filter !== 'all') {
      const columns = pricing[filter].columns;
      if (columns.length) return this.fillColumns(columns);
    }
    return PRICING_COLUMNS;
  });

  selectFilter(value: string): void {
    if (this.filters.some((filter) => filter.value === value)) {
      this.selectedFilter.set(value as PricingFilter);
    }
  }

  close(): void {
    this.closed.emit();
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.open) this.close();
  }

  private loadPricing(): void {
    const version = ++this.requestVersion;
    this.isLoading.set(true);
    this.pricingService
      .getPricingMatrix()
      .pipe(take(1))
      .subscribe({
        next: (pricing) => {
          if (version !== this.requestVersion || !this.open) return;
          this.pricing.set(this.mergePricing(pricing));
          this.isLoading.set(false);
        },
        error: (error: unknown) => {
          if (version !== this.requestVersion || !this.open) return;
          this.isLoading.set(false);
          this.errorMessage.set(this.getErrorMessage(error));
        },
      });
  }

  private mergePricing(pricing: typeof DEFAULT_PRICING): typeof DEFAULT_PRICING {
    return {
      medical: {
        columns: pricing.medical.columns,
        rows: pricing.medical.rows.length ? pricing.medical.rows : DEFAULT_PRICING.medical.rows,
      },
      grooming: {
        columns: pricing.grooming.columns,
        rows: pricing.grooming.rows.length ? pricing.grooming.rows : DEFAULT_PRICING.grooming.rows,
      },
      combo: {
        columns: pricing.combo.columns,
        rows: pricing.combo.rows.length ? pricing.combo.rows : DEFAULT_PRICING.combo.rows,
      },
    };
  }

  private getErrorMessage(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      if (error.status === 0) return 'Không thể kết nối tới máy chủ bảng giá.';
      const responseMessage = error.error?.EM || error.error?.message;
      if (typeof responseMessage === 'string' && responseMessage.trim()) return responseMessage;
      return error.message;
    }
    return error instanceof Error ? error.message : 'Không thể tải bảng giá dịch vụ.';
  }

  private fillColumns(columns: PricingGroup['columns']): PricingGroup['columns'] {
    return Array.from({ length: 9 }, (_, index) => columns[index] ?? PRICING_COLUMNS[index]);
  }
}
