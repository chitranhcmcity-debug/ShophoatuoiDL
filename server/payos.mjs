/**
 * Thanh toán qua payOS (https://payos.vn): khách quét mã VietQR, payOS báo về khi tiền đã vào.
 *
 * Luồng:
 *  1. Angular tạo đơn hàng (json-server) với paymentMethod = 'payos'.
 *  2. Angular gọi POST /api/payos/create { orderId }.
 *     Server lấy đơn từ json-server (KHÔNG tin số tiền do trình duyệt gửi), ký bằng CHECKSUM KEY,
 *     gọi payOS tạo link thanh toán, trả về checkoutUrl -> Angular chuyển khách sang trang payOS.
 *  3. Khách trả xong, payOS đưa khách về /payment-result?orderId=... của web.
 *     Trang đó gọi GET /api/payos/verify?orderId=... : server hỏi lại payOS trạng thái thật
 *     rồi cập nhật đơn "Đã thanh toán". (Cách này chạy được ngay trên localhost.)
 *  4. (Tùy chọn) POST /api/payos/webhook: payOS tự báo về server khi có tiền.
 *     Chỉ dùng được khi server có địa chỉ public (deploy hoặc ngrok).
 */
import { createHmac, timingSafeEqual } from 'node:crypto';
import { send, readBody } from './util.mjs';

const CLIENT_ID = process.env.PAYOS_CLIENT_ID;
const API_KEY = process.env.PAYOS_API_KEY;
const CHECKSUM_KEY = process.env.PAYOS_CHECKSUM_KEY;
const PAYOS_URL = 'https://api-merchant.payos.vn';
const DB_URL = process.env.JSON_SERVER_URL || 'http://localhost:3000';
const WEB_URL = process.env.WEB_URL || 'http://localhost:4200';

export const info = () => ({ configured: !!(CLIENT_ID && API_KEY && CHECKSUM_KEY) });

export const PAYMENT = { UNPAID: 'Chưa thanh toán', PAID: 'Đã thanh toán', CANCELLED: 'Hủy thanh toán' };

// ---------- Chữ ký ----------
const hmac = (text) => createHmac('sha256', CHECKSUM_KEY).update(text).digest('hex');

/** Chữ ký khi tạo link: các trường xếp theo thứ tự chữ cái */
function signCreate({ amount, cancelUrl, description, orderCode, returnUrl }) {
  return hmac(`amount=${amount}&cancelUrl=${cancelUrl}&description=${description}&orderCode=${orderCode}&returnUrl=${returnUrl}`);
}

/** Chữ ký dữ liệu webhook: sắp xếp key theo a-z, nối dạng key=value&... */
function signData(data) {
  const text = Object.keys(data)
    .sort()
    .map((k) => {
      let v = data[k];
      if (v === null || v === undefined || v === 'null' || v === 'undefined') v = '';
      else if (Array.isArray(v)) v = JSON.stringify(v.map((x) => (typeof x === 'object' ? sortObj(x) : x)));
      else if (typeof v === 'object') v = JSON.stringify(sortObj(v));
      return `${k}=${v}`;
    })
    .join('&');
  return hmac(text);
}
const sortObj = (o) => Object.fromEntries(Object.keys(o).sort().map((k) => [k, o[k]]));

function sameSignature(a, b) {
  const x = Buffer.from(String(a || ''));
  const y = Buffer.from(String(b || ''));
  return x.length === y.length && timingSafeEqual(x, y);
}

