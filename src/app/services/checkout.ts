import { HttpClient } from '@angular/common/http';
import { Injectable, computed, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { STAFF_TARGET } from '../interfaces/notification';
import { AssigneeField, CartItem, Order, PAYMENT, REFUND, assigneeOf, flowOf, isPaid, nextStepOf } from '../interfaces/order';
import { NotificationService } from './notification';
import { SettingsService } from './settings';
import { Auth } from './auth';
import { CartService } from './cart';
import { CustomerService } from './customer';
import { EmployeeService } from './employee';
import { PaymentService } from './payment';
import { ProductService } from './product';
import { API_URL } from './storage';

const ORDERS_PAGE = '/dashboard/orders';

export interface CheckoutInfo {
  fullname: string;
  phone: string;
  email: string;
  address: string;
  note: string;
  deliveryDate: string;
  deliverySlot: string;
  paymentMethod: string;
}

export interface ShippingChoice {
  method: string;
  label: string;
  fee: number;
}

@Injectable({ providedIn: 'root' })
export class CheckoutService {
  private apiUrl = `${API_URL}/orders`;
  orders = signal<Order[]>([]);
  currentUser = computed(() => this.authService.user());
  userOrders = computed(() => {
    const user = this.currentUser();
    return user ? this.orders().filter((o) => o.userId === user.id) : [];
  });

  /** Đang gửi đơn: chặn bấm "Đặt hàng" nhiều lần */
  placing = signal(false);
  /** Các đơn đang được đổi trạng thái: chặn bấm xác nhận nhiều lần */
  private updating = new Set<string>();

  /** Hoàn tất khi đã tải xong danh sách đơn hàng từ API */
  loaded: Promise<void>;

  constructor(
    private http: HttpClient,
    private cartService: CartService,
    private authService: Auth,
    private customerService: CustomerService,
    private employeeService: EmployeeService,
    private notificationService: NotificationService,
    private settingsService: SettingsService,
    private productService: ProductService,
    private paymentService: PaymentService
  ) {
    this.loaded = this.loadOrders();
    // Trang quản trị / máy khác đổi trạng thái đơn thì khách thấy ngay, không cần tải lại trang
    setInterval(() => this.loadOrders().catch(() => {}), 3000);
  }

  loadOrders(): Promise<void> {
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

  /** Đối chiếu giỏ với sản phẩm mới nhất; có thay đổi thì sửa giỏ, báo khách và không đặt hàng */
  private async validateCart(items: CartItem[]): Promise<boolean> {
    const problems: string[] = [];
    for (const item of items) {
      const p = await this.productService.fetchLatest(item.productId);
      if (!p || p.stock <= 0) {
        this.cartService.dropItem(item.id);
        problems.push(`"${item.title}" ${p ? 'đã hết hàng' : 'không còn bán'}, đã bỏ khỏi giỏ.`);
        continue;
      }
      const change: Partial<CartItem> = {};
      if (item.quantity > p.stock) {
        change.quantity = p.stock;
        problems.push(`"${item.title}" chỉ còn ${p.stock} sản phẩm, đã giảm số lượng.`);
      }
      const price = this.productService.discountPrice(p.price, p.discount);
      if (price !== item.price) {
        change.price = price;
        change.discount = p.discount;
        problems.push(`"${item.title}" đã đổi giá thành ${price.toLocaleString('vi-VN')}đ.`);
      }
      if (Object.keys(change).length) this.cartService.patchItem(item.id, change);
    }
    if (problems.length) alert(problems.join('\n') + '\nVui lòng kiểm tra lại đơn hàng.');
    return problems.length === 0;
  }

  /** Tạo đơn hàng; trả về đơn vừa tạo (để thanh toán payOS ngay sau đó) hoặc null nếu không đặt được */
  async checkout(info: CheckoutInfo, shipping: ShippingChoice): Promise<Order | null> {
    if (this.placing()) return null;
    const user = this.currentUser();
    if (!user) {
      alert('Vui lòng đăng nhập để thanh toán!');
      return null;
    }
    if (!this.authService.canShop()) {
      alert('Tài khoản quản trị không thể đặt hàng.');
      return null;
    }
    const items = this.getActiveUserCarts();
    if (items.length === 0) {
      alert('Chưa có sản phẩm nào được chọn để thanh toán!');
      return null;
    }
    this.placing.set(true);
    try {
      if (!(await this.validateCart(items))) return null;
      // lấy danh sách đơn mới nhất từ server để mã đơn không trùng với máy khác vừa đặt
      await this.loadOrders();
      const order: Order = {
        id: this.nextOrderId(),
        userId: user.id!,
        ...info,
        items,
        total: this.calculateSubtotal(items) + shipping.fee,
        status: 'Chờ xác nhận',
        history: [{ status: 'Chờ xác nhận', time: new Date().toISOString(), by: user.username, note: 'Khách đặt hàng' }],
        createdAt: new Date().toISOString(),
        shippingMethod: shipping.method,
        shippingLabel: shipping.label,
        shippingFee: shipping.fee,
        stockDeducted: true,
        ...(info.paymentMethod === 'payos' ? { paymentStatus: PAYMENT.UNPAID } : {}),
      };
      const created = await firstValueFrom(this.http.post<Order>(this.apiUrl, order));
      this.orders.update((l) => [...l, created]);
      await Promise.all(items.map((i) => this.productService.adjustStock(i.productId, -i.quantity).catch(() => {})));
      this.cartService.removeActive();
      this.notificationService.push({
        target: STAFF_TARGET,
        orderId: created.id,
        perm: 'order.confirm',
        tone: 'info',
        title: `Đơn mới #${created.id}`,
        message: `${created.fullname} vừa đặt đơn hàng, cần xác nhận.`,
      });
      return created;
    } catch {
      alert('Không đặt được hàng, vui lòng thử lại.');
      return null;
    } finally {
      this.placing.set(false);
    }
  }

  /**
   * Chuyển trạng thái và ghi lại lịch sử (thời điểm, người thao tác).
   * Đối chiếu với đơn mới nhất trên server: nếu người khác vừa đổi trạng thái thì không ghi đè.
   */
  async updateStatus(id: string, status: string, note = '', byOwner = false): Promise<boolean> {
    const local = this.orders().find((o) => o.id === id);
    if (!local || this.updating.has(id)) return false;
    this.updating.add(id);
    try {
      const fresh = await firstValueFrom(this.http.get<Order>(`${this.apiUrl}/${id}`));
      if (fresh.status !== local.status) {
        this.orders.update((l) => l.map((o) => (o.id === id ? fresh : o)));
        alert(`Đơn hàng vừa được cập nhật thành "${fresh.status}", thao tác của bạn chưa được thực hiện.`);
        return false;
      }
      const by = this.authService.user()?.username ?? '';
      const time = new Date().toISOString();
      const history = [...(fresh.history ?? []), { status, time, by, note }];
      // COD: giao xong xem như đã thu tiền
      const payment = status === 'Đã giao' && fresh.paymentMethod === 'cod' ? { paid: true, paidBy: by, paidAt: time } : {};
      // Hủy đơn khách đã trả tiền: chờ shop hoàn tiền
      const refund = status === 'Đã hủy' && isPaid(fresh) ? { refundStatus: REFUND.PENDING } : {};
      const updated = await firstValueFrom(this.http.patch<Order>(`${this.apiUrl}/${id}`, { status, history, ...payment, ...refund }));
      this.orders.update((l) => l.map((o) => (o.id === id ? updated : o)));
      if (status === 'Đã hủy' && updated.payosOrderCode && !isPaid(updated)) {
        this.paymentService.cancelLink(id).then(() => this.loadOrders()).catch(() => {});
      }
      await this.applyStock(updated);
      this.notifyStatusChange(updated, note, byOwner);
      return true;
    } catch {
      alert('Không cập nhật được đơn hàng, vui lòng thử lại.');
      return false;
    } finally {
      this.updating.delete(id);
    }
  }

  /** Hủy đơn thì trả lại tồn kho; giao xong mới tính vào số đã bán */
  private async applyStock(o: Order) {
    if (o.status === 'Đã hủy' && o.stockDeducted) {
      await Promise.all(o.items.map((i) => this.productService.adjustStock(i.productId, i.quantity).catch(() => {})));
    } else if (o.status === 'Đã giao') {
      await Promise.all(o.items.map((i) => this.productService.adjustStock(i.productId, 0, i.quantity).catch(() => {})));
    }
  }

  /** Khách hủy → báo nhân viên; nhân viên duyệt/từ chối/đổi trạng thái → báo khách và báo người làm bước kế tiếp */
  private notifyStatusChange(o: Order, note: string, byOwner: boolean) {
    const code = '#' + o.id;
    const status = o.status;
    if (o.refundStatus === REFUND.PENDING) {
      const amount = o.total.toLocaleString('vi-VN') + 'đ';
      this.notificationService.push({
        target: STAFF_TARGET,
        perm: 'order.payment',
        orderId: o.id,
        tone: 'danger',
        title: `Đơn ${code} cần hoàn tiền`,
        message: `Hoàn ${amount} cho ${o.fullname} · ${o.phone}`,
      });
      this.notificationService.push({
        target: o.userId,
        orderId: o.id,
        tone: 'info',
        title: `Đơn ${code} sẽ được hoàn tiền`,
        message: `Shop sẽ hoàn ${amount} cho bạn trong ${this.settingsService.settings().refundDays}.`,
      });
    }
    if (byOwner) {
      this.notificationService.push({
        target: STAFF_TARGET,
        orderId: o.id,
        tone: 'danger',
        title: `Khách hủy đơn ${code}`,
        message: `${o.fullname} đã hủy đơn hàng ${code}${note ? ' · Lý do: ' + note : ''}`,
      });
      return;
    }
    const reason = note ? ` · Lý do: ${note}` : '';
    const doneMessage = o.shippingMethod === 'pickup' ? `Bạn đã nhận đơn hàng ${code} tại cửa hàng. Cảm ơn bạn!` : `Đơn hàng ${code} đã giao thành công. Cảm ơn bạn!`;
    const byStatus: Record<string, { tone: 'success' | 'danger' | 'info'; title: string; message: string }> = {
      'Đã xác nhận': { tone: 'success', title: `Đơn ${code} đã được duyệt`, message: `Shop đã duyệt đơn hàng ${code} của bạn.` },
      'Đã hủy': { tone: 'danger', title: `Đơn ${code} bị từ chối`, message: `Shop đã từ chối/hủy đơn hàng ${code}.${reason}` },
      'Đang chuẩn bị hoa': { tone: 'info', title: `Đơn ${code} đang chuẩn bị`, message: `Nghệ nhân đang chuẩn bị hoa cho đơn ${code}.` },
      'Đang giao': { tone: 'info', title: `Đơn ${code} đang giao`, message: `Đơn hàng ${code} đang được giao đến bạn.` },
      'Đã giao': { tone: 'success', title: `Đơn ${code} đã hoàn tất`, message: doneMessage },
    };
    const n = byStatus[status];
    if (n) this.notificationService.push({ target: o.userId, orderId: o.id, ...n });

    // Báo người phụ trách bước kế tiếp (bỏ qua nếu vẫn là người đang làm bước này)
    const current = flowOf(o).find((s) => s.status === status);
    const next = nextStepOf(o);
    if (next?.perm && next.perm !== current?.perm) {
      const assignee = assigneeOf(o, next.perm);
      this.notificationService.push({
        ...(assignee ? { target: assignee, link: ORDERS_PAGE } : { target: STAFF_TARGET, perm: next.perm }),
        orderId: o.id,
        tone: 'info',
        title: `Đơn ${code} cần xử lý`,
        message: `Bước tiếp theo: ${next.title}`,
      });
    }
  }

  /** Phân công nhân viên cho đơn; userId rỗng là bỏ phân công */
  async assign(id: string, field: AssigneeField, userId: string): Promise<void> {
    try {
      const updated = await firstValueFrom(this.http.patch<Order>(`${this.apiUrl}/${id}`, { [field]: userId || null }));
      this.orders.update((l) => l.map((o) => (o.id === id ? updated : o)));
      if (!userId) return;
      this.notificationService.push({
        target: userId,
        link: ORDERS_PAGE,
        orderId: id,
        tone: 'info',
        title: `Bạn được giao đơn #${id}`,
        message: `${updated.fullname} · ${updated.address}`,
      });
    } catch {
      alert('Không phân công được, vui lòng thử lại.');
    }
  }

  /** Nhân viên xác nhận đã nhận tiền chuyển khoản */
  async markPaid(id: string): Promise<void> {
    try {
      const paidBy = this.authService.user()?.username ?? '';
      const updated = await firstValueFrom(this.http.patch<Order>(`${this.apiUrl}/${id}`, { paid: true, paidBy, paidAt: new Date().toISOString() }));
      this.orders.update((l) => l.map((o) => (o.id === id ? updated : o)));
      this.notificationService.push({
        target: updated.userId,
        orderId: id,
        tone: 'success',
        title: `Đơn #${id} đã thanh toán`,
        message: `Shop đã nhận được tiền chuyển khoản cho đơn #${id}.`,
      });
    } catch {
      alert('Không cập nhật được thanh toán, vui lòng thử lại.');
    }
  }
  /** Nhân viên xác nhận đã chuyển trả tiền cho khách của một đơn bị hủy */
  async markRefunded(id: string, note: string): Promise<void> {
    try {
      const fresh = await firstValueFrom(this.http.get<Order>(`${this.apiUrl}/${id}`));
      if (fresh.refundStatus !== REFUND.PENDING) {
        this.orders.update((l) => l.map((o) => (o.id === id ? fresh : o)));
        return;
      }
      const by = this.authService.user()?.username ?? '';
      const time = new Date().toISOString();
      const history = [...(fresh.history ?? []), { status: fresh.status, time, by, note: `Đã hoàn tiền${note ? ' · ' + note : ''}` }];
      const updated = await firstValueFrom(
        this.http.patch<Order>(`${this.apiUrl}/${id}`, { refundStatus: REFUND.DONE, refundedBy: by, refundedAt: time, refundNote: note, history })
      );
      this.orders.update((l) => l.map((o) => (o.id === id ? updated : o)));
      this.notificationService.push({
        target: updated.userId,
        orderId: id,
        tone: 'success',
        title: `Đơn #${id} đã được hoàn tiền`,
        message: `Shop đã hoàn ${updated.total.toLocaleString('vi-VN')}đ cho đơn #${id}.${note ? ' Mã giao dịch: ' + note : ''}`,
      });
    } catch {
      alert('Không cập nhật được hoàn tiền, vui lòng thử lại.');
    }
  }

  /** Khách chỉ được hủy đơn của chính mình khi shop chưa bắt đầu chuẩn bị hoa */
  canCustomerCancel(o: Order): boolean {
    return this.settingsService.settings().allowCustomerCancel && o.userId === this.currentUser()?.id && (o.status === 'Chờ xác nhận' || o.status === 'Đã xác nhận');
  }
  async cancelByCustomer(id: string, reason: string): Promise<boolean> {
    const o = this.orders().find((x) => x.id === id);
    if (!o || !this.canCustomerCancel(o)) {
      alert('Đơn hàng đang được chuẩn bị hoặc đã giao, không thể hủy. Vui lòng liên hệ shop.');
      return false;
    }
    return this.updateStatus(id, 'Đã hủy', reason || 'Khách hàng hủy đơn', true);
  }
  deleteOrder(id: string) {
    this.http.delete<void>(`${this.apiUrl}/${id}`).subscribe(() => {
      this.orders.update((l) => l.filter((o) => o.id !== id));
    });
  }
}
