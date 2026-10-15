import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  HostListener,
  Output,
  inject,
  input,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { NavigationEnd, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { filter } from 'rxjs';
import { A11yModule } from '@angular/cdk/a11y';
import { NAVIGATION_GROUPS, SVG_ICONS } from '../navigation';
import { SessionService } from '../../session/session.service';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, A11yModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <aside
      class="sb"
      [class.open]="isOpen()"
      cdkTrapFocus
      [cdkTrapFocusAutoCapture]="isOpen()"
      data-tour="sidebar"
      aria-label="Main Navigation"
    >
      <div class="brand">
        <div class="mark">WT</div>
        <div>
          <b>WareTrack WMS</b>
          <small>GRN · Putaway · FIFO</small>
        </div>
      </div>

      <div class="scan-rule"></div>

      <nav class="nv">
        @for (grp of navGroups; track grp.groupName) {
          <div class="gl" [attr.data-tour]="grp.dataTour || null">
            {{ grp.groupName }}
          </div>

          @for (item of grp.items; track item.id) {
            <a
              class="ni"
              [routerLink]="item.route"
              routerLinkActive="on"
              [attr.data-tour]="item.dataTour || null"
              (click)="onItemClick()"
            >
              <span class="icon" [innerHTML]="getIcon(item.icon)"></span>
              <span class="label">{{ item.label }}</span>
              @if (item.badge) {
                <span class="bd">{{ item.badge }}</span>
              }
            </a>
          }
        }
      </nav>

      <div class="sf">
        <span>{{ footerText() }}</span>
      </div>
    </aside>

    @if (isOpen()) {
      <div class="sb-backdrop" (click)="close.emit()" aria-hidden="true"></div>
    }
  `,
  styles: [`
    :host {
      display: block;
    }

    .sb {
      width: var(--sidebar-width, 250px);
      background: linear-gradient(180deg, #1B2430 0%, #1f2d5a 62%, #2c2360 100%);
      color: #C9D3DE;
      position: fixed;
      top: 0;
      left: 0;
      bottom: 0;
      z-index: 40;
      display: flex;
      flex-direction: column;
      transition: transform 0.25s cubic-bezier(0.2, 0.8, 0.2, 1);
    }

    .brand {
      display: flex;
      gap: 10px;
      align-items: center;
      padding: 20px 18px 16px;
      border-bottom: 1px solid var(--n7);

      .mark {
        width: 36px;
        height: 36px;
        border-radius: var(--radius-md, 6px);
        background: linear-gradient(135deg, var(--amber), var(--amberD));
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: 800;
        color: #141B24;
        font-size: 14px;
        animation: glow 3s ease-in-out infinite;
        flex-shrink: 0;
      }

      b {
        display: block;
        color: #ffffff;
        font-size: 15px;
        line-height: 1.2;
      }

      small {
        font-size: 10.5px;
        color: #8CA0B4;
        display: block;
      }
    }

    .nv {
      flex: 1;
      overflow-y: auto;
      padding: 10px;
    }

    .gl {
      font-size: 10.5px;
      font-weight: 600;
      color: #6D8098;
      letter-spacing: 0.6px;
      padding: 14px 10px 6px;
      text-transform: uppercase;
    }

    .ni {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 9px 10px;
      border-radius: var(--radius-sm, 4px);
      color: #B7C3D1;
      font-weight: 500;
      font-size: 13.4px;
      position: relative;
      margin-bottom: 1px;
      cursor: pointer;
      border: 0;
      background: none;
      width: 100%;
      text-align: left;
      text-decoration: none;
      transition: background 0.15s ease, color 0.15s ease;

      .icon {
        display: flex;
        align-items: center;
        justify-content: center;

        ::ng-deep svg {
          width: 17px;
          height: 17px;
          flex-shrink: 0;
          color: var(--ic, #B7C3D1);
          transition: transform 0.2s ease;
        }
      }

      &:hover {
        background: var(--n8);
        color: #ffffff;

        .icon ::ng-deep svg {
          transform: scale(1.18) rotate(-4deg);
          color: #ffffff;
        }
      }

      &.on {
        background: linear-gradient(90deg, rgba(255, 255, 255, 0.16), rgba(255, 255, 255, 0.03));
        color: #ffffff;

        &::before {
          content: '';
          position: absolute;
          left: -10px;
          top: 8px;
          bottom: 8px;
          width: 3px;
          background: var(--amber);
          border-radius: 2px;
          box-shadow: 0 0 10px var(--amber);
        }

        .icon ::ng-deep svg {
          color: var(--amber);
        }
      }

      .bd {
        margin-left: auto;
        background: var(--red);
        color: #ffffff;
        font-size: 10px;
        font-weight: 700;
        padding: 1px 6px;
        border-radius: 20px;
      }
    }

    .sf {
      padding: 14px 18px;
      border-top: 1px solid var(--n7);
      font-size: 11px;
      color: #65778C;
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .sb-backdrop {
      display: none;
    }

    @media (max-width: 900px) {
      .sb {
        transform: translateX(-100%);

        &.open {
          transform: translateX(0);
        }
      }

      .sb-backdrop {
        display: block;
        position: fixed;
        inset: 0;
        background: rgba(0, 0, 0, 0.5);
        backdrop-filter: blur(2px);
        z-index: 35;
      }
    }
  `],
})
export class SidebarComponent {
  private readonly session = inject(SessionService);
  private readonly router = inject(Router);

  readonly isOpen = input<boolean>(false);
  @Output() readonly close = new EventEmitter<void>();

  protected readonly navGroups = NAVIGATION_GROUPS;

  constructor() {
    this.router.events
      .pipe(
        filter((e) => e instanceof NavigationEnd),
        takeUntilDestroyed(),
      )
      .subscribe(() => {
        if (this.isOpen()) {
          this.close.emit();
        }
      });
  }

  @HostListener('document:keydown.escape')
  protected onEscape(): void {
    if (this.isOpen()) {
      this.close.emit();
    }
  }

  protected footerText(): string {
    const branch = this.session.branch();
    return branch ? `${branch.name} · WMS Active` : 'WareTrack WMS';
  }

  protected getIcon(name: string): string {
    return SVG_ICONS[name] || SVG_ICONS['doc'];
  }

  protected onItemClick(): void {
    if (typeof window !== 'undefined' && window.innerWidth <= 900) {
      this.close.emit();
    }
  }
}
