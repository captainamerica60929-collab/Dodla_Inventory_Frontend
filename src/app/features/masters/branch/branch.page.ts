import { ChangeDetectionStrategy, Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DataTableComponent } from '../../../shared/components/data-table/data-table.component';
import { PillComponent } from '../../../shared/components/pill/pill.component';

@Component({
  selector: 'app-branch-page',
  standalone: true,
  imports: [CommonModule, DataTableComponent, PillComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="panel" style="--acc: var(--amber);">
      <div class="ph">
        <div>
          <h3>Branch Master</h3>
          <div class="sub">Warehouse branches, facilities, and regional distribution points</div>
        </div>
        <button type="button" class="btn a s">+ Add Branch</button>
      </div>
      <app-data-table [headers]="['Branch Code', 'Branch Name', 'Location / City', 'Status']">
        <tr>
          <td class="mono">BR-01</td>
          <td><b>Main Warehouse</b></td>
          <td>Chennai Central</td>
          <td><app-pill variant="green" text="Active" /></td>
        </tr>
        <tr>
          <td class="mono">BR-02</td>
          <td><b>North Distribution Hub</b></td>
          <td>Sriperumbudur</td>
          <td><app-pill variant="green" text="Active" /></td>
        </tr>
      </app-data-table>
    </div>
  `,
})
export class BranchPageComponent {}
