import { inject, Injectable } from '@angular/core';
import { tap } from 'rxjs';
import { ApiService } from './api';
import { API_ENDPOINTS } from '../../constants/api-endpoints';
import { RegisterRequest } from '../model/auth.model';


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

logout() {
  return this.api.post<any>(
    API_ENDPOINTS.AUTH.LOGOUT,
    {}
  ).pipe(
    tap({
      next: () => localStorage.removeItem('token'),
      error: () => localStorage.removeItem('token')
    })
  );
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

  completeRegister(payload: RegisterRequest) {

    return this.api.post<any>(
      API_ENDPOINTS.AUTH.REGISTER,
      payload
    ).pipe(
      tap((res) => {

        const finalToken = res?.data?.token;

        if (finalToken) {
          localStorage.setItem('token', finalToken);
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
