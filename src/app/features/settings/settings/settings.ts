import { Component } from '@angular/core';
import { UserSettingsService } from './../service/setting.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NoLeadingSpaceDirective } from '../../../core/directives/no-leading-space.directive';
import { GlobalConfirmDialogComponent } from '../../../shared/ui/global-confirm-dialog.component';

@Component({
  selector: 'app-settings',
  standalone:true,
  imports: [CommonModule, FormsModule, NoLeadingSpaceDirective, GlobalConfirmDialogComponent],
  templateUrl: './settings.html',
  styleUrl:'./settings.scss'
})
export class SettingsComponent {
  constructor(public userSettings: UserSettingsService) {}

  onOldPasswordChange(value: string) { this.userSettings.setOldPassword(value); }
  onNewPasswordChange(value: string) { this.userSettings.setNewPassword(value); }
  onConfirmPasswordChange(value: string) { this.userSettings.setConfirmPassword(value); }

  changePassword() { this.userSettings.changePassword(); }

  deleteAccount() {

      void this.userSettings.confirmDelete();

  }
}
