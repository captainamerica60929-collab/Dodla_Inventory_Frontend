import { ChangeDetectionStrategy, Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DataTableComponent } from '../../../shared/components/data-table/data-table.component';
import { PillComponent } from '../../../shared/components/pill/pill.component';

@Component({
  selector: 'app-grn-page',
  standalone: true,
  imports: [CommonModule, DataTableComponent, PillComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="panel" style="--acc: var(--amber);">
      <div class="ph">
        <div>
          <h3>GRN & Sticker Printing</h3>
          <div class="sub">Goods receipt notes synced from SAP awaiting barcode printing</div>
        </div>
        <div style="display: flex; gap: 8px;">
          <button type="button" class="btn">Fetch from SAP</button>
          <button type="button" class="btn a">Print Selected</button>
        </div>
      </div>
      <app-data-table [headers]="['GRN #', 'PO #', 'Vendor', 'Material', 'Batch', 'Qty', 'Status']">
        <tr>
          <td class="mono">5000101</td>
          <td class="mono">4500012</td>
          <td>Sundaram Fasteners</td>
          <td class="mono">M100</td>
          <td class="mono">B2610A</td>
          <td class="mono">200</td>
          <td><app-pill variant="Open" text="Open" /></td>
        </tr>
        <tr>
          <td class="mono">5000102</td>
          <td class="mono">4500013</td>
          <td>Castrol India</td>
          <td class="mono">M200</td>
          <td class="mono">B2610B</td>
          <td class="mono">20</td>
          <td><app-pill variant="Printed" text="Printed" /></td>
        </tr>
      </app-data-table>
    </div>
  `,
})
export class GrnPageComponent {}
