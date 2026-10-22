import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { AuthService } from './auth-service';
import { AccountDatasetService } from './account-dataset-service';

export interface BookingServiceOption {
  id: string;
  name: string;
  description: string;
  price: number;
  type: 'clinic' | 'grooming';
}

export interface AppointmentSlot {
  id: string;
  label: string;
  available: boolean;
  doctorName: string;
}

export interface PetSpecies {
  id: string;
  name: string;
}

export interface AppointmentHistoryItem {
  id: string;
  code: string;
  date: string;
  rawDate: string;
  startTime: string;
  endTime: string;
  petName: string;
  serviceName: string;
  serviceId: string;
  serviceType: 'clinic' | 'grooming';
  services: { id: string; serviceId: string; name: string; serviceTypeId: 'clinic' | 'grooming'; quantity: number }[];
  price: number;
  status: string;
  statusLabel: string;
  paymentMethod: string;
  paymentStatus: string;
  paymentExpiresAt: string;
  canCancel: boolean;
  canReschedule: boolean;
  canRebook: boolean;
  canReview: boolean;
  reviewed: boolean;
}

interface ApiEnvelope<T> {
  EC?: number;
  EM?: string;
  DT?: T;
}

const API_BASE = 'http://localhost:8080/api/v1';

@Injectable({ providedIn: 'root' })
export class BookingService {
  constructor(
    private readonly http: HttpClient,
    private readonly authService: AuthService,
    private readonly accountDataset: AccountDatasetService,
  ) {}

  getServices(): Observable<BookingServiceOption[]> {
    return this.http.get<unknown>(`${API_BASE}/services`, {
      params: new HttpParams().set('limit', '100'),
      headers: this.headers(),
      withCredentials: true,
    }).pipe(
      map((response) => {
        const payload = this.unwrap<unknown>(response);
        const services = Array.isArray(payload)
          ? payload
          : payload && typeof payload === 'object' && Array.isArray((payload as Record<string, unknown>)['services'])
            ? (payload as { services: unknown[] }).services
            : [];
        return services.map((value) => {
          const service = value as Record<string, unknown>;
          const category = service['category'] && typeof service['category'] === 'object'
            ? (service['category'] as Record<string, unknown>)['category_name']
            : '';
          const type = /groom|spa/i.test(`${category} ${String(service['service_name'] ?? '')}`) ? 'grooming' : 'clinic';
          return {
            id: String(service['service_id'] ?? service['id'] ?? ''),
            name: String(service['service_name'] ?? service['name'] ?? 'Dịch vụ'),
            description: String(service['description'] ?? ''),
            price: Number(service['base_price'] ?? service['price'] ?? 0),
            type,
          };
        });
      }),
    );
  }

  getPetSpecies(): Observable<PetSpecies[]> {
    return this.http.get<unknown>(`${API_BASE}/pets/species`, {
      headers: this.headers(),
      withCredentials: true,
    }).pipe(
      map((response) => this.asArray(this.unwrap<unknown>(response), 'loài thú cưng').map((value) => {
        const species = value as Record<string, unknown>;
        return {
          id: String(species['species_id'] ?? species['id'] ?? ''),
          name: String(species['species_name'] ?? species['name'] ?? ''),
        };
      })),
    );
  }

