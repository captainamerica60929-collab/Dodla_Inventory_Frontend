import { ChangeDetectionStrategy, Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DataTableComponent } from '../../../shared/components/data-table/data-table.component';
import { PillComponent } from '../../../shared/components/pill/pill.component';

@Component({
  selector: 'app-material-page',
  standalone: true,
  imports: [CommonModule, DataTableComponent, PillComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="panel" style="--acc: var(--blue);">
      <div class="ph">
        <div>
          <h3>Material Master</h3>
          <div class="sub">Catalog of raw materials, parts, and storage requirements</div>
        </div>
        <button type="button" class="btn a s">+ Add Material</button>
      </div>
      <app-data-table [headers]="['Code', 'Description', 'UOM', 'Default Zone', 'Status']">
        <tr>
          <td class="mono">M100</td>
          <td>Steel Bolt M8 (box)</td>
          <td class="mono">BOX</td>
          <td class="mono">Zone A</td>
          <td><app-pill variant="green" text="Active" /></td>
        </tr>
        <tr>
          <td class="mono">M200</td>
          <td>Hydraulic Oil 20L</td>
          <td class="mono">DRM</td>
          <td class="mono">Zone B</td>
          <td><app-pill variant="green" text="Active" /></td>
        </tr>
        <tr>
          <td class="mono">M300</td>
          <td>Bearing 6205</td>
          <td class="mono">BOX</td>
          <td class="mono">Zone A</td>
          <td><app-pill variant="green" text="Active" /></td>
        </tr>
        <tr>
          <td class="mono">M400</td>
          <td>Gasket Set</td>
          <td class="mono">SET</td>
          <td class="mono">Zone C</td>
          <td><app-pill variant="green" text="Active" /></td>
        </tr>
      </app-data-table>
    </div>
  `,
})
export class MaterialPageComponent {}
