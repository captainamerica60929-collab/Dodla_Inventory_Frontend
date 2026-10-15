import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
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
import { DataTableComponent } from '../../../shared/components/data-table/data-table.component';
import { PillComponent } from '../../../shared/components/pill/pill.component';
import { ModalComponent } from '../../../shared/components/modal/modal.component';
import { ModalService } from '../../../shared/components/modal/modal.service';
import {
  BranchDto,
  BranchService,
  CreateBranchDto,
  UpdateBranchDto,
} from '../../../core/api/branch.service';
import { NotificationService } from '../../../core/services/notification.service';

@Component({
  selector: 'app-branch-page',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    DataTableComponent,
    PillComponent,
    ModalComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="panel" style="--acc: var(--amber);">
      <div class="ph">
        <div>
          <h3>Branch Master</h3>
          <div class="sub">
            Warehouse branches, storage facilities, and plant designations
          </div>
        </div>
        <button
          type="button"
          class="btn a s"
          (click)="openAddModal()"
          aria-label="Add new warehouse branch"
        >
          + Add Branch
        </button>
      </div>

      @if (isLoading()) {
        <div class="pb loading-text">Loading branch records...</div>
      } @else {
        <app-data-table
          [headers]="['Code', 'Name', 'Plant Code', 'Status', 'Actions']"
          [isEmpty]="branches().length === 0"
          emptyText="No branches found."
        >
          @for (branch of branches(); track branch.id) {
            <tr tabindex="0" (keydown.enter)="openEditModal(branch)">
              <td class="mono">
                <b>{{ branch.code }}</b>
              </td>
              <td>{{ branch.name }}</td>
              <td class="mono">
                @if (branch.plantCode) {
                  {{ branch.plantCode }}
                } @else {
                  <span class="faint">—</span>
                }
              </td>
              <td>
                <app-pill
                  [variant]="branch.isActive ? 'green' : 'default'"
                  [text]="branch.isActive ? 'Active' : 'Inactive'"
                />
              </td>
              <td class="action-cell">
                <button
                  type="button"
                  class="btn s ghost"
                  (click)="openEditModal(branch)"
                  title="Edit Branch"
                >
                  Edit
                </button>
                <button
                  type="button"
                  class="btn s ghost"
                  [ngClass]="branch.isActive ? 'text-danger' : 'text-success'"
                  (click)="toggleStatus(branch)"
                  [title]="branch.isActive ? 'Deactivate Branch' : 'Activate Branch'"
                >
                  {{ branch.isActive ? 'Deactivate' : 'Activate' }}
                </button>
              </td>
            </tr>
          }
        </app-data-table>
      }
    </div>

    <!-- Add Branch Modal -->
    @if (showAddModal()) {
      <div class="modal-overlay" role="dialog" aria-modal="true" aria-label="Add Branch">
        <app-modal title="Add New Branch" (closed)="closeModals()">
          <form [formGroup]="addForm" (ngSubmit)="submitAdd()" class="branch-form">
            <div class="field">
              <label for="branch-code">Branch Code *</label>
              <input
                id="branch-code"
                type="text"
                class="mono"
                formControlName="code"
                placeholder="e.g. BR-01"
                autofocus
              />
              @if (addForm.controls.code.touched && addForm.controls.code.errors?.['required']) {
                <span class="err">Branch code is required.</span>
              }
            </div>

            <div class="field">
              <label for="branch-name">Branch Name *</label>
              <input
                id="branch-name"
                type="text"
                formControlName="name"
                placeholder="e.g. Main Warehouse"
              />
              @if (addForm.controls.name.touched && addForm.controls.name.errors?.['required']) {
                <span class="err">Branch name is required.</span>
              }
            </div>

            <div class="field">
              <label for="plant-code">Plant Code</label>
              <input
                id="plant-code"
                type="text"
                class="mono"
                formControlName="plantCode"
                placeholder="e.g. 1000"
              />
            </div>

            <div slot="footer" class="modal-actions">
              <button type="button" class="btn" (click)="closeModals()">Cancel</button>
              <button
                type="submit"
                class="btn a"
                [disabled]="addForm.invalid || isSubmitting()"
              >
                {{ isSubmitting() ? 'Saving...' : 'Create Branch' }}
              </button>
            </div>
          </form>
        </app-modal>
      </div>
    }

    <!-- Edit Branch Modal -->
    @if (showEditModal() && selectedBranch(); as branch) {
      <div class="modal-overlay" role="dialog" aria-modal="true" aria-label="Edit Branch">
        <app-modal [title]="'Edit Branch: ' + branch.code" (closed)="closeModals()">
          <form [formGroup]="editForm" (ngSubmit)="submitEdit()" class="branch-form">
            <div class="field">
              <label>Branch Code</label>
              <input type="text" class="mono" [value]="branch.code" readonly disabled />
            </div>

            <div class="field">
              <label for="edit-name">Branch Name *</label>
              <input
                id="edit-name"
                type="text"
                formControlName="name"
                placeholder="e.g. Main Warehouse"
                autofocus
              />
              @if (editForm.controls.name.touched && editForm.controls.name.errors?.['required']) {
                <span class="err">Branch name is required.</span>
              }
            </div>

            <div class="field">
              <label for="edit-plant-code">Plant Code</label>
              <input
                id="edit-plant-code"
                type="text"
                class="mono"
                formControlName="plantCode"
                placeholder="e.g. 1000"
              />
            </div>

            <div class="field-checkbox">
              <label>
                <input type="checkbox" formControlName="isActive" />
                <span>Active Branch</span>
              </label>
            </div>

            <div slot="footer" class="modal-actions">
              <button type="button" class="btn" (click)="closeModals()">Cancel</button>
              <button
                type="submit"
                class="btn a"
                [disabled]="editForm.invalid || isSubmitting()"
              >
                {{ isSubmitting() ? 'Saving...' : 'Update Branch' }}
              </button>
            </div>
          </form>
        </app-modal>
      </div>
    }
  `,
  styles: [`
    :host {
      display: block;
    }

    .loading-text {
      color: var(--faint);
      padding: 24px;
      text-align: center;
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

    .text-success {
      color: var(--green);
      &:hover { background: var(--greenBg); }
    }

    .faint {
      color: var(--faint);
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

      @media (max-width: 640px) {
        padding: 0;
        align-items: flex-start;
      }
    }

    .branch-form {
      display: flex;
      flex-direction: column;
      gap: 14px;
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
      }

      .err {
        font-size: 11.5px;
        color: var(--red);
      }
    }

    .field-checkbox {
      margin-top: 4px;

      label {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 13px;
        cursor: pointer;
        color: var(--text);

        input {
          width: auto;
          accent-color: var(--amber);
        }
      }
    }

    .modal-actions {
      display: flex;
      gap: 8px;
      justify-content: flex-end;
      width: 100%;
    }
  `],
})
export class BranchPageComponent implements OnInit {
  private readonly branchService = inject(BranchService);
  private readonly notificationService = inject(NotificationService);
  private readonly fb = inject(FormBuilder);

  readonly branches = signal<BranchDto[]>([]);
  readonly isLoading = signal<boolean>(false);
  readonly isSubmitting = signal<boolean>(false);

  readonly showAddModal = signal<boolean>(false);
  readonly showEditModal = signal<boolean>(false);
  readonly selectedBranch = signal<BranchDto | null>(null);

  readonly addForm = this.fb.group({
    code: ['', [Validators.required, Validators.maxLength(20)]],
    name: ['', [Validators.required, Validators.maxLength(100)]],
    plantCode: [''],
  });

  readonly editForm = this.fb.group({
    name: ['', [Validators.required, Validators.maxLength(100)]],
    plantCode: [''],
    isActive: [true],
  });

  ngOnInit(): void {
    this.loadBranches();
  }

  loadBranches(): void {
    this.isLoading.set(true);
    this.branchService.getAll(false).subscribe({
      next: (data) => {
        this.branches.set(data);
        this.isLoading.set(false);
      },
      error: () => {
        this.isLoading.set(false);
      },
    });
  }

  openAddModal(): void {
    this.addForm.reset();
    this.showAddModal.set(true);
  }

  openEditModal(branch: BranchDto): void {
    this.selectedBranch.set(branch);
    this.editForm.setValue({
      name: branch.name,
      plantCode: branch.plantCode || '',
      isActive: branch.isActive,
    });
    this.showEditModal.set(true);
  }

  closeModals(): void {
    this.showAddModal.set(false);
    this.showEditModal.set(false);
    this.selectedBranch.set(null);
  }

  submitAdd(): void {
    if (this.addForm.invalid) return;

    this.isSubmitting.set(true);
    const val = this.addForm.getRawValue();
    const dto: CreateBranchDto = {
      code: val.code!.trim().toUpperCase(),
      name: val.name!.trim(),
      plantCode: val.plantCode?.trim() || null,
    };

    this.branchService.create(dto).subscribe({
      next: (created) => {
        this.isSubmitting.set(false);
        this.closeModals();
        this.notificationService.showSuccess(
          'Branch Created',
          `Branch ${created.code} (${created.name}) created successfully.`,
        );
        this.loadBranches();
      },
      error: () => {
        this.isSubmitting.set(false);
      },
    });
  }

  submitEdit(): void {
    const branch = this.selectedBranch();
    if (!branch || this.editForm.invalid) return;

    this.isSubmitting.set(true);
    const val = this.editForm.getRawValue();
    const dto: UpdateBranchDto = {
      name: val.name!.trim(),
      plantCode: val.plantCode?.trim() || null,
      isActive: !!val.isActive,
    };

    this.branchService.update(branch.id, dto).subscribe({
      next: (updated) => {
        this.isSubmitting.set(false);
        this.closeModals();
        this.notificationService.showSuccess(
          'Branch Updated',
          `Branch ${updated.code} updated successfully.`,
        );
        this.loadBranches();
      },
      error: () => {
        this.isSubmitting.set(false);
      },
    });
  }

  toggleStatus(branch: BranchDto): void {
    const dto: UpdateBranchDto = {
      name: branch.name,
      plantCode: branch.plantCode,
      isActive: !branch.isActive,
    };

    this.branchService.update(branch.id, dto).subscribe({
      next: (updated) => {
        const action = updated.isActive ? 'activated' : 'deactivated';
        this.notificationService.showSuccess(
          'Branch Status Updated',
          `Branch ${updated.code} was ${action}.`,
        );
        this.loadBranches();
      },
    });
  }
}
