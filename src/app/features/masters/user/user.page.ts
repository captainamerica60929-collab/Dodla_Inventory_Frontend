import { ChangeDetectionStrategy, Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DataTableComponent } from '../../../shared/components/data-table/data-table.component';
import { PillComponent } from '../../../shared/components/pill/pill.component';

@Component({
  selector: 'app-user-page',
  standalone: true,
  imports: [CommonModule, DataTableComponent, PillComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="panel" style="--acc: var(--red);">
      <div class="ph">
        <div>
          <h3>User & Role Management</h3>
          <div class="sub">System accounts and access control roles</div>
        </div>
        <button type="button" class="btn a s">+ Add User</button>
      </div>
      <app-data-table [headers]="['Username', 'Employee ID', 'Role', 'Status']">
        <tr>
          <td class="mono">ravi.k</td>
          <td class="mono">E001</td>
          <td><b>Admin</b></td>
          <td><app-pill variant="green" text="Active" /></td>
        </tr>
        <tr>
          <td class="mono">meena.s</td>
          <td class="mono">E002</td>
          <td><b>Store Keeper</b></td>
          <td><app-pill variant="green" text="Active" /></td>
        </tr>
        <tr>
          <td class="mono">arun.p</td>
          <td class="mono">E003</td>
          <td><b>Operator</b></td>
          <td><app-pill variant="green" text="Active" /></td>
        </tr>
      </app-data-table>
    </div>
  `,
})
export class UserPageComponent {}
