import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DEFAULT_SETTINGS, SystemSettings } from '../../interfaces/settings';
import { SettingsService } from '../../services/settings';

@Component({
  selector: 'app-settings',
  imports: [FormsModule],
  templateUrl: './settings.html',
})
export class Settings {
  private settingsService = inject(SettingsService);
  form: SystemSettings = { ...this.settingsService.settings() };
  message = signal('');

  save() {
    const f = this.form;
    if (!f.shopName.trim() || !f.hotline.trim() || !f.address.trim()) {
      alert('Vui lòng nhập tên shop, hotline và địa chỉ');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email)) {
      alert('Email không hợp lệ');
      return;
    }
    if (!(f.fastShippingFee >= 0) || !(f.lowStockThreshold >= 0)) {
      alert('Phí giao nhanh và mức cảnh báo tồn kho phải là số không âm');
      return;
    }
    this.settingsService.save({ ...f, fastShippingFee: Number(f.fastShippingFee), lowStockThreshold: Number(f.lowStockThreshold) });
    this.message.set('Đã lưu cấu hình hệ thống.');
  }

  reset() {
    if (!confirm('Đưa toàn bộ cấu hình về mặc định?')) return;
    this.settingsService.reset();
    this.form = { ...DEFAULT_SETTINGS };
    this.message.set('Đã khôi phục cấu hình mặc định.');
  }
}
