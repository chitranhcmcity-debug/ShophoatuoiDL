import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Auth } from '../services/auth';
import { CheckoutService } from '../services/checkout';

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

/** Hóa đơn: chủ đơn hàng hoặc người có quyền order.invoice */
export const invoiceGuard: CanActivateFn = (route) => {
  const authService = inject(Auth);
  const router = inject(Router);
  if (!authService.isLoggedIn()) {
    router.navigate(['/signin']);
    return false;
  }
  const order = inject(CheckoutService).orders().find((o) => o.id === route.paramMap.get('id'));
  if (order && (order.userId === authService.user()?.id || authService.hasPermission('order.invoice'))) return true;
  router.navigate([authService.hasPermission('dashboard.view') ? '/dashboard' : '']);
  return false;
};

/** Bảo vệ giỏ hàng, thanh toán, tài khoản: phải đăng nhập và là tài khoản được mua hàng */
export const shopperGuard: CanActivateFn = () => {
  const authService = inject(Auth);
  const router = inject(Router);
  if (!authService.isLoggedIn()) {
    router.navigate(['/signin']);
    return false;
  }
  if (!authService.canShop()) {
    router.navigate(['/dashboard']);
    return false;
  }
  return true;
};