  getAppointmentSlots(date: string, branchId: string, serviceType: 'clinic' | 'grooming'): Observable<AppointmentSlot[]> {
    const params = new HttpParams()
      .set('date', date)
      .set('branch_id', branchId)
      .set('service_type', serviceType === 'grooming' ? 'grooming' : 'exam');
    return this.http.get<unknown>(`${API_BASE}/appointments/slots`, {
      params,
      headers: this.headers(),
      withCredentials: true,
    }).pipe(
      map((response) => this.asArray(this.unwrap<unknown>(response), 'khung giờ').map((value) => {
        const slot = value as Record<string, unknown>;
        const start = this.formatTime(slot['start_time']);
        const end = this.formatTime(slot['end_time']);
        const booked = Number(slot['booked_count'] ?? 0);
        const capacity = Number(slot['max_booking'] ?? 1);
        const doctor = slot['doctor'] && typeof slot['doctor'] === 'object'
          ? slot['doctor'] as Record<string, unknown>
          : {};
        return {
          id: String(slot['slot_id'] ?? slot['id'] ?? ''),
          label: `${start} - ${end}`,
          available: slot['status'] === 'available' && booked < capacity,
          doctorName: String(doctor['full_name'] ?? doctor['doctor_name'] ?? ''),
        };
      })),
    );
  }

  bookAppointment(payload: {
    slotId: string;
    serviceId?: string;
    services?: { serviceId: string; quantity: number }[];
    petId?: string;
    petName: string;
    speciesId: string;
    customerName: string;
    customerPhone: string;
    notes: string;
    paymentMethod?: 'store' | 'online';
  }): Observable<unknown> {
    const services = payload.services?.length
      ? payload.services
      : payload.serviceId ? [{ serviceId: payload.serviceId, quantity: 1 }] : [];
    return this.http.post<unknown>(`${API_BASE}/appointments/book`, {
      slot_id: payload.slotId,
      pet_id: payload.petId || undefined,
      pet_data: payload.petId ? undefined : {
        pet_name: payload.petName.trim(),
        species_id: payload.speciesId,
        health_status: 'unknown',
        gender: 'unknown',
      },
      service_ids: services.map((service) => ({ service_id: service.serviceId, quantity: service.quantity })),
      customer_name_snapshot: payload.customerName.trim(),
      customer_phone_snapshot: payload.customerPhone.trim(),
      condition_description: payload.notes.trim() || undefined,
      note: payload.notes.trim() || undefined,
      payment_method: payload.paymentMethod ?? 'store',
    }, { headers: this.headers(), withCredentials: true }).pipe(
      map((response) => this.unwrap<unknown>(response)),
    );
  }

  cancelAppointment(appointmentId: string): Observable<unknown> {
    return this.http.patch<unknown>(`${API_BASE}/appointments/${encodeURIComponent(appointmentId)}/cancel`, {}, {
      headers: this.headers(),
      withCredentials: true,
    }).pipe(map((response) => this.unwrap<unknown>(response)));
  }

  checkoutAppointment(appointmentId: string, paymentMethod: 'store' | 'online' = 'store'): Observable<unknown> {
    return this.http.post<unknown>(`${API_BASE}/appointments/${encodeURIComponent(appointmentId)}/checkout`, {
      payment_method: paymentMethod,
    }, { headers: this.headers(), withCredentials: true }).pipe(
      map((response) => this.unwrap<unknown>(response)),
    );
  }

  createServiceReview(serviceId: string, rating: number, comment: string): Observable<unknown> {
    return this.http.post<unknown>(`${API_BASE}/reviews`, {
      target_type: 'service',
      target_id: serviceId,
      rating,
      comment: comment.trim(),
    }, { headers: this.headers(), withCredentials: true }).pipe(
      map((response) => this.unwrap<unknown>(response)),
    );
  }

