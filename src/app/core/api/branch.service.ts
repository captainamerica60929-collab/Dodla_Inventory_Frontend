import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';

export interface BranchDto {
  id: number;
  code: string;
  name: string;
  plantCode: string | null;
  isActive: boolean;
  createdAt: string;
  createdBy: number | null;
  modifiedAt: string | null;
  modifiedBy: number | null;
}

export interface CreateBranchDto {
  code: string;
  name: string;
  plantCode?: string | null;
}

export interface UpdateBranchDto {
  name: string;
  plantCode?: string | null;
  isActive: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class BranchService {
  private readonly api = inject(ApiService);
  private readonly endpoint = 'branches';

  getAll(activeOnly?: boolean): Observable<BranchDto[]> {
    return this.api.get<BranchDto[]>(
      this.endpoint,
      activeOnly !== undefined ? { activeOnly } : undefined,
    );
  }

  getById(id: number): Observable<BranchDto> {
    return this.api.get<BranchDto>(`${this.endpoint}/${id}`);
  }

  create(dto: CreateBranchDto): Observable<BranchDto> {
    return this.api.post<BranchDto>(this.endpoint, dto);
  }

  update(id: number, dto: UpdateBranchDto): Observable<BranchDto> {
    return this.api.put<BranchDto>(`${this.endpoint}/${id}`, dto);
  }

  delete(id: number): Observable<void> {
    return this.api.delete<void>(`${this.endpoint}/${id}`);
  }
}
