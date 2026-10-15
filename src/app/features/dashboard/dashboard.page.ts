import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PillComponent } from '../../shared/components/pill/pill.component';
import { StatCardComponent } from '../../shared/components/stat-card/stat-card.component';
import { DataTableComponent } from '../../shared/components/data-table/data-table.component';
import { BinBarComponent } from '../../shared/components/bin-bar/bin-bar.component';
import { ModalComponent } from '../../shared/components/modal/modal.component';
import { ModalService } from '../../shared/components/modal/modal.service';

@Component({
  selector: 'app-dashboard-page',
  standalone: true,
  imports: [
    CommonModule,
    PillComponent,
    StatCardComponent,
    DataTableComponent,
    BinBarComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="dashboard enter">
      <!-- Hero header banner matching prototype -->
      <div class="hero">
        <h2>Warehouse Operations Overview</h2>
        <p>Live inventory tracking, FIFO enforcement, and location bin capacity.</p>
        <div class="qa">
          <button type="button" class="qa-btn" (click)="openQuickModal('inward')">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 3v12M7 10l5 5 5-5M4 20h16"/>
            </svg>
            <span>Scan Inward</span>
          </button>
          <button type="button" class="qa-btn" (click)="openQuickModal('outward')">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 21V9M7 14l5-5 5 5M4 4h16"/>
            </svg>
            <span>Outward FIFO</span>
          </button>
          <button type="button" class="qa-btn" (click)="openQuickModal('transfer')">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M7 7h13M16 3l4 4-4 4M17 17H4M8 13l-4 4 4 4"/>
            </svg>
            <span>Transfer Bin</span>
          </button>
        </div>
      </div>

      <!-- Stat Cards Grid -->
      <div class="sg">
        <app-stat-card
          label="Pending Inward"
          [value]="28"
          sub="Awaiting putaway"
          color="#E8A33D"
          icon='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 3v12M7 10l5 5 5-5M4 20h16"/></svg>'
        />
        <app-stat-card
          label="Total Items In Stock"
          [value]="1420"
          sub="Across 6 zones"
          color="#2F6F4E"
          icon='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 8l-9-5-9 5v8l9 5 9-5z M3 8l9 5 9-5 M12 13v8"/></svg>'
        />
        <app-stat-card
          label="Oldest Lot Age"
          [value]="'41d'"
          sub="Batch B2608X · Zone A"
          color="#C1443D"
          icon='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>'
        />
        <app-stat-card
          label="Active Locations"
          [value]="'84%'"
          sub="26 of 31 bins occupied"
          color="#2E6BA6"
          icon='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 21s-7-6-7-11a7 7 0 0114 0c0 5-7 11-7 11z"/><circle cx="12" cy="10" r="2.5"/></svg>'
        />
      </div>

      <!-- Two column grid -->
      <div class="g2">
        <!-- Recent Stock Receipts -->
        <div class="panel" style="--acc: var(--amber);">
          <div class="ph">
            <div>
              <h3>Recent Stock Receipts</h3>
              <div class="sub">Latest inward & putaway transactions</div>
            </div>
            <button type="button" class="btn s">View All</button>
          </div>
          <app-data-table [headers]="['Sticker ID', 'Material', 'Batch', 'Qty', 'Location', 'Status']">
            <tr>
              <td class="mono">STK-001011</td>
              <td><b>Steel Bolt M8</b> (box)</td>
              <td class="mono">B2610A</td>
              <td class="mono">200</td>
              <td class="mono">A-01-01</td>
              <td><app-pill variant="Inwarded" text="Inwarded" /></td>
            </tr>
            <tr>
              <td class="mono">STK-001021</td>
              <td><b>Hydraulic Oil 20L</b></td>
              <td class="mono">B2610B</td>
              <td class="mono">20</td>
              <td class="mono">B-01-01</td>
              <td><app-pill variant="Partial" text="Partial" /></td>
            </tr>
            <tr>
              <td class="mono">STK-001031</td>
              <td><b>Bearing 6205</b></td>
              <td class="mono">B2610C</td>
              <td class="mono">150</td>
              <td class="mono">A-01-02</td>
              <td><app-pill variant="Printed" text="Printed" /></td>
            </tr>
            <tr>
              <td class="mono">STK-001041</td>
              <td><b>Gasket Set</b></td>
              <td class="mono">B2610D</td>
              <td class="mono">40</td>
              <td class="mono">-</td>
              <td><app-pill variant="New" text="New" /></td>
            </tr>
          </app-data-table>
        </div>

        <!-- Bin Capacity Utilization -->
        <div class="panel" style="--acc: var(--blue);">
          <div class="ph">
            <div>
              <h3>Bin Capacity Utilization</h3>
              <div class="sub">High-traffic zone occupancy</div>
            </div>
          </div>
          <div class="pb">
            <app-bin-bar label="A-01-01 (Zone A)" [used]="500" [capacity]="800" [showRow]="true" />
            <app-bin-bar label="A-01-02 (Zone A)" [used]="580" [capacity]="600" [showRow]="true" />
            <app-bin-bar label="B-01-01 (Zone B)" [used]="40" [capacity]="100" [showRow]="true" />
            <app-bin-bar label="B-01-02 (Zone B)" [used]="95" [capacity]="100" [showRow]="true" />
            <app-bin-bar label="C-01-01 (Zone C)" [used]="40" [capacity]="200" [showRow]="true" />
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
    }

    .enter > * {
      animation: rise 0.5s cubic-bezier(0.2, 0.8, 0.2, 1) both;
    }
    .enter > *:nth-child(2) { animation-delay: 0.06s; }
    .enter > *:nth-child(3) { animation-delay: 0.12s; }

    .hero {
      border-radius: var(--radius-2xl, 12px);
      padding: 22px 24px;
      color: #ffffff;
      background: linear-gradient(120deg, #1B2430 0%, #2E6BA6 42%, #6B4FA3 72%, #C67F1F 115%);
      background-size: 220% 220%;
      animation: flow 14s ease infinite;
      margin-bottom: 18px;

      h2 {
        font-size: 22px;
        font-weight: 800;
      }

      p {
        opacity: 0.85;
        font-size: 13px;
        margin: 2px 0 16px;
      }
    }

    .qa {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
      gap: 10px;

      .qa-btn {
        border: 0;
        border-radius: var(--radius-xl, 10px);
        padding: 12px 14px;
        color: #ffffff;
        font-weight: 700;
        text-align: left;
        display: flex;
        gap: 10px;
        align-items: center;
        background: rgba(255, 255, 255, 0.16);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.25);
        transition: transform 0.15s ease, box-shadow 0.15s ease, background 0.15s ease;

        &:hover {
          transform: translateY(-3px);
          background: rgba(255, 255, 255, 0.25);
          box-shadow: 0 10px 22px rgba(0, 0, 0, 0.35);
        }

        svg {
          width: 20px;
          height: 20px;
          flex-shrink: 0;
        }
      }
    }

    .sg {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 14px;
      margin-bottom: 18px;
    }

    .g2 {
      display: grid;
      grid-template-columns: 1.2fr 0.8fr;
      gap: 16px;
    }

    @media (max-width: 900px) {
      .sg {
        grid-template-columns: repeat(2, 1fr);
      }

      .g2 {
        grid-template-columns: 1fr;
      }
    }
  `],
})
export class DashboardPageComponent {
  private readonly modalService = inject(ModalService);

  protected openQuickModal(action: string): void {
    const dialogRef = this.modalService.open(ModalDemoDialogComponent, {
      data: { action },
    });
  }
}

@Component({
  standalone: true,
  imports: [CommonModule, ModalComponent],
  template: `
    <app-modal [title]="'Quick ' + actionTitle" (closed)="close()">
      <p style="margin-bottom: 12px;">
        Scan or enter barcode to initiate <b>{{ actionTitle }}</b> workflow.
      </p>
      <div style="display: flex; gap: 8px;">
        <input
          type="text"
          class="mono"
          placeholder="Scan barcode..."
          style="flex: 1;"
          autofocus
        />
        <button type="button" class="btn a">Scan</button>
      </div>

      <div slot="footer">
        <button type="button" class="btn" (click)="close()">Cancel</button>
        <button type="button" class="btn p" (click)="close()">Proceed</button>
      </div>
    </app-modal>
  `,
})
export class ModalDemoDialogComponent {
  private readonly modalService = inject(ModalService);
  actionTitle = 'Transaction';

  close(): void {
    this.modalService.closeAll();
  }
}
