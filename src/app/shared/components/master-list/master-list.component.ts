import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  OnDestroy,
  OnInit,
  Output,
  computed,
  input,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, Subscription, debounceTime, distinctUntilChanged } from 'rxjs';

export interface MasterListFilter {
  search: string;
  zone: string;
  activeOnly: boolean;
}

@Component({
  selector: 'app-master-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="panel" [style.--acc]="accentColor()">
      <!-- Header Row -->
      <div class="ph">
        <div class="ph-title-area">
          <h3>{{ title() }}</h3>
          <div class="sub">{{ subtitle() }}</div>
        </div>
        <div class="ph-actions">
          <ng-content select="[slot=actions]" />
        </div>
      </div>

      <!-- Filters Row -->
      <div class="filter-bar">
        <!-- Debounced Search Box -->
        <div class="search-wrap">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="search-icon">
            <circle cx="11" cy="11" r="8"/>
            <line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            type="search"
            class="filter-input"
            [placeholder]="searchPlaceholder()"
            [ngModel]="searchValue()"
            (ngModelChange)="onSearchInput($event)"
            [attr.aria-label]="searchPlaceholder()"
          />
        </div>

        <!-- Debounced Zone Filter Input -->
        <div class="zone-wrap">
          <input
            type="text"
            class="filter-input zone-input mono"
            placeholder="Filter by zone..."
            [ngModel]="zoneValue()"
            (ngModelChange)="onZoneInput($event)"
            aria-label="Filter by zone"
          />
        </div>

        <!-- Active Only Toggle -->
        <label class="active-toggle">
          <input
            type="checkbox"
            [checked]="activeOnlyValue()"
            (change)="onActiveOnlyChange($event)"
          />
          <span>Active only</span>
        </label>
      </div>

      <!-- Desktop Table View (>= 640px) -->
      <div class="table-container desktop-only">
        <table class="data-table">
          @if (headers().length > 0) {
            <thead>
              <tr>
                @for (h of headers(); track h) {
                  <th>{{ h }}</th>
                }
              </tr>
            </thead>
          }
          <tbody>
            <ng-content select="[slot=table-body]" />
          </tbody>
        </table>
      </div>

      <!-- Mobile Stacked Card View (< 640px) -->
      <div class="mobile-only mobile-card-list">
        <ng-content select="[slot=card-body]" />
      </div>

      <!-- Loading and Empty States -->
      @if (isLoading()) {
        <div class="state-box loading">
          <span class="spinner" aria-hidden="true"></span>
          <span>Loading records...</span>
        </div>
      } @else if (isEmpty()) {
        <div class="state-box empty">{{ emptyText() }}</div>
      }

      <!-- Pagination Footer Bar -->
      @if (!isEmpty() && totalCount() > 0) {
        <div class="pagination-bar">
          <div class="page-range">
            Showing <span class="mono">{{ rangeStart() }}</span>–<span class="mono">{{ rangeEnd() }}</span> of
            <span class="mono">{{ totalCount() }}</span> records
          </div>

          <div class="pagination-controls">
            <button
              type="button"
              class="btn s ghost page-btn"
              [disabled]="page() <= 1 || isLoading()"
              (click)="goToPage(page() - 1)"
              aria-label="Previous page"
            >
              ‹ Prev
            </button>

            <span class="page-indicator">
              Page <span class="mono">{{ page() }}</span> of <span class="mono">{{ totalPages() || 1 }}</span>
            </span>

            <button
              type="button"
              class="btn s ghost page-btn"
              [disabled]="page() >= totalPages() || isLoading()"
              (click)="goToPage(page() + 1)"
              aria-label="Next page"
            >
              Next ›
            </button>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    :host {
      display: block;
    }

    .ph-title-area {
      min-width: 0;
    }

    .filter-bar {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 12px;
      padding: 12px 18px;
      background: var(--bg);
      border-bottom: 1px solid var(--line);
    }

    .search-wrap {
      position: relative;
      display: flex;
      align-items: center;
      flex: 1;
      min-width: 200px;

      .search-icon {
        position: absolute;
        left: 10px;
        width: 14px;
        height: 14px;
        color: var(--faint);
        pointer-events: none;
      }

      input {
        width: 100%;
        padding-left: 32px;
      }
    }

    .zone-wrap {
      width: 160px;
      @media (max-width: 640px) {
        width: 100%;
      }
    }

    .filter-input {
      font-size: 13px;
      height: 36px;
      width: 100%;
    }

    .active-toggle {
      display: inline-flex;
      align-items: center;
      gap: 7px;
      font-size: 13px;
      font-weight: 500;
      color: var(--text);
      cursor: pointer;
      user-select: none;
      height: 36px;
    }

    .table-container {
      overflow-x: auto;
      width: 100%;
    }

    .data-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 12.8px;

      ::ng-deep th {
        text-align: left;
        padding: 9px 12px;
        background: color-mix(in srgb, var(--acc, var(--amber)) 10%, var(--bg));
        color: var(--dim);
        font-weight: 600;
        font-size: 11px;
        letter-spacing: 0.3px;
        white-space: nowrap;
        border-bottom: 1px solid var(--line);
      }

      ::ng-deep td {
        padding: 10px 12px;
        border-bottom: 1px solid var(--line);
        white-space: nowrap;
        color: var(--text);
      }

      ::ng-deep tbody tr {
        transition: background 0.15s ease;
        outline: none;

        &:hover, &:focus-visible {
          background: color-mix(in srgb, var(--acc, var(--amber)) 8%, var(--card));
        }

        &:last-child td {
          border-bottom: 0;
        }
      }
    }

    .state-box {
      padding: 32px 18px;
      text-align: center;
      color: var(--faint);
      font-size: 13px;

      &.loading {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
      }
    }

    .spinner {
      width: 14px;
      height: 14px;
      border: 2px solid rgba(232, 163, 61, 0.3);
      border-top-color: var(--amber);
      border-radius: 50%;
      animation: spin 0.7s linear infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    .pagination-bar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 12px;
      padding: 10px 18px;
      background: var(--card);
      border-top: 1px solid var(--line);
      font-size: 12px;
      color: var(--dim);
    }

    .pagination-controls {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .page-indicator {
      font-size: 12px;
      color: var(--dim);
    }

    .page-btn {
      min-width: 44px;
      min-height: 36px;
    }

    /* Responsive View Switches */
    .desktop-only {
      display: block;
    }

    .mobile-only {
      display: none;
    }

    @media (max-width: 640px) {
      .desktop-only {
        display: none !important;
      }

      .mobile-only {
        display: flex;
      }

      .mobile-card-list {
        flex-direction: column;
        gap: 10px;
        padding: 12px;
      }

      .filter-bar {
        padding: 12px;
        gap: 10px;

        .search-wrap,
        .zone-wrap {
          flex: 1 1 100%;
          width: 100%;
        }

        .filter-input {
          min-height: 44px;
        }

        .active-toggle {
          min-height: 44px;
        }
      }

      .pagination-bar {
        padding: 12px;
        flex-direction: column;
        align-items: stretch;
        text-align: center;

        .pagination-controls {
          justify-content: space-between;

          .page-btn {
            min-height: 44px;
            padding: 8px 16px;
          }
        }
      }
    }
  `],
})
export class MasterListComponent implements OnInit, OnDestroy {
  readonly title = input.required<string>();
  readonly subtitle = input<string>('');
  readonly accentColor = input<string>('var(--amber)');
  readonly headers = input<string[]>([]);
  readonly searchPlaceholder = input<string>('Search code or name...');

  // Pagination inputs
  readonly page = input<number>(1);
  readonly pageSize = input<number>(20);
  readonly totalCount = input<number>(0);
  readonly totalPages = input<number>(1);
  readonly isLoading = input<boolean>(false);
  readonly isEmpty = input<boolean>(false);
  readonly emptyText = input<string>('No records found.');

  @Output() readonly filterChange = new EventEmitter<MasterListFilter>();
  @Output() readonly pageChange = new EventEmitter<number>();

  readonly searchValue = signal<string>('');
  readonly zoneValue = signal<string>('');
  readonly activeOnlyValue = signal<boolean>(false);

  private readonly searchSubject = new Subject<string>();
  private readonly zoneSubject = new Subject<string>();
  private subscription = new Subscription();

  readonly rangeStart = computed(() => {
    if (this.totalCount() === 0) return 0;
    return (this.page() - 1) * this.pageSize() + 1;
  });

  readonly rangeEnd = computed(() => {
    return Math.min(this.page() * this.pageSize(), this.totalCount());
  });

  ngOnInit(): void {
    // Debounce search input by 300ms
    this.subscription.add(
      this.searchSubject
        .pipe(debounceTime(300), distinctUntilChanged())
        .subscribe((search) => {
          this.searchValue.set(search);
          this.emitFilterChange();
        }),
    );

    // Debounce zone input by 300ms
    this.subscription.add(
      this.zoneSubject
        .pipe(debounceTime(300), distinctUntilChanged())
        .subscribe((zone) => {
          this.zoneValue.set(zone);
          this.emitFilterChange();
        }),
    );
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }

  onSearchInput(value: string): void {
    this.searchSubject.next(value);
  }

  onZoneInput(value: string): void {
    this.zoneSubject.next(value);
  }

  onActiveOnlyChange(event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    this.activeOnlyValue.set(checked);
    this.emitFilterChange();
  }

  goToPage(newPage: number): void {
    if (newPage < 1 || newPage > this.totalPages() || newPage === this.page()) return;
    this.pageChange.emit(newPage);
  }

  private emitFilterChange(): void {
    this.filterChange.emit({
      search: this.searchValue(),
      zone: this.zoneValue(),
      activeOnly: this.activeOnlyValue(),
    });
  }
}
