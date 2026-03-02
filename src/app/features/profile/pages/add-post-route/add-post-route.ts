import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Location } from '@angular/common';
import { Router } from '@angular/router';
import { AddPostModalComponent } from '../add-post-modal/add-post-modal';

@Component({
  selector: 'app-add-post-route',
  standalone: true,
  imports: [AddPostModalComponent],
  template: `
    <app-add-post-modal
      (close)="onClose()"
      (postCreated)="onCreated()">
    </app-add-post-modal>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AddPostRouteComponent {
  private location = inject(Location);
  private router = inject(Router);

  onClose(): void {
    this.navigateBackOrHome();
  }

  onCreated(): void {
    this.navigateBackOrHome();
  }

  private navigateBackOrHome(): void {
    if (window.history.length > 1) {
      this.location.back();
      return;
    }
    this.router.navigateByUrl('/home');
  }
}
