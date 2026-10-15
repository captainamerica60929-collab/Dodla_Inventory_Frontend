import { ChangeDetectionStrategy, Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-login-page',
  standalone: true,
  imports: [CommonModule, RouterLink],
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
          <div class="field">
            <label for="branch">Branch</label>
            <select id="branch">
              <option value="">Select warehouse branch...</option>
              <option value="BR-01">Main Warehouse (BR-01)</option>
              <option value="BR-02">North Distribution Hub (BR-02)</option>
            </select>
          </div>

          <div class="field">
            <label for="userId">User ID / Username</label>
            <input id="userId" type="text" placeholder="e.g. ravi.k" />
          </div>

          <div class="field">
            <label for="password">Password</label>
            <input id="password" type="password" placeholder="••••••••" />
          </div>

          <button type="button" class="btn a signin-btn" routerLink="/dashboard">
            Sign In
          </button>
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

    .signin-btn {
      width: 100%;
      justify-content: center;
      padding: 10px;
      margin-top: 8px;
    }
  `],
})
export class LoginPageComponent {}
