import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    title: 'Market tape',
    loadComponent: () => import('./dashboard/dashboard').then((module) => module.Dashboard),
  },
  {
    path: 'settings',
    title: 'Producer settings',
    loadComponent: () => import('./settings/settings').then((module) => module.Settings),
  },
  { path: '**', redirectTo: '' },
];
