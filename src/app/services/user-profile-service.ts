import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { AccountDatasetService } from './account-dataset-service';

export interface UserProfileRecord {
  userId: string;
  fullName: string;
  email: string;
  phone: string;
  avatarUrl?: string;
  gender?: string;
  birthDate?: string;
}

export interface UserAddressRecord {
  id: string;
  name: string;
  phone: string;
  email: string;
  country: string;
  address: string;
  ward: string;
  district: string;
  city: string;
  isDefault: boolean;
}

interface ApiEnvelope<T> {
  EC?: number;
  EM?: string;
  DT?: T;
}

@Injectable({ providedIn: 'root' })
export class UserProfileService {
  private readonly baseUrl = 'http://localhost:8080/api/v1';

  constructor(
    private readonly http: HttpClient,
    private readonly accountDataset: AccountDatasetService,
  ) {}

  getDefaultProfileData(): Observable<{ profile: UserProfileRecord; addresses: UserAddressRecord[] }> {
    return this.accountDataset.getUserProfileData().pipe(map(({ profile, addresses }) => ({
      profile: {
        userId: '',
        fullName: profile.fullName,
        email: profile.email,
        phone: profile.phone,
        gender: profile.gender ?? '',
        birthDate: profile.birthDate ?? '',
      },
      addresses: addresses.map((address) => ({
        id: address.id,
        name: address.name,
        phone: address.phone,
        email: address.email,
        country: address.country,
        address: address.address,
        ward: '',
        district: '',
        city: address.city ?? '',
        isDefault: address.isDefault,
      })),
    })));
  }

  getProfile(userId: string): Observable<UserProfileRecord> {
    return this.http.get<ApiEnvelope<Record<string, unknown>>>(`${this.baseUrl}/users/${encodeURIComponent(userId)}`).pipe(
      map((response) => this.normalizeProfile(this.unwrap(response))),
    );
  }

  updateProfile(userId: string, profile: UserProfileRecord): Observable<UserProfileRecord> {
    return this.http.put<ApiEnvelope<Record<string, unknown>>>(`${this.baseUrl}/users/${encodeURIComponent(userId)}`, {
      full_name: profile.fullName,
      email: profile.email || null,
      phone: profile.phone || null,
      avatar_url: profile.avatarUrl || null,
      gender: profile.gender || null,
      birth_date: profile.birthDate || null,
    }).pipe(map((response) => this.normalizeProfile(this.unwrap(response))));
  }

  getAddresses(userId: string): Observable<UserAddressRecord[]> {
    return this.http.get<ApiEnvelope<Array<Record<string, unknown>>>>(`${this.baseUrl}/users/${encodeURIComponent(userId)}/addresses`).pipe(
      map((response) => {
        const addresses = this.unwrap(response);
        if (!Array.isArray(addresses)) throw new Error('Dữ liệu địa chỉ không hợp lệ.');
        return addresses.map((address) => this.normalizeAddress(address));
      }),
    );
  }

  createAddress(userId: string, address: UserAddressRecord): Observable<UserAddressRecord> {
    return this.http.post<ApiEnvelope<Record<string, unknown>>>(`${this.baseUrl}/users/${encodeURIComponent(userId)}/addresses`, this.addressPayload(address))
      .pipe(map((response) => this.normalizeAddress(this.unwrap(response))));
  }

  updateAddress(addressId: string, address: UserAddressRecord): Observable<UserAddressRecord> {
    return this.http.put<ApiEnvelope<Record<string, unknown>>>(`${this.baseUrl}/addresses/${encodeURIComponent(addressId)}`, this.addressPayload(address))
      .pipe(map((response) => this.normalizeAddress(this.unwrap(response))));
  }

  deleteAddress(addressId: string): Observable<unknown> {
    return this.http.delete<ApiEnvelope<unknown>>(`${this.baseUrl}/addresses/${encodeURIComponent(addressId)}`)
      .pipe(map((response) => this.unwrap(response)));
  }

  private unwrap<T>(response: ApiEnvelope<T>): T {
    if (response?.EC !== undefined && response.EC !== 0) {
      throw new Error(response.EM || 'Yêu cầu hồ sơ không thành công.');
    }
    if (response && Object.prototype.hasOwnProperty.call(response, 'DT')) {
      if (response.DT === undefined || response.DT === null) {
        throw new Error('Máy chủ trả về dữ liệu hồ sơ trống.');
      }
      return response.DT;
    }
    return response as T;
  }

  private normalizeProfile(value: Record<string, unknown>): UserProfileRecord {
    return {
      userId: String(value['user_id'] ?? value['userId'] ?? ''),
      fullName: String(value['full_name'] ?? value['fullName'] ?? ''),
      email: String(value['email'] ?? ''),
      phone: String(value['phone'] ?? ''),
      avatarUrl: String(value['avatar_url'] ?? value['avatarUrl'] ?? ''),
      gender: String(value['gender'] ?? ''),
      birthDate: String(value['birth_date'] ?? value['birthDate'] ?? ''),
    };
  }

  private normalizeAddress(value: Record<string, unknown>): UserAddressRecord {
    return {
      id: String(value['address_id'] ?? value['id'] ?? ''),
      name: String(value['recipient_name'] ?? value['name'] ?? ''),
      phone: String(value['recipient_phone'] ?? value['phone'] ?? ''),
      email: String(value['recipient_email'] ?? value['email'] ?? ''),
      country: String(value['country'] ?? 'Việt Nam'),
      address: String(value['address_line'] ?? value['address'] ?? ''),
      ward: String(value['ward'] ?? ''),
      district: String(value['district'] ?? ''),
      city: String(value['province'] ?? value['city'] ?? ''),
      isDefault: Boolean(value['is_default'] ?? value['isDefault']),
    };
  }

  private addressPayload(address: UserAddressRecord): Record<string, unknown> {
    return {
      recipient_name: address.name,
      recipient_phone: address.phone,
      recipient_email: address.email || null,
      address_line: address.address,
      ward: address.ward || null,
      district: address.district || null,
      province: address.city || null,
      country: address.country || 'Việt Nam',
      is_default: address.isDefault,
    };
  }
}
