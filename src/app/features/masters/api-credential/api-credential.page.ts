import { ChangeDetectionStrategy, Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DataTableComponent } from '../../../shared/components/data-table/data-table.component';
import { PillComponent } from '../../../shared/components/pill/pill.component';

@Component({
  selector: 'app-api-credential-page',
  standalone: true,
  imports: [CommonModule, DataTableComponent, PillComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="panel" style="--acc: var(--blue);">
      <div class="ph">
        <div>
          <h3>SAP API Credentials</h3>
          <div class="sub">Endpoints and service tokens for SAP GRN & inventory synchronization</div>
        </div>
        <button type="button" class="btn a s">+ Add Credential</button>
      </div>
      <app-data-table [headers]="['Service Name', 'Endpoint URL', 'Auth Type', 'Last Sync', 'Status']">
        <tr>
          <td><b>SAP S/4HANA GRN Feed</b></td>
          <td class="mono">/api/sap/grn-sync</td>
          <td class="mono">OAuth 2.0 / Bearer</td>
          <td>Today, 10:30 AM</td>
          <td><app-pill variant="green" text="Connected" /></td>
        </tr>
      </app-data-table>
    </div>
  `,
})
export class ApiCredentialPageComponent {}
