import { TestBed } from '@angular/core/testing';
import {
  HttpClient,
  provideHttpClient,
  withInterceptors,
} from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { authInterceptor } from './auth.interceptor';
import { AuthService } from '../auth/auth.service';

describe('authInterceptor', () => {
  let http: HttpClient;
  let httpTesting: HttpTestingController;
  const tokenSignal = signal<string | null>(null);

  beforeEach(() => {
    tokenSignal.set(null);

    TestBed.configureTestingModule({
      providers: [
        {
          provide: AuthService,
          useValue: {
            token: tokenSignal,
          },
        },
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
      ],
    });

    http = TestBed.inject(HttpClient);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTesting.verify();
  });

  it('should not add Authorization header when token is null', () => {
    tokenSignal.set(null);

    http.get('/api/test').subscribe();

    const req = httpTesting.expectOne('/api/test');
    expect(req.request.headers.has('Authorization')).toBe(false);
    req.flush({});
  });

  it('should add Bearer token to requests when token is present', () => {
    tokenSignal.set('jwt-test-token-123');

    http.get('/api/test').subscribe();

    const req = httpTesting.expectOne('/api/test');
    expect(req.request.headers.has('Authorization')).toBe(true);
    expect(req.request.headers.get('Authorization')).toBe('Bearer jwt-test-token-123');
    req.flush({});
  });

  it('should not overwrite an existing Authorization header', () => {
    tokenSignal.set('jwt-test-token-123');

    http.get('/api/test', {
      headers: { Authorization: 'Custom existing-auth' },
    }).subscribe();

    const req = httpTesting.expectOne('/api/test');
    expect(req.request.headers.get('Authorization')).toBe('Custom existing-auth');
    req.flush({});
  });
});
