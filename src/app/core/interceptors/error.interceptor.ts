import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
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

          // Check if there are ASP.NET validation "errors" dictionary
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

        // Targeted 403 rule
        if (error.status === 403) {
          const url = req.url.toLowerCase();
          const isDevRestrictedEndpoint =
            url.includes('/test') ||
            url.includes('/preview-mapping') ||
            url.includes('/fetch');

          title = 'Access Restricted';
          if (isDevRestrictedEndpoint) {
            detail =
              'Test and fetch are available only in Development until login is built';
          } else {
            detail = 'You do not have permission';
          }
        } else if (error.status === 0) {
          title = 'Network Connection Error';
          detail = 'Could not connect to the API server. Please verify the backend is running.';
        }

        notificationService.showError(title, detail, traceId);
      }

      return throwError(() => error);
    }),
  );
};
