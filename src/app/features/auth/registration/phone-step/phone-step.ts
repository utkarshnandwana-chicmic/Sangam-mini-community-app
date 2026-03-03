import { Component, Input, Output, EventEmitter } from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { NoLeadingSpaceDirective } from '../../../../core/directives/no-leading-space.directive';

@Component({
  selector: 'app-phone-step',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, NoLeadingSpaceDirective],
  templateUrl: './phone-step.html',
  styleUrl: './phone-step.scss'
})
export class PhoneStepComponent {
  @Input() phoneForm!: FormGroup;
  @Input() isLoading = false;
  @Output() onNext = new EventEmitter<void>();

  isInvalid(controlName: string): boolean {
    const control = this.phoneForm.get(controlName);
return !!(
  control &&
  control.invalid &&
  (control.dirty || control.touched || control.hasError('apiError'))
);
  }

  onPhoneInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const digitsOnly = input.value.replace(/\D/g, '').slice(0, 10);
    if (input.value !== digitsOnly) {
      input.value = digitsOnly;
    }
    this.phoneForm.get('phone')?.setValue(digitsOnly, { emitEvent: false });
  }
}
