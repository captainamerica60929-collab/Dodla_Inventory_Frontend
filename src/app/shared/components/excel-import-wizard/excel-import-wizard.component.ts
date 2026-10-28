import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnDestroy,
  Output,
  ViewChild,
  computed,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, Subscription, catchError, of, switchMap } from 'rxjs';
import {
  ExcelImportService,
  ImportMode,
  ImportResultDto,
  ImportRowResult,
  ImportRowStatus,
  ImportWizardConfig,
} from '../../../core/api/excel-import.service';
import { NotificationService } from '../../../core/services/notification.service';
import { ModalComponent } from '../modal/modal.component';
import { PillComponent } from '../pill/pill.component';

@Component({
  selector: 'app-excel-import-wizard',
  standalone: true,
  imports: [CommonModule, FormsModule, ModalComponent, PillComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="import-modal-overlay" role="dialog" aria-modal="true" [attr.aria-label]="config.title" data-tour="grn-excel-import">
      <app-modal [title]="config.title" (closed)="onClose()">
        <div class="wizard-container">
          <!-- Wizard Stepper Indicator -->
          <div class="wizard-stepper" role="navigation" aria-label="Import Steps">
            <div class="step-indicator" [class.active]="currentStep() === 1" [class.completed]="currentStep() > 1">
              <span class="step-num">1</span>
              <span class="step-label">Upload File</span>
            </div>
            <div class="step-line" [class.completed]="currentStep() > 1"></div>
            <div class="step-indicator" [class.active]="currentStep() === 2" [class.completed]="currentStep() > 2">
              <span class="step-num">2</span>
              <span class="step-label">Preview & Validate</span>
            </div>
            <div class="step-line" [class.completed]="currentStep() > 2"></div>
            <div class="step-indicator" [class.active]="currentStep() === 3" [class.completed]="importSuccessResult() !== null">
              <span class="step-num">3</span>
              <span class="step-label">Import</span>
            </div>
          </div>

          <!-- STEP 1: Upload & Mode -->
          @if (currentStep() === 1) {
            <div class="step-content">
              <!-- Template Download Section -->
              <div class="template-box">
                <div class="template-info">
                  <div class="template-title">Need the correct Excel format?</div>
                  <div class="template-sub">Download our pre-formatted template with instructions and column validation rules.</div>
                </div>
                <button
                  type="button"
                  class="btn s touch-btn template-btn"
                  (click)="downloadTemplate()"
                  [disabled]="isDownloadingTemplate()"
                  data-tour="import-template"
                  aria-label="Download Excel Template"
                >
                  @if (isDownloadingTemplate()) {
                    <span>Downloading...</span>
                  } @else {
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                      <polyline points="7 10 12 15 17 10"/>
                      <line x1="12" y1="15" x2="12" y2="3"/>
                    </svg>
                    <span>Download template (.xlsx)</span>
                  }
                </button>
              </div>

              <!-- Mode Selector -->
              @if (!config.hideModeSelector) {
                <div class="mode-selector-group">
                  <label class="group-label">Import Mode</label>
                  <div class="mode-options">
                    <label class="mode-option" [class.selected]="selectedMode() === 'CreateOnly'">
                      <input
                        type="radio"
                        name="importMode"
                        value="CreateOnly"
                        [checked]="selectedMode() === 'CreateOnly'"
                        (change)="onModeChange('CreateOnly')"
                      />
                      <div class="mode-text">
                        <div class="mode-name">Create new only</div>
                        <div class="mode-desc">Creates new items and skips any existing records.</div>
                      </div>
                    </label>
                    <label class="mode-option" [class.selected]="selectedMode() === 'Upsert'">
                      <input
                        type="radio"
                        name="importMode"
                        value="Upsert"
                        [checked]="selectedMode() === 'Upsert'"
                        (change)="onModeChange('Upsert')"
                      />
                      <div class="mode-text">
                        <div class="mode-name">Update existing</div>
                        <div class="mode-desc">Creates new items and updates matching existing records.</div>
                      </div>
                    </label>
                  </div>
                </div>
              }

              <!-- File Drag & Drop Zone -->
              <div
                class="dropzone"
                [class.dragover]="isDragging()"
                [class.has-file]="selectedFile() !== null"
                (dragover)="onDragOver($event)"
                (dragleave)="onDragLeave($event)"
                (drop)="onFileDrop($event)"
                (click)="fileInput.click()"
                tabindex="0"
                (keydown.enter)="fileInput.click()"
                role="button"
                aria-label="Upload Excel File"
              >
                <input
                  #fileInput
                  type="file"
                  accept=".xlsx"
                  class="hidden-file-input"
                  (change)="onFileInputChange($event)"
                />

                <div class="dropzone-content">
                  <div class="drop-icon">
                    <svg viewBox="0 0 24 24" width="36" height="36" fill="none" stroke="currentColor" stroke-width="1.8">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                      <polyline points="14 2 14 8 20 8"/>
                      <line x1="12" y1="18" x2="12" y2="12"/>
                      <line x1="9" y1="15" x2="15" y2="15"/>
                    </svg>
                  </div>
                  @if (selectedFile(); as file) {
                    <div class="file-details">
                      <div class="file-name mono"><b>{{ file.name }}</b></div>
                      <div class="file-size">{{ formatFileSize(file.size) }}</div>
                      <div class="file-change-hint">Click or drop another file to replace</div>
                    </div>
                  } @else {
                    <div class="drop-text">
                      <b>Choose a file</b> or drag & drop it here
                    </div>
                    <div class="drop-sub">Microsoft Excel (.xlsx), up to 2 MB</div>
                  }
                </div>
              </div>

              <!-- Client-side File Error Alert -->
              @if (fileError()) {
                <div class="alert-banner error" role="alert">
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="10"/>
                    <line x1="12" y1="8" x2="12" y2="12"/>
                    <line x1="12" y1="16" x2="12.01" y2="16"/>
                  </svg>
                  <span>{{ fileError() }}</span>
                </div>
              }
            </div>
          }

          <!-- STEP 2: Preview & Validation (dryRun = true) -->
          @if (currentStep() === 2) {
            <div class="step-content" data-tour="import-preview">
              @if (isPreviewLoading()) {
                <div class="loading-state">
                  <div class="spinner"></div>
                  <p>Validating Excel contents against {{ config.resourceName }} rules...</p>
                  <small class="faint">Checking duplicate codes, field constraints, and warehouse zones</small>
                </div>
              } @else if (previewError()) {
                <div class="alert-banner error" role="alert">
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="10"/>
                    <line x1="12" y1="8" x2="12" y2="12"/>
                    <line x1="12" y1="16" x2="12.01" y2="16"/>
                  </svg>
                  <div>
                    <b>Preview Failed:</b>
                    <div>{{ previewError() }}</div>
                  </div>
                </div>
              } @else if (previewResult(); as res) {
                <!-- Capped warning banner if API caps the list -->
                @if (isCapped()) {
                  <div class="alert-banner warning" role="status">
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                      <line x1="12" y1="9" x2="12" y2="13"/>
                      <line x1="12" y1="17" x2="12.01" y2="17"/>
                    </svg>
                    <span>Showing first {{ res.rows.length }} of {{ res.total }} rows (preview capped by server)</span>
                  </div>
                }

                <!-- Summary Badges (Total, Valid, Errors) -->
                <div class="metrics-grid">
                  <div class="metric-card">
                    <div class="metric-val">{{ res.total }}</div>
                    <div class="metric-lbl">Total</div>
                  </div>
                  <div class="metric-card success">
                    <div class="metric-val">{{ validCount() }}</div>
                    <div class="metric-lbl">Valid</div>
                  </div>
                  <div class="metric-card danger" [class.has-errors]="res.errorCount > 0">
                    <div class="metric-val">{{ res.errorCount }}</div>
                    <div class="metric-lbl">Errors</div>
                  </div>
                </div>

                <!-- Preview Filter & Table -->
                <div class="preview-table-section">
                  <div class="table-toolbar">
                    <label class="checkbox-filter touch-btn">
                      <input
                        type="checkbox"
                        [checked]="errorsOnlyFilter()"
                        (change)="toggleErrorsOnly()"
                      />
                      <span>Errors only ({{ res.errorCount }})</span>
                    </label>

                    <div class="table-paging-summary">
                      Showing {{ rangeStart() }}–{{ rangeEnd() }} of {{ filteredRows().length }}
                    </div>
                  </div>

                  <div class="table-container">
                    @if (filteredRows().length === 0) {
                      <div class="empty-rows-message">
                        {{ errorsOnlyFilter() ? 'No error rows found.' : 'No rows returned for preview.' }}
                      </div>
                    } @else {
                      <table class="preview-table">
                        <thead>
                          <tr>
                            <th class="col-num">#</th>
                            <th class="col-code">{{ config.resourceName === 'GRN' ? 'Part Code' : 'Code' }}</th>
                            <th class="col-status">Status</th>
                            <th class="col-msg">Validation Message</th>
                          </tr>
                        </thead>
                        <tbody>
                          @for (r of pagedRows(); track r.rowNumber) {
                            <tr [class.row-err]="r.status === 'Error'" [class.partcode-master-err]="isPartCodeMasterError(r)">
                              <td class="col-num mono">{{ r.rowNumber }}</td>
                              <td class="col-code mono">
                                <b>{{ r.code }}</b>
                                @if (isPartCodeMasterError(r)) {
                                  <span class="partcode-err-badge">PartCode Master Mismatch</span>
                                }
                              </td>
                              <td class="col-status">
                                <app-pill
                                  [variant]="getStatusVariant(r.status)"
                                  [text]="r.status"
                                />
                              </td>
                              <td class="col-msg">{{ r.message || '—' }}</td>
                            </tr>
                          }
                        </tbody>
                      </table>
                    }
                  </div>

                  <!-- Pagination Controls -->
                  @if (totalPages() > 1) {
                    <div class="table-pagination">
                      <button
                        type="button"
                        class="btn s ghost touch-btn"
                        [disabled]="previewPage() <= 1"
                        (click)="changePreviewPage(previewPage() - 1)"
                      >
                        Previous
                      </button>
                      <span class="page-indicator">Page {{ previewPage() }} of {{ totalPages() }}</span>
                      <button
                        type="button"
                        class="btn s ghost touch-btn"
                        [disabled]="previewPage() >= totalPages()"
                        (click)="changePreviewPage(previewPage() + 1)"
                      >
                        Next
                      </button>
                    </div>
                  }
                </div>
              }
            </div>
          }

          <!-- STEP 3: Confirm & Commit -->
          @if (currentStep() === 3) {
            <div class="step-content">
              @if (importSuccessResult(); as successRes) {
                <div class="success-state">
                  <div class="success-icon">
                    <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="currentColor" stroke-width="2.2">
                      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                      <polyline points="22 4 12 14.01 9 11.01"/>
                    </svg>
                  </div>
                  <h3>Import Completed Successfully</h3>
                  <p>All valid records have been saved to the database.</p>

                  <div class="metrics-grid">
                    <div class="metric-card success">
                      <div class="metric-val">{{ successRes.imported }}</div>
                      <div class="metric-lbl">Imported</div>
                    </div>
                    <div class="metric-card warning">
                      <div class="metric-val">{{ successRes.updated }}</div>
                      <div class="metric-lbl">Updated</div>
                    </div>
                    <div class="metric-card">
                      <div class="metric-val">{{ successRes.skipped }}</div>
                      <div class="metric-lbl">Skipped</div>
                    </div>
                  </div>
                </div>
              } @else {
                <div class="confirm-summary">
                  <h4>Review Import Execution</h4>
                  <div class="summary-details">
                    <div class="summary-row">
                      <span class="lbl">File:</span>
                      <span class="val mono">{{ selectedFile()?.name }}</span>
                    </div>
                    <div class="summary-row">
                      <span class="lbl">Mode:</span>
                      <span class="val">{{ selectedMode() === 'CreateOnly' ? 'Create new only' : 'Update existing' }}</span>
                    </div>
                    <div class="summary-row">
                      <span class="lbl">Valid Records:</span>
                      <span class="val font-semibold">{{ validCount() }}</span>
                    </div>
                    <div class="summary-row">
                      <span class="lbl">Errors:</span>
                      <span class="val" [class.text-danger]="(previewResult()?.errorCount ?? 0) > 0">
                        {{ previewResult()?.errorCount ?? 0 }}
                      </span>
                    </div>
                  </div>

                  @if ((previewResult()?.errorCount ?? 0) > 0) {
                    <div class="alert-banner error" role="alert">
                      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="12" cy="12" r="10"/>
                        <line x1="12" y1="8" x2="12" y2="12"/>
                        <line x1="12" y1="16" x2="12.01" y2="16"/>
                      </svg>
                      <div>
                        <b>Invalid rows detected ({{ previewResult()?.errorCount }} errors).</b>
                        <div>You must check "Skip invalid rows" to proceed with valid records, or fix the file and re-upload.</div>
                      </div>
                    </div>

                    <div class="skip-checkbox-field">
                      <label class="touch-btn">
                        <input
                          type="checkbox"
                          [checked]="skipInvalidRows()"
                          (change)="toggleSkipInvalidRows()"
                        />
                        <span><b>Skip invalid rows</b> and import {{ validCount() }} valid records</span>
                      </label>
                    </div>
                  }

                  @if (validCount() === 0) {
                    <div class="alert-banner warning" role="alert">
                      <span>No valid rows found to import in this file.</span>
                    </div>
                  }

                  @if (commitError()) {
                    <div class="alert-banner error" role="alert">
                      <span>{{ commitError() }}</span>
                    </div>
                  }
                </div>
              }
            </div>
          }
        </div>

        <!-- Sticky Footer Actions -->
        <div slot="footer" class="wizard-footer">
          @if (importSuccessResult()) {
            <button
              type="button"
              class="btn a touch-btn"
              (click)="onClose()"
            >
              Done
            </button>
          } @else {
            <div class="footer-left">
              @if (currentStep() > 1) {
                <button
                  type="button"
                  class="btn ghost touch-btn"
                  (click)="goToPreviousStep()"
                  [disabled]="isSubmitting() || isPreviewLoading()"
                >
                  Back
                </button>
              }
            </div>

            <div class="footer-right">
              <button
                type="button"
                class="btn touch-btn"
                (click)="onClose()"
                [disabled]="isSubmitting() || isPreviewLoading()"
              >
                Cancel
              </button>

              @if (currentStep() === 1) {
                <button
                  type="button"
                  class="btn a touch-btn"
                  (click)="goToStep2()"
                  [disabled]="!selectedFile() || fileError() !== null"
                >
                  Next: Preview
                </button>
              } @else if (currentStep() === 2) {
                <button
                  type="button"
                  class="btn a touch-btn"
                  (click)="goToStep3()"
                  [disabled]="isPreviewLoading() || previewError() !== null"
                >
                  Next: Review & Import
                </button>
              } @else if (currentStep() === 3) {
                <button
                  type="button"
                  class="btn a btn-primary touch-btn"
                  (click)="executeCommit()"
                  [disabled]="isImportDisabled()"
                >
                  {{ isSubmitting() ? 'Importing...' : 'Import' }}
                </button>
              }
            </div>
          }
        </div>
      </app-modal>
    </div>
  `,
  styles: [`
    :host { display: block; }
    .step-content { display: flex; flex-direction: column; gap: 12px; }
    .template-box {
      display: flex; align-items: center; justify-content: space-between; gap: 10px;
      padding: 10px 12px; background: rgba(37,99,235,0.05); border: 1px solid rgba(37,99,235,0.2); border-radius: var(--radius-md, 6px);
      @media (max-width: 640px) { flex-direction: column; align-items: stretch; }
    }
    .template-title { font-size: 13px; font-weight: 600; color: var(--text); }
    .template-sub { font-size: 11px; color: var(--dim); }
    .template-btn { display: inline-flex; align-items: center; gap: 6px; }
    .mode-selector-group { display: flex; flex-direction: column; gap: 6px; }
    .group-label { font-size: 12px; font-weight: 600; color: var(--dim); }
    .mode-options {
      display: grid; grid-template-columns: 1fr 1fr; gap: 8px;
      @media (max-width: 640px) { grid-template-columns: 1fr; }
    }
    .mode-option {
      display: flex; align-items: flex-start; gap: 8px; padding: 10px;
      border: 1px solid var(--line); border-radius: var(--radius-md, 6px); cursor: pointer; background: var(--card);
      &.selected { border-color: var(--blue, #2563eb); background: rgba(37,99,235,0.04); }
      .mode-name { font-size: 12.5px; font-weight: 600; color: var(--text); }
      .mode-desc { font-size: 11px; color: var(--dim); }
    }
    .hidden-file-input { display: none; }
    .dropzone-content { display: flex; flex-direction: column; align-items: center; gap: 4px; }
    .drop-icon { color: var(--dim); }
    .drop-text { font-size: 13px; color: var(--text); }
    .drop-sub { font-size: 11px; color: var(--faint); }
    .file-details { display: flex; flex-direction: column; align-items: center; gap: 3px; }
    .file-name { font-size: 13px; color: var(--text); }
    .file-size { font-size: 11px; color: var(--dim); }
    .file-change-hint { font-size: 11px; color: var(--blue, #2563eb); }
    .preview-table-section { display: flex; flex-direction: column; gap: 6px; }
    .table-toolbar { display: flex; align-items: center; justify-content: space-between; font-size: 12px; }
    .checkbox-filter { display: inline-flex; align-items: center; gap: 6px; cursor: pointer; color: var(--text); }
    .table-paging-summary { color: var(--dim); font-size: 11px; }
    .table-container {
      border: 1px solid var(--line); border-radius: var(--radius-md, 6px); overflow-x: auto;
      background: var(--card); max-height: 250px;
    }
    .empty-rows-message { padding: 18px; text-align: center; color: var(--dim); font-size: 12px; }
    .table-pagination { display: flex; align-items: center; justify-content: flex-end; gap: 10px; }
    .page-indicator { font-size: 11px; color: var(--dim); }
    .confirm-summary { display: flex; flex-direction: column; gap: 10px; h4 { margin: 0; font-size: 14px; } }
    .summary-details {
      background: var(--bg); border: 1px solid var(--line); border-radius: var(--radius-md, 6px);
      padding: 10px 12px; display: flex; flex-direction: column; gap: 6px;
    }
    .summary-row {
      display: flex; justify-content: space-between; font-size: 12px;
      .lbl { color: var(--dim); }
      .val { color: var(--text); }
      .text-danger { color: var(--red, #c1443d); font-weight: 600; }
    }
    .skip-checkbox-field label { display: inline-flex; align-items: center; gap: 6px; cursor: pointer; font-size: 12px; color: var(--text); }
    .loading-state {
      display: flex; flex-direction: column; align-items: center; padding: 28px 12px; gap: 8px; text-align: center;
      p { margin: 0; font-size: 13px; font-weight: 500; }
    }
    .spinner {
      width: 24px; height: 24px; border: 2px solid var(--line); border-top-color: var(--blue, #2563eb);
      border-radius: 50%; animation: spin 0.8s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
    .success-state {
      display: flex; flex-direction: column; align-items: center; text-align: center; gap: 8px; padding: 16px;
      .success-icon { width: 48px; height: 48px; border-radius: 50%; background: rgba(22,163,74,0.12); color: var(--green, #16a34a); display: flex; align-items: center; justify-content: center; }
      h3 { margin: 0; font-size: 15px; }
      p { margin: 0; font-size: 12px; color: var(--dim); }
      .metrics-grid { width: 100%; max-width: 380px; margin-top: 6px; }
    }
    .alert-banner {
      display: flex; align-items: center; gap: 8px; padding: 8px 10px; border-radius: var(--radius-sm, 4px); font-size: 11.5px;
      &.error { background: rgba(193,68,61,0.1); border: 1px solid rgba(193,68,61,0.3); color: var(--red, #c1443d); }
      &.warning { background: rgba(217,119,6,0.1); border: 1px solid rgba(217,119,6,0.3); color: var(--amber, #d97706); }
    }
    .wizard-footer {
      display: flex; align-items: center; justify-content: space-between; width: 100%; gap: 8px;
      .footer-left { display: flex; gap: 8px; }
      .footer-right { display: flex; gap: 8px; margin-left: auto; }
      @media (max-width: 640px) { flex-direction: column; .footer-left, .footer-right { width: 100%; button { flex: 1; } } }
    }
    .partcode-master-err {
      background: rgba(193, 68, 61, 0.08) !important;
      border-left: 3px solid var(--red, #C1443D);

      .partcode-err-badge {
        display: inline-block;
        margin-left: 8px;
        font-size: 10.5px;
        font-weight: 700;
        color: var(--red);
        background: var(--redBg);
        padding: 2px 6px;
        border-radius: 4px;
        border: 1px solid rgba(193, 68, 61, 0.25);
      }
    }
    .touch-btn { min-height: 44px; display: inline-flex; align-items: center; justify-content: center; }
    .btn-primary { background: var(--blue, #2563eb) !important; color: #fff !important; }
  `],
})
export class ExcelImportWizardComponent implements OnDestroy {
  private readonly excelService = inject(ExcelImportService);
  private readonly notificationService = inject(NotificationService);

  isPartCodeMasterError(row: ImportRowResult): boolean {
    if (row.status !== 'Error') return false;
    const msg = (row.message || '').toLowerCase();
    const code = (row.code || '').toLowerCase();
    return (
      msg.includes('part') ||
      msg.includes('material') ||
      msg.includes('master') ||
      code.includes('unknown') ||
      code.includes('invalid') ||
      row.status === 'Error'
    );
  }

  @Input({ required: true }) config!: ImportWizardConfig;
  @Output() closed = new EventEmitter<void>();
  @Output() imported = new EventEmitter<ImportResultDto>();

  @ViewChild('fileInput') fileInputRef?: ElementRef<HTMLInputElement>;

  // Wizard State
  readonly currentStep = signal<1 | 2 | 3>(1);
  readonly selectedMode = signal<ImportMode>('CreateOnly');
  readonly selectedFile = signal<File | null>(null);
  readonly fileError = signal<string | null>(null);
  readonly isDragging = signal<boolean>(false);
  readonly isDownloadingTemplate = signal<boolean>(false);

  // Step 2 Preview State
  readonly isPreviewLoading = signal<boolean>(false);
  readonly previewResult = signal<ImportResultDto | null>(null);
  readonly previewError = signal<string | null>(null);
  readonly errorsOnlyFilter = signal<boolean>(false);
  readonly previewPage = signal<number>(1);
  readonly pageSize = 50;

  // Step 3 Commit State
  readonly skipInvalidRows = signal<boolean>(false);
  readonly isSubmitting = signal<boolean>(false);
  readonly commitError = signal<string | null>(null);
  readonly importSuccessResult = signal<ImportResultDto | null>(null);

  // Subject to cancel any in-flight preview request if file or mode changes
  private readonly previewSubject = new Subject<{ file: File; mode: ImportMode }>();
  private readonly previewSub: Subscription;

  // Computed values
  readonly isCapped = computed(() => {
    const res = this.previewResult();
    return res ? res.rows.length < res.total : false;
  });

  readonly filteredRows = computed<ImportRowResult[]>(() => {
    const res = this.previewResult();
    if (!res) return [];
    if (this.errorsOnlyFilter()) {
      return res.rows.filter((r) => r.status === 'Error');
    }
    return res.rows;
  });

  readonly totalPages = computed(() => {
    const total = this.filteredRows().length;
    return Math.max(1, Math.ceil(total / this.pageSize));
  });

  readonly pagedRows = computed<ImportRowResult[]>(() => {
    const rows = this.filteredRows();
    const page = this.previewPage();
    const start = (page - 1) * this.pageSize;
    return rows.slice(start, start + this.pageSize);
  });

  readonly rangeStart = computed(() => {
    if (this.filteredRows().length === 0) return 0;
    return (this.previewPage() - 1) * this.pageSize + 1;
  });

  readonly rangeEnd = computed(() => {
    const total = this.filteredRows().length;
    return Math.min(this.previewPage() * this.pageSize, total);
  });

  readonly validCount = computed(() => {
    const res = this.previewResult();
    if (!res) return 0;
    return this.selectedMode() === 'CreateOnly'
      ? res.newCount
      : res.newCount + res.existsCount;
  });

  readonly isImportDisabled = computed(() => {
    if (this.isSubmitting()) return true;
    const res = this.previewResult();
    if (!res) return true;
    if (res.errorCount > 0 && !this.skipInvalidRows()) return true;
    if (this.validCount() === 0) return true;
    return false;
  });

  constructor() {
    this.previewSub = this.previewSubject
      .pipe(
        switchMap(({ file, mode }) => {
          this.isPreviewLoading.set(true);
          this.previewError.set(null);
          this.previewResult.set(null);
          this.previewPage.set(1);

          return this.excelService
            .executeImport(this.config.importUrl, file, mode, true, false)
            .pipe(
              catchError((err) => {
                const msg =
                  err?.error?.detail ||
                  err?.error?.title ||
                  err?.message ||
                  'Failed to generate import preview.';
                this.previewError.set(msg);
                return of(null);
              }),
            );
        }),
      )
      .subscribe((res) => {
        this.isPreviewLoading.set(false);
        if (res) {
          this.previewResult.set(res);
        }
      });
  }

  ngOnDestroy(): void {
    this.previewSub.unsubscribe();
  }

  onModeChange(mode: ImportMode): void {
    this.selectedMode.set(mode);
    // If in Step 2, re-trigger preview with the new mode
    if (this.currentStep() === 2 && this.selectedFile()) {
      this.triggerPreview();
    }
  }

  downloadTemplate(): void {
    if (this.isDownloadingTemplate()) return;
    this.isDownloadingTemplate.set(true);

    this.excelService.downloadTemplate(this.config.templateUrl, this.config.templateFileName).subscribe({
      next: (blob) => {
        this.isDownloadingTemplate.set(false);
        this.excelService.saveBlob(blob, this.config.templateFileName);
        this.notificationService.showSuccess(
          'Template Downloaded',
          `Template ${this.config.templateFileName} downloaded successfully.`,
        );
      },
      error: () => {
        this.isDownloadingTemplate.set(false);
        this.notificationService.showError(
          'Download Failed',
          'Could not download the Excel template. Please try again.',
        );
      },
    });
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging.set(true);
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging.set(false);
  }

  onFileDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging.set(false);

    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      this.handleFile(files[0]);
    }
  }

  onFileInputChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.handleFile(input.files[0]);
    }
  }

  handleFile(file: File): void {
    this.fileError.set(null);

    // Extension check: .xlsx only
    if (!file.name.toLowerCase().endsWith('.xlsx')) {
      this.fileError.set('Only .xlsx Excel files are supported. Please choose a valid .xlsx file.');
      this.selectedFile.set(null);
      return;
    }

    // Size check: 2 MB max (2 * 1024 * 1024 bytes)
    const maxSize = 2 * 1024 * 1024;
    if (file.size > maxSize) {
      this.fileError.set(
        `File size (${this.formatFileSize(file.size)}) exceeds the maximum allowed limit of 2 MB.`,
      );
      this.selectedFile.set(null);
      return;
    }

    this.selectedFile.set(file);

    // If currently on Step 2, re-trigger preview with the new file
    if (this.currentStep() === 2) {
      this.triggerPreview();
    }
  }

  goToStep2(): void {
    if (!this.selectedFile() || this.fileError()) return;
    this.currentStep.set(2);
    this.triggerPreview();
  }

  goToStep3(): void {
    if (this.isPreviewLoading() || this.previewError()) return;
    this.currentStep.set(3);
  }

  goToPreviousStep(): void {
    if (this.currentStep() === 3) {
      this.currentStep.set(2);
    } else if (this.currentStep() === 2) {
      this.currentStep.set(1);
    }
  }

  triggerPreview(): void {
    const file = this.selectedFile();
    if (!file) return;
    this.previewSubject.next({ file, mode: this.selectedMode() });
  }

  toggleErrorsOnly(): void {
    this.errorsOnlyFilter.set(!this.errorsOnlyFilter());
    this.previewPage.set(1);
  }

  changePreviewPage(page: number): void {
    if (page >= 1 && page <= this.totalPages()) {
      this.previewPage.set(page);
    }
  }

  toggleSkipInvalidRows(): void {
    this.skipInvalidRows.set(!this.skipInvalidRows());
  }

  executeCommit(): void {
    const file = this.selectedFile();
    if (!file || this.isImportDisabled()) return;

    this.isSubmitting.set(true);
    this.commitError.set(null);

    this.excelService
      .executeImport(
        this.config.importUrl,
        file,
        this.selectedMode(),
        false,
        this.skipInvalidRows(),
      )
      .subscribe({
        next: (result) => {
          this.isSubmitting.set(false);
          this.importSuccessResult.set(result);
          this.notificationService.showSuccess(
            'Import Successful',
            `Successfully processed: ${result.imported} imported, ${result.updated} updated, ${result.skipped} skipped.`,
          );
          this.imported.emit(result);
        },
        error: (err) => {
          this.isSubmitting.set(false);
          const msg =
            err?.error?.detail ||
            err?.error?.title ||
            'Import failed. Please verify your data and try again.';
          this.commitError.set(msg);
        },
      });
  }

  onClose(): void {
    this.closed.emit();
  }

  getStatusVariant(status: ImportRowStatus): 'green' | 'amber' | 'red' | 'default' {
    switch (status) {
      case 'New':
      case 'Imported':
        return 'green';
      case 'Exists':
      case 'Updated':
        return 'amber';
      case 'Error':
        return 'red';
      case 'Skipped':
      default:
        return 'default';
    }
  }

  formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }
}
