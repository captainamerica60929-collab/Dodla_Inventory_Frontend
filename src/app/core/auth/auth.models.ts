export interface BranchLookupDto {
  id: number;
  code: string;
  name: string;
}

export interface LoginRequest {
  branchId: number;
  username: string;
  password: string;
}

export interface LoginUserDto {
  id: number;
  username: string;
  name: string;
  role: string;
}

export interface LoginBranchDto {
  id: number;
  code: string;
  name: string;
}

export interface LoginResponse {
  token: string;
  expiresAt: string;
  user: LoginUserDto;
  branch: LoginBranchDto;
  mustChangePassword: boolean;
}

export interface MeDto {
  id: number;
  username: string;
  name: string;
  role: string;
  employeeId: number;
  branchId: number;
  mustChangePassword: boolean;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}
