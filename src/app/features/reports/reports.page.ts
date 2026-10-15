import { ChangeDetectionStrategy, Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DataTableComponent } from '../../shared/components/data-table/data-table.component';
import { PillComponent } from '../../shared/components/pill/pill.component';

@Component({
  selector: 'app-reports-page',
  standalone: true,
  imports: [CommonModule, DataTableComponent, PillComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="panel" style="--acc: var(--purple);">
      <div class="ph">
        <div>
          <h3>Warehouse Reports & Analytics</h3>
          <div class="sub">Stock aging, FIFO compliance, location occupancy, and movement ledger</div>
        </div>
        <div style="display: flex; gap: 8px;">
          <button type="button" class="btn s">Export CSV</button>
          <button type="button" class="btn a s">Export PDF</button>
        </div>
      </div>
      <app-data-table [headers]="['Report Name', 'Scope', 'Frequency', 'Format', 'Status']">
        <tr>
          <td><b>FIFO Aging Analysis</b></td>
          <td>All Material Batches</td>
          <td>Daily</td>
          <td class="mono">PDF / Excel</td>
          <td><app-pill variant="green" text="Ready" /></td>
        </tr>
        <tr>
          <td><b>Location Occupancy Breakdown</b></td>
          <td>Zones A, B, C</td>
          <td>Real-time</td>
          <td class="mono">Interactive / CSV</td>
          <td><app-pill variant="green" text="Ready" /></td>
        </tr>
        <tr>
          <td><b>Stock Movement Audit Ledger</b></td>
          <td>All IN / OUT / TR</td>
          <td>On Demand</td>
          <td class="mono">Excel</td>
          <td><app-pill variant="green" text="Ready" /></td>
        </tr>
      </app-data-table>
    </div>
  `,
})
export class ReportsPageComponent {}
