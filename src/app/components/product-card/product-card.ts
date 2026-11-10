import { Component, ElementRef, OnDestroy, OnInit, input } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { Product } from '../../interfaces/product';
import { CartService } from '../../services/cart';
import { ProductService } from '../../services/product';

@Component({
  selector: 'app-product-card',
  imports: [RouterLink],
  templateUrl: './product-card.html',
  styleUrl: './product-card.css',
})
export class ProductCard implements OnInit, OnDestroy {
  product = input.required<Product>();
  private observer?: IntersectionObserver;

  constructor(
    public productService: ProductService,
    private cartService: CartService,
    private router: Router,
    private host: ElementRef<HTMLElement>
  ) {}

  ngOnInit() {
    const el = this.host.nativeElement;
    el.classList.add('reveal');
    if (typeof IntersectionObserver === 'undefined') {
      el.classList.add('visible');
      return;
    }
    // Trễ nhẹ theo vị trí trong hàng để các card hiện lần lượt
    const index = el.parentElement ? Array.from(el.parentElement.children).indexOf(el) : 0;
    el.style.transitionDelay = `${(index % 4) * 100}ms`;
    this.observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.classList.add('visible');
          this.observer?.disconnect();
        }
      },
      { threshold: 0.1 }
    );
    this.observer.observe(el);
  }

  ngOnDestroy() {
    this.observer?.disconnect();
  }

  buyNow() {
    if (this.cartService.addToCart(this.product(), 1)) {
      this.router.navigate(['/cart']);
    }
  }
  favorite() {
    this.productService.favorite(this.product().id);
  }
}
