/** Người nhận 'staff' = tất cả nhân viên/quản trị có quyền xem đơn hàng; ngược lại là id của khách hàng */
export const STAFF_TARGET = 'staff';

export interface AppNotification {
  id: string;
  target: string;
  orderId?: string;
  link?: string; // trang mở ra khi bấm vào thông báo
  title: string;
  message: string;
  tone: 'success' | 'danger' | 'info';
  time: string; // ISO
  read: boolean;
}
