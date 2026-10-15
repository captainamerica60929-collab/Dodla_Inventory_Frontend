import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-stat-card',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="sc" [style.--c]="color()">
      <div class="t">
        <span class="sl">{{ label() }}</span>
        @if (icon()) {
          <span class="si" [innerHTML]="icon()"></span>
        } @else {
          <span class="si">
            <ng-content select="[slot=icon]" />
          </span>
        }
      </div>
      <div class="sv">{{ value() }}</div>
      @if (sub()) {
        <div class="ss">{{ sub() }}</div>
      }
    </div>
  `,
  styles: [`
    :host {
      display: block;
    }

    .sc {
      position: relative;
      overflow: hidden;
      border: 0;
      color: #ffffff;
      background: linear-gradient(135deg, var(--c), color-mix(in srgb, var(--c) 62%, #ffffff));
      box-shadow: 0 6px 18px color-mix(in srgb, var(--c) 40%, transparent);
      transition: transform 0.2s ease, box-shadow 0.2s ease;
      border-radius: var(--radius-lg, 8px);
      padding: 16px;

      &:hover {
        transform: translateY(-4px);
        box-shadow: 0 10px 24px color-mix(in srgb, var(--c) 50%, transparent);
      }

      &::after {
        content: '';
        position: absolute;
        right: -24px;
        bottom: -34px;
        width: 110px;
        height: 110px;
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.14);
        pointer-events: none;
      }

      .t {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
      }

      .sl {
        font-size: 11.5px;
        font-weight: 600;
        color: rgba(255, 255, 255, 0.88);
      }

      .si {
        width: 34px;
        height: 34px;
        border-radius: var(--radius-lg, 8px);
        display: flex;
        align-items: center;
        justify-content: center;
        background: rgba(255, 255, 255, 0.22);
        color: #ffffff;
        flex-shrink: 0;

        ::ng-deep svg {
          width: 17px;
          height: 17px;
        }
      }

      .sv {
        font-size: 26px;
        font-weight: 800;
        margin-top: 8px;
        letter-spacing: -0.5px;
        line-height: 1.2;
      }

      .ss {
        font-size: 11.5px;
        color: rgba(255, 255, 255, 0.88);
        margin-top: 2px;
      }
    }
  `],
})
export class StatCardComponent {
  readonly label = input.required<string>();
  readonly value = input.required<string | number>();
  readonly sub = input<string>('');
  readonly color = input<string>('#E8A33D');
  readonly icon = input<string>('');
}
