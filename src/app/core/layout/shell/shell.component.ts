import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { SidebarComponent } from '../sidebar/sidebar.component';
import { TopbarComponent } from '../topbar/topbar.component';
import { ToastContainerComponent } from '../../components/toast-container/toast-container.component';

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    SidebarComponent,
    TopbarComponent,
    ToastContainerComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-sidebar [isOpen]="sidebarOpen()" (close)="sidebarOpen.set(false)" />

    <div class="main">
      <app-topbar (toggleSidebar)="toggleSidebar()" />
      <main class="ct">
        <router-outlet />
      </main>
    </div>

    <app-toast-container />
  `,
  styles: [`
    :host {
      display: block;
      min-height: 100dvh;
    }

    .main {
      margin-left: var(--sidebar-width, 250px);
      min-width: 0;
      min-height: 100dvh;
      display: flex;
      flex-direction: column;
      transition: margin-left 0.25s ease;
    }

    .ct {
      padding: 22px 26px 60px;
      flex: 1;
    }

    @media (max-width: 900px) {
      .main {
        margin-left: 0;
      }

      .ct {
        padding: 16px 14px 50px;
      }
    }
  `],
})
export class ShellComponent {
  protected readonly sidebarOpen = signal<boolean>(false);

  protected toggleSidebar(): void {
    this.sidebarOpen.update((v) => !v);
  }
}