  getAppointmentHistory(): Observable<AppointmentHistoryItem[]> {
    if (!this.authService.isAuthenticated()) {
      return this.accountDataset.getAppointments().pipe(map((appointments) => appointments.map((appointment) => this.normalizeMockAppointment(appointment))));
    }
    return this.http.get<unknown>(`${API_BASE}/appointments/my-history`, {
      headers: this.headers(),
      withCredentials: true,
    }).pipe(
      map((response) => this.asArray(this.unwrap<unknown>(response), 'lịch hẹn').map((value) => {
        const appointment = value as Record<string, unknown>;
        const rawServices = Array.isArray(appointment['appointment_services'])
          ? appointment['appointment_services'] as Array<Record<string, unknown>>
          : Array.isArray(appointment['services']) ? appointment['services'] as Array<Record<string, unknown>> : [];
        const pet = appointment['pet'] && typeof appointment['pet'] === 'object'
          ? appointment['pet'] as Record<string, unknown>
          : {};
        const serviceNames = rawServices.map((item) => {
          const service = item['service'] && typeof item['service'] === 'object'
            ? item['service'] as Record<string, unknown>
            : {};
          return String(service['service_name'] ?? item['service_name'] ?? '');
        }).filter(Boolean);
        const price = rawServices.reduce((total, item) => {
          const service = item['service'] && typeof item['service'] === 'object'
            ? item['service'] as Record<string, unknown>
            : {};
          const count = Number(item['quantity'] ?? 1);
          const linePrice = Number(item['total_price'] ?? 0);
          return total + (linePrice || Number(item['unit_price'] ?? service['base_price'] ?? 0) * count) + Number(item['surcharge_amount'] ?? 0);
        }, 0);
        const rawStatus = String(appointment['status'] ?? 'confirmed');
        const paymentMethod = String(appointment['payment_method'] ?? 'online');
        const paymentStatus = String(appointment['payment_status'] ?? 'unpaid');
        const status = rawStatus === 'missed' ? 'no_show'
          : rawStatus === 'pending' && (paymentStatus === 'waiting_store_payment' || paymentMethod === 'store') ? 'confirmed'
            : rawStatus === 'pending' || (paymentStatus === 'unpaid' && !['store', 'cash', 'pay_at_clinic'].includes(paymentMethod) && !['cancelled', 'completed'].includes(rawStatus)) ? 'pending_payment'
              : rawStatus;
        const statusLabels: Record<string, string> = {
          pending_payment: 'Chờ thanh toán',
          pending: 'Chờ xác nhận',
          confirmed: 'Đã xác nhận',
          completed: 'Đã hoàn thành',
          cancelled: 'Đã hủy',
          no_show: 'Không đến',
        };
        return {
          id: String(appointment['appointment_id'] ?? appointment['id'] ?? ''),
          code: String(appointment['appointment_code'] ?? appointment['code'] ?? ''),
          rawDate: String(appointment['appointment_date'] ?? ''),
          date: String(appointment['appointment_date'] ?? ''),
          startTime: this.formatTime(appointment['start_time']),
          endTime: this.formatTime(appointment['end_time']),
          petName: String(pet['pet_name'] ?? appointment['pet_name_snapshot'] ?? 'Thú cưng'),
          serviceName: serviceNames.join(', ') || 'Dịch vụ',
          serviceId: String(rawServices[0]?.['service_id'] ?? (rawServices[0]?.['service'] as Record<string, unknown> | undefined)?.['service_id'] ?? ''),
          serviceType: /groom|spa/i.test(serviceNames.join(' ')) ? 'grooming' : 'clinic',
          services: rawServices.map((item) => {
            const service = item['service'] && typeof item['service'] === 'object'
              ? item['service'] as Record<string, unknown>
              : {};
            const name = String(service['service_name'] ?? item['service_name'] ?? '');
            const id = String(item['service_id'] ?? service['service_id'] ?? '');
            const category = service['category'] && typeof service['category'] === 'object'
              ? String((service['category'] as Record<string, unknown>)['category_name'] ?? '')
              : '';
            return {
              id,
              serviceId: id,
              name,
              serviceTypeId: /groom|spa/i.test(`${name} ${category}`) ? 'grooming' as const : 'clinic' as const,
              quantity: Number(item['quantity'] ?? 1),
            };
          }).filter((item) => item.id),
          price,
          status,
          statusLabel: statusLabels[status] ?? status,
          paymentMethod,
          paymentStatus,
          paymentExpiresAt: String(appointment['payment_expires_at'] ?? ''),
          canCancel: ['pending', 'confirmed', 'pending_payment'].includes(status),
          canReschedule: ['pending', 'confirmed'].includes(status),
          canRebook: ['completed', 'cancelled', 'no_show'].includes(status),
          canReview: status === 'completed',
          reviewed: Boolean(appointment['reviewed']),
        };
      })),
    );
  }

