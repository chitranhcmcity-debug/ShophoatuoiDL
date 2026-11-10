import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { Auth } from '../../services/auth';
import { CartService } from '../../services/cart';
import { SettingsService } from '../../services/settings';
import { ProductService } from '../../services/product';
import { NotificationBell } from '../notification-bell/notification-bell';

@Component({
  selector: 'app-header',
  imports: [RouterLink, RouterLinkActive, FormsModule, NotificationBell],
  templateUrl: './header.html',
  styleUrl: './header.css',
})
export class Header {
  searching: string = '';
  showCategories = signal(false);
  private productService = inject(ProductService);
  private router = inject(Router);
  authService = inject(Auth);
  cartService = inject(CartService);
  settings = inject(SettingsService).settings;
  categories = this.productService.getCategories();

  onSearch() {
    this.productService.onSearch(this.searching);
    this.router.navigate(['/san-pham'], { queryParams: { q: this.searching || null } });
  }

  toggleCategories() {
    this.showCategories.update((v) => !v);
  }
  closeCategories() {
    this.showCategories.set(false);
  }
}
