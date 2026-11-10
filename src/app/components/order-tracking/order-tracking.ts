import { DatePipe } from '@angular/common';
import { Component, computed, input } from '@angular/core';
import { ORDER_CANCELLED, Order, flowOf } from '../../interfaces/order';

type StepState = 'done' | 'current' | 'pending' | 'cancelled';

@Component({
  selector: 'app-order-tracking',
  imports: [DatePipe],
  templateUrl: './order-tracking.html',
  styleUrl: './order-tracking.css',
})
export class OrderTracking {
  order = input.required<Order>();

  /** Danh sách các bước hiển thị + trạng thái từng bước */
  steps = computed(() => {
    const o = this.order();
    const flow = flowOf(o);
    const history = o.history ?? [];
    const timeOf = (status: string) => history.find((h) => h.status === status);
    const cancelled = o.status === ORDER_CANCELLED.status;

    // bước cuối cùng đã đạt được trong quy trình
    let reached = flow.findIndex((s) => s.status === o.status);
    if (cancelled) {
      reached = Math.max(-1, ...flow.map((s, i) => (timeOf(s.status) ? i : -1)));
    }

    const list = flow.map((s, i) => {
      let state: StepState = 'pending';
      if (i < reached || (i === reached && (cancelled || o.status === 'Đã giao'))) state = 'done';
      else if (i === reached) state = 'current';
      return { ...s, state, entry: timeOf(s.status) };
    });

    if (cancelled) {
      // đơn bị hủy: chỉ hiện các bước đã qua rồi tới bước "Đã hủy"
      const passed = list.slice(0, reached + 1);
      return [...passed, { ...ORDER_CANCELLED, state: 'cancelled' as StepState, entry: timeOf(ORDER_CANCELLED.status) }];
    }
    return list;
  });

  /** % hoàn thành của quy trình */
  progress = computed(() => {
    const o = this.order();
    if (o.status === ORDER_CANCELLED.status) return 100;
    const flow = flowOf(o);
    const idx = flow.findIndex((s) => s.status === o.status);
    return Math.round(((idx + 1) / flow.length) * 100);
  });

  isCancelled = computed(() => this.order().status === ORDER_CANCELLED.status);
}
