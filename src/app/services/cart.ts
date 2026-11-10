import { Injectable, computed, signal } from '@angular/core';
import { CartItem } from '../interfaces/order';
import { Product } from '../interfaces/product';
import { Auth } from './auth';
import { StorageService } from './storage';

@Injectable({ providedIn: 'root' })
export class CartService {
  carts = signal<CartItem[]>([]);
  /** Giỏ hàng của user hiện tại */
  userCart = computed(() => {
    const u = this.authService.user();
    return u ? this.carts().filter((i) => i.userId === u.id) : [];
  });
  count = computed(() => this.userCart().reduce((s, i) => s + i.quantity, 0));

  constructor(private storageService: StorageService, private authService: Auth) {
    this.carts.set(storageService.getOrCreate<CartItem[]>('cart', []));
    storageService.watch('cart', () => this.carts.set(storageService.get<CartItem[]>('cart') ?? []));
  }

  private commit(list: CartItem[]) {
    this.carts.set(list);
    this.storageService.set('cart', list);
  }

  getUserCart() {
    return this.userCart();
  }

  addToCart(product: Product, quantity: number): boolean {
    const u = this.authService.user();
    if (!u) {
      alert('Vui lòng đăng nhập để thêm sản phẩm vào giỏ hàng!');
      return false;
    }
    const existing = this.carts().find((i) => i.userId === u.id && i.productId === product.id);
    if (existing) {
      this.commit(this.carts().map((i) => (i.id === existing.id ? { ...i, quantity: i.quantity + quantity } : i)));
    } else {
      this.commit([
        ...this.carts(),
        {
          id: 'c' + Date.now(),
          userId: u.id!,
          productId: product.id,
          title: product.title,
          image: product.image,
          price: product.price - (product.price * product.discount) / 100,
          discount: product.discount,
          quantity,
          active: true,
        },
      ]);
    }
    alert(`Đã thêm ${quantity} sản phẩm vào giỏ hàng!`);
    return true;
  }

  updateQuantity(item: CartItem, quantity: number) {
    const u = this.authService.user();
    if (!u) return;
    this.commit(this.carts().map((i) => (i.id === item.id && i.userId === u.id ? { ...i, quantity } : i)));
  }
  removeCart(item: CartItem) {
    const u = this.authService.user();
    if (!u) return;
    this.commit(this.carts().filter((i) => !(i.id === item.id && i.userId === u.id)));
  }
  toggleActive(item: CartItem) {
    const u = this.authService.user();
    if (!u) return;
    this.commit(this.carts().map((i) => (i.id === item.id && i.userId === u.id ? { ...i, active: !i.active } : i)));
  }
  toggleActiveAll(active: boolean) {
    const u = this.authService.user();
    if (!u) return;
    this.commit(this.carts().map((i) => (i.userId === u.id ? { ...i, active } : i)));
  }
  /** Xóa các sản phẩm đã chọn sau khi thanh toán */
  removeActive() {
    const u = this.authService.user();
    if (!u) return;
    this.commit(this.carts().filter((i) => !(i.userId === u.id && i.active)));
  }
}
