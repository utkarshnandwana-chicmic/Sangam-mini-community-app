import { inject, Injectable } from '@angular/core';
import { tap } from 'rxjs';
import { ApiService } from './api';
import { API_ENDPOINTS } from '../../constants/api-endpoints';


@Injectable({
  providedIn: 'root',
})
export class AuthService {

  private api = inject(ApiService);

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
        console.log('Login Response:', res);

        const token = res?.data?.token || res?.token;

        if (token) {
          localStorage.setItem('token', token);
        }
      })
    );
  }

  logout(): void {
    localStorage.removeItem('token');
  }

  isLoggedIn(): boolean {
    return !!localStorage.getItem('token');
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

  completeRegister(payload: any) {

    return this.api.post<any>(
      API_ENDPOINTS.AUTH.REGISTER,
      payload
    ).pipe(
      tap((res) => {
        console.log('REGISTER RESPONSE:', res);

        const finalToken = res?.data?.token;

        if (finalToken) {
          localStorage.setItem('token', finalToken);
          localStorage.removeItem('tempRegisterToken');
        }
      })
    );
  }
}
