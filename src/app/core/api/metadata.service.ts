import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';

@Injectable({
  providedIn: 'root',
})
export class MetadataService {
  private readonly api = inject(ApiService);

  getTargetColumns(): Observable<string[]> {
    return this.api.get<string[]>('meta/target-columns');
  }
}
