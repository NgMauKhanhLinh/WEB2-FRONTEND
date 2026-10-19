import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { AuthService, User } from '../services/auth-service';
import { UserProfileService } from '../services/user-profile-service';
import { UserProfileComponent } from './user-profile';

describe('UserProfileComponent', () => {
  let fixture: ComponentFixture<UserProfileComponent>;
  const auth = {
    currentUser: vi.fn<() => User | null>(() => null),
    changePassword: vi.fn(() => of({})),
    updateCurrentUser: vi.fn(),
  };
  const profileService = {
    getProfile: vi.fn(() => of({ userId: 'user-1', fullName: 'Linh', email: 'linh@example.com', phone: '0901234567' })),
    updateProfile: vi.fn((userId, profile) => of({ ...profile, userId })),
    getAddresses: vi.fn(() => of([])),
    createAddress: vi.fn((userId, address) => of({ ...address, id: 'server-address-1' })),
    updateAddress: vi.fn((_id, address) => of(address)),
    deleteAddress: vi.fn(() => of({})),
  };

  beforeEach(async () => {
    localStorage.clear();
    auth.currentUser.mockReturnValue(null);
    await TestBed.configureTestingModule({
      imports: [UserProfileComponent],
      providers: [provideRouter([]),
        { provide: AuthService, useValue: auth },
        { provide: UserProfileService, useValue: profileService },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(UserProfileComponent);
    fixture.detectChanges();
  });

  it('renders profile fields, address management, and password action', () => {
    const element = fixture.nativeElement as HTMLElement;
    expect(element.textContent).toContain('Danh sách địa chỉ');
    expect(element.textContent).toContain('Đổi mật khẩu');
    expect(element.querySelectorAll('.address-card').length).toBe(0);
    expect(element.textContent).toContain('Bạn chưa lưu địa chỉ nào.');
  });

  it('opens address editor with profile defaults and saves local addresses', () => {
    const component = fixture.componentInstance;
    component.profile.userId = 'user-1';
    component.profile.fullName = 'Linh';
    component.openAddressForm();
    expect(component.addressForm.name).toBe('Linh');
    component.addressForm.phone = '0901234567';
    component.addressForm.address = '12 Nguyễn Huệ';
    component.saveAddress();
    fixture.detectChanges();
    expect(component.addresses.at(-1)?.address).toBe('12 Nguyễn Huệ');
    expect(localStorage.getItem('userAddresses:user-1')).toContain('12 Nguyễn Huệ');
  });

  it('loads the API profile when a user session is available', () => {
    auth.currentUser.mockReturnValue({
      id: 'user-1',
      fullName: 'Linh',
      email: 'linh@example.com',
      phone: '0901234567',
      systemRole: 'USER' as const,
    });
    fixture.destroy();
    fixture = TestBed.createComponent(UserProfileComponent);
    fixture.detectChanges();
    expect(profileService.getProfile).toHaveBeenCalledWith('user-1');
    expect(profileService.getAddresses).toHaveBeenCalledWith('user-1');
  });
});
