import { Injectable, effect, inject, signal } from '@angular/core';
import { DOCUMENT } from '@angular/common';

export type AppTheme = 'light' | 'dark' | 'auto';

const THEME_STORAGE_KEY = 'waretrack_theme';

@Injectable({
  providedIn: 'root',
})
export class ThemeService {
  private readonly document = inject(DOCUMENT);

  readonly theme = signal<AppTheme>(this.getInitialTheme());
  readonly isDark = signal<boolean>(false);

  constructor() {
    this.updateDarkModeState(this.theme());

    effect(() => {
      const currentTheme = this.theme();
      this.applyTheme(currentTheme);
    });

    // Listen to OS system color-scheme changes if 'auto'
    if (typeof window !== 'undefined' && window.matchMedia) {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      mediaQuery.addEventListener('change', () => {
        if (this.theme() === 'auto') {
          this.applyTheme('auto');
        }
      });
    }
  }

  toggleTheme(): void {
    const next: AppTheme = this.theme() === 'dark' ? 'light' : 'dark';
    this.setTheme(next);
  }

  setTheme(theme: AppTheme): void {
    this.theme.set(theme);
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(THEME_STORAGE_KEY, theme);
    }
  }

  private applyTheme(theme: AppTheme): void {
    const root = this.document.documentElement;
    if (theme === 'auto') {
      root.removeAttribute('data-theme');
    } else {
      root.setAttribute('data-theme', theme);
    }
    this.updateDarkModeState(theme);
  }

  private updateDarkModeState(theme: AppTheme): void {
    if (theme === 'dark') {
      this.isDark.set(true);
    } else if (theme === 'light') {
      this.isDark.set(false);
    } else if (typeof window !== 'undefined' && window.matchMedia) {
      this.isDark.set(window.matchMedia('(prefers-color-scheme: dark)').matches);
    } else {
      this.isDark.set(false);
    }
  }

  private getInitialTheme(): AppTheme {
    if (typeof localStorage !== 'undefined') {
      const saved = localStorage.getItem(THEME_STORAGE_KEY) as AppTheme | null;
      if (saved && (saved === 'light' || saved === 'dark' || saved === 'auto')) {
        return saved;
      }
    }
    return 'auto';
  }
}
