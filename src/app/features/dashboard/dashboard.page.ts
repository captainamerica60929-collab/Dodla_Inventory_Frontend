import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  OnDestroy,
  computed,
  inject,
  signal,
} from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { PillComponent } from '../../shared/components/pill/pill.component';
import { StatCardComponent } from '../../shared/components/stat-card/stat-card.component';
import { DataTableComponent } from '../../shared/components/data-table/data-table.component';
import { BinBarComponent } from '../../shared/components/bin-bar/bin-bar.component';
import {
  DashboardLiveMetricsDto,
  DashboardRecentMovementDto,
  DashboardZoneOccupancyDto,
  ReportService,
} from '../../core/api/report.service';
import { SessionService } from '../../core/session/session.service';
import { NotificationService } from '../../core/services/notification.service';
import { TourService } from '../../core/tour/tour.service';
import { TourDefinition } from '../../core/tour/tour.types';

@Component({
  selector: 'app-dashboard-page',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    DatePipe,
    PillComponent,
    StatCardComponent,
    DataTableComponent,
    BinBarComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="dashboard enter">
      <!-- Hero header banner matching prototype -->
      <div class="hero">
        <div class="hero-top">
          <div>
            <h2>Warehouse Operations Overview</h2>
            <p>Live inventory tracking, FIFO enforcement, and location bin capacity.</p>
          </div>
          <div class="refresh-controls" data-tour="dashboard-refresh-btn">
            <button
              type="button"
              class="refresh-btn"
              (click)="refreshLiveMetrics()"
              [disabled]="isLoading()"
              title="Refresh Live Metrics"
            >
              <svg
                [class.spinning]="isLoading()"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              >
                <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2" />
              </svg>
              <span>{{ isLoading() ? 'Syncing...' : 'Live Sync' }}</span>
            </button>
            <span class="last-updated">Updated: {{ lastUpdatedText() }}</span>
          </div>
        </div>

        <div class="qa">
          <a class="qa-btn" routerLink="/transactions/inward">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 3v12M7 10l5 5 5-5M4 20h16"/>
            </svg>
            <span>Scan Inward</span>
          </a>
          <a class="qa-btn" routerLink="/transactions/outward">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 21V9M7 14l5-5 5 5M4 4h16"/>
            </svg>
            <span>Outward FIFO</span>
          </a>
          <a class="qa-btn" routerLink="/transactions/transfer">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M7 7h13M16 3l4 4-4 4M17 17H4M8 13l-4 4 4 4"/>
            </svg>
            <span>Transfer Bin</span>
          </a>
          <a class="qa-btn" routerLink="/reports">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M4 20V10 M10 20V4 M16 20v-8 M22 20H2"/>
            </svg>
            <span>Reports Hub</span>
          </a>
        </div>
      </div>

      <!-- Real-Time KPI Stat Cards Grid -->
      <div class="sg" data-tour="dashboard-metrics">
        <app-stat-card
          label="Registered Items"
          [value]="liveMetrics().totalRegisteredItems"
          sub="Total tags printed & tracked"
          color="#2E6BA6"
          icon='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 3h9l4 4v14H6z M14 3v5h5"/></svg>'
        />
        <app-stat-card
          label="Pending Inward"
          [value]="liveMetrics().pendingInwardItems"
          sub="Awaiting putaway placement"
          color="#E8A33D"
          icon='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 3v12M7 10l5 5 5-5M4 20h16"/></svg>'
        />
        <app-stat-card
          label="In-Stock Balance"
          [value]="liveMetrics().totalInStockItems"
          sub="Active inventory units in bins"
          color="#2F6F4E"
          icon='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 8l-9-5-9 5v8l9 5 9-5z M3 8l9 5 9-5 M12 13v8"/></svg>'
        />
        <app-stat-card
          label="Claimed / Rejections"
          [value]="liveMetrics().totalClaimedRejected"
          sub="Non-conformance items logged"
          color="#C1443D"
          icon='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>'
        />
      </div>

      <!-- Two column grid -->
      <div class="g2">
        <!-- Recent Stock Activity Stream -->
        <div class="panel" style="--acc: var(--amber);">
          <div class="ph">
            <div>
              <h3>Recent Stock Activity Stream</h3>
              <div class="sub">Audited warehouse transactions in real-time</div>
            </div>
            <a routerLink="/transactions/inward" class="btn s">View Putaway</a>
          </div>
          <app-data-table
            [headers]="['Tag Sticker', 'Material', 'Movement Type', 'Qty', 'Location', 'Timestamp', 'Operator']"
            [isEmpty]="(liveMetrics().recentMovements?.length ?? 0) === 0"
            emptyText="No recent stock activity logged."
          >
            @for (m of liveMetrics().recentMovements ?? []; track m.id) {
              <tr>
                <td class="mono font-bold">{{ m.tagNo }}</td>
                <td><b>{{ m.materialCode }}</b> ({{ m.partName }})</td>
                <td>
                  @if (m.movementType === 'Inward') {
                    <app-pill variant="Inwarded" text="Inward" />
                  } @else if (m.movementType === 'Outward') {
                    <app-pill variant="Issued" text="Outward" />
                  } @else if (m.movementType === 'Transfer') {
                    <app-pill variant="Inwarded" text="Transfer" />
                  } @else if (m.movementType === 'Reject') {
                    <app-pill variant="red" text="Rejected" />
                  } @else {
                    <app-pill variant="green" text="Accepted" />
                  }
                </td>
                <td class="mono font-bold" [class.text-success]="m.movementType === 'Inward'" [class.text-amber]="m.movementType === 'Outward'">
                  {{ m.movementType === 'Inward' ? '+' : (m.movementType === 'Outward' ? '-' : '') }}{{ m.qty }}
                </td>
                <td class="mono font-bold text-amber">{{ m.locationCode || '—' }}</td>
                <td>{{ m.timestamp | date: 'hh:mm a, dd MMM' }}</td>
                <td>{{ m.userName }}</td>
              </tr>
            }
          </app-data-table>
        </div>

        <!-- Bin & Zone Capacity Utilization -->
        <div class="panel" style="--acc: var(--blue);">
          <div class="ph">
            <div>
              <h3>Zone Capacity Utilization</h3>
              <div class="sub">Live branch storage occupancy breakdown</div>
            </div>
          </div>
          <div class="pb">
            @for (z of liveMetrics().zoneOccupancy ?? []; track z.zone) {
              <app-bin-bar
                [label]="z.zone"
                [used]="z.usedQty"
                [capacity]="z.capacity"
                [showRow]="true"
              />
            }
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
      }

      .enter > * {
        animation: rise 0.5s cubic-bezier(0.2, 0.8, 0.2, 1) both;
      }
      .enter > *:nth-child(2) {
        animation-delay: 0.06s;
      }
      .enter > *:nth-child(3) {
        animation-delay: 0.12s;
      }

      .hero {
        border-radius: var(--radius-2xl, 12px);
        padding: 22px 24px;
        color: #ffffff;
        background: linear-gradient(120deg, #1b2430 0%, #2e6ba6 42%, #6b4fa3 72%, #c67f1f 115%);
        background-size: 220% 220%;
        animation: flow 14s ease infinite;
        margin-bottom: 18px;

        .hero-top {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 16px;
          flex-wrap: wrap;
        }

        h2 {
          font-size: 22px;
          font-weight: 800;
        }

        p {
          opacity: 0.85;
          font-size: 13px;
          margin: 2px 0 16px;
        }

        .refresh-controls {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 4px;

          .refresh-btn {
            background: rgba(255, 255, 255, 0.18);
            border: 1px solid rgba(255, 255, 255, 0.25);
            border-radius: var(--radius-md);
            color: #ffffff;
            font-size: 12px;
            font-weight: 600;
            padding: 6px 12px;
            display: inline-flex;
            align-items: center;
            gap: 6px;
            cursor: pointer;
            min-height: 44px;
            min-width: 110px;
            justify-content: center;
            transition: all 0.2s ease;

            &:hover:not(:disabled) {
              background: rgba(255, 255, 255, 0.28);
              transform: translateY(-1px);
            }

            svg {
              width: 14px;
              height: 14px;

              &.spinning {
                animation: spin 0.8s linear infinite;
              }
            }
          }

          .last-updated {
            font-size: 10.5px;
            opacity: 0.75;
          }
        }
      }

      .qa {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
        gap: 10px;

        .qa-btn {
          border: 0;
          border-radius: var(--radius-xl, 10px);
          padding: 12px 14px;
          color: #ffffff;
          font-weight: 700;
          text-align: left;
          display: flex;
          gap: 10px;
          align-items: center;
          background: rgba(255, 255, 255, 0.16);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.25);
          transition: transform 0.15s ease, box-shadow 0.15s ease, background 0.15s ease;
          text-decoration: none;
          min-height: 44px;

          &:hover {
            transform: translateY(-3px);
            background: rgba(255, 255, 255, 0.25);
            box-shadow: 0 10px 22px rgba(0, 0, 0, 0.35);
          }

          svg {
            width: 20px;
            height: 20px;
            flex-shrink: 0;
          }
        }
      }

      .sg {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 14px;
        margin-bottom: 18px;
      }

      .g2 {
        display: grid;
        grid-template-columns: 1.25fr 0.75fr;
        gap: 16px;
      }

      .text-success {
        color: var(--green);
      }

      .text-amber {
        color: var(--amber);
      }

      .font-bold {
        font-weight: 700;
      }

      @keyframes spin {
        to {
          transform: rotate(360deg);
        }
      }

      @media (max-width: 900px) {
        .sg {
          grid-template-columns: repeat(2, 1fr);
        }

        .g2 {
          grid-template-columns: 1fr;
        }

        .hero .hero-top {
          flex-direction: column;

          .refresh-controls {
            align-items: flex-start;
          }
        }
      }
    `,
  ],
})
export class DashboardPageComponent implements OnInit, OnDestroy {
  private readonly reportService = inject(ReportService);
  private readonly sessionService = inject(SessionService);
  private readonly notificationService = inject(NotificationService);
  private readonly tourService = inject(TourService);
  private readonly destroyRef = inject(DestroyRef);

  readonly isLoading = signal<boolean>(false);
  readonly lastUpdated = signal<Date>(new Date());

  readonly liveMetrics = signal<DashboardLiveMetricsDto>({
    totalRegisteredItems: 1420,
    pendingInwardItems: 28,
    totalInStockItems: 1250,
    totalClaimedRejected: 14,
    activeAlertsCount: 2,
    recentMovements: [],
    zoneOccupancy: [],
  });

  readonly lastUpdatedText = computed(() => {
    const d = this.lastUpdated();
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  });

  private refreshIntervalId: any = null;

  private readonly dashboardTourDef: TourDefinition = {
    id: 'dashboard-tour',
    version: 1,
    roles: ['Admin', 'StoreKeeper', 'Operator', 'Viewer'],
    steps: [
      {
        element: '[data-tour="dashboard-metrics"]',
        title: 'Real-Time Warehouse Metrics',
        description:
          'Monitor registered items, pending inward putaway, live in-stock balances, and non-conformance rejections.',
        side: 'bottom',
      },
      {
        element: '[data-tour="dashboard-refresh-btn"]',
        title: 'Live Sync Trigger',
        description:
          'Click to instantly sync live warehouse metrics or let the system auto-refresh periodically.',
        side: 'bottom',
      },
    ],
  };

  ngOnInit(): void {
    this.tourService.registerCurrentTour(this.dashboardTourDef);
    this.refreshLiveMetrics();

    // Auto-refresh every 30 seconds
    if (typeof window !== 'undefined') {
      this.refreshIntervalId = setInterval(() => {
        this.refreshLiveMetrics(true);
      }, 30000);
    }
  }

  ngOnDestroy(): void {
    this.tourService.registerCurrentTour(null);
    if (this.refreshIntervalId) {
      clearInterval(this.refreshIntervalId);
    }
  }

  refreshLiveMetrics(isAuto = false): void {
    this.isLoading.set(true);
    const branchId = this.sessionService.branch()?.id ? Number(this.sessionService.branch()?.id) : undefined;

    this.reportService
      .getDashboardLive(branchId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          this.liveMetrics.set({
            ...res,
            recentMovements: res?.recentMovements ?? [],
            zoneOccupancy: res?.zoneOccupancy ?? [],
          });
          this.lastUpdated.set(new Date());
          this.isLoading.set(false);
          if (!isAuto) {
            this.notificationService.showSuccess('Live Sync Complete', 'Dashboard metrics synchronized.');
          }
        },
        error: () => {
          this.isLoading.set(false);
          if (!isAuto) {
            this.notificationService.showError('Sync Error', 'Failed to update live metrics.');
          }
        },
      });
  }
}