// ---------- Gọi payOS ----------
async function payosFetch(path, options = {}) {
  const res = await fetch(PAYOS_URL + path, {
    ...options,
    headers: { 'Content-Type': 'application/json', 'x-client-id': CLIENT_ID, 'x-api-key': API_KEY },
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json.code !== '00') throw new Error(json.desc || `payOS lỗi ${res.status}`);
  return json.data;
}

// ---------- Đọc / ghi đơn hàng trong json-server ----------
async function getOrder(id) {
  const res = await fetch(`${DB_URL}/orders/${encodeURIComponent(id)}`);
  if (!res.ok) return null;
  return res.json();
}
async function findOrderByCode(orderCode) {
  const res = await fetch(`${DB_URL}/orders?payosOrderCode=${orderCode}`);
  const list = res.ok ? await res.json() : [];
  return list[0] || null;
}
async function patchOrder(id, data) {
  const res = await fetch(`${DB_URL}/orders/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Không cập nhật được đơn hàng');
  return res.json();
}

/** Ghi trạng thái thanh toán vào đơn (chỉ ghi khi có thay đổi) */
async function setPaymentStatus(order, paymentStatus, note) {
  if (order.paymentStatus === paymentStatus) return order;
  const time = new Date().toISOString();
  const history = [...(order.history || []), { status: order.status, time, by: 'payOS', note }];
  const data = { paymentStatus, history };
  if (paymentStatus === PAYMENT.PAID) data.paidAt = time;
  return patchOrder(order.id, data);
}

/** Map trạng thái của payOS sang trạng thái thanh toán của shop */
function mapStatus(payosStatus) {
  if (payosStatus === 'PAID') return PAYMENT.PAID;
  if (payosStatus === 'CANCELLED' || payosStatus === 'EXPIRED') return PAYMENT.CANCELLED;
  return PAYMENT.UNPAID; // PENDING, PROCESSING
}

// ---------- Endpoint ----------

/** POST /api/payos/create { orderId } -> { checkoutUrl } */
export async function handleCreate(req, res) {
  if (!info().configured) {
    return send(res, 500, { error: 'Chưa cấu hình payOS. Điền PAYOS_CLIENT_ID, PAYOS_API_KEY, PAYOS_CHECKSUM_KEY trong file .env.' });
  }
  const { orderId } = await readBody(req);
  const order = orderId && (await getOrder(orderId));
  if (!order) return send(res, 404, { error: 'Không tìm thấy đơn hàng' });
  if (order.paymentStatus === PAYMENT.PAID) return send(res, 400, { error: 'Đơn hàng này đã được thanh toán' });
  if (order.status === 'Đã hủy') return send(res, 400, { error: 'Đơn hàng đã bị hủy' });

  // Mỗi lần tạo link cần orderCode (số nguyên) mới, kể cả khi khách thanh toán lại
  const orderCode = Number(String(Date.now()).slice(-9));
  const amount = Math.round(order.total);
  // Nội dung chuyển khoản: tối đa 9 ký tự cho tài khoản không liên kết qua payOS
  const description = `HTDL${String(order.id).replace(/\D/g, '')}`.slice(0, 9);
  const base = (req.headers.origin || WEB_URL).replace(/\/$/, '');
  const back = `${base}/payment-result?orderId=${encodeURIComponent(order.id)}`;
  const body = { orderCode, amount, description, returnUrl: back, cancelUrl: back };

  try {
    const data = await payosFetch('/v2/payment-requests', {
      method: 'POST',
      body: JSON.stringify({
        ...body,
        buyerName: order.fullname,
        buyerPhone: order.phone,
        items: (order.items || []).map((i) => ({ name: i.title, quantity: i.quantity, price: Math.round(i.price) })),
        expiredAt: Math.floor(Date.now() / 1000) + 15 * 60, // link hết hạn sau 15 phút
        signature: signCreate(body),
      }),
    });
    await patchOrder(order.id, {
      paymentMethod: 'payos',
      paymentStatus: PAYMENT.UNPAID,
      payosOrderCode: orderCode,
      payosLinkId: data.paymentLinkId,
    });
    return send(res, 200, { checkoutUrl: data.checkoutUrl });
  } catch (err) {
    console.error('[payOS] tạo link:', err.message);
    return send(res, 502, { error: `Không tạo được link thanh toán: ${err.message}` });
  }
}

/** GET /api/payos/verify?orderId=... -> hỏi payOS trạng thái thật rồi cập nhật đơn */
export async function handleVerify(req, res, url) {
  if (!info().configured) return send(res, 500, { error: 'Chưa cấu hình payOS' });
  const order = await getOrder(url.searchParams.get('orderId') || '');
  if (!order) return send(res, 404, { error: 'Không tìm thấy đơn hàng' });
  if (!order.payosOrderCode) return send(res, 400, { error: 'Đơn này chưa tạo thanh toán payOS' });
  if (order.paymentStatus === PAYMENT.PAID) return send(res, 200, { paymentStatus: order.paymentStatus, order });

  try {
    const data = await payosFetch(`/v2/payment-requests/${order.payosOrderCode}`);
    const status = mapStatus(data.status);
    const note =
      status === PAYMENT.PAID
        ? `Đã nhận ${Number(data.amountPaid || data.amount).toLocaleString('vi-VN')}đ qua payOS`
        : status === PAYMENT.CANCELLED
          ? 'Khách hủy hoặc link thanh toán hết hạn'
          : '';
    const updated = status === PAYMENT.UNPAID ? order : await setPaymentStatus(order, status, note);
    return send(res, 200, { paymentStatus: updated.paymentStatus ?? status, payosStatus: data.status, order: updated });
  } catch (err) {
    console.error('[payOS] kiểm tra:', err.message);
    return send(res, 502, { error: `Không kiểm tra được thanh toán: ${err.message}` });
  }
}

/** POST /api/payos/webhook -> payOS tự báo khi có tiền vào (cần server public) */
export async function handleWebhook(req, res) {
  const body = await readBody(req);
  if (!body.data || !sameSignature(signData(body.data), body.signature)) {
    return send(res, 400, { error: 'Chữ ký không hợp lệ' });
  }
  // payOS gửi thử khi bạn lưu địa chỉ webhook -> chỉ cần trả 200
  const order = await findOrderByCode(body.data.orderCode);
  if (order && body.data.code === '00') {
    await setPaymentStatus(order, PAYMENT.PAID, `Đã nhận ${Number(body.data.amount).toLocaleString('vi-VN')}đ qua payOS (webhook)`);
  }
  return send(res, 200, { success: true });
}
