/**
 * Server tư vấn hoa bằng AI cho Hoa Tươi DL.
 *
 * Vì sao cần server riêng? API key của AI KHÔNG được để trong code Angular
 * (ai mở F12 cũng lấy được). Server này giữ key trong file .env, nhận câu hỏi
 * từ trang web, gửi kèm danh sách sản phẩm của shop cho AI rồi trả lời lại.
 *
 * Chạy:  npm run ai      (cổng 3001)
 * Cấu hình trong file .env (copy từ .env.example).
 * Không cần cài thêm thư viện: chỉ dùng Node.js (>= 18) có sẵn fetch.
 */
import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

// ---------- Đọc file .env (không cần thư viện dotenv) ----------
const envFile = join(ROOT, '.env');
if (existsSync(envFile)) {
  for (const line of readFileSync(envFile, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
}

const PORT = Number(process.env.AI_PORT || 3001);
const PROVIDER = (process.env.AI_PROVIDER || 'gemini').toLowerCase(); // gemini | claude
const MODEL =
  process.env.AI_MODEL || (PROVIDER === 'claude' ? 'claude-haiku-5-5' : 'gemini-flash-latest');
const API_KEY = PROVIDER === 'claude' ? process.env.ANTHROPIC_API_KEY : process.env.GEMINI_API_KEY;

// ---------- Dữ liệu shop: đọc trực tiếp db.json (json-server cũng ghi vào file này) ----------
function loadShop() {
  const db = JSON.parse(readFileSync(join(ROOT, 'db.json'), 'utf8'));
  const cats = Object.fromEntries((db.categories || []).map((c) => [c.slug, c.name]));
  const products = (db.products || []).map((p) => ({
    ...p,
    finalPrice: Math.round(p.price - (p.price * (p.discount || 0)) / 100),
    categoryName: cats[p.category] || p.category,
  }));
  return { products, settings: db.settings || {} };
}

function buildSystemPrompt({ products, settings }) {
  const vnd = (n) => n.toLocaleString('vi-VN') + 'đ';
  const catalog = products
    .filter((p) => p.stock > 0)
    .map(
      (p) =>
        `${p.id} | ${p.title} | ${p.categoryName} | ${vnd(p.finalPrice)}` +
        (p.discount ? ` (giảm ${p.discount}% từ ${vnd(p.price)})` : '') +
        ` | còn ${p.stock}` +
        (p.freeship ? ' | freeship' : '') +
        ` | đã bán ${p.sold}`
    )
    .join('\n');

  return `Bạn là nhân viên tư vấn hoa của shop "${settings.shopName || 'Hoa Tươi DL'}".
Hotline: ${settings.hotline || ''}. Địa chỉ: ${settings.address || ''}. Phí giao nhanh: ${vnd(settings.fastShippingFee || 0)}.

NHIỆM VỤ: giúp khách chọn hoa phù hợp dịp tặng, người nhận, ngân sách, sở thích; giải thích ngắn gọn ý nghĩa loài hoa/màu hoa khi hữu ích.

QUY TẮC BẮT BUỘC:
1. Chỉ gợi ý sản phẩm có trong DANH SÁCH SẢN PHẨM bên dưới. Không bịa tên, giá hay sản phẩm khác.
2. Khi nhắc tới sản phẩm, viết đúng mã trong ngoặc vuông kép, ví dụ [[p01]], để web hiển thị thẻ sản phẩm. Mỗi câu trả lời gợi ý tối đa 3 sản phẩm.
3. Giá dùng đúng giá sau giảm trong danh sách. Nếu không có món nào vừa ngân sách, nói thật và gợi ý món gần nhất.
4. Nếu khách chưa nói dịp tặng hoặc ngân sách, hỏi lại 1 câu ngắn trước khi gợi ý (nhưng nếu khách đã nói đủ thì gợi ý luôn).
5. Trả lời bằng tiếng Việt, thân thiện, ngắn gọn (dưới 120 từ), không dùng markdown tiêu đề, không dùng bảng.
6. Câu hỏi không liên quan đến hoa/shop: từ chối nhẹ nhàng và quay lại tư vấn hoa.
7. Đơn hàng, khiếu nại, đổi trả: hướng dẫn khách gọi hotline.

DANH SÁCH SẢN PHẨM (mã | tên | danh mục | giá bán | tồn kho | ưu đãi | đã bán):
${catalog}`;
}

// ---------- Gọi AI ----------
async function askGemini(system, messages) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': API_KEY },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: system }] },
      contents: messages.map((m) => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
      })),
      generationConfig: { temperature: 0.6, maxOutputTokens: 800 },
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message || `Gemini lỗi ${res.status}`);
  return (data.candidates?.[0]?.content?.parts || []).map((p) => p.text || '').join('').trim();
}

