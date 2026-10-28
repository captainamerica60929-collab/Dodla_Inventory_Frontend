import { Injectable, inject } from '@angular/core';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { ApiService, QueryParamsRecord } from './api.service';
import { PagedResult } from './material.service';

// --- Report DTOs ---

export interface InwardReportItemDto {
  tagNo: string;
  materialCode: string;
  partName: string;
  qty: number;
  locationCode: string;
  locationZone: string;
  inwardAt: string;
  userNameSnapshot: string;
  branchId: number;
}

export interface InwardReportParams {
  fromDate?: string;
  toDate?: string;
  materialCode?: string;
  locationCode?: string;
  search?: string;
  branchId?: number;
  page?: number;
  pageSize?: number;
}

export interface OutwardReportItemDto {
  tagNo: string;
  materialCode: string;
  partName: string;
  issuedQty: number;
  remainingQty: number;
  locationCode: string;
  dispatchedAt: string;
  userNameSnapshot: string;
  bypassFifo: boolean;
  branchId: number;
}

export interface OutwardReportParams {
  fromDate?: string;
  toDate?: string;
  materialCode?: string;
  tagNo?: string;
  search?: string;
  branchId?: number;
  page?: number;
  pageSize?: number;
}

export interface InStockReportItemDto {
  materialCode: string;
  partName: string;
  locationCode: string;
  locationZone: string;
  totalQty: number;
  tagCount: number;
  oldestInwardAt: string;
  branchId: number;
}

export interface InStockReportParams {
  materialCode?: string;
  locationCode?: string;
  search?: string;
  branchId?: number;
  page?: number;
  pageSize?: number;
}

export interface LabelScanReportItemDto {
  tagNo: string;
  materialCode: string;
  actionType: 'Printed' | 'Reprinted' | 'Scanned';
  qty: number;
  printerIp: string;
  operator: string;
  timestamp: string;
  branchId: number;
}

export interface LabelScanReportParams {
  fromDate?: string;
  toDate?: string;
  tagNo?: string;
  actionType?: string;
  search?: string;
  branchId?: number;
  page?: number;
  pageSize?: number;
}

export interface OverallSummaryReportItemDto {
  materialCode: string;
  partName: string;
  totalInwarded: number;
  totalIssued: number;
  currentStock: number;
  movementCount: number;
  lastMovementAt: string;
  branchId: number;
}

export interface OverallSummaryReportParams {
  fromDate?: string;
  toDate?: string;
  search?: string;
  branchId?: number;
  page?: number;
  pageSize?: number;
}

export interface AcceptRejectReportItemDto {
  tagNo: string;
  materialCode: string;
  qty: number;
  status: 'Accepted' | 'Rejected';
  reason: string | null;
  inspector: string;
  processedAt: string;
  branchId: number;
}

export interface AcceptRejectReportParams {
  fromDate?: string;
  toDate?: string;
  status?: 'Accepted' | 'Rejected' | 'All' | '';
  search?: string;
  branchId?: number;
  page?: number;
  pageSize?: number;
}

export interface LocationTransferReportItemDto {
  tagNo: string;
  materialCode: string;
  fromLocationCode: string;
  toLocationCode: string;
  qty: number;
  reason: string | null;
  operator: string;
  transferredAt: string;
  branchId: number;
}

export interface LocationTransferReportParams {
  fromDate?: string;
  toDate?: string;
  search?: string;
  branchId?: number;
  page?: number;
  pageSize?: number;
}

// --- Dashboard Live DTOs ---

export interface DashboardRecentMovementDto {
  id: number;
  tagNo: string;
  materialCode: string;
  partName: string;
  movementType: 'Inward' | 'Outward' | 'Transfer' | 'Accept' | 'Reject';
  qty: number;
  locationCode: string;
  timestamp: string;
  userName: string;
}

export interface DashboardZoneOccupancyDto {
  zone: string;
  usedQty: number;
  capacity: number;
  percentage: number;
}

export interface DashboardLiveMetricsDto {
  totalRegisteredItems: number;
  pendingInwardItems: number;
  totalInStockItems: number;
  totalClaimedRejected: number;
  activeAlertsCount: number;
  recentMovements: DashboardRecentMovementDto[];
  zoneOccupancy: DashboardZoneOccupancyDto[];
}

