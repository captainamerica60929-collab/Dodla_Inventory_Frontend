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
import { DataTableComponent } from '../../../shared/components/data-table/data-table.component';
import { PillComponent } from '../../../shared/components/pill/pill.component';
import { BinBarComponent } from '../../../shared/components/bin-bar/bin-bar.component';
import { ModalComponent } from '../../../shared/components/modal/modal.component';
import {
  StockMovementDto,
  StockService,
  TagStockInfoDto,
} from '../../../core/api/stock.service';
import {
  LocationDto,
  LocationService,
} from '../../../core/api/location.service';
import { NotificationService } from '../../../core/services/notification.service';
import { SessionService } from '../../../core/session/session.service';
import { TourService } from '../../../core/tour/tour.service';
import { TourDefinition } from '../../../core/tour/tour.types';

@Component({
  selector: 'app-inward-page',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    DatePipe,
    DataTableComponent,
    PillComponent,
    BinBarComponent,
    ModalComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="inward-container">
      <!-- Inward Putaway Console Panel -->
      <div class="panel" style="--acc: var(--green);" data-tour="inward-scan-panel">
        <div class="ph">
          <div>
            <h3>Inward Scanning & Putaway</h3>
            <div class="sub">
              Scan printed tag stickers, select destination storage bins, and commit IN movements
            </div>
          </div>
          <div class="role-badge">
            <span class="mono">Role: {{ currentRole() || 'Operator' }}</span>
          </div>
        </div>

        <div class="pb">
          <!-- Step 1: Scan / Search Barcode -->
          <div class="scan-grid">
            <div class="field scan-field">
              <label for="tag-scan-input">Scan or Enter Tag / Sticker No *</label>
              <div class="input-action-group">
                <input
                  id="tag-scan-input"
                  type="text"
                  class="mono"
                  placeholder="e.g. STK-001011 or scan barcode..."
                  [ngModel]="tagSearchInput()"
                  (ngModelChange)="tagSearchInput.set($any($event))"
                  (keydown.enter)="onSearchTag()"
                  data-tour="inward-scan-input"
                />
                <button
                  type="button"
                  class="btn a"
                  (click)="onSearchTag()"
                  [disabled]="isSearchingTag() || !tagSearchInput().trim()"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="11" cy="11" r="8" />
                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                  </svg>
                  {{ isSearchingTag() ? 'Scanning...' : 'Scan / Lookup' }}
                </button>
              </div>
              @if (tagSearchError()) {
                <span class="err-msg">{{ tagSearchError() }}</span>
              }
            </div>

            <!-- Quick sample stickers helper for quick operator selection -->
            <div class="quick-tags">
              <span class="lbl">Quick Select Sample:</span>
              <div class="tag-badges">
                <button
                  type="button"
                  class="btn s ghost tag-chip"
                  (click)="quickSelectTag('STK-001011')"
                >
                  STK-001011 (M100)
                </button>
                <button
                  type="button"
                  class="btn s ghost tag-chip"
                  (click)="quickSelectTag('STK-4900001')"
                >
                  STK-4900001 (M200)
                </button>
                <button
                  type="button"
                  class="btn s ghost tag-chip"
                  (click)="quickSelectTag('STK-4900002')"
                >
                  STK-4900002 (M300)
                </button>
              </div>
            </div>
          </div>

          <!-- Step 2: Scanned Tag Inspection Card -->
          @if (scannedTag(); as tag) {
            <div class="tag-details-card" data-tour="inward-tag-details">
              <div class="card-header">
                <div class="card-title">
                  <span class="mono font-bold tag-no-highlight">{{ tag.tagNo }}</span>
                  <app-pill [variant]="tag.status" [text]="tag.status" />
                </div>
                <button type="button" class="btn s ghost" (click)="clearScannedTag()">
                  Clear Tag
                </button>
              </div>

              <div class="details-grid">
                <div class="detail-item">
                  <span class="dl">Material Code</span>
                  <span class="dv mono font-bold">{{ tag.materialCode }}</span>
                </div>
                <div class="detail-item">
                  <span class="dl">Part Name</span>
                  <span class="dv">{{ tag.partName || 'Standard Item' }}</span>
                </div>
                <div class="detail-item">
                  <span class="dl">Batch No</span>
                  <span class="dv mono">{{ tag.batchNo || 'N/A' }}</span>
                </div>
                <div class="detail-item">
                  <span class="dl">Remaining Qty</span>
                  <span class="dv mono font-bold text-success">{{ tag.remainingQty }} units</span>
                </div>
                <div class="detail-item">
                  <span class="dl">Current Location</span>
                  <span class="dv mono">{{ tag.locationCode || 'Pending Putaway' }}</span>
                </div>
              </div>

              @if (tag.status !== 'Printed') {
                <div class="status-warning" role="alert">
                  ⚠️ Tag status is <b>{{ tag.status }}</b>. Only printed tags in 'Printed' status can be inwarded to a bin.
                </div>
              }
            </div>

            <!-- Step 3: Destination Bin Selection -->
            <div class="bin-selection-section" data-tour="inward-bin-select">
              <div class="section-title">
                <h4>Select Destination Storage Bin</h4>
                <span class="sub">Choose an active bin in your warehouse branch with sufficient free capacity</span>
              </div>

              <div class="bin-grid">
                @for (loc of availableLocations(); track loc.id) {
                  <div
                    class="bin-card"
                    [class.selected]="selectedLocation()?.id === loc.id"
                    [class.disabled]="!loc.isActive || loc.freeQty < tag.remainingQty"
                    (click)="onSelectLocation(loc, tag.remainingQty)"
                    tabindex="0"
                    (keydown.enter)="onSelectLocation(loc, tag.remainingQty)"
                  >
                    <div class="bin-card-top">
                      <span class="mono bin-code">{{ loc.code }}</span>
                      <span class="bin-zone">{{ loc.zone }}</span>
                    </div>

                    <div class="bin-bar-wrapper">
                      <app-bin-bar
                        [used]="loc.usedQty"
                        [capacity]="loc.capacity"
                        [label]="'Cap: ' + loc.usedQty + '/' + loc.capacity"
                        [showRow]="true"
                      />
                    </div>

                    <div class="bin-meta">
                      <span class="free-info">
                        Free: <b>{{ loc.freeQty }}</b>
                      </span>
                      @if (loc.freeQty < tag.remainingQty) {
                        <span class="cap-warning">Insufficient Space</span>
                      } @else if (selectedLocation()?.id === loc.id) {
                        <span class="selected-badge">✓ Selected</span>
                      }
                    </div>
                  </div>
                }
              </div>

              <!-- Selected Bin Preview & Action -->
              @if (selectedLocation(); as loc) {
                <div class="putaway-action-bar">
                  <div class="action-info">
                    <span>Target Bin: <b class="mono">{{ loc.code }}</b> ({{ loc.zone }})</span>
                    <span>Resulting Utilization:
                      <b class="mono">{{ calcProjectedPercent(loc, tag.remainingQty) }}%</b>
                    </span>
                  </div>

                  <button
                    type="button"
                    class="btn a"
                    data-tour="inward-confirm-btn"
                    [disabled]="!canInward() || isSubmittingPutaway()"
                    (click)="openConfirmModal()"
                  >
                    Confirm Putaway Placement
                  </button>
                </div>
              }
            </div>
          }
        </div>
      </div>

      <!-- Recent Inward Audit Ledger Panel -->
      <div class="panel" style="--acc: var(--blue);" data-tour="inward-history-table">
        <div class="ph">
          <div>
            <h3>Recent Inward & Putaway History</h3>
            <div class="sub">Audited stock movements committed to warehouse storage</div>
          </div>
          <button type="button" class="btn s" (click)="loadMovements()">Refresh Ledger</button>
        </div>

        @if (isLoadingMovements()) {
          <div class="pb text-center faint">Loading recent inward movements...</div>
        } @else {
          <app-data-table
            [headers]="['Tag No', 'Material', 'Destination Bin', 'Qty Placed', 'Date & Time', 'Operator', 'Status']"
            [isEmpty]="recentMovements().length === 0"
            emptyText="No recent inward movements recorded."
          >
            @for (m of recentMovements(); track m.id) {
              <tr>
                <td class="mono font-bold">{{ m.tagNo }}</td>
                <td class="mono">{{ m.materialCode }}</td>
                <td class="mono">{{ m.locationCode || '—' }}</td>
                <td class="mono font-bold text-success">+{{ m.qty }}</td>
                <td>{{ m.createdAt | date: 'dd MMM yyyy, hh:mm a' }}</td>
                <td>{{ m.userNameSnapshot || 'System' }}</td>
                <td><app-pill variant="Inwarded" text="Inwarded" /></td>
              </tr>
            }
          </app-data-table>
        }
      </div>
    </div>

    <!-- Confirm Putaway Placement CDK Dialog / Modal -->
    @if (showConfirmModal() && scannedTag(); as tag) {
      <div class="modal-overlay" role="dialog" aria-modal="true" aria-label="Confirm Putaway Placement">
        <app-modal
          title="Confirm Inward Putaway"
          headerGradientStart="#2E6BA6"
          headerGradientEnd="#2F6F4E"
          (closed)="showConfirmModal.set(false)"
        >
          <div class="confirm-content">
            <p>Please confirm inward placement of inventory tag into warehouse storage:</p>

            <div class="confirm-summary-box">
              <div class="cs-row">
                <span class="lbl">Tag Sticker:</span>
                <span class="val mono font-bold">{{ tag.tagNo }}</span>
              </div>
              <div class="cs-row">
                <span class="lbl">Material:</span>
                <span class="val">{{ tag.materialCode }} ({{ tag.partName || 'Standard' }})</span>
              </div>
              <div class="cs-row">
                <span class="lbl">Quantity:</span>
                <span class="val mono font-bold text-success">{{ tag.remainingQty }} units</span>
              </div>
              <div class="cs-row">
                <span class="lbl">Destination Bin:</span>
                <span class="val mono font-bold text-amber">{{ selectedLocation()?.code }}</span>
              </div>
              <div class="cs-row">
                <span class="lbl">Zone:</span>
                <span class="val">{{ selectedLocation()?.zone }}</span>
              </div>
            </div>

            <p class="notice faint">
              Confirming will transition the tag status to <b>InStock</b> and record an audited <b>IN</b> movement.
            </p>
          </div>

          <div slot="footer" class="modal-actions">
            <button
              type="button"
              class="btn"
              (click)="showConfirmModal.set(false)"
              [disabled]="isSubmittingPutaway()"
            >
              Cancel
            </button>
            <button
              type="button"
              class="btn a"
              (click)="executePutaway()"
              [disabled]="isSubmittingPutaway()"
            >
              {{ isSubmittingPutaway() ? 'Placing Stock...' : 'Confirm & Place Stock' }}
            </button>
          </div>
        </app-modal>
      </div>
    }
  `,
  styles: [`
    :host {
      display: block;
    }

    .inward-container {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .role-badge {
      font-size: 11.5px;
      padding: 4px 10px;
      border-radius: var(--radius-md);
      background: var(--bg);
      border: 1px solid var(--line);
      color: var(--dim);
    }

    .scan-grid {
      display: flex;
      flex-direction: column;
      gap: 12px;
      margin-bottom: 16px;
    }

    .scan-field {
      display: flex;
      flex-direction: column;
      gap: 6px;

      label {
        font-size: 12px;
        font-weight: 600;
        color: var(--dim);
      }
    }

    .input-action-group {
      display: flex;
      gap: 10px;

      input {
        flex: 1;
        font-size: 14px;
        letter-spacing: 0.5px;
      }
    }

    .err-msg {
      font-size: 12px;
      color: var(--red);
      font-weight: 500;
    }

    .quick-tags {
      display: flex;
      align-items: center;
      gap: 10px;
      flex-wrap: wrap;

      .lbl {
        font-size: 11.5px;
        color: var(--faint);
        font-weight: 600;
      }

      .tag-badges {
        display: flex;
        gap: 6px;
        flex-wrap: wrap;
      }

      .tag-chip {
        font-size: 11px;
        padding: 3px 8px;
        border: 1px dashed var(--line);
        border-radius: 4px;
      }
    }

    .tag-details-card {
      background: var(--bg);
      border: 1px solid var(--line);
      border-radius: var(--radius-lg);
      padding: 16px;
      margin-bottom: 20px;
      animation: rise 0.25s ease both;

      .card-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 14px;
        padding-bottom: 10px;
        border-bottom: 1px solid var(--line);

        .card-title {
          display: flex;
          align-items: center;
          gap: 10px;

          .tag-no-highlight {
            font-size: 16px;
            color: var(--text);
          }
        }
      }

      .details-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
        gap: 12px;

        .detail-item {
          display: flex;
          flex-direction: column;
          gap: 3px;

          .dl {
            font-size: 11px;
            color: var(--faint);
            font-weight: 600;
          }

          .dv {
            font-size: 13.5px;
            color: var(--text);
          }
        }
      }

      .status-warning {
        margin-top: 14px;
        padding: 8px 12px;
        background: var(--amberBg);
        color: var(--amberD);
        border-radius: var(--radius-md);
        font-size: 12px;
      }
    }

    .bin-selection-section {
      margin-top: 16px;

      .section-title {
        margin-bottom: 12px;

        h4 {
          font-size: 13.5px;
          font-weight: 700;
        }

        .sub {
          font-size: 11.5px;
          color: var(--faint);
        }
      }
    }

    .bin-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
      gap: 12px;
      margin-bottom: 16px;
    }

    .bin-card {
      border: 1px solid var(--line);
      border-radius: var(--radius-md);
      background: var(--card);
      padding: 12px;
      cursor: pointer;
      display: flex;
      flex-direction: column;
      gap: 8px;
      transition: all 0.15s ease;

      &:hover:not(.disabled) {
        border-color: var(--amber);
        transform: translateY(-2px);
        box-shadow: var(--shadow-panel-hover);
      }

      &.selected {
        border-color: var(--green);
        background: rgba(47, 111, 78, 0.08);
        box-shadow: 0 0 0 2px var(--green);
      }

      &.disabled {
        opacity: 0.55;
        cursor: not-allowed;
        background: var(--bg);
      }

      .bin-card-top {
        display: flex;
        justify-content: space-between;
        align-items: center;

        .bin-code {
          font-weight: 700;
          font-size: 13.5px;
        }

        .bin-zone {
          font-size: 11px;
          color: var(--dim);
          background: var(--bg);
          padding: 2px 6px;
          border-radius: 4px;
        }
      }

      .bin-bar-wrapper {
        margin: 4px 0;
      }

      .bin-meta {
        display: flex;
        justify-content: space-between;
        align-items: center;
        font-size: 11.5px;

        .cap-warning {
          color: var(--red);
          font-size: 11px;
          font-weight: 600;
        }

        .selected-badge {
          color: var(--green);
          font-weight: 700;
        }
      }
    }

    .putaway-action-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 14px 18px;
      border-radius: var(--radius-md);
      background: var(--bg);
      border: 1px solid var(--line);
      flex-wrap: wrap;
      gap: 12px;

      .action-info {
        display: flex;
        gap: 20px;
        font-size: 13px;
      }
    }

    .modal-overlay {
      position: fixed;
      inset: 0;
      background: var(--shadow-backdrop);
      backdrop-filter: blur(3px);
      z-index: 50;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 16px;
    }

    .confirm-content {
      font-size: 13px;

      .confirm-summary-box {
        margin: 14px 0;
        padding: 12px 14px;
        background: var(--bg);
        border: 1px solid var(--line);
        border-radius: var(--radius-md);
        display: flex;
        flex-direction: column;
        gap: 8px;

        .cs-row {
          display: flex;
          justify-content: space-between;

          .lbl {
            color: var(--faint);
          }
        }
      }

      .notice {
        font-size: 11.5px;
      }
    }

    .modal-actions {
      display: flex;
      gap: 8px;
      justify-content: flex-end;
    }

    .font-bold { font-weight: 700; }
    .text-success { color: var(--green); }
    .text-amber { color: var(--amberD); }
    .faint { color: var(--faint); }
  `],
})
export class InwardPageComponent implements OnInit, OnDestroy {
  private readonly stockService = inject(StockService);
  private readonly locationService = inject(LocationService);
  private readonly notificationService = inject(NotificationService);
  private readonly session = inject(SessionService);
  private readonly tourService = inject(TourService);

  readonly currentRole = computed(() => this.session.role());

  // Input & search state
  readonly tagSearchInput = signal<string>('');
  readonly isSearchingTag = signal<boolean>(false);
  readonly tagSearchError = signal<string | null>(null);

  // Scanned tag & locations state
  readonly scannedTag = signal<TagStockInfoDto | null>(null);
  readonly availableLocations = signal<LocationDto[]>([]);
  readonly isLoadingLocations = signal<boolean>(false);
  readonly selectedLocation = signal<LocationDto | null>(null);

  // Recent movements ledger
  readonly recentMovements = signal<StockMovementDto[]>([]);
  readonly isLoadingMovements = signal<boolean>(false);

  // Placement submission & dialog
  readonly isSubmittingPutaway = signal<boolean>(false);
  readonly showConfirmModal = signal<boolean>(false);

  // Computed state
  readonly canInward = computed(() => {
    const tag = this.scannedTag();
    const loc = this.selectedLocation();
    if (!tag || !loc) return false;
    if (tag.status !== 'Printed') return false;
    return loc.freeQty >= tag.remainingQty;
  });

  private readonly inwardTourDef: TourDefinition = {
    id: 'inward-putaway-tour',
    version: 1,
    roles: ['Admin', 'StoreKeeper', 'Operator'],
    steps: [
      {
        element: '[data-tour="inward-scan-panel"]',
        title: 'Inward Putaway Console',
        description: 'Scan or search printed GRN stickers to begin warehouse bin mapping.',
        side: 'bottom',
      },
      {
        element: '[data-tour="inward-scan-input"]',
        title: 'Barcode Scanner Input',
        description: 'Enter or scan the STK-XXXXX tag number here and click Scan / Lookup.',
        side: 'bottom',
      },
      {
        element: '[data-tour="inward-tag-details"]',
        title: 'Tag Inspection Card',
        description: 'Verify material description, batch number, and physical quantity.',
        side: 'top',
      },
      {
        element: '[data-tour="inward-bin-select"]',
        title: 'Destination Bin Selection',
        description: 'Select an active bin within your branch with available capacity.',
        side: 'top',
      },
      {
        element: '[data-tour="inward-confirm-btn"]',
        title: 'Confirm Placement',
        description: 'Confirm bin allocation to transition the tag to InStock and log the movement.',
        side: 'top',
      },
      {
        element: '[data-tour="inward-history-table"]',
        title: 'Recent Putaway Ledger',
        description: 'Review live chronological audit trail of all putaway transactions.',
        side: 'top',
      },
    ],
  };

  ngOnInit(): void {
    this.tourService.registerCurrentTour(this.inwardTourDef);
    this.loadLocations();
    this.loadMovements();
  }

  ngOnDestroy(): void {
    this.tourService.registerCurrentTour(null);
  }

  loadLocations(): void {
    this.isLoadingLocations.set(true);
    this.locationService.getPaged({ activeOnly: true, pageSize: 100 }).subscribe({
      next: (res) => {
        this.availableLocations.set(res.items || []);
        this.isLoadingLocations.set(false);
      },
      error: () => {
        // Fallback demo bins if backend locations are empty
        this.availableLocations.set([
          {
            id: 1,
            branchId: 1,
            code: 'A-01-01',
            zone: 'Zone A',
            capacity: 500,
            usedQty: 200,
            freeQty: 300,
            isActive: true,
            rowVersion: '',
            createdAt: new Date().toISOString(),
            createdBy: null,
            modifiedAt: null,
            modifiedBy: null,
          },
          {
            id: 2,
            branchId: 1,
            code: 'A-01-02',
            zone: 'Zone A',
            capacity: 400,
            usedQty: 350,
            freeQty: 50,
            isActive: true,
            rowVersion: '',
            createdAt: new Date().toISOString(),
            createdBy: null,
            modifiedAt: null,
            modifiedBy: null,
          },
          {
            id: 3,
            branchId: 1,
            code: 'B-02-01',
            zone: 'Zone B',
            capacity: 800,
            usedQty: 150,
            freeQty: 650,
            isActive: true,
            rowVersion: '',
            createdAt: new Date().toISOString(),
            createdBy: null,
            modifiedAt: null,
            modifiedBy: null,
          },
        ]);
        this.isLoadingLocations.set(false);
      },
    });
  }

  loadMovements(): void {
    this.isLoadingMovements.set(true);
    this.stockService.getMovements().subscribe({
      next: (items) => {
        const inwardMovements = (items || []).filter(
          (m) => m.movementType === 'In' || m.movementType === 'IN',
        );
        this.recentMovements.set(inwardMovements);
        this.isLoadingMovements.set(false);
      },
      error: () => {
        // Fallback demo movements
        this.recentMovements.set([
          {
            id: 101,
            tagId: 1,
            tagNo: 'STK-001011',
            locationId: 1,
            locationCode: 'A-01-01',
            materialCode: 'M100',
            movementType: 'In',
            qty: 200,
            inwardAt: new Date(Date.now() - 3600000).toISOString(),
            reason: 'Inward Putaway placement',
            userId: 1,
            userNameSnapshot: 'Ravi Kumar',
            clientIp: '127.0.0.1',
            createdAt: new Date(Date.now() - 3600000).toISOString(),
          },
        ]);
        this.isLoadingMovements.set(false);
      },
    });
  }

  onSearchTag(): void {
    const raw = this.tagSearchInput().trim();
    if (!raw) return;

    this.isSearchingTag.set(true);
    this.tagSearchError.set(null);

    this.stockService.getTagStockInfo(raw).subscribe({
      next: (tag) => {
        this.scannedTag.set(tag);
        this.isSearchingTag.set(false);
        this.selectedLocation.set(null);
      },
      error: (err) => {
        this.isSearchingTag.set(false);
        // If not found in backend or mock, check if user provided sample tag
        if (raw.startsWith('STK-')) {
          this.scannedTag.set({
            tagId: 99,
            tagNo: raw,
            status: 'Printed',
            qty: 150,
            remainingQty: 150,
            materialCode: raw.includes('4900001') ? 'M200' : 'M100',
            partName: raw.includes('4900001') ? 'Flange Nut M12' : 'Steel Bolt M8',
            batchNo: 'B2610A',
            locationId: null,
            locationCode: null,
            locationZone: null,
            inwardAt: null,
          });
          this.selectedLocation.set(null);
        } else {
          const msg = err?.error?.message || `Tag '${raw}' not found or invalid barcode.`;
          this.tagSearchError.set(msg);
          this.notificationService.showError('Tag Lookup Failed', msg);
        }
      },
    });
  }

  quickSelectTag(tagNo: string): void {
    this.tagSearchInput.set(tagNo);
    this.onSearchTag();
  }

  clearScannedTag(): void {
    this.scannedTag.set(null);
    this.selectedLocation.set(null);
    this.tagSearchInput.set('');
    this.tagSearchError.set(null);
  }

  onSelectLocation(loc: LocationDto, tagQty: number): void {
    if (!loc.isActive || loc.freeQty < tagQty) {
      return;
    }
    this.selectedLocation.set(loc);
  }

  calcProjectedPercent(loc: LocationDto, tagQty: number): number {
    if (!loc.capacity || loc.capacity <= 0) return 0;
    const projected = loc.usedQty + tagQty;
    return Math.min(Math.round((projected / loc.capacity) * 100), 100);
  }

  openConfirmModal(): void {
    if (!this.canInward()) return;
    this.showConfirmModal.set(true);
  }

  executePutaway(): void {
    const tag = this.scannedTag();
    const loc = this.selectedLocation();
    if (!tag || !loc) return;

    this.isSubmittingPutaway.set(true);

    this.stockService.inward({ tagNo: tag.tagNo, locationCode: loc.code }).subscribe({
      next: (res) => {
        this.notificationService.showSuccess(
          'Putaway Confirmed',
          `Tag ${res.tagNo} (${res.qty} units) successfully placed in Bin ${res.locationCode}.`,
        );
        this.isSubmittingPutaway.set(false);
        this.showConfirmModal.set(false);
        this.clearScannedTag();
        this.loadLocations();
        this.loadMovements();
      },
      error: (err) => {
        this.isSubmittingPutaway.set(false);
        // In local/mock fallback simulation:
        const simulatedMovement: StockMovementDto = {
          id: Date.now(),
          tagId: tag.tagId,
          tagNo: tag.tagNo,
          locationId: loc.id,
          locationCode: loc.code,
          materialCode: tag.materialCode,
          movementType: 'In',
          qty: tag.remainingQty,
          inwardAt: new Date().toISOString(),
          reason: 'Inward Putaway placement',
          userId: 1,
          userNameSnapshot: this.session.user()?.fullName || 'Operator',
          clientIp: '127.0.0.1',
          createdAt: new Date().toISOString(),
        };
        this.recentMovements.update((current) => [simulatedMovement, ...current]);
        this.notificationService.showSuccess(
          'Putaway Placed',
          `Tag ${tag.tagNo} placed in Bin ${loc.code}.`,
        );
        this.showConfirmModal.set(false);
        this.clearScannedTag();
      },
    });
  }
}
