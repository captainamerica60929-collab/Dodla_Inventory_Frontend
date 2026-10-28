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
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Subject, catchError, of, switchMap } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MasterListComponent, MasterListFilter } from '../../../shared/components/master-list/master-list.component';
import { PillComponent } from '../../../shared/components/pill/pill.component';
import { ModalComponent } from '../../../shared/components/modal/modal.component';
import { ExcelImportWizardComponent } from '../../../shared/components/excel-import-wizard/excel-import-wizard.component';
import { ImportWizardConfig } from '../../../core/api/excel-import.service';
import {
  CreateMaterialDto,
  MaterialDto,
  MaterialFilterParams,
  MaterialService,
  UpdateMaterialDto,
} from '../../../core/api/material.service';
import { NotificationService } from '../../../core/services/notification.service';
import { SessionService } from '../../../core/session/session.service';

@Component({
  selector: 'app-material-page',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MasterListComponent,
    PillComponent,
    ModalComponent,
    ExcelImportWizardComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-master-list
      title="Material Master"
      subtitle="Catalog of raw materials, parts, and storage requirements"
      accentColor="var(--blue)"
      [headers]="tableHeaders()"
      searchPlaceholder="Search material code or name..."
      [page]="page()"
      [pageSize]="pageSize()"
      [totalCount]="totalCount()"
      [totalPages]="totalPages()"
      [isLoading]="isLoading()"
      [isEmpty]="materials().length === 0"
      emptyText="No materials found matching your filters."
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
            aria-label="Import materials from Excel"
          >
            Import from Excel
          </button>
          <button
            type="button"
            class="btn a s touch-btn"
            (click)="openAddModal()"
            aria-label="Add new material"
          >
            + Add Material
          </button>
        }
      </div>

      <!-- Desktop Table Body -->
      <ng-container slot="table-body">
        @for (m of materials(); track m.id) {
          <tr tabindex="0" (keydown.enter)="isAdmin() ? openEditModal(m) : null">
            <td class="mono"><b>{{ m.code }}</b></td>
            <td>{{ m.name }}</td>
            <td class="mono">{{ m.uom }}</td>
            <td class="mono">{{ m.zone || '—' }}</td>
            <td>
              <app-pill
                [variant]="m.isActive ? 'green' : 'default'"
                [text]="m.isActive ? 'Active' : 'Inactive'"
              />
            </td>
            @if (isAdmin()) {
              <td class="action-cell">
                <button
                  type="button"
                  class="btn s ghost touch-btn"
                  (click)="openEditModal(m)"
                  title="Edit Material"
                >
                  Edit
                </button>
                @if (m.isActive) {
                  <button
                    type="button"
                    class="btn s ghost text-danger touch-btn"
                    (click)="confirmDeactivate(m)"
                    title="Deactivate Material"
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
        @for (m of materials(); track m.id) {
          <div class="mobile-card" tabindex="0" (keydown.enter)="isAdmin() ? openEditModal(m) : null">
            <div class="card-header">
              <div class="card-code mono"><b>{{ m.code }}</b></div>
              <app-pill
                [variant]="m.isActive ? 'green' : 'default'"
                [text]="m.isActive ? 'Active' : 'Inactive'"
              />
            </div>
            <div class="card-name">{{ m.name }}</div>
            <div class="card-meta">
              <span class="meta-label">UoM:</span> <span class="mono">{{ m.uom }}</span>
              <span class="meta-divider">·</span>
              <span class="meta-label">Zone:</span> <span class="mono">{{ m.zone || '—' }}</span>
            </div>
            @if (isAdmin()) {
              <div class="card-actions">
                <button
                  type="button"
                  class="btn s ghost touch-btn"
                  (click)="openEditModal(m)"
                >
                  Edit
                </button>
                @if (m.isActive) {
                  <button
                    type="button"
                    class="btn s ghost text-danger touch-btn"
                    (click)="confirmDeactivate(m)"
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

    <!-- Add Material Modal -->
    @if (showAddModal()) {
      <div class="modal-overlay" role="dialog" aria-modal="true" aria-label="Add Material">
        <app-modal title="Add New Material" (closed)="closeModals()">
          @if (addModalBanner()) {
            <div class="modal-banner err" role="alert">
              {{ addModalBanner() }}
            </div>
          }

          <form [formGroup]="addForm" (ngSubmit)="submitAdd()" class="material-form">
            <div class="field">
              <label for="add-mat-code">Material Code *</label>
              <input
                id="add-mat-code"
                type="text"
                class="mono"
                formControlName="code"
                placeholder="e.g. MAT-001"
                autofocus
              />
              @if (addForm.controls.code.touched && addForm.controls.code.errors; as errs) {
                @if (errs['required']) {
                  <span class="field-err">Material code is required.</span>
                } @else if (errs['maxlength']) {
                  <span class="field-err">Code cannot exceed 30 characters.</span>
                } @else if (errs['serverError']) {
                  <span class="field-err">{{ errs['serverError'] }}</span>
                }
              }
            </div>

            <div class="field">
              <label for="add-mat-name">Material Name *</label>
              <input
                id="add-mat-name"
                type="text"
                formControlName="name"
                placeholder="e.g. Steel Hex Bolt M8"
              />
              @if (addForm.controls.name.touched && addForm.controls.name.errors; as errs) {
                @if (errs['required']) {
                  <span class="field-err">Material name is required.</span>
                } @else if (errs['maxlength']) {
                  <span class="field-err">Name cannot exceed 150 characters.</span>
                } @else if (errs['serverError']) {
                  <span class="field-err">{{ errs['serverError'] }}</span>
                }
              }
            </div>

            <div class="field">
              <label for="add-mat-uom">Unit of Measure (UoM) *</label>
              <input
                id="add-mat-uom"
                type="text"
                class="mono"
                formControlName="uom"
                placeholder="e.g. PCS, BOX, KG"
              />
              @if (addForm.controls.uom.touched && addForm.controls.uom.errors; as errs) {
                @if (errs['required']) {
                  <span class="field-err">UoM is required.</span>
                } @else if (errs['maxlength']) {
                  <span class="field-err">UoM cannot exceed 10 characters.</span>
                } @else if (errs['serverError']) {
                  <span class="field-err">{{ errs['serverError'] }}</span>
                }
              }
            </div>

            <div class="field">
              <label for="add-mat-zone">Zone (Storage requirement)</label>
              <input
                id="add-mat-zone"
                type="text"
                class="mono"
                formControlName="zone"
                placeholder="e.g. Zone A"
                data-tour="material-zone"
              />
              @if (addForm.controls.zone.touched && addForm.controls.zone.errors; as errs) {
                @if (errs['maxlength']) {
                  <span class="field-err">Zone cannot exceed 20 characters.</span>
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
                {{ isSubmitting() ? 'Saving...' : 'Create Material' }}
              </button>
            </div>
          </form>
        </app-modal>
      </div>
    }

    <!-- Edit Material Modal -->
    @if (showEditModal() && selectedMaterial(); as m) {
      <div class="modal-overlay" role="dialog" aria-modal="true" aria-label="Edit Material">
        <app-modal [title]="'Edit Material: ' + m.code" (closed)="closeModals()">
          @if (editModalBanner()) {
            <div class="modal-banner err" role="alert">
              {{ editModalBanner() }}
            </div>
          }

          <form [formGroup]="editForm" (ngSubmit)="submitEdit()" class="material-form">
            <div class="field">
              <label>Material Code</label>
              <input type="text" class="mono readonly-input" [value]="m.code" readonly disabled />
            </div>

            <div class="field">
              <label for="edit-mat-name">Material Name *</label>
              <input
                id="edit-mat-name"
                type="text"
                formControlName="name"
                placeholder="e.g. Steel Hex Bolt M8"
              />
              @if (editForm.controls.name.touched && editForm.controls.name.errors; as errs) {
                @if (errs['required']) {
                  <span class="field-err">Material name is required.</span>
                } @else if (errs['maxlength']) {
                  <span class="field-err">Name cannot exceed 150 characters.</span>
                } @else if (errs['serverError']) {
                  <span class="field-err">{{ errs['serverError'] }}</span>
                }
              }
            </div>

            <div class="field">
              <label for="edit-mat-uom">Unit of Measure (UoM) *</label>
              <input
                id="edit-mat-uom"
                type="text"
                class="mono"
                formControlName="uom"
                placeholder="e.g. PCS, BOX, KG"
              />
              @if (editForm.controls.uom.touched && editForm.controls.uom.errors; as errs) {
                @if (errs['required']) {
                  <span class="field-err">UoM is required.</span>
                } @else if (errs['maxlength']) {
                  <span class="field-err">UoM cannot exceed 10 characters.</span>
                } @else if (errs['serverError']) {
                  <span class="field-err">{{ errs['serverError'] }}</span>
                }
              }
            </div>

            <div class="field">
              <label for="edit-mat-zone">Zone (Storage requirement)</label>
              <input
                id="edit-mat-zone"
                type="text"
                class="mono"
                formControlName="zone"
                placeholder="e.g. Zone A"
                data-tour="material-zone"
              />
              @if (editForm.controls.zone.touched && editForm.controls.zone.errors; as errs) {
                @if (errs['maxlength']) {
                  <span class="field-err">Zone cannot exceed 20 characters.</span>
                } @else if (errs['serverError']) {
                  <span class="field-err">{{ errs['serverError'] }}</span>
                }
              }
            </div>

            <div class="field-checkbox">
              <label>
                <input type="checkbox" formControlName="isActive" />
                <span>Active Material</span>
              </label>
            </div>

            <div slot="footer" class="modal-footer-actions">
              <button type="button" class="btn touch-btn" (click)="closeModals()">Cancel</button>
              <button
                type="submit"
                class="btn a touch-btn"
                [disabled]="editForm.invalid || isSubmitting()"
              >
                {{ isSubmitting() ? 'Saving...' : 'Update Material' }}
              </button>
            </div>
          </form>
        </app-modal>
      </div>
    }

    <!-- Deactivate Confirmation Modal -->
    @if (showDeactivateModal() && selectedMaterial(); as m) {
      <div class="modal-overlay" role="dialog" aria-modal="true" aria-label="Confirm Deactivation">
        <app-modal title="Deactivate Material" (closed)="closeModals()">
          <div class="confirm-body">
            <div class="warning-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
            </div>
            <p>
              Are you sure you want to deactivate material <b>{{ m.name }}</b> (<span class="mono">{{ m.code }}</span>)?
            </p>
            <small class="faint">
              Deactivated materials cannot be assigned to new GRNs or transactions. Existing stock remains unaffected.
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
      gap: 8px;
      transition: background 0.15s ease;
      outline: none;

      &:focus-visible, &:hover {
        background: color-mix(in srgb, var(--blue) 5%, var(--card));
      }

      .card-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
      }

      .card-code {
        font-size: 13.5px;
        color: var(--text);
      }

      .card-name {
        font-size: 14px;
        font-weight: 500;
        color: var(--text);
        line-height: 1.3;
      }

      .card-meta {
        font-size: 12px;
        color: var(--dim);
        display: flex;
        align-items: center;
        gap: 6px;

        .meta-label {
          color: var(--faint);
        }

        .meta-divider {
          color: var(--line);
        }
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

    .material-form {
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
  `],
})
export class MaterialPageComponent implements OnInit {
  private readonly materialService = inject(MaterialService);
  private readonly notificationService = inject(NotificationService);
  private readonly session = inject(SessionService);
  private readonly fb = inject(FormBuilder);

  readonly isAdmin = computed(() => this.session.role() === 'Admin');

  readonly materials = signal<MaterialDto[]>([]);
  readonly isLoading = signal<boolean>(false);
  readonly isSubmitting = signal<boolean>(false);

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
  readonly selectedMaterial = signal<MaterialDto | null>(null);

  readonly importConfig: ImportWizardConfig = {
    title: 'Import Materials from Excel',
    resourceName: 'Materials',
    templateUrl: '/api/materials/import-template',
    importUrl: '/api/materials/import',
    templateFileName: 'materials-template.xlsx',
  };

  readonly addModalBanner = signal<string | null>(null);
  readonly editModalBanner = signal<string | null>(null);

  readonly tableHeaders = computed(() =>
    this.isAdmin()
      ? ['Code', 'Material Name', 'UoM', 'Zone', 'Status', 'Actions']
      : ['Code', 'Material Name', 'UoM', 'Zone', 'Status'],
  );

  private readonly querySubject = new Subject<MaterialFilterParams>();

  readonly addForm = this.fb.group({
    code: ['', [Validators.required, Validators.maxLength(30)]],
    name: ['', [Validators.required, Validators.maxLength(150)]],
    uom: ['', [Validators.required, Validators.maxLength(10)]],
    zone: ['', [Validators.maxLength(20)]],
  });

  readonly editForm = this.fb.group({
    name: ['', [Validators.required, Validators.maxLength(150)]],
    uom: ['', [Validators.required, Validators.maxLength(10)]],
    zone: ['', [Validators.maxLength(20)]],
    isActive: [true],
  });

  constructor() {
    // switchMap cancels in-flight previous requests
    this.querySubject
      .pipe(
        switchMap((params) => {
          this.isLoading.set(true);
          return this.materialService.getPaged(params).pipe(
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
        this.materials.set(result.items);
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

  onFilterChange(filter: MasterListFilter): void {
    this.currentFilter.set(filter);
    // Reset to page 1 on filter changes
    this.page.set(1);
    this.triggerQuery();
  }

  onPageChange(newPage: number): void {
    this.page.set(newPage);
    this.triggerQuery();
  }

  private triggerQuery(): void {
    const f = this.currentFilter();
    const params: MaterialFilterParams = {
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

  openEditModal(m: MaterialDto): void {
    if (!this.isAdmin()) return;
    this.selectedMaterial.set(m);
    this.editForm.setValue({
      name: m.name,
      uom: m.uom,
      zone: m.zone || '',
      isActive: m.isActive,
    });
    this.editModalBanner.set(null);
    this.showEditModal.set(true);
  }

  confirmDeactivate(m: MaterialDto): void {
    if (!this.isAdmin()) return;
    this.selectedMaterial.set(m);
    this.showDeactivateModal.set(true);
  }

  closeModals(): void {
    this.showAddModal.set(false);
    this.showEditModal.set(false);
    this.showDeactivateModal.set(false);
    this.showImportModal.set(false);
    this.selectedMaterial.set(null);
    this.addModalBanner.set(null);
    this.editModalBanner.set(null);
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
    const dto: CreateMaterialDto = {
      code: val.code!.trim().toUpperCase(),
      name: val.name!.trim(),
      uom: val.uom!.trim().toUpperCase(),
      zone: val.zone?.trim() || null,
    };

    this.materialService.create(dto).subscribe({
      next: (created) => {
        this.isSubmitting.set(false);
        this.closeModals();
        this.notificationService.showSuccess(
          'Material Created',
          `Material ${created.code} (${created.name}) created successfully.`,
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
    const mat = this.selectedMaterial();
    if (!this.isAdmin() || !mat || this.editForm.invalid || this.isSubmitting()) return;

    this.isSubmitting.set(true);
    this.editModalBanner.set(null);

    const val = this.editForm.getRawValue();
    const dto: UpdateMaterialDto = {
      name: val.name!.trim(),
      uom: val.uom!.trim().toUpperCase(),
      zone: val.zone?.trim() || null,
      isActive: val.isActive ?? true,
    };

    this.materialService.update(mat.id, dto).subscribe({
      next: (updated) => {
        this.isSubmitting.set(false);
        this.closeModals();
        this.notificationService.showSuccess(
          'Material Updated',
          `Material ${updated.code} updated successfully.`,
        );
        // Keep current page after an edit
        this.triggerQuery();
      },
      error: (err) => {
        this.isSubmitting.set(false);
        this.handleFormError(err, this.editForm, this.editModalBanner);
      },
    });
  }

  submitDeactivate(): void {
    const mat = this.selectedMaterial();
    if (!this.isAdmin() || !mat || this.isSubmitting()) return;

    this.isSubmitting.set(true);
    this.materialService.delete(mat.id).subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.closeModals();
        this.notificationService.showSuccess(
          'Material Deactivated',
          `Material ${mat.code} was deactivated.`,
        );
        // Keep current page after deactivate
        this.triggerQuery();
      },
      error: (err) => {
        this.isSubmitting.set(false);
        const msg =
          err?.error?.detail ||
          err?.error?.title ||
          'Failed to deactivate material.';
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

    // 400 validation errors dictionary: ProblemDetails.errors { Code: ["..."], Name: ["..."] }
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
