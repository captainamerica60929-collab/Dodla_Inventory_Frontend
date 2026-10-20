import { TestBed } from '@angular/core/testing';
import {
  ActivatedRouteSnapshot,
  Router,
  RouterStateSnapshot,
  UrlTree,
} from '@angular/router';
import { signal } from '@angular/core';
import { vi } from 'vitest';
import { authGuard } from './auth.guard';
import { roleGuard } from './role.guard';
import { AuthService } from '../auth/auth.service';
import { UserRole } from '../session/session.service';

describe('Guards', () => {
  let router: Router;
  const isAuthSignal = signal<boolean>(false);
  const mustChangePwdSignal = signal<boolean>(false);
  const currentRoleSignal = signal<UserRole | null>(null);

  beforeEach(() => {
    isAuthSignal.set(false);
    mustChangePwdSignal.set(false);
    currentRoleSignal.set(null);

    TestBed.configureTestingModule({
      providers: [
        {
          provide: Router,
          useValue: {
            createUrlTree: vi.fn((commands: unknown[], extras?: unknown) => ({
              commands,
              extras,
              toString: () => '/' + commands.join('/'),
            })),
          },
        },
        {
          provide: AuthService,
          useValue: {
            isAuthenticated: isAuthSignal,
            mustChangePassword: mustChangePwdSignal,
            currentRole: currentRoleSignal,
          },
        },
      ],
    });

    router = TestBed.inject(Router);
  });

  describe('authGuard', () => {
    it('should redirect unauthenticated user to /login with returnUrl', () => {
      isAuthSignal.set(false);

      const route = {} as ActivatedRouteSnapshot;
      const state = { url: '/transactions/grn' } as RouterStateSnapshot;

      const result = TestBed.runInInjectionContext(() => authGuard(route, state));

      expect(router.createUrlTree).toHaveBeenCalledWith(['/login'], {
        queryParams: { returnUrl: '/transactions/grn' },
      });
      expect(result).not.toBe(true);
    });

    it('should allow access for authenticated user without mustChangePassword', () => {
      isAuthSignal.set(true);
      mustChangePwdSignal.set(false);

      const route = {} as ActivatedRouteSnapshot;
      const state = { url: '/dashboard' } as RouterStateSnapshot;

      const result = TestBed.runInInjectionContext(() => authGuard(route, state));
      expect(result).toBe(true);
    });

    it('should redirect authenticated user with mustChangePassword to /change-password', () => {
      isAuthSignal.set(true);
      mustChangePwdSignal.set(true);

      const route = {} as ActivatedRouteSnapshot;
      const state = { url: '/dashboard' } as RouterStateSnapshot;

      const result = TestBed.runInInjectionContext(() => authGuard(route, state));

      expect(router.createUrlTree).toHaveBeenCalledWith(['/change-password'], {
        queryParams: expect.anything(),
      });
      expect(result).not.toBe(true);
    });

    it('should NOT redirect and avoid loop when user with mustChangePassword visits /change-password', () => {
      isAuthSignal.set(true);
      mustChangePwdSignal.set(true);

      const route = {} as ActivatedRouteSnapshot;
      const state = { url: '/change-password' } as RouterStateSnapshot;

      const result = TestBed.runInInjectionContext(() => authGuard(route, state));
      expect(result).toBe(true);
    });
  });

  describe('roleGuard', () => {
    const createMockRoute = (allowedRoles?: UserRole[]): ActivatedRouteSnapshot => {
      return {
        data: allowedRoles ? { allowedRoles } : {},
      } as unknown as ActivatedRouteSnapshot;
    };

    const mockState = { url: '/some-url' } as RouterStateSnapshot;

    it('should allow access if route has no role restrictions', () => {
      currentRoleSignal.set('Operator');
      const route = createMockRoute(undefined);

      const result = TestBed.runInInjectionContext(() => roleGuard(route, mockState));
      expect(result).toBe(true);
    });

    it('Admin role should pass on Admin-only routes', () => {
      currentRoleSignal.set('Admin');
      const route = createMockRoute(['Admin']);

      const result = TestBed.runInInjectionContext(() => roleGuard(route, mockState));
      expect(result).toBe(true);
    });

    it('StoreKeeper role should be redirected to /no-access on Admin-only routes', () => {
      currentRoleSignal.set('StoreKeeper');
      const route = createMockRoute(['Admin']);

      const result = TestBed.runInInjectionContext(() => roleGuard(route, mockState));
      expect(router.createUrlTree).toHaveBeenCalledWith(['/no-access']);
      expect(result).not.toBe(true);
    });

    it('StoreKeeper role should pass on GRN route (Admin, StoreKeeper)', () => {
      currentRoleSignal.set('StoreKeeper');
      const route = createMockRoute(['Admin', 'StoreKeeper']);

      const result = TestBed.runInInjectionContext(() => roleGuard(route, mockState));
      expect(result).toBe(true);
    });

    it('Operator role should be redirected to /no-access on GRN route', () => {
      currentRoleSignal.set('Operator');
      const route = createMockRoute(['Admin', 'StoreKeeper']);

      const result = TestBed.runInInjectionContext(() => roleGuard(route, mockState));
      expect(router.createUrlTree).toHaveBeenCalledWith(['/no-access']);
      expect(result).not.toBe(true);
    });

    it('Operator role should pass on Inward route (Admin, StoreKeeper, Operator)', () => {
      currentRoleSignal.set('Operator');
      const route = createMockRoute(['Admin', 'StoreKeeper', 'Operator']);

      const result = TestBed.runInInjectionContext(() => roleGuard(route, mockState));
      expect(result).toBe(true);
    });

    it('Viewer role should pass on Reports route (Admin, StoreKeeper, Viewer)', () => {
      currentRoleSignal.set('Viewer');
      const route = createMockRoute(['Admin', 'StoreKeeper', 'Viewer']);

      const result = TestBed.runInInjectionContext(() => roleGuard(route, mockState));
      expect(result).toBe(true);
    });

    it('Viewer role should be redirected to /no-access on Inward route', () => {
      currentRoleSignal.set('Viewer');
      const route = createMockRoute(['Admin', 'StoreKeeper', 'Operator']);

      const result = TestBed.runInInjectionContext(() => roleGuard(route, mockState));
      expect(router.createUrlTree).toHaveBeenCalledWith(['/no-access']);
      expect(result).not.toBe(true);
    });
  });
});
