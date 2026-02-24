import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

export type ToastType = 'success' | 'error' | 'info';

export interface ToastMessage {
  id: number;
  type: ToastType;
  message: string;
  duration?: number;
}

@Injectable({ providedIn: 'root' })
export class ToastService {

  private counter = 0;
  private readonly _toast$ = new Subject<ToastMessage>();
  readonly toast$ = this._toast$.asObservable();

  show(type: ToastType, message: string, duration: number = 3000): void {
    this._toast$.next({
      id: ++this.counter,
      type,
      message,
      duration
    });
  }

  success(message: string, duration?: number) {
    this.show('success', message, duration);
  }

  error(message: string, duration?: number) {
    this.show('error', message, duration);
  }

  info(message: string, duration?: number) {
    this.show('info', message, duration);
  }
}