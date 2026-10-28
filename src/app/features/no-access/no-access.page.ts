import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { SessionService } from '../../core/session/session.service';

@Component({
  selector: 'app-no-access-page',
  standalone: true,
  imports: [CommonModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="panel no-access-panel" style="--acc: var(--red);">
      <div class="ph">
        <div>
          <h3>Access Restricted</h3>
          <div class="sub">You do not have permission to access this screen.</div>
        </div>
      </div>

      <div class="no-access-content">
        <div class="shield-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            <line x1="12" y1="8" x2="12" y2="12"/>
            <line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
        </div>

        <h4>Unauthorized Access</h4>
        <p>
          Your current assigned role (<b>{{ currentRole() || 'Unknown' }}</b>) is not authorized
          to view or interact with this resource under warehouse access control policy.
        </p>

        <div class="actions">
          <a routerLink="/dashboard" class="btn a">
            Return to Dashboard
          </a>
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
    }

    .no-access-panel {
      max-width: 600px;
      margin: 40px auto;
    }

    .no-access-content {
      padding: 36px 24px;
      text-align: center;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 14px;

      .shield-icon {
        width: 64px;
        height: 64px;
        border-radius: 50%;
        background: rgba(193, 68, 61, 0.12);
        color: var(--red);
        display: flex;
        align-items: center;
        justify-content: center;
        margin-bottom: 8px;

        svg {
          width: 34px;
          height: 34px;
        }
      }

      h4 {
        margin: 0;
        font-size: 18px;
        font-weight: 700;
        color: var(--text);
      }

      p {
        margin: 0;
        font-size: 14px;
        color: var(--dim);
        line-height: 1.5;
        max-width: 440px;

        b {
          color: var(--text);
        }
      }

      .actions {
        margin-top: 14px;
      }
    }
  `],
})
export class NoAccessPageComponent {
  private readonly session = inject(SessionService);
  protected readonly currentRole = this.session.role;
}
