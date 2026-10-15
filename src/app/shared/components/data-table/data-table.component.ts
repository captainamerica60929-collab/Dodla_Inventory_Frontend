import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-data-table',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="tw">
      <table>
        @if (headers().length > 0) {
          <thead>
            <tr>
              @for (h of headers(); track h) {
                <th>{{ h }}</th>
              }
            </tr>
          </thead>
        }
        <tbody>
          <ng-content />
        </tbody>
      </table>
      @if (isEmpty()) {
        <div class="empty-state">{{ emptyText() }}</div>
      }
    </div>
  `,
  styles: [`
    :host {
      display: block;
      width: 100%;
    }

    .tw {
      overflow-x: auto;
      width: 100%;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 12.8px;
    }

    ::ng-deep th {
      text-align: left;
      padding: 9px 12px;
      background: color-mix(in srgb, var(--acc, var(--amber)) 10%, var(--bg));
      color: var(--dim);
      font-weight: 600;
      font-size: 11px;
      letter-spacing: 0.3px;
      white-space: nowrap;
      border-bottom: 1px solid var(--line);
    }

    ::ng-deep td {
      padding: 10px 12px;
      border-bottom: 1px solid var(--line);
      white-space: nowrap;
      color: var(--text);
    }

    ::ng-deep th:first-child,
    ::ng-deep td:first-child {
      position: sticky;
      left: 0;
      z-index: 2;
      background: var(--card);
    }

    ::ng-deep th:first-child {
      z-index: 3;
      background: color-mix(in srgb, var(--acc, var(--amber)) 10%, var(--bg));
    }

    ::ng-deep tbody tr {
      transition: background 0.15s ease;

      &:hover {
        background: color-mix(in srgb, var(--acc, var(--amber)) 8%, var(--card));
      }

      &:last-child td {
        border-bottom: 0;
      }

      &.highlight td {
        background: var(--amberBg);
      }
    }

    .empty-state {
      padding: 24px 18px;
      text-align: center;
      color: var(--faint);
      font-size: 13px;
    }
  `],
})
export class DataTableComponent {
  readonly headers = input<string[]>([]);
  readonly isEmpty = input<boolean>(false);
  readonly emptyText = input<string>('No records.');
}
