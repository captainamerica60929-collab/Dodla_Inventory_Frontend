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
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { DataTableComponent } from '../../../shared/components/data-table/data-table.component';
import { PillComponent } from '../../../shared/components/pill/pill.component';
import { ModalComponent } from '../../../shared/components/modal/modal.component';
import { BranchDto, BranchService } from '../../../core/api/branch.service';
import { EmployeeDto, EmployeeService } from '../../../core/api/employee.service';
import {
  CreateUserDto,
  UpdateUserDto,
  UserDto,
  UserService,
} from '../../../core/api/user.service';
import { NotificationService } from '../../../core/services/notification.service';
import { SessionService, UserRole } from '../../../core/session/session.service';

function passwordPolicyValidator(control: AbstractControl): ValidationErrors | null {
  const val = control.value || '';
  if (!val) return null;

  const errors: Record<string, boolean> = {};
  if (val.length < 10) errors['minLength'] = true;
  if (!/[A-Z]/.test(val)) errors['requireUppercase'] = true;
  if (!/[a-z]/.test(val)) errors['requireLowercase'] = true;
  if (!/[0-9]/.test(val)) errors['requireDigit'] = true;

  return Object.keys(errors).length > 0 ? errors : null;
}

@Component({
  selector: 'app-user-page',
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
    <div class="panel" style="--acc: var(--red);">
      <div class="ph">
        <div>
          <h3>User & Role Management</h3>
          <div class="sub">System accounts, roles, and branch authorizations</div>
        </div>
        <div class="ph-actions">
          <input
            type="search"
            class="search-input"
            placeholder="Search users..."
            [value]="searchTerm()"
            (input)="onSearch($event)"
            aria-label="Search users"
          />
          @if (isAdmin()) {
            <button
              type="button"
              class="btn a s"
              (click)="openCreateModal()"
              aria-label="Add new user"
            >
              + Add User
            </button>
          }
        </div>
      </div>

      @if (isLoading()) {
        <div class="pb loading-text">Loading user records...</div>
      } @else {
        <app-data-table
          [headers]="['Username', 'Employee', 'Role', 'Authorized Branches', 'Status', 'Security', 'Actions']"
          [isEmpty]="filteredUsers().length === 0"
          emptyText="No user accounts found."
        >
          @for (u of filteredUsers(); track u.id) {
            <tr tabindex="0" (keydown.enter)="isAdmin() ? openEditModal(u) : null">
              <td class="mono"><b>{{ u.username }}</b></td>
              <td>
                <div>{{ u.employeeName }}</div>
                <small class="faint mono">{{ u.employeeCode }}</small>
              </td>
              <td>
                <span class="role-badge" [attr.data-role]="u.role">
                  {{ u.role }}
                </span>
              </td>
              <td>
                <div class="branch-chips">
                  @for (bName of getBranchCodes(u.branchIds); track bName) {
                    <span class="chip">{{ bName }}</span>
                  }
                </div>
              </td>
              <td>
                <app-pill
                  [variant]="u.isActive ? 'green' : 'default'"
                  [text]="u.isActive ? 'Active' : 'Inactive'"
                />
              </td>
              <td>
                @if (isUserLocked(u)) {
                  <app-pill variant="red" text="Locked" />
                } @else if (u.mustChangePassword) {
                  <app-pill variant="amber" text="Pwd Change Req" />
                } @else {
                  <span class="faint">Normal</span>
                }
              </td>
              @if (isAdmin()) {
                <td class="action-cell">
                  <button
                    type="button"
                    class="btn s ghost"
                    (click)="openEditModal(u)"
                    title="Edit User"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    class="btn s ghost"
                    (click)="openResetPasswordModal(u)"
                    title="Reset Password"
                  >
                    Reset Pwd
                  </button>
                  @if (isUserLocked(u)) {
                    <button
                      type="button"
                      class="btn s ghost text-success"
                      (click)="confirmUnlock(u)"
                      title="Unlock Account"
                    >
                      Unlock
                    </button>
                  }
                </td>
              }
            </tr>
          }
        </app-data-table>
      }
    </div>

    <!-- Create User Modal -->
    @if (showCreateModal()) {
      <div class="modal-overlay" role="dialog" aria-modal="true" aria-label="Add User">
        <app-modal title="Create User Account" (closed)="closeModals()">
          <form [formGroup]="createForm" (ngSubmit)="submitCreate()" class="user-form">
            <div class="field">
              <label for="create-emp">Employee (Active only) *</label>
              <select id="create-emp" formControlName="employeeId">
                <option [ngValue]="null">Select an active employee...</option>
                @for (emp of activeEmployees(); track emp.id) {
                  <option [ngValue]="emp.id">
                    {{ emp.name }} ({{ emp.code }}) - {{ emp.department || 'General' }}
                  </option>
                }
              </select>
              @if (createForm.controls.employeeId.touched && createForm.controls.employeeId.errors?.['required']) {
                <span class="err">Please select an employee.</span>
              }
            </div>

            <div class="field">
              <label for="create-username">Username *</label>
              <input
                id="create-username"
                type="text"
                class="mono"
                formControlName="username"
                placeholder="e.g. ravi.k"
                autocomplete="off"
              />
              @if (createForm.controls.username.touched && createForm.controls.username.errors?.['required']) {
                <span class="err">Username is required.</span>
              }
            </div>

            <div class="field">
              <label for="create-role">Role *</label>
              <select id="create-role" formControlName="role" data-tour="user-role">
                <option value="Admin">Admin</option>
                <option value="StoreKeeper">StoreKeeper</option>
                <option value="Operator">Operator</option>
                <option value="Viewer">Viewer</option>
              </select>
            </div>

            <div class="field">
              <label>Authorized Branches (At least 1 required) *</label>
              <div class="branch-selector" data-tour="user-branches">
                @for (b of branches(); track b.id) {
                  <label class="branch-option">
                    <input
                      type="checkbox"
                      [checked]="isBranchSelected(createSelectedBranches(), b.id)"
                      (change)="toggleBranch(createSelectedBranches, b.id)"
                    />
                    <span>{{ b.name }} ({{ b.code }})</span>
                  </label>
                }
              </div>
              @if (createSelectedBranches().length === 0) {
                <span class="err">At least one branch must be assigned.</span>
              }
            </div>

            <div class="field">
              <label for="create-password">Initial Password *</label>
              <div class="pwd-toggle-wrap">
                <input
                  id="create-password"
                  [type]="showInitialPassword() ? 'text' : 'password'"
                  formControlName="initialPassword"
                  placeholder="Min. 10 chars, upper, lower, digit"
                  autocomplete="new-password"
                />
                <button
                  type="button"
                  class="toggle-btn"
                  (click)="showInitialPassword.set(!showInitialPassword())"
                >
                  {{ showInitialPassword() ? 'Hide' : 'Show' }}
                </button>
              </div>

              <!-- Password strength checklist -->
              <div class="strength-checklist">
                <div class="rule" [class.met]="hasMinLength(createForm.controls.initialPassword.value)">
                  <span class="dot"></span> At least 10 characters
                </div>
                <div class="rule" [class.met]="hasUppercase(createForm.controls.initialPassword.value)">
                  <span class="dot"></span> At least 1 uppercase letter
                </div>
                <div class="rule" [class.met]="hasLowercase(createForm.controls.initialPassword.value)">
                  <span class="dot"></span> At least 1 lowercase letter
                </div>
                <div class="rule" [class.met]="hasDigit(createForm.controls.initialPassword.value)">
                  <span class="dot"></span> At least 1 number
                </div>
              </div>
            </div>

            <div slot="footer" class="modal-actions">
              <button type="button" class="btn" (click)="closeModals()">Cancel</button>
              <button
                type="submit"
                class="btn a"
                [disabled]="createForm.invalid || createSelectedBranches().length === 0 || isSubmitting()"
              >
                {{ isSubmitting() ? 'Creating...' : 'Create User' }}
              </button>
            </div>
          </form>
        </app-modal>
      </div>
    }

    <!-- Edit User Modal -->
    @if (showEditModal() && selectedUser(); as user) {
      <div class="modal-overlay" role="dialog" aria-modal="true" aria-label="Edit User">
        <app-modal [title]="'Edit User: ' + user.username" (closed)="closeModals()">
          <form [formGroup]="editForm" (ngSubmit)="submitEdit()" class="user-form">
            <div class="field">
              <label>Employee</label>
              <input type="text" [value]="user.employeeName + ' (' + user.employeeCode + ')'" readonly disabled />
            </div>

            <div class="field">
              <label for="edit-role">Role *</label>
              <select id="edit-role" formControlName="role">
                <option value="Admin">Admin</option>
                <option value="StoreKeeper">StoreKeeper</option>
                <option value="Operator">Operator</option>
                <option value="Viewer">Viewer</option>
              </select>
            </div>

            <div class="field">
              <label>Authorized Branches (At least 1 required) *</label>
              <div class="branch-selector">
                @for (b of branches(); track b.id) {
                  <label class="branch-option">
                    <input
                      type="checkbox"
                      [checked]="isBranchSelected(editSelectedBranches(), b.id)"
                      (change)="toggleBranch(editSelectedBranches, b.id)"
                    />
                    <span>{{ b.name }} ({{ b.code }})</span>
                  </label>
                }
              </div>
              @if (editSelectedBranches().length === 0) {
                <span class="err">At least one branch must be assigned.</span>
              }
            </div>

            <div class="field-checkbox">
              <label>
                <input type="checkbox" formControlName="isActive" />
                <span>Active Account</span>
              </label>
            </div>

            <div slot="footer" class="modal-actions">
              <button type="button" class="btn" (click)="closeModals()">Cancel</button>
              <button
                type="submit"
                class="btn a"
                [disabled]="editForm.invalid || editSelectedBranches().length === 0 || isSubmitting()"
              >
                {{ isSubmitting() ? 'Saving...' : 'Update User' }}
              </button>
            </div>
          </form>
        </app-modal>
      </div>
    }

    <!-- Reset Password Modal -->
    @if (showResetModal() && selectedUser(); as user) {
      <div class="modal-overlay" role="dialog" aria-modal="true" aria-label="Reset Password">
        <app-modal [title]="'Reset Password: ' + user.username" (closed)="closeModals()">
          <form [formGroup]="resetForm" (ngSubmit)="submitResetPassword()" class="user-form">
            <p class="reset-desc">
              Assign a new temporary password for <b>{{ user.username }}</b>. They will be forced to change it upon their next sign in.
            </p>

            <div class="field">
              <label for="reset-pwd">New Password *</label>
              <div class="pwd-toggle-wrap">
                <input
                  id="reset-pwd"
                  [type]="showResetPassword() ? 'text' : 'password'"
                  formControlName="newPassword"
                  placeholder="At least 10 characters"
                  autocomplete="new-password"
                  autofocus
                />
                <button
                  type="button"
                  class="toggle-btn"
                  (click)="showResetPassword.set(!showResetPassword())"
                >
                  {{ showResetPassword() ? 'Hide' : 'Show' }}
                </button>
              </div>

              <div class="strength-checklist">
                <div class="rule" [class.met]="hasMinLength(resetForm.controls.newPassword.value)">
                  <span class="dot"></span> At least 10 characters
                </div>
                <div class="rule" [class.met]="hasUppercase(resetForm.controls.newPassword.value)">
                  <span class="dot"></span> At least 1 uppercase letter
                </div>
                <div class="rule" [class.met]="hasLowercase(resetForm.controls.newPassword.value)">
                  <span class="dot"></span> At least 1 lowercase letter
                </div>
                <div class="rule" [class.met]="hasDigit(resetForm.controls.newPassword.value)">
                  <span class="dot"></span> At least 1 number
                </div>
              </div>
            </div>

            <div slot="footer" class="modal-actions">
              <button type="button" class="btn" (click)="closeModals()">Cancel</button>
              <button
                type="submit"
                class="btn a"
                [disabled]="resetForm.invalid || isSubmitting()"
              >
                {{ isSubmitting() ? 'Resetting...' : 'Confirm Reset' }}
              </button>
            </div>
          </form>
        </app-modal>
      </div>
    }

    <!-- Unlock Confirmation Modal -->
    @if (showUnlockModal() && selectedUser(); as user) {
      <div class="modal-overlay" role="dialog" aria-modal="true" aria-label="Confirm Unlock">
        <app-modal title="Unlock User Account" (closed)="closeModals()">
          <div class="unlock-dialog">
            <p>
              Are you sure you want to unlock user account <b>{{ user.username }}</b> ({{ user.employeeName }})?
            </p>
            <small class="faint">This resets failed login attempts and clears any active lockout.</small>
          </div>

          <div slot="footer" class="modal-actions">
            <button type="button" class="btn" (click)="closeModals()">Cancel</button>
            <button
              type="button"
              class="btn a text-success"
              [disabled]="isSubmitting()"
              (click)="submitUnlock()"
            >
              {{ isSubmitting() ? 'Unlocking...' : 'Unlock Account' }}
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

    .faint {
      color: var(--faint);
    }

    .role-badge {
      display: inline-block;
      font-size: 11px;
      font-weight: 700;
      padding: 2px 8px;
      border-radius: var(--radius-pill, 20px);
      background: var(--bg);
      border: 1px solid var(--line);
      color: var(--text);

      &[data-role="Admin"] {
        background: rgba(193, 68, 61, 0.12);
        color: var(--red);
        border-color: rgba(193, 68, 61, 0.25);
      }
      &[data-role="StoreKeeper"] {
        background: rgba(232, 163, 61, 0.15);
        color: var(--amberD);
        border-color: rgba(232, 163, 61, 0.3);
      }
      &[data-role="Operator"] {
        background: rgba(46, 107, 166, 0.14);
        color: var(--blue);
        border-color: rgba(46, 107, 166, 0.3);
      }
      &[data-role="Viewer"] {
        background: rgba(47, 111, 78, 0.12);
        color: var(--green);
        border-color: rgba(47, 111, 78, 0.3);
      }
    }

    .branch-chips {
      display: flex;
      flex-wrap: wrap;
      gap: 4px;

      .chip {
        font-size: 11px;
        font-family: monospace;
        padding: 1px 6px;
        background: var(--bg);
        border: 1px solid var(--line);
        border-radius: 4px;
        color: var(--dim);
      }
    }

    .action-cell {
      display: flex;
      gap: 6px;
      align-items: center;
    }

    .text-success {
      color: var(--green) !important;
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

    .user-form {
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

      input, select {
        width: 100%;
      }
    }

    .pwd-toggle-wrap {
      display: flex;
      position: relative;
      align-items: center;

      input {
        width: 100%;
        padding-right: 64px;
      }

      .toggle-btn {
        position: absolute;
        right: 8px;
        background: none;
        border: none;
        font-size: 11.5px;
        font-weight: 600;
        color: var(--dim);
        cursor: pointer;
        padding: 4px 6px;
        border-radius: 4px;

        &:hover {
          color: var(--text);
          background: var(--bg);
        }
      }
    }

    .strength-checklist {
      display: flex;
      flex-direction: column;
      gap: 3px;
      padding: 8px 10px;
      background: var(--bg);
      border: 1px solid var(--line);
      border-radius: var(--radius-sm, 4px);
      margin-top: 4px;

      .rule {
        display: flex;
        align-items: center;
        gap: 6px;
        font-size: 11px;
        color: var(--faint);

        .dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: var(--faint);
          transition: background 0.2s ease;
        }

        &.met {
          color: var(--green);
          .dot {
            background: var(--green);
          }
        }
      }
    }

    .branch-selector {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
      gap: 8px;
      max-height: 140px;
      overflow-y: auto;
      padding: 8px 10px;
      background: var(--bg);
      border: 1px solid var(--line);
      border-radius: var(--radius-sm, 4px);

      .branch-option {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 12.5px;
        color: var(--text);
        cursor: pointer;
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

    .reset-desc {
      margin: 0;
      font-size: 13.5px;
      color: var(--dim);
      line-height: 1.4;
    }

    .unlock-dialog {
      padding: 10px 0;
      p {
        margin: 0 0 6px;
        font-size: 14px;
        color: var(--text);
      }
    }
  `],
})
export class UserPageComponent implements OnInit {
  private readonly userService = inject(UserService);
  private readonly employeeService = inject(EmployeeService);
  private readonly branchService = inject(BranchService);
  private readonly notificationService = inject(NotificationService);
  private readonly session = inject(SessionService);
  private readonly fb = inject(FormBuilder);

  readonly isAdmin = computed(() => this.session.role() === 'Admin');

  readonly users = signal<UserDto[]>([]);
  readonly branches = signal<BranchDto[]>([]);
  readonly activeEmployees = signal<EmployeeDto[]>([]);
  readonly isLoading = signal<boolean>(false);
  readonly isSubmitting = signal<boolean>(false);
  readonly searchTerm = signal<string>('');

  readonly showCreateModal = signal<boolean>(false);
  readonly showEditModal = signal<boolean>(false);
  readonly showResetModal = signal<boolean>(false);
  readonly showUnlockModal = signal<boolean>(false);
  readonly selectedUser = signal<UserDto | null>(null);

  readonly createSelectedBranches = signal<number[]>([]);
  readonly editSelectedBranches = signal<number[]>([]);

  readonly showInitialPassword = signal<boolean>(false);
  readonly showResetPassword = signal<boolean>(false);

  readonly filteredUsers = computed(() => {
    const term = this.searchTerm().trim().toLowerCase();
    const list = this.users();
    if (!term) return list;
    return list.filter(
      (u) =>
        u.username.toLowerCase().includes(term) ||
        u.employeeName.toLowerCase().includes(term) ||
        u.employeeCode.toLowerCase().includes(term) ||
        u.role.toLowerCase().includes(term),
    );
  });

  readonly createForm = this.fb.group({
    employeeId: [null as number | null, [Validators.required]],
    username: ['', [Validators.required, Validators.maxLength(50)]],
    role: ['StoreKeeper' as UserRole, [Validators.required]],
    initialPassword: ['', [Validators.required, passwordPolicyValidator]],
  });

  readonly editForm = this.fb.group({
    role: ['StoreKeeper' as UserRole, [Validators.required]],
    isActive: [true],
  });

  readonly resetForm = this.fb.group({
    newPassword: ['', [Validators.required, passwordPolicyValidator]],
  });

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.isLoading.set(true);

    this.branchService.getAll(true).subscribe({
      next: (branches) => this.branches.set(branches),
    });

    this.employeeService.getAll(true).subscribe({
      next: (emps) => this.activeEmployees.set(emps),
    });

    this.userService.getAll().subscribe({
      next: (users) => {
        this.users.set(users);
        this.isLoading.set(false);
      },
      error: () => {
        this.isLoading.set(false);
      },
    });
  }

  onSearch(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.searchTerm.set(target.value);
  }

  getBranchCodes(branchIds: number[]): string[] {
    const map = new Map(this.branches().map((b) => [b.id, b.code]));
    return branchIds.map((id) => map.get(id) || `BR-${id}`);
  }

  isUserLocked(user: UserDto): boolean {
    if (user.lockoutEnd) {
      return new Date(user.lockoutEnd).getTime() > Date.now();
    }
    return user.failedLoginCount >= 5;
  }

  isBranchSelected(list: number[], branchId: number): boolean {
    return list.includes(branchId);
  }

  toggleBranch(targetSignal: typeof this.createSelectedBranches, branchId: number): void {
    targetSignal.update((current) => {
      if (current.includes(branchId)) {
        return current.filter((id) => id !== branchId);
      } else {
        return [...current, branchId];
      }
    });
  }

  hasMinLength(val: string | null | undefined): boolean {
    return (val || '').length >= 10;
  }

  hasUppercase(val: string | null | undefined): boolean {
    return /[A-Z]/.test(val || '');
  }

  hasLowercase(val: string | null | undefined): boolean {
    return /[a-z]/.test(val || '');
  }

  hasDigit(val: string | null | undefined): boolean {
    return /[0-9]/.test(val || '');
  }

  openCreateModal(): void {
    if (!this.isAdmin()) return;
    this.createForm.reset({
      employeeId: null,
      username: '',
      role: 'StoreKeeper',
      initialPassword: '',
    });
    this.createSelectedBranches.set([]);
    this.showCreateModal.set(true);
  }

  openEditModal(user: UserDto): void {
    if (!this.isAdmin()) return;
    this.selectedUser.set(user);
    this.editForm.setValue({
      role: user.role as UserRole,
      isActive: user.isActive,
    });
    this.editSelectedBranches.set([...user.branchIds]);
    this.showEditModal.set(true);
  }

  openResetPasswordModal(user: UserDto): void {
    if (!this.isAdmin()) return;
    this.selectedUser.set(user);
    this.resetForm.reset();
    this.showResetModal.set(true);
  }

  confirmUnlock(user: UserDto): void {
    if (!this.isAdmin()) return;
    this.selectedUser.set(user);
    this.showUnlockModal.set(true);
  }

  closeModals(): void {
    this.showCreateModal.set(false);
    this.showEditModal.set(false);
    this.showResetModal.set(false);
    this.showUnlockModal.set(false);
    this.selectedUser.set(null);
  }

  submitCreate(): void {
    if (
      !this.isAdmin() ||
      this.createForm.invalid ||
      this.createSelectedBranches().length === 0 ||
      this.isSubmitting()
    ) {
      return;
    }

    this.isSubmitting.set(true);
    const val = this.createForm.getRawValue();
    const initialPassword = val.initialPassword || '';

    // Clear password input immediately (write-only security)
    this.createForm.controls.initialPassword.reset();

    const dto: CreateUserDto = {
      employeeId: val.employeeId!,
      username: val.username!.trim(),
      role: val.role!,
      branchIds: this.createSelectedBranches(),
      initialPassword,
    };

    this.userService.create(dto).subscribe({
      next: (created) => {
        this.isSubmitting.set(false);
        this.closeModals();
        this.notificationService.showSuccess(
          'User Created',
          `User account '${created.username}' created successfully.`,
        );
        this.loadData();
      },
      error: (err) => {
        this.isSubmitting.set(false);
        const msg =
          err?.error?.detail ||
          err?.error?.title ||
          (typeof err?.error === 'string' ? err.error : null) ||
          'Failed to create user.';
        this.notificationService.showError('Create Failed', msg);
      },
    });
  }

  submitEdit(): void {
    const user = this.selectedUser();
    if (
      !this.isAdmin() ||
      !user ||
      this.editForm.invalid ||
      this.editSelectedBranches().length === 0 ||
      this.isSubmitting()
    ) {
      return;
    }

    this.isSubmitting.set(true);
    const val = this.editForm.getRawValue();
    const dto: UpdateUserDto = {
      role: val.role!,
      branchIds: this.editSelectedBranches(),
      isActive: val.isActive ?? true,
    };

    this.userService.update(user.id, dto).subscribe({
      next: (updated) => {
        this.isSubmitting.set(false);
        this.closeModals();
        this.notificationService.showSuccess(
          'User Updated',
          `User account '${updated.username}' updated successfully.`,
        );
        this.loadData();
      },
      error: (err) => {
        this.isSubmitting.set(false);
        const msg =
          err?.error?.detail ||
          err?.error?.title ||
          (typeof err?.error === 'string' ? err.error : null) ||
          'Failed to update user.';
        this.notificationService.showError('Update Failed', msg);
      },
    });
  }

  submitResetPassword(): void {
    const user = this.selectedUser();
    if (!this.isAdmin() || !user || this.resetForm.invalid || this.isSubmitting()) {
      return;
    }

    this.isSubmitting.set(true);
    const newPassword = this.resetForm.controls.newPassword.value || '';

    // Clear password input immediately (write-only security)
    this.resetForm.controls.newPassword.reset();

    this.userService.resetPassword(user.id, { newPassword }).subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.closeModals();
        this.notificationService.showSuccess(
          'Password Reset',
          `Password reset for '${user.username}'. They must change it upon next sign in.`,
        );
        this.loadData();
      },
      error: (err) => {
        this.isSubmitting.set(false);
        const msg =
          err?.error?.detail ||
          err?.error?.title ||
          (typeof err?.error === 'string' ? err.error : null) ||
          'Failed to reset password.';
        this.notificationService.showError('Reset Failed', msg);
      },
    });
  }

  submitUnlock(): void {
    const user = this.selectedUser();
    if (!this.isAdmin() || !user || this.isSubmitting()) return;

    this.isSubmitting.set(true);
    this.userService.unlock(user.id).subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.closeModals();
        this.notificationService.showSuccess(
          'Account Unlocked',
          `Account '${user.username}' unlocked successfully.`,
        );
        this.loadData();
      },
      error: (err) => {
        this.isSubmitting.set(false);
        const msg =
          err?.error?.detail ||
          err?.error?.title ||
          (typeof err?.error === 'string' ? err.error : null) ||
          'Failed to unlock account.';
        this.notificationService.showError('Unlock Failed', msg);
      },
    });
  }
}
