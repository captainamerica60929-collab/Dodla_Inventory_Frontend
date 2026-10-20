import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  AbstractControl,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { Subject, catchError, of, switchMap } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MasterListComponent, MasterListFilter } from '../../../shared/components/master-list/master-list.component';
import { PillComponent } from '../../../shared/components/pill/pill.component';
import { BinBarComponent } from '../../../shared/components/bin-bar/bin-bar.component';
import { ModalComponent } from '../../../shared/components/modal/modal.component';
import { ExcelImportWizardComponent } from '../../../shared/components/excel-import-wizard/excel-import-wizard.component';
import { ImportWizardConfig } from '../../../core/api/excel-import.service';
import {
  CreateLocationDto,
  LocationDto,
  LocationFilterParams,
  LocationService,
  UpdateLocationDto,
} from '../../../core/api/location.service';
import { NotificationService } from '../../../core/services/notification.service';
import { SessionService } from '../../../core/session/session.service';

function capacityValidator(control: AbstractControl): ValidationErrors | null {
  const val = control.value;
  if (val === null || val === undefined || val === '') return null;
  const str = String(val).trim();
  // Strictly whole number (digits only), no decimals, no exponent notation
  if (!/^\d+$/.test(str)) {
    return { invalidInteger: 'Capacity must be a whole number with no decimals.' };
  }
  const num = Number(str);
  if (num < 1) {
    return { min: 'Capacity must be at least 1.' };
  }
  if (num > 2147483647) {
    return { max: 'Capacity cannot exceed 2,147,483,647.' };
  }
  return null;
}

