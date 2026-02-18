import { Routes } from '@angular/router';

export const PROFILE_ROUTES: Routes = [

  // Profile Main Page
  {
    path: '',
    loadComponent: () =>
      import('./pages/profile-page/profile-page')
        .then(m => m.ProfilePageComponent)
  },

  // Edit Profile Page
  {
    path: 'edit',
    loadComponent: () =>
      import('./edit-profile/edit-profile.container')
        .then(m => m.EditProfileContainer)
  }

];
