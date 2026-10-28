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
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { DataTableComponent } from '../../../shared/components/data-table/data-table.component';
import { PillComponent } from '../../../shared/components/pill/pill.component';
import { ModalComponent } from '../../../shared/components/modal/modal.component';
import {
  CreateEmployeeDto,
  EmployeeDto,
  EmployeeService,
  UpdateEmployeeDto,
} from '../../../core/api/employee.service';
import { NotificationService } from '../../../core/services/notification.service';
import { SessionService } from '../../../core/session/session.service';

@Component({
  selector: 'app-employee-page',
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
    <div class="panel" style="--acc: var(--purple);">
      <div class="ph">
        <div>
          <h3>Employee Master</h3>
          <div class="sub">Warehouse staff, departments, and designations</div>
        </div>
        <div class="ph-actions">
          <input
            type="search"
            class="search-input"
            placeholder="Search employee..."
            [value]="searchTerm()"
            (input)="onSearch($event)"
            aria-label="Search employees"
          />
          @if (isAdmin()) {
            <button
              type="button"
              class="btn a s"
              (click)="openAddModal()"
              aria-label="Add new employee"
            >
              + Add Employee
            </button>
          }
        </div>
      </div>

      @if (isLoading()) {
        <div class="pb loading-text">Loading employee records...</div>
      } @else {
        <app-data-table
          [headers]="tableHeaders()"
          [isEmpty]="filteredEmployees().length === 0"
          emptyText="No employees found."
        >
          @for (emp of filteredEmployees(); track emp.id) {
            <tr tabindex="0" (keydown.enter)="isAdmin() ? openEditModal(emp) : null">
              <td class="mono"><b>{{ emp.code }}</b></td>
              <td>{{ emp.name }}</td>
              <td>{{ emp.department || '—' }}</td>
              <td>{{ emp.designation || '—' }}</td>
              <td class="mono">{{ emp.phone || '—' }}</td>
              <td>
                <app-pill
                  [variant]="emp.isActive ? 'green' : 'default'"
                  [text]="emp.isActive ? 'Active' : 'Inactive'"
                />
              </td>
              @if (isAdmin()) {
                <td class="action-cell">
                  <button
                    type="button"
                    class="btn s ghost"
                    (click)="openEditModal(emp)"
                    title="Edit Employee"
                  >
                    Edit
                  </button>
                  @if (emp.isActive) {
                    <button
                      type="button"
                      class="btn s ghost text-danger"
                      (click)="confirmDeactivate(emp)"
                      title="Deactivate Employee"
                    >
                      Deactivate
                    </button>
                  }
                </td>
              }
            </tr>
          }
        </app-data-table>
      }
    </div>

    <!-- Add Employee Modal -->
    @if (showAddModal()) {
      <div class="modal-overlay" role="dialog" aria-modal="true" aria-label="Add Employee">
        <app-modal title="Add New Employee" (closed)="closeModals()">
          <form [formGroup]="addForm" (ngSubmit)="submitAdd()" class="emp-form">
            <div class="field">
              <label for="emp-code">Employee Code *</label>
              <input
                id="emp-code"
                type="text"
                class="mono"
                formControlName="code"
                placeholder="e.g. EMP-01"
                autofocus
              />
              @if (addForm.controls.code.touched && addForm.controls.code.errors?.['required']) {
                <span class="err">Employee code is required.</span>
              }
            </div>

            <div class="field">
              <label for="emp-name">Full Name *</label>
              <input
                id="emp-name"
                type="text"
                formControlName="name"
                placeholder="e.g. Ravi Kumar"
              />
              @if (addForm.controls.name.touched && addForm.controls.name.errors?.['required']) {
                <span class="err">Full name is required.</span>
              }
            </div>

            <div class="field">
              <label for="emp-dept">Department</label>
              <input
                id="emp-dept"
                type="text"
                formControlName="department"
                placeholder="e.g. Stores / Logistics"
              />
            </div>

            <div class="field">
              <label for="emp-desig">Designation</label>
              <input
                id="emp-desig"
                type="text"
                formControlName="designation"
                placeholder="e.g. Store Keeper / Supervisor"
              />
            </div>

            <div class="field">
              <label for="emp-phone">Phone Number</label>
              <input
                id="emp-phone"
                type="tel"
                class="mono"
                formControlName="phone"
                placeholder="e.g. +91 98765 43210"
              />
            </div>

            <div slot="footer" class="modal-actions">
              <button type="button" class="btn" (click)="closeModals()">Cancel</button>
              <button
                type="submit"
                class="btn a"
                [disabled]="addForm.invalid || isSubmitting()"
              >
                {{ isSubmitting() ? 'Saving...' : 'Create Employee' }}
              </button>
            </div>
          </form>
        </app-modal>
      </div>
    }

    <!-- Edit Employee Modal -->
    @if (showEditModal() && selectedEmployee(); as emp) {
      <div class="modal-overlay" role="dialog" aria-modal="true" aria-label="Edit Employee">
        <app-modal [title]="'Edit Employee: ' + emp.code" (closed)="closeModals()">
          <form [formGroup]="editForm" (ngSubmit)="submitEdit()" class="emp-form">
            <div class="field">
              <label>Employee Code</label>
              <input type="text" class="mono" [value]="emp.code" readonly disabled />
            </div>

            <div class="field">
              <label for="edit-name">Full Name *</label>
              <input
                id="edit-name"
                type="text"
                formControlName="name"
                placeholder="e.g. Ravi Kumar"
              />
              @if (editForm.controls.name.touched && editForm.controls.name.errors?.['required']) {
                <span class="err">Full name is required.</span>
              }
            </div>

            <div class="field">
              <label for="edit-dept">Department</label>
              <input
                id="edit-dept"
                type="text"
                formControlName="department"
                placeholder="e.g. Stores"
              />
            </div>

            <div class="field">
              <label for="edit-desig">Designation</label>
              <input
                id="edit-desig"
                type="text"
                formControlName="designation"
                placeholder="e.g. Store Keeper"
              />
            </div>

            <div class="field">
              <label for="edit-phone">Phone Number</label>
              <input
                id="edit-phone"
                type="tel"
                class="mono"
                formControlName="phone"
                placeholder="e.g. +91 98765 43210"
              />
            </div>

            <div class="field-checkbox">
              <label>
                <input type="checkbox" formControlName="isActive" />
                <span>Active Employee</span>
              </label>
            </div>

            <div slot="footer" class="modal-actions">
              <button type="button" class="btn" (click)="closeModals()">Cancel</button>
              <button
                type="submit"
                class="btn a"
                [disabled]="editForm.invalid || isSubmitting()"
              >
                {{ isSubmitting() ? 'Saving...' : 'Update Employee' }}
              </button>
            </div>
          </form>
        </app-modal>
      </div>
    }

    <!-- Deactivate Confirm Modal -->
    @if (showDeactivateModal() && selectedEmployee(); as emp) {
      <div class="modal-overlay" role="dialog" aria-modal="true" aria-label="Confirm Deactivation">
        <app-modal title="Deactivate Employee" (closed)="closeModals()">
          <div class="deactivate-confirm">
            <div class="warning-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
            </div>
            <p>
              Are you sure you want to deactivate employee <b>{{ emp.name }}</b> ({{ emp.code }})?
            </p>
            <div class="warning-box">
              ⚠️ <b>This also deactivates their user accounts.</b>
            </div>
          </div>

          <div slot="footer" class="modal-actions">
            <button type="button" class="btn" (click)="closeModals()">Cancel</button>
            <button
              type="button"
              class="btn a btn-danger"
              [disabled]="isSubmitting()"
              (click)="submitDeactivate()"
            >
              {{ isSubmitting() ? 'Deactivating...' : 'Confirm Deactivation' }}
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

    .ph-actions {
      display: flex;
      align-items: center;
      gap: 10px;

      .search-input {
        width: 200px;
        font-size: 13px;
        padding: 5px 10px;
      }
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

    .btn-danger {
      background: var(--red) !important;
      color: #ffffff !important;
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

    .emp-form {
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
      }
    }

    .err {
      font-size: 11px;
      color: var(--red);
    }

    .modal-actions {
      display: flex;
      gap: 8px;
      justify-content: flex-end;
      width: 100%;
    }

    .deactivate-confirm {
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      gap: 14px;
      padding: 8px 0;

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

      .warning-box {
        padding: 10px 14px;
        background: rgba(232, 163, 61, 0.14);
        border: 1px solid rgba(232, 163, 61, 0.35);
        border-radius: var(--radius-sm, 4px);
        font-size: 13px;
        color: var(--amberD);
      }
    }
  `],
})
export class EmployeePageComponent implements OnInit {
  private readonly employeeService = inject(EmployeeService);
  private readonly notificationService = inject(NotificationService);
  private readonly session = inject(SessionService);
  private readonly fb = inject(FormBuilder);

  readonly isAdmin = computed(() => this.session.role() === 'Admin');

  readonly employees = signal<EmployeeDto[]>([]);
  readonly isLoading = signal<boolean>(false);
  readonly isSubmitting = signal<boolean>(false);
  readonly searchTerm = signal<string>('');

  readonly showAddModal = signal<boolean>(false);
  readonly showEditModal = signal<boolean>(false);
  readonly showDeactivateModal = signal<boolean>(false);
  readonly selectedEmployee = signal<EmployeeDto | null>(null);

  readonly tableHeaders = computed(() =>
    this.isAdmin()
      ? ['Code', 'Name', 'Department', 'Designation', 'Phone', 'Status', 'Actions']
      : ['Code', 'Name', 'Department', 'Designation', 'Phone', 'Status'],
  );

  readonly filteredEmployees = computed(() => {
    const term = this.searchTerm().trim().toLowerCase();
    const list = this.employees();
    if (!term) return list;
    return list.filter(
      (e) =>
        e.code.toLowerCase().includes(term) ||
        e.name.toLowerCase().includes(term) ||
        (e.department && e.department.toLowerCase().includes(term)) ||
        (e.designation && e.designation.toLowerCase().includes(term)),
    );
  });

  readonly addForm = this.fb.group({
    code: ['', [Validators.required, Validators.maxLength(20)]],
    name: ['', [Validators.required, Validators.maxLength(100)]],
    department: [''],
    designation: [''],
    phone: [''],
  });

  readonly editForm = this.fb.group({
    name: ['', [Validators.required, Validators.maxLength(100)]],
    department: [''],
    designation: [''],
    phone: [''],
    isActive: [true],
  });

  ngOnInit(): void {
    this.loadEmployees();
  }

  onSearch(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.searchTerm.set(target.value);
  }

  loadEmployees(): void {
    this.isLoading.set(true);
    this.employeeService.getAll().subscribe({
      next: (data) => {
        this.employees.set(data);
        this.isLoading.set(false);
      },
      error: () => {
        this.isLoading.set(false);
      },
    });
  }

  openAddModal(): void {
    if (!this.isAdmin()) return;
    this.addForm.reset();
    this.showAddModal.set(true);
  }

  openEditModal(emp: EmployeeDto): void {
    if (!this.isAdmin()) return;
    this.selectedEmployee.set(emp);
    this.editForm.setValue({
      name: emp.name,
      department: emp.department || '',
      designation: emp.designation || '',
      phone: emp.phone || '',
      isActive: emp.isActive,
    });
    this.showEditModal.set(true);
  }

  confirmDeactivate(emp: EmployeeDto): void {
    if (!this.isAdmin()) return;
    this.selectedEmployee.set(emp);
    this.showDeactivateModal.set(true);
  }

  closeModals(): void {
    this.showAddModal.set(false);
    this.showEditModal.set(false);
    this.showDeactivateModal.set(false);
    this.selectedEmployee.set(null);
  }

  submitAdd(): void {
    if (!this.isAdmin() || this.addForm.invalid || this.isSubmitting()) return;

    this.isSubmitting.set(true);
    const val = this.addForm.getRawValue();
    const dto: CreateEmployeeDto = {
      code: val.code!.trim().toUpperCase(),
      name: val.name!.trim(),
      department: val.department ? val.department.trim() : null,
      designation: val.designation ? val.designation.trim() : null,
      phone: val.phone ? val.phone.trim() : null,
    };

    this.employeeService.create(dto).subscribe({
      next: (created) => {
        this.isSubmitting.set(false);
        this.closeModals();
        this.notificationService.showSuccess(
          'Employee Created',
          `Employee ${created.code} (${created.name}) created successfully.`,
        );
        this.loadEmployees();
      },
      error: (err) => {
        this.isSubmitting.set(false);
        const msg = err?.error?.detail || err?.error?.title || 'Failed to create employee.';
        this.notificationService.showError('Create Failed', msg);
      },
    });
  }

  submitEdit(): void {
    const emp = this.selectedEmployee();
    if (!this.isAdmin() || !emp || this.editForm.invalid || this.isSubmitting()) return;

    this.isSubmitting.set(true);
    const val = this.editForm.getRawValue();
    const dto: UpdateEmployeeDto = {
      name: val.name!.trim(),
      department: val.department ? val.department.trim() : null,
      designation: val.designation ? val.designation.trim() : null,
      phone: val.phone ? val.phone.trim() : null,
      isActive: val.isActive ?? true,
    };

    this.employeeService.update(emp.id, dto).subscribe({
      next: (updated) => {
        this.isSubmitting.set(false);
        this.closeModals();
        this.notificationService.showSuccess(
          'Employee Updated',
          `Employee ${updated.code} updated successfully.`,
        );
        this.loadEmployees();
      },
      error: (err) => {
        this.isSubmitting.set(false);
        const msg = err?.error?.detail || err?.error?.title || 'Failed to update employee.';
        this.notificationService.showError('Update Failed', msg);
      },
    });
  }

  submitDeactivate(): void {
    const emp = this.selectedEmployee();
    if (!this.isAdmin() || !emp || this.isSubmitting()) return;

    this.isSubmitting.set(true);
    this.employeeService.deactivate(emp.id).subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.closeModals();
        this.notificationService.showSuccess(
          'Employee Deactivated',
          `Employee ${emp.name} was deactivated along with any associated user accounts.`,
        );
        this.loadEmployees();
      },
      error: (err) => {
        this.isSubmitting.set(false);
        const msg = err?.error?.detail || err?.error?.title || 'Failed to deactivate employee.';
        this.notificationService.showError('Deactivate Failed', msg);
      },
    });
  }
}
