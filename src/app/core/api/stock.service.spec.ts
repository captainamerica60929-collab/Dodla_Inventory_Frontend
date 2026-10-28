import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { StockService } from './stock.service';
import { ApiService } from './api.service';

describe('StockService', () => {
  let service: StockService;
  let httpTesting: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        StockService,
        ApiService,
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });

    service = TestBed.inject(StockService);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTesting.verify();
  });

  it('should post inward scan request to stock/inward', () => {
    const request = { tagNo: 'STK-001011', locationCode: 'A-01-01' };
    const mockResponse = {
      stockRecordId: 10,
      tagId: 1,
      tagNo: 'STK-001011',
      locationId: 2,
      locationCode: 'A-01-01',
      materialCode: 'M100',
      qty: 200,
      locationUsedCapacity: 350,
      locationCapacity: 500,
      inwardAt: '2026-10-21T07:30:00Z',
    };

    service.inward(request).subscribe((res) => {
      expect(res).toEqual(mockResponse);
    });

    const req = httpTesting.expectOne('/api/stock/inward');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(request);
    req.flush(mockResponse);
  });

  it('should post outward issue request to stock/outward', () => {
    const request = { tagNo: 'STK-4900001', qty: 50 };
    const mockResponse = {
      tagId: 1,
      tagNo: 'STK-4900001',
      materialCode: 'M100',
      issuedQty: 50,
      remainingQty: 50,
      tagStatus: 'Issued',
      locationId: 1,
      locationCode: 'A-01-01',
      inwardAt: '2026-09-10T00:00:00Z',
    };

    service.outward(request).subscribe((res) => {
      expect(res).toEqual(mockResponse);
    });

    const req = httpTesting.expectOne('/api/stock/outward');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(request);
    req.flush(mockResponse);
  });

  it('should post accept request to stock/accept', () => {
    const request = { tagNo: 'STK-4900001' };
    const mockResponse = {
      tagId: 1,
      tagNo: 'STK-4900001',
      materialCode: 'M100',
      previousStatus: 'Issued',
      newStatus: 'Accepted',
      remainingQty: 0,
      reason: null,
      processedAt: '2026-10-21T07:45:00Z',
    };

    service.accept(request).subscribe((res) => {
      expect(res).toEqual(mockResponse);
    });

    const req = httpTesting.expectOne('/api/stock/accept');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(request);
    req.flush(mockResponse);
  });

  it('should post reject request to stock/reject with reason', () => {
    const request = { tagNo: 'STK-4900001', reason: 'Packaging damaged' };
    const mockResponse = {
      tagId: 1,
      tagNo: 'STK-4900001',
      materialCode: 'M100',
      previousStatus: 'Issued',
      newStatus: 'Rejected',
      remainingQty: 0,
      reason: 'Packaging damaged',
      processedAt: '2026-10-21T07:46:00Z',
    };

    service.reject(request).subscribe((res) => {
      expect(res).toEqual(mockResponse);
    });

    const req = httpTesting.expectOne('/api/stock/reject');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(request);
    req.flush(mockResponse);
  });

  it('should post transfer request to stock/transfer', () => {
    const request = {
      tagNo: 'STK-4900003',
      targetLocationCode: 'B-02-01',
      reason: 'Warehouse reorganization',
    };
    const mockResponse = {
      tagId: 3,
      tagNo: 'STK-4900003',
      materialCode: 'M300',
      qty: 50,
      fromLocationCode: 'A-01-02',
      toLocationCode: 'B-02-01',
      reason: 'Warehouse reorganization',
      transferredAt: '2026-10-21T08:00:00Z',
    };

    service.transfer(request).subscribe((res) => {
      expect(res).toEqual(mockResponse);
    });

    const req = httpTesting.expectOne('/api/stock/transfer');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(request);
    req.flush(mockResponse);
  });

  it('should query tag stock info via GET stock/tags/{tagNo}', () => {
    const tagNo = 'STK-001011';
    const mockInfo = {
      tagId: 1,
      tagNo: 'STK-001011',
      status: 'Printed',
      qty: 200,
      remainingQty: 200,
      materialCode: 'M100',
      partName: 'Steel Bolt M8',
      batchNo: 'B2610A',
      locationId: null,
      locationCode: null,
      locationZone: null,
      inwardAt: null,
    };

    service.getTagStockInfo(tagNo).subscribe((res) => {
      expect(res).toEqual(mockInfo);
    });

    const req = httpTesting.expectOne('/api/stock/tags/STK-001011');
    expect(req.request.method).toBe('GET');
    req.flush(mockInfo);
  });

  it('should query movements via GET stock/movements', () => {
    const mockMovements = [
      {
        id: 1,
        tagId: 10,
        tagNo: 'STK-001011',
        locationId: 1,
        locationCode: 'A-01-01',
        materialCode: 'M100',
        movementType: 'In',
        qty: 200,
        inwardAt: '2026-10-21T07:00:00Z',
        reason: null,
        userId: 1,
        userNameSnapshot: 'Ravi Kumar',
        clientIp: '127.0.0.1',
        createdAt: '2026-10-21T07:00:00Z',
      },
    ];

    service.getMovements({ tagNo: 'STK-001011' }).subscribe((res) => {
      expect(res).toEqual(mockMovements);
    });

    const req = httpTesting.expectOne((r) => r.url === '/api/stock/movements' && r.params.get('tagNo') === 'STK-001011');
    expect(req.request.method).toBe('GET');
    req.flush(mockMovements);
  });
});
