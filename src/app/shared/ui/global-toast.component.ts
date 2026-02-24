import {
  Component,
  inject,
  ChangeDetectionStrategy,
  signal,
  effect,
  DestroyRef
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToastService, ToastMessage } from '../../core/services/toast';
import { toSignal } from '@angular/core/rxjs-interop';

@Component({
  selector: 'app-global-toast',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="toast-container">
      <div
        class="toast"
        *ngFor="let toast of toasts()"
        [class.success]="toast.type === 'success'"
        [class.error]="toast.type === 'error'"
        [class.info]="toast.type === 'info'"
      >
        {{ toast.message }}
      </div>
    </div>
  `,
  styleUrls: ['./global-toast.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class GlobalToastComponent {

  private toastService = inject(ToastService);
  private destroyRef = inject(DestroyRef);

  readonly toasts = signal<ToastMessage[]>([]);
  readonly toastSignal = toSignal(this.toastService.toast$, { initialValue: null });

  constructor() {
    effect(() => {
      const toast = this.toastSignal();
      if (!toast) return;

      this.toasts.update(list => [...list, toast]);

      const timeoutId = setTimeout(() => {
        this.toasts.update(list =>
          list.filter(t => t.id !== toast.id)
        );
      }, toast.duration ?? 3000);

      this.destroyRef.onDestroy(() => clearTimeout(timeoutId));
    });
  }
}