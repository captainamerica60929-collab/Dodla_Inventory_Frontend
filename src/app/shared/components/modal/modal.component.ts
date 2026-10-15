import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Output,
  input,
} from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-modal',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="dlgw"
      [style.--mc1]="headerGradientStart()"
      [style.--mc2]="headerGradientEnd()"
      role="dialog"
      [attr.aria-label]="title()"
    >
      <div class="mh">
        <b>{{ title() }}</b>
        <button
          type="button"
          class="btn s close-btn"
          (click)="closed.emit()"
          aria-label="Close dialog"
        >
          ✕
        </button>
      </div>

      <div class="mb">
        <ng-content />
      </div>

      <div class="mf">
        <ng-content select="[slot=footer]" />
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
    }

    .dlgw {
      width: 600px;
      max-width: 94vw;
      background: var(--card);
      border-radius: var(--radius-lg, 8px);
      box-shadow: 0 10px 40px rgba(0, 0, 0, 0.35);
      border: 1px solid var(--line);
      overflow: hidden;
      animation: pop 0.25s cubic-bezier(0.2, 0.9, 0.3, 1.15) both;
    }

    .mh {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 18px 22px;
      background: linear-gradient(120deg, var(--mc1, #2E6BA6), var(--mc2, #6B4FA3));
      color: #ffffff;
      border: 0;

      b {
        font-size: 17px;
        font-weight: 700;
      }

      .close-btn {
        background: rgba(255, 255, 255, 0.22);
        color: #ffffff;
        border: 0;
        width: 28px;
        height: 28px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 6px;
        font-size: 14px;
        line-height: 1;

        &:hover {
          background: rgba(255, 255, 255, 0.35);
        }
      }
    }

    .mb {
      padding: 18px 22px;
      color: var(--text);
    }

    .mf {
      display: flex;
      gap: 10px;
      justify-content: flex-end;
      padding: 14px 22px;
      border-top: 1px solid var(--line);
      background: var(--card);
    }
  `],
})
export class ModalComponent {
  readonly title = input.required<string>();
  readonly headerGradientStart = input<string>('#2E6BA6');
  readonly headerGradientEnd = input<string>('#6B4FA3');

  @Output() readonly closed = new EventEmitter<void>();
}
