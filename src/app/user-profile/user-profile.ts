import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs';
import { AuthService } from '../services/auth-service';
import { UserAddressRecord, UserProfileRecord, UserProfileService } from '../services/user-profile-service';
import { SidebarComponent } from '../shared/sidebar/sidebar';

const PROFILE_KEY = 'userProfile';
const ADDRESSES_KEY = 'userAddresses';

const emptyProfile = (userId = ''): UserProfileRecord => ({
  userId,
  fullName: '',
  email: '',
  phone: '',
  gender: '',
  birthDate: '',
});

type AddressModalMode = 'add' | 'edit';

@Component({
  selector: 'app-user-profile',
  standalone: true,
  imports: [CommonModule, FormsModule, SidebarComponent],
  templateUrl: './user-profile.html',
  styleUrl: './user-profile.css',
})
export class UserProfileComponent implements OnInit, OnDestroy {
  profile = emptyProfile();
  addresses: UserAddressRecord[] = [];
  readonly defaultAvatar = '/assets/images/profile/user-avatar.png';
  avatarPreview = '';
  message = '';
  messageType: 'success' | 'error' = 'success';
  isLoading = false;
  isSaving = false;
  showAddressModal = false;
  addressModalMode: AddressModalMode = 'add';
  editingAddressId = '';
  showPasswordModal = false;
  isChangingPassword = false;
  passwordError = '';
  passwordForm = { oldPassword: '', newPassword: '', confirmPassword: '' };
  addressForm: UserAddressRecord = this.emptyAddress();
  private messageTimeout?: ReturnType<typeof setTimeout>;

  constructor(
    private readonly auth: AuthService,
    private readonly profileService: UserProfileService,
  ) {}

  ngOnInit(): void {
    const user = this.auth.currentUser();
    if (!user) return;
    this.profile = this.loadStored(this.profileStorageKey(user.id), {
      ...emptyProfile(user.id),
      fullName: user.fullName,
      email: user.email,
      phone: user.phone,
    });
    this.addresses = this.loadStored(this.addressesStorageKey(user.id), []);
    this.loadRemoteData(user.id);
  }

  ngOnDestroy(): void {
    if (this.messageTimeout) clearTimeout(this.messageTimeout);
    if (this.avatarPreview) URL.revokeObjectURL(this.avatarPreview);
  }

  saveProfile(): void {
    if (!this.profile.fullName.trim()) {
      this.showMessage('Vui lòng nhập họ và tên.', 'error');
      return;
    }
    const userId = this.profile.userId;
    this.isSaving = true;
    if (!userId) {
      this.persistProfile(this.profile);
      this.isSaving = false;
      this.showMessage('Không tìm thấy tài khoản đang đăng nhập; thông tin chỉ được lưu trên thiết bị.', 'error');
      return;
    }
    this.profileService.updateProfile(userId, this.profile).pipe(
      finalize(() => this.isSaving = false),
    ).subscribe({
      next: (saved) => {
        this.persistProfile({ ...this.profile, ...saved, userId: saved.userId || userId });
        this.showMessage('Đã lưu thông tin người dùng.');
      },
      error: (error: Error) => {
        this.persistProfile(this.profile);
        this.showMessage(`${error.message} Thông tin hiện chỉ được lưu trên thiết bị.`, 'error');
      },
    });
  }

