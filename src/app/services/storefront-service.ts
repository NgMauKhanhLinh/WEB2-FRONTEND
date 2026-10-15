import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { AuthService } from './auth-service';

export interface StoreProduct {
  id: string;
  name: string;
  category: string;
  price: number;
  image: string;
  rating: number;
  description: string;
  stock: number;
}

export interface AdoptionPet {
  id: string;
  name: string;
  description: string;
  status: string;
  need: string;
  state: 'waiting' | 'adopted';
  image: string;
}

export interface AdoptionPartner {
  id: string;
  name: string;
  href: string;
  region: string;
  address: string;
  description: string;
  image: string;
}

export interface AdoptionRequest {
  id: string;
  petId: string;
  petName: string;
  petImage: string;
  status: string;
  statusLabel: string;
  submittedAt: string;
  reason: string;
}

export interface SearchResult {
  query: string;
  total: number;
  results: {
    services: Array<Record<string, unknown>>;
    products: StoreProduct[];
    articles: Array<Record<string, unknown>>;
  };
}

export interface ProductReview {
  id: string;
  authorName: string;
  rating: number;
  content: string;
  createdAt: string;
}

interface ApiEnvelope<T> {
  EC?: number;
  EM?: string;
  DT?: T;
}

const API_BASE = 'http://localhost:8080/api/v1';
const PRODUCT_FALLBACK_IMAGE = '/assets/images/product/card-placeholder.png';
const BACKEND_ORIGIN = 'http://localhost:8080';
const RESCUE_PARTNER_IMAGES = [
  '/assets/images/rescue/partner-vawa.png',
  '/assets/images/rescue/partner-snnc.png',
  '/assets/images/rescue/partner-nong-nghiep.png',
  '/assets/images/rescue/partner-saigon-time.png',
  '/assets/images/rescue/partner-we-act.png',
  '/assets/images/rescue/partner-laws-for-paws.png',
];

@Injectable({ providedIn: 'root' })
export class StorefrontService {
  constructor(
    private readonly http: HttpClient,
    private readonly authService: AuthService,
  ) {}

  getProducts(): Observable<StoreProduct[]> {
    return this.http.get<unknown>(`${API_BASE}/products`, {
      params: new HttpParams().set('page', '1').set('limit', '30'),
      headers: this.headers(),
      withCredentials: true,
    }).pipe(map((response) => this.asArray(this.unwrap<unknown>(response), 'products').map((item) => this.normalizeProduct(item))));
  }

  getProduct(productId: string): Observable<StoreProduct> {
    return this.http.get<unknown>(`${API_BASE}/products/${encodeURIComponent(productId)}`, { headers: this.headers(), withCredentials: true })
      .pipe(map((response) => this.normalizeProduct(this.unwrap<unknown>(response))));
  }

  getProductReviews(productId: string): Observable<ProductReview[]> {
    return this.http.get<unknown>(`${API_BASE}/reviews/target/product/${encodeURIComponent(productId)}`, {
      params: new HttpParams().set('page', '1').set('limit', '10'),
      headers: this.headers(),
      withCredentials: true,
    }).pipe(
      map((response) => this.asArray(this.unwrap<unknown>(response), 'product reviews').map((review, index) => ({
        id: String(review['review_id'] ?? review['reviewId'] ?? review['id'] ?? index),
        authorName: String((review['user'] as Record<string, unknown> | undefined)?.['full_name'] ?? review['full_name'] ?? review['user_name'] ?? 'Khách hàng'),
        rating: Number(review['rating'] ?? review['star'] ?? 0),
        content: String(review['content'] ?? review['comment'] ?? review['review_content'] ?? ''),
        createdAt: String(review['created_at'] ?? ''),
      }))),
    );
  }

  search(query: string, type = 'all', sort = 'relevant'): Observable<SearchResult> {
    const scopes: Record<string, string> = { all: 'all', service: 'service', shopping: 'product', article: 'blog' };
    const sorts: Record<string, string> = { relevant: 'relevance', priceAsc: 'price_asc', priceDesc: 'price_desc', newest: 'newest' };
    const params = new HttpParams()
      .set('keyword', query)
      .set('scope', scopes[type] ?? 'all')
      .set('sort', sorts[sort] ?? 'relevance')
      .set('page', '1')
      .set('limit', '30');
    return this.http.get<unknown>(`${API_BASE}/search`, { params, headers: this.headers(), withCredentials: true }).pipe(
      map((response) => {
        const payload = this.unwrap<Record<string, unknown>>(response);
        const items = Array.isArray(payload['results']) ? payload['results'] as Array<Record<string, unknown>> : [];
        return {
          query: String(payload['keyword'] ?? query),
          total: Number(payload['totalRows'] ?? items.length),
          results: {
            services: items.filter((item) => item['_type'] === 'service'),
            products: items.filter((item) => item['_type'] === 'product').map((item) => this.normalizeProduct(item)),
            articles: items.filter((item) => item['_type'] === 'blog'),
          },
        };
      }),
    );
  }

