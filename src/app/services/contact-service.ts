import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';

export interface ContactBranch {
  id: string;
  name: string;
  address: string;
  hours: string;
  phone: string;
  email: string;
}

interface ApiEnvelope<T> {
  EC?: number;
  EM?: string;
  DT?: T;
}

const FALLBACK_BRANCHES: ContactBranch[] = [
  { id: '1', name: 'Chi nhánh 1', address: '669 Đỗ Mười, khu phố 13, Linh Xuân, Hồ Chí Minh', hours: 'Cả ngày (24/7) kể cả cuối tuần, lễ, Tết.', phone: '0987.654.321', email: '' },
  { id: '2', name: 'Chi nhánh 2', address: '530 Huỳnh Tấn Phát, Tân Thuận, Hồ Chí Minh', hours: 'Cả ngày (24/7) kể cả cuối tuần, lễ, Tết.', phone: '0123.456.789', email: '' },
  { id: '3', name: 'Chi nhánh 3', address: '162T Trường Chinh, Bảy Hiền, Hồ Chí Minh', hours: '8:00 - 22:00 (kể cả cuối tuần, lễ, Tết)', phone: '0923.446.779', email: '' },
  { id: '4', name: 'Chi nhánh 4', address: '27 Nguyễn Thị Minh Khai, Bến Nghé, Hồ Chí Minh', hours: '8:00 - 22:00 (kể cả cuối tuần, lễ, Tết)', phone: '0901.234.567', email: '' },
  { id: '5', name: 'Chi nhánh 5', address: '88 Lê Văn Sỹ, phường 11, Phú Nhuận, Hồ Chí Minh', hours: '8:00 - 22:00 (kể cả cuối tuần, lễ, Tết)', phone: '0902.345.678', email: '' },
  { id: '6', name: 'Chi nhánh 6', address: '145 Võ Văn Ngân, Linh Chiểu, Thủ Đức, Hồ Chí Minh', hours: 'Cả ngày (24/7) kể cả cuối tuần, lễ, Tết.', phone: '0903.456.789', email: '' },
  { id: '7', name: 'Chi nhánh 7', address: '12 Nguyễn Ảnh Thủ, Trung Mỹ Tây, Hồ Chí Minh', hours: '8:00 - 22:00 (kể cả cuối tuần, lễ, Tết)', phone: '0904.567.890', email: '' },
  { id: '8', name: 'Chi nhánh 8', address: '245 Nguyễn Duy Trinh, Bình Trưng Tây, Hồ Chí Minh', hours: '8:00 - 22:00 (kể cả cuối tuần, lễ, Tết)', phone: '0905.678.901', email: '' },
  { id: '9', name: 'Chi nhánh 9', address: '6 Đại lộ Bình Dương, Phú Hòa, Bình Dương', hours: '8:00 - 22:00 (kể cả cuối tuần, lễ, Tết)', phone: '0906.789.012', email: '' },
  { id: '10', name: 'Chi nhánh 10', address: '102 Hạ Long, phường 2, Vũng Tàu', hours: 'Cả ngày (24/7) kể cả cuối tuần, lễ, Tết.', phone: '0907.890.123', email: '' },
];

@Injectable({ providedIn: 'root' })
export class ContactService {
  private readonly baseUrl = 'http://localhost:8080/api/v1';

  constructor(private readonly http: HttpClient) {}

  getFallbackBranches(): ContactBranch[] {
    return FALLBACK_BRANCHES.map((branch) => ({ ...branch }));
  }

  getBranches(): Observable<ContactBranch[]> {
    return this.http.get<ApiEnvelope<Array<Record<string, unknown>>> | Array<Record<string, unknown>>>(`${this.baseUrl}/branches`).pipe(
      map((response) => {
        const data = this.unwrap(response);
        if (!Array.isArray(data)) throw new Error('Dữ liệu chi nhánh không hợp lệ.');
        return data.map((branch, index) => ({
          id: String(branch['branch_id'] ?? branch['id'] ?? index + 1),
          name: String(branch['branch_name'] ?? branch['name'] ?? `Chi nhánh ${index + 1}`),
          address: String(branch['address'] ?? ''),
          hours: String(branch['operating_hours'] ?? branch['hours'] ?? 'Vui lòng liên hệ để biết giờ hoạt động.'),
          phone: String(branch['phone'] ?? ''),
          email: String(branch['email'] ?? ''),
        }));
      }),
    );
  }

  submitMessage(form: { name: string; gender: string; phone: string; email: string; message: string }): Observable<unknown> {
    return this.http.post<ApiEnvelope<unknown> | unknown>(`${this.baseUrl}/contacts`, {
      name: form.name.trim(),
      gender: form.gender,
      phone: form.phone.trim(),
      email: form.email.trim(),
      message: form.message.trim(),
    }).pipe(map((response) => this.unwrap(response)));
  }

  private unwrap<T>(response: ApiEnvelope<T> | T): T {
    if (response && typeof response === 'object' && 'EC' in response) {
      const envelope = response as ApiEnvelope<T>;
      if (envelope.EC !== undefined && envelope.EC !== 0) {
        throw new Error(envelope.EM || 'Yêu cầu liên hệ không thành công.');
      }
      if (Object.prototype.hasOwnProperty.call(envelope, 'DT')) {
        if (envelope.DT === undefined) throw new Error('Máy chủ trả về dữ liệu trống.');
        return envelope.DT as T;
      }
    }
    return response as T;
  }
}
