import { Injectable, signal } from '@angular/core';

export interface ConfirmDialogData {
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
}

@Injectable({ providedIn: 'root' })
export class ConfirmDialogService {

  private resolver?: (value: boolean) => void;

  readonly dialogState = signal<ConfirmDialogData | null>(null);

  confirm(data: ConfirmDialogData): Promise<boolean> {
    this.dialogState.set({
      title: data.title ?? 'Confirm',
      message: data.message,
      confirmText: data.confirmText ?? 'Confirm',
      cancelText: data.cancelText ?? 'Cancel'
    });

    return new Promise<boolean>((resolve) => {
      this.resolver = resolve;
    });
  }

  confirmAction(): void {
    this.dialogState.set(null);
    this.resolver?.(true);
  }

  cancelAction(): void {
    this.dialogState.set(null);
    this.resolver?.(false);
  }
}