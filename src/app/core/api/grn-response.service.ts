import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService, QueryParamsRecord } from './api.service';

export interface GrnResponseListItemDto {
  id: number;
  branchId: number;
  apiCredentialId: number;
  fetchBatchId: string;
  fetchedAt: string;
  fetchedBy: number | null;
  grnNo: string;
  grnYear: number | null;
  grnItemNo: number | null;
  grnDate: string | null;
  invoiceNo: string | null;
  invoiceDate: string | null;
  qty: number | null;
  uom: string | null;
  materialCode: string | null;
  partName: string | null;
  description: string | null;
  plant: string | null;
  storageLocation: string | null;
  batchNo: string | null;
  poNo: string | null;
  poItem: string | null;
  vendorCode: string | null;
  vendorName: string | null;
  sourceKey: string | null;
  status: string | number;
  errorMessage: string | null;
  processedAt: string | null;
}

export interface GrnResponseDetailDto extends GrnResponseListItemDto {
  rawJson: string;
}

export interface PagedResultDto<T> {
  items: T[];
  total: number;
}

export interface GrnResponseFilterDto {
  status?: string | null;
  fetchBatchId?: string | null;
  grnNo?: string | null;
  fromDate?: string | null;
  toDate?: string | null;
  page?: number;
  pageSize?: number;
}

@Injectable({
  providedIn: 'root',
})
export class GrnResponseService {
  private readonly api = inject(ApiService);
  private readonly endpoint = 'grn-responses';

  getPaged(filter: GrnResponseFilterDto): Observable<PagedResultDto<GrnResponseListItemDto>> {
    const params: QueryParamsRecord = {
      status: filter.status,
      fetchBatchId: filter.fetchBatchId,
      grnNo: filter.grnNo,
      fromDate: filter.fromDate,
      toDate: filter.toDate,
      page: filter.page ?? 1,
      pageSize: filter.pageSize ?? 50,
    };
    return this.api.get<PagedResultDto<GrnResponseListItemDto>>(this.endpoint, params);
  }

  getById(id: number): Observable<GrnResponseDetailDto> {
    return this.api.get<GrnResponseDetailDto>(`${this.endpoint}/${id}`);
  }

  discardBatch(fetchBatchId: string): Observable<void> {
    return this.api.delete<void>(`${this.endpoint}/batches/${fetchBatchId}`);
  }
}
