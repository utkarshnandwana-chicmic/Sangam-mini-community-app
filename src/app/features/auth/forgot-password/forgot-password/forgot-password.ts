import { ChangeDetectorRef, Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { finalize } from 'rxjs';
import { AuthService } from '../../../../core/services/auth';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';

enum Step {
  PHONE = 1,
  OTP = 2,
  RESET = 3
}

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  templateUrl: './forgot-password.html',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule
  ],
  styleUrl: './forgot-password.scss'
})
export class ForgotPasswordComponent {

  Step = Step;
  currentStep = Step.PHONE;

  loading = false;

  resetToken = '';
  resetPasswordToken = '';
  errorMessage = '';
  hidePassword = true;
  submitted = false;



  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);

  phoneForm = this.fb.group({
    phone: ['', [Validators.required, Validators.minLength(10)]],
    countryCode: ['+91', Validators.required]
  });

  otpForm = this.fb.group({
    otp: ['', [Validators.required, Validators.minLength(6)]]
  });

  passwordForm = this.fb.group({
    newPassword: ['', [
      Validators.required,
      Validators.pattern(/^(?=.*[A-Z])(?=.*\d).{8,}$/)
    ]]
  });

onInputChange() {
    this.submitted = false;
    this.errorMessage = '';
    this.cdr.detectChanges(); // Force UI to hide errors immediately
  }

  sendOtp() {
    this.submitted = true;
    this.errorMessage = '';
    
    if (this.phoneForm.invalid) {
      this.cdr.detectChanges(); // Force UI to show "invalid" states
      return;
    }

    const { phone, countryCode } = this.phoneForm.value;
    this.loading = true;

    this.authService.forgotPasswordPhone(phone!, countryCode!)
      .pipe(finalize(() => {
        this.loading = false;
        this.cdr.detectChanges();
      }))
      .subscribe({
        next: (res: any) => {
          this.resetToken = res?.data?.resetToken;
          this.currentStep = 2;
          this.submitted = false;
          this.cdr.detectChanges();
        },
        error: (err) => {
          this.errorMessage = err?.error?.message || 'Failed to send OTP.';
          this.cdr.detectChanges(); // Ensure the toast appears
        }
      });
  }

  verifyOtp() {
    this.submitted = true;
    if (this.otpForm.invalid) {
      this.cdr.detectChanges();
      return;
    }

    this.errorMessage = '';
    this.loading = true;

    this.authService.verifyForgotPhoneOtp(this.resetToken, this.otpForm.value.otp!)
      .pipe(finalize(() => {
        this.loading = false;
        this.cdr.detectChanges();
      }))
      .subscribe({
        next: (res: any) => {
          this.resetPasswordToken = res?.data?.resetPasswordToken;
          this.currentStep = 3;
          this.submitted = false;
          this.cdr.detectChanges();
        },
        error: (err) => {
          this.errorMessage = err?.error?.message || 'Invalid OTP.';
          this.cdr.detectChanges();
        }
      });
  }

  resetPassword() {
    this.submitted = true;
    if (this.passwordForm.invalid) {
      this.cdr.detectChanges();
      return;
    }

    this.errorMessage = '';
    this.loading = true;

    this.authService.resetPhonePassword(this.resetPasswordToken, this.passwordForm.value.newPassword!)
      .pipe(finalize(() => {
        this.loading = false;
        this.cdr.detectChanges();
      }))
      .subscribe({
        next: () => this.router.navigate(['/auth']),
        error: (err) => {
          this.errorMessage = err?.error?.message || 'Password reset failed.';
          this.cdr.detectChanges();
        }
      });
  }

getStepTitle(): string {
  switch (this.currentStep) {
    case Step.PHONE: return 'Find Your Account';
    case Step.OTP: return 'Security Code';
    case Step.RESET: return 'New Password';
    default: return 'Reset Password';
  }
}

getStepSubtitle(): string {
  switch (this.currentStep) {
    case Step.PHONE: return 'Enter your phone number to find your account.';
    case Step.OTP: return 'Enter the 6-digit code we sent to your device.';
    case Step.RESET: return 'Create a strong, unique password for security.';
    default: return '';
  }
}

}
