import { Injectable, computed, signal } from '@angular/core';
import { Router } from '@angular/router';
import { NON_SHOPPING_ROLES, ROLE_PERMISSIONS } from '../interfaces/permissions';
import { CurrentUser } from '../interfaces/user';
import { CustomerService } from './customer';
import { EmployeeService } from './employee';
import { PermissionService } from './permission';
import { StorageService } from './storage';

const SESSION_CHECK_MS = 5000;

@Injectable({ providedIn: 'root' })
export class Auth {
  user = signal<CurrentUser | null>(null);
  /** Khách chưa đăng nhập vẫn được xem nút mua; tài khoản chỉ quản trị thì không */
  canShop = computed(() => !NON_SHOPPING_ROLES.includes(this.user()?.role ?? ''));

  constructor(
    private storageService: StorageService,
    private employeeService: EmployeeService,
    private customerService: CustomerService,
    private permissionService: PermissionService,
    private router: Router
  ) {
    const saved = storageService.get<CurrentUser>('currentUser');
    this.user.set(
      saved && (saved.role as string) === 'owner'
        ? { ...saved, role: 'manager', permissions: ROLE_PERMISSIONS['manager'] }
        : saved
    );
  }

  /** Tìm trong users (admin, nhân viên) rồi tới customers */
  Signin(username: string, password: string): boolean {
    const found =
      this.employeeService.getUsers().find((u) => u.username === username && u.password === password) ||
      this.customerService.getCustomers().find((c) => c.username === username && c.password === password);
    if (!found) return false;
    if (found.islocked) {
      alert('Tài khoản của bạn đã bị khóa.');
      return false;
    }
    const currentUser: CurrentUser = {
      id: found.id,
      username: found.username,
      role: found.role ?? 'customer',
      permissions: 'permissions' in found ? found.permissions : [],
    };
    this.storageService.set('currentUser', currentUser);
    this.user.set(currentUser);
    return true;
  }

  /** Theo dõi tài khoản đang đăng nhập: bị khóa, bị xóa hoặc đổi vai trò thì có hiệu lực ngay */
  startSessionWatch(): void {
    this.validateSession();
    setInterval(() => {
      Promise.all([this.employeeService.reload(), this.customerService.reload()])
        .then(() => this.validateSession())
        .catch(() => {}); // mất kết nối tạm thời: giữ nguyên phiên
    }, SESSION_CHECK_MS);
  }

  private validateSession(): void {
    const current = this.user();
    const users = this.employeeService.getUsers();
    const customers = this.customerService.getCustomers();
    if (!current || (!users.length && !customers.length)) return;
    const account = current.role === 'customer' ? customers.find((c) => c.id === current.id) : users.find((u) => u.id === current.id);
    if (!account || account.islocked) {
      alert(account ? 'Tài khoản của bạn đã bị khóa.' : 'Tài khoản của bạn không còn tồn tại.');
      this.logout();
      return;
    }
    if (account.role !== current.role) {
      const updated = { ...current, role: account.role };
      this.storageService.set('currentUser', updated);
      this.user.set(updated);
      alert('Vai trò của bạn vừa được thay đổi.');
      this.router.navigate(['/dashboard']);
    }
  }

  logout(): void {
    this.storageService.remove('currentUser');
    this.user.set(null);
    this.router.navigate(['/signin']);
  }

  getCurrentUser(): CurrentUser | null {
    return this.user();
  }
  getCurrentUserRole(): string | null {
    return this.user()?.role ?? null;
  }
  isLoggedIn(): boolean {
    return this.user() !== null;
  }
  hasPermission(permission: string): boolean {
    // quyền tính từ vai trò, không tin danh sách permissions lưu trong localStorage
    const role = this.user()?.role;
    return !!role && this.permissionService.has(role, permission);
  }
}
