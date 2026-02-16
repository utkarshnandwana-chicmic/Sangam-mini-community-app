import { Component, Input, Output, EventEmitter } from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-phone-step',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
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
}