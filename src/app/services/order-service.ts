import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { AuthService } from './auth-service';
import { AccountDatasetService } from './account-dataset-service';

export interface OrderCheckoutItem {
  id: string;
  name: string;
  category: string;
  price: number;
  image: string;
  rating: number;
  description: string;
  stock: number;
  quantity: number;
}

export interface OrderRecord {
  id: string;
  code: string;
  status: string;
  statusLabel: string;
  paymentMethod: string;
  createdAt: string;
  total: number;
  recipientName: string;
  recipientPhone: string;
  shippingAddress: string;
  items: Array<{ name: string; quantity: number; price: number; image: string }>;
}

interface ApiEnvelope<T> {
  EC?: number;
  EM?: string;
  DT?: T;
}

const API_BASE = 'http://localhost:8080/api/v1';

@Injectable({ providedIn: 'root' })
export class OrderService {
  constructor(
    private readonly http: HttpClient,
    private readonly authService: AuthService,
    private readonly accountDataset: AccountDatasetService,
  ) {}

  checkoutAuthenticated(payload: {
    addressId: string;
    paymentMethod: string;
    voucherCode: string;
    note: string;
    items: OrderCheckoutItem[];
  }): Observable<unknown> {
    return this.http.post<unknown>(`${API_BASE}/orders/checkout`, {
      address_id: payload.addressId,
      payment_method: payload.paymentMethod,
      voucher_code: payload.voucherCode || undefined,
      note: payload.note.trim() || undefined,
      items: this.checkoutItems(payload.items),
    }, { headers: this.headers(), withCredentials: true }).pipe(map((response) => this.unwrap(response)));
  }

  checkoutGuest(payload: {
    guest: { fullName: string; phone: string; email: string; address: string; ward: string; district: string; city: string };
    paymentMethod: string;
    voucherCode: string;
    note: string;
    items: OrderCheckoutItem[];
  }): Observable<unknown> {
    return this.http.post<unknown>(`${API_BASE}/orders/guest-checkout`, {
      full_name: payload.guest.fullName.trim(),
      phone: payload.guest.phone.trim(),
      email: payload.guest.email.trim(),
      address_line: payload.guest.address.trim(),
      ward: payload.guest.ward.trim() || undefined,
      district: payload.guest.district.trim() || undefined,
      province: payload.guest.city.trim(),
      payment_method: payload.paymentMethod,
      voucher_code: payload.voucherCode || undefined,
      note: payload.note.trim() || undefined,
      items: this.checkoutItems(payload.items),
    }, { headers: this.headers(), withCredentials: true }).pipe(map((response) => this.unwrap(response)));
  }

  applyVoucher(code: string, orderValue: number): Observable<number> {
    return this.http.post<unknown>(`${API_BASE}/vouchers/apply`, {
      code: code.trim(),
      order_value: orderValue,
    }, { headers: this.headers(), withCredentials: true }).pipe(
      map((response) => {
        const payload = this.unwrap<unknown>(response);
        if (!payload || typeof payload !== 'object') throw new Error('Máy chủ trả về mã giảm giá không hợp lệ.');
        const discount = Number((payload as Record<string, unknown>)['discountAmount'] ?? (payload as Record<string, unknown>)['discount_amount']);
        if (!Number.isFinite(discount) || discount < 0) throw new Error('Máy chủ trả về giá trị giảm giá không hợp lệ.');
        return discount;
      }),
    );
  }

  getMyOrders(): Observable<OrderRecord[]> {
    if (!this.authService.isAuthenticated()) {
      return this.accountDataset.getOrders().pipe(map((orders) => orders.map((order) => this.normalizeMockOrder(order))));
    }
    return this.http.get<unknown>(`${API_BASE}/orders`, {
      params: { page: '1', limit: '100' },
      headers: this.headers(),
      withCredentials: true,
    }).pipe(
      map((response) => this.asArray(this.unwrap<unknown>(response), 'đơn hàng').map((value) => this.normalizeOrder(value))),
    );
  }

  getOrder(orderId: string): Observable<OrderRecord> {
    if (!this.authService.isAuthenticated()) {
      return this.accountDataset.getOrders().pipe(map((orders) => {
        const order = orders.find((item) => String(item['id'] ?? '') === orderId);
        if (!order) throw new Error('Không tìm thấy đơn hàng mẫu.');
        return this.normalizeMockOrder(order);
      }));
    }
    return this.http.get<unknown>(`${API_BASE}/orders/${encodeURIComponent(orderId)}`, {
      headers: this.headers(),
      withCredentials: true,
    }).pipe(map((response) => this.normalizeOrder(this.unwrap<unknown>(response))));
  }