@Component({
  selector: 'app-location-page',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MasterListComponent,
    PillComponent,
    BinBarComponent,
    ModalComponent,
    ExcelImportWizardComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-master-list
      title="Location Master"
      subtitle="Warehouse bins, zones, and storage capacities"
      accentColor="var(--teal)"
      [headers]="tableHeaders()"
      searchPlaceholder="Search bin code or zone..."
      [page]="page()"
      [pageSize]="pageSize()"
      [totalCount]="totalCount()"
      [totalPages]="totalPages()"
      [isLoading]="isLoading()"
      [isEmpty]="locations().length === 0"
      emptyText="No locations found matching your filters."
      (filterChange)="onFilterChange($event)"
      (pageChange)="onPageChange($event)"
    >
      <div slot="actions" class="actions-group">
        @if (isAdmin()) {
          <button
            type="button"
            class="btn s touch-btn"
            (click)="openImportModal()"
            data-tour="import-btn"
            aria-label="Import locations from Excel"
          >
            Import from Excel
          </button>
          <button
            type="button"
            class="btn a s touch-btn"
            (click)="openAddModal()"
            aria-label="Add new location"
          >
            + Add Location
          </button>
        }
      </div>

      <!-- Desktop Table Body -->
      <ng-container slot="table-body">
        @for (loc of locations(); track loc.id) {
          <tr tabindex="0" (keydown.enter)="isAdmin() ? openEditModal(loc) : null">
            <td class="mono"><b>{{ loc.code }}</b></td>
            <td class="mono">{{ loc.zone }}</td>
            <td class="mono">{{ loc.capacity }}</td>
            <td class="mono">{{ loc.usedQty }}</td>
            <td class="utilization-cell">
              <app-bin-bar
                [used]="loc.usedQty"
                [capacity]="loc.capacity"
                data-tour="location-bin-bar"
              />
            </td>
            <td>
              <app-pill
                [variant]="loc.isActive ? 'green' : 'default'"
                [text]="loc.isActive ? 'Active' : 'Inactive'"
              />
            </td>
            @if (isAdmin()) {
              <td class="action-cell">
                <button
                  type="button"
                  class="btn s ghost touch-btn"
                  (click)="openEditModal(loc)"
                  title="Edit Location"
                >
                  Edit
                </button>
                @if (loc.isActive) {
                  <button
                    type="button"
                    class="btn s ghost text-danger touch-btn"
                    (click)="confirmDeactivate(loc)"
                    title="Deactivate Location"
                  >
                    Deactivate
                  </button>
                }
              </td>
            }
          </tr>
        }
      </ng-container>

      <!-- Mobile Stacked Card Body (< 640px) -->
      <ng-container slot="card-body">
        @for (loc of locations(); track loc.id) {
          <div class="mobile-card" tabindex="0" (keydown.enter)="isAdmin() ? openEditModal(loc) : null">
            <div class="card-header">
              <div class="card-code mono"><b>{{ loc.code }}</b></div>
              <app-pill
                [variant]="loc.isActive ? 'green' : 'default'"
                [text]="loc.isActive ? 'Active' : 'Inactive'"
              />
            </div>
            <div class="card-meta">
              <span class="meta-label">Zone:</span> <span class="mono">{{ loc.zone }}</span>
              <span class="meta-divider">·</span>
              <span class="meta-label">Capacity:</span> <span class="mono">{{ loc.capacity }}</span>
              <span class="meta-divider">·</span>
              <span class="meta-label">Used:</span> <span class="mono">{{ loc.usedQty }}</span>
            </div>
            <div class="card-bar">
              <app-bin-bar
                [used]="loc.usedQty"
                [capacity]="loc.capacity"
                [showRow]="true"
                label="Utilization"
                data-tour="location-bin-bar"
              />
            </div>
            @if (isAdmin()) {
              <div class="card-actions">
                <button
                  type="button"
                  class="btn s ghost touch-btn"
                  (click)="openEditModal(loc)"
                >
                  Edit
                </button>
                @if (loc.isActive) {
                  <button
                    type="button"
                    class="btn s ghost text-danger touch-btn"
                    (click)="confirmDeactivate(loc)"
                  >
                    Deactivate
                  </button>
                }
              </div>
            }
          </div>
        }
      </ng-container>
    </app-master-list>

    <!-- Add Location Modal -->
    @if (showAddModal()) {
      <div class="modal-overlay" role="dialog" aria-modal="true" aria-label="Add Location">
        <app-modal title="Add New Location Bin" (closed)="closeModals()">
          @if (addModalBanner()) {
            <div class="modal-banner err" role="alert">
              {{ addModalBanner() }}
            </div>
          }

          <form [formGroup]="addForm" (ngSubmit)="submitAdd()" class="location-form">
            <div class="field">
              <label for="add-loc-code">Bin Code *</label>
              <input
                id="add-loc-code"
                type="text"
                class="mono"
                formControlName="code"
                placeholder="e.g. A-01-01"
                autofocus
              />
              @if (addForm.controls.code.touched && addForm.controls.code.errors; as errs) {
                @if (errs['required']) {
                  <span class="field-err">Location code is required.</span>
                } @else if (errs['maxlength']) {
                  <span class="field-err">Code cannot exceed 30 characters.</span>
                } @else if (errs['serverError']) {
                  <span class="field-err">{{ errs['serverError'] }}</span>
                }
              }
            </div>

            <div class="field">
              <label for="add-loc-zone">Zone *</label>
              <input
                id="add-loc-zone"
                type="text"
                class="mono"
                formControlName="zone"
                placeholder="e.g. Zone A"
              />
              @if (addForm.controls.zone.touched && addForm.controls.zone.errors; as errs) {
                @if (errs['required']) {
                  <span class="field-err">Zone is required.</span>
                } @else if (errs['maxlength']) {
                  <span class="field-err">Zone cannot exceed 20 characters.</span>
                } @else if (errs['serverError']) {
                  <span class="field-err">{{ errs['serverError'] }}</span>
                }
              }
            </div>

            <div class="field">
              <label for="add-loc-capacity">Capacity (whole units > 0) *</label>
              <input
                id="add-loc-capacity"
                type="text"
                class="mono"
                formControlName="capacity"
                placeholder="e.g. 500"
                (keydown)="onCapacityKeyDown($event)"
                data-tour="location-capacity"
              />
              @if (addForm.controls.capacity.touched && addForm.controls.capacity.errors; as errs) {
                @if (errs['required']) {
                  <span class="field-err">Capacity is required.</span>
                } @else if (errs['invalidInteger']) {
                  <span class="field-err">Capacity must be a whole number with no decimals.</span>
                } @else if (errs['min']) {
                  <span class="field-err">Capacity must be at least 1.</span>
                } @else if (errs['max']) {
                  <span class="field-err">Capacity cannot exceed 2,147,483,647.</span>
                } @else if (errs['serverError']) {
                  <span class="field-err">{{ errs['serverError'] }}</span>
                }
              }
            </div>

            <div slot="footer" class="modal-footer-actions">
              <button type="button" class="btn touch-btn" (click)="closeModals()">Cancel</button>
              <button
                type="submit"
                class="btn a touch-btn"
                [disabled]="addForm.invalid || isSubmitting()"
              >
                {{ isSubmitting() ? 'Saving...' : 'Create Location' }}
              </button>
            </div>
          </form>
        </app-modal>
      </div>
    }

    <!-- Edit Location Modal with 409 Conflict Handling -->
    @if (showEditModal() && selectedLocation(); as loc) {
      <div class="modal-overlay" role="dialog" aria-modal="true" aria-label="Edit Location">
        <app-modal [title]="'Edit Location: ' + loc.code" (closed)="closeModals()">
          <!-- 409 Concurrency Conflict Banner with Reload Button -->
          @if (conflictBanner()) {
            <div class="conflict-banner" role="alert">
              <div class="conflict-msg">
                <span class="warning-badge">⚠ Conflict</span>
                <span>This record was changed by someone else. Reload and try again</span>
              </div>
              <div class="conflict-actions">
                <button
                  type="button"
                  class="btn a s reload-btn touch-btn"
                  (click)="reloadConflictRecord(loc.id)"
                  [disabled]="isReloading()"
                >
                  @if (isReloading()) {
                    <span class="spinner" aria-hidden="true"></span>
                    <span>Reloading...</span>
                  } @else {
                    <span>Reload</span>
                  }
                </button>
                <label class="keep-edits-opt">
                  <input type="checkbox" [checked]="keepMyEdits()" (change)="keepMyEdits.set(!keepMyEdits())" />
                  <span>Keep my edits</span>
                </label>
              </div>
            </div>
          } @else if (editModalBanner()) {
            <div class="modal-banner err" role="alert">
              {{ editModalBanner() }}
            </div>
          }

          <form [formGroup]="editForm" (ngSubmit)="submitEdit()" class="location-form">
            <div class="field">
              <label>Bin Code</label>
              <input type="text" class="mono readonly-input" [value]="loc.code" readonly disabled />
            </div>

            <div class="field">
              <label for="edit-loc-zone">Zone *</label>
              <input
                id="edit-loc-zone"
                type="text"
                class="mono"
                formControlName="zone"
                placeholder="e.g. Zone A"
              />
              @if (editForm.controls.zone.touched && editForm.controls.zone.errors; as errs) {
                @if (errs['required']) {
                  <span class="field-err">Zone is required.</span>
                } @else if (errs['maxlength']) {
                  <span class="field-err">Zone cannot exceed 20 characters.</span>
                } @else if (errs['serverError']) {
                  <span class="field-err">{{ errs['serverError'] }}</span>
                }
              }
            </div>

            <div class="field">
              <label for="edit-loc-capacity">Capacity (whole units > 0) *</label>
              <input
                id="edit-loc-capacity"
                type="text"
                class="mono"
                formControlName="capacity"
                placeholder="e.g. 500"
                (keydown)="onCapacityKeyDown($event)"
                data-tour="location-capacity"
              />
              @if (editForm.controls.capacity.touched && editForm.controls.capacity.errors; as errs) {
                @if (errs['required']) {
                  <span class="field-err">Capacity is required.</span>
                } @else if (errs['invalidInteger']) {
                  <span class="field-err">Capacity must be a whole number with no decimals.</span>
                } @else if (errs['min']) {
                  <span class="field-err">Capacity must be at least 1.</span>
                } @else if (errs['max']) {
                  <span class="field-err">Capacity cannot exceed 2,147,483,647.</span>
                } @else if (errs['serverError']) {
                  <span class="field-err">{{ errs['serverError'] }}</span>
                }
              }
            </div>

            <div class="field-checkbox">
              <label>
                <input type="checkbox" formControlName="isActive" />
                <span>Active Location</span>
              </label>
            </div>

            <div slot="footer" class="modal-footer-actions">
              <button type="button" class="btn touch-btn" (click)="closeModals()">Cancel</button>
              <button
                type="submit"
                class="btn a touch-btn"
                [disabled]="editForm.invalid || isSubmitting() || !!conflictBanner()"
              >
                {{ isSubmitting() ? 'Saving...' : 'Update Location' }}
              </button>
            </div>
          </form>
        </app-modal>
      </div>
    }

    <!-- Deactivate Confirmation Modal -->
    @if (showDeactivateModal() && selectedLocation(); as loc) {
      <div class="modal-overlay" role="dialog" aria-modal="true" aria-label="Confirm Deactivation">
        <app-modal title="Deactivate Location" (closed)="closeModals()">
          <div class="confirm-body">
            <div class="warning-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
            </div>
            <p>
              Are you sure you want to deactivate location bin <b>{{ loc.code }}</b> ({{ loc.zone }})?
            </p>
            <small class="faint">
              Deactivated locations cannot be assigned for putaway. Existing stock in the bin will still be accessible for FIFO outward.
            </small>
          </div>

          <div slot="footer" class="modal-footer-actions">
            <button type="button" class="btn touch-btn" (click)="closeModals()">Cancel</button>
            <button
              type="button"
              class="btn a btn-danger touch-btn"
              [disabled]="isSubmitting()"
              (click)="submitDeactivate()"
            >
              {{ isSubmitting() ? 'Deactivating...' : 'Confirm Deactivation' }}
            </button>
          </div>
        </app-modal>
      </div>
    }

    <!-- Excel Import Wizard Modal -->
    @if (showImportModal()) {
      @defer {
        <app-excel-import-wizard
          [config]="importConfig"
          (closed)="closeImportModal()"
          (imported)="onImportSuccess()"
        />
      }
    }
  `,
  styles: [`
    :host {
      display: block;
    }

    .touch-btn {
      min-height: 44px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
    }

    .action-cell {
      display: flex;
      gap: 6px;
      align-items: center;
    }

    .utilization-cell {
      width: 140px;
    }

    .text-danger {
      color: var(--red);
      &:hover { background: var(--redBg); }
    }

    .btn-danger {
      background: var(--red) !important;
      color: #ffffff !important;
    }

    .faint {
      color: var(--faint);
    }

    /* Mobile Stacked Card View (< 640px) */
    .mobile-card {
      background: var(--card);
      border: 1px solid var(--line);
      border-radius: var(--radius-lg, 8px);
      padding: 14px;
      display: flex;
      flex-direction: column;
      gap: 10px;
      transition: background 0.15s ease;
      outline: none;

      &:focus-visible, &:hover {
        background: color-mix(in srgb, var(--teal) 5%, var(--card));
      }

      .card-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
      }

      .card-code {
        font-size: 14px;
        color: var(--text);
      }

      .card-meta {
        font-size: 12px;
        color: var(--dim);
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 6px;

        .meta-label {
          color: var(--faint);
        }

        .meta-divider {
          color: var(--line);
        }
      }

      .card-bar {
        padding-top: 2px;
      }

      .card-actions {
        display: flex;
        gap: 8px;
        margin-top: 4px;
        border-top: 1px solid var(--line);
        padding-top: 10px;

        button {
          flex: 1;
        }
      }
    }

    /* Modal Layout & Always-Visible Footer */
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

      @media (max-width: 640px) {
        padding: 0;
        align-items: flex-start;
      }
    }

    .modal-banner {
      padding: 10px 14px;
      border-radius: var(--radius-sm, 4px);
      font-size: 13px;
      margin-bottom: 12px;
      line-height: 1.4;

      &.err {
        background: rgba(193, 68, 61, 0.12);
        border: 1px solid rgba(193, 68, 61, 0.3);
        color: var(--red);
      }
    }

    .conflict-banner {
      padding: 12px 14px;
      border-radius: var(--radius-sm, 4px);
      background: rgba(232, 163, 61, 0.14);
      border: 1px solid rgba(232, 163, 61, 0.4);
      margin-bottom: 12px;
      display: flex;
      flex-direction: column;
      gap: 10px;

      .conflict-msg {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 13px;
        font-weight: 500;
        color: var(--text);

        .warning-badge {
          background: var(--amber);
          color: #141B24;
          font-weight: 700;
          font-size: 10px;
          padding: 2px 6px;
          border-radius: var(--radius-pill, 20px);
        }
      }

      .conflict-actions {
        display: flex;
        align-items: center;
        gap: 14px;
        flex-wrap: wrap;

        .reload-btn {
          min-height: 36px;
          padding: 6px 14px;
        }

        .keep-edits-opt {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 12.5px;
          color: var(--dim);
          cursor: pointer;
        }
      }
    }

    .location-form {
      display: flex;
      flex-direction: column;
      gap: 14px;
      max-height: calc(85vh - 140px);
      overflow-y: auto;
      padding-right: 4px;

      @media (max-width: 640px) {
        max-height: calc(100vh - 160px);
      }
    }

    .field {
      display: flex;
      flex-direction: column;
      gap: 6px;

      label {
        font-size: 12px;
        font-weight: 600;
        color: var(--dim);
      }

      input {
        width: 100%;
        min-height: 40px;

        @media (max-width: 640px) {
          min-height: 44px;
        }
      }

      .readonly-input {
        background: var(--bg);
        color: var(--faint);
        cursor: not-allowed;
      }
    }

    .field-checkbox {
      margin-top: 4px;
      label {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        cursor: pointer;
        font-size: 13px;
        color: var(--text);
        min-height: 44px;
      }
    }

    .field-err {
      font-size: 11.5px;
      color: var(--red);
    }

    .modal-footer-actions {
      display: flex;
      gap: 8px;
      justify-content: flex-end;
      width: 100%;
      position: sticky;
      bottom: 0;
      background: var(--card);
      padding-top: 4px;

      @media (max-width: 640px) {
        button {
          flex: 1;
        }
      }
    }

    .confirm-body {
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      gap: 12px;
      padding: 10px 0;

      .warning-icon {
        width: 48px;
        height: 48px;
        border-radius: 50%;
        background: rgba(193, 68, 61, 0.12);
        color: var(--red);
        display: flex;
        align-items: center;
        justify-content: center;

        svg {
          width: 26px;
          height: 26px;
        }
      }

      p {
        margin: 0;
        font-size: 14px;
        color: var(--text);
      }
    }

    .spinner {
      width: 13px;
      height: 13px;
      border: 2px solid rgba(20, 27, 36, 0.3);
      border-top-color: #141b24;
      border-radius: 50%;
      animation: spin 0.7s linear infinite;
      margin-right: 4px;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }
  `],
})
export class LocationPageComponent implements OnInit {
  private readonly locationService = inject(LocationService);
  private readonly notificationService = inject(NotificationService);
  private readonly session = inject(SessionService);
  private readonly fb = inject(FormBuilder);

  readonly isAdmin = computed(() => this.session.role() === 'Admin');

  readonly locations = signal<LocationDto[]>([]);
  readonly isLoading = signal<boolean>(false);
  readonly isSubmitting = signal<boolean>(false);
  readonly isReloading = signal<boolean>(false);

  // Pagination state
  readonly page = signal<number>(1);
  readonly pageSize = signal<number>(20);
  readonly totalCount = signal<number>(0);
  readonly totalPages = signal<number>(1);

  // Filter state
  readonly currentFilter = signal<MasterListFilter>({
    search: '',
    zone: '',
    activeOnly: false,
  });

  // Modal signals
  readonly showAddModal = signal<boolean>(false);
  readonly showEditModal = signal<boolean>(false);
  readonly showDeactivateModal = signal<boolean>(false);
  readonly showImportModal = signal<boolean>(false);
  readonly selectedLocation = signal<LocationDto | null>(null);

  readonly importConfig: ImportWizardConfig = {
    title: 'Import Locations from Excel',
    resourceName: 'Locations',
    templateUrl: '/api/locations/import-template',
    importUrl: '/api/locations/import',
    templateFileName: 'locations-template.xlsx',
  };

  // Error & conflict banners
  readonly addModalBanner = signal<string | null>(null);
  readonly editModalBanner = signal<string | null>(null);
  readonly conflictBanner = signal<string | null>(null);
  readonly keepMyEdits = signal<boolean>(false);

  // Current rowVersion stored in memory and sent back unchanged on PUT
  private currentRowVersion = signal<string>('');

  readonly tableHeaders = computed(() =>
    this.isAdmin()
      ? ['Bin Code', 'Zone', 'Capacity', 'Used', 'Utilization', 'Status', 'Actions']
      : ['Bin Code', 'Zone', 'Capacity', 'Used', 'Utilization', 'Status'],
  );

  private readonly querySubject = new Subject<LocationFilterParams>();

  readonly addForm = this.fb.group({
    code: ['', [Validators.required, Validators.maxLength(30)]],
    zone: ['', [Validators.required, Validators.maxLength(20)]],
    capacity: ['', [Validators.required, capacityValidator]],
  });

  readonly editForm = this.fb.group({
    zone: ['', [Validators.required, Validators.maxLength(20)]],
    capacity: ['', [Validators.required, capacityValidator]],
    isActive: [true],
  });

  constructor() {
    this.querySubject
      .pipe(
        switchMap((params) => {
          this.isLoading.set(true);
          return this.locationService.getPaged(params).pipe(
            catchError(() => {
              this.isLoading.set(false);
              return of({
                items: [],
                totalCount: 0,
                page: 1,
                pageSize: 20,
                totalPages: 1,
              });
            }),
          );
        }),
        takeUntilDestroyed(),
      )
      .subscribe((result) => {
        this.locations.set(result.items);
        this.totalCount.set(result.totalCount);
        this.page.set(result.page);
        this.pageSize.set(result.pageSize);
        this.totalPages.set(result.totalPages);
        this.isLoading.set(false);
      });
  }

  ngOnInit(): void {
    this.triggerQuery();
  }

  onCapacityKeyDown(event: KeyboardEvent): void {
    // Prevent exponent notation, signs, and decimals
    if (['e', 'E', '+', '-', '.', ','].includes(event.key)) {
      event.preventDefault();
    }
  }

  onFilterChange(filter: MasterListFilter): void {
    this.currentFilter.set(filter);
    this.page.set(1);
    this.triggerQuery();
  }

  onPageChange(newPage: number): void {
    this.page.set(newPage);
    this.triggerQuery();
  }

  private triggerQuery(): void {
    const f = this.currentFilter();
    const params: LocationFilterParams = {
      page: this.page(),
      pageSize: this.pageSize(),
      search: f.search || undefined,
      zone: f.zone || undefined,
      activeOnly: f.activeOnly ? true : undefined,
    };
    this.querySubject.next(params);
  }

  openAddModal(): void {
    if (!this.isAdmin()) return;
    this.addForm.reset();
    this.addModalBanner.set(null);
    this.showAddModal.set(true);
  }

  openEditModal(loc: LocationDto): void {
    if (!this.isAdmin()) return;
    this.selectedLocation.set(loc);
    this.currentRowVersion.set(loc.rowVersion);
    this.editForm.setValue({
      zone: loc.zone,
      capacity: String(loc.capacity),
      isActive: loc.isActive,
    });
    this.editModalBanner.set(null);
    this.conflictBanner.set(null);
    this.keepMyEdits.set(false);
    this.showEditModal.set(true);
  }

  confirmDeactivate(loc: LocationDto): void {
    if (!this.isAdmin()) return;
    this.selectedLocation.set(loc);
    this.showDeactivateModal.set(true);
  }

  closeModals(): void {
    this.showAddModal.set(false);
    this.showEditModal.set(false);
    this.showDeactivateModal.set(false);
    this.showImportModal.set(false);
    this.selectedLocation.set(null);
    this.addModalBanner.set(null);
    this.editModalBanner.set(null);
    this.conflictBanner.set(null);
  }

  openImportModal(): void {
    if (!this.isAdmin()) return;
    this.showImportModal.set(true);
  }

  closeImportModal(): void {
    this.showImportModal.set(false);
  }

  onImportSuccess(): void {
    // Refresh list keeping current filters and page
    this.triggerQuery();
  }

  submitAdd(): void {
    if (!this.isAdmin() || this.addForm.invalid || this.isSubmitting()) return;

    this.isSubmitting.set(true);
    this.addModalBanner.set(null);

    const val = this.addForm.getRawValue();
    const dto: CreateLocationDto = {
      code: val.code!.trim().toUpperCase(),
      zone: val.zone!.trim(),
      capacity: parseInt(val.capacity!.trim(), 10),
    };

    this.locationService.create(dto).subscribe({
      next: (created) => {
        this.isSubmitting.set(false);
        this.closeModals();
        this.notificationService.showSuccess(
          'Location Created',
          `Location bin ${created.code} in ${created.zone} created successfully.`,
        );
        this.triggerQuery();
      },
      error: (err) => {
        this.isSubmitting.set(false);
        this.handleFormError(err, this.addForm, this.addModalBanner);
      },
    });
  }

  submitEdit(): void {
    const loc = this.selectedLocation();
    if (!this.isAdmin() || !loc || this.editForm.invalid || this.isSubmitting()) return;

    this.isSubmitting.set(true);
    this.editModalBanner.set(null);
    this.conflictBanner.set(null);

    const val = this.editForm.getRawValue();
    const dto: UpdateLocationDto = {
      zone: val.zone!.trim(),
      capacity: parseInt(val.capacity!.trim(), 10),
      isActive: val.isActive ?? true,
      rowVersion: this.currentRowVersion(),
    };

    this.locationService.update(loc.id, dto).subscribe({
      next: (updated) => {
        this.isSubmitting.set(false);
        this.closeModals();
        this.notificationService.showSuccess(
          'Location Updated',
          `Location bin ${updated.code} updated successfully.`,
        );
        // Keep current page after an edit
        this.triggerQuery();
      },
      error: (err) => {
        this.isSubmitting.set(false);
        // Check for 409 Conflict (concurrency violation)
        if (err?.status === 409) {
          this.conflictBanner.set('This record was changed by someone else. Reload and try again');
          return;
        }
        this.handleFormError(err, this.editForm, this.editModalBanner);
      },
    });
  }

  reloadConflictRecord(id: number): void {
    this.isReloading.set(true);
    this.locationService.getById(id).subscribe({
      next: (fresh) => {
        this.isReloading.set(false);
        this.selectedLocation.set(fresh);
        // Always refresh rowVersion from the GET
        this.currentRowVersion.set(fresh.rowVersion);

        // Keep user's edits if they asked; otherwise refresh form with server values
        if (!this.keepMyEdits()) {
          this.editForm.setValue({
            zone: fresh.zone,
            capacity: String(fresh.capacity),
            isActive: fresh.isActive,
          });
        }

        // Clear conflict banner to allow re-submitting with refreshed rowVersion
        this.conflictBanner.set(null);
        this.notificationService.showSuccess(
          'Record Reloaded',
          `Location data refreshed to latest server revision.`,
        );
      },
      error: (err) => {
        this.isReloading.set(false);
        const msg = err?.error?.detail || 'Failed to reload latest location record.';
        this.notificationService.showError('Reload Failed', msg);
      },
    });
  }

  submitDeactivate(): void {
    const loc = this.selectedLocation();
    if (!this.isAdmin() || !loc || this.isSubmitting()) return;

    this.isSubmitting.set(true);
    this.locationService.delete(loc.id).subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.closeModals();
        this.notificationService.showSuccess(
          'Location Deactivated',
          `Location ${loc.code} was deactivated.`,
        );
        // Keep current page after deactivate
        this.triggerQuery();
      },
      error: (err) => {
        this.isSubmitting.set(false);
        const msg =
          err?.error?.detail ||
          err?.error?.title ||
          'Failed to deactivate location.';
        this.notificationService.showError('Deactivation Failed', msg);
      },
    });
  }

  private handleFormError(
    err: any,
    form: FormGroup,
    bannerSignal: typeof this.addModalBanner,
  ): void {
    const problem = err?.error;
    let handledField = false;

    // 400 validation errors dictionary: ProblemDetails.errors { Code: ["..."], Zone: ["..."] }
    if (problem?.errors && typeof problem.errors === 'object') {
      for (const [key, msgs] of Object.entries(problem.errors)) {
        const fieldName = key.charAt(0).toLowerCase() + key.slice(1);
        const control = form.get(fieldName);
        const msgText = Array.isArray(msgs) ? msgs.join('. ') : String(msgs);
        if (control) {
          control.setErrors({ serverError: msgText });
          control.markAsTouched();
          handledField = true;
        }
      }
    }

    // 422 handling:
    // If message mentions code exists / duplicate -> map onto code field
    // Any other 422 message -> show as banner inside modal
    const detail =
      problem?.detail ||
      problem?.title ||
      (typeof problem === 'string' ? problem : '');

    if (detail) {
      const lower = detail.toLowerCase();
      if (lower.includes('already exists') || lower.includes('duplicate')) {
        const codeControl = form.get('code');
        if (codeControl) {
          codeControl.setErrors({ serverError: detail });
          codeControl.markAsTouched();
          handledField = true;
        }
      }

      if (!handledField) {
        bannerSignal.set(detail);
      }
    } else if (!handledField) {
      bannerSignal.set('An error occurred. Please check the form and try again.');
    }
  }
}
