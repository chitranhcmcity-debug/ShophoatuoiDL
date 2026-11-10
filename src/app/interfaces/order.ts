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
  /** Phương thức thanh toán: cod = trả tiền khi nhận hàng, payos = chuyển khoản QR qua payOS */
  paymentMethod?: PaymentMethod;
  paymentStatus?: string;
  paidAt?: string;
  payosOrderCode?: number;
  payosLinkId?: string;
}

export type PaymentMethod = 'cod' | 'payos';

/** Trạng thái thanh toán (khớp với server/payos.mjs) */
export const PAYMENT = { UNPAID: 'Chưa thanh toán', PAID: 'Đã thanh toán', CANCELLED: 'Hủy thanh toán' } as const;

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  cod: 'Tiền mặt khi nhận hàng (COD)',
  payos: 'Chuyển khoản QR (payOS)',
};

/** Nhãn + màu hiển thị trạng thái thanh toán của 1 đơn */
export function paymentBadge(o: Order): { text: string; cls: string } {
  if (o.paymentMethod !== 'payos') return { text: 'COD', cls: 'bg-secondary' };
  if (o.paymentStatus === PAYMENT.PAID) return { text: 'Đã thanh toán', cls: 'bg-success' };
  if (o.paymentStatus === PAYMENT.CANCELLED) return { text: 'Hủy thanh toán', cls: 'bg-danger' };
  return { text: 'Chờ thanh toán', cls: 'bg-warning text-dark' };
}

export interface OrderStep {
  status: string;
  title: string;
  desc: string;
  icon: string;
  tone: string;
}

/** Quy trình xử lý đơn hàng: đi lần lượt từ bước 1 đến bước 5 */
export const ORDER_FLOW: OrderStep[] = [
  { status: 'Chờ xác nhận', title: 'Đặt hàng thành công', desc: 'Shop đã nhận được đơn hàng', icon: 'bi-bag-check-fill', tone: 'amber' },
  { status: 'Đã xác nhận', title: 'Xác nhận đơn hàng', desc: 'Shop đã kiểm tra và xác nhận đơn', icon: 'bi-clipboard2-check-fill', tone: 'sapphire' },
  { status: 'Đang chuẩn bị hoa', title: 'Chuẩn bị hoa', desc: 'Nghệ nhân đang chọn hoa tươi và cắm hoa', icon: 'bi-flower2', tone: 'rose' },
  { status: 'Đang giao', title: 'Đang giao hàng', desc: 'Shipper đang giao hoa đến địa chỉ nhận', icon: 'bi-truck', tone: 'plum' },
  { status: 'Đã giao', title: 'Giao hàng thành công', desc: 'Khách đã nhận hoa', icon: 'bi-patch-check-fill', tone: 'emerald' },
];

export const ORDER_CANCELLED: OrderStep = {
  status: 'Đã hủy',
  title: 'Đơn hàng đã hủy',
  desc: 'Đơn hàng đã bị hủy',
  icon: 'bi-x-octagon-fill',
  tone: 'red',
};

export const ORDER_STATUSES: OrderStep[] = [...ORDER_FLOW, ORDER_CANCELLED];

export const toneOfStatus = (status: string) => ORDER_STATUSES.find((s) => s.status === status)?.tone ?? 'plum';
