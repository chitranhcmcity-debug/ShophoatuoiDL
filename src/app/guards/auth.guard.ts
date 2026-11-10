import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Auth } from '../services/auth';

/** Bảo vệ /dashboard: chỉ nhân viên nội bộ (có quyền dashboard.view) được vào, khách hàng thì không */
export const authGuard: CanActivateFn = () => {
  const authService = inject(Auth);
  const router = inject(Router);
  if (!authService.isLoggedIn()) {
    router.navigate(['/signin']);
    return false;
  }
  if (authService.getCurrentUserRole() === 'customer' || !authService.hasPermission('dashboard.view')) {
    router.navigate(['']);
    return false;
  }
  return true;
};

/** Bảo vệ từng trang con của dashboard theo quyền, ví dụ permissionGuard('product.view') */
export const permissionGuard =
  (permission: string): CanActivateFn =>
  () => {
    const authService = inject(Auth);
    const router = inject(Router);
    if (authService.hasPermission(permission)) return true;
    alert('Bạn không có quyền truy cập chức năng này.');
    router.navigate(['/dashboard']);
    return false;
  };

/** Bảo vệ giỏ hàng, thanh toán, tài khoản: phải đăng nhập */
export const loginGuard: CanActivateFn = () => {
  const authService = inject(Auth);
  const router = inject(Router);
  if (!authService.isLoggedIn()) {
    router.navigate(['/signin']);
    return false;
  }
  return true;
};

/** Trang tài khoản chỉ dành cho khách hàng; nhân viên dùng trang quản trị */
export const customerGuard: CanActivateFn = () => {
  const authService = inject(Auth);
  const router = inject(Router);
  if (!authService.isLoggedIn()) {
    router.navigate(['/signin']);
    return false;
  }
  if (authService.getCurrentUserRole() !== 'customer') {
    router.navigate(['/dashboard']);
    return false;
  }
  return true;
};