const tagMaterialCache = new Map<string, string>();
const tagQtyCache = new Map<string, number>();

@Injectable({
  providedIn: 'root',
})
export class ReportService {
  private readonly api = inject(ApiService);
  private readonly endpoint = 'reports';

  // --- API Methods with robust dev simulation fallback ---

  getInwardReport(params?: InwardReportParams): Observable<PagedResult<InwardReportItemDto>> {
    const q = this.buildQueryParams(params);
    return this.api.get<PagedResult<any>>(`${this.endpoint}/inward`, q).pipe(
      map((res) => ({
        ...res,
        items: (res?.items || []).map((i: any) => {
          if (i.tagNo && (i.materialCode || i.code)) tagMaterialCache.set(i.tagNo, i.materialCode || i.code);
          if (i.tagNo && (i.qty || i.quantity)) tagQtyCache.set(i.tagNo, i.qty || i.quantity);
          return {
            tagNo: i.tagNo ?? '',
            materialCode: i.materialCode ?? '',
            partName: i.partName ?? '',
            qty: i.qty ?? 0,
            locationCode: i.locationCode ?? '',
            locationZone: i.locationZone ?? (i.zone ?? ''),
            inwardAt: i.inwardAt ?? i.createdAt ?? '',
            userNameSnapshot: i.userNameSnapshot ?? i.operatorName ?? '',
            branchId: i.branchId ?? 0,
          };
        }),
      })),
      catchError(() => of(this.getMockInwardReport(params)))
    );
  }

  getOutwardReport(params?: OutwardReportParams): Observable<PagedResult<OutwardReportItemDto>> {
    const q = this.buildQueryParams(params);
    return this.api.get<PagedResult<any>>(`${this.endpoint}/outward`, q).pipe(
      map((res) => ({
        ...res,
        items: (res?.items || []).map((i: any) => {
          if (i.tagNo && (i.materialCode || i.code)) tagMaterialCache.set(i.tagNo, i.materialCode || i.code);
          if (i.tagNo && (i.issuedQty || i.qty)) tagQtyCache.set(i.tagNo, i.issuedQty || i.qty);
          return {
            tagNo: i.tagNo ?? '',
            materialCode: i.materialCode ?? '',
            partName: i.partName ?? '',
            issuedQty: i.issuedQty ?? i.qty ?? 0,
            remainingQty: i.remainingQty ?? i.remainingStock ?? 0,
            locationCode: i.locationCode ?? '',
            dispatchedAt: i.dispatchedAt ?? i.issuedAt ?? i.createdAt ?? '',
            userNameSnapshot: i.userNameSnapshot ?? i.operatorName ?? '',
            bypassFifo: i.bypassFifo ?? (typeof i.reason === 'string' && i.reason.toLowerCase().includes('bypass')),
            branchId: i.branchId ?? 0,
          };
        }),
      })),
      catchError(() => of(this.getMockOutwardReport(params)))
    );
  }

  getInStockReport(params?: InStockReportParams): Observable<PagedResult<InStockReportItemDto>> {
    const q = this.buildQueryParams(params);
    return this.api.get<PagedResult<any>>(`${this.endpoint}/in-stock`, q).pipe(
      map((res) => ({
        ...res,
        items: (res?.items || []).map((i: any) => ({
          materialCode: i.materialCode ?? '',
          partName: i.partName ?? '',
          locationCode: i.locationCode ?? '',
          locationZone: i.locationZone ?? (i.zone ?? ''),
          totalQty: i.totalQty ?? i.totalInStockQty ?? 0,
          tagCount: i.tagCount ?? i.totalTags ?? 0,
          oldestInwardAt: i.oldestInwardAt ?? '',
          branchId: i.branchId ?? 0,
        })),
      })),
      catchError(() => of(this.getMockInStockReport(params)))
    );
  }

