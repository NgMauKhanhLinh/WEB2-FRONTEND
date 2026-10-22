import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';

export type PricingCategory = 'medical' | 'grooming' | 'combo';
export type PricingFilter = 'all' | PricingCategory;

export interface PricingColumn {
  label: string;
  tone: 'primary' | 'secondary' | 'info';
}

export interface PricingRow {
  title: string;
  iconColor: string;
  background: string;
  prices: string[];
}

export interface PricingGroup {
  columns: PricingColumn[];
  rows: PricingRow[];
}

export type PricingMatrix = Record<PricingCategory, PricingGroup>;

export const PRICING_COLUMNS: PricingColumn[] = [
  { label: 'Dưới 3kg', tone: 'primary' },
  { label: '3.1 - 5kg', tone: 'primary' },
  { label: '5.1 - 8kg', tone: 'primary' },
  { label: '8.1 - 12kg', tone: 'secondary' },
  { label: '12.1 - 15kg', tone: 'secondary' },
  { label: '15.1 - 20kg', tone: 'secondary' },
  { label: '20.1 - 25kg', tone: 'info' },
  { label: '25.1 - 30kg', tone: 'info' },
  { label: 'Trên 30kg', tone: 'info' },
];

const makeRow = (
  title: string,
  iconColor: string,
  background: string,
  prices: string[],
): PricingRow => ({ title, iconColor, background, prices });

export const DEFAULT_PRICING: PricingMatrix = {
  grooming: {
    columns: PRICING_COLUMNS,
    rows: [
      makeRow('Tắm & Sấy khô', '#2d63c8', '#cce1fe', ['50k', '70k', '90k', '120k', '150k', '190k', '240k', '300k', 'Liên hệ']),
      makeRow('Massage chuyên sâu', '#00c7a2', '#cffff5', ['50k', '75k', '100k', '130k', '160k', '200k', '250k', '310k', 'Liên hệ']),
      makeRow('Cắt tỉa tạo kiểu', '#ef4444', '#ffd6d6', ['50k', '85k', '120k', '160k', '210k', '270k', '340k', '420k', 'Liên hệ']),
      makeRow('Vắt tuyến hôi', '#d99a16', '#fffbdc', ['50k', '65k', '80k', '100k', '120k', '150k', '180k', '220k', 'Liên hệ']),
      makeRow('Điều trị ký sinh trùng', '#8b5cf6', '#efd8ff', ['80k', '110k', '140k', '180k', '220k', '270k', '330k', '400k', 'Liên hệ']),
      makeRow('Nhuộm lông thời trang', '#ff2bbb', '#ffe0f1', ['80k', '120k', '170k', '230k', '300k', '380k', '480k', '600k', 'Liên hệ']),
      makeRow('Vệ sinh răng miệng', '#f59e0b', '#fff2dc', ['30k', '45k', '60k', '80k', '100k', '130k', '160k', '200k', 'Liên hệ']),
      makeRow('Cắt & Mài móng', '#08a8e8', '#d0e9ff', ['30k', '45k', '55k', '70k', '85k', '105k', '130k', '160k', 'Liên hệ']),
      makeRow('Chăm sóc bàn chân', '#d69b16', '#f7ffdd', ['30k', '45k', '55k', '70k', '85k', '105k', '130k', '160k', 'Liên hệ']),
    ],
  },
  medical: {
    columns: PRICING_COLUMNS,
    rows: [
      makeRow('Khám & Điều trị', '#2d63c8', '#cce1fe', ['30k', '45k', '60k', '80k', '100k', '130k', '160k', '200k', 'Liên hệ']),
      makeRow('Xét nghiệm', '#00c7a2', '#cffff5', ['50k', '70k', '90k', '120k', '150k', '190k', '240k', '300k', 'Liên hệ']),
      makeRow('Siêu âm', '#ff2bbb', '#ffe0f1', ['100k', '120k', '140k', '170k', '200k', '240k', '290k', '350k', 'Liên hệ']),
      makeRow('Tiêm phòng', '#d99a16', '#ffffdf', ['100k', '115k', '130k', '150k', '175k', '205k', '240k', '280k', 'Liên hệ']),
      makeRow('Phẫu thuật', '#8b5cf6', '#ecd8ff', ['200k', '260k', '330k', '420k', '530k', '660k', '820k', '1000k', 'Liên hệ']),
      makeRow('Cấp cứu 24/7', '#ef4444', '#ffd8d8', ['150k', '180k', '210k', '250k', '300k', '360k', '430k', '520k', 'Liên hệ']),
    ],
  },
  combo: {
    columns: PRICING_COLUMNS,
    rows: [
      makeRow('Combo Tắm 11 bước', '#2d63c8', '#cce1fe', ['150k', '180k', '220k', '270k', '330k', '440k', '480k', '570k', 'Liên hệ']),
      makeRow('Combo Tắm cơ bản & cắt tỉa', '#00c7a2', '#cffff5', ['100k', '135k', '180k', '230k', '290k', '360k', '440k', '530k', 'Liên hệ']),
      makeRow('Combo Chăm sóc & bảo vệ móng', '#d69b16', '#f7ffdd', ['80k', '100k', '125k', '155k', '190k', '230k', '275k', '325k', 'Liên hệ']),
    ],
  },
};

