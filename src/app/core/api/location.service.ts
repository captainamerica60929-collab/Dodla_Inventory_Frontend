import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService, QueryParamsRecord } from './api.service';
import { PagedResult } from './material.service';

export interface LocationDto {
  id: number;
  branchId: number;
  code: string;
  zone: string;
  capacity: number;
  usedQty: number;
  freeQty: number;
  isActive: boolean;
  rowVersion: string;
  createdAt: string;
  createdBy: number | null;
  modifiedAt: string | null;
  modifiedBy: number | null;
}

export interface CreateLocationDto {
  code: string;
  zone: string;
  capacity: number;
}

export interface UpdateLocationDto {
  zone: string;
  capacity: number;
  isActive: boolean;
  rowVersion: string;
}

export interface LocationFilterParams {
  page?: number;
  pageSize?: number;
  search?: string;
  activeOnly?: boolean;
  zone?: string;
}

@Injectable({
  providedIn: 'root',
})
export class LocationService {
  private readonly api = inject(ApiService);
  private readonly endpoint = 'locations';

  getPaged(params?: LocationFilterParams): Observable<PagedResult<LocationDto>> {
    const queryParams: QueryParamsRecord = {};
    if (params) {
      if (params.page !== undefined) queryParams['page'] = params.page;
      if (params.pageSize !== undefined) queryParams['pageSize'] = params.pageSize;
      if (params.search?.trim()) queryParams['search'] = params.search.trim();
      if (params.activeOnly !== undefined) queryParams['activeOnly'] = params.activeOnly;
      if (params.zone?.trim()) queryParams['zone'] = params.zone.trim();
    }
    return this.api.get<PagedResult<LocationDto>>(this.endpoint, queryParams);
  }

  getById(id: number): Observable<LocationDto> {
    return this.api.get<LocationDto>(`${this.endpoint}/${id}`);
  }

  create(dto: CreateLocationDto): Observable<LocationDto> {
    return this.api.post<LocationDto>(this.endpoint, dto);
  }

  update(id: number, dto: UpdateLocationDto): Observable<LocationDto> {
    return this.api.put<LocationDto>(`${this.endpoint}/${id}`, dto);
  }

  delete(id: number): Observable<void> {
    return this.api.delete<void>(`${this.endpoint}/${id}`);
  }
}
