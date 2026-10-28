import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ExcelImportService } from './excel-import.service';

describe('ExcelImportService', () => {
  let service: ExcelImportService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        ExcelImportService,
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });

    service = TestBed.inject(ExcelImportService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    vi.restoreAllMocks();
  });

  describe('downloadTemplate', () => {
    it('should request template using GET with responseType blob', () => {
      const mockBlob = new Blob(['mock binary xlsx content'], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });

      let returnedBlob: Blob | undefined;
      service.downloadTemplate('/api/grn/import-template', 'grn-template.xlsx').subscribe({
        next: (blob) => {
          returnedBlob = blob;
        },
      });

      const req = httpMock.expectOne('/api/grn/import-template');
      expect(req.request.method).toBe('GET');
      expect(req.request.responseType).toBe('blob');

      req.flush(mockBlob);

      expect(returnedBlob).toBeDefined();
      expect(returnedBlob).toBe(mockBlob);
    });

    it('should propagate HTTP error when endpoint fails (no fake corrupt CSV fallback)', () => {
      let errorResponse: any;
      service.downloadTemplate('/api/materials/import-template', 'materials-template.xlsx').subscribe({
        next: () => {
          throw new Error('Should have failed');
        },
        error: (err) => {
          errorResponse = err;
        },
      });

      const req = httpMock.expectOne('/api/materials/import-template');
      expect(req.request.method).toBe('GET');
      expect(req.request.responseType).toBe('blob');

      const errorBlob = new Blob(['Not Found'], { type: 'text/plain' });
      req.flush(errorBlob, { status: 404, statusText: 'Not Found' });

      expect(errorResponse).toBeDefined();
      expect(errorResponse.status).toBe(404);
    });
  });

  describe('saveBlob', () => {
    it('should trigger browser download using window.URL and link element', () => {
      const mockBlob = new Blob(['sample xlsx'], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });

      const createObjectURLSpy = vi.spyOn(window.URL, 'createObjectURL').mockReturnValue('blob:http://localhost/mock-uuid');
      const revokeObjectURLSpy = vi.spyOn(window.URL, 'revokeObjectURL').mockImplementation(() => {});
      const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

      service.saveBlob(mockBlob, 'test-template.xlsx');

      expect(createObjectURLSpy).toHaveBeenCalledWith(mockBlob);
      expect(clickSpy).toHaveBeenCalled();
      expect(revokeObjectURLSpy).toHaveBeenCalledWith('blob:http://localhost/mock-uuid');
    });
  });
});
