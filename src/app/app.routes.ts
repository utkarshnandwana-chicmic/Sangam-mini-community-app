import { Routes } from '@angular/router';
import { MainLayout } from './layout/main-layout/main-layout';
import { authGuard } from './core/guards/auth-guard-guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () =>
      import('./features/auth/login/login').then((m) => m.LoginComponent),
  },
  {
    path: 'register',
    loadComponent: () =>
      import('./features/auth/register/register').then((m) => m.RegisterComponent),
  },
  {
    path: 'forgot-password',
    loadComponent: () =>
      import('./features/auth/forgot-password/forgot-password/forgot-password')
        .then((m) => m.ForgotPasswordComponent),
  },
  {
    path: '',
    component: MainLayout,
    canMatch: [authGuard],   // 🔥 safer than canActivate
    children: [
      {
        path: 'home',
        loadComponent: () =>
          import('./features/home/home/home').then((m) => m.Home),
      },
      {
        path: 'profile',
        loadChildren: () =>
          import('./features/profile/profile.routes')
            .then((m) => m.PROFILE_ROUTES),
      },
      {
        path: 'search',
        loadComponent: () =>
          import('./features/search/search/search')
            .then((m) => m.SearchComponent),
      },
      {
        path: 'chat',
        loadComponent: () =>
          import('./features/chat/chat/chat')
            .then((m) => m.Chat),
      },
      {
        path: 'settings',
        loadComponent: () =>
          import('./features/settings/settings/settings')
            .then((m) => m.Settings),
      },
      {
        path: 'posts/create',
        loadComponent: () =>
          import('./features/profile/pages/add-post-route/add-post-route')
            .then((m) => m.AddPostRouteComponent),
      },
      {
        path: '',
        redirectTo: 'home',
        pathMatch: 'full',
      },
    ],
  },
  {
    path: '**',
    redirectTo: '',   // 🔥 redirect to layout root instead of login
  },
];
