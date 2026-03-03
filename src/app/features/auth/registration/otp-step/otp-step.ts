import { Component, Input, Output, EventEmitter } from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { NoLeadingSpaceDirective } from '../../../../core/directives/no-leading-space.directive';

@Component({
  selector: 'app-otp-step',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, NoLeadingSpaceDirective],
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

  onOtpInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const digitsOnly = input.value.replace(/\D/g, '').slice(0, 6);
    if (input.value !== digitsOnly) {
      input.value = digitsOnly;
    }
    this.otpForm.get('otp')?.setValue(digitsOnly, { emitEvent: false });
  }
}
