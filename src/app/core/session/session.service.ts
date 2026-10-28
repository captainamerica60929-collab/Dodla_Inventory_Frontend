import { Injectable, computed, signal } from '@angular/core';

export interface UserSession {
  id: string;
  username: string;
  fullName: string;
  department?: string | null;
  initials?: string;
}

export interface BranchSession {
  id: string;
  code: string;
  name: string;
}

export type UserRole = 'Admin' | 'StoreKeeper' | 'Operator' | 'Viewer';

@Injectable({
  providedIn: 'root',
})
export class SessionService {
  // Signals with null defaults as requested
  readonly user = signal<UserSession | null>(null);
  readonly branch = signal<BranchSession | null>(null);
  readonly role = signal<UserRole | null>(null);

  // TODO: Populate user, branch, and role from login response / JWT authentication

  readonly isLoggedIn = computed(() => this.user() !== null);

  readonly userDisplayName = computed(() => {
    const u = this.user();
    return u ? u.fullName || u.username : 'Not signed in';
  });

  readonly userDepartment = computed(() => {
    const u = this.user();
    return u?.department || (u ? 'No department' : 'Guest');
  });

  readonly userInitials = computed(() => {
    const u = this.user();
    if (!u) return '--';
    if (u.initials) return u.initials;
    if (u.fullName) {
      const parts = u.fullName.trim().split(/\s+/);
      return parts.length > 1
        ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
        : parts[0].slice(0, 2).toUpperCase();
    }
    return u.username.slice(0, 2).toUpperCase();
  });

  readonly branchDisplayName = computed(() => {
    const b = this.branch();
    return b ? `${b.name} (${b.code})` : 'No branch selected';
  });

  setUser(user: UserSession | null): void {
    this.user.set(user);
  }

  setBranch(branch: BranchSession | null): void {
    this.branch.set(branch);
  }

  setRole(role: UserRole | null): void {
    this.role.set(role);
  }

  clear(): void {
    this.user.set(null);
    this.branch.set(null);
    this.role.set(null);
  }
}
