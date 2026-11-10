export interface SystemSettings {
  shopName: string;
  hotline: string;
  email: string;
  address: string;
  fastShippingFee: number; // phí giao nhanh 60 phút
  lowStockThreshold: number; // tồn kho dưới mức này thì cảnh báo sắp hết hàng
  allowCustomerCancel: boolean; // cho phép khách tự hủy đơn
  flashSaleEnd: string; // giờ kết thúc "Giá sốc hôm nay" mỗi ngày, dạng HH:mm
}

export const DEFAULT_SETTINGS: SystemSettings = {
  shopName: 'Hoa Tươi DL',
  hotline: '0909 123 456',
  email: 'hoatuoidl@gmail.com',
  address: '12 Nguyễn Văn Linh, Quận 7, TP. Hồ Chí Minh',
  fastShippingFee: 30000,
  lowStockThreshold: 15,
  allowCustomerCancel: true,
  flashSaleEnd: '23:59',
};
