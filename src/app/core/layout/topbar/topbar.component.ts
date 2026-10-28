import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  EventEmitter,
  HostListener,
  Output,
  computed,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { NavigationEnd, Router, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { filter, map, startWith } from 'rxjs';
import { AuthService } from '../../auth/auth.service';
import { SessionService } from '../../session/session.service';
import { ThemeService } from '../../theme/theme.service';
import { TourService } from '../../tour/tour.service';
import { NAVIGATION_GROUPS, NavItem } from '../navigation';

@Component({
  selector: 'app-topbar',
  standalone: true,
  imports: [CommonModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="top">
      <button
        type="button"
        class="mt"
        (click)="toggleSidebar.emit()"
        aria-label="Toggle navigation menu"
      >
        ☰
      </button>

      <div class="page-meta">
        <h1 class="page-title">{{ currentMeta().title }}</h1>
        <small class="page-sub">{{ currentMeta().description }}</small>
      </div>

      <div class="top-actions">
        <!-- Branch indicator (fixed per login) -->
        <div
          class="branch-pill"
          title="Branch is fixed for this session. Log out and sign in to select another branch."
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="branch-icon">
            <path d="M3 21h18M3 10h18M5 10v11M19 10v11M9 21v-4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v4M12 3l9 7H3z"/>
          </svg>
          <span>{{ branchText() }}</span>
        </div>

        <!-- Take a tour button -->
        <button
          type="button"
          class="btn s ghost tour-btn"
          [disabled]="!tourService.hasCurrentTour()"
          (click)="tourService.startCurrentTour()"
          data-tour="take-tour-btn"
          [title]="tourService.hasCurrentTour() ? 'Take a tour of this screen' : 'No tour available for this screen'"
          aria-label="Take a tour"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/>
            <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3M12 17h.01"/>
          </svg>
          <span>Take a tour</span>
        </button>

        <!-- Theme toggle -->
        <button
          type="button"
          class="btn s theme-btn"
          (click)="themeService.toggleTheme()"
          data-tour="theme-toggle"
          [attr.aria-label]="'Switch to ' + (themeService.isDark() ? 'light' : 'dark') + ' theme'"
        >
          @if (themeService.isDark()) {
            <!-- Sun icon -->
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="5"/>
              <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
            </svg>
          } @else {
            <!-- Moon icon -->
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
            </svg>
          }
        </button>

        <!-- User profile area with dropdown menu -->
        <div class="user-menu-container">
          <button
            type="button"
            class="user"
            (click)="toggleMenu()"
            [attr.aria-expanded]="showMenu()"
            data-tour="top-user"
          >
            <div class="av">{{ userInitials() }}</div>
            <div class="user-info">
              <b class="user-name">{{ userName() }}</b>
              <small class="user-role">{{ userRole() || 'No role' }}</small>
            </div>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="chevron-icon">
              <polyline points="6 9 12 15 18 9"/>
            </svg>
          </button>

          @if (showMenu()) {
            <div class="user-dropdown" role="menu">
              <div class="menu-header">
                <div class="menu-name">{{ userName() }}</div>
                <div class="menu-role-badge">{{ userRole() }}</div>
                <div class="menu-branch">{{ branchText() }}</div>
              </div>
              <div class="menu-divider"></div>
              <a
                routerLink="/change-password"
                class="menu-item"
                role="menuitem"
                (click)="showMenu.set(false)"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                </svg>
                <span>Change Password</span>
              </a>
              <button
                type="button"
                class="menu-item menu-signout"
                role="menuitem"
                (click)="logout()"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                  <polyline points="16 17 21 12 16 7"/>
                  <line x1="21" y1="12" x2="9" y2="12"/>
                </svg>
                <span>Sign Out</span>
              </button>
            </div>
          }
        </div>

        <!-- Direct Logout button -->
        <button
          type="button"
          class="btn s ghost logout-btn"
          (click)="logout()"
          title="Sign out of WareTrack"
          aria-label="Sign out"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
            <polyline points="16 17 21 12 16 7"/>
            <line x1="21" y1="12" x2="9" y2="12"/>
          </svg>
        </button>
      </div>
    </header>

    <div class="scan-rule"></div>
  `,
  styles: [`
    :host {
      display: block;
      position: sticky;
      top: 0;
      z-index: 30;
    }

    .top {
      height: var(--topbar-height, 62px);
      background: color-mix(in srgb, var(--card) 88%, transparent);
      backdrop-filter: blur(8px);
      border-bottom: 1px solid var(--line);
      display: flex;
      align-items: center;
      gap: 14px;
      padding: 0 22px;
    }

    .mt {
      display: none;
      border: 0;
      background: none;
      font-size: 22px;
      color: var(--text);
      cursor: pointer;
      padding: 4px;
      line-height: 1;
    }

    .page-meta {
      min-width: 0;

      .page-title {
        font-size: 17px;
        font-weight: 700;
        line-height: 1.2;
        margin: 0;
        color: var(--text);
      }

      .page-sub {
        display: block;
        font-size: 11.5px;
        color: var(--faint);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
    }

    .top-actions {
      margin-left: auto;
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .branch-pill {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 4px 10px;
      border-radius: var(--radius-pill, 20px);
      background: var(--bg);
      border: 1px solid var(--line);
      font-size: 12px;
      font-weight: 600;
      color: var(--dim);
      cursor: default;

      .branch-icon {
        width: 13px;
        height: 13px;
        color: var(--amber);
      }
    }

    .tour-btn {
      color: var(--dim);
    }

    .theme-btn {
      width: 32px;
      height: 32px;
      padding: 0;
      border-radius: var(--radius-md, 6px);
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--dim);

      svg {
        width: 16px;
        height: 16px;
      }

      &:hover {
        color: var(--text);
      }
    }

    .user-menu-container {
      position: relative;
    }

    .user {
      display: flex;
      gap: 9px;
      align-items: center;
      padding: 4px 8px;
      border: 1px solid transparent;
      border-radius: var(--radius-md, 6px);
      background: none;
      cursor: pointer;
      text-align: left;
      transition: background 0.15s ease, border-color 0.15s ease;

      &:hover {
        background: var(--bg);
        border-color: var(--line);
      }

      .av {
        width: 32px;
        height: 32px;
        border-radius: 50%;
        background: var(--blueBg);
        color: var(--blue);
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: 700;
        font-size: 12px;
        flex-shrink: 0;
      }

      .user-info {
        .user-name {
          font-size: 12.8px;
          display: block;
          line-height: 1.2;
          color: var(--text);
        }

        .user-role {
          display: block;
          font-size: 10.8px;
          color: var(--amber);
          font-weight: 600;
        }
      }

      .chevron-icon {
        width: 14px;
        height: 14px;
        color: var(--faint);
      }
    }

    .user-dropdown {
      position: absolute;
      top: calc(100% + 6px);
      right: 0;
      width: 230px;
      background: var(--card);
      border: 1px solid var(--line);
      border-radius: var(--radius-lg, 8px);
      box-shadow: var(--shadow-panel-hover);
      padding: 8px 0;
      z-index: 50;
      animation: pop 0.2s cubic-bezier(0.2, 0.9, 0.3, 1.15) both;

      .menu-header {
        padding: 10px 16px 8px;

        .menu-name {
          font-size: 13.5px;
          font-weight: 700;
          color: var(--text);
          line-height: 1.2;
        }

        .menu-role-badge {
          display: inline-block;
          margin-top: 4px;
          font-size: 10.5px;
          font-weight: 700;
          padding: 2px 7px;
          border-radius: var(--radius-pill, 20px);
          background: rgba(232, 163, 61, 0.15);
          color: var(--amber);
        }

        .menu-branch {
          margin-top: 6px;
          font-size: 11px;
          color: var(--faint);
        }
      }

      .menu-divider {
        height: 1px;
        background: var(--line);
        margin: 6px 0;
      }

      .menu-item {
        display: flex;
        align-items: center;
        gap: 10px;
        width: 100%;
        padding: 8px 16px;
        border: none;
        background: none;
        font-size: 13px;
        color: var(--dim);
        cursor: pointer;
        text-decoration: none;
        text-align: left;
        transition: background 0.15s ease, color 0.15s ease;

        svg {
          width: 15px;
          height: 15px;
          flex-shrink: 0;
        }

        &:hover {
          background: var(--bg);
          color: var(--text);
        }

        &.menu-signout {
          color: var(--red);

          &:hover {
            background: rgba(193, 68, 61, 0.08);
            color: var(--red);
          }
        }
      }
    }

    .logout-btn {
      color: var(--dim);
      padding: 6px 8px;

      svg {
        width: 16px;
        height: 16px;
      }

      &:hover {
        color: var(--red);
        background: rgba(193, 68, 61, 0.08);
      }
    }

    @media (max-width: 900px) {
      .top {
        padding: 0 14px;
      }

      .mt {
        display: block;
      }

      .branch-pill,
      .tour-btn,
      .user-role,
      .chevron-icon {
        display: none;
      }
    }
  `],
})
export class TopbarComponent {
  private readonly router = inject(Router);
  private readonly elementRef = inject(ElementRef);
  private readonly authService = inject(AuthService);
  protected readonly session = inject(SessionService);
  protected readonly themeService = inject(ThemeService);
  protected readonly tourService = inject(TourService);

  @Output() readonly toggleSidebar = new EventEmitter<void>();

  readonly showMenu = signal<boolean>(false);

  // Router URL as signal
  private readonly currentUrl = toSignal(
    this.router.events.pipe(
      filter((e) => e instanceof NavigationEnd),
      map(() => this.router.url),
      startWith(this.router.url),
    ),
    { initialValue: this.router.url },
  );

  protected readonly currentMeta = computed(() => {
    const url = this.currentUrl() || '/dashboard';
    const flatItems: NavItem[] = NAVIGATION_GROUPS.flatMap((g) => g.items);
    const matched = flatItems.find((item) => url.startsWith(item.route));

    if (matched) {
      return {
        title: matched.label,
        description: matched.description,
      };
    }

    return {
      title: 'WareTrack WMS',
      description: 'GRN · Putaway · FIFO',
    };
  });

  protected readonly branchText = computed(() => this.session.branchDisplayName());
  protected readonly userInitials = computed(() => this.session.userInitials());
  protected readonly userName = computed(() => this.session.userDisplayName());
  protected readonly userRole = computed(() => this.session.role());

  toggleMenu(): void {
    this.showMenu.update((prev) => !prev);
  }

  logout(): void {
    this.showMenu.set(false);
    this.authService.logout();
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.elementRef.nativeElement.contains(event.target)) {
      this.showMenu.set(false);
    }
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.showMenu.set(false);
  }
}