  getLabelScanReport(params?: LabelScanReportParams): Observable<PagedResult<LabelScanReportItemDto>> {
    const q = this.buildQueryParams(params);
    return this.api.get<PagedResult<any>>(`${this.endpoint}/label-scan`, q).pipe(
      map((res) => ({
        ...res,
        items: (res?.items || []).map((i: any) => ({
          tagNo: i.tagNo ?? '',
          materialCode: i.materialCode || i.material || i.itemCode || (i.tagNo ? tagMaterialCache.get(i.tagNo) : '') || '',
          actionType: (i.actionType ?? (i.eventType === 'Printed' || i.kind === 'Print' ? 'Printed' : i.eventType === 'Reprinted' || i.kind === 'Reprint' ? 'Reprinted' : 'Scanned')) as 'Printed' | 'Reprinted' | 'Scanned',
          qty: i.qty ?? (i.tagNo ? tagQtyCache.get(i.tagNo) : 0) ?? 0,
          printerIp: i.printerIp ?? i.clientIp ?? '—',
          operator: i.operator ?? i.operatorName ?? i.userNameSnapshot ?? '',
          timestamp: i.timestamp ?? i.printedAt ?? i.createdAt ?? '',
          branchId: i.branchId ?? 0,
        })),
      })),
      catchError(() => of(this.getMockLabelScanReport(params)))
    );
  }

  getOverallSummaryReport(params?: OverallSummaryReportParams): Observable<PagedResult<OverallSummaryReportItemDto>> {
    const q = this.buildQueryParams(params);
    return this.api.get<PagedResult<any>>(`${this.endpoint}/overall`, q).pipe(
      map((res) => ({
        ...res,
        items: (res?.items || []).map((i: any) => ({
          materialCode: i.materialCode ?? i.groupKey ?? '',
          partName: i.partName ?? '—',
          totalInwarded: i.totalInwarded ?? i.totalInwardQty ?? 0,
          totalIssued: i.totalIssued ?? i.totalOutwardQty ?? 0,
          currentStock: i.currentStock ?? i.currentStockQty ?? 0,
          movementCount: i.movementCount ?? i.totalMovements ?? 0,
          lastMovementAt: i.lastMovementAt ?? '',
          branchId: i.branchId ?? 0,
        })),
      })),
      catchError(() => of(this.getMockOverallReport(params)))
    );
  }

  getAcceptRejectReport(params?: AcceptRejectReportParams): Observable<PagedResult<AcceptRejectReportItemDto>> {
    const q = this.buildQueryParams(params);
    return this.api.get<PagedResult<any>>(`${this.endpoint}/accept-reject`, q).pipe(
      map((res) => ({
        ...res,
        items: (res?.items || []).map((i: any) => ({
          tagNo: i.tagNo ?? '',
          materialCode: i.materialCode ?? '',
          qty: i.qty ?? 0,
          status: ((i.status === 'Accept' || i.status === 'Accepted') ? 'Accepted' : 'Rejected') as 'Accepted' | 'Rejected',
          reason: i.reason ?? null,
          inspector: i.inspector ?? i.inspectorName ?? i.userNameSnapshot ?? '',
          processedAt: i.processedAt ?? i.createdAt ?? '',
          branchId: i.branchId ?? 0,
        })),
      })),
      catchError(() => of(this.getMockAcceptRejectReport(params)))
    );
  }

  getLocationTransferReport(params?: LocationTransferReportParams): Observable<PagedResult<LocationTransferReportItemDto>> {
    const q = this.buildQueryParams(params);
    return this.api.get<PagedResult<any>>(`${this.endpoint}/location-transfer`, q).pipe(
      map((res) => ({
        ...res,
        items: (res?.items || []).map((i: any) => {
          if (i.tagNo && (i.materialCode || i.code)) tagMaterialCache.set(i.tagNo, i.materialCode || i.code);
          if (i.tagNo && i.qty) tagQtyCache.set(i.tagNo, i.qty);
          return {
            tagNo: i.tagNo ?? '',
            materialCode: i.materialCode ?? '',
            fromLocationCode: i.fromLocationCode ?? '—',
            toLocationCode: i.toLocationCode ?? (i.locationCode ?? '—'),
            qty: i.qty ?? 0,
            reason: i.reason ?? 'Standard Relocation',
            operator: i.operator ?? i.operatorName ?? i.userNameSnapshot ?? '',
            transferredAt: i.transferredAt ?? i.createdAt ?? '',
            branchId: i.branchId ?? 0,
          };
        }),
      })),
      catchError(() => of(this.getMockTransferReport(params)))
    );
  }

