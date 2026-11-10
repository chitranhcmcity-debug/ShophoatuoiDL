import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CartItem } from '../../interfaces/order';
import { CartService } from '../../services/cart';

@Component({
  selector: 'app-cart',
  imports: [RouterLink],
  templateUrl: './cart.html',
  styleUrl: './cart.css',
})
export class Cart {
  cartService = inject(CartService);
  carts = this.cartService.userCart; // dùng trực tiếp signal từ service
  shipping = 0; // miễn phí ship

  increaseQuantity(item: CartItem): void {
    this.cartService.updateQuantity(item, item.quantity + 1);
  }
  decreaseQuantity(item: CartItem): void {
    if (item.quantity > 1) {
      this.cartService.updateQuantity(item, item.quantity - 1);
    }
  }
  removeItem(item: CartItem): void {
    if (confirm('Bạn có muốn xóa sản phẩm này khỏi giỏ hàng?')) {
      this.cartService.removeCart(item);
    }
  }
  toggleBuy(item: CartItem) {
    this.cartService.toggleActive(item);
  }
  onSelectAllChange(event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    this.cartService.toggleActiveAll(checked);
  }

  // Tất cả đã được chọn hay chưa
  allSelected = computed(() => this.carts().length > 0 && this.carts().every((i) => i.active));
  // Tổng tiền các sản phẩm được chọn
  totalPrice = computed(() =>
    this.carts()
      .filter((i) => i.active)
      .reduce((sum, i) => sum + i.price * i.quantity, 0)
  );
  selectedCount = computed(() => this.carts().filter((i) => i.active).length);
}
