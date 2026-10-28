import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-bin-bar',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (showRow()) {
      <div class="br">
        @if (label()) {
          <span class="lbl">{{ label() }}</span>
        }
        <div class="bar">
          <i [style.width.%]="percent()" [style.background]="barColor()"></i>
        </div>
        <span class="val mono">{{ percent() }}%</span>
      </div>
    } @else {
      <div class="bar" [title]="(label() ? label() + ': ' : '') + percent() + '%'">
        <i [style.width.%]="percent()" [style.background]="barColor()"></i>
      </div>
    }
  `,
  styles: [`
    :host {
      display: block;
      width: 100%;
    }

    .br {
      display: grid;
      grid-template-columns: 130px 1fr 50px;
      gap: 10px;
      align-items: center;
      font-size: 12.5px;
    }

    .lbl {
      font-weight: 500;
      color: var(--text);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .val {
      font-size: 11.5px;
      color: var(--dim);
      text-align: right;
    }

    .bar {
      height: 8px;
      border-radius: 5px;
      background: var(--line);
      overflow: hidden;
      min-width: 90px;
      position: relative;
    }

    .bar i {
      display: block;
      height: 100%;
      border-radius: 5px;
      transition: width 0.6s cubic-bezier(0.2, 0.8, 0.2, 1);
      animation: grow 1s ease-out both;
    }
  `],
})
export class BinBarComponent {
  readonly used = input.required<number>();
  readonly capacity = input.required<number>();
  readonly label = input<string>();
  readonly showRow = input<boolean>(false);
  readonly customColor = input<string>();

  readonly percent = computed(() => {
    const cap = this.capacity();
    if (cap <= 0) return 0;
    const u = this.used();
    const p = Math.round((u / cap) * 100);
    return Math.min(Math.max(p, 0), 100);
  });

  readonly barColor = computed(() => {
    const custom = this.customColor();
    if (custom) return custom;

    const p = this.percent();
    if (p > 90) return 'var(--red, #C1443D)';
    if (p > 75) return 'var(--amber, #E8A33D)';
    return 'var(--green, #2F6F4E)';
  });
}
