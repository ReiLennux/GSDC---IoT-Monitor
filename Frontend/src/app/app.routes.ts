import { Routes } from '@angular/router';
import { authGuard } from './core/auth-guard';
import { MainLayout } from './features/main-layout/main-layout';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./features/auth/login/login').then(m => m.Login)
  },
  {
    path: '',
    component: MainLayout,
    canActivate: [authGuard],
    children: [
      {
        path: 'dashboard',
        loadComponent: () => import('./features/dashboard/overview/overview').then(m => m.Overview)
      },
      {
        path: 'devices',
        loadComponent: () => import('./features/devices/device-list/device-list').then(m => m.DeviceList)
      },
      {
        path: 'devices/:id',
        loadComponent: () => import('./features/devices/device-detail/device-detail').then(m => m.DeviceDetailComponent)
      },
      {
        path: 'alerts',
        loadComponent: () => import('./features/alerts/alert-list/alert-list').then(m => m.AlertListComponent)
      },
      {
        path: 'analytics',
        loadComponent: () => import('./features/dashboard/analytics/analytics').then(m => m.Analytics)
      },
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' }
    ]
  },
  { path: '**', redirectTo: 'login' }
];
