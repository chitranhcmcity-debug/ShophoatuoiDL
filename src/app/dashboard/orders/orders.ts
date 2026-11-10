import { DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Pagination } from '../../components/pagination/pagination';
import { OrderTracking } from '../../components/order-tracking/order-tracking';
import { LOCKED_ROLES } from '../../interfaces/permissions';
import { ORDER_CANCELLED, ORDER_STATUSES, Order, assigneeOf, nextStepOf, paymentLabel, toneOfStatus } from '../../interfaces/order';
import { Auth } from '../../services/auth';
import { CheckoutService } from '../../services/checkout';
import { EmployeeService } from '../../services/employee';
import { PermissionService } from '../../services/permission';
import { OrderAssignment } from './order-assignment/order-assignment';

const MY_WORK = 'mine';
const STEP_PERMISSIONS = ['order.confirm', 'order.prepare', 'order.ship', 'order.deliver', 'order.pickup'];

@Component({
  selector: 'app-orders',
  imports: [DatePipe, RouterLink, OrderTracking, OrderAssignment, Pagination],
  templateUrl: './orders.html',
  styleUrl: './orders.css',
})
export class Orders {
  private checkoutService = inject(CheckoutService);
  private permissionService = inject(PermissionService);
  private employeeService = inject(EmployeeService);
  authService = inject(Auth);

  orders = this.checkoutService.orders;
  statuses = ORDER_STATUSES;
  toneOf = toneOfStatus;
  paymentLabel = paymentLabel;

  /** Quản lí, Quản trị web xem toàn bộ; nhân viên xử lý đơn có thêm bộ lọc việc của mình */
  private isSupervisor = computed(() => LOCKED_ROLES.includes(this.authService.user()?.role ?? ''));
  showMyWork = computed(() => !this.isSupervisor() && STEP_PERMISSIONS.some((p) => this.authService.hasPermission(p)));
  myWork = computed(() => this.orders().filter((o) => this.canAdvance(o)));

  filter = signal<string>('all');
  expanded = signal<string | null>(null);

  filtered = computed(() => {
    const f = this.filter();
    if (f === MY_WORK) return [...this.myWork()].reverse();
    const list = [...this.orders()].reverse(); // đơn mới nhất lên đầu
    return f === 'all' ? list : list.filter((o) => o.status === f);
  });

  // phân trang
  page = signal(1);
  pageSize = signal(5);
  paged = computed(() => {
    const start = (this.page() - 1) * this.pageSize();
    return this.filtered().slice(start, start + this.pageSize());
  });

  setFilter(f: string) {
    this.filter.set(f);
    this.page.set(1);
    this.expanded.set(null);
  }

  countOf(status: string): number {
    return this.orders().filter((o) => o.status === status).length;
  }

  toggle(id: string) {
    this.expanded.update((cur) => (cur === id ? null : id));
  }

  /** Bước kế tiếp trong quy trình (null nếu đã giao xong hoặc đã hủy) */
  nextStep(o: Order) {
    return nextStepOf(o);
  }

  /** Người đang đăng nhập có được xác nhận bước kế tiếp không */
  canAdvance(o: Order): boolean {
    const perm = this.nextStep(o)?.perm;
    if (!perm || !this.authService.hasPermission(perm)) return false;
    const assignee = assigneeOf(o, perm);
    return !assignee || assignee === this.authService.user()?.id || this.isSupervisor();
  }

  /** Bước kế tiếp do ai phụ trách */
  waitingFor(o: Order): string {
    const perm = this.nextStep(o)?.perm;
    const assignee = perm ? assigneeOf(o, perm) : null;
    if (assignee) return this.employeeService.displayName(assignee);
    const roles = perm ? this.permissionService.rolesWith(perm) : [];
    return roles.length ? roles.join(', ') : 'Quản lí hoặc Quản trị web';
  }

  canCancel(o: Order): boolean {
    return this.authService.hasPermission('order.cancel') && o.status !== ORDER_CANCELLED.status && o.status !== 'Đã giao';
  }

  advance(o: Order) {
    const next = this.nextStep(o);
    if (next && this.canAdvance(o)) this.checkoutService.updateStatus(o.id, next.status);
  }

  cancel(o: Order) {
    if (!this.canCancel(o)) return;
    const reason = prompt('Nhập lý do hủy đơn hàng:', 'Khách yêu cầu hủy');
    if (reason === null) return;
    this.checkoutService.updateStatus(o.id, ORDER_CANCELLED.status, reason.trim() || 'Hủy đơn');
  }

  canInvoice(o: Order): boolean {
    return o.status !== ORDER_CANCELLED.status && this.authService.hasPermission('order.invoice');
  }

  canMarkPaid(o: Order): boolean {
    return o.paymentMethod === 'bank' && !o.paid && o.status !== ORDER_CANCELLED.status && this.authService.hasPermission('order.payment');
  }

  markPaid(o: Order) {
    if (this.canMarkPaid(o)) this.checkoutService.markPaid(o.id);
  }

  delete(id: string) {
    if (!this.authService.hasPermission('order.delete')) return;
    if (confirm('Xóa đơn hàng này?')) this.checkoutService.deleteOrder(id);
  }
}
