import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { GlobalSpinnerComponent } from './shared/ui/global-spinner.component';
import { GlobalToastComponent } from './shared/ui/global-toast.component';
import { GlobalConfirmDialogComponent } from './shared/ui/global-confirm-dialog.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, GlobalSpinnerComponent, GlobalToastComponent, GlobalConfirmDialogComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
}
