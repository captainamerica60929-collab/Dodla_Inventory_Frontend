import { ChangeDetectionStrategy, Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DataTableComponent } from '../../../shared/components/data-table/data-table.component';
import { PillComponent } from '../../../shared/components/pill/pill.component';

@Component({
  selector: 'app-employee-page',
  standalone: true,
  imports: [CommonModule, DataTableComponent, PillComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="panel" style="--acc: var(--purple);">
      <div class="ph">
        <div>
          <h3>Employee Master</h3>
          <div class="sub">Warehouse staff, departments, and designations</div>
        </div>
        <button type="button" class="btn a s">+ Add Employee</button>
      </div>
      <app-data-table [headers]="['ID', 'Name', 'Department', 'Designation', 'Status']">
        <tr>
          <td class="mono">E001</td>
          <td>Ravi Kumar</td>
          <td>Stores</td>
          <td>Store Manager</td>
          <td><app-pill variant="green" text="Active" /></td>
        </tr>
        <tr>
          <td class="mono">E002</td>
          <td>Meena Selvam</td>
          <td>Stores</td>
          <td>Store Keeper</td>
          <td><app-pill variant="green" text="Active" /></td>
        </tr>
        <tr>
          <td class="mono">E003</td>
          <td>Arun Prakash</td>
          <td>Dispatch</td>
          <td>Forklift Operator</td>
          <td><app-pill variant="green" text="Active" /></td>
        </tr>
      </app-data-table>
    </div>
  `,
})
export class EmployeePageComponent {}
