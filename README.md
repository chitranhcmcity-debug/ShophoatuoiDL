# Hoa Tươi DL

Website bán hoa viết bằng Angular thuần (không back end). Môn: Lập trình giao diện web.

## Chạy

```
npm install
npm start        # http://localhost:4200
```

## Tài khoản demo
| Vai trò | Username | Password | Quyền |
|---|---|---|---|
| Chủ shop | chushop | chushop123 | Toàn quyền, duy nhất được thêm/sửa/xóa sản phẩm và cấu hình giá |
| Quản trị web | admin | admin123 | Quản lý nhân viên, khách hàng, đơn hàng, dữ liệu; chỉ XEM sản phẩm |
| Nhân viên | user1 / thutrang / quocbao | 123456 | Chỉ XEM, không thêm/sửa/xóa |
| Khách hàng | acb / ocb / hcb | 123456 | Mua hàng, quản lý tài khoản; không vào được trang quản trị |

Quyền định nghĩa trong `src/app/interfaces/permissions.ts` (dạng `product.update`, `order.view`...). Route `/dashboard/*` được chặn bằng `authGuard` + `permissionGuard`, nút thao tác ẩn theo `hasPermission`.

## Dữ liệu
- File JSON gốc: `public/data/*.json` (products, categories, users, employees, customers, orders).
- Khi app khởi động, `DataService` đọc các file này vào `localStorage` (nếu chưa có). Mọi thao tác thêm/sửa/xóa, giỏ hàng, đơn hàng lưu ở `localStorage` (trình duyệt không ghi được file).
- Dashboard có "Xuất file JSON" để tải dữ liệu hiện tại về, copy đè vào `public/data/` nếu muốn cập nhật dữ liệu gốc. "Reset dữ liệu" khôi phục về JSON gốc.
- Ảnh sản phẩm (72 ảnh) lấy từ Wikimedia Commons, giấy phép CC BY / CC BY-SA / CC0 / Public domain, lưu ở `public/image/products/`. Tác giả và giấy phép từng ảnh nằm trong `public/data/image-credits.json` (nên ghi nguồn này trong báo cáo).
- Sửa file JSON xong thì đổi `DATA_VERSION` trong `src/app/services/data.ts` để trình duyệt tự nạp lại dữ liệu.

## Cấu trúc (theo phong cách các lab)
- `interfaces/` – Product, Category, User, Employee, Customer, CartItem, Order
- `services/` – storage, data, product, auth, cart, checkout, customer, employee (signal + localStorage)
- `guards/` – `authGuard` (dashboard), `loginGuard` (giỏ hàng, thanh toán)
- `components/` – header, footer, product-card
- `pages/` – home, product-list (lọc, sắp xếp, phân trang), product-detail, cart, checkout, signin, signup, my-orders
- `dashboard/` – layout, overview, products (CRUD), orders, employees (CRUD), customers (CRUD)
