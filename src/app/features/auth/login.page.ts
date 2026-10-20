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
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { BranchLookupDto } from '../../core/auth/auth.models';
import { AuthService, sanitizeReturnUrl } from '../../core/auth/auth.service';

@Component({
  selector: 'app-login-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="login-wrapper">
      <div class="login-card">
        <div class="brand-header">
          <div class="mark">WT</div>
          <div>
            <b>WareTrack WMS</b>
            <small>GRN · Putaway · FIFO</small>
          </div>
        </div>

        <div class="scan-rule"></div>

        <div class="form-body">
          @if (errorMessage()) {
            <div class="err-box" role="alert">
              {{ errorMessage() }}
            </div>
          }

          <form [formGroup]="form" (ngSubmit)="submit()">
            <div class="field">
              <label for="branch">Warehouse Branch *</label>
              <select
                id="branch"
                formControlName="branchId"
                data-tour="login-branch"
              >
                <option [ngValue]="null">Select warehouse branch...</option>
                @for (b of branches(); track b.id) {
                  <option [ngValue]="b.id">
                    {{ b.name }} ({{ b.code }})
                  </option>
                }
              </select>
              @if (form.controls.branchId.touched && form.controls.branchId.errors?.['required']) {
                <span class="field-err">Please select a branch.</span>
              }
            </div>

            <div class="field">
              <label for="userId">User ID / Username *</label>
              <input
                id="userId"
                type="text"
                formControlName="username"
                placeholder="e.g. ravi.k"
                autocomplete="username"
                data-tour="login-user"
              />
              @if (form.controls.username.touched && form.controls.username.errors?.['required']) {
                <span class="field-err">Username is required.</span>
              }
            </div>

            <div class="field">
              <label for="password">Password *</label>
              <div class="pwd-input-wrap">
                <input
                  id="password"
                  [type]="showPassword() ? 'text' : 'password'"
                  formControlName="password"
                  placeholder="••••••••"
                  autocomplete="current-password"
                />
                <button
                  type="button"
                  class="toggle-btn"
                  (click)="showPassword.set(!showPassword())"
                  [attr.aria-label]="showPassword() ? 'Hide password' : 'Show password'"
                >
                  {{ showPassword() ? 'Hide' : 'Show' }}
                </button>
              </div>
              @if (form.controls.password.touched && form.controls.password.errors?.['required']) {
                <span class="field-err">Password is required.</span>
              }
            </div>

            <button
              type="submit"
              class="btn a signin-btn"
              [disabled]="form.invalid || isSubmitting()"
            >
              @if (isSubmitting()) {
                <span class="spinner" aria-hidden="true"></span>
                <span>Signing In...</span>
              } @else {
                <span>Sign In</span>
              }
            </button>
          </form>
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      min-height: 100vh;
    }

    .login-wrapper {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
      background: var(--bg);
    }

    .login-card {
      width: 420px;
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
      padding: 24px;
      display: flex;
      align-items: center;
      gap: 12px;

      .mark {
        width: 40px;
        height: 40px;
        border-radius: var(--radius-md, 6px);
        background: linear-gradient(135deg, var(--amber), var(--amberD));
        color: #141B24;
        font-weight: 800;
        font-size: 16px;
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

    .form-body {
      padding: 24px;
      display: flex;
      flex-direction: column;
      gap: 16px;

      form {
        display: flex;
        flex-direction: column;
        gap: 16px;
      }
    }

    .err-box {
      padding: 10px 14px;
      background: rgba(193, 68, 61, 0.12);
      border: 1px solid rgba(193, 68, 61, 0.3);
      border-radius: var(--radius-sm, 4px);
      color: var(--red);
      font-size: 13px;
      line-height: 1.4;
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

    .pwd-input-wrap {
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

    .field-err {
      font-size: 11.5px;
      color: var(--red);
    }

    .signin-btn {
      width: 100%;
      justify-content: center;
      padding: 10px;
      margin-top: 8px;
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
export class LoginPageComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly fb = inject(FormBuilder);

  readonly branches = signal<BranchLookupDto[]>([]);
  readonly isSubmitting = signal<boolean>(false);
  readonly errorMessage = signal<string | null>(null);
  readonly showPassword = signal<boolean>(false);

  readonly form = this.fb.group({
    branchId: [null as number | null, [Validators.required]],
    username: ['', [Validators.required]],
    password: ['', [Validators.required]],
  });

  ngOnInit(): void {
    this.authService.getActiveBranches().subscribe({
      next: (branches) => {
        this.branches.set(branches);
        if (branches.length === 1) {
          this.form.controls.branchId.setValue(branches[0].id);
        }
      },
      error: () => {
        // Fallback if branch lookup fails
      },
    });
  }

  submit(): void {
    if (this.form.invalid || this.isSubmitting()) return;

    this.isSubmitting.set(true);
    this.errorMessage.set(null);

    const val = this.form.getRawValue();
    const branchId = val.branchId!;
    const username = val.username!.trim();
    const password = val.password || '';

    // Clear password from form immediately for write-only security
    this.form.controls.password.reset();

    this.authService
      .login({ branchId, username, password })
      .subscribe({
        next: (response) => {
          this.isSubmitting.set(false);
          if (response.mustChangePassword) {
            const rawReturn = this.route.snapshot.queryParamMap.get('returnUrl');
            const returnUrl = sanitizeReturnUrl(rawReturn);
            this.router.navigate(['/change-password'], {
              queryParams: returnUrl !== '/dashboard' ? { returnUrl } : {},
            });
            return;
          }

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
            'Invalid credentials.';
          this.errorMessage.set(msg);
        },
      });
  }
}
