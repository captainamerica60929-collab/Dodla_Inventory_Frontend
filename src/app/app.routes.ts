import { Routes } from '@angular/router';
import { ShellComponent } from './core/layout/shell/shell.component';

export const routes: Routes = [
  // Bare layout route for login (without shell navigation)
  {
    path: 'login',
    loadComponent: () =>
      import('./features/auth/login.page').then((m) => m.LoginPageComponent),
  },

  // Shell layout routes (with sidebar & topbar)
  {
    path: '',
    component: ShellComponent,
    children: [
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full',
      },
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./features/dashboard/dashboard.page').then(
            (m) => m.DashboardPageComponent,
          ),
      },
      // Masters
      {
        path: 'masters/material',
        loadComponent: () =>
          import('./features/masters/material/material.page').then(
            (m) => m.MaterialPageComponent,
          ),
      },
      {
        path: 'masters/location',
        loadComponent: () =>
          import('./features/masters/location/location.page').then(
            (m) => m.LocationPageComponent,
          ),
      },
      {
        path: 'masters/employee',
        loadComponent: () =>
          import('./features/masters/employee/employee.page').then(
            (m) => m.EmployeePageComponent,
          ),
      },
      {
        path: 'masters/user',
        loadComponent: () =>
          import('./features/masters/user/user.page').then(
            (m) => m.UserPageComponent,
          ),
      },
      {
        path: 'masters/branch',
        loadComponent: () =>
          import('./features/masters/branch/branch.page').then(
            (m) => m.BranchPageComponent,
          ),
      },
      {
        path: 'masters/api-credential',
        loadComponent: () =>
          import('./features/masters/api-credential/api-credential.page').then(
            (m) => m.ApiCredentialPageComponent,
          ),
      },
      // Transactions
      {
        path: 'transactions/grn',
        loadComponent: () =>
          import('./features/transactions/grn/grn.page').then(
            (m) => m.GrnPageComponent,
          ),
      },
      {
        path: 'transactions/inward',
        loadComponent: () =>
          import('./features/transactions/inward/inward.page').then(
            (m) => m.InwardPageComponent,
          ),
      },
      {
        path: 'transactions/outward',
        loadComponent: () =>
          import('./features/transactions/outward/outward.page').then(
            (m) => m.OutwardPageComponent,
          ),
      },
      {
        path: 'transactions/transfer',
        loadComponent: () =>
          import('./features/transactions/transfer/transfer.page').then(
            (m) => m.TransferPageComponent,
          ),
      },
      {
        path: 'transactions/accept',
        loadComponent: () =>
          import('./features/transactions/accept/accept.page').then(
            (m) => m.AcceptPageComponent,
          ),
      },
      // Reports
      {
        path: 'reports',
        loadComponent: () =>
          import('./features/reports/reports.page').then(
            (m) => m.ReportsPageComponent,
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
