import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { ToastController } from '@ionic/angular/standalone';

export const roleGuard: CanActivateFn = async (route, state) => {
  const router = inject(Router);
  const toastCtrl = inject(ToastController);
  const userRole = localStorage.getItem('userRole'); // Đọc vai trò người dùng từ localStorage

  // Nếu chưa đăng nhập, đá về trang login
  if (!userRole) {
    router.navigate(['/login']);
    return false;
  }

  // Lấy danh sách các quyền được phép truy cập từ cấu hình route
  const expectedRoles = route.data?.['roles'] as Array<string>;

  // Nếu route không yêu cầu quyền hoặc user có quyền trong danh sách cho phép
  if (!expectedRoles || expectedRoles.includes(userRole)) {
    return true;
  }

  // Nếu không có quyền, thông báo và điều hướng về trang chủ
  const toast = await toastCtrl.create({
    message: 'Bạn không có quyền truy cập trang này!',
    duration: 3000,
    color: 'danger',
    position: 'top',
  });
  await toast.present();

  router.navigate(['/dashboard']);
  return false;
};
