import { Component, inject, OnInit, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { GlobalSpinnerComponent } from './shared/ui/global-spinner.component';
import { GlobalToastComponent } from './shared/ui/global-toast.component';
import { GlobalConfirmDialogComponent } from './shared/ui/global-confirm-dialog.component';
import { SocketService } from './core/services/socket';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, GlobalSpinnerComponent, GlobalToastComponent, GlobalConfirmDialogComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App implements OnInit {
    private socket = inject(SocketService);

  ngOnInit() {

    const token = localStorage.getItem('token');

    if (token) {
      this.socket.connect();
    }

  }
}
