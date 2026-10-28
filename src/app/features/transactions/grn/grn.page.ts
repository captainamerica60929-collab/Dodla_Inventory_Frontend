import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Subject, debounceTime, distinctUntilChanged } from 'rxjs';
import { DataTableComponent } from '../../../shared/components/data-table/data-table.component';
import { PillComponent } from '../../../shared/components/pill/pill.component';
import { ModalComponent } from '../../../shared/components/modal/modal.component';
import { ExcelImportWizardComponent } from '../../../shared/components/excel-import-wizard/excel-import-wizard.component';
import {
  ImportResultDto,
  ImportWizardConfig,
} from '../../../core/api/excel-import.service';
import {
  ApiCredentialDto,
  ApiCredentialService,
  FetchResultDto,
} from '../../../core/api/api-credential.service';
import {
  GrnResponseDetailDto,
  GrnResponseListItemDto,
  GrnResponseService,
} from '../../../core/api/grn-response.service';
import { NotificationService } from '../../../core/services/notification.service';
import { SessionService } from '../../../core/session/session.service';

const PLANT_REGEX = /^[A-Za-z0-9_-]{1,10}$/;
const GUID_REGEX = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

@Component({
  selector: 'app-grn-page',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    DatePipe,
    DataTableComponent,
    PillComponent,
    ModalComponent,
    ExcelImportWizardComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="grn-container">
      <!-- Top Fetch Panel -->
      <div class="panel" style="--acc: var(--amber);" data-tour="grn-fetch-panel">
        <div class="ph">
          <div>
            <h3>Live GRN Sync & Ingestion</h3>
            <div class="sub">
              Query external SAP endpoint and ingest Goods Receipt Notes into warehouse landing ledger
            </div>
          </div>
        </div>

        <div class="pb">
          <!-- Duplicate Warning Notice as requested -->
          <div class="duplicate-notice" role="note">
            ⚠️ Fetching the same range again creates duplicate rows until de-duplication rules are defined. Use Discard batch to remove a mistaken fetch.
          </div>

          <form [formGroup]="fetchForm" (ngSubmit)="runFetch()" class="fetch-form-grid">
            <div class="field">
              <label for="cred-select">API Credential *</label>
              <select id="cred-select" formControlName="credentialId">
                <option value="">Select SAP Credential...</option>
                @for (c of credentials(); track c.id) {
                  <option [value]="c.id">{{ c.name }} ({{ c.httpMethod }})</option>
                }
              </select>
              @if (fetchForm.controls.credentialId.touched && fetchForm.controls.credentialId.errors?.['required']) {
                <span class="err">Credential is required.</span>
              }
            </div>

            <div class="field">
              <label for="from-date">From Date (yyyy-MM-dd)</label>
              <input id="from-date" type="date" formControlName="fromDate" />
            </div>

            <div class="field">
              <label for="to-date">To Date (yyyy-MM-dd)</label>
              <input id="to-date" type="date" formControlName="toDate" />
            </div>

            <div class="field">
              <label for="plant-input">Plant Code</label>
              <input
                id="plant-input"
                type="text"
                class="mono"
                formControlName="plant"
                placeholder="e.g. 1000"
              />
              @if (fetchForm.controls.plant.errors?.['pattern']) {
                <span class="err">Plant must be 1-10 alphanumeric characters.</span>
              }
            </div>

            <div class="fetch-action-col">
              <button
                type="submit"
                class="btn a fetch-btn"
                data-tour="grn-fetch-btn"
                [disabled]="fetchForm.invalid || isFetching()"
              >
                {{ isFetching() ? 'Fetching...' : 'Fetch GRN' }}
              </button>
            </div>
          </form>

          <!-- Fetch Result Summary Card -->
          @if (lastFetchResult(); as res) {
            <div class="summary-card">
              <div class="summary-item">
                <span class="sl">Total Ingested</span>
                <span class="sv">{{ res.total }}</span>
              </div>
              <div class="summary-item">
                <span class="sl">Successfully Saved</span>
                <span class="sv text-success">{{ res.saved }}</span>
              </div>
              <div class="summary-item">
                <span class="sl">Error Rows</span>
                <div class="err-count-container">
                  <span class="sv text-danger">{{ res.errorRows }}</span>
                  <button
                    type="button"
                    class="btn s ghost text-danger shortcut-btn"
                    (click)="showErrorsOnly(res.fetchBatchId)"
                    title="Show errors only"
                  >
                    Show errors only
                  </button>
                </div>
              </div>
              <div class="summary-item batch-summary-item flex-end">
                <div class="batch-id-group">
                  <span class="batch-label">Batch:</span>
                  <span class="mono batch-id">{{ res.fetchBatchId }}</span>
                </div>
                <div class="batch-actions">
                  <button
                    type="button"
                    class="btn s ghost"
                    (click)="copyBatchId(res.fetchBatchId)"
                    title="Copy bare GUID to clipboard"
                  >
                    Copy ID
                  </button>
                  <button
                    type="button"
                    class="btn s a"
                    (click)="filterByBatch(res.fetchBatchId)"
                    title="Filter table by this batch ID"
                  >
                    Filter by this batch
                  </button>
                  <button
                    type="button"
                    class="btn s text-danger ghost"
                    (click)="confirmDiscardBatch(res.fetchBatchId)"
                  >
                    Discard This Batch
                  </button>
                </div>
              </div>
            </div>
          }
        </div>
      </div>

      <!-- Server-Side Paged Table & Filters Panel -->
      <div class="panel" style="--acc: var(--blue);" data-tour="grn-table">
        <div class="ph">
          <div>
            <h3>Ingested GRN Records</h3>
            <div class="sub">
              Total records: {{ totalRows() }} (Page {{ currentPage() }} of {{ totalPages() }})
            </div>
          </div>
          <div class="header-actions">
            @if (canImportGrn()) {
              <button
                type="button"
                class="btn s a touch-btn import-grn-btn"
                data-tour="grn-excel-import"
                (click)="openImportWizard()"
              >
                <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                Import GRN from Excel
              </button>
            }
            <!-- Disabled Print Sticker Placeholder -->
            <button
              type="button"
              class="btn s touch-btn"
              disabled
              title="Barcode sticker printing will be available in the next release"
            >
              Print Sticker
            </button>
          </div>
        </div>

        <!-- Filter Controls -->
        <div class="filters-bar">
          <div class="filter-field">
            <label for="filter-status">Status</label>
            <select
              id="filter-status"
              [value]="filterStatus()"
              (change)="setFilterStatus($any($event.target).value)"
            >
              <option value="">All Statuses</option>
              <option value="New">New</option>
              <option value="Processed">Processed</option>
              <option value="Error">Error</option>
            </select>
          </div>

          <div class="filter-field">
            <label for="filter-grn">GRN No</label>
            <input
              id="filter-grn"
              type="text"
              class="mono"
              placeholder="Search GRN..."
              [value]="filterGrnNo()"
              (input)="setFilterGrnNo($any($event.target).value)"
            />
          </div>

          <div class="filter-field">
            <label for="filter-batch">Batch ID</label>
            <input
              id="filter-batch"
              type="text"
              class="mono"
              placeholder="Search Batch Guid..."
              [value]="filterBatchInput()"
              (input)="onBatchInput($any($event.target).value)"
            />
            @if (batchValidationError()) {
              <span class="err-inline">{{ batchValidationError() }}</span>
            }
          </div>

          <div class="filter-field">
            <label for="page-size">Per Page</label>
            <select
              id="page-size"
              [value]="pageSize()"
              (change)="setPageSize(+$any($event.target).value)"
            >
              <option value="10">10</option>
              <option value="25">25</option>
              <option value="50">50</option>
              <option value="100">100</option>
              <option value="200">200</option>
            </select>
          </div>

          <button type="button" class="btn s" (click)="resetFilters()">Reset</button>
        </div>

        @if (isLoadingTable()) {
          <div class="pb text-center faint">Loading GRN records...</div>
        } @else {
          <app-data-table
            [headers]="[
              'GRN No',
              'GRN Date',
              'Invoice No',
              'Part Name',
              'Description',
              'Qty',
              'Plant',
              'Status',
              'Batch',
              'Action'
            ]"
            [isEmpty]="grnItems().length === 0"
            emptyText="No GRN records match your filter criteria."
          >
            @for (item of grnItems(); track item.id) {
              <tr
                tabindex="0"
                class="clickable-row"
                (click)="openDetailModal(item.id)"
                (keydown.enter)="openDetailModal(item.id)"
              >
                <td class="mono">
                  <b>{{ item.grnNo || '—' }}</b>
                </td>
                <td>
                  {{ item.grnDate ? (item.grnDate | date: 'dd MMM yyyy, hh:mm a') : '—' }}
                </td>
                <td class="mono">{{ item.invoiceNo || '—' }}</td>
                <td>{{ item.partName || '—' }}</td>
                <td class="truncate-desc" [title]="item.description || ''">
                  {{ item.description || '—' }}
                </td>
                <td class="mono font-bold">{{ item.qty ?? '—' }} {{ item.uom || '' }}</td>
                <td class="mono">{{ item.plant || '—' }}</td>
                <td data-tour="grn-status">
                  <app-pill
                    [variant]="getPillVariant(item.status)"
                    [text]="getStatusText(item.status)"
                  />
                </td>
                <td class="mono truncate-batch" [title]="item.fetchBatchId">
                  {{ item.fetchBatchId.slice(0, 8) }}...
                </td>
                <td>
                  <button
                    type="button"
                    class="btn s ghost"
                    (click)="openDetailModal(item.id); $event.stopPropagation()"
                  >
                    View
                  </button>
                </td>
              </tr>
            }
          </app-data-table>

          <!-- Pagination Footer -->
          @if (totalRows() > 0) {
            <div class="pagination-bar">
              <span class="pagination-info faint">
                Showing {{ pageRangeStart() }} - {{ pageRangeEnd() }} of {{ totalRows() }}
              </span>
              <div class="pagination-buttons">
                <button
                  type="button"
                  class="btn s"
                  [disabled]="currentPage() <= 1"
                  (click)="goToPage(currentPage() - 1)"
                >
                  Previous
                </button>
                <span class="mono page-num">{{ currentPage() }} / {{ totalPages() }}</span>
                <button
                  type="button"
                  class="btn s"
                  [disabled]="currentPage() >= totalPages()"
                  (click)="goToPage(currentPage() + 1)"
                >
                  Next
                </button>
              </div>
            </div>
          }
        }
      </div>
    </div>

    <!-- Detail & Raw JSON Modal -->
    @if (showDetailModal() && selectedDetail(); as det) {
      <div class="modal-overlay" role="dialog" aria-modal="true" aria-label="GRN Record Details">
        <app-modal [title]="'GRN Record: ' + (det.grnNo || 'ID #' + det.id)" (closed)="closeDetailModal()">
          <div class="detail-grid">
            <div class="detail-row">
              <span class="lbl">GRN No:</span>
              <span class="val mono font-bold">{{ det.grnNo || '—' }}</span>
            </div>
            <div class="detail-row">
              <span class="lbl">GRN Date:</span>
              <span class="val">{{ det.grnDate ? (det.grnDate | date: 'dd MMM yyyy, hh:mm a') : '—' }}</span>
            </div>
            <div class="detail-row">
              <span class="lbl">Material:</span>
              <span class="val"><b>{{ det.partName || '—' }}</b> ({{ det.materialCode || 'No Code' }})</span>
            </div>
            <div class="detail-row">
              <span class="lbl">Description:</span>
              <span class="val">{{ det.description || '—' }}</span>
            </div>
            <div class="detail-row">
              <span class="lbl">Quantity:</span>
              <span class="val mono font-bold">{{ det.qty ?? '—' }} {{ det.uom || '' }}</span>
            </div>
            <div class="detail-row">
              <span class="lbl">Plant / Storage:</span>
              <span class="val mono">{{ det.plant || '—' }} / {{ det.storageLocation || '—' }}</span>
            </div>
            <div class="detail-row">
              <span class="lbl">Invoice:</span>
              <span class="val">{{ det.invoiceNo || '—' }} ({{ det.invoiceDate || '—' }})</span>
            </div>
            <div class="detail-row">
              <span class="lbl">Batch No:</span>
              <span class="val mono">{{ det.batchNo || '—' }}</span>
            </div>
            <div class="detail-row">
              <span class="lbl">Vendor:</span>
              <span class="val">{{ det.vendorName || '—' }} ({{ det.vendorCode || '—' }})</span>
            </div>
            <div class="detail-row">
              <span class="lbl">PO No:</span>
              <span class="val mono">{{ det.poNo || '—' }} (Item: {{ det.poItem || '—' }})</span>
            </div>
            <div class="detail-row">
              <span class="lbl">Status:</span>
              <span class="val">
                <app-pill [variant]="getPillVariant(det.status)" [text]="getStatusText(det.status)" />
              </span>
            </div>
            @if (det.errorMessage) {
              <div class="detail-row full-width text-danger">
                <span class="lbl">Error:</span>
                <span class="val">{{ det.errorMessage }}</span>
              </div>
            }
          </div>

          <!-- Raw JSON as Safe Text Only -->
          <div class="raw-json-section">
            <div class="raw-json-header">
              <span class="font-bold">Raw JSON Payload</span>
              <button type="button" class="btn s" (click)="copyRawJson(det.rawJson)">
                Copy JSON
              </button>
            </div>
            <pre class="raw-json-pre mono">{{ det.rawJson }}</pre>
          </div>

          <div slot="footer" class="modal-actions">
            <button type="button" class="btn" (click)="closeDetailModal()">Close</button>
          </div>
        </app-modal>
      </div>
    }

    <!-- Discard Batch Confirmation Modal -->
    @if (batchToDiscard(); as batchId) {
      <div class="modal-overlay" role="dialog" aria-modal="true" aria-label="Confirm Discard Batch">
        <app-modal title="Confirm Discard Batch" (closed)="batchToDiscard.set(null)">
          <p>
            Are you sure you want to discard all records ingested under batch:
            <br />
            <b class="mono">{{ batchId }}</b>?
          </p>
          <p class="text-danger" style="margin-top: 8px;">
            This action permanently deletes the ingested landing records.
          </p>

          <div slot="footer" class="modal-actions">
            <button type="button" class="btn" (click)="batchToDiscard.set(null)">Cancel</button>
            <button
              type="button"
              class="btn a text-danger"
              [disabled]="isDiscarding()"
              (click)="executeDiscardBatch(batchId)"
            >
              {{ isDiscarding() ? 'Discarding...' : 'Yes, Discard Batch' }}
            </button>
          </div>
        </app-modal>
      </div>
    }

    <!-- Excel Import Wizard Modal -->
    @if (showImportWizard()) {
      <app-excel-import-wizard
        [config]="grnImportConfig"
        (closed)="closeImportWizard()"
        (imported)="onGrnImported($event)"
      />
    }
  `,
  styles: [`
    :host {
      display: block;
    }

    .grn-container {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .duplicate-notice {
      padding: 10px 14px;
      border-radius: var(--radius-md);
      background: var(--amberBg);
      color: var(--amberD);
      font-size: 12.5px;
      font-weight: 500;
      margin-bottom: 14px;
      border-left: 3px solid var(--amber);
    }

    .fetch-form-grid {
      display: grid;
      grid-template-columns: 1.5fr 1fr 1fr 1fr auto;
      gap: 12px;
      align-items: flex-end;

      @media (max-width: 900px) {
        grid-template-columns: 1fr;
      }
    }

    .field {
      display: flex;
      flex-direction: column;
      gap: 5px;

      label {
        font-size: 12px;
        font-weight: 600;
        color: var(--dim);
      }

      input, select {
        width: 100%;
      }

      .err {
        font-size: 11px;
        color: var(--red);
      }
    }

    .fetch-btn {
      padding: 9px 18px;
    }

    .summary-card {
      display: flex;
      gap: 24px;
      align-items: center;
      margin-top: 16px;
      padding: 14px 18px;
      background: var(--bg);
      border: 1px solid var(--line);
      border-radius: var(--radius-lg);
      flex-wrap: wrap;

      .summary-item {
        display: flex;
        flex-direction: column;

        .sl {
          font-size: 11px;
          color: var(--faint);
          font-weight: 600;
        }

        .sv {
          font-size: 18px;
          font-weight: 800;
        }

        &.flex-end {
          margin-left: auto;
          flex-direction: row;
          align-items: center;
          gap: 12px;

          .batch-id {
            font-size: 11.5px;
            color: var(--dim);
          }
        }
      }
    }

    .err-inline {
      font-size: 11px;
      color: var(--red);
      font-weight: 500;
    }

    .err-count-container {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .batch-id-group {
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .batch-label {
      font-size: 11.5px;
      font-weight: 600;
      color: var(--faint);
    }

    .touch-btn {
      min-height: 44px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
    }

    .batch-actions {
      display: flex;
      gap: 6px;
      align-items: center;
      flex-wrap: wrap;
    }

    .filters-bar {
      padding: 12px 18px;
      border-bottom: 1px solid var(--line);
      display: flex;
      gap: 12px;
      align-items: flex-end;
      flex-wrap: wrap;

      .filter-field {
        display: flex;
        flex-direction: column;
        gap: 4px;

        label {
          font-size: 11px;
          font-weight: 600;
          color: var(--faint);
        }

        input, select {
          padding: 6px 10px;
          font-size: 12.5px;
        }
      }
    }

    .clickable-row {
      cursor: pointer;
      &:hover {
        background: var(--hov);
      }
    }

    .truncate-desc {
      max-width: 220px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .truncate-batch {
      max-width: 100px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .pagination-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px 18px;
      border-top: 1px solid var(--line);
      font-size: 12.5px;

      .pagination-buttons {
        display: flex;
        gap: 8px;
        align-items: center;

        .page-num {
          padding: 0 6px;
        }
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

    .detail-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px 18px;
      font-size: 12.8px;
      margin-bottom: 14px;

      .detail-row {
        display: flex;
        gap: 8px;

        .lbl {
          color: var(--faint);
          width: 95px;
          flex-shrink: 0;
        }

        .val {
          color: var(--text);
          word-break: break-word;
        }

        &.full-width {
          grid-column: 1 / -1;
        }
      }
    }

    .raw-json-section {
      border-top: 1px solid var(--line);
      padding-top: 12px;

      .raw-json-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 8px;
      }

      .raw-json-pre {
        padding: 12px;
        background: var(--bg);
        border: 1px solid var(--line);
        border-radius: var(--radius-md);
        font-size: 11.5px;
        max-height: 220px;
        overflow-y: auto;
        white-space: pre-wrap;
        word-break: break-all;
      }
    }

    .modal-actions {
      display: flex;
      gap: 8px;
      justify-content: flex-end;
    }

    .text-success { color: var(--green); }
    .text-danger { color: var(--red); }
    .font-bold { font-weight: 700; }

    @media (max-width: 640px) {
      .summary-card {
        flex-direction: column;
        align-items: stretch;
        gap: 12px;

        .summary-item.flex-end {
          margin-left: 0;
          flex-direction: column;
          align-items: stretch;
        }

        .batch-actions {
          width: 100%;
          .btn {
            flex: 1;
          }
        }
      }

      .fetch-form-grid {
        grid-template-columns: 1fr;
      }

      .filters-bar {
        flex-direction: column;
        align-items: stretch;

        .filter-field {
          width: 100%;
        }

        .btn {
          width: 100%;
          justify-content: center;
        }
      }

      .detail-grid {
        grid-template-columns: 1fr;
      }

      .modal-overlay {
        padding: 0;
        align-items: flex-start;
      }
    }
  `],
})
export class GrnPageComponent implements OnInit {
  private readonly credService = inject(ApiCredentialService);
  private readonly grnService = inject(GrnResponseService);
  private readonly notificationService = inject(NotificationService);
  private readonly session = inject(SessionService);
  private readonly fb = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);

  readonly canImportGrn = computed(() => {
    const role = this.session.role();
    return role === 'Admin' || role === 'StoreKeeper';
  });

  readonly showImportWizard = signal<boolean>(false);
  readonly grnImportConfig: ImportWizardConfig = {
    title: 'Import Goods Receipt Notes from Excel',
    resourceName: 'GRN',
    templateUrl: '/api/grn/import-template',
    importUrl: '/api/grn/import',
    templateFileName: 'GRN_Import_Template.xlsx',
    hideModeSelector: true,
  };

  openImportWizard(): void {
    this.showImportWizard.set(true);
  }

  closeImportWizard(): void {
    this.showImportWizard.set(false);
  }

  onGrnImported(result: ImportResultDto): void {
    this.notificationService.showSuccess(
      'GRN Import Completed',
      `Successfully ingested ${result.imported} GRN records into landing ledger.`,
    );
    this.closeImportWizard();
    this.loadGrnTable();
  }

  // Credentials
  readonly credentials = signal<ApiCredentialDto[]>([]);

  // Fetch state
  readonly isFetching = signal<boolean>(false);
  readonly lastFetchResult = signal<FetchResultDto | null>(null);

  // Table state
  readonly grnItems = signal<GrnResponseListItemDto[]>([]);
  readonly totalRows = signal<number>(0);
  readonly isLoadingTable = signal<boolean>(false);

  // Filter & pagination signals
  readonly currentPage = signal<number>(1);
  readonly pageSize = signal<number>(50);
  readonly filterStatus = signal<string>('');
  readonly filterGrnNo = signal<string>('');
  readonly filterBatchId = signal<string>('');
  readonly filterBatchInput = signal<string>('');
  readonly batchValidationError = signal<string | null>(null);
  private readonly batchFilterSubject = new Subject<string>();

  // Detail Modal
  readonly showDetailModal = signal<boolean>(false);
  readonly selectedDetail = signal<GrnResponseDetailDto | null>(null);

  // Discard Modal
  readonly batchToDiscard = signal<string | null>(null);
  readonly isDiscarding = signal<boolean>(false);

  readonly fetchForm = this.fb.group({
    credentialId: ['', [Validators.required]],
    fromDate: [''],
    toDate: [''],
    plant: ['', [Validators.pattern(PLANT_REGEX)]],
  });

  readonly totalPages = computed(() => {
    const total = this.totalRows();
    const size = this.pageSize();
    return Math.max(Math.ceil(total / size), 1);
  });

  readonly pageRangeStart = computed(() => {
    if (this.totalRows() === 0) return 0;
    return (this.currentPage() - 1) * this.pageSize() + 1;
  });

  readonly pageRangeEnd = computed(() => {
    return Math.min(this.currentPage() * this.pageSize(), this.totalRows());
  });

  ngOnInit(): void {
    this.loadCredentials();
    this.loadGrnTable();

    this.batchFilterSubject
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((guid) => {
        this.filterBatchId.set(guid);
        this.currentPage.set(1);
        this.loadGrnTable();
      });
  }

  onBatchInput(rawVal: string): void {
    // Trims whitespace and removes a leading "Batch:" if pasted
    const sanitized = (rawVal || '').trim().replace(/^batch:\s*/i, '').trim();
    this.filterBatchInput.set(sanitized);

    if (!sanitized) {
      this.batchValidationError.set(null);
      this.batchFilterSubject.next('');
      return;
    }

    if (!GUID_REGEX.test(sanitized)) {
      this.batchValidationError.set('Invalid GUID format.');
      // Do not call API when invalid!
      return;
    }

    this.batchValidationError.set(null);
    this.batchFilterSubject.next(sanitized);
  }

  filterByBatch(batchId: string): void {
    const sanitized = (batchId || '').trim().replace(/^batch:\s*/i, '').trim();
    this.filterBatchInput.set(sanitized);
    this.batchValidationError.set(null);
    this.filterBatchId.set(sanitized);
    this.currentPage.set(1);
    this.loadGrnTable();
  }

  showErrorsOnly(batchId?: string): void {
    this.filterStatus.set('Error');
    if (batchId) {
      const sanitized = (batchId || '').trim().replace(/^batch:\s*/i, '').trim();
      this.filterBatchInput.set(sanitized);
      this.batchValidationError.set(null);
      this.filterBatchId.set(sanitized);
    }
    this.currentPage.set(1);
    this.loadGrnTable();
  }

  copyBatchId(batchId: string): void {
    const bareGuid = (batchId || '').trim().replace(/^batch:\s*/i, '').trim();
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(bareGuid);
      this.notificationService.showSuccess('Copied', `Batch ID ${bareGuid} copied to clipboard.`);
    }
  }

  loadCredentials(): void {
    this.credService.getAll().subscribe({
      next: (list) => this.credentials.set(list),
    });
  }

  runFetch(): void {
    if (this.fetchForm.invalid) return;

    const val = this.fetchForm.getRawValue();
    const credId = Number(val.credentialId);
    if (!credId) return;

    this.isFetching.set(true);
    this.lastFetchResult.set(null);

    this.credService
      .fetchGrn(credId, {
        fromDate: val.fromDate || null,
        toDate: val.toDate || null,
        plant: val.plant?.trim() || null,
      })
      .subscribe({
        next: (res) => {
          this.isFetching.set(false);
          this.lastFetchResult.set(res);
          this.notificationService.showSuccess(
            'GRN Ingestion Completed',
            `Fetched ${res.total} rows (${res.saved} saved, ${res.errorRows} errors).`,
          );
          // Reload table to show newly ingested rows
          this.loadGrnTable();
        },
        error: () => this.isFetching.set(false),
      });
  }

  loadGrnTable(): void {
    this.isLoadingTable.set(true);

    this.grnService
      .getPaged({
        page: this.currentPage(),
        pageSize: this.pageSize(),
        status: this.filterStatus() || null,
        grnNo: this.filterGrnNo().trim() || null,
        fetchBatchId: this.filterBatchId().trim() || null,
      })
      .subscribe({
        next: (paged) => {
          this.grnItems.set(paged.items);
          this.totalRows.set(paged.total);
          this.isLoadingTable.set(false);
        },
        error: () => this.isLoadingTable.set(false),
      });
  }

  setFilterStatus(status: string): void {
    this.filterStatus.set(status);
    this.currentPage.set(1);
    this.loadGrnTable();
  }

  setFilterGrnNo(grnNo: string): void {
    this.filterGrnNo.set(grnNo);
    this.currentPage.set(1);
    this.loadGrnTable();
  }

  setFilterBatchId(batchId: string): void {
    this.filterBatchId.set(batchId);
    this.currentPage.set(1);
    this.loadGrnTable();
  }

  setPageSize(size: number): void {
    this.pageSize.set(size);
    this.currentPage.set(1);
    this.loadGrnTable();
  }

  resetFilters(): void {
    this.filterStatus.set('');
    this.filterGrnNo.set('');
    this.filterBatchInput.set('');
    this.batchValidationError.set(null);
    this.filterBatchId.set('');
    this.currentPage.set(1);
    this.loadGrnTable();
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages()) {
      this.currentPage.set(page);
      this.loadGrnTable();
    }
  }

  openDetailModal(id: number): void {
    this.grnService.getById(id).subscribe({
      next: (detail) => {
        this.selectedDetail.set(detail);
        this.showDetailModal.set(true);
      },
    });
  }

  closeDetailModal(): void {
    this.showDetailModal.set(false);
    this.selectedDetail.set(null);
  }

  confirmDiscardBatch(batchId: string): void {
    this.batchToDiscard.set(batchId);
  }

  executeDiscardBatch(batchId: string): void {
    this.isDiscarding.set(true);
    this.grnService.discardBatch(batchId).subscribe({
      next: () => {
        this.isDiscarding.set(false);
        this.batchToDiscard.set(null);
        if (this.lastFetchResult()?.fetchBatchId === batchId) {
          this.lastFetchResult.set(null);
        }
        this.notificationService.showSuccess(
          'Batch Discarded',
          `Successfully discarded batch ${batchId}.`,
        );
        this.loadGrnTable();
      },
      error: () => this.isDiscarding.set(false),
    });
  }

  copyRawJson(rawJson: string): void {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(rawJson);
      this.notificationService.showSuccess('Copied', 'Raw JSON copied to clipboard.');
    }
  }

  getStatusText(status: string | number): string {
    if (status === 0 || status === 'New') return 'New';
    if (status === 1 || status === 'Processed') return 'Processed';
    if (status === 2 || status === 'Error') return 'Error';
    return String(status);
  }

  getPillVariant(status: string | number): string {
    const text = this.getStatusText(status);
    if (text === 'New') return 'New';
    if (text === 'Processed') return 'Processed';
    if (text === 'Error') return 'Error';
    return 'default';
  }
}
