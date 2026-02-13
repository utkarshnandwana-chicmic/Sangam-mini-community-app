import { Component, Input, Output, EventEmitter } from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-otp-step',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './otp-step.html',
  styleUrl: './otp-step.scss'
})
export class OtpStepComponent {
  @Input() otpForm!: FormGroup;
  @Input() isLoading = false;
  @Output() onVerify = new EventEmitter<void>();
  @Output() onBack = new EventEmitter<void>(); // Added for the back button

  isInvalid(controlName: string): boolean {
    const control = this.otpForm.get(controlName);
    return !!(control && control.invalid && (control.dirty || control.touched));
  }
}