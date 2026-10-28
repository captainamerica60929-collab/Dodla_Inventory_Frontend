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
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DataTableComponent } from '../../shared/components/data-table/data-table.component';
import { PillComponent } from '../../shared/components/pill/pill.component';
import {
  AcceptRejectReportItemDto,
  InStockReportItemDto,
  InwardReportItemDto,
  LabelScanReportItemDto,
  LocationTransferReportItemDto,
  OutwardReportItemDto,
  OverallSummaryReportItemDto,
  ReportService,
} from '../../core/api/report.service';
import { BranchDto, BranchService } from '../../core/api/branch.service';
import { SessionService } from '../../core/session/session.service';
import { NotificationService } from '../../core/services/notification.service';
import { TourService } from '../../core/tour/tour.service';
import { TourDefinition } from '../../core/tour/tour.types';

export type ReportTabId =
  | 'inward'
  | 'outward'
  | 'in-stock'
  | 'label-scan'
  | 'overall'
  | 'accept-reject'
  | 'location-transfer';

export interface TabDef {
  id: ReportTabId;
  label: string;
  icon: string;
  description: string;
}

@Component({
  selector: 'app-reports-page',
  standalone: true,
  imports: [CommonModule, FormsModule, DatePipe, DataTableComponent, PillComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="reports-container">
      <!-- Top Header Panel -->
      <div class="panel" style="--acc: var(--purple);" data-tour="reports-nav">
        <div class="ph">
          <div>
            <h3>Warehouse Reports & Analytics</h3>
            <div class="sub">
              Live audit logs, FIFO compliance, stock valuation, and traceability ledgers
            </div>
          </div>
          <div class="header-actions">
            <button
              type="button"
              class="btn a s export-btn"
              data-tour="reports-export-btn"
              (click)="exportCurrentReportToCsv()"
              [disabled]="isLoading() || currentTableData().length === 0"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              Export CSV
            </button>
          </div>
        </div>

        <!-- 7 Tab Navigation Switcher -->
        <div class="tab-bar" role="tablist" aria-label="Warehouse Reports">
          @for (tab of tabs; track tab.id) {
            <button
              type="button"
              role="tab"
              class="tab-btn"
              [class.active]="activeTab() === tab.id"
              [attr.aria-selected]="activeTab() === tab.id"
              (click)="switchTab(tab.id)"
            >
              <span class="tab-label">{{ tab.label }}</span>
            </button>
          }
        </div>
      </div>

      <!-- Filters & Search Bar Panel -->
      <div class="panel filter-panel" style="--acc: var(--blue);" data-tour="reports-filters">
        <div class="filter-grid">
          <!-- Global Search Input -->
          <div class="filter-field search-field">
            <label for="report-search">Search Text</label>
            <input
              id="report-search"
              type="text"
              class="mono"
              placeholder="Tag, Material, Bin..."
              [ngModel]="searchText()"
              (ngModelChange)="onSearchChange($event)"
            />
          </div>

          <!-- Date Range: From -->
          <div class="filter-field">
            <label for="report-from-date">From Date</label>
            <input
              id="report-from-date"
              type="date"
              [ngModel]="fromDate()"
              (ngModelChange)="onFromDateChange($event)"
            />
          </div>

          <!-- Date Range: To -->
          <div class="filter-field">
            <label for="report-to-date">To Date</label>
            <input
              id="report-to-date"
              type="date"
              [ngModel]="toDate()"
              (ngModelChange)="onToDateChange($event)"
            />
          </div>

          <!-- Branch Filter (Cross-branch for Admin) -->
          @if (isAdmin()) {
            <div class="filter-field">
              <label for="report-branch">Branch</label>
              <select
                id="report-branch"
                [ngModel]="selectedBranchId()"
                (ngModelChange)="onBranchChange($event)"
              >
                <option [ngValue]="null">All Branches</option>
                @for (b of branches(); track b.id) {
                  <option [ngValue]="b.id">{{ b.name }} ({{ b.code }})</option>
                }
              </select>
            </div>
          } @else {
            <div class="filter-field">
              <label>Branch Scope</label>
              <div class="locked-branch-badge">
                {{ currentBranchName() }}
              </div>
            </div>
          }

          <!-- Contextual Status Dropdown for Accept/Reject -->
          @if (activeTab() === 'accept-reject') {
            <div class="filter-field">
              <label for="report-status">Verification Status</label>
              <select
                id="report-status"
                [ngModel]="acceptRejectStatus()"
                (ngModelChange)="onStatusChange($event)"
              >
                <option value="All">All Statuses</option>
                <option value="Accepted">Accepted Only</option>
                <option value="Rejected">Rejected Only</option>
              </select>
            </div>
          }

          <!-- Contextual Action Type for Label Scan -->
          @if (activeTab() === 'label-scan') {
            <div class="filter-field">
              <label for="report-action">Action Type</label>
              <select
                id="report-action"
                [ngModel]="labelActionType()"
                (ngModelChange)="onLabelActionChange($event)"
              >
                <option value="">All Actions</option>
                <option value="Printed">Printed</option>
                <option value="Reprinted">Reprinted</option>
                <option value="Scanned">Scanned</option>
              </select>
            </div>
          }

          <!-- Filter Actions -->
          <div class="filter-actions">
            <button type="button" class="btn s" (click)="resetFilters()">
              Reset Filters
            </button>
            <button type="button" class="btn s a" (click)="loadCurrentReport()">
              Apply
            </button>
          </div>
        </div>

        <!-- Quick Date Chips -->
        <div class="quick-date-chips">
          <span class="chips-label">Presets:</span>
          <button type="button" class="chip-btn" (click)="setToday()">Today</button>
          <button type="button" class="chip-btn" (click)="setLast7Days()">Last 7 Days</button>
          <button type="button" class="chip-btn" (click)="setThisMonth()">This Month</button>
          <button type="button" class="chip-btn" (click)="clearDates()">All Time</button>
        </div>
      </div>

      <!-- Report Data Grid Panel -->
      <div class="panel" style="--acc: var(--amber);" data-tour="reports-table">
        <div class="ph">
          <div>
            <h3>{{ activeTabDef().label }} Data Table</h3>
            <div class="sub">{{ activeTabDef().description }}</div>
          </div>
          <div class="record-count">
            Total Records: <b>{{ totalCount() }}</b>
          </div>
        </div>

        @if (isLoading()) {
          <div class="loading-state">
            <div class="spinner"></div>
            <span>Loading report records...</span>
          </div>
        } @else {
          <!-- Report 1: Inward Table -->
          @if (activeTab() === 'inward') {
            <app-data-table
              [headers]="['Tag Sticker', 'Material Code', 'Part Name', 'Qty', 'Destination Bin', 'Zone', 'Inward Timestamp', 'Operator']"
              [isEmpty]="inwardData().length === 0"
              emptyText="No inward movements found matching filter criteria."
            >
              @for (row of inwardData(); track row.tagNo + row.inwardAt) {
                <tr>
                  <td class="mono font-bold">{{ row.tagNo }}</td>
                  <td class="mono">{{ row.materialCode }}</td>
                  <td>{{ row.partName }}</td>
                  <td class="mono font-bold text-success">+{{ row.qty }}</td>
                  <td class="mono font-bold text-amber">{{ row.locationCode }}</td>
                  <td>{{ row.locationZone }}</td>
                  <td>{{ row.inwardAt | date: 'dd MMM yyyy, hh:mm a' }}</td>
                  <td>{{ row.userNameSnapshot }}</td>
                </tr>
              }
            </app-data-table>
          }

          <!-- Report 2: Outward Table -->
          @if (activeTab() === 'outward') {
            <app-data-table
              [headers]="['Tag Sticker', 'Material Code', 'Part Name', 'Issued Qty', 'Remaining Qty', 'Source Bin', 'Dispatched At', 'Operator', 'FIFO Policy']"
              [isEmpty]="outwardData().length === 0"
              emptyText="No outward dispatches found matching filter criteria."
            >
              @for (row of outwardData(); track row.tagNo + row.dispatchedAt) {
                <tr>
                  <td class="mono font-bold">{{ row.tagNo }}</td>
                  <td class="mono">{{ row.materialCode }}</td>
                  <td>{{ row.partName }}</td>
                  <td class="mono font-bold text-amber">-{{ row.issuedQty }}</td>
                  <td class="mono">{{ row.remainingQty }}</td>
                  <td class="mono">{{ row.locationCode }}</td>
                  <td>{{ row.dispatchedAt | date: 'dd MMM yyyy, hh:mm a' }}</td>
                  <td>{{ row.userNameSnapshot }}</td>
                  <td>
                    @if (row.bypassFifo) {
                      <app-pill variant="amber" text="Bypass FIFO" />
                    } @else {
                      <app-pill variant="green" text="FIFO Strict" />
                    }
                  </td>
                </tr>
              }
            </app-data-table>
          }

          <!-- Report 3: In-Stock Balances Table -->
          @if (activeTab() === 'in-stock') {
            <app-data-table
              [headers]="['Material Code', 'Part Description', 'Bin Location', 'Zone', 'Total Stock Qty', 'Active Tags', 'Oldest Inward Date']"
              [isEmpty]="inStockData().length === 0"
              emptyText="No in-stock balances found matching filter criteria."
            >
              @for (row of inStockData(); track row.materialCode + row.locationCode) {
                <tr>
                  <td class="mono font-bold">{{ row.materialCode }}</td>
                  <td>{{ row.partName }}</td>
                  <td class="mono font-bold text-amber">{{ row.locationCode }}</td>
                  <td>{{ row.locationZone }}</td>
                  <td class="mono font-bold text-success">{{ row.totalQty }}</td>
                  <td class="mono">{{ row.tagCount }}</td>
                  <td>{{ row.oldestInwardAt | date: 'dd MMM yyyy' }}</td>
                </tr>
              }
            </app-data-table>
          }

          <!-- Report 4: Label Scan Audit Table -->
          @if (activeTab() === 'label-scan') {
            <app-data-table
              [headers]="['Tag Sticker', 'Material Code', 'Action Event', 'Qty', 'Printer / Terminal', 'Operator', 'Timestamp']"
              [isEmpty]="labelScanData().length === 0"
              emptyText="No label scan or print events found matching filter criteria."
            >
              @for (row of labelScanData(); track row.tagNo + row.timestamp + row.actionType) {
                <tr>
                  <td class="mono font-bold">{{ row.tagNo }}</td>
                  <td class="mono">{{ row.materialCode }}</td>
                  <td>
                    @if (row.actionType === 'Printed') {
                      <app-pill variant="Printed" text="Printed" />
                    } @else if (row.actionType === 'Reprinted') {
                      <app-pill variant="amber" text="Reprinted" />
                    } @else {
                      <app-pill variant="Inwarded" text="Scanned" />
                    }
                  </td>
                  <td class="mono">{{ row.qty }}</td>
                  <td class="mono">{{ row.printerIp }}</td>
                  <td>{{ row.operator }}</td>
                  <td>{{ row.timestamp | date: 'dd MMM yyyy, hh:mm a' }}</td>
                </tr>
              }
            </app-data-table>
          }

          <!-- Report 5: Overall Summary Table -->
          @if (activeTab() === 'overall') {
            <app-data-table
              [headers]="['Material Code', 'Part Description', 'Total Inwarded', 'Total Issued', 'Current Live Stock', 'Total Movements', 'Last Activity']"
              [isEmpty]="overallData().length === 0"
              emptyText="No inventory summary items found matching filter criteria."
            >
              @for (row of overallData(); track row.materialCode) {
                <tr>
                  <td class="mono font-bold">{{ row.materialCode }}</td>
                  <td>{{ row.partName }}</td>
                  <td class="mono text-success">+{{ row.totalInwarded }}</td>
                  <td class="mono text-amber">-{{ row.totalIssued }}</td>
                  <td class="mono font-bold">{{ row.currentStock }}</td>
                  <td class="mono">{{ row.movementCount }}</td>
                  <td>{{ row.lastMovementAt | date: 'dd MMM yyyy, hh:mm a' }}</td>
                </tr>
              }
            </app-data-table>
          }

          <!-- Report 6: Accept / Reject Table -->
          @if (activeTab() === 'accept-reject') {
            <app-data-table
              [headers]="['Tag Sticker', 'Material Code', 'Inspected Qty', 'Status', 'Rejection Reason', 'Inspector', 'Verification Time']"
              [isEmpty]="acceptRejectData().length === 0"
              emptyText="No acceptance or rejection records found matching filter criteria."
            >
              @for (row of acceptRejectData(); track row.tagNo + row.processedAt) {
                <tr>
                  <td class="mono font-bold">{{ row.tagNo }}</td>
                  <td class="mono">{{ row.materialCode }}</td>
                  <td class="mono font-bold">{{ row.qty }}</td>
                  <td>
                    @if (row.status === 'Accepted') {
                      <app-pill variant="green" text="Accepted" />
                    } @else {
                      <app-pill variant="red" text="Rejected" />
                    }
                  </td>
                  <td>{{ row.reason || '—' }}</td>
                  <td>{{ row.inspector }}</td>
                  <td>{{ row.processedAt | date: 'dd MMM yyyy, hh:mm a' }}</td>
                </tr>
              }
            </app-data-table>
          }

          <!-- Report 7: Location Transfer Table -->
          @if (activeTab() === 'location-transfer') {
            <app-data-table
              [headers]="['Tag Sticker', 'Material Code', 'Source Bin (From)', 'Destination Bin (To)', 'Relocated Qty', 'Reason', 'Operator', 'Transfer Date']"
              [isEmpty]="transferData().length === 0"
              emptyText="No location transfer records found matching filter criteria."
            >
              @for (row of transferData(); track row.tagNo + row.transferredAt) {
                <tr>
                  <td class="mono font-bold">{{ row.tagNo }}</td>
                  <td class="mono">{{ row.materialCode }}</td>
                  <td class="mono font-bold text-amber">{{ row.fromLocationCode }}</td>
                  <td class="mono font-bold text-success">{{ row.toLocationCode }}</td>
                  <td class="mono font-bold">{{ row.qty }}</td>
                  <td>{{ row.reason || 'Standard Relocation' }}</td>
                  <td>{{ row.operator }}</td>
                  <td>{{ row.transferredAt | date: 'dd MMM yyyy, hh:mm a' }}</td>
                </tr>
              }
            </app-data-table>
          }

          <!-- Pagination Bar -->
          <div class="pagination-bar">
            <div class="page-size-selector">
              <label for="page-size">Items per page:</label>
              <select
                id="page-size"
                [ngModel]="pageSize()"
                (ngModelChange)="onPageSizeChange($event)"
              >
                <option [ngValue]="10">10</option>
                <option [ngValue]="25">25</option>
                <option [ngValue]="50">50</option>
                <option [ngValue]="100">100</option>
              </select>
            </div>

            <div class="page-nav">
              <span class="page-indicator">
                Page <b>{{ currentPage() }}</b> of <b>{{ totalPages() }}</b>
              </span>
              <button
                type="button"
                class="btn s page-btn"
                [disabled]="currentPage() <= 1"
                (click)="goToPage(currentPage() - 1)"
              >
                Previous
              </button>
              <button
                type="button"
                class="btn s page-btn"
                [disabled]="currentPage() >= totalPages()"
                (click)="goToPage(currentPage() + 1)"
              >
                Next
              </button>
            </div>
          </div>
        }
      </div>
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
      }

      .reports-container {
        display: flex;
        flex-direction: column;
        gap: 16px;
      }

      .header-actions {
        display: flex;
        align-items: center;
        gap: 10px;
      }

      .export-btn {
        min-height: 44px;
        min-width: 130px;
        display: inline-flex;
        align-items: center;
        gap: 6px;
        font-weight: 600;

        svg {
          width: 16px;
          height: 16px;
        }
      }

      .tab-bar {
        display: flex;
        align-items: center;
        gap: 6px;
        overflow-x: auto;
        padding: 10px 16px 14px;
        border-top: 1px solid var(--line);
        background: var(--bg);

        &::-webkit-scrollbar {
          height: 4px;
        }
      }

      .tab-btn {
        padding: 8px 14px;
        min-height: 44px;
        border-radius: var(--radius-md);
        background: transparent;
        border: 1px solid transparent;
        color: var(--dim);
        font-size: 13px;
        font-weight: 600;
        cursor: pointer;
        white-space: nowrap;
        transition: all 0.2s ease;

        &:hover {
          color: var(--fg);
          background: rgba(255, 255, 255, 0.05);
        }

        &.active {
          color: #ffffff;
          background: linear-gradient(135deg, var(--purple, #6B4FA3), #483475);
          border-color: rgba(255, 255, 255, 0.2);
          box-shadow: 0 4px 12px rgba(107, 79, 163, 0.35);
        }
      }

      .filter-panel {
        padding: 14px 18px;
        display: flex;
        flex-direction: column;
        gap: 12px;
      }

      .filter-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
        gap: 12px;
        align-items: flex-end;
      }

      .filter-field {
        display: flex;
        flex-direction: column;
        gap: 6px;

        label {
          font-size: 11.5px;
          font-weight: 600;
          color: var(--dim);
        }

        input,
        select {
          min-height: 44px;
          padding: 8px 12px;
          border-radius: var(--radius-sm);
          background: var(--bg);
          border: 1px solid var(--line);
          color: var(--fg);
          font-size: 13px;

          &:focus {
            border-color: var(--purple);
            outline: none;
          }
        }
      }

      .locked-branch-badge {
        min-height: 44px;
        display: flex;
        align-items: center;
        padding: 8px 12px;
        background: var(--bg);
        border: 1px dashed var(--line);
        border-radius: var(--radius-sm);
        font-size: 12.5px;
        color: var(--dim);
      }

      .filter-actions {
        display: flex;
        gap: 8px;
        align-items: center;

        button {
          min-height: 44px;
          flex: 1;
        }
      }

      .quick-date-chips {
        display: flex;
        align-items: center;
        gap: 8px;
        flex-wrap: wrap;
        padding-top: 4px;

        .chips-label {
          font-size: 11px;
          color: var(--faint);
          font-weight: 600;
        }

        .chip-btn {
          font-size: 11px;
          padding: 4px 10px;
          border-radius: var(--radius-sm);
          background: var(--bg);
          border: 1px solid var(--line);
          color: var(--dim);
          cursor: pointer;
          min-height: 32px;

          &:hover {
            color: var(--fg);
            border-color: var(--purple);
          }
        }
      }

      .loading-state {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 12px;
        padding: 48px;
        color: var(--dim);
        font-size: 13px;

        .spinner {
          width: 22px;
          height: 22px;
          border: 2px solid var(--line);
          border-top-color: var(--purple);
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }
      }

      .pagination-bar {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 12px 16px;
        border-top: 1px solid var(--line);
        flex-wrap: wrap;
        gap: 12px;

        .page-size-selector {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 12.5px;
          color: var(--dim);

          select {
            padding: 4px 8px;
            background: var(--bg);
            border: 1px solid var(--line);
            border-radius: var(--radius-sm);
            color: var(--fg);
          }
        }

        .page-nav {
          display: flex;
          align-items: center;
          gap: 10px;

          .page-indicator {
            font-size: 12.5px;
            color: var(--dim);
          }

          .page-btn {
            min-height: 36px;
            min-width: 80px;
          }
        }
      }

      .record-count {
        font-size: 12.5px;
        color: var(--dim);
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
    `,
  ],
})
export class ReportsPageComponent implements OnInit, OnDestroy {
  private readonly reportService = inject(ReportService);
  private readonly branchService = inject(BranchService);
  private readonly sessionService = inject(SessionService);
  private readonly notificationService = inject(NotificationService);
  private readonly tourService = inject(TourService);
  private readonly destroyRef = inject(DestroyRef);

  // Tab definitions
  readonly tabs: TabDef[] = [
    {
      id: 'inward',
      label: '1. Inward Report',
      icon: 'inw',
      description: 'Inward putaway transactions, bin mapping, and received volumes',
    },
    {
      id: 'outward',
      label: '2. Outward FIFO',
      icon: 'out',
      description: 'Material dispatches, FIFO compliance tracking, and issue batches',
    },
    {
      id: 'in-stock',
      label: '3. In-Stock Balances',
      icon: 'box',
      description: 'Live physical warehouse stock balances grouped by bin and zone',
    },
    {
      id: 'label-scan',
      label: '4. Label Scan Audit',
      icon: 'doc',
      description: 'Audit log of sticker printing, reprints, and handheld scan events',
    },
    {
      id: 'overall',
      label: '5. Overall Summary',
      icon: 'rep',
      description: 'Consolidated material volume totals, inward vs outward balance',
    },
    {
      id: 'accept-reject',
      label: '6. Accept / Reject',
      icon: 'check',
      description: 'Receiving inspection verification, accepted lots, and rejection reasons',
    },
    {
      id: 'location-transfer',
      label: '7. Location Transfer',
      icon: 'swap',
      description: 'Bin-to-bin relocation history, transfer justifications, and operators',
    },
  ];

  // Active state signals
  readonly activeTab = signal<ReportTabId>('inward');
  readonly isLoading = signal<boolean>(false);
  readonly branches = signal<BranchDto[]>([]);

  // Filter signals
  readonly searchText = signal<string>('');
  readonly fromDate = signal<string>('');
  readonly toDate = signal<string>('');
  readonly selectedBranchId = signal<number | null>(null);
  readonly acceptRejectStatus = signal<'Accepted' | 'Rejected' | 'All'>('All');
  readonly labelActionType = signal<string>('');

  // Pagination signals
  readonly currentPage = signal<number>(1);
  readonly pageSize = signal<number>(10);
  readonly totalCount = signal<number>(0);
  readonly totalPages = signal<number>(1);

  // Tab-specific Data signals
  readonly inwardData = signal<InwardReportItemDto[]>([]);
  readonly outwardData = signal<OutwardReportItemDto[]>([]);
  readonly inStockData = signal<InStockReportItemDto[]>([]);
  readonly labelScanData = signal<LabelScanReportItemDto[]>([]);
  readonly overallData = signal<OverallSummaryReportItemDto[]>([]);
  readonly acceptRejectData = signal<AcceptRejectReportItemDto[]>([]);
  readonly transferData = signal<LocationTransferReportItemDto[]>([]);

  // Computed state
  readonly activeTabDef = computed(
    () => this.tabs.find((t) => t.id === this.activeTab()) || this.tabs[0]
  );
  readonly isAdmin = computed(() => this.sessionService.role() === 'Admin');
  readonly currentBranchName = computed(() => {
    const b = this.sessionService.branch();
    return b ? `${b.name} (${b.code})` : 'Active Assigned Branch';
  });

  readonly currentTableData = computed<any[]>(() => {
    switch (this.activeTab()) {
      case 'inward':
        return this.inwardData();
      case 'outward':
        return this.outwardData();
      case 'in-stock':
        return this.inStockData();
      case 'label-scan':
        return this.labelScanData();
      case 'overall':
        return this.overallData();
      case 'accept-reject':
        return this.acceptRejectData();
      case 'location-transfer':
        return this.transferData();
      default:
        return [];
    }
  });

  private readonly reportsTourDef: TourDefinition = {
    id: 'reports-tour',
    version: 1,
    roles: ['Admin', 'StoreKeeper', 'Viewer'],
    steps: [
      {
        element: '[data-tour="reports-nav"]',
        title: 'Report Navigator',
        description:
          'Switch seamlessly across all 7 operational reports: Inward, Outward, In-Stock, Label Audit, Overall Summary, Accept/Reject, and Transfers.',
        side: 'bottom',
      },
      {
        element: '[data-tour="reports-filters"]',
        title: 'Dynamic Filter Bar',
        description:
          'Filter data by date range, search query, cross-branch scope (Admin), and contextual status.',
        side: 'bottom',
      },
      {
        element: '[data-tour="reports-table"]',
        title: 'Secure Data Grid',
        description:
          'Review real-time data securely rendered as text with server-side pagination controls.',
        side: 'top',
      },
      {
        element: '[data-tour="reports-export-btn"]',
        title: 'Export to CSV',
        description:
          'Download filtered report data directly into a sanitized CSV spreadsheet for offline analysis.',
        side: 'bottom',
      },
    ],
  };

  ngOnInit(): void {
    this.tourService.registerCurrentTour(this.reportsTourDef);
    this.loadBranches();
    this.loadCurrentReport();
  }

  ngOnDestroy(): void {
    this.tourService.registerCurrentTour(null);
  }

  loadBranches(): void {
    if (!this.isAdmin()) return;
    this.branchService
      .getAll()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (items) => this.branches.set(items),
        error: () => this.branches.set([]),
      });
  }

  switchTab(tabId: ReportTabId): void {
    if (this.activeTab() === tabId) return;
    this.activeTab.set(tabId);
    this.currentPage.set(1);
    this.loadCurrentReport();
  }

  onSearchChange(text: string): void {
    this.searchText.set(text);
    this.currentPage.set(1);
    this.loadCurrentReport();
  }

  onFromDateChange(val: string): void {
    this.fromDate.set(val);
    this.currentPage.set(1);
    this.loadCurrentReport();
  }

  onToDateChange(val: string): void {
    this.toDate.set(val);
    this.currentPage.set(1);
    this.loadCurrentReport();
  }

  onBranchChange(val: number | null): void {
    this.selectedBranchId.set(val);
    this.currentPage.set(1);
    this.loadCurrentReport();
  }

  onStatusChange(val: 'Accepted' | 'Rejected' | 'All'): void {
    this.acceptRejectStatus.set(val);
    this.currentPage.set(1);
    this.loadCurrentReport();
  }

  onLabelActionChange(val: string): void {
    this.labelActionType.set(val);
    this.currentPage.set(1);
    this.loadCurrentReport();
  }

  onPageSizeChange(size: number): void {
    this.pageSize.set(size);
    this.currentPage.set(1);
    this.loadCurrentReport();
  }

  goToPage(p: number): void {
    if (p < 1 || p > this.totalPages()) return;
    this.currentPage.set(p);
    this.loadCurrentReport();
  }

  // --- Date Preset Helpers ---

  setToday(): void {
    const today = new Date().toISOString().split('T')[0];
    this.fromDate.set(today);
    this.toDate.set(today);
    this.currentPage.set(1);
    this.loadCurrentReport();
  }

  setLast7Days(): void {
    const now = new Date();
    const past = new Date();
    past.setDate(now.getDate() - 7);
    this.fromDate.set(past.toISOString().split('T')[0]);
    this.toDate.set(now.toISOString().split('T')[0]);
    this.currentPage.set(1);
    this.loadCurrentReport();
  }

  setThisMonth(): void {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    this.fromDate.set(firstDay);
    this.toDate.set(now.toISOString().split('T')[0]);
    this.currentPage.set(1);
    this.loadCurrentReport();
  }

  clearDates(): void {
    this.fromDate.set('');
    this.toDate.set('');
    this.currentPage.set(1);
    this.loadCurrentReport();
  }

  resetFilters(): void {
    this.searchText.set('');
    this.fromDate.set('');
    this.toDate.set('');
    this.selectedBranchId.set(null);
    this.acceptRejectStatus.set('All');
    this.labelActionType.set('');
    this.currentPage.set(1);
    this.loadCurrentReport();
  }

  // --- Primary Data Loader ---

  loadCurrentReport(): void {
    this.isLoading.set(true);

    const baseParams = {
      search: this.searchText().trim() || undefined,
      fromDate: this.fromDate() || undefined,
      toDate: this.toDate() || undefined,
      branchId: this.isAdmin() ? (this.selectedBranchId() ?? undefined) : undefined,
      page: this.currentPage(),
      pageSize: this.pageSize(),
    };

    switch (this.activeTab()) {
      case 'inward':
        this.reportService
          .getInwardReport(baseParams)
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe((res) => {
            this.inwardData.set(res.items);
            this.totalCount.set(res.totalCount);
            this.totalPages.set(res.totalPages);
            this.isLoading.set(false);
          });
        break;

      case 'outward':
        this.reportService
          .getOutwardReport(baseParams)
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe((res) => {
            this.outwardData.set(res.items);
            this.totalCount.set(res.totalCount);
            this.totalPages.set(res.totalPages);
            this.isLoading.set(false);
          });
        break;

      case 'in-stock':
        this.reportService
          .getInStockReport(baseParams)
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe((res) => {
            this.inStockData.set(res.items);
            this.totalCount.set(res.totalCount);
            this.totalPages.set(res.totalPages);
            this.isLoading.set(false);
          });
        break;

      case 'label-scan':
        this.reportService
          .getLabelScanReport({
            ...baseParams,
            actionType: this.labelActionType() || undefined,
          })
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe((res) => {
            this.labelScanData.set(res.items);
            this.totalCount.set(res.totalCount);
            this.totalPages.set(res.totalPages);
            this.isLoading.set(false);
          });
        break;

      case 'overall':
        this.reportService
          .getOverallSummaryReport(baseParams)
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe((res) => {
            this.overallData.set(res.items);
            this.totalCount.set(res.totalCount);
            this.totalPages.set(res.totalPages);
            this.isLoading.set(false);
          });
        break;

      case 'accept-reject':
        this.reportService
          .getAcceptRejectReport({
            ...baseParams,
            status: this.acceptRejectStatus(),
          })
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe((res) => {
            this.acceptRejectData.set(res.items);
            this.totalCount.set(res.totalCount);
            this.totalPages.set(res.totalPages);
            this.isLoading.set(false);
          });
        break;

      case 'location-transfer':
        this.reportService
          .getLocationTransferReport(baseParams)
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe((res) => {
            this.transferData.set(res.items);
            this.totalCount.set(res.totalCount);
            this.totalPages.set(res.totalPages);
            this.isLoading.set(false);
          });
        break;
    }
  }

  // --- Secure CSV Export ---

  exportCurrentReportToCsv(): void {
    const data = this.currentTableData();
    if (!data || data.length === 0) {
      this.notificationService.showWarning(
        'Export Empty',
        'No records available in current view to export.'
      );
      return;
    }

    const tab = this.activeTab();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `waretrack-report-${tab}-${timestamp}.csv`;

    let headers: string[] = [];
    let rows: string[][] = [];

    switch (tab) {
      case 'inward':
        headers = ['Tag No', 'Material Code', 'Part Name', 'Qty', 'Location', 'Zone', 'Inward At', 'Operator'];
        rows = (data as InwardReportItemDto[]).map((r) => [
          r.tagNo,
          r.materialCode,
          r.partName,
          r.qty.toString(),
          r.locationCode,
          r.locationZone,
          r.inwardAt,
          r.userNameSnapshot,
        ]);
        break;

      case 'outward':
        headers = ['Tag No', 'Material Code', 'Part Name', 'Issued Qty', 'Remaining Qty', 'Location', 'Dispatched At', 'Operator', 'Bypass FIFO'];
        rows = (data as OutwardReportItemDto[]).map((r) => [
          r.tagNo,
          r.materialCode,
          r.partName,
          (r.issuedQty ?? 0).toString(),
          (r.remainingQty ?? 0).toString(),
          r.locationCode,
          r.dispatchedAt,
          r.userNameSnapshot,
          r.bypassFifo ? 'Yes' : 'No',
        ]);
        break;

      case 'in-stock':
        headers = ['Material Code', 'Part Name', 'Location', 'Zone', 'Total Qty', 'Tag Count', 'Oldest Inward Date'];
        rows = (data as InStockReportItemDto[]).map((r) => [
          r.materialCode,
          r.partName,
          r.locationCode,
          r.locationZone,
          (r.totalQty ?? 0).toString(),
          (r.tagCount ?? 0).toString(),
          r.oldestInwardAt,
        ]);
        break;

      case 'label-scan':
        headers = ['Tag No', 'Material Code', 'Action Type', 'Qty', 'Printer / Terminal', 'Operator', 'Timestamp'];
        rows = (data as LabelScanReportItemDto[]).map((r) => [
          r.tagNo,
          r.materialCode,
          r.actionType,
          r.qty.toString(),
          r.printerIp,
          r.operator,
          r.timestamp,
        ]);
        break;

      case 'overall':
        headers = ['Material Code', 'Part Name', 'Total Inwarded', 'Total Issued', 'Current Stock', 'Movement Count', 'Last Activity'];
        rows = (data as OverallSummaryReportItemDto[]).map((r) => [
          r.materialCode,
          r.partName,
          r.totalInwarded.toString(),
          r.totalIssued.toString(),
          r.currentStock.toString(),
          r.movementCount.toString(),
          r.lastMovementAt,
        ]);
        break;

      case 'accept-reject':
        headers = ['Tag No', 'Material Code', 'Qty', 'Status', 'Rejection Reason', 'Inspector', 'Timestamp'];
        rows = (data as AcceptRejectReportItemDto[]).map((r) => [
          r.tagNo,
          r.materialCode,
          r.qty.toString(),
          r.status,
          r.reason || '',
          r.inspector,
          r.processedAt,
        ]);
        break;

      case 'location-transfer':
        headers = ['Tag No', 'Material Code', 'From Location', 'To Location', 'Qty', 'Reason', 'Operator', 'Transferred At'];
        rows = (data as LocationTransferReportItemDto[]).map((r) => [
          r.tagNo,
          r.materialCode,
          r.fromLocationCode,
          r.toLocationCode,
          r.qty.toString(),
          r.reason || '',
          r.operator,
          r.transferredAt,
        ]);
        break;
    }

    const csvContent = this.generateCsvString(headers, rows);
    this.downloadCsvFile(filename, csvContent);
    this.notificationService.showSuccess(
      'Export Downloaded',
      `Report exported successfully as ${filename}.`
    );
  }

  private generateCsvString(headers: string[], rows: string[][]): string {
    const sanitize = (val: string | null | undefined): string => {
      let str = (val ?? '').toString();
      // Mitigate CSV injection (cells starting with =, +, -, @, \t, \r)
      if (/^[=+\-@\t\r]/.test(str)) {
        str = "'" + str;
      }
      if (str.includes('"') || str.includes(',') || str.includes('\n')) {
        str = `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const headerLine = headers.map(sanitize).join(',');
    const rowLines = rows.map((r) => r.map(sanitize).join(','));
    return [headerLine, ...rowLines].join('\r\n');
  }

  private downloadCsvFile(filename: string, content: string): void {
    if (typeof window === 'undefined') return;
    const blob = new Blob(['\uFEFF' + content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}