  getAdoptionPets(): Observable<AdoptionPet[]> {
    return this.http.get<unknown>(`${API_BASE}/adoptions/pets`, { headers: this.headers(), withCredentials: true }).pipe(
      map((response) => this.asArray(this.unwrap<unknown>(response), 'adoption pets').map((pet) => {
        const images = Array.isArray(pet['images'])
          ? pet['images'] as Array<Record<string, unknown>>
          : Array.isArray(pet['adoption_pet_images']) ? pet['adoption_pet_images'] as Array<Record<string, unknown>> : [];
        const primaryImage = images.find((image) => image['is_primary']) ?? images[0];
        return {
          id: String(pet['adoption_pet_id'] ?? pet['id'] ?? ''),
          name: String(pet['name'] ?? 'Bạn nhỏ'),
          description: String(pet['description'] ?? pet['personality'] ?? 'Một bạn nhỏ đang chờ được yêu thương và chăm sóc.'),
          status: [pet['species'], pet['age_text'], pet['region']].filter(Boolean).join(' - ') || 'Đang chờ nhận nuôi',
          need: String(pet['adoption_conditions'] ?? 'Cần một gia đình có thời gian chăm sóc và đồng hành lâu dài.'),
          state: pet['status'] === 'adopted' ? 'adopted' : 'waiting',
          image: String(primaryImage?.['image_url'] ?? '/assets/images/rescue/figma-photo-1.png'),
        };
      })),
    );
  }

  getRescuePartners(): Observable<AdoptionPartner[]> {
    return this.http.get<unknown>(`${API_BASE}/rescue/stations`, { headers: this.headers(), withCredentials: true }).pipe(
      map((response) => this.asArray(this.unwrap<unknown>(response), 'rescue partners').map((station, index) => ({
        id: String(station['station_id'] ?? station['id'] ?? index),
        name: String(station['station_name'] ?? 'Trạm cứu hộ'),
        href: String(station['fanpage_url'] ?? station['donation_url'] ?? '#'),
        region: String(station['address'] ?? 'Việt Nam'),
        address: String(station['address'] ?? ''),
        description: station['phone'] ? `Hotline: ${String(station['phone'])}` : 'Đang cập nhật thông tin liên hệ.',
        image: RESCUE_PARTNER_IMAGES[index % RESCUE_PARTNER_IMAGES.length],
      }))),
    );
  }

  getMyAdoptionRequests(): Observable<AdoptionRequest[]> {
    return this.http.get<unknown>(`${API_BASE}/adoptions/my-requests`, { headers: this.headers(), withCredentials: true }).pipe(
      map((response) => this.asArray(this.unwrap<unknown>(response), 'adoption requests').map((request, index) => {
        const pet = (request['adoption_pet'] ?? request['pet'] ?? {}) as Record<string, unknown>;
        const images = Array.isArray(pet['images'])
          ? pet['images'] as Array<Record<string, unknown>>
          : Array.isArray(pet['adoption_pet_images']) ? pet['adoption_pet_images'] as Array<Record<string, unknown>> : [];
        const status = String(request['status'] ?? 'pending');
        return {
          id: String(request['adoption_request_id'] ?? request['id'] ?? index),
          petId: String(pet['adoption_pet_id'] ?? pet['id'] ?? request['adoption_pet_id'] ?? ''),
          petName: String(pet['name'] ?? 'Bạn nhỏ'),
          petImage: String(images.find((image) => image['is_primary'])?.['image_url'] ?? images[0]?.['image_url'] ?? '/assets/images/rescue/figma-photo-1.png'),
          status,
          statusLabel: ({ pending: 'Đang chờ duyệt', approved: 'Đã được chấp nhận', rejected: 'Đã bị từ chối' } as Record<string, string>)[status] ?? status,
          submittedAt: String(request['created_at'] ?? request['createdAt'] ?? ''),
          reason: String(request['reason'] ?? ''),
        };
      })),
    );
  }

