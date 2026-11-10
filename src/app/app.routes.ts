import { Routes } from '@angular/router';
import { authGuard, customerGuard, loginGuard, permissionGuard } from './guards/auth.guard';
import { Cart } from './pages/cart/cart';
import { Checkout } from './pages/checkout/checkout';
import { Home } from './pages/home/home';
import { Account } from './pages/account/account';
import { ProductDetail } from './pages/product-detail/product-detail';
import { ProductList } from './pages/product-list/product-list';
import { Signin } from './pages/signin/signin';
import { Signup } from './pages/signup/signup';
import { Layout } from './dashboard/layout/layout';
import { Overview } from './dashboard/overview/overview';
import { Products } from './dashboard/products/products';
import { Orders } from './dashboard/orders/orders';
import { Employees } from './dashboard/employees/employees';
import { Customers } from './dashboard/customers/customers';
import { Settings } from './dashboard/settings/settings';

export const routes: Routes = [
  { path: '', component: Home, title: 'Hoa Tươi DL - Hoa tươi giá rẻ 24h' },
  { path: 'san-pham', component: ProductList, title: 'Sản phẩm' },
  { path: 'san-pham/:slug', component: ProductList, title: 'Danh mục hoa' },
  { path: 'product/:id', component: ProductDetail, title: 'Chi tiết sản phẩm' },
  { path: 'cart', component: Cart, title: 'Giỏ hàng', canActivate: [loginGuard] },
  { path: 'checkout', component: Checkout, title: 'Thanh toán', canActivate: [loginGuard] },
  { path: 'account', component: Account, title: 'Tài khoản', canActivate: [customerGuard] },
  { path: 'signin', component: Signin, title: 'Đăng nhập' },
  { path: 'signup', component: Signup, title: 'Đăng ký' },
  {
    path: 'dashboard',
    component: Layout,
    title: 'Dashboard',
    canActivate: [authGuard],
    children: [
      { path: '', component: Overview },
      { path: 'products', component: Products, title: 'Quản lý sản phẩm', canActivate: [permissionGuard('product.view')] },
      { path: 'orders', component: Orders, title: 'Quản lý đơn hàng', canActivate: [permissionGuard('order.view')] },
      { path: 'employees', component: Employees, title: 'Quản lý nhân viên', canActivate: [permissionGuard('employee.view')] },
      { path: 'customers', component: Customers, title: 'Quản lý khách hàng', canActivate: [permissionGuard('customer.view')] },
      { path: 'settings', component: Settings, title: 'Cấu hình hệ thống', canActivate: [permissionGuard('system.manage')] },
    ],
  },
  { path: '**', redirectTo: '' },
];
