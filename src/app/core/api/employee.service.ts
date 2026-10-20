import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';

export interface EmployeeDto {
  id: number;
  code: string;
  name: string;
  department: string | null;
  designation: string | null;
  phone: string | null;
  isActive: boolean;
  createdAt: string;
  createdBy: number | null;
  modifiedAt: string | null;
  modifiedBy: number | null;
}

export interface CreateEmployeeDto {
  code: string;
  name: string;
  department?: string | null;
  designation?: string | null;
  phone?: string | null;
}

export interface UpdateEmployeeDto {
  name: string;
  department?: string | null;
  designation?: string | null;
  phone?: string | null;
  isActive: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class EmployeeService {
  private readonly api = inject(ApiService);
  private readonly endpoint = 'employees';

  getAll(activeOnly?: boolean): Observable<EmployeeDto[]> {
    return this.api.get<EmployeeDto[]>(
      this.endpoint,
      activeOnly !== undefined ? { activeOnly } : undefined,
    );
  }

  getById(id: number): Observable<EmployeeDto> {
    return this.api.get<EmployeeDto>(`${this.endpoint}/${id}`);
  }

  create(dto: CreateEmployeeDto): Observable<EmployeeDto> {
    return this.api.post<EmployeeDto>(this.endpoint, dto);
  }

  update(id: number, dto: UpdateEmployeeDto): Observable<EmployeeDto> {
    return this.api.put<EmployeeDto>(`${this.endpoint}/${id}`, dto);
  }

  deactivate(id: number): Observable<void> {
    return this.api.delete<void>(`${this.endpoint}/${id}`);
  }
}