  createAdoptionRequest(petId: string, values: Record<string, string>): Observable<unknown> {
    return this.http.post<unknown>(`${API_BASE}/adoptions/requests`, {
      adoption_pet_id: petId,
      full_name: values['fullName'],
      phone: values['phone'],
      gender: values['gender'],
      birth_year: values['birthYear'],
      address: values['address'],
      reason: values['adoptionReason'] || values['futurePlan'] || 'Mong muốn nhận nuôi và chăm sóc thú cưng.',
      housing_info: [
        values['housingType'] && `Nhà ở: ${values['housingType']}`,
        values['familyConsent'] && `Gia đình đồng ý: ${values['familyConsent']}`,
        values['currentPets'] && `Thú cưng hiện tại: ${values['currentPets']}`,
        values['aloneTime'] && `Thời gian ở một mình: ${values['aloneTime']}`,
      ].filter(Boolean).join('\n'),
      experience: values['futurePlan'] || values['currentPets'] || null,
    }, { headers: this.headers(), withCredentials: true }).pipe(map((response) => this.unwrap<unknown>(response)));
  }

  createProductReview(productId: string, rating: number, comment: string): Observable<unknown> {
    return this.http.post<unknown>(`${API_BASE}/reviews`, {
      target_type: 'product',
      target_id: productId,
      rating,
      comment,
    }, { headers: this.headers(), withCredentials: true }).pipe(map((response) => this.unwrap<unknown>(response)));
  }

  likeProductReview(reviewId: string): Observable<unknown> {
    return this.http.post<unknown>(`${API_BASE}/reviews/${encodeURIComponent(reviewId)}/like`, {}, { headers: this.headers(), withCredentials: true })
      .pipe(map((response) => this.unwrap<unknown>(response)));
  }

  private normalizeProduct(source: unknown): StoreProduct {
    const payload = source && typeof source === 'object' && 'DT' in source
      ? (source as ApiEnvelope<unknown>).DT
      : source;
    if (!payload || typeof payload !== 'object') throw new Error('Dữ liệu sản phẩm không hợp lệ.');
    const product = payload as Record<string, unknown>;
    const rawImages = Array.isArray(product['product_images']) ? product['product_images'] as Array<Record<string, unknown>> : [];
    const primaryImage = rawImages.find((image) => image['is_primary']) ?? rawImages[0];
    const category = product['category'] && typeof product['category'] === 'object'
      ? product['category'] as Record<string, unknown>
      : {};
    return {
      id: String(product['product_id'] ?? product['productId'] ?? product['id'] ?? ''),
      name: String(product['product_name'] ?? product['productName'] ?? product['name'] ?? 'Sản phẩm'),
      category: String(category['category_name'] ?? product['category_name'] ?? 'Thú cưng'),
      price: Number(product['price'] ?? product['product_price'] ?? product['selling_price'] ?? 0),
      image: this.normalizeImageUrl(String(product['image_url'] ?? product['imageUrl'] ?? product['thumbnail_url'] ?? primaryImage?.['image_url'] ?? PRODUCT_FALLBACK_IMAGE)),
      rating: Number(product['rating'] ?? product['average_rating'] ?? 0),
      description: String(product['description'] ?? 'Sản phẩm chăm sóc thú cưng được tuyển chọn với chất lượng đảm bảo.'),
      stock: Number(product['stock_quantity'] ?? product['stockQuantity'] ?? 0),
    };
  }

  private asArray(payload: unknown, label: string): Array<Record<string, unknown>> {
    if (Array.isArray(payload)) return payload as Array<Record<string, unknown>>;
    if (payload && typeof payload === 'object') {
      const record = payload as Record<string, unknown>;
      for (const key of ['items', 'products', 'pets', 'stations', 'categories', 'requests', 'adoption_requests']) {
        if (Array.isArray(record[key])) return record[key] as Array<Record<string, unknown>>;
      }
    }
    throw new Error(`Dữ liệu ${label} không hợp lệ.`);
  }

  private unwrap<T>(response: unknown): T {
    if (response && typeof response === 'object' && 'EC' in response) {
      const envelope = response as ApiEnvelope<T>;
      if (envelope.EC !== undefined && envelope.EC !== 0) throw new Error(envelope.EM || 'Yêu cầu không thành công.');
      if (envelope.DT === undefined) throw new Error('Máy chủ trả về dữ liệu trống.');
      return envelope.DT;
    }
    return response as T;
  }

  private headers(): HttpHeaders {
    const token = this.authService.getAccessToken();
    const base = new HttpHeaders({ 'Content-Type': 'application/json' });
    return token ? base.set('Authorization', `Bearer ${token}`) : base;
  }

  private normalizeImageUrl(value: string): string {
    if (/^(https?:)?\/\//.test(value) || value.startsWith('data:') || value.startsWith('blob:') || value.startsWith('/assets/')) {
      return value;
    }
    return `${BACKEND_ORIGIN}/${value.replace(/^\/+/, '')}`;
  }
}
