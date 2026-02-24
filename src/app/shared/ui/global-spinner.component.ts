import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LoadingService } from '../../core/services/loading';

@Component({
  selector: 'app-global-spinner',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="overlay" *ngIf="loading$ | async">
      <div class="spinner"></div>
    </div>
  `,
  // styleUrls: ['./global-spinner.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class GlobalSpinnerComponent {

  private readonly loadingService: LoadingService = inject(LoadingService);

  readonly loading$ = this.loadingService.loading$;

}