  private normalizeMockOrder(value: Record<string, unknown>): OrderRecord {
    const recipient = value['recipient'] && typeof value['recipient'] === 'object'
      ? value['recipient'] as Record<string, unknown>
      : {};
    const products = Array.isArray(value['products']) ? value['products'] as Array<Record<string, unknown>> : [];
    const items = products.map((item) => ({
      name: String(item['name'] ?? 'Sản phẩm'),
      quantity: Number(item['quantity'] ?? 1),
      price: Number(item['price'] ?? 0),
      image: String(item['image'] ?? ''),
    }));
    const status = String(value['status'] ?? '');
    const statusLabels: Record<string, string> = {
      awaiting_payment: 'Chờ thanh toán',
      processing: 'Đang xử lý',
      shipping: 'Đang giao hàng',
      delivered: 'Đã giao',
      cancelled: 'Đã hủy',
    };
    const paymentMethods: Record<string, string> = {
      online: 'Thanh toán trực tuyến',
      cod: 'Thanh toán khi nhận hàng',
    };
    return {
      id: String(value['id'] ?? ''),
      code: String(value['id'] ?? ''),
      status,
      statusLabel: statusLabels[status] ?? status,
      paymentMethod: paymentMethods[String(value['paymentMethod'])] ?? String(value['paymentMethod'] ?? ''),
      createdAt: String(value['orderedAt'] ?? ''),
      total: items.reduce((sum, item) => sum + item.price * item.quantity, 0)
        + Number(value['shippingFee'] ?? 0) - Number(value['discount'] ?? 0),
      recipientName: String(recipient['name'] ?? ''),
      recipientPhone: String(recipient['phone'] ?? ''),
      shippingAddress: String(recipient['address'] ?? ''),
      items: items.map((item) => ({ ...item, image: item.image || '/assets/images/product/card-placeholder.png' })),
    };
  }

  private checkoutItems(items: OrderCheckoutItem[]): Array<{ product_id: string; variant_id: null; quantity: number }> {
    return items.map((item) => ({
      product_id: item.id.split(':')[0],
      variant_id: null,
      quantity: item.quantity,
    }));
  }

  private normalizeOrder(value: unknown): OrderRecord {
    if (!value || typeof value !== 'object') throw new Error('Dữ liệu đơn hàng không hợp lệ.');
    const order = value as Record<string, unknown>;
    const payments = Array.isArray(order['payments']) ? order['payments'] as Array<Record<string, unknown>> : [];
    const payment = payments[0] ?? {};
    const rawItems = Array.isArray(order['order_items']) ? order['order_items'] as Array<Record<string, unknown>> : [];
    const status = this.normalizeStatus(String(order['order_status'] ?? order['status'] ?? ''), order['payment_status']);
    const statusLabels: Record<string, string> = {
      awaiting_payment: 'Chờ thanh toán',
      processing: 'Đang xử lý',
      shipping: 'Đang giao',
      delivered: 'Đã giao',
      cancelled: 'Đã hủy',
    };
    const address = order['address'] && typeof order['address'] === 'object' ? order['address'] as Record<string, unknown> : {};
    return {
      id: String(order['order_id'] ?? order['id'] ?? order['order_code'] ?? ''),
      code: String(order['order_code'] ?? order['code'] ?? ''),
      status,
      statusLabel: statusLabels[status] ?? status,
      paymentMethod: String(payment['payment_method'] ?? order['payment_method'] ?? ''),
      createdAt: String(order['created_at'] ?? order['orderedAt'] ?? ''),
      total: Number(order['total_amount'] ?? 0),
      recipientName: String(order['recipient_name'] ?? address['recipient_name'] ?? ''),
      recipientPhone: String(order['recipient_phone'] ?? address['recipient_phone'] ?? ''),
      shippingAddress: String(order['shipping_address'] ?? address['address_line'] ?? ''),
      items: rawItems.map((item) => {
        const product = item['product'] && typeof item['product'] === 'object' ? item['product'] as Record<string, unknown> : {};
        const images = Array.isArray(product['product_images']) ? product['product_images'] as Array<Record<string, unknown>> : [];
        return {
          name: String(item['item_name_snapshot'] ?? product['product_name'] ?? 'Sản phẩm'),
          quantity: Number(item['quantity'] ?? 1),
          price: Number(item['unit_price'] ?? product['price'] ?? 0),
          image: String(images[0]?.['image_url'] ?? ''),
        };
      }),
    };
  }

  private normalizeStatus(status: string, paymentStatus: unknown): string {
    if (status === 'cancelled' || status === 'shipping' || status === 'completed' || status === 'confirmed') {
      if (status === 'completed') return 'delivered';
      if (status === 'confirmed') return 'processing';
      return status;
    }
    if (paymentStatus === 'unpaid') return 'awaiting_payment';
    return 'processing';
  }

  private asArray(payload: unknown, label: string): unknown[] {
    if (Array.isArray(payload)) return payload;
    if (payload && typeof payload === 'object') {
      const value = payload as Record<string, unknown>;
      for (const key of ['orders', 'data', 'items']) if (Array.isArray(value[key])) return value[key] as unknown[];
    }
    throw new Error(`Dữ liệu ${label} không hợp lệ.`);
  }

  private unwrap<T = unknown>(response: unknown): T {
    if (response && typeof response === 'object' && 'EC' in response) {
      const envelope = response as ApiEnvelope<T>;
      if (envelope.EC !== undefined && envelope.EC !== 0) throw new Error(envelope.EM || 'Yêu cầu không thành công.');
      if (envelope.DT === undefined) throw new Error('Máy chủ trả về dữ liệu trống.');
      return envelope.DT;
    }
    return response as T;
  }

  private headers(): HttpHeaders {
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    const token = this.authService.getAccessToken();
    return token ? headers.set('Authorization', `Bearer ${token}`) : headers;
  }
}
