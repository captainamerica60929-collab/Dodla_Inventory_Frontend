import { TestBed } from '@angular/core/testing';
import {
  HttpClient,
  HttpHeaders,
  provideHttpClient,
  withInterceptors,
} from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { Router } from '@angular/router';
import { vi } from 'vitest';
import { httpErrorInterceptor } from './error.interceptor';
import { AuthService } from '../auth/auth.service';
import { NotificationService } from '../services/notification.service';

describe('httpErrorInterceptor', () => {
  let http: HttpClient;
  let httpTesting: HttpTestingController;
  let notificationService: NotificationService;
  let authService: AuthService;
  let showErrorSpy: ReturnType<typeof vi.spyOn>;
  let showWarningSpy: ReturnType<typeof vi.spyOn>;
  let logoutSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        NotificationService,
        {
          provide: Router,
          useValue: {
            url: '/masters/material',
            navigate: vi.fn(),
          },
        },
        {
          provide: AuthService,
          useValue: {
            token: vi.fn().mockReturnValue('mock-token'),
            logout: vi.fn(),
          },
        },
        provideHttpClient(withInterceptors([httpErrorInterceptor])),
        provideHttpClientTesting(),
      ],
    });

    http = TestBed.inject(HttpClient);
    httpTesting = TestBed.inject(HttpTestingController);
    notificationService = TestBed.inject(NotificationService);
    authService = TestBed.inject(AuthService);

    showErrorSpy = vi.spyOn(notificationService, 'showError');
    showWarningSpy = vi.spyOn(notificationService, 'showWarning');
    logoutSpy = vi.spyOn(authService, 'logout');
  });

  afterEach(() => {
    httpTesting.verify();
  });

  it('should extract RFC 7807 ProblemDetails and show error notification', () => {
    http.get('/api/test-endpoint').subscribe({
      next: () => {
        throw new Error('should have failed with 422');
      },
      error: () => {
        expect(showErrorSpy).toHaveBeenCalledWith(
          'Validation Error',
          'Qty must be greater than zero.',
          'trace-xyz-123',
        );
      },
    });

    const req = httpTesting.expectOne('/api/test-endpoint');
    req.flush(
      {
        title: 'Validation Error',
        detail: 'Qty must be greater than zero.',
        traceId: 'trace-xyz-123',
      },
      { status: 422, statusText: 'Unprocessable Entity' },
    );
  });

  it('should show "You do not have permission" for 403 responses', () => {
    http.get('/api/masters/user').subscribe({
      next: () => {
        throw new Error('should have failed with 403');
      },
      error: () => {
        expect(showErrorSpy).toHaveBeenCalledWith(
          'Access Restricted',
          'You do not have permission',
          undefined,
        );
      },
    });

    const req = httpTesting.expectOne('/api/masters/user');
    req.flush({ title: 'Forbidden' }, { status: 403, statusText: 'Forbidden' });
  });

  it('should trigger logout flow on 401 when request carried an Authorization token', () => {
    const headers = new HttpHeaders({ Authorization: 'Bearer test-token' });

    http.get('/api/protected-resource', { headers }).subscribe({
      next: () => {
        throw new Error('should have failed with 401');
      },
      error: (err) => {
        expect(err.status).toBe(401);
        expect(logoutSpy).toHaveBeenCalledWith('/masters/material');
        expect(showWarningSpy).toHaveBeenCalledWith(
          'Session Expired',
          'Please sign in again to continue.',
        );
      },
    });

    const req = httpTesting.expectOne('/api/protected-resource');
    req.flush({ detail: 'Token expired' }, { status: 401, statusText: 'Unauthorized' });
  });

  it('should NOT trigger logout flow on 401 for POST auth/login and should show API message', () => {
    http.post('/api/auth/login', { username: 'test', password: 'wrong' }).subscribe({
      next: () => {
        throw new Error('should have failed with 401');
      },
      error: () => {
        expect(logoutSpy).not.toHaveBeenCalled();
        expect(showErrorSpy).toHaveBeenCalledWith(
          'Unauthorized',
          'Invalid credentials.',
          undefined,
        );
      },
    });

    const req = httpTesting.expectOne('/api/auth/login');
    req.flush(
      { title: 'Unauthorized', detail: 'Invalid credentials.' },
      { status: 401, statusText: 'Unauthorized' },
    );
  });

  it('should NOT trigger logout flow on 401 for POST auth/change-password and should show API message', () => {
    http.post('/api/auth/change-password', { currentPassword: 'wrong', newPassword: 'abc' }).subscribe({
      next: () => {
        throw new Error('should have failed with 401');
      },
      error: () => {
        expect(logoutSpy).not.toHaveBeenCalled();
        expect(showErrorSpy).toHaveBeenCalledWith(
          'Unauthorized',
          'Current password is incorrect.',
          undefined,
        );
      },
    });

    const req = httpTesting.expectOne('/api/auth/change-password');
    req.flush(
      { title: 'Unauthorized', detail: 'Current password is incorrect.' },
      { status: 401, statusText: 'Unauthorized' },
    );
  });
});
