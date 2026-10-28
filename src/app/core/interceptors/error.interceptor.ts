import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../auth/auth.service';
import { NotificationService } from '../services/notification.service';

export interface ProblemDetails {
  status?: number;
  title?: string;
  detail?: string;
  instance?: string;
  traceId?: string;
  errors?: Record<string, string[] | string>;
  extensions?: Record<string, unknown>;
}

export const httpErrorInterceptor: HttpInterceptorFn = (req, next) => {
  const notificationService = inject(NotificationService);
  const authService = inject(AuthService);
  const router = inject(Router);

  return next(req).pipe(
    catchError((error: unknown) => {
      if (error instanceof HttpErrorResponse) {
        let title = 'Request Failed';
        let detail = 'An unexpected error occurred.';
        let traceId: string | undefined;

        // Try extracting RFC 7807 ProblemDetails / ValidationProblemDetails
        if (error.error && typeof error.error === 'object') {
          const problem = error.error as ProblemDetails;
          title = problem.title || error.statusText || title;
          traceId =
            problem.traceId ||
            (problem.extensions?.['traceId'] as string | undefined);

          // Check if there is ASP.NET validation "errors" dictionary
          if (problem.errors && typeof problem.errors === 'object') {
            const errorList: string[] = [];
            for (const [field, messages] of Object.entries(problem.errors)) {
              if (Array.isArray(messages)) {
                for (const msg of messages) {
                  errorList.push(`${field}: ${msg}`);
                }
              } else if (typeof messages === 'string') {
                errorList.push(`${field}: ${messages}`);
              }
            }

            if (errorList.length > 0) {
              const maxDisplay = 5;
              const displayed = errorList.slice(0, maxDisplay);
              let formatted = displayed.join('\n');
              if (errorList.length > maxDisplay) {
                formatted += `\nand ${errorList.length - maxDisplay} more`;
              }
              detail = formatted;
            } else if (problem.detail) {
              detail = problem.detail;
            }
          } else if (problem.detail) {
            detail = problem.detail;
          }
        } else if (typeof error.error === 'string' && error.error.trim()) {
          detail = error.error;
        }

        // 401 handling:
        // Run the logout and redirect flow only when a request that carried a token gets 401.
        // Never for POST auth/login or POST auth/change-password; show the API message instead.
        if (error.status === 401) {
          const hadToken = req.headers.has('Authorization');
          const isLogin = req.url.includes('auth/login') && req.method === 'POST';
          const isChangePassword =
            req.url.includes('auth/change-password') && req.method === 'POST';

          if (hadToken && !isLogin && !isChangePassword) {
            authService.logout(router.url);
            notificationService.showWarning(
              'Session Expired',
              'Please sign in again to continue.',
            );
            return throwError(() => error);
          }
        }

        // 403 rule: "You do not have permission"
        if (error.status === 403) {
          title = 'Access Restricted';
          detail = 'You do not have permission';
        } else if (error.status === 0) {
          title = 'Network Connection Error';
          detail =
            'Could not connect to the API server. Please verify the backend is running.';
        }

        notificationService.showError(title, detail, traceId);
      }

      return throwError(() => error);
    }),
  );
};
