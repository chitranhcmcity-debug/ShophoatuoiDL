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

export const toneOfStatus = (status: string) => ORDER_STATUSES.find((s) => s.status === status)?.tone ?? 'plum';
