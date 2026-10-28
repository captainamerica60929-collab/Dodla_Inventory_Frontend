import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { CommonModule } from '@angular/common';

export type PillVariant =
  | 'Open'
  | 'Printed'
  | 'Inwarded'
  | 'Partial'
  | 'New'
  | 'Processed'
  | 'Error'
  | 'Issued'
  | 'Accepted'
  | 'Rejected'
  | 'amber'
  | 'blue'
  | 'green'
  | 'red'
  | 'purple'
  | 'default';

@Component({
  selector: 'app-pill',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span class="pill" [ngClass]="computedClass()">
      @if (text()) {
        {{ text() }}
      } @else {
        <ng-content />
      }
    </span>
  `,
  styles: [`
    :host {
      display: inline-flex;
    }

    .pill {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      padding: 3px 9px;
      border-radius: 20px;
      font-size: 11px;
      font-weight: 600;
      line-height: 1.3;
      white-space: nowrap;

      &::before {
        content: '';
        width: 6px;
        height: 6px;
        border-radius: 50%;
        background: currentColor;
      }

      // Prototype & custom status mappings
      &.Open,
      &.Issued,
      &.New,
      &.amber {
        background: var(--amberBg);
        color: var(--amberD);
      }

      &.Printed,
      &.blue {
        background: var(--blueBg);
        color: var(--blue);
      }

      &.Inwarded,
      &.Processed,
      &.Accepted,
      &.green {
        background: var(--greenBg);
        color: var(--green);
      }

      &.Error,
      &.Rejected,
      &.red {
        background: var(--redBg);
        color: var(--red);
      }

      &.Partial,
      &.purple {
        background: var(--purpleBg);
        color: var(--purple);
      }

      &.default {
        background: var(--bg);
        color: var(--dim);
      }
    }
  `],
})
export class PillComponent {
  readonly variant = input<PillVariant | string>('default');
  readonly text = input<string>();

  protected readonly computedClass = computed(() => {
    const v = this.variant();
    return v || 'default';
  });
}
