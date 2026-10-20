import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';

export interface UserDto {
  id: number;
  username: string;
  employeeId: number;
  employeeName: string;
  employeeCode: string;
  role: string;
  mustChangePassword: boolean;
  isActive: boolean;
  failedLoginCount: number;
  lockoutEnd: string | null;
  lastLoginAt: string | null;
  branchIds: number[];
  createdAt: string;
  createdBy: number | null;
  modifiedAt: string | null;
  modifiedBy: number | null;
}

export interface CreateUserDto {
  employeeId: number;
  username: string;
  role: string;
  branchIds: number[];
  initialPassword: string;
}

export interface UpdateUserDto {
  role: string;
  branchIds: number[];
  isActive: boolean;
}

export interface ResetPasswordDto {
  newPassword: string;
}

@Injectable({
  providedIn: 'root',
})
export class UserService {
  private readonly api = inject(ApiService);
  private readonly endpoint = 'users';

  getAll(): Observable<UserDto[]> {
    return this.api.get<UserDto[]>(this.endpoint);
  }

  getById(id: number): Observable<UserDto> {
    return this.api.get<UserDto>(`${this.endpoint}/${id}`);
  }

  create(dto: CreateUserDto): Observable<UserDto> {
    return this.api.post<UserDto>(this.endpoint, dto);
  }

  update(id: number, dto: UpdateUserDto): Observable<UserDto> {
    return this.api.put<UserDto>(`${this.endpoint}/${id}`, dto);
  }

  resetPassword(id: number, dto: ResetPasswordDto): Observable<void> {
    return this.api.post<void>(`${this.endpoint}/${id}/reset-password`, dto);
  }

  unlock(id: number): Observable<void> {
    return this.api.post<void>(`${this.endpoint}/${id}/unlock`);
  }
}
