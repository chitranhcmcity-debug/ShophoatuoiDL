/**
 * Server nhỏ của Hoa Tươi DL (cổng 3001). Dùng cho những việc KHÔNG được làm trong Angular
 * vì cần giữ khóa bí mật:
 *   - /api/chat            : tư vấn hoa bằng AI          (server/ai.mjs)
 *   - /api/payos/...       : thanh toán qua payOS        (server/payos.mjs)
 *
 * Chạy:  npm run backend   (hoặc npm run dev để chạy cùng json-server và Angular)
 * Cấu hình trong file .env (copy từ .env.example). Không cần cài thêm thư viện, chỉ cần Node.js >= 18.
 */
import { createServer } from 'node:http';
import { send } from './util.mjs'; // nạp .env trước tiên
import { handleChat, aiInfo } from './ai.mjs';
import * as payos from './payos.mjs';

const PORT = Number(process.env.BACKEND_PORT || process.env.AI_PORT || 3001);

createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const route = `${req.method} ${url.pathname}`;
  try {
    if (req.method === 'OPTIONS') return send(res, 204);
    switch (route) {
      case 'GET /api/health':
        return send(res, 200, { ok: true, ai: aiInfo(), payos: payos.info() });
      case 'POST /api/chat':
        return await handleChat(req, res);
      case 'POST /api/payos/create':
        return await payos.handleCreate(req, res);
      case 'GET /api/payos/verify':
        return await payos.handleVerify(req, res, url);
      case 'POST /api/payos/webhook':
        return await payos.handleWebhook(req, res);
    }
    send(res, 404, { error: 'Not found' });
  } catch (err) {
    console.error('[server]', err);
    send(res, 500, { error: 'Lỗi máy chủ' });
  }
}).listen(PORT, () => {
  const ai = aiInfo();
  console.log(`Backend Hoa Tươi DL chạy tại http://localhost:${PORT}`);
  console.log(`  - AI tư vấn : ${ai.provider} / ${ai.model}${ai.hasKey ? '' : '  ⚠ chưa có API key trong .env'}`);
  console.log(`  - payOS     : ${payos.info().configured ? 'đã cấu hình' : '⚠ chưa có PAYOS_* trong .env'}`);
});
