import { Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';
import { ROLE_PERMISSIONS } from '../interfaces/permissions';
import { CurrentUser } from '../interfaces/user';
import { CustomerService } from './customer';
import { EmployeeService } from './employee';
import { PermissionService } from './permission';
import { StorageService } from './storage';

@Injectable({ providedIn: 'root' })
export class Auth {
  user = signal<CurrentUser | null>(null);

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
