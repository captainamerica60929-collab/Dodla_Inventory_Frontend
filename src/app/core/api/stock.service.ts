import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService, QueryParamsRecord } from './api.service';

export interface InwardScanRequestDto {
  tagNo: string;
  locationCode: string;
}

export interface InwardResponseDto {
  stockRecordId: number;
  tagId: number;
  tagNo: string;
  locationId: number;
  locationCode: string;
  materialCode: string;
  qty: number;
  locationUsedCapacity: number;
  locationCapacity: number;
  inwardAt: string;
}

export interface OutwardIssueRequestDto {
  tagNo: string;
  qty: number;
  bypassFifo?: boolean;
}

export interface OutwardResponseDto {
  tagId: number;
  tagNo: string;
  materialCode: string;
  issuedQty: number;
  remainingQty: number;
  tagStatus: string;
  locationId: number;
  locationCode: string;
  inwardAt: string;
}

export interface AcceptRequestDto {
  tagNo: string;
}

export interface RejectRequestDto {
  tagNo: string;
  reason: string;
}

export interface AcceptRejectResponseDto {
  tagId: number;
  tagNo: string;
  materialCode: string;
  previousStatus: string;
  newStatus: string;
  remainingQty: number;
  reason: string | null;
  processedAt: string;
}

export interface LocationTransferRequestDto {
  tagNo: string;
  targetLocationCode: string;
  reason?: string;
}

export interface LocationTransferResponseDto {
  tagId: number;
  tagNo: string;
  materialCode: string;
  qty: number;
  fromLocationCode: string;
  toLocationCode: string;
  reason?: string | null;
  transferredAt: string;
}

export interface TagStockInfoDto {
  tagId: number;
  tagNo: string;
  status: string;
  qty: number;
  remainingQty: number;
  materialCode: string;
  partName?: string | null;
  batchNo?: string | null;
  locationId?: number | null;
  locationCode?: string | null;
  locationZone?: string | null;
  inwardAt?: string | null;
}

export interface StockMovementDto {
  id: number;
  tagId: number;
  tagNo: string;
  locationId: number | null;
  locationCode: string | null;
  materialCode: string;
  movementType: 'In' | 'Out' | 'Accept' | 'Reject' | string;
  qty: number;
  inwardAt: string | null;
  reason: string | null;
  userId: number;
  userNameSnapshot: string | null;
  clientIp: string | null;
  createdAt: string;
}

export interface StockMovementFilterParams {
  tagNo?: string;
  locationId?: number;
}

@Injectable({
  providedIn: 'root',
})
export class StockService {
  private readonly api = inject(ApiService);
  private readonly endpoint = 'stock';

  /**
   * Inward Putaway scan: maps an allocated/printed tag into a designated bin.
   */
  inward(dto: InwardScanRequestDto): Observable<InwardResponseDto> {
    return this.api.post<InwardResponseDto>(`${this.endpoint}/inward`, dto);
  }

  /**
   * Outward FIFO stock issuance: enforces strict FIFO consumption.
   */
  outward(dto: OutwardIssueRequestDto): Observable<OutwardResponseDto> {
    return this.api.post<OutwardResponseDto>(`${this.endpoint}/outward`, dto);
  }

  /**
   * Receiving operator confirms acceptance of an issued tag.
   */
  accept(dto: AcceptRequestDto): Observable<AcceptRejectResponseDto> {
    return this.api.post<AcceptRejectResponseDto>(`${this.endpoint}/accept`, dto);
  }

  /**
   * Receiving operator rejects an issued tag with a mandatory reason.
   */
  reject(dto: RejectRequestDto): Observable<AcceptRejectResponseDto> {
    return this.api.post<AcceptRejectResponseDto>(`${this.endpoint}/reject`, dto);
  }

  /**
   * Relocate stock tag between warehouse bins.
   */
  transfer(dto: LocationTransferRequestDto): Observable<LocationTransferResponseDto> {
    return this.api.post<LocationTransferResponseDto>(`${this.endpoint}/transfer`, dto);
  }

  /**
   * Tag lookup: returns live stock, status, location, and balance for scanning feedback.
   */
  getTagStockInfo(tagNo: string): Observable<TagStockInfoDto> {
    const cleanTag = encodeURIComponent(tagNo.trim());
    return this.api.get<TagStockInfoDto>(`${this.endpoint}/tags/${cleanTag}`);
  }

  /**
   * Movement audit trail: returns chronological list of stock movements.
   */
  getMovements(params?: StockMovementFilterParams): Observable<StockMovementDto[]> {
    const queryParams: QueryParamsRecord = {};
    if (params) {
      if (params.tagNo?.trim()) queryParams['tagNo'] = params.tagNo.trim();
      if (params.locationId !== undefined && params.locationId !== null) {
        queryParams['locationId'] = params.locationId;
      }
    }
    return this.api.get<StockMovementDto[]>(`${this.endpoint}/movements`, queryParams);
  }
}
