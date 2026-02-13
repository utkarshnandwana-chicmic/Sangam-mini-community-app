import { Component, ChangeDetectorRef } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../core/services/auth';
import { PhoneStepComponent } from '../registration/phone-step/phone-step';
import { OtpStepComponent } from '../registration/otp-step/otp-step';
import { ProfileStepComponent } from '../registration/profile-step/profile-step';
import { Router } from '@angular/router';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    PhoneStepComponent,
    OtpStepComponent,
    ProfileStepComponent,
  ],
  templateUrl: './register.html',
  styleUrl: './register.scss',
})
export class RegisterComponent {
  currentStep = 1;
  isLoading = false;
  errorMessage = '';
  successMessage = '';
  phoneVerificationToken: string = '';

  phoneForm!: FormGroup;
  otpForm!: FormGroup;
  profileForm!: FormGroup;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private cdr: ChangeDetectorRef,
    private router: Router
  ) {
    this.initializeForms();
  }

  // --- UI ONLY HELPERS ---

  /**
   * Provides labels for the dynamic progress bar in the UI
   */
  getStepLabel(): string {
    const stepLabels: { [key: number]: string } = {
      1: 'Mobile Number',
      2: 'Security Check',
      3: 'Finalize Profile',
      4: 'Success'
    };
    return stepLabels[this.currentStep] || '';
  }

  /**
   * Clears alerts to keep the UI clean when users re-try
   */
  clearAlerts() {
    this.errorMessage = '';
    this.successMessage = '';
  }

  // --- EXISTING BUSINESS LOGIC (UNTOUCHED) ---

  initializeForms() {
    this.phoneForm = this.fb.group({
      countryCode: ['+91', Validators.required],
      phone: ['', [Validators.required, Validators.pattern(/^[0-9]{6,15}$/)]],
    });

    this.otpForm = this.fb.group({
      otp: ['', [Validators.required]],
    });

    this.profileForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: [
        '',
        [
          Validators.required,
          Validators.pattern('^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[^A-Za-z0-9]).{8,}$'),
        ],
      ],
      name: ['', [Validators.required]],
      dob: ['', [Validators.required]],
      gender: [1],
    });
  }

  sendPhone() {
    if (this.phoneForm.invalid) return;
    this.clearAlerts(); // UI Polish
    this.isLoading = true;

    const { phone, countryCode } = this.phoneForm.value;
    this.authService.registerPhone(phone, countryCode).subscribe({
      next: (res) => {
        if (res?.data?.phoneVerificationToken) {
          this.phoneVerificationToken = res.data.phoneVerificationToken;
          this.successMessage = res.message || 'OTP sent successfully';
          this.currentStep = 2;
          this.cdr.detectChanges();
        }
        this.isLoading = false;
      },
      error: (err) => {
        this.isLoading = false;
        this.errorMessage = err.error?.message || 'Failed to send OTP';
      },
    });
  }

  verifyOtp() {
    if (this.otpForm.invalid) return;
    this.clearAlerts(); // UI Polish
    this.isLoading = true;

    this.authService
      .verifyOTP(this.phoneVerificationToken, this.otpForm.value.otp)
      .subscribe({
        next: (res: any) => {
          const jwtToken = res?.data?.token || res?.token;

          if (jwtToken) {
            localStorage.setItem("tempRegisterToken", jwtToken);
          }

          this.currentStep = 3;
          this.isLoading = false;
          this.cdr.detectChanges();
        },
        error: (err) => {
          this.isLoading = false;
          this.errorMessage = err?.error?.message || 'Invalid OTP';
        },
      });
  }

  completeRegistration() {
    if (this.profileForm.invalid) return;
    this.clearAlerts(); // UI Polish
    this.isLoading = true;

    const val = this.profileForm.value;
    const payload = {
      email: val.email.toLowerCase().trim(),
      name: val.name.trim(),
      dob: new Date(val.dob).toISOString(),
      password: val.password,
      gender: Number(val.gender),
      latestUpdates: false,
      languagePreference: 1,
      userName: (val.name.replace(/\s/g, '') + Date.now()).substring(0, 15)
    };

    this.authService.completeRegister(payload).subscribe({
      next: () => {
        this.isLoading = false;
        this.successMessage = 'Registration successful!'; // UI feedback
        this.currentStep = 4; // Move to success step UI
        
        // Slight delay for smooth UI transition
        setTimeout(() => {
          this.router.navigate(['/home']);
        }, 1500);
      },
      error: (err) => {
        this.isLoading = false;
        this.errorMessage = err?.error?.message || "Registration failed";
      }
    });
  }
}