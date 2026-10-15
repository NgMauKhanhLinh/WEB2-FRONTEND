import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { NotificationService } from './notification-service';

describe('NotificationService', () => {
  let service: NotificationService;
  let http: HttpTestingController;

  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(NotificationService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('fetches notifications using status and search filters', () => {
    let text = '';
    service.getNotifications('unread', 'Mimi').subscribe((items) => text = items[0].searchableText);
    const request = http.expectOne((req) => req.url === 'http://localhost:8080/api/v1/notifications');
    expect(request.request.params.get('status')).toBe('unread');
    expect(request.request.params.get('search')).toBe('Mimi');
    request.flush({ EC: 0, DT: [{ notification_id: 8, notification_type: 'appointment', content: 'Lịch hẹn Mimi', is_read: false, pet: { pet_name: 'Mimi' } }] });
    expect(text).toBe('Lịch hẹn Mimi');
  });

  it('uses the notification read endpoints', () => {
    service.markAsRead('8').subscribe();
    const readRequest = http.expectOne('http://localhost:8080/api/v1/notifications/8/read');
    expect(readRequest.request.method).toBe('PATCH');
    readRequest.flush({ EC: 0, DT: {} });

    service.markAllAsRead().subscribe();
    const allRequest = http.expectOne('http://localhost:8080/api/v1/notifications/read-all');
    expect(allRequest.request.method).toBe('PATCH');
    allRequest.flush({ EC: 0, DT: {} });
  });
});
