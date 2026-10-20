import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService, sanitizeReturnUrl } from '../../core/auth/auth.service';
import { NotificationService } from '../../core/services/notification.service';

function passwordStrengthValidator(control: AbstractControl): ValidationErrors | null {
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
  selector: 'app-change-password-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="pwd-wrapper">
      <div class="pwd-card">
        <div class="brand-header">
          <div class="mark">WT</div>
          <div>
            <b>WareTrack WMS</b>
            <small>Account Security</small>
          </div>
        </div>

        <div class="scan-rule"></div>

        <div class="pwd-body">
          <div class="notice">
            @if (isForced()) {
              <h4>Password Change Required</h4>
              <p>For security, please change your initial or temporary password to proceed.</p>
            } @else {
              <h4>Change Password</h4>
              <p>Update your account password with a strong replacement.</p>
            }
          </div>

          @if (errorMessage()) {
            <div class="err-box" role="alert">
              {{ errorMessage() }}
            </div>
          }

          <form [formGroup]="form" (ngSubmit)="submit()" class="form-body">
            <div class="field">
              <label for="currentPassword">Current Password *</label>
              <div class="input-toggle">
                <input
                  id="currentPassword"
                  [type]="showCurrent() ? 'text' : 'password'"
                  formControlName="currentPassword"
                  placeholder="Enter current password"
                  autocomplete="current-password"
                  autofocus
                />
                <button
                  type="button"
                  class="toggle-btn"
                  (click)="showCurrent.set(!showCurrent())"
                  [attr.aria-label]="showCurrent() ? 'Hide current password' : 'Show current password'"
                >
                  {{ showCurrent() ? 'Hide' : 'Show' }}
                </button>
              </div>
            </div>

            <div class="field">
              <label for="newPassword">New Password *</label>
              <div class="input-toggle">
                <input
                  id="newPassword"
                  [type]="showNew() ? 'text' : 'password'"
                  formControlName="newPassword"
                  placeholder="At least 10 characters"
                  autocomplete="new-password"
                />
                <button
                  type="button"
                  class="toggle-btn"
                  (click)="showNew.set(!showNew())"
                  [attr.aria-label]="showNew() ? 'Hide new password' : 'Show new password'"
                >
                  {{ showNew() ? 'Hide' : 'Show' }}
                </button>
              </div>

              <!-- Live Strength Requirements -->
              <div class="strength-checklist">
                <div class="rule" [class.met]="hasMinLength()">
                  <span class="dot"></span> At least 10 characters
                </div>
                <div class="rule" [class.met]="hasUppercase()">
                  <span class="dot"></span> At least 1 uppercase letter (A-Z)
                </div>
                <div class="rule" [class.met]="hasLowercase()">
                  <span class="dot"></span> At least 1 lowercase letter (a-z)
                </div>
                <div class="rule" [class.met]="hasDigit()">
                  <span class="dot"></span> At least 1 number (0-9)
                </div>
              </div>
            </div>

            <div class="field">
              <label for="confirmPassword">Confirm New Password *</label>
              <div class="input-toggle">
                <input
                  id="confirmPassword"
                  [type]="showConfirm() ? 'text' : 'password'"
                  formControlName="confirmPassword"
                  placeholder="Re-enter new password"
                  autocomplete="new-password"
                />
                <button
                  type="button"
                  class="toggle-btn"
                  (click)="showConfirm.set(!showConfirm())"
                  [attr.aria-label]="showConfirm() ? 'Hide confirm password' : 'Show confirm password'"
                >
                  {{ showConfirm() ? 'Hide' : 'Show' }}
                </button>
              </div>
              @if (form.controls.confirmPassword.touched && passwordsMismatch()) {
                <span class="err">Passwords do not match.</span>
              }
            </div>

            <button
              type="submit"
              class="btn a submit-btn"
              [disabled]="form.invalid || passwordsMismatch() || isSubmitting()"
            >
              @if (isSubmitting()) {
                <span class="spinner" aria-hidden="true"></span>
                <span>Updating Password...</span>
              } @else {
                <span>Update Password</span>
              }
            </button>
          </form>

          <div class="footer-actions">
            @if (!isForced()) {
              <button type="button" class="btn ghost s" (click)="cancel()">
                Cancel
              </button>
            }
            <button
              type="button"
              class="btn ghost s signout-btn"
              (click)="authService.logout()"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      min-height: 100vh;
    }

    .pwd-wrapper {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
      background: var(--bg);
    }

    .pwd-card {
      width: 440px;
      max-width: 100%;
      background: var(--card);
      border: 1px solid var(--line);
      border-radius: var(--radius-2xl, 12px);
      box-shadow: var(--shadow-panel-hover);
      overflow: hidden;
      animation: pop 0.3s cubic-bezier(0.2, 0.9, 0.3, 1.15) both;
    }

    .brand-header {
      background: linear-gradient(135deg, var(--n9), #1f2d5a);
      padding: 20px 24px;
      display: flex;
      align-items: center;
      gap: 12px;

      .mark {
        width: 38px;
        height: 38px;
        border-radius: var(--radius-md, 6px);
        background: linear-gradient(135deg, var(--amber), var(--amberD));
        color: #141B24;
        font-weight: 800;
        font-size: 15px;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      b {
        color: #ffffff;
        font-size: 16px;
        display: block;
      }

      small {
        color: #8CA0B4;
        font-size: 11px;
        display: block;
      }
    }

    .pwd-body {
      padding: 24px;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .notice {
      h4 {
        margin: 0 0 4px;
        font-size: 16px;
        color: var(--text);
      }
      p {
        margin: 0;
        font-size: 12.5px;
        color: var(--dim);
        line-height: 1.4;
      }
    }

    .err-box {
      padding: 10px 14px;
      background: rgba(193, 68, 61, 0.12);
      border: 1px solid rgba(193, 68, 61, 0.3);
      border-radius: var(--radius-sm, 4px);
      color: var(--red);
      font-size: 12.5px;
      line-height: 1.4;
    }

    .form-body {
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
    }

    .input-toggle {
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

    .err {
      font-size: 11.5px;
      color: var(--red);
    }

    .submit-btn {
      width: 100%;
      justify-content: center;
      padding: 10px;
      margin-top: 8px;
    }

    .footer-actions {
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-top: 1px solid var(--line);
      padding-top: 14px;
      margin-top: 4px;

      .signout-btn {
        margin-left: auto;
        color: var(--red);
      }
    }

    .spinner {
      width: 14px;
      height: 14px;
      border: 2px solid rgba(20, 27, 36, 0.3);
      border-top-color: #141b24;
      border-radius: 50%;
      animation: spin 0.7s linear infinite;
      margin-right: 6px;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }
  `],
})
export class ChangePasswordPageComponent {
  protected readonly authService = inject(AuthService);
  private readonly notificationService = inject(NotificationService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly fb = inject(FormBuilder);

  readonly isForced = this.authService.mustChangePassword;
  readonly isSubmitting = signal<boolean>(false);
  readonly errorMessage = signal<string | null>(null);

  readonly showCurrent = signal<boolean>(false);
  readonly showNew = signal<boolean>(false);
  readonly showConfirm = signal<boolean>(false);

  readonly form = this.fb.group({
    currentPassword: ['', [Validators.required]],
    newPassword: ['', [Validators.required, passwordStrengthValidator]],
    confirmPassword: ['', [Validators.required]],
  });

  hasMinLength(): boolean {
    const val = this.form.controls.newPassword.value || '';
    return val.length >= 10;
  }

  hasUppercase(): boolean {
    const val = this.form.controls.newPassword.value || '';
    return /[A-Z]/.test(val);
  }

  hasLowercase(): boolean {
    const val = this.form.controls.newPassword.value || '';
    return /[a-z]/.test(val);
  }

  hasDigit(): boolean {
    const val = this.form.controls.newPassword.value || '';
    return /[0-9]/.test(val);
  }

  passwordsMismatch(): boolean {
    const np = this.form.controls.newPassword.value;
    const cp = this.form.controls.confirmPassword.value;
    return !!cp && np !== cp;
  }

  submit(): void {
    if (this.form.invalid || this.passwordsMismatch() || this.isSubmitting()) return;

    this.isSubmitting.set(true);
    this.errorMessage.set(null);

    const currentPassword = this.form.controls.currentPassword.value || '';
    const newPassword = this.form.controls.newPassword.value || '';

    // Clear password inputs immediately from form to ensure write-only security
    this.form.reset();

    this.authService
      .changePassword({ currentPassword, newPassword })
      .subscribe({
        next: () => {
          this.isSubmitting.set(false);
          this.notificationService.showSuccess(
            'Password Updated',
            'Your password was changed successfully.',
          );
          const rawReturn = this.route.snapshot.queryParamMap.get('returnUrl');
          const returnUrl = sanitizeReturnUrl(rawReturn);
          this.router.navigateByUrl(returnUrl);
        },
        error: (err) => {
          this.isSubmitting.set(false);
          const msg =
            err?.error?.detail ||
            err?.error?.title ||
            (typeof err?.error === 'string' ? err.error : null) ||
            'Failed to change password. Please verify current password.';
          this.errorMessage.set(msg);
        },
      });
  }

  cancel(): void {
    this.router.navigate(['/dashboard']);
  }
}
