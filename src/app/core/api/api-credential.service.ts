import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';

export type AuthType = 'None' | 'ApiKey' | 'Basic' | 'Bearer' | number;

export interface ApiCredentialDto {
  id: number;
  branchId: number;
  name: string;
  baseUrl: string;
  httpMethod: string;
  authType: AuthType;
  userName: string | null;
  headerName: string | null;
  hasSecret: boolean;
  extraHeadersJson: string | null;
  timeoutSeconds: number;
  contentType: string | null;
  requestBodyTemplate: string | null;
  responseRootPath: string | null;
  isActive: boolean;
  createdAt: string;
  createdBy: number | null;
  modifiedAt: string | null;
  modifiedBy: number | null;
}

export interface CreateApiCredentialDto {
  name: string;
  baseUrl: string;
  httpMethod?: string;
  authType?: AuthType;
  userName?: string | null;
  headerName?: string | null;
  secret?: string | null;
  extraHeadersJson?: string | null;
  timeoutSeconds?: number;
  contentType?: string | null;
  requestBodyTemplate?: string | null;
  responseRootPath?: string | null;
}

export interface UpdateApiCredentialDto {
  name: string;
  baseUrl: string;
  httpMethod: string;
  authType: AuthType;
  userName?: string | null;
  headerName?: string | null;
  secret?: string | null;
  extraHeadersJson?: string | null;
  timeoutSeconds: number;
  contentType?: string | null;
  requestBodyTemplate?: string | null;
  responseRootPath?: string | null;
  isActive: boolean;
}

export interface ApiFieldMappingDto {
  id: number;
  apiCredentialId: number;
  sourceField: string;
  targetColumn: string | number;
  format: string | null;
  defaultValue: string | null;
  isRequired: boolean;
}

export interface UpsertApiFieldMappingDto {
  sourceField: string;
  targetColumn: string | number;
  format?: string | null;
  defaultValue?: string | null;
  isRequired: boolean;
}

export interface ApiTestResultDto {
  success: boolean;
  statusCode: number;
  reasonPhrase: string;
  elapsedMs: number;
  bodyPreview: string | null;
}

export interface GrnApiResponsePreviewDto {
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
  rawJson: string;
  status: string | number;
  errorMessage: string | null;
}

export interface MappingPreviewResultDto {
  success: boolean;
  totalItemsFound: number;
  returnedPreviewCount: number;
  rows: GrnApiResponsePreviewDto[];
  error: string | null;
}

export interface PreviewSampleRequestDto {
  json: string;
  responseRootPath?: string | null;
  mappings: UpsertApiFieldMappingDto[];
}

export interface SamplePreviewResultDto {
  totalRows: number;
  returnedPreviewCount: number;
  errorRowsCount: number;
  rows: GrnApiResponsePreviewDto[];
}

export interface FetchGrnRequestDto {
  fromDate?: string | null;
  toDate?: string | null;
  plant?: string | null;
}

export interface FetchResultDto {
  fetchBatchId: string;
  total: number;
  saved: number;
  errorRows: number;
}

@Injectable({
  providedIn: 'root',
})
export class ApiCredentialService {
  private readonly api = inject(ApiService);
  private readonly endpoint = 'api-credentials';

  getAll(): Observable<ApiCredentialDto[]> {
    return this.api.get<ApiCredentialDto[]>(this.endpoint);
  }

  getById(id: number): Observable<ApiCredentialDto> {
    return this.api.get<ApiCredentialDto>(`${this.endpoint}/${id}`);
  }

  create(dto: CreateApiCredentialDto): Observable<ApiCredentialDto> {
    return this.api.post<ApiCredentialDto>(this.endpoint, dto);
  }

  update(id: number, dto: UpdateApiCredentialDto): Observable<ApiCredentialDto> {
    return this.api.put<ApiCredentialDto>(`${this.endpoint}/${id}`, dto);
  }

  delete(id: number): Observable<void> {
    return this.api.delete<void>(`${this.endpoint}/${id}`);
  }

  getMappings(id: number): Observable<ApiFieldMappingDto[]> {
    return this.api.get<ApiFieldMappingDto[]>(`${this.endpoint}/${id}/mappings`);
  }

  replaceMappings(
    id: number,
    mappings: UpsertApiFieldMappingDto[],
  ): Observable<ApiFieldMappingDto[]> {
    return this.api.put<ApiFieldMappingDto[]>(
      `${this.endpoint}/${id}/mappings`,
      mappings,
    );
  }

  testConnection(id: number): Observable<ApiTestResultDto> {
    return this.api.post<ApiTestResultDto>(`${this.endpoint}/${id}/test`);
  }

  previewLiveMapping(id: number): Observable<MappingPreviewResultDto> {
    return this.api.post<MappingPreviewResultDto>(
      `${this.endpoint}/${id}/preview-mapping`,
    );
  }

  previewSample(dto: PreviewSampleRequestDto): Observable<SamplePreviewResultDto> {
    return this.api.post<SamplePreviewResultDto>(
      'grn-mapping/preview-sample',
      dto,
    );
  }

  fetchGrn(id: number, dto: FetchGrnRequestDto): Observable<FetchResultDto> {
    return this.api.post<FetchResultDto>(`${this.endpoint}/${id}/fetch`, dto);
  }
}
