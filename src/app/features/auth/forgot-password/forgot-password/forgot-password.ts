import { ChangeDetectionStrategy, ChangeDetectorRef, Component, DestroyRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { AuthService } from '../../../../core/services/auth';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { NoLeadingSpaceDirective } from '../../../../core/directives/no-leading-space.directive';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

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
    RouterLink,
    NoLeadingSpaceDirective,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule
  ],
  styleUrl: './forgot-password.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
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
  private destroyRef = inject(DestroyRef);
  private cdr = inject(ChangeDetectorRef);

  phoneForm = this.fb.group({
    phone: ['', [Validators.required, Validators.pattern(/^[0-9]{10}$/)]],
    countryCode: ['+91', Validators.required]
  });

  otpForm = this.fb.group({
    otp: ['', [Validators.required, Validators.pattern(/^[0-9]{6}$/)]]
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
    this.cdr.detectChanges();
  }

  onPhoneInput(event: Event): void {
    this.onInputChange();
    const input = event.target as HTMLInputElement;
    const digitsOnly = input.value.replace(/\D/g, '').slice(0, 10);
    if (input.value !== digitsOnly) {
      input.value = digitsOnly;
    }
    this.phoneForm.get('phone')?.setValue(digitsOnly, { emitEvent: false });
  }

  onOtpInput(event: Event): void {
    this.onInputChange();
    const input = event.target as HTMLInputElement;
    const digitsOnly = input.value.replace(/\D/g, '').slice(0, 6);
    if (input.value !== digitsOnly) {
      input.value = digitsOnly;
    }
    this.otpForm.get('otp')?.setValue(digitsOnly, { emitEvent: false });
  }

  sendOtp() {
    if (this.loading) return;
    this.submitted = true;
    this.errorMessage = '';
    
    if (this.phoneForm.invalid) {
      return;
    }

    const { phone, countryCode } = this.phoneForm.value;
    this.loading = true;
    this.cdr.detectChanges();

    this.authService.forgotPasswordPhone(phone!, countryCode!)
      .pipe(finalize(() => {
        this.loading = false;
        this.cdr.detectChanges();
      }), takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res: any) => {
          this.resetToken = res?.data?.resetToken;
          this.currentStep = 2;
          this.loading = false;
          this.submitted = false;
          this.cdr.detectChanges();
        },
        error: (err) => {
          this.loading = false;
          this.errorMessage = err?.error?.message || 'Failed to send OTP.';
          this.cdr.detectChanges();
        }
      });
  }

  verifyOtp() {
    if (this.loading) return;
    this.submitted = true;
    if (this.otpForm.invalid) {
      return;
    }

    this.errorMessage = '';
    this.loading = true;
    this.cdr.detectChanges();

    this.authService.verifyForgotPhoneOtp(this.resetToken, this.otpForm.value.otp!)
      .pipe(finalize(() => {
        this.loading = false;
        this.cdr.detectChanges();
      }), takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res: any) => {
          this.resetPasswordToken = res?.data?.resetPasswordToken;
          this.currentStep = 3;
          this.loading = false;
          this.submitted = false;
          this.cdr.detectChanges();
        },
        error: (err) => {
          this.loading = false;
          this.errorMessage = err?.error?.message || 'Invalid OTP.';
          this.cdr.detectChanges();
        }
      });
  }

  resetPassword() {
    if (this.loading) return;
    this.submitted = true;
    if (this.passwordForm.invalid) {
      return;
    }

    this.errorMessage = '';
    this.loading = true;
    this.cdr.detectChanges();

    this.authService.resetPhonePassword(this.resetPasswordToken, this.passwordForm.value.newPassword!)
      .pipe(finalize(() => {
        this.loading = false;
        this.cdr.detectChanges();
      }), takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => this.router.navigate(['/login']),
        error: (err) => {
          this.loading = false;
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
