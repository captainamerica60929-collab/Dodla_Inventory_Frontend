import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { roleGuard } from './core/guards/role.guard';
import { ShellComponent } from './core/layout/shell/shell.component';

export const routes: Routes = [
  // Bare layout routes
  {
    path: 'login',
    loadComponent: () =>
      import('./features/auth/login.page').then((m) => m.LoginPageComponent),
  },
  {
    path: 'change-password',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/auth/change-password.page').then(
        (m) => m.ChangePasswordPageComponent,
      ),
  },

  // Shell layout routes (with sidebar & topbar)
  {
    path: '',
    component: ShellComponent,
    canActivate: [authGuard],
    children: [
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full',
      },
      {
        path: 'dashboard',
        canActivate: [roleGuard],
        data: { allowedRoles: ['Admin', 'StoreKeeper', 'Operator', 'Viewer'] },
        loadComponent: () =>
          import('./features/dashboard/dashboard.page').then(
            (m) => m.DashboardPageComponent,
          ),
      },
      // Masters
      {
        path: 'masters/material',
        canActivate: [roleGuard],
        data: { allowedRoles: ['Admin', 'StoreKeeper', 'Viewer'] },
        loadComponent: () =>
          import('./features/masters/material/material.page').then(
            (m) => m.MaterialPageComponent,
          ),
      },
      {
        path: 'masters/location',
        canActivate: [roleGuard],
        data: { allowedRoles: ['Admin', 'StoreKeeper', 'Viewer'] },
        loadComponent: () =>
          import('./features/masters/location/location.page').then(
            (m) => m.LocationPageComponent,
          ),
      },
      {
        path: 'masters/employee',
        canActivate: [roleGuard],
        data: { allowedRoles: ['Admin', 'StoreKeeper', 'Viewer'] },
        loadComponent: () =>
          import('./features/masters/employee/employee.page').then(
            (m) => m.EmployeePageComponent,
          ),
      },
      {
        path: 'masters/user',
        canActivate: [roleGuard],
        data: { allowedRoles: ['Admin'] },
        loadComponent: () =>
          import('./features/masters/user/user.page').then(
            (m) => m.UserPageComponent,
          ),
      },
      {
        path: 'masters/branch',
        canActivate: [roleGuard],
        data: { allowedRoles: ['Admin', 'StoreKeeper', 'Viewer'] },
        loadComponent: () =>
          import('./features/masters/branch/branch.page').then(
            (m) => m.BranchPageComponent,
          ),
      },
      {
        path: 'masters/api-credential',
        canActivate: [roleGuard],
        data: { allowedRoles: ['Admin'] },
        loadComponent: () =>
          import('./features/masters/api-credential/api-credential.page').then(
            (m) => m.ApiCredentialPageComponent,
          ),
      },
      // Transactions
      {
        path: 'transactions/grn',
        canActivate: [roleGuard],
        data: { allowedRoles: ['Admin', 'StoreKeeper'] },
        loadComponent: () =>
          import('./features/transactions/grn/grn.page').then(
            (m) => m.GrnPageComponent,
          ),
      },
      {
        path: 'transactions/inward',
        canActivate: [roleGuard],
        data: { allowedRoles: ['Admin', 'StoreKeeper', 'Operator'] },
        loadComponent: () =>
          import('./features/transactions/inward/inward.page').then(
            (m) => m.InwardPageComponent,
          ),
      },
      {
        path: 'transactions/outward',
        canActivate: [roleGuard],
        data: { allowedRoles: ['Admin', 'StoreKeeper', 'Operator'] },
        loadComponent: () =>
          import('./features/transactions/outward/outward.page').then(
            (m) => m.OutwardPageComponent,
          ),
      },
      {
        path: 'transactions/transfer',
        canActivate: [roleGuard],
        data: { allowedRoles: ['Admin', 'StoreKeeper', 'Operator'] },
        loadComponent: () =>
          import('./features/transactions/transfer/transfer.page').then(
            (m) => m.TransferPageComponent,
          ),
      },
      {
        path: 'transactions/accept',
        canActivate: [roleGuard],
        data: { allowedRoles: ['Admin', 'StoreKeeper', 'Operator'] },
        loadComponent: () =>
          import('./features/transactions/accept/accept.page').then(
            (m) => m.AcceptPageComponent,
          ),
      },
      // Reports
      {
        path: 'reports',
        canActivate: [roleGuard],
        data: { allowedRoles: ['Admin', 'StoreKeeper', 'Viewer'] },
        loadComponent: () =>
          import('./features/reports/reports.page').then(
            (m) => m.ReportsPageComponent,
          ),
      },
      // No Access Screen (accessible without role restrictions)
      {
        path: 'no-access',
        loadComponent: () =>
          import('./features/no-access/no-access.page').then(
            (m) => m.NoAccessPageComponent,
          ),
      },
    ],
  },

  // Fallback
  {
    path: '**',
    redirectTo: 'dashboard',
  },
];
