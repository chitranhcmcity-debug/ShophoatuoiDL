/**
 * Phân quyền theo vai trò (role) và theo từng chức năng (permission).
 * Tên quyền có dạng "<chức năng>.<hành động>", ví dụ product.update.
 *
 *  - manager  (Quản lí)      : thêm / sửa / xóa sản phẩm (danh mục), đơn hàng, khách hàng;
 *                              chỉ XEM tài khoản nhân viên, không được thêm / sửa / xóa.
 *  - admin    (Quản trị web) : quản trị web (nhân viên, khách hàng, đơn hàng, dữ liệu),
 *                              chỉ XEM sản phẩm, không được sửa sản phẩm / giá.
 *  - staff    (Nhân viên)    : chỉ được XEM, không thêm / sửa / xóa.
 *  - receiver / florist / shipper: mỗi vai trò xử lý một giai đoạn của đơn hàng.
 *  - customer (Khách hàng)   : không vào được trang quản trị.
 *
 * Quyền của các vai trò trong EDITABLE_ROLES chỉnh được ở trang Phân quyền (xem PermissionService).
 */
export const ROLE_LABELS: Record<string, string> = {
  manager: 'Quản lí',
  admin: 'Quản trị web',
  staff: 'Nhân viên',
  receiver: 'Nhân viên nhận hàng',
  florist: 'Nhân viên cắm hoa',
  shipper: 'Nhân viên giao hoa',
  customer: 'Khách hàng',
};

const MODULES = ['product', 'order', 'employee', 'customer'];
const ACTIONS = ['view', 'create', 'update', 'delete'];

export const ALL_PERMISSIONS: string[] = [
  'dashboard.view',
  'system.manage', // xuất file JSON, khôi phục dữ liệu gốc
  'customer.password', // xem mật khẩu khách hàng: chỉ quản trị web và chủ shop
  'employee.password', // xem mật khẩu nhân viên: chỉ quản trị web
  'consult.view', // yêu cầu tư vấn từ form ở trang chủ
  'consult.update',
  'consult.delete',
  'report.view', // doanh thu ở trang tổng quan
  'permission.view', // xem ma trận phân quyền
  'permission.manage', // chỉnh ma trận phân quyền
  'order.confirm', // Chờ xác nhận -> Đã xác nhận
  'order.prepare', // Đã xác nhận -> Đang chuẩn bị hoa
  'order.ship', // Đang chuẩn bị hoa -> Đang giao
  'order.deliver', // Đang giao -> Đã giao
  'order.pickup', // khách nhận tại cửa hàng: Đang chuẩn bị hoa -> Đã giao
  'order.cancel',
  'order.assign', // phân công nhân viên cắm hoa, giao hoa
  'order.payment', // xác nhận đã nhận chuyển khoản
  'order.invoice', // xem, in hóa đơn của mọi đơn
  ...MODULES.flatMap((m) => ACTIONS.map((a) => `${m}.${a}`)).filter((p) => p !== 'order.update'),
];

export const ROLE_PERMISSIONS: Record<string, string[]> = {
  manager: ALL_PERMISSIONS.filter((p) => !['employee.create', 'employee.update', 'employee.delete', 'employee.password', 'permission.manage'].includes(p)),
  // Quản trị web chỉ xem sản phẩm và yêu cầu tư vấn; xử lý tư vấn là việc của Quản lí và Nhân viên nhận hàng
  admin: ALL_PERMISSIONS.filter((p) => (!p.startsWith('product.') || p === 'product.view') && !['consult.update', 'consult.delete'].includes(p)),
  staff: ALL_PERMISSIONS.filter((p) => p.endsWith('.view') && !['permission.view', 'report.view'].includes(p)), // không có customer.password
  receiver: ['dashboard.view', 'order.view', 'order.confirm', 'order.pickup', 'order.cancel', 'order.payment', 'order.invoice', 'customer.view', 'consult.view', 'consult.update', 'consult.delete'],
  florist: ['dashboard.view', 'order.view', 'order.prepare', 'product.view'],
  shipper: ['dashboard.view', 'order.view', 'order.ship', 'order.deliver'],
  customer: [],
};

/** Các vai trò thuộc về nội bộ (được vào trang quản trị) */
export const STAFF_ROLES = ['manager', 'admin', 'staff', 'receiver', 'florist', 'shipper'];

/** Các vai trò chỉ quản trị, không mua hàng và không có trang tài khoản khách */
export const NON_SHOPPING_ROLES = ['admin'];

/** Các vai trò được giao việc qua ma trận phân quyền; Quản lí và Quản trị web cố định để không tự nâng quyền */
export const EDITABLE_ROLES = ['staff', 'receiver', 'florist', 'shipper'];
export const LOCKED_ROLES = ['manager', 'admin'];

/** Các quyền hiện trong ma trận. Quyền nhạy cảm (mật khẩu, tài khoản, dữ liệu hệ thống) không giao qua đây */
export const PERMISSION_GROUPS: { title: string; items: { key: string; label: string }[] }[] = [
  {
    title: 'Xử lý đơn hàng',
    items: [
      { key: 'order.view', label: 'Xem đơn hàng' },
      { key: 'order.confirm', label: 'Xác nhận đơn hàng' },
      { key: 'order.prepare', label: 'Chuẩn bị hoa' },
      { key: 'order.ship', label: 'Bắt đầu giao hàng' },
      { key: 'order.deliver', label: 'Xác nhận đã giao' },
      { key: 'order.pickup', label: 'Xác nhận khách nhận tại cửa hàng' },
      { key: 'order.cancel', label: 'Hủy đơn hàng' },
      { key: 'order.assign', label: 'Phân công nhân viên' },
      { key: 'order.payment', label: 'Xác nhận đã chuyển khoản' },
      { key: 'order.invoice', label: 'Xem, in hóa đơn' },
    ],
  },
  {
    title: 'Xem dữ liệu',
    items: [
      { key: 'product.view', label: 'Xem sản phẩm' },
      { key: 'customer.view', label: 'Xem khách hàng' },
      { key: 'employee.view', label: 'Xem nhân viên' },
      { key: 'report.view', label: 'Xem doanh thu, báo cáo' },
    ],
  },
  {
    title: 'Tư vấn khách hàng',
    items: [
      { key: 'consult.view', label: 'Xem yêu cầu tư vấn' },
      { key: 'consult.update', label: 'Đánh dấu đã liên hệ' },
      { key: 'consult.delete', label: 'Xóa yêu cầu tư vấn' },
    ],
  },
];

export const ASSIGNABLE_PERMISSIONS = PERMISSION_GROUPS.flatMap((g) => g.items.map((i) => i.key));

/** Bật quyền bên trái thì phải có quyền bên phải mới dùng được */
export const PERMISSION_REQUIRES: Record<string, string> = {
  'order.confirm': 'order.view',
  'order.prepare': 'order.view',
  'order.ship': 'order.view',
  'order.deliver': 'order.view',
  'order.pickup': 'order.view',
  'order.cancel': 'order.view',
  'order.assign': 'order.view',
  'order.payment': 'order.view',
  'order.invoice': 'order.view',
  'consult.update': 'consult.view',
  'consult.delete': 'consult.view',
};
