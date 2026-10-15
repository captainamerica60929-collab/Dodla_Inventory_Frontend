import { Injectable, signal } from '@angular/core';

export interface ToastNotification {
  id: string;
  type: 'success' | 'error' | 'warning';
  title: string;
  message: string;
  traceId?: string;
  timestamp: number;
}

@Injectable({
  providedIn: 'root',
})
export class NotificationService {
  readonly toasts = signal<ToastNotification[]>([]);

  showSuccess(title: string, message: string, durationMs = 4000): void {
    this.addToast('success', title, message, undefined, durationMs);
  }

  showError(title: string, message: string, traceId?: string, durationMs = 7000): void {
    this.addToast('error', title, message, traceId, durationMs);
  }

  showWarning(title: string, message: string, durationMs = 5000): void {
    this.addToast('warning', title, message, undefined, durationMs);
  }

  dismiss(id: string): void {
    this.toasts.update((current) => current.filter((t) => t.id !== id));
  }

  private addToast(
    type: 'success' | 'error' | 'warning',
    title: string,
    message: string,
    traceId?: string,
    durationMs = 5000,
  ): void {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const toast: ToastNotification = {
      id,
      type,
      title,
      message,
      traceId,
      timestamp: Date.now(),
    };

    this.toasts.update((current) => [...current, toast]);

    if (durationMs > 0) {
      setTimeout(() => {
        this.dismiss(id);
      }, durationMs);
    }
  }
}
