import { computed, inject, Injectable, signal } from '@angular/core';
import { catchError, of, tap } from 'rxjs';
import { ApiService } from './api';
import { API_ENDPOINTS } from '../../constants/api-endpoints';
import { RegisterRequest } from '../model/auth.model';
import { SocketService } from './socket';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private api = inject(ApiService);
  private socket = inject(SocketService);
  private tokenSignal = signal<string | null>(localStorage.getItem('token'));
  readonly isLoggedInSignal = computed(() => !!this.tokenSignal());

  login(email: string, password: string) {
    const payload = {
      deviceToken: '',
      languagePreference: 1,
      type: 1,
      email,
      password
    };

    return this.api.post<any>(
      API_ENDPOINTS.AUTH.LOGIN,
      payload
    ).pipe(
      tap((res) => {
        const token = res?.data?.token || res?.token;
        if (token) {
          localStorage.setItem('token', token);
          this.tokenSignal.set(token);
          this.socket.connect();
        }
      })
    );
  }

  logout() {
    this.socket.disconnect();
    localStorage.removeItem('token');
    this.tokenSignal.set(null);

    return this.api.post<void>(
      API_ENDPOINTS.AUTH.LOGOUT,
      {}
    ).pipe(
      catchError(() => of(null))
    );
  }

  isLoggedIn(): boolean {
    return this.isLoggedInSignal();
  }

  registerPhone(phone: string, countryCode: string) {
    const payload = {
      phone,
      countryCode,
      languagePreference: 1
    };

    return this.api.post<any>(
      API_ENDPOINTS.AUTH.REGISTER_PHONE,
      payload
    );
  }

  verifyOTP(phoneVerificationToken: string, otp: string) {
    const payload = {
      phoneVerificationToken,
      otp,
      languagePreference: 1
    };

    return this.api.post<any>(
      API_ENDPOINTS.AUTH.VERIFY_PHONE,
      payload
    );
  }

  completeRegister(payload: RegisterRequest) {
    return this.api.post<any>(
      API_ENDPOINTS.AUTH.REGISTER,
      payload
    ).pipe(
      tap((res) => {
        const finalToken = res?.data?.token || res?.token;
        if (finalToken) {
          localStorage.setItem('token', finalToken);
          this.tokenSignal.set(finalToken);
          localStorage.removeItem('tempRegisterToken');
          this.socket.connect();
        }
      })
    );
  }

  forgotPasswordPhone(phone: string, countryCode: string) {
    const payload = {
      phone,
      countryCode,
      languagePreference: 1
    };

    return this.api.post<any>(
      API_ENDPOINTS.AUTH.FORGOT_PASSWORD_PHONE,
      payload
    );
  }

  verifyForgotPhoneOtp(resetToken: string, otp: string) {
    const payload = {
      resetToken,
      otp,
      languagePreference: 1
    };

    return this.api.post<any>(
      API_ENDPOINTS.AUTH.FORGOT_PASSWORD_PHONE_VERIFY,
      payload
    );
  }

  resetPhonePassword(resetPasswordToken: string, newPassword: string) {
    const payload = {
      resetPasswordToken,
      newPassword,
      languagePreference: 1
    };

    return this.api.post<any>(
      API_ENDPOINTS.AUTH.RESET_PASSWORD_PHONE,
      payload
    );
  }

  getUserId(): string | null {
    const token = localStorage.getItem('token');
    if (!token) return null;

    try {
      const payloadSegment = token.split('.')[1];
      if (!payloadSegment) return null;

      const base64 = payloadSegment.replace(/-/g, '+').replace(/_/g, '/');
      const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=');
      const payload = JSON.parse(atob(padded));

      return payload?.id ?? payload?._id ?? payload?.userId ?? payload?.sub ?? null;
    } catch {
      return null;
    }
  }

  checkUsername(username: string) {
    return this.api.post<any>(
      API_ENDPOINTS.AUTH.CHECK_USERNAME,
      {
        username,
        languagePreference: 1
      }
    );
  }
}
