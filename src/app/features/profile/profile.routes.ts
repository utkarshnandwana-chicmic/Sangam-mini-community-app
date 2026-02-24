import { Routes } from '@angular/router';

export const PROFILE_ROUTES: Routes = [

  {
    path: '',
    loadComponent: () =>
      import('./pages/profile-page/profile-page')
        .then(m => m.ProfilePageComponent)
  },

  {
    path: 'edit',
    loadComponent: () =>
      import('./edit-profile/edit-profile.container')
        .then(m => m.EditProfileContainer)
  },

  {
    path: ':id',
    loadComponent: () =>
      import('./pages/profile-page/profile-page')
        .then(m => m.ProfilePageComponent),
    runGuardsAndResolvers: 'paramsChange'
  }

];