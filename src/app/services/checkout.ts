import { HttpClient } from '@angular/common/http';
import { Injectable, computed, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { STAFF_TARGET } from '../interfaces/notification';
import { Order } from '../interfaces/order';
import { NotificationService } from './notification';
import { SettingsService } from './settings';
import { Auth } from './auth';
import { CartService } from './cart';
import { CustomerService } from './customer';
import { EmployeeService } from './employee';
import { API_URL } from './storage';

@Injectable({ providedIn: 'root' })
export class CheckoutService {
  private apiUrl = `${API_URL}/orders`;
  orders = signal<Order[]>([]);
  currentUser = computed(() => this.authService.user());
  userOrders = computed(() => {
    const user = this.currentUser();
    return user ? this.orders().filter((o) => o.userId === user.id) : [];
  });

  /** Hoàn tất khi đã tải xong danh sách đơn hàng từ API */
  loaded: Promise<void>;

  constructor(
    private http: HttpClient,
    private cartService: CartService,
    private authService: Auth,
    private customerService: CustomerService,
    private employeeService: EmployeeService,
    private notificationService: NotificationService,
    private settingsService: SettingsService
  ) {
    this.loaded = this.loadOrders();
    // Trang quản trị / máy khác đổi trạng thái đơn thì khách thấy ngay, không cần tải lại trang
    setInterval(() => this.loadOrders().catch(() => {}), 3000);
  }

  private loadOrders(): Promise<void> {
    return firstValueFrom(this.http.get<Order[]>(this.apiUrl)).then((data) => {
      if (JSON.stringify(data) !== JSON.stringify(this.orders())) this.orders.set(data);
    });
  }

  /** Mã đơn = số lớn nhất hiện có + 1 (dùng length sẽ trùng mã sau khi có đơn bị xóa) */
  private nextOrderId(): string {
    const max = this.orders().reduce((m, o) => Math.max(m, Number(o.id.replace('o', '')) || 0), 0);
    return 'o' + (max + 1);
  }

  /** Tìm thông tin user (employee hoặc customer) để điền sẵn form */
  findCurrentUserInfo(userId: string) {
    return (
      this.employeeService.getEmployees().find((e) => e.id === userId) ||
      this.customerService.getCustomers().find((c) => c.id === userId)
    );
  }

  getActiveUserCarts() {
    return this.cartService.getUserCart().filter((i) => i.active);
  }
  calculateSubtotal(carts: { price: number; quantity: number }[]): number {
    return carts.reduce((t, i) => t + i.price * i.quantity, 0);
  }

  async checkout(info: { fullname: string; phone: string; address: string; note: string }, shipping: number): Promise<boolean> {
    const user = this.currentUser();
    if (!user) {
      alert('Vui lòng đăng nhập để thanh toán!');
      return false;
    }
    const items = this.getActiveUserCarts();
    if (items.length === 0) {
      alert('Chưa có sản phẩm nào được chọn để thanh toán!');
      return false;
    }
    // lấy danh sách đơn mới nhất từ server để mã đơn không trùng với máy khác vừa đặt
    await this.loadOrders();
    const order: Order = {
      id: this.nextOrderId(),
      userId: user.id!,
      ...info,
      items,
      total: this.calculateSubtotal(items) + shipping,
      status: 'Chờ xác nhận',
      history: [{ status: 'Chờ xác nhận', time: new Date().toISOString(), by: user.username, note: 'Khách đặt hàng' }],
      createdAt: new Date().toISOString(),
    };
    try {
      const created = await firstValueFrom(this.http.post<Order>(this.apiUrl, order));
      this.orders.update((l) => [...l, created]);
    } catch {
      alert('Không đặt được hàng, vui lòng thử lại.');
      return false;
    }
    this.cartService.removeActive();
    return true;
  }

  /** Chuyển trạng thái và ghi lại lịch sử (thời điểm, người thao tác) */
  updateStatus(id: string, status: string, note = '') {
    const actor = this.authService.user();
    const by = actor?.username ?? '';
    const time = new Date().toISOString();
    const order = this.orders().find((o) => o.id === id);
    if (!order) return;
    const history = [...(order.history ?? []), { status, time, by, note }];
    this.http.patch<Order>(`${this.apiUrl}/${id}`, { status, history }).subscribe((updated) => {
      this.orders.update((l) => l.map((o) => (o.id === id ? updated : o)));
    });
    if (order) this.notifyStatusChange(order, status, note, actor?.id === order.userId);
  }

  /** Khách hủy → báo nhân viên; nhân viên duyệt/từ chối/đổi trạng thái → báo khách */
  private notifyStatusChange(o: Order, status: string, note: string, byCustomer: boolean) {
    const code = '#' + o.id;
    if (byCustomer) {
      if (status === 'Đã hủy') {
        this.notificationService.push({
          target: STAFF_TARGET,
          orderId: o.id,
          tone: 'danger',
          title: `Khách hủy đơn ${code}`,
          message: `${o.fullname} đã hủy đơn hàng ${code}${note ? ' · Lý do: ' + note : ''}`,
        });
      }
      return;
    }
    const reason = note ? ` · Lý do: ${note}` : '';
    const byStatus: Record<string, { tone: 'success' | 'danger' | 'info'; title: string; message: string }> = {
      'Đã xác nhận': { tone: 'success', title: `Đơn ${code} đã được duyệt`, message: `Shop đã duyệt đơn hàng ${code} của bạn.` },
      'Đã hủy': { tone: 'danger', title: `Đơn ${code} bị từ chối`, message: `Shop đã từ chối/hủy đơn hàng ${code}.${reason}` },
      'Đang chuẩn bị hoa': { tone: 'info', title: `Đơn ${code} đang chuẩn bị`, message: `Nghệ nhân đang chuẩn bị hoa cho đơn ${code}.` },
      'Đang giao': { tone: 'info', title: `Đơn ${code} đang giao`, message: `Đơn hàng ${code} đang được giao đến bạn.` },
      'Đã giao': { tone: 'success', title: `Đơn ${code} đã giao`, message: `Đơn hàng ${code} đã giao thành công. Cảm ơn bạn!` },
    };
    const n = byStatus[status];
    if (n) this.notificationService.push({ target: o.userId, orderId: o.id, ...n });
  }
  /** Khách chỉ được hủy đơn của chính mình khi shop chưa bắt đầu chuẩn bị hoa */
  canCustomerCancel(o: Order): boolean {
    return this.settingsService.settings().allowCustomerCancel && o.userId === this.currentUser()?.id && (o.status === 'Chờ xác nhận' || o.status === 'Đã xác nhận');
  }
  cancelByCustomer(id: string, reason: string): boolean {
    const o = this.orders().find((x) => x.id === id);
    if (!o || !this.canCustomerCancel(o)) {
      alert('Đơn hàng đang được chuẩn bị hoặc đã giao, không thể hủy. Vui lòng liên hệ shop.');
      return false;
    }
    this.updateStatus(id, 'Đã hủy', reason || 'Khách hàng hủy đơn');
    return true;
  }
  deleteOrder(id: string) {
    this.http.delete<void>(`${this.apiUrl}/${id}`).subscribe(() => {
      this.orders.update((l) => l.filter((o) => o.id !== id));
    });
  }
}
