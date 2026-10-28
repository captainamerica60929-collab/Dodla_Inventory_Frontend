import { ComponentType } from '@angular/cdk/portal';
import { Dialog, DialogConfig, DialogRef } from '@angular/cdk/dialog';
import { Injectable, TemplateRef, inject } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class ModalService {
  private readonly dialog = inject(Dialog);

  open<R = unknown, D = unknown, T = unknown>(
    componentOrTemplateRef: ComponentType<T> | TemplateRef<T>,
    config?: DialogConfig<D, DialogRef<R, T>>,
  ): DialogRef<R, T> {
    return this.dialog.open<R, D, T>(componentOrTemplateRef, {
      backdropClass: 'cdk-overlay-dark-backdrop',
      panelClass: 'waretrack-dialog-panel',
      hasBackdrop: true,
      disableClose: false,
      ...config,
    });
  }

  closeAll(): void {
    this.dialog.closeAll();
  }
}
