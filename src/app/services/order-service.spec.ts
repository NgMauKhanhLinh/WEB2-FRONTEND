import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { AuthService } from './auth-service';
import { OrderService } from './order-service';

describe('OrderService', () => {
  let service: OrderService;
  let http: HttpTestingController;
  let authenticated = true;

  beforeEach(() => {
    authenticated = true;
    localStorage.clear();
    sessionStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: { isAuthenticated: () => authenticated, getAccessToken: () => null } },
      ],
    });
    service = TestBed.inject(OrderService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('submits a guest order using the backend field names', () => {
    service.checkoutGuest({
      guest: { fullName: 'Nguyễn An', phone: '0901234567', email: 'an@example.com', address: 'Số 1', ward: '', district: 'Quận 1', city: 'TP.HCM' },
      paymentMethod: 'cod',
      voucherCode: '',
      note: '',
      items: [{ id: '12', name: 'Hạt', category: 'Thức ăn', price: 99000, image: '', rating: 0, description: '', stock: 3, quantity: 2 }],
    }).subscribe();
    const request = http.expectOne('http://localhost:8080/api/v1/orders/guest-checkout');
    expect(request.request.body).toEqual({
      full_name: 'Nguyễn An',
      phone: '0901234567',
      email: 'an@example.com',
      address_line: 'Số 1',
      ward: undefined,
      district: 'Quận 1',
      province: 'TP.HCM',
      payment_method: 'cod',
      voucher_code: undefined,
      note: undefined,
      items: [{ product_id: '12', variant_id: null, quantity: 2 }],
    });
    request.flush({ EC: 0, DT: { order_id: 24 } });
  });

  it('applies vouchers and normalizes order status', () => {
    let discount = 0;
    service.applyVoucher('SAVE10', 100000).subscribe((value) => discount = value);
    http.expectOne('http://localhost:8080/api/v1/vouchers/apply').flush({ EC: 0, DT: { discountAmount: 10000 } });
    expect(discount).toBe(10000);

    let status = '';
    service.getMyOrders().subscribe((orders) => status = orders[0].statusLabel);
    http.expectOne((request) => request.url === 'http://localhost:8080/api/v1/orders').flush({
      EC: 0,
      DT: { orders: [{ order_id: 2, order_status: 'shipping', total_amount: 100000 }] },
    });
    expect(status).toBe('Đang giao');
  });

  it('loads the account order history from the mock dataset when signed out', () => {
    authenticated = false;
    let result = { status: '', total: 0, itemCount: 0 };
    service.getMyOrders().subscribe((orders) => {
      result = {
        status: orders[0].statusLabel,
        total: orders[0].total,
        itemCount: orders[0].items.length,
      };
    });
    http.expectOne('/datasets/orderData.json').flush({
      ORDERS: [{
        id: 'order-1',
        status: 'delivered',
        paymentMethod: 'Thanh toán khi nhận hàng',
        shippingFee: 30000,
        discount: 10000,
        orderedAt: '2026-05-20T09:20:00',
        recipient: { name: 'Nguyễn An', phone: '0901234567', address: 'Số 1' },
        products: [{ name: 'Thức ăn', quantity: 2, price: 50000 }],
      }],
    });
    expect(result).toEqual({ status: 'Đã giao', total: 120000, itemCount: 1 });
  });
});
