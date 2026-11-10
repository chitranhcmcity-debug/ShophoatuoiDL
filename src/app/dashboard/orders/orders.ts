import { DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { Pagination } from '../../components/pagination/pagination';
import { OrderTracking } from '../../components/order-tracking/order-tracking';
import { ORDER_CANCELLED, ORDER_FLOW, ORDER_STATUSES, Order, toneOfStatus } from '../../interfaces/order';
import { Auth } from '../../services/auth';
import { CheckoutService } from '../../services/checkout';

@Component({
  selector: 'app-orders',
  imports: [DatePipe, OrderTracking, Pagination],
  templateUrl: './orders.html',
  styleUrl: './orders.css',
})
export class Orders {
  private checkoutService = inject(CheckoutService);
  authService = inject(Auth);

  orders = this.checkoutService.orders;
  statuses = ORDER_STATUSES;
  toneOf = toneOfStatus;

  filter = signal<string>('all');
  expanded = signal<string | null>(null);

  filtered = computed(() => {
    const f = this.filter();
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
    const i = ORDER_FLOW.findIndex((s) => s.status === o.status);
    return i >= 0 && i < ORDER_FLOW.length - 1 ? ORDER_FLOW[i + 1] : null;
  }

  canCancel(o: Order): boolean {
    return o.status !== ORDER_CANCELLED.status && o.status !== 'Đã giao';
  }

  advance(o: Order) {
    const next = this.nextStep(o);
    if (next) this.checkoutService.updateStatus(o.id, next.status);
  }

  cancel(o: Order) {
    const reason = prompt('Nhập lý do hủy đơn hàng:', 'Khách yêu cầu hủy');
    if (reason === null) return;
    this.checkoutService.updateStatus(o.id, ORDER_CANCELLED.status, reason.trim() || 'Hủy đơn');
  }

  delete(id: string) {
    if (confirm('Xóa đơn hàng này?')) this.checkoutService.deleteOrder(id);
  }
}
