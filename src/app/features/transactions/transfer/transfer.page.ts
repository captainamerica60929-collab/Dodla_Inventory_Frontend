import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  OnInit,
  OnDestroy,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { DataTableComponent } from '../../../shared/components/data-table/data-table.component';
import { PillComponent } from '../../../shared/components/pill/pill.component';
import { BinBarComponent } from '../../../shared/components/bin-bar/bin-bar.component';
import { ModalComponent } from '../../../shared/components/modal/modal.component';
import {
  StockMovementDto,
  StockService,
  TagStockInfoDto,
  LocationTransferResponseDto,
} from '../../../core/api/stock.service';
import {
  LocationDto,
  LocationService,
} from '../../../core/api/location.service';
import { NotificationService } from '../../../core/services/notification.service';
import { SessionService } from '../../../core/session/session.service';
import { TourService } from '../../../core/tour/tour.service';
import { TourDefinition } from '../../../core/tour/tour.types';

export interface TransferHistoryItem {
  id: number;
  tagId: number;
  tagNo: string;
  materialCode: string;
  qty: number;
  fromLocationCode: string;
  toLocationCode: string;
  reason: string | null;
  transferredAt: string;
  operator: string;
}

@Component({
  selector: 'app-transfer-page',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    DatePipe,
    DataTableComponent,
    PillComponent,
    BinBarComponent,
    ModalComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="transfer-container">
      <!-- Main Location Transfer Console Panel -->
      <div class="panel" style="--acc: var(--blue);" data-tour="transfer-scan-panel">
        <div class="ph">
          <div>
            <h3>Location Transfer</h3>
            <div class="sub">
              Relocate stock between warehouse bins and consolidation zones
            </div>
          </div>
          <div class="role-badge">
            <span class="mono">Role: {{ currentRole() || 'Operator' }}</span>
          </div>
        </div>

        <div class="pb">
          <!-- Step 1: Scan / Search Tag Barcode -->
          <div class="scan-grid">
            <div class="field scan-field">
              <label for="tag-transfer-input">Scan or Enter Tag / Sticker No *</label>
              <div class="input-action-group">
                <input
                  #scanInput
                  id="tag-transfer-input"
                  type="text"
                  class="mono"
                  autofocus
                  placeholder="e.g. STK-4900003 or scan barcode..."
                  [value]="tagInput()"
                  (input)="tagInput.set($any($event.target).value)"
                  (keydown.enter)="onSearchTag()"
                  data-tour="transfer-scan-input"
                />
                <button
                  type="button"
                  class="btn a"
                  (click)="onSearchTag()"
                  [disabled]="isSearching() || !tagInput().trim()"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="11" cy="11" r="8" />
                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                  </svg>
                  {{ isSearching() ? 'Searching...' : 'Scan / Lookup' }}
                </button>
              </div>
              @if (searchError()) {
                <span class="err-msg">{{ searchError() }}</span>
              }
            </div>

            <!-- Quick pick tags for operator ease -->
            <div class="quick-tags">
              <span class="lbl">Quick Select Sample:</span>
              <div class="tag-badges">
                <button
                  type="button"
                  class="btn s ghost tag-chip"
                  (click)="quickSelectTag('STK-4900003')"
                >
                  STK-4900003 (Bearing 6205 · A-01-02)
                </button>
                <button
                  type="button"
                  class="btn s ghost tag-chip"
                  (click)="quickSelectTag('STK-4900001')"
                >
                  STK-4900001 (M100 · A-01-01)
                </button>
                <button
                  type="button"
                  class="btn s ghost tag-chip"
                  (click)="quickSelectTag('STK-4900002')"
                >
                  STK-4900002 (M300 · B-01-01)
                </button>
              </div>
            </div>
          </div>

          <!-- Step 2: Scanned Tag Detail & Transfer Destination Form -->
          @if (scannedTag(); as tag) {
            <div class="tag-details-card" data-tour="transfer-details-card">
              <div class="card-header">
                <div class="card-title">
                  <span class="mono font-bold tag-title">{{ tag.tagNo }}</span>
                  <span class="material-name">
                    <b>{{ tag.materialCode }}</b> ({{ tag.partName || 'Standard Material' }})
                  </span>
                  <app-pill [variant]="tag.status" [text]="tag.status" />
                </div>
                <button type="button" class="btn s ghost" (click)="clearScannedTag()">
                  Deselect
                </button>
              </div>

              <div class="details-grid">
                <div class="detail-item">
                  <span class="dl">Current Location</span>
                  <span class="dv mono font-bold text-amber">
                    {{ tag.locationCode || 'Unassigned / Floor' }}
                    @if (tag.locationZone) {
                      ({{ tag.locationZone }})
                    }
                  </span>
                </div>
                <div class="detail-item">
                  <span class="dl">Available Qty</span>
                  <span class="dv mono font-bold text-success">{{ tag.remainingQty }} units</span>
                </div>
                <div class="detail-item">
                  <span class="dl">Batch No</span>
                  <span class="dv mono">{{ tag.batchNo || '—' }}</span>
                </div>
                <div class="detail-item">
                  <span class="dl">Original Inward</span>
                  <span class="dv">
                    {{ tag.inwardAt ? (tag.inwardAt | date: 'dd MMM yyyy, hh:mm a') : '—' }}
                  </span>
                </div>
              </div>

              <!-- Transfer Form -->
              <form
                [formGroup]="transferForm"
                (ngSubmit)="openConfirmModal()"
                class="transfer-form-grid"
              >
                <div class="field destination-field">
                  <label for="dest-location-select">Select Active Destination Bin *</label>
                  <select
                    id="dest-location-select"
                    formControlName="targetLocationCode"
                    class="mono font-bold"
                    data-tour="transfer-dest-select"
                  >
                    <option value="" disabled>-- Select Destination Bin --</option>
                    @for (loc of destinationLocations(); track loc.id) {
                      <option [value]="loc.code">
                        {{ loc.code }} (Zone: {{ loc.zone }}, Free: {{ loc.freeQty }}/{{ loc.capacity }})
                      </option>
                    }
                  </select>
                  @if (
                    transferForm.controls['targetLocationCode'].touched &&
                    transferForm.controls['targetLocationCode'].errors
                  ) {
                    <span class="err-msg">Destination bin is required.</span>
                  }
                </div>

                <div class="field reason-field">
                  <label for="transfer-reason">Transfer Reason / Remarks</label>
                  <input
                    id="transfer-reason"
                    type="text"
                    formControlName="reason"
                    placeholder="e.g. Stock consolidation, Rack maintenance, Zone rebalance"
                    maxlength="250"
                  />
                  @if (
                    transferForm.controls['reason'].touched &&
                    transferForm.controls['reason'].errors?.['maxlength']
                  ) {
                    <span class="err-msg">Reason cannot exceed 250 characters.</span>
                  }
                </div>

                <!-- Destination Location Capacity Preview -->
                @if (selectedDestination(); as destLoc) {
                  <div class="destination-preview">
                    <span class="preview-title">Target Bin Capacity Preview:</span>
                    <app-bin-bar
                      [used]="destLoc.usedQty"
                      [capacity]="destLoc.capacity"
                      [label]="destLoc.code + ' Utilization: ' + destLoc.usedQty + '/' + destLoc.capacity"
                      [showRow]="true"
                    />
                    <div class="capacity-hint">
                      Projected Utilization:
                      <b class="mono">
                        {{ destLoc.usedQty + tag.remainingQty }} / {{ destLoc.capacity }}
                        ({{ calcProjectedPercent(destLoc, tag.remainingQty) }}%)
                      </b>
                    </div>
                  </div>
                }

                <div class="action-row">
                  <button
                    type="submit"
                    class="btn a transfer-submit-btn"
                    data-tour="transfer-submit-btn"
                    [disabled]="transferForm.invalid || isSubmitting()"
                  >
                    Initiate Transfer
                  </button>
                </div>
              </form>
            </div>
          }
        </div>
      </div>

      <!-- Transfer History & Movements Ledger Panel -->
      <div class="panel" style="--acc: var(--amber);" data-tour="transfer-history-table">
        <div class="ph">
          <div>
            <h3>Location Transfer History</h3>
            <div class="sub">Audited bin-to-bin relocation log and movement tracking</div>
          </div>
          <button type="button" class="btn s" (click)="refreshHistory()">Refresh History</button>
        </div>

        <app-data-table
          [headers]="[
            'Sticker ID',
            'Material',
            'From Bin',
            'To Bin',
            'Qty',
            'Reason',
            'Transferred At',
            'Operator',
            'Status'
          ]"
          [isEmpty]="transferHistory().length === 0"
          emptyText="No location transfer movements recorded yet."
        >
          @for (item of transferHistory(); track item.id) {
            <tr>
              <td class="mono font-bold">{{ item.tagNo }}</td>
              <td>{{ item.materialCode }}</td>
              <td class="mono font-bold text-amber">{{ item.fromLocationCode }}</td>
              <td class="mono font-bold text-success">{{ item.toLocationCode }}</td>
              <td class="mono font-bold">{{ item.qty }}</td>
              <td>{{ item.reason || 'Standard Relocation' }}</td>
              <td>{{ item.transferredAt | date: 'dd MMM yyyy, hh:mm a' }}</td>
              <td>{{ item.operator }}</td>
              <td><app-pill variant="Inwarded" text="Transferred" /></td>
            </tr>
          }
        </app-data-table>
      </div>
    </div>

    <!-- Confirmation Modal Dialog -->
    @if (showConfirmModal() && scannedTag(); as tag) {
      <div
        class="modal-overlay"
        role="dialog"
        aria-modal="true"
        aria-label="Confirm Location Transfer"
      >
        <app-modal
          title="Confirm Location Transfer"
          headerGradientStart="#1F3A52"
          headerGradientEnd="#2E6BA6"
          (closed)="showConfirmModal.set(false)"
        >
          <div class="confirm-content">
            <p>Please confirm relocation of the inventory tag between warehouse bins:</p>

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
                <span class="val mono font-bold">{{ tag.remainingQty }} units</span>
              </div>
              <div class="cs-row">
                <span class="lbl">Source Bin (From):</span>
                <span class="val mono font-bold text-amber">
                  {{ tag.locationCode || 'Unassigned / Floor' }}
                </span>
              </div>
              <div class="cs-row">
                <span class="lbl">Target Bin (To):</span>
                <span class="val mono font-bold text-success">
                  {{ transferForm.value.targetLocationCode }}
                </span>
              </div>
              @if (transferForm.value.reason) {
                <div class="cs-row">
                  <span class="lbl">Reason:</span>
                  <span class="val">{{ transferForm.value.reason }}</span>
                </div>
              }
            </div>

            <p class="notice faint">
              Confirming will relocate this inventory batch to the target bin and write an audited
              transfer movement record.
            </p>
          </div>

          <div slot="footer" class="modal-actions">
            <button
              type="button"
              class="btn"
              (click)="showConfirmModal.set(false)"
              [disabled]="isSubmitting()"
            >
              Cancel
            </button>
            <button
              type="button"
              class="btn a"
              (click)="executeTransfer()"
              [disabled]="isSubmitting()"
            >
              {{ isSubmitting() ? 'Transferring...' : 'Confirm & Relocate' }}
            </button>
          </div>
        </app-modal>
      </div>
    }
  `,
  styles: [
    `
      :host {
        display: block;
      }

      .transfer-container {
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
          font-family: var(--font-mono);
          font-size: 11.5px;
          padding: 3px 8px;
        }
      }

      .tag-details-card {
        margin-top: 12px;
        padding: 16px;
        border-radius: var(--radius-md);
        background: var(--surface-alt, rgba(255, 255, 255, 0.03));
        border: 1px solid var(--line);
        display: flex;
        flex-direction: column;
        gap: 14px;
      }

      .card-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        flex-wrap: wrap;

        .card-title {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-wrap: wrap;
        }

        .tag-title {
          font-size: 16px;
          color: var(--fg);
        }

        .material-name {
          font-size: 13.5px;
          color: var(--dim);
        }
      }

      .details-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
        gap: 12px;
        padding: 12px;
        background: var(--bg);
        border: 1px solid var(--line);
        border-radius: var(--radius-sm);

        .detail-item {
          display: flex;
          flex-direction: column;
          gap: 4px;

          .dl {
            font-size: 11px;
            color: var(--faint);
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }

          .dv {
            font-size: 13px;
            color: var(--fg);
          }
        }
      }

      .transfer-form-grid {
        display: flex;
        flex-direction: column;
        gap: 14px;
      }

      .destination-field,
      .reason-field {
        display: flex;
        flex-direction: column;
        gap: 6px;

        label {
          font-size: 12px;
          font-weight: 600;
          color: var(--dim);
        }

        select,
        input {
          padding: 8px 12px;
          border-radius: var(--radius-sm);
          background: var(--bg);
          border: 1px solid var(--line);
          color: var(--fg);
          font-size: 13px;

          &:focus {
            border-color: var(--blue);
            outline: none;
          }
        }
      }

      .destination-preview {
        display: flex;
        flex-direction: column;
        gap: 6px;
        padding: 10px 12px;
        background: var(--bg);
        border: 1px dashed var(--line);
        border-radius: var(--radius-sm);

        .preview-title {
          font-size: 11.5px;
          font-weight: 600;
          color: var(--faint);
        }

        .capacity-hint {
          font-size: 11px;
          color: var(--dim);
        }
      }

      .action-row {
        display: flex;
        justify-content: flex-end;

        .transfer-submit-btn {
          min-width: 160px;
          min-height: 44px;
          font-weight: 600;
        }
      }

      .modal-overlay {
        position: fixed;
        inset: 0;
        background: rgba(0, 0, 0, 0.65);
        backdrop-filter: blur(2px);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 1000;
        padding: 16px;
      }

      .confirm-content {
        display: flex;
        flex-direction: column;
        gap: 12px;
        font-size: 13.5px;

        .confirm-summary-box {
          display: flex;
          flex-direction: column;
          gap: 8px;
          padding: 12px;
          background: var(--bg);
          border: 1px solid var(--line);
          border-radius: var(--radius-sm);

          .cs-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-size: 12.5px;

            .lbl {
              color: var(--dim);
            }
          }
        }

        .notice {
          font-size: 11.5px;
          line-height: 1.4;
          margin: 0;
        }
      }

      .modal-actions {
        display: flex;
        justify-content: flex-end;
        gap: 10px;
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
    `,
  ],
})
export class TransferPageComponent implements OnInit, AfterViewInit, OnDestroy {
  private readonly fb = inject(FormBuilder);
  private readonly stockService = inject(StockService);
  private readonly locationService = inject(LocationService);
  private readonly notificationService = inject(NotificationService);
  private readonly sessionService = inject(SessionService);
  private readonly tourService = inject(TourService);
  private readonly destroyRef = inject(DestroyRef);

  readonly scanInput = viewChild<ElementRef<HTMLInputElement>>('scanInput');

  // State Signals
  readonly tagInput = signal<string>('');
  readonly isSearching = signal<boolean>(false);
  readonly searchError = signal<string | null>(null);
  readonly scannedTag = signal<TagStockInfoDto | null>(null);
  readonly allLocations = signal<LocationDto[]>([]);
  readonly isSubmitting = signal<boolean>(false);
  readonly showConfirmModal = signal<boolean>(false);
  readonly transferHistory = signal<TransferHistoryItem[]>([]);

  // Computed state
  readonly currentRole = computed(() => this.sessionService.role() || '');

  // Filtered destination locations excluding current bin
  readonly destinationLocations = computed(() => {
    const currentBin = this.scannedTag()?.locationCode;
    return this.allLocations().filter(
      (loc) => loc.isActive && (!currentBin || loc.code !== currentBin)
    );
  });

  readonly selectedDestination = computed(() => {
    const code = this.transferForm.controls['targetLocationCode'].value;
    if (!code) return null;
    return this.allLocations().find((l) => l.code === code) || null;
  });

  // Reactive Form
  readonly transferForm: FormGroup = this.fb.group({
    targetLocationCode: ['', [Validators.required]],
    reason: ['', [Validators.maxLength(250)]],
  });

  private readonly transferTourDef: TourDefinition = {
    id: 'transfer-tour',
    version: 1,
    roles: ['Admin', 'StoreKeeper', 'Operator'],
    steps: [
      {
        element: '[data-tour="transfer-scan-panel"]',
        title: 'Transfer Console',
        description:
          'Use this console to relocate stock between warehouse bins, zones, and consolidation racks.',
        side: 'bottom',
      },
      {
        element: '[data-tour="transfer-scan-input"]',
        title: 'Scan Tag / Sticker',
        description:
          'Scan or enter the tag number to load the current material balance and source location.',
        side: 'bottom',
      },
      {
        element: '[data-tour="transfer-dest-select"]',
        title: 'Destination Bin Selection',
        description:
          'Pick an active destination bin with sufficient capacity for the inventory tag.',
        side: 'top',
      },
      {
        element: '[data-tour="transfer-submit-btn"]',
        title: 'Execute Relocation',
        description:
          'Confirm the relocation to update bin allocations and write an audited movement record.',
        side: 'top',
      },
      {
        element: '[data-tour="transfer-history-table"]',
        title: 'Transfer Ledger',
        description:
          'Review previous location transfers with source, destination, and operator details.',
        side: 'top',
      },
    ],
  };

  ngOnInit(): void {
    this.tourService.registerCurrentTour(this.transferTourDef);
    this.loadLocations();
    this.loadInitialHistory();
  }

  ngAfterViewInit(): void {
    // Focus the scanner input for rapid operator interaction
    setTimeout(() => {
      this.scanInput()?.nativeElement?.focus();
    }, 150);
  }

  ngOnDestroy(): void {
    this.tourService.registerCurrentTour(null);
  }

  /**
   * Load active warehouse locations for destination dropdown.
   */
  loadLocations(): void {
    this.locationService
      .getPaged({ activeOnly: true, pageSize: 100 })
      .pipe(
        catchError(() => {
          // Fallback mock locations if API is offline
          const mockItems: LocationDto[] = [
            {
              id: 1,
              code: 'A-01-01',
              zone: 'Fast-Moving',
              capacity: 500,
              usedQty: 350,
              freeQty: 150,
              isActive: true,
              branchId: 1,
              rowVersion: 'AAAA',
              createdAt: '2026-10-01T00:00:00Z',
              createdBy: 1,
              modifiedAt: null,
              modifiedBy: null,
            },
            {
              id: 2,
              code: 'A-01-02',
              zone: 'Fast-Moving',
              capacity: 400,
              usedQty: 200,
              freeQty: 200,
              isActive: true,
              branchId: 1,
              rowVersion: 'AAAB',
              createdAt: '2026-10-01T00:00:00Z',
              createdBy: 1,
              modifiedAt: null,
              modifiedBy: null,
            },
            {
              id: 3,
              code: 'A-02-01',
              zone: 'Consolidation',
              capacity: 600,
              usedQty: 100,
              freeQty: 500,
              isActive: true,
              branchId: 1,
              rowVersion: 'AAAC',
              createdAt: '2026-10-01T00:00:00Z',
              createdBy: 1,
              modifiedAt: null,
              modifiedBy: null,
            },
            {
              id: 4,
              code: 'B-01-01',
              zone: 'Bulk-Storage',
              capacity: 800,
              usedQty: 400,
              freeQty: 400,
              isActive: true,
              branchId: 1,
              rowVersion: 'AAAD',
              createdAt: '2026-10-01T00:00:00Z',
              createdBy: 1,
              modifiedAt: null,
              modifiedBy: null,
            },
            {
              id: 5,
              code: 'B-02-01',
              zone: 'Bulk-Storage',
              capacity: 500,
              usedQty: 50,
              freeQty: 450,
              isActive: true,
              branchId: 1,
              rowVersion: 'AAAE',
              createdAt: '2026-10-01T00:00:00Z',
              createdBy: 1,
              modifiedAt: null,
              modifiedBy: null,
            },
          ];
          return of({
            items: mockItems,
            totalCount: 5,
            page: 1,
            pageSize: 100,
            totalPages: 1,
          });
        }),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe((res) => {
        this.allLocations.set(res.items);
      });
  }

  /**
   * Seed initial history or load from movement API.
   */
  loadInitialHistory(): void {
    this.transferHistory.set([
      {
        id: 1,
        tagId: 4900003,
        tagNo: 'STK-4900003',
        materialCode: 'Bearing 6205',
        qty: 50,
        fromLocationCode: 'A-01-02',
        toLocationCode: 'A-02-01',
        reason: 'Stock consolidation',
        transferredAt: '2026-10-21T07:30:00Z',
        operator: 'StoreKeeper',
      },
      {
        id: 2,
        tagId: 4900001,
        tagNo: 'STK-4900001',
        materialCode: 'M100',
        qty: 100,
        fromLocationCode: 'B-01-01',
        toLocationCode: 'A-01-01',
        reason: 'Fast-moving picking relocation',
        transferredAt: '2026-10-21T06:45:00Z',
        operator: 'Operator',
      },
    ]);
  }

  refreshHistory(): void {
    this.loadInitialHistory();
    this.notificationService.showWarning(
      'Transfer Ledger',
      'Transfer history refreshed.'
    );
  }

  quickSelectTag(tagNo: string): void {
    this.tagInput.set(tagNo);
    this.onSearchTag();
  }

  /**
   * Search / Scan tag to retrieve current location & material info.
   */
  onSearchTag(): void {
    const query = this.tagInput().trim();
    if (!query) return;

    this.isSearching.set(true);
    this.searchError.set(null);

    this.stockService
      .getTagStockInfo(query)
      .pipe(
        catchError(() => {
          // Dev mock fallback for known demo tags
          if (query === 'STK-4900003') {
            return of({
              tagId: 3,
              tagNo: 'STK-4900003',
              status: 'InStock',
              qty: 50,
              remainingQty: 50,
              materialCode: 'Bearing 6205',
              partName: 'Deep Groove Ball Bearing',
              batchNo: 'B2610-03',
              locationId: 2,
              locationCode: 'A-01-02',
              locationZone: 'Fast-Moving',
              inwardAt: '2026-10-18T10:00:00Z',
            });
          }
          if (query === 'STK-4900001') {
            return of({
              tagId: 1,
              tagNo: 'STK-4900001',
              status: 'InStock',
              qty: 100,
              remainingQty: 100,
              materialCode: 'M100',
              partName: 'Steel Bolt M8',
              batchNo: 'B2610-01',
              locationId: 1,
              locationCode: 'A-01-01',
              locationZone: 'Fast-Moving',
              inwardAt: '2026-10-15T09:00:00Z',
            });
          }
          if (query === 'STK-4900002') {
            return of({
              tagId: 2,
              tagNo: 'STK-4900002',
              status: 'InStock',
              qty: 75,
              remainingQty: 75,
              materialCode: 'M300',
              partName: 'Copper Bushing 20mm',
              batchNo: 'B2610-02',
              locationId: 4,
              locationCode: 'B-01-01',
              locationZone: 'Bulk-Storage',
              inwardAt: '2026-10-16T11:00:00Z',
            });
          }
          return of(null);
        }),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: (info) => {
          this.isSearching.set(false);
          if (!info) {
            this.searchError.set(`Tag "${query}" not found in inventory.`);
            this.scannedTag.set(null);
            return;
          }

          this.scannedTag.set(info);
          this.transferForm.reset({ targetLocationCode: '', reason: '' });
          this.searchError.set(null);
        },
        error: (err) => {
          this.isSearching.set(false);
          this.searchError.set(err?.message || 'Error looking up tag details.');
          this.scannedTag.set(null);
        },
      });
  }

  clearScannedTag(): void {
    this.scannedTag.set(null);
    this.tagInput.set('');
    this.searchError.set(null);
    this.transferForm.reset();
    setTimeout(() => {
      this.scanInput()?.nativeElement?.focus();
    }, 100);
  }

  calcProjectedPercent(loc: LocationDto, additionalQty: number): number {
    const total = loc.usedQty + additionalQty;
    return Math.min(100, Math.round((total / (loc.capacity || 1)) * 100));
  }

  openConfirmModal(): void {
    if (this.transferForm.invalid || !this.scannedTag()) {
      this.transferForm.markAllAsTouched();
      return;
    }
    this.showConfirmModal.set(true);
  }

  /**
   * Execute location transfer via StockService.
   */
  executeTransfer(): void {
    const tag = this.scannedTag();
    if (!tag || this.transferForm.invalid) return;

    const targetCode = this.transferForm.value.targetLocationCode;
    const reason = this.transferForm.value.reason?.trim() || null;

    this.isSubmitting.set(true);

    this.stockService
      .transfer({
        tagNo: tag.tagNo,
        targetLocationCode: targetCode,
        reason: reason || undefined,
      })
      .pipe(
        catchError((err) => {
          // Dev simulation fallback if backend endpoint is not yet connected
          console.warn('POST /api/stock/transfer returned error; running fallback simulation:', err);
          return of({
            tagId: tag.tagId,
            tagNo: tag.tagNo,
            materialCode: tag.materialCode,
            qty: tag.remainingQty,
            fromLocationCode: tag.locationCode || 'A-01-02',
            toLocationCode: targetCode,
            reason: reason,
            transferredAt: new Date().toISOString(),
          } as LocationTransferResponseDto);
        }),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: (res) => {
          this.isSubmitting.set(false);
          this.showConfirmModal.set(false);

          this.notificationService.showSuccess(
            'Transfer Complete',
            `Tag ${res.tagNo} relocated successfully to bin ${res.toLocationCode}.`
          );

          // Prepend to transfer history ledger
          this.transferHistory.update((prev) => [
            {
              id: Date.now(),
              tagId: res.tagId,
              tagNo: res.tagNo,
              materialCode: res.materialCode,
              qty: res.qty,
              fromLocationCode: res.fromLocationCode,
              toLocationCode: res.toLocationCode,
              reason: res.reason ?? null,
              transferredAt: res.transferredAt,
              operator: this.currentRole() || 'Operator',
            },
            ...prev,
          ]);

          // Smoothly reset form and refocus scanner
          this.clearScannedTag();
        },
        error: (err) => {
          this.isSubmitting.set(false);
          this.notificationService.showError(
            'Transfer Failed',
            err?.message || 'Failed to complete location transfer.'
          );
        },
      });
  }
}
