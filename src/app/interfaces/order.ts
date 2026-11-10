export interface CartItem {
  id: string;
  userId: string;
  productId: string;
  title: string;
  image: string;
  price: number; // giá đã giảm
  discount: number;
  quantity: number;
  active: boolean;
}

/** Một mốc trong lịch sử theo dõi đơn hàng */
export interface OrderHistory {
  status: string;
  time: string; // ISO
  by: string; // người thao tác
  note?: string;
}

export interface Order {
  id: string;
  userId: string;
  fullname: string;
  phone: string;
  address: string;
  note: string;
  items: CartItem[];
  total: number;
  status: string;
  history: OrderHistory[];
  createdAt: string;
  email?: string;
  shippingMethod?: string; // free | fast | pickup
  shippingLabel?: string;
  shippingFee?: number;
  stockDeducted?: boolean; // đơn đã trừ tồn kho, khi hủy thì cộng lại
  deliveryDate?: string; // YYYY-MM-DD
  deliverySlot?: string;
  paymentMethod?: string; // cod | payos | bank
  paid?: boolean; // COD đã thu tiền, chuyển khoản thủ công đã được nhân viên xác nhận
  paymentStatus?: string; // payOS: do backend (server/payos.mjs) ghi sau khi hỏi lại payOS
  payosOrderCode?: number;
  payosLinkId?: string;
  paidBy?: string;
  paidAt?: string; // ISO
  assignedFlorist?: string | null; // id nhân viên cắm hoa được phân công
  assignedShipper?: string | null; // id nhân viên giao hoa được phân công
}

export type AssigneeField = 'assignedFlorist' | 'assignedShipper';

export const PAYMENT_METHODS = [
  { key: 'cod', label: 'Thanh toán khi nhận hàng (COD)' },
  { key: 'payos', label: 'Chuyển khoản QR (payOS)' },
  { key: 'bank', label: 'Chuyển khoản thủ công (shop xác nhận)' },
];

export const paymentLabel = (key?: string) => PAYMENT_METHODS.find((m) => m.key === key)?.label ?? '';

/** Trạng thái thanh toán payOS (khớp với server/payos.mjs) */
export const PAYMENT = { UNPAID: 'Chưa thanh toán', PAID: 'Đã thanh toán', CANCELLED: 'Hủy thanh toán' } as const;

/** Đã trả tiền chưa, dù trả theo cách nào */
export const isPaid = (o: Order) => !!o.paid || o.paymentStatus === PAYMENT.PAID;

/** Nhãn + màu trạng thái thanh toán của một đơn */
export function paymentBadge(o: Order): { text: string; cls: string } {
  if (isPaid(o)) return { text: 'Đã thanh toán', cls: 'bg-success' };
  if (o.paymentMethod === 'payos' && o.paymentStatus === PAYMENT.CANCELLED) return { text: 'Hủy thanh toán', cls: 'bg-danger' };
  if (!o.paymentMethod || o.paymentMethod === 'cod') return { text: 'COD', cls: 'bg-secondary' };
  return { text: 'Chờ thanh toán', cls: 'bg-warning text-dark' };
}

export const DELIVERY_SLOTS = [
  { label: '08:00 - 12:00', endHour: 12 },
  { label: '12:00 - 17:00', endHour: 17 },
  { label: '17:00 - 21:00', endHour: 21 },
];

export const FAST_DELIVERY_SLOT = 'Trong 60 phút';

/** Người được phân công làm bước cần quyền này (nếu có) */
export function assigneeOf(o: Order, permission: string): string | null | undefined {
  if (permission === 'order.prepare') return o.assignedFlorist;
  if (permission === 'order.ship' || permission === 'order.deliver') return o.assignedShipper;
  return undefined;
}

export interface OrderStep {
  status: string;
  title: string;
  desc: string;
  icon: string;
  tone: string;
  perm?: string; // quyền cần có để chuyển đơn sang bước này
}

/** Quy trình xử lý đơn hàng: đi lần lượt từ bước 1 đến bước 5 */
export const ORDER_FLOW: OrderStep[] = [
  { status: 'Chờ xác nhận', title: 'Đặt hàng thành công', desc: 'Shop đã nhận được đơn hàng', icon: 'bi-bag-check-fill', tone: 'amber' },
  { status: 'Đã xác nhận', title: 'Xác nhận đơn hàng', desc: 'Shop đã kiểm tra và xác nhận đơn', icon: 'bi-clipboard2-check-fill', tone: 'sapphire', perm: 'order.confirm' },
  { status: 'Đang chuẩn bị hoa', title: 'Chuẩn bị hoa', desc: 'Nghệ nhân đang chọn hoa tươi và cắm hoa', icon: 'bi-flower2', tone: 'rose', perm: 'order.prepare' },
  { status: 'Đang giao', title: 'Đang giao hàng', desc: 'Shipper đang giao hoa đến địa chỉ nhận', icon: 'bi-truck', tone: 'plum', perm: 'order.ship' },
  { status: 'Đã giao', title: 'Giao hàng thành công', desc: 'Khách đã nhận hoa', icon: 'bi-patch-check-fill', tone: 'emerald', perm: 'order.deliver' },
];

export const ORDER_CANCELLED: OrderStep = {
  status: 'Đã hủy',
  title: 'Đơn hàng đã hủy',
  desc: 'Đơn hàng đã bị hủy',
  icon: 'bi-x-octagon-fill',
  tone: 'red',
};

export const ORDER_STATUSES: OrderStep[] = [...ORDER_FLOW, ORDER_CANCELLED];

/** Quy trình của một đơn: nhận tại cửa hàng thì bỏ bước giao hàng */
export function flowOf(o: Pick<Order, 'shippingMethod'>): OrderStep[] {
  if (o.shippingMethod !== 'pickup') return ORDER_FLOW;
  return ORDER_FLOW.filter((s) => s.status !== 'Đang giao').map((s) =>
    s.status === 'Đã giao' ? { ...s, title: 'Khách đã nhận hoa', desc: 'Khách đã nhận hoa tại cửa hàng', perm: 'order.pickup' } : s
  );
}

/** Bước kế tiếp của đơn (null nếu đã xong hoặc đã hủy) */
export function nextStepOf(o: Pick<Order, 'shippingMethod' | 'status'>): OrderStep | null {
  const flow = flowOf(o);
  const i = flow.findIndex((s) => s.status === o.status);
  return i >= 0 && i < flow.length - 1 ? flow[i + 1] : null;
}

export const toneOfStatus = (status: string) => ORDER_STATUSES.find((s) => s.status === status)?.tone ?? 'plum';
