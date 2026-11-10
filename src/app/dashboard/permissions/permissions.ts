import { Component, computed, inject, signal } from '@angular/core';
import { EDITABLE_ROLES, LOCKED_ROLES, PERMISSION_GROUPS, PERMISSION_REQUIRES, ROLE_LABELS } from '../../interfaces/permissions';
import { Auth } from '../../services/auth';
import { PermissionService } from '../../services/permission';

@Component({
  selector: 'app-permissions',
  templateUrl: './permissions.html',
})
export class Permissions {
  private permissionService = inject(PermissionService);
  private authService = inject(Auth);

  groups = PERMISSION_GROUPS;
  roles = [...LOCKED_ROLES, ...EDITABLE_ROLES];
  labels = ROLE_LABELS;
  canEdit = computed(() => this.authService.hasPermission('permission.manage'));
  draft = signal<Record<string, string[]>>(this.load());
  message = signal('');

  private load() {
    return Object.fromEntries(EDITABLE_ROLES.map((r) => [r, this.permissionService.permissionsOf(r)]));
  }

  isLocked(role: string): boolean {
    return LOCKED_ROLES.includes(role);
  }

  isOn(role: string, permission: string): boolean {
    return this.isLocked(role) ? this.permissionService.has(role, permission) : this.draft()[role].includes(permission);
  }

  toggle(role: string, permission: string, on: boolean) {
    if (!this.canEdit() || this.isLocked(role)) return;
    this.message.set('');
    this.draft.update((d) => {
      let list = d[role].filter((p) => p !== permission);
      if (on) {
        list = [...list, permission];
        const needed = PERMISSION_REQUIRES[permission];
        if (needed && !list.includes(needed)) list.push(needed);
      } else {
        list = list.filter((p) => PERMISSION_REQUIRES[p] !== permission);
      }
      return { ...d, [role]: list };
    });
  }

  save() {
    if (!this.canEdit()) return;
    this.permissionService.save(this.draft());
    this.message.set('Đã lưu ma trận phân quyền.');
  }

  reset() {
    if (!this.canEdit() || !confirm('Đưa quyền của các vai trò nhân viên về mặc định?')) return;
    this.permissionService.reset();
    this.draft.set(this.load());
    this.message.set('Đã khôi phục phân quyền mặc định.');
  }
}
