import { Injectable, signal } from '@angular/core';
import { ASSIGNABLE_PERMISSIONS, EDITABLE_ROLES, ROLE_LABELS, ROLE_PERMISSIONS } from '../interfaces/permissions';
import { StorageService } from './storage';

type Matrix = Record<string, string[]>;

/** Ma trận phân quyền: phần đã chỉnh lưu trên server, vai trò chưa chỉnh dùng mặc định trong ROLE_PERMISSIONS */
@Injectable({ providedIn: 'root' })
export class PermissionService {
  private key = 'rolePermissions';
  private overrides = signal<Matrix>({});

  constructor(private storageService: StorageService) {
    this.overrides.set(storageService.getOrCreate<Matrix>(this.key, {}));
    storageService.watch(this.key, () => this.overrides.set(storageService.get<Matrix>(this.key) ?? {}));
  }

  permissionsOf(role: string): string[] {
    const custom = EDITABLE_ROLES.includes(role) ? this.overrides()[role] : undefined;
    if (!custom) return ROLE_PERMISSIONS[role] ?? [];
    return ['dashboard.view', ...custom.filter((p) => ASSIGNABLE_PERMISSIONS.includes(p))];
  }

  has(role: string, permission: string): boolean {
    return this.permissionsOf(role).includes(permission);
  }

  /** Tên các vai trò nhân viên đang được giao một quyền */
  rolesWith(permission: string): string[] {
    return EDITABLE_ROLES.filter((r) => this.has(r, permission)).map((r) => ROLE_LABELS[r]);
  }

  save(matrix: Matrix) {
    const clean = Object.fromEntries(EDITABLE_ROLES.map((r) => [r, (matrix[r] ?? []).filter((p) => ASSIGNABLE_PERMISSIONS.includes(p))]));
    this.overrides.set(clean);
    this.storageService.set(this.key, clean);
  }

  reset() {
    this.overrides.set({});
    this.storageService.set(this.key, {});
  }
}
