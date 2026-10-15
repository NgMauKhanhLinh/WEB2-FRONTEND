import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ContactService } from './contact-service';

describe('ContactService', () => {
  let service: ContactService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(ContactService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('normalizes branch details from the API', () => {
    let branchName = '';
    service.getBranches().subscribe((branches) => branchName = branches[0].name);
    http.expectOne('http://localhost:8080/api/v1/branches').flush({
      EC: 0,
      DT: [{ branch_id: 7, branch_name: 'Chi nhánh Thủ Đức', address: 'Võ Văn Ngân', phone: '0900000000' }],
    });
    expect(branchName).toBe('Chi nhánh Thủ Đức');
  });

  it('posts trimmed contact details using the expected API contract', () => {
    service.submitMessage({
      name: '  Nguyễn An  ',
      gender: '',
      phone: ' 0901234567 ',
      email: ' an@example.com ',
      message: '  Xin tư vấn  ',
    }).subscribe();
    const request = http.expectOne('http://localhost:8080/api/v1/contacts');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({
      name: 'Nguyễn An',
      gender: '',
      phone: '0901234567',
      email: 'an@example.com',
      message: 'Xin tư vấn',
    });
    request.flush({ EC: 0, DT: { accepted: true } });
  });

  it('exposes the backend error message for failed contact requests', () => {
    let message = '';
    service.submitMessage({ name: 'An', gender: '', phone: '090', email: 'a@example.com', message: 'Hello' })
      .subscribe({ error: (error: Error) => message = error.message });
    http.expectOne('http://localhost:8080/api/v1/contacts').flush({ EC: 1, EM: 'Không thể gửi lời nhắn.' });
    expect(message).toBe('Không thể gửi lời nhắn.');
  });
});
