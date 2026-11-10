/**
 * Phân quyền theo vai trò (role) và theo từng chức năng (permission).
 * Tên quyền có dạng "<chức năng>.<hành động>", ví dụ product.update.
 *
 *  - manager  (Quản lí)      : thêm / sửa / xóa sản phẩm (danh mục), đơn hàng, khách hàng;
 *                              chỉ XEM tài khoản nhân viên, không được thêm / sửa / xóa.
 *  - admin    (Quản trị web) : quản trị web (nhân viên, khách hàng, đơn hàng, dữ liệu),
 *                              chỉ XEM sản phẩm, không được sửa sản phẩm / giá.
 *  - staff    (Nhân viên)    : chỉ được XEM, không thêm / sửa / xóa.
 *  - customer (Khách hàng)   : không vào được trang quản trị.
 */
export const ROLE_LABELS: Record<string, string> = {
  manager: 'Quản lí',
  admin: 'Quản trị web',
  staff: 'Nhân viên',
  customer: 'Khách hàng',
};

const MODULES = ['product', 'order', 'employee', 'customer'];
const ACTIONS = ['view', 'create', 'update', 'delete'];

export const ALL_PERMISSIONS: string[] = [
  'dashboard.view',
  'system.manage', // xuất file JSON, khôi phục dữ liệu gốc
  'customer.password', // xem mật khẩu khách hàng: chỉ quản trị web và chủ shop
  ...MODULES.flatMap((m) => ACTIONS.map((a) => `${m}.${a}`)),
];

export const ROLE_PERMISSIONS: Record<string, string[]> = {
  manager: ALL_PERMISSIONS.filter((p) => !['employee.create', 'employee.update', 'employee.delete'].includes(p)),
  admin: ALL_PERMISSIONS.filter((p) => !p.startsWith('product.') || p === 'product.view'),
  staff: ALL_PERMISSIONS.filter((p) => p.endsWith('.view')), // không có customer.password
  customer: [],
};

/** Các vai trò thuộc về nội bộ (được vào trang quản trị) */
export const STAFF_ROLES = ['manager', 'admin', 'staff'];
