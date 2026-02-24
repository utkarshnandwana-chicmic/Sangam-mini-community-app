import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ConfirmDialogService } from '../../core/services/confirm-dialog';

@Component({
  selector: 'app-global-confirm-dialog',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="overlay" *ngIf="dialog() as data">
      <div class="dialog">
        <h3 *ngIf="data.title">{{ data.title }}</h3>
        <p>{{ data.message }}</p>

        <div class="actions">
          <button class="cancel" (click)="cancel()">
            {{ data.cancelText }}
          </button>
          <button class="confirm" (click)="confirm()">
            {{ data.confirmText }}
          </button>
        </div>
      </div>
    </div>
  `,
  styleUrls: ['./global-confirm-dialog.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class GlobalConfirmDialogComponent {

  private confirmService = inject(ConfirmDialogService);

  readonly dialog = this.confirmService.dialogState;

  confirm(): void {
    this.confirmService.confirmAction();
  }

  cancel(): void {
    this.confirmService.cancelAction();
  }
}