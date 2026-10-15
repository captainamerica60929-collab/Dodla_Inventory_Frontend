import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Output,
  computed,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { NavigationEnd, Router } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { filter, map, startWith } from 'rxjs';
import { SessionService } from '../../session/session.service';
import { ThemeService } from '../../theme/theme.service';
import { NAVIGATION_GROUPS, NavItem } from '../navigation';

@Component({
  selector: 'app-topbar',
  standalone: true,
  imports: [CommonModule],
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
        <!-- Branch indicator -->
        <div class="branch-pill">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="branch-icon">
            <path d="M3 21h18M3 10h18M5 10v11M19 10v11M9 21v-4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v4M12 3l9 7H3z"/>
          </svg>
          <span>{{ branchText() }}</span>
        </div>

        <!-- Take a tour placeholder -->
        <button
          type="button"
          class="btn s ghost tour-btn"
          disabled
          data-tour="take-tour-btn"
          title="Guided tours will be enabled with driver.js"
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

        <!-- User profile area -->
        <div class="user" data-tour="top-user">
          <div class="av">{{ userInitials() }}</div>
          <div class="user-info">
            <b class="user-name">{{ userName() }}</b>
            <small class="user-role">{{ userDepartment() }}</small>
          </div>
        </div>
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

    .user {
      display: flex;
      gap: 9px;
      align-items: center;
      padding-left: 6px;
      border-left: 1px solid var(--line);

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
          color: var(--faint);
        }
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
      .user-role {
        display: none;
      }
    }
  `],
})
export class TopbarComponent {
  private readonly router = inject(Router);
  protected readonly session = inject(SessionService);
  protected readonly themeService = inject(ThemeService);

  @Output() readonly toggleSidebar = new EventEmitter<void>();

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
  protected readonly userDepartment = computed(() => this.session.userDepartment());
}
