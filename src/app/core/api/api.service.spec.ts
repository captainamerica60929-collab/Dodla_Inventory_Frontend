import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ApiService } from './api.service';
import { BranchService } from './branch.service';
import { ApiCredentialService } from './api-credential.service';
import { GrnResponseService } from './grn-response.service';
import { MetadataService } from './metadata.service';
import { environment } from '../../../environments/environment';

describe('ApiService', () => {
  let service: ApiService;
  let httpTesting: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        ApiService,
        BranchService,
        ApiCredentialService,
        GrnResponseService,
        MetadataService,
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });

    service = TestBed.inject(ApiService);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTesting.verify();
  });

  it('should construct correct URL and perform GET request', () => {
    const mockData = [{ id: 1, name: 'Branch 1' }];

    service.get('branches', { activeOnly: true }).subscribe((res) => {
      expect(res).toEqual(mockData);
    });

    const req = httpTesting.expectOne((r) => r.url === '/api/branches' && r.params.has('activeOnly'));
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('activeOnly')).toBe('true');
    req.flush(mockData);
  });

  it('should construct correct URL and perform POST request with body', () => {
    const body = { name: 'Test' };
    const mockResponse = { id: 10, name: 'Test' };

    service.post('branches', body).subscribe((res) => {
      expect(res).toEqual(mockResponse);
    });

    const req = httpTesting.expectOne('/api/branches');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(body);
    req.flush(mockResponse);
  });

  it('should perform PUT request', () => {
    const body = { name: 'Updated' };
    service.put('branches/1', body).subscribe();

    const req = httpTesting.expectOne('/api/branches/1');
    expect(req.request.method).toBe('PUT');
    req.flush({});
  });

  it('should perform DELETE request', () => {
    service.delete('branches/1').subscribe();

    const req = httpTesting.expectOne('/api/branches/1');
    expect(req.request.method).toBe('DELETE');
    req.flush(null);
  });

  it('should strip redundant api/ prefixes and never create /api/api URLs in buildUrl', () => {
    expect(service.buildUrl('branches')).toBe('/api/branches');
    expect(service.buildUrl('/branches')).toBe('/api/branches');
    expect(service.buildUrl('api/branches')).toBe('/api/branches');
    expect(service.buildUrl('/api/branches')).toBe('/api/branches');
    expect(service.buildUrl('api/api/branches')).toBe('/api/branches');
    expect(service.buildUrl('grn-responses')).toBe('/api/grn-responses');
    expect(service.buildUrl('api-credentials/1/fetch')).toBe('/api/api-credentials/1/fetch');
  });

  describe('All Services - No URL contains /api/api double prefix', () => {
    it('should assert no request URL across all services contains /api/api segment', () => {
      // 1. BranchService
      const branchService = TestBed.inject(BranchService);
      branchService.getAll().subscribe();
      const req1 = httpTesting.expectOne('/api/branches');
      expect(req1.request.url).not.toMatch(/\/api\/api(\/|$)/);
      req1.flush([]);

      branchService.getById(1).subscribe();
      const req2 = httpTesting.expectOne('/api/branches/1');
      expect(req2.request.url).not.toMatch(/\/api\/api(\/|$)/);
      req2.flush({});

      // 2. GrnResponseService
      const grnService = TestBed.inject(GrnResponseService);
      grnService.getPaged({}).subscribe();
      const req3 = httpTesting.expectOne((r) => r.url === '/api/grn-responses');
      expect(req3.request.url).not.toContain('/api/api');
      expect(req3.request.url).toBe('/api/grn-responses');
      req3.flush({ items: [], total: 0, page: 1, pageSize: 50 });

      grnService.getById(5).subscribe();
      const req4 = httpTesting.expectOne('/api/grn-responses/5');
      expect(req4.request.url).not.toContain('/api/api');
      req4.flush({});

      grnService.discardBatch('batch-123').subscribe();
      const req5 = httpTesting.expectOne('/api/grn-responses/batches/batch-123');
      expect(req5.request.url).not.toContain('/api/api');
      req5.flush(null);

      // 3. MetadataService
      const metaService = TestBed.inject(MetadataService);
      metaService.getTargetColumns().subscribe();
      const req6 = httpTesting.expectOne('/api/meta/target-columns');
      expect(req6.request.url).not.toContain('/api/api');
      req6.flush([]);

      // 4. ApiCredentialService
      const credService = TestBed.inject(ApiCredentialService);
      credService.getAll().subscribe();
      const req7 = httpTesting.expectOne('/api/api-credentials');
      expect(req7.request.url).not.toMatch(/\/api\/api(\/|$)/);
      expect(req7.request.url).not.toContain('/api/api/');
      req7.flush([]);

      credService.getMappings(1).subscribe();
      const req8 = httpTesting.expectOne('/api/api-credentials/1/mappings');
      expect(req8.request.url).not.toMatch(/\/api\/api(\/|$)/);
      req8.flush([]);

      credService.testConnection(1).subscribe();
      const req9 = httpTesting.expectOne('/api/api-credentials/1/test');
      expect(req9.request.url).not.toMatch(/\/api\/api(\/|$)/);
      req9.flush({});

      credService.previewLiveMapping(1).subscribe();
      const req10 = httpTesting.expectOne('/api/api-credentials/1/preview-mapping');
      expect(req10.request.url).not.toMatch(/\/api\/api(\/|$)/);
      req10.flush({});

      credService.previewSample({ json: '{}', mappings: [] }).subscribe();
      const req11 = httpTesting.expectOne('/api/grn-mapping/preview-sample');
      expect(req11.request.url).not.toContain('/api/api');
      req11.flush({});

      credService.fetchGrn(1, {}).subscribe();
      const req12 = httpTesting.expectOne('/api/api-credentials/1/fetch');
      expect(req12.request.url).not.toMatch(/\/api\/api(\/|$)/);
      req12.flush({});
    });
  });
});
