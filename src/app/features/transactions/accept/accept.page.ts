import { ChangeDetectionStrategy, Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DataTableComponent } from '../../../shared/components/data-table/data-table.component';
import { PillComponent } from '../../../shared/components/pill/pill.component';

@Component({
  selector: 'app-accept-page',
  standalone: true,
  imports: [CommonModule, DataTableComponent, PillComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="panel" style="--acc: var(--green);">
      <div class="ph">
        <div>
          <h3>User Acceptance Verification</h3>
          <div class="sub">Verify and approve physical stock counts, transfers, and discrepancies</div>
        </div>
        <div style="display: flex; gap: 8px;">
          <button type="button" class="btn s">Filter</button>
          <button type="button" class="btn a s">Batch Accept</button>
        </div>
      </div>
      <app-data-table [headers]="['Task ID', 'Transaction Type', 'Originator', 'Sticker / Material', 'Status']">
        <tr>
          <td class="mono">ACC-104</td>
          <td>Physical Count Verification</td>
          <td>Ravi Kumar</td>
          <td><span class="mono">STK-4900001</span> (M100)</td>
          <td><app-pill variant="Accepted" text="Accepted" /></td>
        </tr>
        <tr>
          <td class="mono">ACC-105</td>
          <td>Bin Transfer Audit</td>
          <td>Arun Prakash</td>
          <td><span class="mono">STK-4900003</span> (M300)</td>
          <td><app-pill variant="Processed" text="Processed" /></td>
        </tr>
        <tr>
          <td class="mono">ACC-106</td>
          <td>Discrepancy Check</td>
          <td>Meena Selvam</td>
          <td><span class="mono">STK-4900004</span> (M200)</td>
          <td><app-pill variant="Rejected" text="Rejected" /></td>
        </tr>
      </app-data-table>
    </div>
  `,
})
export class AcceptPageComponent {}
