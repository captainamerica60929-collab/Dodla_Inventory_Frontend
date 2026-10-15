import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { vi } from 'vitest';
import { httpErrorInterceptor } from './error.interceptor';
import { NotificationService } from '../services/notification.service';

describe('httpErrorInterceptor', () => {
  let http: HttpClient;
  let httpTesting: HttpTestingController;
  let notificationService: NotificationService;
  let showErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        NotificationService,
        provideHttpClient(withInterceptors([httpErrorInterceptor])),
        provideHttpClientTesting(),
      ],
    });

    http = TestBed.inject(HttpClient);
    httpTesting = TestBed.inject(HttpTestingController);
    notificationService = TestBed.inject(NotificationService);
    showErrorSpy = vi.spyOn(notificationService, 'showError');
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

  it('should show specific message for 403 on /test endpoint', () => {
    http.post('/api/api-credentials/1/test', {}).subscribe({
      next: () => {
        throw new Error('should have failed with 403');
      },
      error: () => {
        expect(showErrorSpy).toHaveBeenCalledWith(
          'Access Restricted',
          'Test and fetch are available only in Development until login is built',
          undefined,
        );
      },
    });

    const req = httpTesting.expectOne('/api/api-credentials/1/test');
    req.flush({ title: 'Forbidden', detail: 'Dev restricted' }, { status: 403, statusText: 'Forbidden' });
  });

  it('should show specific message for 403 on /preview-mapping endpoint', () => {
    http.post('/api/api-credentials/1/preview-mapping', {}).subscribe({
      next: () => {
        throw new Error('should have failed with 403');
      },
      error: () => {
        expect(showErrorSpy).toHaveBeenCalledWith(
          'Access Restricted',
          'Test and fetch are available only in Development until login is built',
          undefined,
        );
      },
    });

    const req = httpTesting.expectOne('/api/api-credentials/1/preview-mapping');
    req.flush({}, { status: 403, statusText: 'Forbidden' });
  });

  it('should show generic message for 403 on other endpoints', () => {
    http.get('/api/branches').subscribe({
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

    const req = httpTesting.expectOne('/api/branches');
    req.flush({}, { status: 403, statusText: 'Forbidden' });
  });

  it('should format ASP.NET validation errors object (up to 5 messages plus traceId)', () => {
    http.put('/api/api-credentials/1/mappings', []).subscribe({
      next: () => {
        throw new Error('should have failed with 400');
      },
      error: () => {
        expect(showErrorSpy).toHaveBeenCalledWith(
          'One or more validation errors occurred.',
          expect.stringContaining('$[0].targetColumn: The JSON value could not be converted'),
          '00-trace-abc-00',
        );
      },
    });

    const req = httpTesting.expectOne('/api/api-credentials/1/mappings');
    req.flush(
      {
        title: 'One or more validation errors occurred.',
        status: 400,
        errors: {
          '$[0].targetColumn': ['The JSON value could not be converted to TargetColumn.'],
          'mappings': ['The mappings field is required.'],
        },
        traceId: '00-trace-abc-00',
      },
      { status: 400, statusText: 'Bad Request' },
    );
  });

  it('should format ASP.NET validation errors capping at 5 and appending "and N more"', () => {
    http.post('/api/test-validation', {}).subscribe({
      next: () => {
        throw new Error('should have failed with 400');
      },
      error: () => {
        expect(showErrorSpy).toHaveBeenCalledWith(
          'Validation Failed',
          expect.stringContaining('and 2 more'),
          'trace-xyz-999',
        );
      },
    });

    const req = httpTesting.expectOne('/api/test-validation');
    req.flush(
      {
        title: 'Validation Failed',
        status: 400,
        errors: {
          field1: ['Error 1'],
          field2: ['Error 2'],
          field3: ['Error 3'],
          field4: ['Error 4'],
          field5: ['Error 5'],
          field6: ['Error 6'],
          field7: ['Error 7'],
        },
        traceId: 'trace-xyz-999',
      },
      { status: 400, statusText: 'Bad Request' },
    );
  });
});
