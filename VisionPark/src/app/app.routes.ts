import { Routes } from '@angular/router';

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
  },
  {
    path: 'history',
    loadComponent: () =>
      import('./pages/history/history.page').then((m) => m.HistoryPage),
  },
  // {
  //   path: 'check-in', // Kiểm tra xem tên có khớp với '/dashboard' không
  //   loadComponent: () => import('./pages/check-in/check-in.page').then((m) => m.CheckInPage),
  // },
  {
    path: 'settings', // Kiểm tra xem tên có khớp với '/dashboard' không
    loadComponent: () =>
      import('./pages/settings/settings.page').then((m) => m.SettingsPage),
  },
  {
    path: 'ticket-parking',
    loadComponent: () =>
      import('./pages/ticket-parking/ticket-parking.page').then(
        (m) => m.TicketParkingPage,
      ),
  },

  {
    path: 'users',
    loadComponent: () => import('./pages/users/users.page').then( m => m.UsersPage)
  },

  {
    path: 'card-registration',
    loadComponent: () => import('./pages/card-registration/card-registration.page').then( m => m.CardRegistrationPage)
  },


];
