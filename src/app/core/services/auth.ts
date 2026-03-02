import { computed, inject, Injectable, signal } from '@angular/core';
import { catchError, of, tap } from 'rxjs';
import { ApiService } from './api';
import { API_ENDPOINTS } from '../../constants/api-endpoints';
import { RegisterRequest } from '../model/auth.model';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private api = inject(ApiService);
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
        }
      })
    );
  }

  logout() {
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
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload?.id ?? null;
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
