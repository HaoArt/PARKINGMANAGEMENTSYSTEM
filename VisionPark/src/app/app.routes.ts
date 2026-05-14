import { Routes } from '@angular/router';
import { TestScanFaceComponent } from './pages/timekeeping/timekeeping.component';
import { roleGuard } from './role.guard';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'login',
    pathMatch: 'full',
  },
  {
    path: 'login',
    loadComponent: () =>
      import('./pages/login/login.page').then((m) => m.LoginPage),
  },

  {
    path: 'dashboard',
    loadComponent: () =>
      import('./pages/dashboard/dashboard.page').then((m) => m.DashboardPage),
    canActivate: [roleGuard],
    data: { roles: ['Admin', 'Security'] },
  },
  {
    path: 'history',
    loadComponent: () =>
      import('./pages/history/history.page').then((m) => m.HistoryPage),
    canActivate: [roleGuard],
    data: { roles: ['Admin', 'Security'] },
  },
  {
    path: 'settings',
    loadComponent: () =>
      import('./pages/settings/settings.page').then((m) => m.SettingsPage),
    canActivate: [roleGuard],
    data: { roles: ['Admin'] },
  },
  {
    path: 'ticket-parking',
    loadComponent: () =>
      import('./pages/ticket-parking/ticket-parking.page').then(
        (m) => m.TicketParkingPage,
      ),
    canActivate: [roleGuard],
    data: { roles: ['Admin', 'Security'] },
  },

  {
    path: 'users',
    loadComponent: () =>
      import('./pages/users/users.page').then((m) => m.UsersPage),
    canActivate: [roleGuard],
    data: { roles: ['Admin'] },
  },

  {
    path: 'card-registration',
    loadComponent: () =>
      import('./pages/card-registration/card-registration.page').then(
        (m) => m.CardRegistrationPage,
      ),
    canActivate: [roleGuard],
    data: { roles: ['Admin'] },
  },
  {
    path: 'timekeeping',
    component: TestScanFaceComponent,
    canActivate: [roleGuard],
    data: { roles: ['Admin', 'Security'] },
  },
];
