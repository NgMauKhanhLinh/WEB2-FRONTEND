import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { StorefrontService } from './storefront-service';

describe('StorefrontService', () => {
  let service: StorefrontService;
  let http: HttpTestingController;

  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(StorefrontService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('loads and normalizes product details from the API', () => {
    let productName = '';
    service.getProduct('42').subscribe((product) => productName = product.name);
    http.expectOne('http://localhost:8080/api/v1/products/42').flush({
      EC: 0,
      DT: { product_id: 42, product_name: 'Hạt cho chó', product_price: 125000, category: { category_name: 'Thức ăn' }, stock_quantity: 5 },
    });
    expect(productName).toBe('Hạt cho chó');
  });

  it('maps mixed search results into service, product, and article groups', () => {
    let productName = '';
    service.search('tắm').subscribe((result) => productName = result.results.products[0].name);
    const request = http.expectOne((req) => req.url === 'http://localhost:8080/api/v1/search');
    expect(request.request.params.get('keyword')).toBe('tắm');
    expect(request.request.params.get('scope')).toBe('all');
    request.flush({
      EC: 0,
      DT: {
        keyword: 'tắm',
        totalRows: 3,
        results: [
          { _type: 'service', service_name: 'Tắm spa' },
          { _type: 'product', product_id: 2, product_name: 'Dầu tắm' },
          { _type: 'blog', post_id: 4, title: 'Cách tắm cho mèo' },
        ],
      },
    });
    expect(productName).toBe('Dầu tắm');
  });

  it('maps search type and sort controls to API query values', () => {
    service.search('hạt', 'shopping', 'priceAsc').subscribe();
    const request = http.expectOne((req) => req.url === 'http://localhost:8080/api/v1/search');
    expect(request.request.params.get('scope')).toBe('product');
    expect(request.request.params.get('sort')).toBe('price_asc');
    request.flush({ EC: 0, DT: { results: [], totalRows: 0 } });
  });

  it('posts adoption requests using the API field names', () => {
    service.createAdoptionRequest('pet-9', {
      fullName: 'Nguyễn An', phone: '0901234567', gender: 'female', birthYear: '1998',
      address: 'Thủ Đức', housingType: 'Căn hộ', familyConsent: 'Có', currentPets: 'Không',
      aloneTime: '4 giờ', adoptionReason: 'Yêu động vật', futurePlan: 'Chăm sóc lâu dài',
    }).subscribe();
    const request = http.expectOne('http://localhost:8080/api/v1/adoptions/requests');
    expect(request.request.body).toEqual({
      adoption_pet_id: 'pet-9',
      full_name: 'Nguyễn An',
      phone: '0901234567',
      gender: 'female',
      birth_year: '1998',
      address: 'Thủ Đức',
      reason: 'Yêu động vật',
      housing_info: 'Nhà ở: Căn hộ\nGia đình đồng ý: Có\nThú cưng hiện tại: Không\nThời gian ở một mình: 4 giờ',
      experience: 'Chăm sóc lâu dài',
    });
    request.flush({ EC: 0, DT: { adoption_request_id: 10 } });
  });

  it('loads the authenticated user adoption requests', () => {
    let statusLabel = '';
    service.getMyAdoptionRequests().subscribe((requests) => statusLabel = requests[0].statusLabel);
    http.expectOne('http://localhost:8080/api/v1/adoptions/my-requests').flush({
      EC: 0,
      DT: [{ adoption_request_id: 19, status: 'approved', adoption_pet: { adoption_pet_id: 9, name: 'Mimi' } }],
    });
    expect(statusLabel).toBe('Đã được chấp nhận');
  });

  it('sends the saved access token and credentials to protected API calls', () => {
    localStorage.setItem('accessToken', 'test-access-token');
    service.getMyAdoptionRequests().subscribe();
    const request = http.expectOne('http://localhost:8080/api/v1/adoptions/my-requests');
    expect(request.request.headers.get('Authorization')).toBe('Bearer test-access-token');
    expect(request.request.withCredentials).toBe(true);
    request.flush({ EC: 0, DT: [] });
  });

  it('returns explicit API errors rather than empty product results', () => {
    let message = '';
    service.getProducts().subscribe({ error: (error: Error) => message = error.message });
    http.expectOne((req) => req.url === 'http://localhost:8080/api/v1/products')
      .flush({ EC: 2, EM: 'Không thể tải sản phẩm.' });
    expect(message).toBe('Không thể tải sản phẩm.');
  });
});
