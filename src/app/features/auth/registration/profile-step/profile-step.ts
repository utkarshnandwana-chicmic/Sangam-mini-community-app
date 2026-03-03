import { Component, Input, Output, EventEmitter } from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { NoLeadingSpaceDirective } from '../../../../core/directives/no-leading-space.directive';

@Component({
  selector: 'app-profile-step',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, NoLeadingSpaceDirective],
  templateUrl: './profile-step.html',
  styleUrl: './profile-step.scss'
})
export class ProfileStepComponent {
  @Input() profileForm!: FormGroup;
  @Input() isLoading = false;

  @Output() onSubmit = new EventEmitter<void>();


  isInvalid(controlName: string): boolean {
    const control = this.profileForm.get(controlName);
    return !!(
      control &&
      control.invalid &&
      (control.dirty || control.touched || control.hasError('apiError'))
    );
  }

  get isUsernameChecking(): boolean {
    return this.profileForm.get('userName')?.pending ?? false;
  }



}