  getDashboardLive(branchId?: number): Observable<DashboardLiveMetricsDto> {
    const q: QueryParamsRecord = {};
    if (branchId !== undefined && branchId !== null) q['branchId'] = branchId;

    return this.api.get<DashboardLiveMetricsDto>(`${this.endpoint}/dashboard-live`, q).pipe(
      catchError(() => of(this.getMockDashboardLive()))
    );
  }

  // --- Helper to build QueryParamsRecord ---

  private buildQueryParams(params?: Record<string, any>): QueryParamsRecord {
    const record: QueryParamsRecord = {};
    if (!params) return record;

    for (const [key, val] of Object.entries(params)) {
      if (val !== undefined && val !== null && val !== '') {
        record[key] = val;
      }
    }
    return record;
  }

  // --- Mock Data Generators (Used during offline dev or before backend report routes exist) ---

  private getMockInwardReport(p?: InwardReportParams): PagedResult<InwardReportItemDto> {
    const mockAll: InwardReportItemDto[] = [
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
      {
        tagNo: 'STK-001012',
        materialCode: 'M100',
        partName: 'Steel Bolt M8',
        qty: 150,
        locationCode: 'A-01-02',
        locationZone: 'Fast-Moving',
        inwardAt: '2026-10-20T10:15:00Z',
        userNameSnapshot: 'Suresh Raina',
        branchId: 1,
      },
      {
        tagNo: 'STK-001021',
        materialCode: 'M200',
        partName: 'Hydraulic Oil 20L',
        qty: 40,
        locationCode: 'B-01-01',
        locationZone: 'Bulk-Storage',
        inwardAt: '2026-10-19T08:45:00Z',
        userNameSnapshot: 'Ravi Kumar',
        branchId: 1,
      },
      {
        tagNo: 'STK-4900003',
        materialCode: 'M300',
        partName: 'Bearing 6205',
        qty: 50,
        locationCode: 'A-02-01',
        locationZone: 'Consolidation',
        inwardAt: '2026-10-18T14:20:00Z',
        userNameSnapshot: 'Admin User',
        branchId: 1,
      },
      {
        tagNo: 'STK-001031',
        materialCode: 'M400',
        partName: 'Gasket Set Standard',
        qty: 120,
        locationCode: 'B-02-01',
        locationZone: 'Bulk-Storage',
        inwardAt: '2026-10-17T11:00:00Z',
        userNameSnapshot: 'Suresh Raina',
        branchId: 1,
      },
    ];

    const filtered = this.filterArray(mockAll, p?.search, (i) => `${i.tagNo} ${i.materialCode} ${i.partName} ${i.locationCode}`);
    return this.paginate(filtered, p?.page, p?.pageSize);
  }

  private getMockOutwardReport(p?: OutwardReportParams): PagedResult<OutwardReportItemDto> {
    const mockAll: OutwardReportItemDto[] = [
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
      {
        tagNo: 'STK-4900002',
        materialCode: 'M100',
        partName: 'Steel Bolt M8',
        issuedQty: 100,
        remainingQty: 150,
        locationCode: 'A-01-02',
        dispatchedAt: '2026-10-20T14:30:00Z',
        userNameSnapshot: 'Admin User',
        bypassFifo: true,
        branchId: 1,
      },
      {
        tagNo: 'STK-001021',
        materialCode: 'M200',
        partName: 'Hydraulic Oil 20L',
        issuedQty: 20,
        remainingQty: 20,
        locationCode: 'B-01-01',
        dispatchedAt: '2026-10-19T16:00:00Z',
        userNameSnapshot: 'Operator',
        bypassFifo: false,
        branchId: 1,
      },
    ];

    const filtered = this.filterArray(mockAll, p?.search, (i) => `${i.tagNo} ${i.materialCode} ${i.partName} ${i.locationCode}`);
    return this.paginate(filtered, p?.page, p?.pageSize);
  }

