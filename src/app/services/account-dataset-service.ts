import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';

export interface MockAccountProfile {
  fullName: string;
  email: string;
  phone: string;
  gender?: string;
  birthDate?: string;
}

export interface MockAccountAddress {
  id: string;
  name: string;
  recipient?: string;
  phone: string;
  email: string;
  country: string;
  address: string;
  city?: string;
  isDefault: boolean;
}

@Injectable({ providedIn: 'root' })
export class AccountDatasetService {
  constructor(private readonly http: HttpClient) {}

  getUserProfileData(): Observable<{ profile: MockAccountProfile; addresses: MockAccountAddress[] }> {
    return this.http.get<unknown>('/datasets/userProfileData.json').pipe(
      map((value) => {
        const data = this.toObject(value, 'thông tin tài khoản');
        const profile = this.toObject(data['DEFAULT_USER_PROFILE'], 'hồ sơ người dùng');
        const addresses = data['DEFAULT_USER_ADDRESSES'];
        if (!Array.isArray(addresses)) throw new Error('Danh sách địa chỉ mẫu không đúng định dạng.');
        return {
          profile: {
            fullName: String(profile['fullName'] ?? ''),
            email: String(profile['email'] ?? ''),
            phone: String(profile['phone'] ?? ''),
            gender: String(profile['gender'] ?? ''),
            birthDate: String(profile['birthDate'] ?? ''),
          },
          addresses: addresses.map((item) => {
            const address = this.toObject(item, 'địa chỉ người dùng');
            return {
              id: String(address['id'] ?? ''),
              name: String(address['name'] ?? address['recipient'] ?? ''),
              recipient: String(address['recipient'] ?? address['name'] ?? ''),
              phone: String(address['phone'] ?? ''),
              email: String(address['email'] ?? ''),
              country: String(address['country'] ?? ''),
              address: String(address['address'] ?? ''),
              city: String(address['city'] ?? ''),
              isDefault: Boolean(address['isDefault']),
            };
          }),
        };
      }),
    );
  }

  getPets(): Observable<Record<string, unknown>[]> {
    return this.http.get<unknown>('/datasets/mockPets.json').pipe(
      map((value) => this.toArray(value, 'MOCK_PETS', 'hồ sơ thú cưng')),
    );
  }

  getAppointments(): Observable<Record<string, unknown>[]> {
    return this.http.get<unknown>('/datasets/mockAppointments.json').pipe(
      map((value) => this.toArray(value, 'MOCK_APPOINTMENTS', 'lịch hẹn')),
    );
  }

  getOrders(): Observable<Record<string, unknown>[]> {
    return this.http.get<unknown>('/datasets/orderData.json').pipe(
      map((value) => this.toArray(value, 'ORDERS', 'đơn hàng')),
    );
  }

  private toArray(value: unknown, key: string, label: string): Record<string, unknown>[] {
    const data = this.toObject(value, label);
    const items = data[key];
    if (!Array.isArray(items)) throw new Error(`Dữ liệu ${label} không đúng định dạng.`);
    return items.map((item) => this.toObject(item, label));
  }

  private toObject(value: unknown, label: string): Record<string, unknown> {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      throw new Error(`Dữ liệu ${label} không đúng định dạng.`);
    }
    return value as Record<string, unknown>;
  }
}
