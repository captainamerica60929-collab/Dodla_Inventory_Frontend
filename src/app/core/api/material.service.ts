import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService, QueryParamsRecord } from './api.service';

export interface MaterialDto {
  id: number;
  code: string;
  name: string;
  uom: string;
  zone: string | null;
  isActive: boolean;
  createdAt: string;
  createdBy: number | null;
  modifiedAt: string | null;
  modifiedBy: number | null;
}

export interface CreateMaterialDto {
  code: string;
  name: string;
  uom: string;
  zone?: string | null;
}

export interface UpdateMaterialDto {
  name: string;
  uom: string;
  zone?: string | null;
  isActive: boolean;
}

export interface MaterialFilterParams {
  page?: number;
  pageSize?: number;
  search?: string;
  activeOnly?: boolean;
  zone?: string;
}

export interface PagedResult<T> {
  items: T[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

@Injectable({
  providedIn: 'root',
})
export class MaterialService {
  private readonly api = inject(ApiService);
  private readonly endpoint = 'materials';

  getPaged(params?: MaterialFilterParams): Observable<PagedResult<MaterialDto>> {
    const queryParams: QueryParamsRecord = {};
    if (params) {
      if (params.page !== undefined) queryParams['page'] = params.page;
      if (params.pageSize !== undefined) queryParams['pageSize'] = params.pageSize;
      if (params.search?.trim()) queryParams['search'] = params.search.trim();
      if (params.activeOnly !== undefined) queryParams['activeOnly'] = params.activeOnly;
      if (params.zone?.trim()) queryParams['zone'] = params.zone.trim();
    }
    return this.api.get<PagedResult<MaterialDto>>(this.endpoint, queryParams);
  }

  getById(id: number): Observable<MaterialDto> {
    return this.api.get<MaterialDto>(`${this.endpoint}/${id}`);
  }

  create(dto: CreateMaterialDto): Observable<MaterialDto> {
    return this.api.post<MaterialDto>(this.endpoint, dto);
  }

  update(id: number, dto: UpdateMaterialDto): Observable<MaterialDto> {
    return this.api.put<MaterialDto>(`${this.endpoint}/${id}`, dto);
  }

  delete(id: number): Observable<void> {
    return this.api.delete<void>(`${this.endpoint}/${id}`);
  }
}