  private normalizeMockAppointment(value: Record<string, unknown>): AppointmentHistoryItem {
    const pet = value['pet'] && typeof value['pet'] === 'object'
      ? value['pet'] as Record<string, unknown>
      : {};
    const service = value['service'] && typeof value['service'] === 'object'
      ? value['service'] as Record<string, unknown>
      : {};
    const serviceId = String(service['id'] ?? '');
    const serviceName = String(service['name'] ?? 'Dịch vụ');
    const serviceType = /groom|spa/i.test(`${serviceId} ${serviceName}`) ? 'grooming' : 'clinic';
    const timeRange = String(service['timeRange'] ?? '');
    const [startTime = '', endTime = ''] = timeRange.split(/\s*-\s*/);
    const status = String(value['status'] ?? '');
    const statusLabels: Record<string, string> = {
      pending_payment: 'Chờ thanh toán',
      confirmed: 'Đã xác nhận',
      completed: 'Đã hoàn thành',
      cancelled: 'Đã hủy',
      no_show: 'Không đến',
    };
    const paymentMethodValue = String(value['paymentMethod'] ?? '');
    const paymentMethod = ['pay_at_clinic', 'cash'].includes(paymentMethodValue) ? 'store' : 'online';
    const paymentStatus = String(value['paymentStatus'] ?? '');
    const rawDate = this.parseMockDate(String(service['dateText'] ?? ''));
    return {
      id: String(value['id'] ?? ''),
      code: String(value['code'] ?? ''),
      date: rawDate,
      rawDate,
      startTime,
      endTime,
      petName: String(pet['name'] ?? 'Thú cưng'),
      serviceName: String(service['description'] ?? serviceName),
      serviceId,
      serviceType,
      services: serviceId ? [{
        id: serviceId,
        serviceId,
        name: serviceName,
        serviceTypeId: serviceType,
        quantity: 1,
      }] : [],
      price: Number(service['price'] ?? 0),
      status,
      statusLabel: statusLabels[status] ?? status,
      paymentMethod,
      paymentStatus,
      paymentExpiresAt: String(value['paymentExpiresAt'] ?? ''),
      canCancel: Boolean(value['canCancel']),
      canReschedule: Boolean(value['canReschedule']),
      canRebook: Boolean(value['canRebook']),
      canReview: Boolean(value['canReview']),
      reviewed: Boolean(value['reviewed']),
    };
  }

  private parseMockDate(value: string): string {
    const match = value.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    return match ? `${match[3]}-${match[2]}-${match[1]}T00:00:00` : value;
  }

  private asArray(value: unknown, label: string): unknown[] {
    if (Array.isArray(value)) return value;
    if (value && typeof value === 'object') {
      const record = value as Record<string, unknown>;
      for (const key of ['items', 'data', 'species', 'slots', 'appointments']) {
        if (Array.isArray(record[key])) return record[key] as unknown[];
      }
    }
    throw new Error(`Dữ liệu ${label} không hợp lệ.`);
  }

  private unwrap<T>(response: unknown): T {
    if (response && typeof response === 'object' && 'EC' in response) {
      const envelope = response as ApiEnvelope<T>;
      if (envelope.EC !== undefined && envelope.EC !== 0) {
        throw new Error(envelope.EM || 'Yêu cầu đặt lịch không thành công.');
      }
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

  private formatTime(value: unknown): string {
    if (!value) return '';
    const text = String(value);
    const match = text.match(/(\d{2}):(\d{2})/);
    return match ? `${match[1]}:${match[2]}` : text;
  }
}
