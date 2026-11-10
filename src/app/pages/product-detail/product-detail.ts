import { Component, OnInit, computed, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ProductCard } from '../../components/product-card/product-card';
import { CartService } from '../../services/cart';
import { ProductService } from '../../services/product';

@Component({
  selector: 'app-product-detail',
  imports: [RouterLink, ProductCard],
  templateUrl: './product-detail.html',
  styleUrl: './product-detail.css',
})
export class ProductDetail implements OnInit {
  productId = signal<string>('');
  product = computed(() => this.productService.products().find((p) => p.id === this.productId()));
  category = computed(() => {
    const p = this.product();
    return p ? this.productService.getCategory(p.category) : undefined;
  });
  related = computed(() => {
    const p = this.product();
    return p
      ? this.productService.products().filter((x) => x.category === p.category && x.id !== p.id).slice(0, 4)
      : [];
  });
  quantity = signal(1);

  constructor(
    public productService: ProductService,
    private route: ActivatedRoute,
    private cartService: CartService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.route.paramMap.subscribe((params) => {
      const id = params.get('id');
      if (id) {
        this.productId.set(id);
        this.quantity.set(1);
        this.productService.increaseView(id);
      }
    });
    // Cuộn lên đầu trang khi vào trang chi tiết
    if (typeof window !== 'undefined') {
      window.scrollTo(0, 0);
    }
  }

  increaseQuantity() {
    const p = this.product();
    if (p && this.quantity() < p.stock) this.quantity.update((q) => q + 1);
  }
  decreaseQuantity() {
    if (this.quantity() > 1) this.quantity.update((q) => q - 1);
  }
  addToCart() {
    const p = this.product();
    if (p) this.cartService.addToCart(p, this.quantity());
  }
  buyNow() {
    const p = this.product();
    if (p && this.cartService.addToCart(p, this.quantity())) {
      this.router.navigate(['/cart']);
    }
  }
}