interface ApiPrice {
  price?: number | string | null;
  is_contact?: boolean;
}

interface ApiService {
  service_name?: string;
  prices?: ApiPrice[];
}

interface ApiCategory {
  category_name?: string;
  weight_ranges?: Array<{ label?: string }>;
  services?: ApiService[];
}

interface ApiEnvelope {
  EC?: number;
  EM?: string;
  DT?: ApiCategory[] | null;
}

@Injectable({ providedIn: 'root' })
export class ServicePricingService {
  private readonly baseUrl = 'http://localhost:8080/api/v1';

  constructor(private readonly http: HttpClient) {}

  getPricingMatrix(): Observable<PricingMatrix> {
    return this.http.get<ApiEnvelope | ApiCategory[]>(`${this.baseUrl}/services/pricing-matrix`).pipe(
      map((response) => this.normalize(response)),
    );
  }

  private normalize(response: ApiEnvelope | ApiCategory[]): PricingMatrix {
    if (!Array.isArray(response) && response.EC !== undefined && response.EC !== 0) {
      throw new Error(response.EM || 'Không thể tải bảng giá dịch vụ.');
    }
    const categories = Array.isArray(response) ? response : response.DT;
    if (!Array.isArray(categories)) {
      throw new Error('Dữ liệu bảng giá dịch vụ không hợp lệ.');
    }

    const result: PricingMatrix = {
      grooming: { columns: [], rows: [] },
      medical: { columns: [], rows: [] },
      combo: { columns: [], rows: [] },
    };
    const colors: Array<[RegExp, string, string]> = [
      [/tắm|spa|groom|sấy/i, '#2d63c8', '#cce1fe'],
      [/massage/i, '#00c7a2', '#cffff5'],
      [/cắt|tỉa|móng/i, '#08a8e8', '#d0e9ff'],
      [/ký sinh|ve|bọ/i, '#8b5cf6', '#efd8ff'],
      [/nhuộm/i, '#ff2bbb', '#ffe0f1'],
      [/răng|miệng/i, '#f59e0b', '#fff2dc'],
      [/khám|điều trị/i, '#2d63c8', '#cce1fe'],
      [/xét nghiệm/i, '#00c7a2', '#cffff5'],
      [/siêu âm/i, '#ff2bbb', '#ffe0f1'],
      [/tiêm|vaccine|phòng/i, '#d99a16', '#ffffdf'],
      [/phẫu thuật/i, '#8b5cf6', '#ecd8ff'],
      [/cấp cứu/i, '#ef4444', '#ffd8d8'],
    ];

    for (const category of categories) {
      const categoryName = category.category_name ?? '';
      const target: PricingCategory = /combo/i.test(categoryName)
        ? 'combo'
        : /groom|spa|tắm|cắt/i.test(categoryName)
          ? 'grooming'
          : 'medical';
      const group = result[target];
      const columns = (category.weight_ranges ?? [])
        .map((range, index) => range.label ? ({
          label: range.label,
          tone: index < 3 ? 'primary' as const : index < 6 ? 'secondary' as const : 'info' as const,
        }) : null)
        .filter((column): column is PricingColumn => column !== null)
        .slice(0, 9);
      if (columns.length) group.columns = columns;

      for (const service of category.services ?? []) {
        const title = service.service_name || 'Dịch vụ';
        const visual = colors.find(([pattern]) => pattern.test(title));
        const values = (service.prices ?? []).map((item) => this.formatPrice(item));
        group.rows.push({
          title,
          iconColor: visual?.[1] ?? '#d99a16',
          background: visual?.[2] ?? '#fffbdc',
          prices: Array.from({ length: 9 }, (_, index) => values[index] ?? 'Liên hệ'),
        });
      }
    }

    for (const group of Object.values(result)) {
      if (!group.columns.length) group.columns = PRICING_COLUMNS;
    }
    return result;
  }

  private formatPrice(item: ApiPrice): string {
    if (item.is_contact || item.price === null || item.price === undefined) return 'Liên hệ';
    const value = Number(item.price);
    if (!Number.isFinite(value)) return 'Liên hệ';
    return `${value >= 1000 ? Math.round(value / 1000) : value}k`;
  }
}
