import { Injectable } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class SocketService {

  private socket: Socket | null = null;

  connect() {
    const token =
      localStorage.getItem('token') ||
      localStorage.getItem('tempRegisterToken');

    if (!token) return;

    if (this.socket?.connected) return;

    this.socket = io(environment.apiUrl, {

      extraHeaders: {
        auth: token,
      }
    });

  }

emit(event: string, payload?: any) {
  this.socket?.emit(event, payload);

}

  listen(event: string, callback: (data: any) => void) {
    this.socket?.on(event, callback);
  }

  off(event: string, callback?: (data: any) => void) {
    if (!this.socket) return;

    if (callback) {
      this.socket.off(event, callback);
    } else {
      this.socket.off(event);
    }
  }

  disconnect() {
    this.socket?.disconnect();
    this.socket = null;
  }
}
