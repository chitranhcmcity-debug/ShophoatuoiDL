/** Yêu cầu tư vấn khách gửi từ form ở trang chủ */
export interface Consult {
  id: string;
  fullname: string;
  phone: string;
  note: string;
  createdAt: string; // ISO
  contacted: boolean;
  contactedBy?: string;
  contactedAt?: string; // ISO
}