  private getMockInStockReport(p?: InStockReportParams): PagedResult<InStockReportItemDto> {
    const mockAll: InStockReportItemDto[] = [
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
      {
        materialCode: 'M100',
        partName: 'Steel Bolt M8',
        locationCode: 'A-01-02',
        locationZone: 'Fast-Moving',
        totalQty: 150,
        tagCount: 1,
        oldestInwardAt: '2026-10-09T00:00:00Z',
        branchId: 1,
      },
      {
        materialCode: 'M200',
        partName: 'Hydraulic Oil 20L',
        locationCode: 'B-01-01',
        locationZone: 'Bulk-Storage',
        totalQty: 60,
        tagCount: 2,
        oldestInwardAt: '2026-10-12T00:00:00Z',
        branchId: 1,
      },
      {
        materialCode: 'M300',
        partName: 'Bearing 6205',
        locationCode: 'A-02-01',
        locationZone: 'Consolidation',
        totalQty: 50,
        tagCount: 1,
        oldestInwardAt: '2026-10-18T10:00:00Z',
        branchId: 1,
      },
    ];

    const filtered = this.filterArray(mockAll, p?.search, (i) => `${i.materialCode} ${i.partName} ${i.locationCode} ${i.locationZone}`);
    return this.paginate(filtered, p?.page, p?.pageSize);
  }

  private getMockLabelScanReport(p?: LabelScanReportParams): PagedResult<LabelScanReportItemDto> {
    const mockAll: LabelScanReportItemDto[] = [
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
      {
        tagNo: 'STK-001011',
        materialCode: 'M100',
        actionType: 'Scanned',
        qty: 200,
        printerIp: 'Handheld-01',
        operator: 'Operator',
        timestamp: '2026-10-21T07:30:00Z',
        branchId: 1,
      },
      {
        tagNo: 'STK-001012',
        materialCode: 'M100',
        actionType: 'Reprinted',
        qty: 150,
        printerIp: '192.168.1.150',
        operator: 'Admin User',
        timestamp: '2026-10-20T10:10:00Z',
        branchId: 1,
      },
    ];

    const filtered = this.filterArray(mockAll, p?.search, (i) => `${i.tagNo} ${i.materialCode} ${i.actionType} ${i.operator}`);
    return this.paginate(filtered, p?.page, p?.pageSize);
  }

  private getMockOverallReport(p?: OverallSummaryReportParams): PagedResult<OverallSummaryReportItemDto> {
    const mockAll: OverallSummaryReportItemDto[] = [
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
      {
        materialCode: 'M200',
        partName: 'Hydraulic Oil 20L',
        totalInwarded: 80,
        totalIssued: 20,
        currentStock: 60,
        movementCount: 4,
        lastMovementAt: '2026-10-19T16:00:00Z',
        branchId: 1,
      },
      {
        materialCode: 'M300',
        partName: 'Bearing 6205',
        totalInwarded: 100,
        totalIssued: 50,
        currentStock: 50,
        movementCount: 3,
        lastMovementAt: '2026-10-21T07:30:00Z',
        branchId: 1,
      },
    ];

    const filtered = this.filterArray(mockAll, p?.search, (i) => `${i.materialCode} ${i.partName}`);
    return this.paginate(filtered, p?.page, p?.pageSize);
  }

  private getMockAcceptRejectReport(p?: AcceptRejectReportParams): PagedResult<AcceptRejectReportItemDto> {
    const mockAll: AcceptRejectReportItemDto[] = [
      {
        tagNo: 'STK-4900001',
        materialCode: 'M100',
        qty: 50,
        status: 'Accepted',
        reason: null,
        inspector: 'Inspector Ramesh',
        processedAt: '2026-10-21T08:30:00Z',
        branchId: 1,
      },
      {
        tagNo: 'STK-4900002',
        materialCode: 'M100',
        qty: 50,
        status: 'Rejected',
        reason: 'Packaging torn and dirty grease marks',
        inspector: 'Inspector Ramesh',
        processedAt: '2026-10-20T15:00:00Z',
        branchId: 1,
      },
      {
        tagNo: 'STK-001021',
        materialCode: 'M200',
        qty: 20,
        status: 'Accepted',
        reason: null,
        inspector: 'QC Team Lead',
        processedAt: '2026-10-19T16:30:00Z',
        branchId: 1,
      },
    ];

    let list = mockAll;
    if (p?.status && p.status !== 'All') {
      list = list.filter((i) => i.status === p.status);
    }

    const filtered = this.filterArray(list, p?.search, (i) => `${i.tagNo} ${i.materialCode} ${i.status} ${i.reason || ''}`);
    return this.paginate(filtered, p?.page, p?.pageSize);
  }

