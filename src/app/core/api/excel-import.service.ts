import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

export type ImportMode = 'CreateOnly' | 'Upsert';

export type ImportRowStatus =
  | 'New'
  | 'Exists'
  | 'Error'
  | 'Imported'
  | 'Updated'
  | 'Skipped';

export interface ImportRowResult {
  rowNumber: number;
  code: string;
  status: ImportRowStatus;
  message?: string | null;
}

export interface ImportResultDto {
  total: number;
  newCount: number;
  existsCount: number;
  errorCount: number;
  imported: number;
  updated: number;
  skipped: number;
  rows: ImportRowResult[];
}

export interface ImportWizardConfig {
  title: string;
  resourceName: string;
  templateUrl: string;
  importUrl: string;
  templateFileName: string;
}

@Injectable({
  providedIn: 'root',
})
export class ExcelImportService {
  private readonly http = inject(HttpClient);

  downloadTemplate(url: string, fileName: string): Observable<Blob> {
    return this.http.get(url, { responseType: 'blob' });
  }

  saveBlob(blob: Blob, fileName: string): void {
    const objectUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = objectUrl;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(objectUrl);
  }

  executeImport(
    url: string,
    file: File,
    mode: ImportMode,
    dryRun: boolean,
    skipInvalidRows: boolean,
  ): Observable<ImportResultDto> {
    const formData = new FormData();
    formData.append('file', file, file.name);
    formData.append('mode', mode);
    formData.append('dryRun', String(dryRun));
    formData.append('skipInvalidRows', String(skipInvalidRows));

    return this.http.post<ImportResultDto>(url, formData);
  }
}
