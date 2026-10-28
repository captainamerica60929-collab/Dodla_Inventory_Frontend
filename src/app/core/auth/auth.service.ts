import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';
import { ApiService } from '../api/api.service';
import { SessionService, UserRole } from '../session/session.service';
import {
  BranchLookupDto,
  ChangePasswordRequest,
  LoginBranchDto,
  LoginRequest,
  LoginResponse,
  LoginUserDto,
  MeDto,
} from './auth.models';

const STORAGE_KEY_TOKEN = 'wt_auth_token';
const STORAGE_KEY_EXPIRES = 'wt_auth_expires';
const STORAGE_KEY_USER = 'wt_auth_user';
const STORAGE_KEY_BRANCH = 'wt_auth_branch';
const STORAGE_KEY_MUST_CHANGE = 'wt_auth_must_change';

export function sanitizeReturnUrl(url?: string | null): string {
  if (!url) return '/dashboard';
  const trimmed = url.trim();
  // Must start with single '/', not '//', and not contain ':' (prevents scheme e.g. javascript:, http:)
  if (trimmed.startsWith('/') && !trimmed.startsWith('//') && !trimmed.includes(':')) {
    return trimmed;
  }
  return '/dashboard';
}

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly api = inject(ApiService);
  private readonly router = inject(Router);
  private readonly session = inject(SessionService);

  private expiryTimerId: ReturnType<typeof setTimeout> | null = null;

  // Signals
  readonly token = signal<string | null>(null);
  readonly currentUser = signal<LoginUserDto | null>(null);
  readonly currentBranch = signal<LoginBranchDto | null>(null);
  readonly currentRole = signal<UserRole | null>(null);
  readonly mustChangePassword = signal<boolean>(false);

  readonly isAuthenticated = computed(() => !!this.token());

  constructor() {
    this.restoreSession();
  }

  /**
   * Restores stored session on browser reload and validates with GET /api/auth/me
   */
  private restoreSession(): void {
    if (typeof window === 'undefined' || !window.sessionStorage) return;

    try {
      const storedToken = sessionStorage.getItem(STORAGE_KEY_TOKEN);
      const expiresAt = sessionStorage.getItem(STORAGE_KEY_EXPIRES);
      const storedUser = sessionStorage.getItem(STORAGE_KEY_USER);
      const storedBranch = sessionStorage.getItem(STORAGE_KEY_BRANCH);
      const mustChange = sessionStorage.getItem(STORAGE_KEY_MUST_CHANGE) === 'true';

      if (storedToken && expiresAt) {
        const remainingMs = new Date(expiresAt).getTime() - Date.now();
        if (remainingMs <= 0) {
          this.clearStorage();
          return;
        }

        this.token.set(storedToken);
        this.mustChangePassword.set(mustChange);

        if (storedUser) {
          const user: LoginUserDto = JSON.parse(storedUser);
          this.currentUser.set(user);
          this.currentRole.set(user.role as UserRole);
          this.session.setUser({
            id: String(user.id),
            username: user.username,
            fullName: user.name,
          });
          this.session.setRole(user.role as UserRole);
        }

        if (storedBranch) {
          const branch: LoginBranchDto = JSON.parse(storedBranch);
          this.currentBranch.set(branch);
          this.session.setBranch({
            id: String(branch.id),
            code: branch.code,
            name: branch.name,
          });
        }

        this.scheduleAutoLogout(remainingMs);

        // Fetch fresh user profile on reload
        this.getMe().subscribe({
          error: () => {
            // Error interceptor will handle 401 if token is rejected
          },
        });
      }
    } catch {
      this.clearStorage();
    }
  }

  getActiveBranches(): Observable<BranchLookupDto[]> {
    return this.api.get<BranchLookupDto[]>('auth/branches');
  }

  login(request: LoginRequest): Observable<LoginResponse> {
    return this.api.post<LoginResponse>('auth/login', request).pipe(
      tap((response) => {
        this.token.set(response.token);
        this.currentUser.set(response.user);
        this.currentBranch.set(response.branch);
        this.currentRole.set(response.user.role as UserRole);
        this.mustChangePassword.set(response.mustChangePassword);

        // Update SessionService
        this.session.setUser({
          id: String(response.user.id),
          username: response.user.username,
          fullName: response.user.name,
        });
        this.session.setBranch({
          id: String(response.branch.id),
          code: response.branch.code,
          name: response.branch.name,
        });
        this.session.setRole(response.user.role as UserRole);

        // Store in sessionStorage
        if (typeof window !== 'undefined' && window.sessionStorage) {
          sessionStorage.setItem(STORAGE_KEY_TOKEN, response.token);
          sessionStorage.setItem(STORAGE_KEY_EXPIRES, response.expiresAt);
          sessionStorage.setItem(STORAGE_KEY_USER, JSON.stringify(response.user));
          sessionStorage.setItem(STORAGE_KEY_BRANCH, JSON.stringify(response.branch));
          sessionStorage.setItem(
            STORAGE_KEY_MUST_CHANGE,
            String(response.mustChangePassword),
          );
        }

        // Schedule auto-logout on expiration
        const remainingMs = new Date(response.expiresAt).getTime() - Date.now();
        this.scheduleAutoLogout(remainingMs);
      }),
    );
  }

  getMe(): Observable<MeDto> {
    return this.api.get<MeDto>('auth/me').pipe(
      tap((me) => {
        const userDto: LoginUserDto = {
          id: me.id,
          username: me.username,
          name: me.name,
          role: me.role,
        };
        this.currentUser.set(userDto);
        this.currentRole.set(me.role as UserRole);
        this.mustChangePassword.set(me.mustChangePassword);

        this.session.setUser({
          id: String(me.id),
          username: me.username,
          fullName: me.name,
        });
        this.session.setRole(me.role as UserRole);

        if (typeof window !== 'undefined' && window.sessionStorage) {
          sessionStorage.setItem(STORAGE_KEY_USER, JSON.stringify(userDto));
          sessionStorage.setItem(
            STORAGE_KEY_MUST_CHANGE,
            String(me.mustChangePassword),
          );
        }
      }),
    );
  }

  changePassword(request: ChangePasswordRequest): Observable<void> {
    return this.api.post<void>('auth/change-password', request).pipe(
      tap(() => {
        this.mustChangePassword.set(false);
        if (typeof window !== 'undefined' && window.sessionStorage) {
          sessionStorage.setItem(STORAGE_KEY_MUST_CHANGE, 'false');
        }
      }),
    );
  }

  logout(returnUrl?: string): void {
    this.cancelExpiryTimer();
    this.clearStorage();

    this.token.set(null);
    this.currentUser.set(null);
    this.currentBranch.set(null);
    this.currentRole.set(null);
    this.mustChangePassword.set(false);
    this.session.clear();

    const sanitizedUrl = returnUrl ? sanitizeReturnUrl(returnUrl) : null;
    const queryParams = sanitizedUrl && sanitizedUrl !== '/dashboard' && sanitizedUrl !== '/'
      ? { returnUrl: sanitizedUrl }
      : {};

    this.router.navigate(['/login'], { queryParams });
  }

  private scheduleAutoLogout(remainingMs: number): void {
    this.cancelExpiryTimer();
    if (remainingMs <= 0) {
      this.logout(this.router.url);
      return;
    }

    this.expiryTimerId = setTimeout(() => {
      this.logout(this.router.url);
    }, remainingMs);
  }

  private cancelExpiryTimer(): void {
    if (this.expiryTimerId) {
      clearTimeout(this.expiryTimerId);
      this.expiryTimerId = null;
    }
  }

  private clearStorage(): void {
    if (typeof window === 'undefined' || !window.sessionStorage) return;
    sessionStorage.removeItem(STORAGE_KEY_TOKEN);
    sessionStorage.removeItem(STORAGE_KEY_EXPIRES);
    sessionStorage.removeItem(STORAGE_KEY_USER);
    sessionStorage.removeItem(STORAGE_KEY_BRANCH);
    sessionStorage.removeItem(STORAGE_KEY_MUST_CHANGE);
  }
}