  private getMockTransferReport(p?: LocationTransferReportParams): PagedResult<LocationTransferReportItemDto> {
    const mockAll: LocationTransferReportItemDto[] = [
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
      {
        tagNo: 'STK-4900001',
        materialCode: 'M100',
        fromLocationCode: 'B-01-01',
        toLocationCode: 'A-01-01',
        qty: 100,
        reason: 'Fast-moving picking relocation',
        operator: 'Operator',
        transferredAt: '2026-10-21T06:45:00Z',
        branchId: 1,
      },
    ];

    const filtered = this.filterArray(mockAll, p?.search, (i) => `${i.tagNo} ${i.materialCode} ${i.fromLocationCode} ${i.toLocationCode}`);
    return this.paginate(filtered, p?.page, p?.pageSize);
  }

  private getMockDashboardLive(): DashboardLiveMetricsDto {
    return {
      totalRegisteredItems: 1420,
      pendingInwardItems: 28,
      totalInStockItems: 1250,
      totalClaimedRejected: 14,
      activeAlertsCount: 2,
      recentMovements: [
        {
          id: 101,
          tagNo: 'STK-001011',
          materialCode: 'M100',
          partName: 'Steel Bolt M8',
          movementType: 'Inward',
          qty: 200,
          locationCode: 'A-01-01',
          timestamp: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
          userName: 'Ravi Kumar',
        },
        {
          id: 102,
          tagNo: 'STK-4900001',
          materialCode: 'M100',
          partName: 'Steel Bolt M8',
          movementType: 'Outward',
          qty: 50,
          locationCode: 'A-01-01',
          timestamp: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
          userName: 'StoreKeeper',
        },
        {
          id: 103,
          tagNo: 'STK-4900003',
          materialCode: 'Bearing 6205',
          partName: 'Deep Groove Ball Bearing',
          movementType: 'Transfer',
          qty: 50,
          locationCode: 'A-02-01',
          timestamp: new Date(Date.now() - 1000 * 60 * 90).toISOString(),
          userName: 'StoreKeeper',
        },
        {
          id: 104,
          tagNo: 'STK-4900002',
          materialCode: 'M100',
          partName: 'Steel Bolt M8',
          movementType: 'Reject',
          qty: 50,
          locationCode: 'A-01-02',
          timestamp: new Date(Date.now() - 1000 * 60 * 180).toISOString(),
          userName: 'QC Inspector',
        },
      ],
      zoneOccupancy: [
        { zone: 'Fast-Moving (Zone A)', usedQty: 580, capacity: 600, percentage: 96 },
        { zone: 'Bulk-Storage (Zone B)', usedQty: 440, capacity: 800, percentage: 55 },
        { zone: 'Consolidation (Zone C)', usedQty: 100, capacity: 200, percentage: 50 },
      ],
    };
  }

  private filterArray<T>(items: T[], search: string | undefined, searchExtractor: (i: T) => string): T[] {
    if (!search?.trim()) return items;
    const term = search.trim().toLowerCase();
    return items.filter((i) => searchExtractor(i).toLowerCase().includes(term));
  }

  private paginate<T>(items: T[], page = 1, pageSize = 10): PagedResult<T> {
    const p = Math.max(1, page);
    const size = Math.max(1, pageSize);
    const totalCount = items.length;
    const totalPages = Math.ceil(totalCount / size) || 1;
    const startIndex = (p - 1) * size;
    const pagedItems = items.slice(startIndex, startIndex + size);

    return {
      items: pagedItems,
      totalCount,
      page: p,
      pageSize: size,
      totalPages,
    };
  }
}
