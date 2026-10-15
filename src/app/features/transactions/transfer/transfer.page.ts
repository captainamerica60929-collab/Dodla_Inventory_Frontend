import { ChangeDetectionStrategy, Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DataTableComponent } from '../../../shared/components/data-table/data-table.component';
import { PillComponent } from '../../../shared/components/pill/pill.component';

@Component({
  selector: 'app-transfer-page',
  standalone: true,
  imports: [CommonModule, DataTableComponent, PillComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="panel" style="--acc: var(--blue);">
      <div class="ph">
        <div>
          <h3>Location Transfer</h3>
          <div class="sub">Relocate stock between warehouse bins and consolidation zones</div>
        </div>
        <button type="button" class="btn a">Initiate Transfer</button>
      </div>
      <app-data-table [headers]="['Sticker ID', 'Material', 'From Bin', 'To Bin', 'Qty', 'Reason', 'Status']">
        <tr>
          <td class="mono">STK-4900003</td>
          <td>Bearing 6205</td>
          <td class="mono">A-01-02</td>
          <td class="mono">A-02-01</td>
          <td class="mono">50</td>
          <td>Stock consolidation</td>
          <td><app-pill variant="amber" text="In Progress" /></td>
        </tr>
      </app-data-table>
    </div>
  `,
})
export class TransferPageComponent {}
