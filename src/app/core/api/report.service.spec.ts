import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ReportService } from './report.service';
import { ApiService } from './api.service';

describe('ReportService', () => {
  let service: ReportService;
  let httpTesting: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        ReportService,
        ApiService,
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });

    service = TestBed.inject(ReportService);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTesting.verify();
  });

  it('should query inward report via GET /api/reports/inward', () => {
    const mockRes = {
      items: [
        {
          tagNo: 'STK-001011',
          materialCode: 'M100',
          partName: 'Steel Bolt M8',
          qty: 200,
          locationCode: 'A-01-01',
          locationZone: 'Fast-Moving',
          inwardAt: '2026-10-21T07:30:00Z',
          userNameSnapshot: 'Ravi Kumar',
          branchId: 1,
        },
      ],
      totalCount: 1,
      page: 1,
      pageSize: 10,
      totalPages: 1,
    };

    service.getInwardReport({ fromDate: '2026-10-01', page: 1, pageSize: 10 }).subscribe((res) => {
      expect(res.items.length).toBe(1);
      expect(res.items[0].tagNo).toBe('STK-001011');
    });

    const req = httpTesting.expectOne((r) => r.url === '/api/reports/inward' && r.params.get('fromDate') === '2026-10-01');
    expect(req.request.method).toBe('GET');
    req.flush(mockRes);
  });

  it('should query outward report via GET /api/reports/outward', () => {
    const mockRes = {
      items: [
        {
          tagNo: 'STK-4900001',
          materialCode: 'M100',
          partName: 'Steel Bolt M8',
          issuedQty: 50,
          remainingQty: 50,
          locationCode: 'A-01-01',
          dispatchedAt: '2026-10-21T08:15:00Z',
          userNameSnapshot: 'StoreKeeper',
          bypassFifo: false,
          branchId: 1,
        },
      ],
      totalCount: 1,
      page: 1,
      pageSize: 10,
      totalPages: 1,
    };

    service.getOutwardReport({ tagNo: 'STK-4900001' }).subscribe((res) => {
      expect(res.items[0].bypassFifo).toBe(false);
    });

    const req = httpTesting.expectOne((r) => r.url === '/api/reports/outward' && r.params.get('tagNo') === 'STK-4900001');
    expect(req.request.method).toBe('GET');
    req.flush(mockRes);
  });

  it('should query in-stock report via GET /api/reports/in-stock', () => {
    const mockRes = {
      items: [
        {
          materialCode: 'M100',
          partName: 'Steel Bolt M8',
          locationCode: 'A-01-01',
          locationZone: 'Fast-Moving',
          totalQty: 250,
          tagCount: 2,
          oldestInwardAt: '2026-09-10T00:00:00Z',
          branchId: 1,
        },
      ],
      totalCount: 1,
      page: 1,
      pageSize: 10,
      totalPages: 1,
    };

    service.getInStockReport({ materialCode: 'M100' }).subscribe((res) => {
      expect(res.items[0].totalQty).toBe(250);
    });

    const req = httpTesting.expectOne((r) => r.url === '/api/reports/in-stock' && r.params.get('materialCode') === 'M100');
    expect(req.request.method).toBe('GET');
    req.flush(mockRes);
  });

  it('should query label scan audit report via GET /api/reports/label-scan', () => {
    const mockRes = {
      items: [
        {
          tagNo: 'STK-001011',
          materialCode: 'M100',
          actionType: 'Printed',
          qty: 200,
          printerIp: '192.168.1.150',
          operator: 'StoreKeeper',
          timestamp: '2026-10-21T07:15:00Z',
          branchId: 1,
        },
      ],
      totalCount: 1,
      page: 1,
      pageSize: 10,
      totalPages: 1,
    };

    service.getLabelScanReport({ actionType: 'Printed' }).subscribe((res) => {
      expect(res.items[0].actionType).toBe('Printed');
    });

    const req = httpTesting.expectOne((r) => r.url === '/api/reports/label-scan' && r.params.get('actionType') === 'Printed');
    expect(req.request.method).toBe('GET');
    req.flush(mockRes);
  });

  it('should query overall summary report via GET /api/reports/overall', () => {
    const mockRes = {
      items: [
        {
          materialCode: 'M100',
          partName: 'Steel Bolt M8',
          totalInwarded: 550,
          totalIssued: 150,
          currentStock: 400,
          movementCount: 8,
          lastMovementAt: '2026-10-21T08:15:00Z',
          branchId: 1,
        },
      ],
      totalCount: 1,
      page: 1,
      pageSize: 10,
      totalPages: 1,
    };

    service.getOverallSummaryReport().subscribe((res) => {
      expect(res.items[0].currentStock).toBe(400);
    });

    const req = httpTesting.expectOne('/api/reports/overall');
    expect(req.request.method).toBe('GET');
    req.flush(mockRes);
  });

  it('should query accept-reject report via GET /api/reports/accept-reject', () => {
    const mockRes = {
      items: [
        {
          tagNo: 'STK-4900002',
          materialCode: 'M100',
          qty: 50,
          status: 'Rejected',
          reason: 'Broken seal',
          inspector: 'Inspector Ramesh',
          processedAt: '2026-10-20T15:00:00Z',
          branchId: 1,
        },
      ],
      totalCount: 1,
      page: 1,
      pageSize: 10,
      totalPages: 1,
    };

    service.getAcceptRejectReport({ status: 'Rejected' }).subscribe((res) => {
      expect(res.items[0].status).toBe('Rejected');
      expect(res.items[0].reason).toBe('Broken seal');
    });

    const req = httpTesting.expectOne((r) => r.url === '/api/reports/accept-reject' && r.params.get('status') === 'Rejected');
    expect(req.request.method).toBe('GET');
    req.flush(mockRes);
  });

  it('should query location transfer report via GET /api/reports/location-transfer', () => {
    const mockRes = {
      items: [
        {
          tagNo: 'STK-4900003',
          materialCode: 'Bearing 6205',
          fromLocationCode: 'A-01-02',
          toLocationCode: 'A-02-01',
          qty: 50,
          reason: 'Stock consolidation',
          operator: 'StoreKeeper',
          transferredAt: '2026-10-21T07:30:00Z',
          branchId: 1,
        },
      ],
      totalCount: 1,
      page: 1,
      pageSize: 10,
      totalPages: 1,
    };

    service.getLocationTransferReport().subscribe((res) => {
      expect(res.items[0].fromLocationCode).toBe('A-01-02');
      expect(res.items[0].toLocationCode).toBe('A-02-01');
    });

    const req = httpTesting.expectOne('/api/reports/location-transfer');
    expect(req.request.method).toBe('GET');
    req.flush(mockRes);
  });

  it('should query dashboard live metrics via GET /api/reports/dashboard-live', () => {
    const mockLive = {
      totalRegisteredItems: 1420,
      pendingInwardItems: 28,
      totalInStockItems: 1250,
      totalClaimedRejected: 14,
      activeAlertsCount: 2,
      recentMovements: [],
      zoneOccupancy: [],
    };

    service.getDashboardLive(1).subscribe((res) => {
      expect(res.totalRegisteredItems).toBe(1420);
      expect(res.pendingInwardItems).toBe(28);
    });

    const req = httpTesting.expectOne((r) => r.url === '/api/reports/dashboard-live' && r.params.get('branchId') === '1');
    expect(req.request.method).toBe('GET');
    req.flush(mockLive);
  });
});
