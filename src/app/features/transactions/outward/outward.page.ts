import { ChangeDetectionStrategy, Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DataTableComponent } from '../../../shared/components/data-table/data-table.component';
import { PillComponent } from '../../../shared/components/pill/pill.component';

@Component({
  selector: 'app-outward-page',
  standalone: true,
  imports: [CommonModule, DataTableComponent, PillComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="panel" style="--acc: var(--orange);">
      <div class="ph">
        <div>
          <h3>Outward FIFO Dispatch</h3>
          <div class="sub">FIFO-enforced material issuance for production and sales orders</div>
        </div>
        <button type="button" class="btn a">Issue Material</button>
      </div>
      <app-data-table [headers]="['Material', 'Suggested Sticker', 'Bin Location', 'Lot Age', 'Action']">
        <tr>
          <td class="mono"><b>M100</b> Steel Bolt M8</td>
          <td class="mono">STK-4900001</td>
          <td class="mono">A-01-01</td>
          <td>41 days (Oldest lot)</td>
          <td><app-pill variant="Issued" text="Issued" /></td>
        </tr>
      </app-data-table>
    </div>
  `,
})
export class OutwardPageComponent {}
