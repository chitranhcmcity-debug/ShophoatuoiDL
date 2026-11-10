# Hoa Tươi DL

Website bán hoa viết bằng Angular thuần (không back end). Môn: Lập trình giao diện web.

## Chạy

```
copy public\data\db.seed.json db.json
npm install
npm run dev      # http://localhost:4200
```

`db.json` chứa dữ liệu thật nên không đưa lên git, lần đầu chạy cần chép từ dữ liệu mẫu như trên.

## Tài khoản demo
| Vai trò | Username | Password | Quyền |
|---|---|---|---|
| Chủ shop | chushop | chushop123 | Toàn quyền, duy nhất được thêm/sửa/xóa sản phẩm và cấu hình giá |
| Quản trị web | admin | admin123 | Quản lý nhân viên, khách hàng, đơn hàng, dữ liệu; chỉ XEM sản phẩm |
| Nhân viên nhận hàng | user1 | 123456 | Xác nhận đơn, hủy đơn, xác nhận chuyển khoản, xác nhận khách nhận tại cửa hàng |
| Nhân viên cắm hoa | thutrang | 123456 | Xác nhận bước chuẩn bị hoa |
| Nhân viên giao hoa | quocbao | 123456 | Xác nhận đi giao và đã giao |
| Khách hàng | acb / ocb / hcb | 123456 | Mua hàng, quản lý tài khoản; không vào được trang quản trị |

Quyền định nghĩa trong `src/app/interfaces/permissions.ts` (dạng `product.update`, `order.view`...). Route `/dashboard/*` được chặn bằng `authGuard` + `permissionGuard`, nút thao tác ẩn theo `hasPermission`.

## Dữ liệu
- File JSON gốc: `public/data/*.json` (products, categories, users, employees, customers, orders).
- Khi app khởi động, `DataService` đọc các file này vào `localStorage` (nếu chưa có). Mọi thao tác thêm/sửa/xóa, giỏ hàng, đơn hàng lưu ở `localStorage` (trình duyệt không ghi được file).
- Dashboard có "Xuất file JSON" để tải dữ liệu hiện tại về, copy đè vào `public/data/` nếu muốn cập nhật dữ liệu gốc. "Reset dữ liệu" khôi phục về JSON gốc.
- Ảnh sản phẩm (72 ảnh) lấy từ Wikimedia Commons, giấy phép CC BY / CC BY-SA / CC0 / Public domain, lưu ở `public/image/products/`. Tác giả và giấy phép từng ảnh nằm trong `public/data/image-credits.json` (nên ghi nguồn này trong báo cáo).
- Sửa file JSON xong thì đổi `DATA_VERSION` trong `src/app/services/data.ts` để trình duyệt tự nạp lại dữ liệu.

## Tư vấn hoa bằng AI
Nút **Tư vấn AI** ở góc phải màn hình (trang khách). Khách hỏi tự nhiên, AI gợi ý sản phẩm có thật trong shop kèm thẻ sản phẩm bấm vào xem chi tiết.

Cài đặt:
1. Copy `.env.example` thành `.env`, điền API key:
   - Gemini: lấy key tại https://aistudio.google.com/apikey (để `AI_PROVIDER=gemini`)
   - hoặc Claude: lấy key tại https://console.anthropic.com/ (để `AI_PROVIDER=claude`)
2. Chạy `npm run dev` (chạy cả json-server cổng 3000, server AI cổng 3001 và Angular cổng 4200), hoặc chạy riêng `npm run ai`.

Cách hoạt động:
- `server/ai-server.mjs`: server Node nhỏ (không cần cài thêm thư viện) giữ API key, đọc sản phẩm từ `db.json`, gửi kèm danh sách sản phẩm cho AI, trả về câu trả lời + mã sản phẩm. API key **không** nằm trong code Angular.
- `src/app/services/ai-chat.ts` + `src/app/components/ai-chat/`: khung chat, lưu lịch sử trong phiên (sessionStorage).
- File `.env` đã được thêm vào `.gitignore`, không đưa key lên GitHub.

## Cấu trúc (theo phong cách các lab)
- `interfaces/` – Product, Category, User, Employee, Customer, CartItem, Order
- `services/` – storage, data, product, auth, cart, checkout, customer, employee (signal + localStorage)
- `guards/` – `authGuard` (dashboard), `loginGuard` (giỏ hàng, thanh toán)
- `components/` – header, footer, product-card
- `pages/` – home, product-list (lọc, sắp xếp, phân trang), product-detail, cart, checkout, signin, signup, my-orders
- `dashboard/` – layout, overview, products (CRUD), orders, employees (CRUD), customers (CRUD)
