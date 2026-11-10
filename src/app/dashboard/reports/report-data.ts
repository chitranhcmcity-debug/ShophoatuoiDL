import { Order } from '../../interfaces/order';
import { localDate } from '../../utils/date';

export interface DayRow {
  date: string; // YYYY-MM-DD
  revenue: number;
  orders: number;
}

export interface GroupRow {
  name: string;
  quantity: number;
  revenue: number;
}

export interface Report {
  revenue: number;
  delivered: number;
  cancelled: number;
  average: number;
  days: DayRow[];
  products: GroupRow[];
  categories: GroupRow[];
  orders: { id: string; date: string; customer: string; total: number; payment: string }[];
}

/** Ngày đơn đạt một trạng thái, lấy theo lịch sử xử lý */
function dateOfStatus(order: Order, status: string): string {
  const entry = [...(order.history ?? [])].reverse().find((h) => h.status === status);
  return localDate(new Date(entry?.time ?? order.createdAt));
}

function eachDay(from: string, to: string): string[] {
  const days: string[] = [];
  const cursor = new Date(`${from}T00:00:00`);
  for (let day = from; day <= to; day = localDate(cursor)) {
    days.push(day);
    cursor.setDate(cursor.getDate() + 1);
  }
  return days;
}

function addTo(groups: Map<string, GroupRow>, key: string, name: string, quantity: number, revenue: number) {
  const row = groups.get(key) ?? { name, quantity: 0, revenue: 0 };
  row.quantity += quantity;
  row.revenue += revenue;
  groups.set(key, row);
}

const ranked = (groups: Map<string, GroupRow>) => [...groups.values()].sort((a, b) => b.revenue - a.revenue);

/** Doanh thu chỉ tính đơn đã giao, theo ngày giao xong; đơn hủy tính theo ngày hủy */
export function buildReport(orders: Order[], from: string, to: string, categoryOf: (productId: string) => string): Report {
  const inRange = (date: string) => date >= from && date <= to;
  const delivered = orders.filter((o) => o.status === 'Đã giao' && inRange(dateOfStatus(o, 'Đã giao')));
  const cancelled = orders.filter((o) => o.status === 'Đã hủy' && inRange(dateOfStatus(o, 'Đã hủy')));

  const byDay = new Map(eachDay(from, to).map((date) => [date, { date, revenue: 0, orders: 0 }]));
  const products = new Map<string, GroupRow>();
  const categories = new Map<string, GroupRow>();
  for (const order of delivered) {
    const day = byDay.get(dateOfStatus(order, 'Đã giao'))!;
    day.revenue += order.total;
    day.orders += 1;
    for (const item of order.items) {
      const amount = item.price * item.quantity;
      addTo(products, item.productId, item.title, item.quantity, amount);
      const category = categoryOf(item.productId);
      addTo(categories, category, category, item.quantity, amount);
    }
  }

  const revenue = delivered.reduce((sum, o) => sum + o.total, 0);
  return {
    revenue,
    delivered: delivered.length,
    cancelled: cancelled.length,
    average: delivered.length ? Math.round(revenue / delivered.length) : 0,
    days: [...byDay.values()],
    products: ranked(products),
    categories: ranked(categories),
    orders: delivered
      .map((o) => ({ id: o.id, date: dateOfStatus(o, 'Đã giao'), customer: o.fullname, total: o.total, payment: o.paymentMethod ?? '' }))
      .sort((a, b) => a.date.localeCompare(b.date)),
  };
}

/** Ô CSV: chữ được bọc ngoặc; ô bắt đầu bằng ký tự công thức được vô hiệu để Excel không chạy lệnh */
function cell(value: string | number): string {
  if (typeof value === 'number') return String(value);
  const safe = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  return `"${safe.replace(/"/g, '""')}"`;
}

export function reportCsv(report: Report, from: string, to: string): string {
  const rows: (string | number)[][] = [
    ['BÁO CÁO DOANH THU', `Từ ${from} đến ${to}`],
    [],
    ['Tổng doanh thu', report.revenue],
    ['Đơn đã giao', report.delivered],
    ['Đơn đã hủy', report.cancelled],
    ['Giá trị trung bình mỗi đơn', report.average],
    [],
    ['DOANH THU THEO NGÀY'],
    ['Ngày', 'Số đơn', 'Doanh thu'],
    ...report.days.map((d) => [d.date, d.orders, d.revenue]),
    [],
    ['THEO SẢN PHẨM'],
    ['Sản phẩm', 'Số lượng', 'Doanh thu'],
    ...report.products.map((p) => [p.name, p.quantity, p.revenue]),
    [],
    ['THEO DANH MỤC'],
    ['Danh mục', 'Số lượng', 'Doanh thu'],
    ...report.categories.map((c) => [c.name, c.quantity, c.revenue]),
    [],
    ['CHI TIẾT ĐƠN ĐÃ GIAO'],
    ['Mã đơn', 'Ngày giao', 'Người nhận', 'Thanh toán', 'Tổng tiền'],
    ...report.orders.map((o) => [o.id, o.date, o.customer, o.payment, o.total]),
  ];
  // BOM để Excel nhận đúng tiếng Việt
  return '﻿' + rows.map((r) => r.map(cell).join(',')).join('\r\n');
}
