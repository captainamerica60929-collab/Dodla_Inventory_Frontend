import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { of } from 'rxjs';
import { vi } from 'vitest';
import { AuthService, sanitizeReturnUrl } from './auth.service';
import { ApiService } from '../api/api.service';
import { SessionService } from '../session/session.service';
import { LoginResponse, MeDto } from './auth.models';

describe('AuthService', () => {
  let service: AuthService;
  let apiService: ApiService;
  let router: Router;
  let sessionService: SessionService;

  const mockLoginResponse: LoginResponse = {
    token: 'test-jwt-token-123',
    expiresAt: new Date(Date.now() + 3600 * 1000).toISOString(),
    user: {
      id: 1,
      username: 'ravi.k',
      name: 'Ravi Kumar',
      role: 'Admin',
    },
    branch: {
      id: 10,
      code: 'BR-01',
      name: 'Main Warehouse',
    },
    mustChangePassword: false,
  };

  beforeEach(() => {
    sessionStorage.clear();

    TestBed.configureTestingModule({
      providers: [
        AuthService,
        SessionService,
        {
          provide: Router,
          useValue: {
            url: '/dashboard',
            navigate: vi.fn(),
            navigateByUrl: vi.fn(),
          },
        },
        {
          provide: ApiService,
          useValue: {
            post: vi.fn(),
            get: vi.fn(),
          },
        },
      ],
    });

    service = TestBed.inject(AuthService);
    apiService = TestBed.inject(ApiService);
    router = TestBed.inject(Router);
    sessionService = TestBed.inject(SessionService);
  });

  afterEach(() => {
    sessionStorage.clear();
  });

  describe('sanitizeReturnUrl', () => {
    it('should return /dashboard for null, empty or undefined', () => {
      expect(sanitizeReturnUrl(null)).toBe('/dashboard');
      expect(sanitizeReturnUrl('')).toBe('/dashboard');
      expect(sanitizeReturnUrl(undefined)).toBe('/dashboard');
    });

    it('should allow valid internal relative paths', () => {
      expect(sanitizeReturnUrl('/transactions/grn')).toBe('/transactions/grn');
      expect(sanitizeReturnUrl('/masters/user?filter=active')).toBe('/masters/user?filter=active');
    });

    it('should reject protocol-relative URLs (starts with //)', () => {
      expect(sanitizeReturnUrl('//evil.com/hack')).toBe('/dashboard');
    });

    it('should reject URLs with schemes (http, https, javascript)', () => {
      expect(sanitizeReturnUrl('https://evil.com')).toBe('/dashboard');
      expect(sanitizeReturnUrl('javascript:alert(1)')).toBe('/dashboard');
    });
  });

  describe('login', () => {
    it('should store credentials in sessionStorage, set signals, and update SessionService', () => {
      vi.spyOn(apiService, 'post').mockReturnValue(of(mockLoginResponse));

      service.login({ branchId: 10, username: 'ravi.k', password: 'secretPassword' }).subscribe();

      expect(service.token()).toBe('test-jwt-token-123');
      expect(service.isAuthenticated()).toBe(true);
      expect(service.currentUser()?.username).toBe('ravi.k');
      expect(service.currentRole()).toBe('Admin');
      expect(service.currentBranch()?.code).toBe('BR-01');
      expect(service.mustChangePassword()).toBe(false);

      expect(sessionStorage.getItem('wt_auth_token')).toBe('test-jwt-token-123');
      expect(sessionService.user()?.username).toBe('ravi.k');
      expect(sessionService.branch()?.code).toBe('BR-01');
      expect(sessionService.role()).toBe('Admin');
    });
  });

  describe('getMe', () => {
    it('should fetch user info and update SessionService', () => {
      const mockMe: MeDto = {
        id: 1,
        username: 'ravi.k',
        name: 'Ravi Kumar',
        role: 'Admin',
        employeeId: 101,
        branchId: 10,
        mustChangePassword: false,
      };

      vi.spyOn(apiService, 'get').mockReturnValue(of(mockMe));

      service.getMe().subscribe((me) => {
        expect(me.username).toBe('ravi.k');
        expect(service.currentUser()?.name).toBe('Ravi Kumar');
        expect(service.currentRole()).toBe('Admin');
        expect(sessionService.user()?.fullName).toBe('Ravi Kumar');
      });
    });
  });

  describe('logout', () => {
    it('should clear sessionStorage and signals, and navigate to /login', () => {
      vi.spyOn(apiService, 'post').mockReturnValue(of(mockLoginResponse));
      service.login({ branchId: 10, username: 'ravi.k', password: 'secretPassword' }).subscribe();

      service.logout('/masters/material');

      expect(service.token()).toBeNull();
      expect(service.currentUser()).toBeNull();
      expect(service.currentBranch()).toBeNull();
      expect(service.currentRole()).toBeNull();
      expect(service.isAuthenticated()).toBe(false);
      expect(sessionStorage.getItem('wt_auth_token')).toBeNull();
      expect(sessionService.user()).toBeNull();

      expect(router.navigate).toHaveBeenCalledWith(['/login'], {
        queryParams: { returnUrl: '/masters/material' },
      });
    });
  });

  describe('auto-logout timer', () => {
    it('should auto-logout when expiration time is reached', () => {
      vi.useFakeTimers();
      try {
        const shortExpiry = new Date(Date.now() + 500).toISOString();
        const responseWithShortExpiry: LoginResponse = {
          ...mockLoginResponse,
          expiresAt: shortExpiry,
        };

        vi.spyOn(apiService, 'post').mockReturnValue(of(responseWithShortExpiry));
        service.login({ branchId: 10, username: 'ravi.k', password: 'secretPassword' }).subscribe();

        expect(service.isAuthenticated()).toBe(true);

        vi.advanceTimersByTime(600);

        expect(service.isAuthenticated()).toBe(false);
        expect(router.navigate).toHaveBeenCalledWith(['/login'], expect.anything());
      } finally {
        vi.useRealTimers();
      }
    });
  });
});
