import { ChangeDetectionStrategy, Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DataTableComponent } from '../../../shared/components/data-table/data-table.component';
import { PillComponent } from '../../../shared/components/pill/pill.component';

@Component({
  selector: 'app-inward-page',
  standalone: true,
  imports: [CommonModule, DataTableComponent, PillComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="panel" style="--acc: var(--green);">
      <div class="ph">
        <div>
          <h3>Inward & Putaway Scanning</h3>
          <div class="sub">Scan printed stickers to map inventory items to storage bins</div>
        </div>
        <button type="button" class="btn a">Scan Barcode</button>
      </div>
      <app-data-table [headers]="['Sticker ID', 'Material', 'Batch', 'Qty', 'Mapped Bin', 'Status']">
        <tr>
          <td class="mono">STK-001011</td>
          <td class="mono">M100</td>
          <td class="mono">B2610A</td>
          <td class="mono">200</td>
          <td class="mono">A-01-01</td>
          <td><app-pill variant="Inwarded" text="Inwarded" /></td>
        </tr>
      </app-data-table>
    </div>
  `,
})
export class InwardPageComponent {}
