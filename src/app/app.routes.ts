import { Routes } from '@angular/router';
import { MainLayout } from './layout/main-layout/main-layout';
import { authGuard } from './core/guards/auth-guard-guard';

export const routes: Routes = [
  { path: 'login', loadComponent: () => import('./features/auth/login/login').then((m) => m.LoginComponent) },
  {
  path: 'register',
  loadComponent: () =>
    import('./features/auth/register/register')
      .then((m) => m.RegisterComponent)
},
  {
    path: '',
    component: MainLayout,
    canActivate: [authGuard],
    children: [
      {
        path: 'home',
        loadComponent: () => import('./features/home/home/home').then((m) => m.Home),
      },
      {
        path: 'profile',
        loadComponent: () => import('./features/profile/profile/profile').then((m) => m.Profile),
      },
      {
        path: 'search',
        loadComponent: () => import('./features/search/search/search').then((m) => m.Search),
      },
      {
        path: 'chat',
        loadComponent: () => import('./features/chat/chat/chat').then((m) => m.Chat),
      },
      {
        path: 'settings',
        loadComponent: () =>
          import('./features/settings/settings/settings').then((m) => m.Settings),
      },
      {
        path: '',
        redirectTo: 'home',
        pathMatch: 'full',
      },
    ],
  },
  {
    path: '**', redirectTo: 'home'
  }
];
