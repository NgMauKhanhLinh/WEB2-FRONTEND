import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { UserProfileService } from './user-profile-service';

describe('UserProfileService', () => {
  let service: UserProfileService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(UserProfileService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('normalizes profile fields from the user API response', () => {
    let fullName = '';
    service.getProfile('user-1').subscribe((profile) => fullName = profile.fullName);
    http.expectOne('http://localhost:8080/api/v1/users/user-1').flush({
      EC: 0,
      DT: { user_id: 'user-1', full_name: 'Nguyễn An', email: 'an@example.com', phone: '0901234567' },
    });
    expect(fullName).toBe('Nguyễn An');
  });

  it('reports backend errors instead of returning an empty profile', () => {
    let message = '';
    service.getProfile('user-1').subscribe({ error: (error: Error) => message = error.message });
    http.expectOne('http://localhost:8080/api/v1/users/user-1').flush({
      EC: 2,
      EM: 'Không thể tải hồ sơ.',
    });
    expect(message).toBe('Không thể tải hồ sơ.');
  });

  it('loads the profile and addresses from the account dataset', () => {
    let result: { profile: { fullName: string; email: string }; addresses: { city: string }[] } | undefined;
    service.getDefaultProfileData().subscribe((data) => result = data);
    http.expectOne('/datasets/userProfileData.json').flush({
      DEFAULT_USER_PROFILE: {
        fullName: 'Nguyễn Văn A',
        email: 'example@gmail.com',
        phone: '0901 234 567',
      },
      DEFAULT_USER_ADDRESSES: [{
        id: 'address-1',
        name: 'Nguyễn Văn A',
        phone: '0901 234 567',
        email: 'example@gmail.com',
        country: 'Việt Nam',
        address: 'Số 123, Đường Lê Lợi',
        city: 'TP. Hồ Chí Minh',
        isDefault: true,
      }],
    });
    expect(result?.profile).toMatchObject({
      fullName: 'Nguyễn Văn A',
      email: 'example@gmail.com',
    });
    expect(result?.addresses[0].city).toBe('TP. Hồ Chí Minh');
  });
});
