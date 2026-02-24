import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class LoadingService {

  private activeRequests = 0;

  private readonly _loading = new BehaviorSubject<boolean>(false);
  readonly loading$ = this._loading.asObservable();

  show(): void {
    this.activeRequests++;
    if (this.activeRequests === 1) {
      this._loading.next(true);
    }
  }

  hide(): void {
    if (this.activeRequests > 0) {
      this.activeRequests--;
    }

    if (this.activeRequests === 0) {
      this._loading.next(false);
    }
  }
}