  chooseAvatar(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      this.showMessage('Chỉ hỗ trợ tệp ảnh làm ảnh đại diện.', 'error');
      return;
    }
    if (file.size > 4 * 1024 * 1024) {
      this.showMessage('Ảnh đại diện không được vượt quá 4 MB.', 'error');
      return;
    }
    if (this.avatarPreview) URL.revokeObjectURL(this.avatarPreview);
    this.avatarPreview = URL.createObjectURL(file);
    this.showMessage('Ảnh đang được xem trước; ứng dụng chưa kết nối API tải ảnh lên.', 'error');
  }

  openAddressForm(address?: UserAddressRecord): void {
    this.addressModalMode = address ? 'edit' : 'add';
    this.editingAddressId = address?.id ?? '';
    this.addressForm = address ? { ...address } : {
      ...this.emptyAddress(),
      name: this.profile.fullName,
      phone: this.profile.phone,
      email: this.profile.email,
    };
    this.showAddressModal = true;
  }

  saveAddress(): void {
    if (!this.addressForm.name.trim() || !this.addressForm.phone.trim() || !this.addressForm.address.trim()) {
      this.showMessage('Vui lòng nhập tên người nhận, số điện thoại và địa chỉ.', 'error');
      return;
    }
    const editing = this.addressModalMode === 'edit';
    const nextAddress: UserAddressRecord = {
      ...this.addressForm,
      id: this.editingAddressId || `address-${Date.now()}`,
      isDefault: this.addressForm.isDefault || this.addresses.length === 0,
    };
    if (nextAddress.isDefault) {
      this.addresses = this.addresses.map((item) => ({ ...item, isDefault: false }));
    }
    const localSave = (address: UserAddressRecord) => {
      this.addresses = editing
        ? this.addresses.map((item) => item.id === address.id ? address : item)
        : [...this.addresses, address];
      this.persistAddresses();
      this.showAddressModal = false;
    };

    if (!nextAddress.id.startsWith('address-') && editing) {
      this.profileService.updateAddress(nextAddress.id, nextAddress).subscribe({
        next: (saved) => {
          localSave(saved);
          this.showMessage('Đã cập nhật địa chỉ.');
        },
        error: (error: Error) => {
          localSave(nextAddress);
          this.showMessage(`${error.message} Địa chỉ đã được cập nhật trên thiết bị.`, 'error');
        },
      });
      return;
    }
    if (!editing && this.profile.userId) {
      this.profileService.createAddress(this.profile.userId, nextAddress).subscribe({
        next: (saved) => {
          localSave(saved);
          this.showMessage('Đã thêm địa chỉ mới.');
        },
        error: (error: Error) => {
          localSave(nextAddress);
          this.showMessage(`${error.message} Địa chỉ đã được lưu trên thiết bị.`, 'error');
        },
      });
      return;
    }
    localSave(nextAddress);
    this.showMessage(editing ? 'Đã cập nhật địa chỉ trên thiết bị.' : 'Đã lưu địa chỉ trên thiết bị.');
  }

  deleteAddress(address: UserAddressRecord): void {
    if (!window.confirm(`Bạn có chắc muốn xóa địa chỉ của ${address.name}?`)) return;
    const removeLocally = () => {
      this.addresses = this.addresses.filter((item) => item.id !== address.id);
      if (address.isDefault && this.addresses.length) this.addresses[0].isDefault = true;
      this.persistAddresses();
    };
    if (!address.id.startsWith('address-')) {
      this.profileService.deleteAddress(address.id).subscribe({
        next: () => {
          removeLocally();
          this.showMessage('Đã xóa địa chỉ.');
        },
        error: (error: Error) => {
          removeLocally();
          this.showMessage(`${error.message} Địa chỉ chỉ được xóa trên thiết bị.`, 'error');
        },
      });
      return;
    }
    removeLocally();
    this.showMessage('Đã xóa địa chỉ trên thiết bị.');
  }

  setDefaultAddress(address: UserAddressRecord): void {
    const updated = { ...address, isDefault: true };
    const persist = () => {
      this.addresses = this.addresses.map((item) => ({ ...item, isDefault: item.id === address.id }));
      this.persistAddresses();
    };
    if (!address.id.startsWith('address-')) {
      this.profileService.updateAddress(address.id, updated).subscribe({
        next: persist,
        error: (error: Error) => {
          persist();
          this.showMessage(`${error.message} Địa chỉ mặc định chỉ được cập nhật trên thiết bị.`, 'error');
        },
      });
      return;
    }
    persist();
  }

  changePassword(): void {
    this.passwordError = '';
    const { oldPassword, newPassword, confirmPassword } = this.passwordForm;
    if (!oldPassword || !newPassword || !confirmPassword) {
      this.passwordError = 'Vui lòng nhập đầy đủ thông tin.';
      return;
    }
    if (newPassword.length < 8) {
      this.passwordError = 'Mật khẩu mới cần có ít nhất 8 ký tự.';
      return;
    }
    if (newPassword !== confirmPassword) {
      this.passwordError = 'Mật khẩu xác nhận không khớp.';
      return;
    }
    this.isChangingPassword = true;
    this.auth.changePassword({ oldPassword, newPassword }).pipe(
      finalize(() => this.isChangingPassword = false),
    ).subscribe({
      next: () => {
        this.showPasswordModal = false;
        this.passwordForm = { oldPassword: '', newPassword: '', confirmPassword: '' };
        this.showMessage('Đổi mật khẩu thành công.');
      },
      error: (error: Error) => this.passwordError = error.message,
    });
  }

  addressLabel(address: UserAddressRecord): string {
    return [address.address, address.ward, address.district, address.city].filter(Boolean).join(', ');
  }

  private loadRemoteData(userId: string): void {
    this.isLoading = true;
    let completed = 0;
    const finish = () => {
      completed++;
      if (completed === 2) this.isLoading = false;
    };
    this.profileService.getProfile(userId).subscribe({
      next: (profile) => {
        this.profile = { ...this.profile, ...profile, userId: profile.userId || userId };
        this.persistProfile(this.profile);
        finish();
      },
      error: (error: Error) => {
        this.showMessage(`${error.message} Đang dùng thông tin đã lưu trên thiết bị.`, 'error');
        finish();
      },
    });
    this.profileService.getAddresses(userId).subscribe({
      next: (addresses) => {
        this.addresses = addresses;
        this.persistAddresses();
        finish();
      },
      error: (error: Error) => {
        this.showMessage(`${error.message} Đang dùng địa chỉ đã lưu trên thiết bị.`, 'error');
        finish();
      },
    });
  }

  private persistProfile(profile: UserProfileRecord): void {
    this.profile = { ...profile };
    if (this.profile.userId) {
      localStorage.setItem(this.profileStorageKey(this.profile.userId), JSON.stringify(this.profile));
    }
    this.auth.updateCurrentUser({
      fullName: this.profile.fullName,
      email: this.profile.email,
      phone: this.profile.phone,
    });
  }

  private persistAddresses(): void {
    if (this.profile.userId) {
      localStorage.setItem(this.addressesStorageKey(this.profile.userId), JSON.stringify(this.addresses));
    }
  }

  private loadStored<T>(key: string, fallback: T): T {
    try {
      const stored = localStorage.getItem(key);
      if (!stored) return structuredClone(fallback);
      const parsed = JSON.parse(stored) as T;
      if (Array.isArray(fallback)) {
        return (Array.isArray(parsed) ? parsed : structuredClone(fallback)) as T;
      }
      if (fallback && typeof fallback === 'object' && parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return { ...fallback as object, ...parsed as object } as T;
      }
      return parsed;
    } catch {
      return structuredClone(fallback);
    }
  }

  private profileStorageKey(userId: string): string {
    return `${PROFILE_KEY}:${userId}`;
  }

  private addressesStorageKey(userId: string): string {
    return `${ADDRESSES_KEY}:${userId}`;
  }

  private emptyAddress(): UserAddressRecord {
    return {
      id: '',
      name: '',
      phone: '',
      email: '',
      country: 'Việt Nam',
      address: '',
      ward: '',
      district: '',
      city: '',
      isDefault: false,
    };
  }

  private showMessage(message: string, type: 'success' | 'error' = 'success'): void {
    this.message = message;
    this.messageType = type;
    if (this.messageTimeout) clearTimeout(this.messageTimeout);
    this.messageTimeout = setTimeout(() => this.message = '', 4500);
  }
}
