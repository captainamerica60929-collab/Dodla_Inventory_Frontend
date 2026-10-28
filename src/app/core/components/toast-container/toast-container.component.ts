import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NotificationService } from '../../services/notification.service';

@Component({
  selector: 'app-toast-container',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="toast-container"
      role="region"
      aria-label="Notifications"
      aria-live="polite"
    >
      @for (toast of notificationService.toasts(); track toast.id) {
        <div
          class="toast-item"
          [ngClass]="toast.type"
          role="status"
          [attr.aria-live]="toast.type === 'error' ? 'assertive' : 'polite'"
        >
          <div class="toast-header">
            <span class="toast-icon">
              @if (toast.type === 'success') { ✓ }
              @else if (toast.type === 'error') { ✕ }
              @else { ⚠ }
            </span>
            <b class="toast-title">{{ toast.title }}</b>
            <button
              type="button"
              class="toast-close"
              (click)="notificationService.dismiss(toast.id)"
              aria-label="Dismiss notification"
            >
              ✕
            </button>
          </div>

          <div class="toast-body">
            {{ toast.message }}
          </div>

          @if (toast.traceId) {
            <div class="toast-trace">
              <span class="mono">Trace ID: {{ toast.traceId }}</span>
              <button
                type="button"
                class="btn s ghost copy-btn"
                (click)="copyTraceId(toast.traceId)"
                title="Copy Trace ID"
              >
                Copy
              </button>
            </div>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    :host {
      display: contents;
    }

    .toast-container {
      position: fixed;
      top: 72px;
      right: 22px;
      z-index: 100;
      display: flex;
      flex-direction: column;
      gap: 10px;
      width: 380px;
      max-width: calc(100vw - 32px);
      pointer-events: none;

      @media (max-width: 640px) {
        top: auto;
        bottom: 16px;
        left: 12px;
        right: 12px;
        width: auto;
        max-width: none;
      }
    }

    .toast-item {
      pointer-events: auto;
      background: var(--card);
      border: 1px solid var(--line);
      border-radius: var(--radius-lg, 8px);
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.18);
      padding: 12px 14px;
      border-left: 4px solid var(--dim);
      animation: pop 0.25s cubic-bezier(0.2, 0.9, 0.3, 1.15) both;

      &.success {
        border-left-color: var(--green);
        .toast-icon { color: var(--green); }
      }

      &.error {
        border-left-color: var(--red);
        .toast-icon { color: var(--red); }
      }

      &.warning {
        border-left-color: var(--amber);
        .toast-icon { color: var(--amber); }
      }
    }

    .toast-header {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .toast-icon {
      font-weight: 800;
      font-size: 14px;
    }

    .toast-title {
      font-size: 13.5px;
      color: var(--text);
      flex: 1;
    }

    .toast-close {
      border: 0;
      background: none;
      color: var(--faint);
      cursor: pointer;
      font-size: 13px;
      padding: 2px 4px;
      line-height: 1;

      &:hover {
        color: var(--text);
      }
    }

    .toast-body {
      font-size: 12.5px;
      color: var(--dim);
      margin-top: 4px;
      word-break: break-word;
    }

    .toast-trace {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-top: 8px;
      padding-top: 6px;
      border-top: 1px dashed var(--line);
      font-size: 11px;
      color: var(--faint);

      .copy-btn {
        padding: 2px 6px;
        font-size: 10.5px;
      }
    }
  `],
})
export class ToastContainerComponent {
  protected readonly notificationService = inject(NotificationService);

  protected copyTraceId(traceId: string): void {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(traceId);
    }
  }
}
