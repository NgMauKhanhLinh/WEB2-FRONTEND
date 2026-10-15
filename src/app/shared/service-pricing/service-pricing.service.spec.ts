import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { PricingMatrix, ServicePricingService } from './service-pricing.service';

describe('ServicePricingService', () => {
  let service: ServicePricingService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(ServicePricingService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('normalizes pricing matrix categories and price values from the API', () => {
    let result: PricingMatrix | undefined;
    service.getPricingMatrix().subscribe((matrix) => result = matrix);

    const request = http.expectOne('http://localhost:8080/api/v1/services/pricing-matrix');
    expect(request.request.method).toBe('GET');
    request.flush({
      EC: 0,
      DT: [{
        category_name: 'Grooming & Spa',
        weight_ranges: [{ label: 'Dưới 3kg' }],
        services: [{
          service_name: 'Tắm & Sấy khô',
          prices: [{ price: 50000 }, { price: null, is_contact: true }],
        }],
      }],
    });

    expect(result!.grooming.columns[0].label).toBe('Dưới 3kg');
    expect(result!.grooming.rows[0].prices).toEqual([
      '50k', 'Liên hệ', 'Liên hệ', 'Liên hệ', 'Liên hệ', 'Liên hệ', 'Liên hệ', 'Liên hệ', 'Liên hệ',
    ]);
  });

  it('raises backend errors instead of treating an error envelope as pricing data', () => {
    let errorMessage = '';
    service.getPricingMatrix().subscribe({ error: (error: Error) => errorMessage = error.message });
    http.expectOne('http://localhost:8080/api/v1/services/pricing-matrix').flush({
      EC: 1,
      EM: 'Bảng giá hiện không khả dụng.',
    });

    expect(errorMessage).toBe('Bảng giá hiện không khả dụng.');
  });
});
