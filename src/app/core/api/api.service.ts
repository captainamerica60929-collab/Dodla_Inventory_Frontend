import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export type QueryParamValue = string | number | boolean | null | undefined;
export type QueryParamsRecord = Record<string, QueryParamValue | QueryParamValue[]>;

@Injectable({
  providedIn: 'root',
})
export class ApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl;

  get<T>(path: string, params?: QueryParamsRecord): Observable<T> {
    const httpParams = this.buildParams(params);
    return this.http.get<T>(this.buildUrl(path), { params: httpParams });
  }

  post<T>(path: string, body?: unknown, params?: QueryParamsRecord): Observable<T> {
    const httpParams = this.buildParams(params);
    return this.http.post<T>(this.buildUrl(path), body, { params: httpParams });
  }

  put<T>(path: string, body?: unknown, params?: QueryParamsRecord): Observable<T> {
    const httpParams = this.buildParams(params);
    return this.http.put<T>(this.buildUrl(path), body, { params: httpParams });
  }

  delete<T>(path: string, params?: QueryParamsRecord): Observable<T> {
    const httpParams = this.buildParams(params);
    return this.http.delete<T>(this.buildUrl(path), { params: httpParams });
  }

  buildUrl(path: string): string {
    const cleanBase = (this.baseUrl || '').replace(/\/+$/, '');
    let cleanPath = path.replace(/^\/+/, '');

    // Strip duplicate 'api/' if base already includes 'api'
    if ((cleanBase === '/api' || cleanBase === 'api' || cleanBase.endsWith('/api')) && cleanPath.startsWith('api/')) {
      cleanPath = cleanPath.slice(4);
    }

    const combined = cleanBase ? `${cleanBase}/${cleanPath}` : `/${cleanPath}`;
    // Final safety check: never allow /api/api
    return combined.replace(/\/api\/api\//g, '/api/').replace(/\/api\/api$/g, '/api');
  }

  private buildParams(params?: QueryParamsRecord): HttpParams {
    let httpParams = new HttpParams();
    if (!params) return httpParams;

    for (const [key, value] of Object.entries(params)) {
      if (value === null || value === undefined || value === '') {
        continue;
      }
      if (Array.isArray(value)) {
        for (const item of value) {
          if (item !== null && item !== undefined && item !== '') {
            httpParams = httpParams.append(key, String(item));
          }
        }
      } else {
        httpParams = httpParams.set(key, String(value));
      }
    }
    return httpParams;
  }
}
