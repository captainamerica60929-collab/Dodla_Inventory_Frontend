import { ChangeDetectionStrategy, Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DataTableComponent } from '../../../shared/components/data-table/data-table.component';
import { BinBarComponent } from '../../../shared/components/bin-bar/bin-bar.component';

@Component({
  selector: 'app-location-page',
  standalone: true,
  imports: [CommonModule, DataTableComponent, BinBarComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="panel" style="--acc: var(--teal);">
      <div class="ph">
        <div>
          <h3>Location Master</h3>
          <div class="sub">Zones, racks, and bin capacities</div>
        </div>
        <button type="button" class="btn a s">+ Add Location</button>
      </div>
      <app-data-table [headers]="['Bin Code', 'Zone', 'Capacity', 'Used', 'Utilization']">
        <tr>
          <td class="mono">A-01-01</td>
          <td class="mono">Zone A</td>
          <td class="mono">800</td>
          <td class="mono">500</td>
          <td><app-bin-bar [used]="500" [capacity]="800" /></td>
        </tr>
        <tr>
          <td class="mono">A-01-02</td>
          <td class="mono">Zone A</td>
          <td class="mono">600</td>
          <td class="mono">580</td>
          <td><app-bin-bar [used]="580" [capacity]="600" /></td>
        </tr>
        <tr>
          <td class="mono">B-01-01</td>
          <td class="mono">Zone B</td>
          <td class="mono">100</td>
          <td class="mono">40</td>
          <td><app-bin-bar [used]="40" [capacity]="100" /></td>
        </tr>
        <tr>
          <td class="mono">C-01-01</td>
          <td class="mono">Zone C</td>
          <td class="mono">200</td>
          <td class="mono">40</td>
          <td><app-bin-bar [used]="40" [capacity]="200" /></td>
        </tr>
      </app-data-table>
    </div>
  `,
})
export class LocationPageComponent {}
