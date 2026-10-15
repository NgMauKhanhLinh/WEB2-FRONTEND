import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { BookingService } from './booking-service';

describe('BookingService', () => {
  let service: BookingService;
  let http: HttpTestingController;

  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(BookingService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('loads and normalizes service options', () => {
    let serviceType = '';
    service.getServices().subscribe((services) => serviceType = services[0].type);
    const request = http.expectOne((req) => req.url === 'http://localhost:8080/api/v1/services');
    expect(request.request.params.get('limit')).toBe('100');
    request.flush({ EC: 0, DT: { services: [{ service_id: 7, service_name: 'Grooming spa', base_price: 200000 }] } });
    expect(serviceType).toBe('grooming');
  });

  it('loads available appointment slots for selected date, branch, and service type', () => {
    let slotLabel = '';
    service.getAppointmentSlots('2026-10-20', '3', 'clinic').subscribe((slots) => slotLabel = slots[0].label);
    const request = http.expectOne((req) => req.url === 'http://localhost:8080/api/v1/appointments/slots');
    expect(request.request.params.get('date')).toBe('2026-10-20');
    expect(request.request.params.get('branch_id')).toBe('3');
    expect(request.request.params.get('service_type')).toBe('exam');
    request.flush({ EC: 0, DT: [{ slot_id: 9, start_time: '2026-10-20T08:30:00Z', end_time: '2026-10-20T09:00:00Z', status: 'available' }] });
    expect(slotLabel).toBe('08:30 - 09:00');
  });

  it('sends booking data in the API contract', () => {
    service.bookAppointment({
      slotId: '9', serviceId: '7', petName: 'Mimi', speciesId: '2',
      customerName: 'Nguyễn An', customerPhone: '0901234567', notes: 'Cần kiểm tra tai',
    }).subscribe();
    const request = http.expectOne('http://localhost:8080/api/v1/appointments/book');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({
      slot_id: '9',
      pet_data: { pet_name: 'Mimi', species_id: '2', health_status: 'unknown', gender: 'unknown' },
      service_ids: [{ service_id: '7', quantity: 1 }],
      customer_name_snapshot: 'Nguyễn An',
      customer_phone_snapshot: '0901234567',
      condition_description: 'Cần kiểm tra tai',
      note: 'Cần kiểm tra tai',
      payment_method: 'store',
    });
    request.flush({ EC: 0, DT: { appointment_id: 45 } });
  });

  it('sends all selected services and the chosen payment method', () => {
    service.bookAppointment({
      slotId: '9',
      services: [{ serviceId: '7', quantity: 1 }, { serviceId: '8', quantity: 2 }],
      petName: 'Mimi',
      speciesId: '2',
      customerName: 'Nguyễn An',
      customerPhone: '0901234567',
      notes: '',
      paymentMethod: 'online',
    }).subscribe();
    const request = http.expectOne('http://localhost:8080/api/v1/appointments/book');
    expect(request.request.body['service_ids']).toEqual([
      { service_id: '7', quantity: 1 },
      { service_id: '8', quantity: 2 },
    ]);
    expect(request.request.body['payment_method']).toBe('online');
    request.flush({ EC: 0, DT: { appointment_id: 46 } });
  });

  it('sends appointment cancellation, checkout, and service review requests', () => {
    service.cancelAppointment('45').subscribe();
    const cancellation = http.expectOne('http://localhost:8080/api/v1/appointments/45/cancel');
    expect(cancellation.request.method).toBe('PATCH');
    cancellation.flush({ EC: 0, DT: {} });

    service.checkoutAppointment('45', 'store').subscribe();
    const checkout = http.expectOne('http://localhost:8080/api/v1/appointments/45/checkout');
    expect(checkout.request.body).toEqual({ payment_method: 'store' });
    checkout.flush({ EC: 0, DT: {} });

    service.createServiceReview('7', 5, 'Rất tốt').subscribe();
    const review = http.expectOne('http://localhost:8080/api/v1/reviews');
    expect(review.request.body).toEqual({ target_type: 'service', target_id: '7', rating: 5, comment: 'Rất tốt' });
    review.flush({ EC: 0, DT: {} });
  });

  it('normalizes appointment history for the account page', () => {
    let appointmentLabel = '';
    service.getAppointmentHistory().subscribe((appointments) => {
      appointmentLabel = `${appointments[0].petName} · ${appointments[0].statusLabel}`;
    });
    http.expectOne('http://localhost:8080/api/v1/appointments/my-history').flush({
      EC: 0,
      DT: [{
        appointment_id: 45,
        appointment_code: 'APT-45',
        status: 'pending',
        payment_method: 'store',
        appointment_date: '2026-10-20T00:00:00.000Z',
        start_time: '2026-10-20T08:30:00Z',
        pet: { pet_name: 'Mimi' },
        services: [{ service: { service_name: 'Khám tổng quát', base_price: 150000 } }],
      }],
    });
    expect(appointmentLabel).toBe('Mimi · Đã xác nhận');
  });
});
