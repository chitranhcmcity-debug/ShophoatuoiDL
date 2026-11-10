import { Component, computed, inject, input } from '@angular/core';
import { AssigneeField, Order, ORDER_CANCELLED } from '../../../interfaces/order';
import { EDITABLE_ROLES } from '../../../interfaces/permissions';
import { Auth } from '../../../services/auth';
import { CheckoutService } from '../../../services/checkout';
import { EmployeeService } from '../../../services/employee';
import { PermissionService } from '../../../services/permission';

/** Phân công người cắm hoa và người giao hoa cho một đơn */
@Component({
  selector: 'app-order-assignment',
  templateUrl: './order-assignment.html',
})
export class OrderAssignment {
  order = input.required<Order>();

  private authService = inject(Auth);
  private checkoutService = inject(CheckoutService);
  private employeeService = inject(EmployeeService);
  private permissionService = inject(PermissionService);

  canAssign = computed(() => this.authService.hasPermission('order.assign'));

  rows = computed(() => {
    const o = this.order();
    if (o.status === ORDER_CANCELLED.status || o.status === 'Đã giao') return [];
    const rows: { field: AssigneeField; label: string; current: string | null | undefined; options: { id: string; name: string }[] }[] = [];
    if (o.status === 'Chờ xác nhận' || o.status === 'Đã xác nhận') {
      rows.push({ field: 'assignedFlorist', label: 'Người cắm hoa', current: o.assignedFlorist, options: this.staffWith('order.prepare') });
    }
    if (o.shippingMethod !== 'pickup') {
      rows.push({ field: 'assignedShipper', label: 'Người giao hoa', current: o.assignedShipper, options: this.staffWith('order.ship') });
    }
    return rows;
  });

  private staffWith(permission: string) {
    return this.employeeService
      .users()
      .filter((u) => EDITABLE_ROLES.includes(u.role) && !u.islocked && this.permissionService.has(u.role, permission))
      .map((u) => ({ id: u.id!, name: this.employeeService.displayName(u.id!) }));
  }

  nameOf(id: string | null | undefined): string {
    return id ? this.employeeService.displayName(id) : 'Chưa phân công';
  }

  assign(field: AssigneeField, event: Event) {
    if (!this.canAssign()) return;
    this.checkoutService.assign(this.order().id, field, (event.target as HTMLSelectElement).value);
  }
}
