import { ChangeDetectionStrategy, Component } from '@angular/core';
import { MatSidenavModule } from '@angular/material/sidenav';
import { RouterOutlet } from '@angular/router';
import { Sidebar } from '../sidebar/sidebar';
import { Header } from '../header/header';
import { AddPostModalComponent } from '../../features/profile/pages/add-post-modal/add-post-modal';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-main-layout',
  imports: [RouterOutlet, MatSidenavModule, Sidebar, Header, AddPostModalComponent, CommonModule],
  templateUrl: './main-layout.html',
  styleUrl: './main-layout.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MainLayout {

isCreatePostOpen = false;

openCreatePost() {
  this.isCreatePostOpen = true;
}

closeCreatePost() {
  this.isCreatePostOpen = false;
}

}