async function askClaude(system, messages) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({ model: MODEL, max_tokens: 800, system, messages }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message || `Claude lỗi ${res.status}`);
  return (data.content || []).filter((b) => b.type === 'text').map((b) => b.text).join('').trim();
}

// ---------- Chống spam đơn giản: tối đa 20 câu hỏi / phút / IP ----------
const hits = new Map();
function tooMany(ip) {
  const now = Date.now();
  const list = (hits.get(ip) || []).filter((t) => now - t < 60_000);
  list.push(now);
  hits.set(ip, list);
  return list.length > 20;
}

// ---------- HTTP server ----------
function send(res, status, body) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  });
  res.end(body === undefined ? '' : JSON.stringify(body));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', (c) => {
      raw += c;
      if (raw.length > 50_000) reject(new Error('Nội dung quá dài'));
    });
    req.on('end', () => {
      try {
        resolve(JSON.parse(raw || '{}'));
      } catch {
        reject(new Error('JSON không hợp lệ'));
      }
    });
  });
}

createServer(async (req, res) => {
  if (req.method === 'OPTIONS') return send(res, 204);

  if (req.method === 'GET' && req.url === '/api/health') {
    return send(res, 200, { ok: true, provider: PROVIDER, model: MODEL, hasKey: !!API_KEY });
  }

  if (req.method === 'POST' && req.url === '/api/chat') {
    if (!API_KEY) {
      return send(res, 500, {
        error: `Chưa có API key. Mở file .env và điền ${PROVIDER === 'claude' ? 'ANTHROPIC_API_KEY' : 'GEMINI_API_KEY'}.`,
      });
    }
    if (tooMany(req.socket.remoteAddress)) {
      return send(res, 429, { error: 'Bạn hỏi nhanh quá, đợi một chút rồi thử lại nhé.' });
    }
    try {
      const body = await readBody(req);
      // Chỉ giữ 10 tin gần nhất, mỗi tin tối đa 1000 ký tự; tin đầu tiên phải là của khách
      let messages = (Array.isArray(body.messages) ? body.messages : [])
        .filter((m) => (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string' && m.content.trim())
        .map((m) => ({ role: m.role, content: m.content.slice(0, 1000) }))
        .slice(-10);
      while (messages.length && messages[0].role !== 'user') messages.shift();
      if (!messages.length) return send(res, 400, { error: 'Thiếu câu hỏi' });

      const shop = loadShop();
      const system = buildSystemPrompt(shop);
      const reply = PROVIDER === 'claude' ? await askClaude(system, messages) : await askGemini(system, messages);

      // Lấy các mã sản phẩm AI nhắc tới, chỉ giữ mã có thật
      const ids = [...new Set([...reply.matchAll(/\[\[(\w+)\]\]/g)].map((m) => m[1]))];
      const valid = new Set(shop.products.map((p) => p.id));
      return send(res, 200, { reply, productIds: ids.filter((id) => valid.has(id)) });
    } catch (err) {
      console.error('[AI]', err.message);
      return send(res, 502, { error: 'AI đang bận hoặc gặp lỗi, bạn thử lại sau nhé.' });
    }
  }

  send(res, 404, { error: 'Not found' });
}).listen(PORT, () => {
  console.log(`AI tư vấn hoa chạy tại http://localhost:${PORT}  (provider: ${PROVIDER}, model: ${MODEL})`);
  if (!API_KEY) console.warn('⚠ Chưa có API key trong file .env, chat sẽ báo lỗi.');
});
