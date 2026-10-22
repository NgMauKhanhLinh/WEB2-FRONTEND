import { Component, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import {
  MedicalRecord,
  PetPayload,
  PetRecord,
  PetService,
  PetSpeciesOption,
} from '../services/pet-service';
import { MedicalRecordModalComponent } from '../medical-record-modal-component/medical-record-modal-component';
import { SidebarComponent } from '../shared/sidebar/sidebar';

type PetPageMode = 'list' | 'detail' | 'create' | 'edit';
interface MedicalRecordDraft {
  condition: string;
  date: string;
  notes: string;
}

const STATUS_FILTERS = [
  'Tất cả',
  'Bình thường',
  'Đang điều trị',
  'Có bệnh nền',
  'Cần tái khám',
  'Chưa cập nhật',
];

@Component({
  selector: 'app-pet-management',
  standalone: true,
  imports: [FormsModule, RouterLink, SidebarComponent, MedicalRecordModalComponent],
  templateUrl: './pet-management.html',
  styleUrl: './pet-management.css',
})
export class PetManagementComponent implements OnInit {
  mode: PetPageMode = 'list';
  pets: PetRecord[] = [];
  pet: PetRecord | null = null;
  records: MedicalRecord[] = [];
  readonly species: PetSpeciesOption[] = [
    { id: 'dog', name: 'Chó' },
    { id: 'cat', name: 'Mèo' },
    { id: 'other', name: 'Khác' },
  ];
  readonly statuses = STATUS_FILTERS;
  selectedStatus = 'Tất cả';
  searchText = '';
  sortBy = 'name';
  readonly loading = signal(false);
  saving = false;
  readonly errorMessage = signal('');
  readonly form: PetPayload = this.emptyForm();
  medicalRecords: MedicalRecordDraft[] = [];
  isModalOpen = false;

  openModal(): void {
    this.isModalOpen = true;
  }

  closeModal(): void {
    this.isModalOpen = false;
  }

  onRecordSaved(newRecord: MedicalRecord): void {
    this.medicalRecords.push({
      condition: newRecord.condition,
      date: newRecord.date,
      notes: newRecord.notes,
    });
    this.closeModal();
  }

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly petsApi: PetService,
  ) {}

  ngOnInit(): void {
    this.route.url.subscribe(() => this.resolveRoute());
  }

  get filteredPets(): PetRecord[] {
    const search = this.searchText.trim().toLocaleLowerCase('vi');
    const filtered = this.pets.filter(
      (pet) =>
        (this.selectedStatus === 'Tất cả' || pet.healthStatus === this.selectedStatus) &&
        (!search ||
          `${pet.name} ${pet.breed} ${pet.species}`.toLocaleLowerCase('vi').includes(search)),
    );
    return filtered.sort((a, b) =>
      this.sortBy === 'age'
        ? this.ageInDays(b.age) - this.ageInDays(a.age)
        : a.name.localeCompare(b.name, 'vi'),
    );
  }

  countFor(status: string): number {
    return status === 'Tất cả'
      ? this.pets.length
      : this.pets.filter((pet) => pet.healthStatus === status).length;
  }

  selectSpecies(speciesId: string): void {
    this.form.speciesId = speciesId;
    if (speciesId === 'other') {
      this.form.species = '';
    } else {
      this.form.species = this.species.find((item) => item.id === speciesId)?.name ?? '';
    }
    this.form.breedId = '';
    this.form.breed = '';
  }

  savePet(): void {
    if (this.saving) return;
    this.saving = true;
    this.errorMessage.set('');
    const additionalMedicalNotes = this.medicalRecords
      .map((record) =>
        [record.condition.trim(), record.date, record.notes.trim()].filter(Boolean).join(' - '),
      )
      .filter(Boolean)
      .join('\n');
    const petPayload = {
      ...this.form,
      medicalNotes: [
        this.form.medicalNotes.trim(),
        additionalMedicalNotes && `Hồ sơ bệnh án:\n${additionalMedicalNotes}`,
      ]
        .filter(Boolean)
        .join('\n\n'),
    };
    const request =
      this.mode === 'edit' && this.pet
        ? this.petsApi.updatePet(this.pet.id, petPayload)
        : this.petsApi.createPet(petPayload);
    request.subscribe({
      next: () => void this.router.navigateByUrl('/thu-cung-cua-toi'),
      error: (error: Error) => {
        this.errorMessage.set(error.message);
        this.saving = false;
      },
    });
  }

  removeMedicalRecord(index: number): void {
    this.medicalRecords.splice(index, 1);
  }

  selectAvatar(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/gif'].includes(file.type)) {
      this.errorMessage.set('Vui lòng chọn ảnh định dạng JPG, PNG hoặc GIF.');
      input.value = '';
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      this.errorMessage.set('Ảnh tải lên không được vượt quá 5MB.');
      input.value = '';
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        this.form.avatar = reader.result;
        this.errorMessage.set('');
      } else {
        this.errorMessage.set('Không thể đọc tệp ảnh đã chọn.');
      }
    };
    reader.onerror = () => this.errorMessage.set('Không thể đọc tệp ảnh đã chọn.');
    reader.readAsDataURL(file);
  }

  deletePet(): void {
    if (!this.pet || !globalThis.confirm(`Bạn có chắc muốn xóa hồ sơ ${this.pet.name}?`)) return;
    this.saving = true;
    this.petsApi.deletePet(this.pet.id).subscribe({
      next: () => void this.router.navigateByUrl('/thu-cung-cua-toi'),
      error: (error: Error) => {
        this.errorMessage.set(error.message);
        this.saving = false;
      },
    });
  }

  private resolveRoute(): void {
    const path = this.router.url.split('?')[0].replace(/\/+$/, '');
    if (path.endsWith('/them-moi')) {
      this.mode = 'create';
      this.medicalRecords = [];
      this.loadFormData();
      return;
    }
    if (path.endsWith('/chinh-sua')) {
      this.mode = 'edit';
      this.medicalRecords = [];
      const id = this.route.snapshot.paramMap.get('id');
      if (id) this.loadPetForm(id);
      return;
    }
    if (/^\/thu-cung-cua-toi\/[^/]+$/.test(path)) {
      this.mode = 'detail';
      const id = this.route.snapshot.paramMap.get('id');
      if (id) this.loadPetDetail(id);
      return;
    }
    this.mode = 'list';
    this.loadPets();
  }

  private loadPets(): void {
    this.loading.set(true);
    this.errorMessage.set('');
    this.petsApi
      .getMyPets()
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (pets) => (this.pets = pets),
        error: (error: Error) => this.errorMessage.set(error.message),
      });
  }

  private loadPetDetail(id: string): void {
    this.loading.set(true);
    this.errorMessage.set('');
    this.petsApi
      .getPet(id)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (pet) => (this.pet = pet),
        error: (error: Error) => this.errorMessage.set(error.message),
      });
    this.petsApi.getMedicalRecords(id).subscribe({
      next: (records) => (this.records = records),
      error: (error: Error) => {
        if (!this.errorMessage()) this.errorMessage.set(error.message);
      },
    });
  }

  private loadPetForm(id: string): void {
    this.loading.set(true);
    this.errorMessage.set('');
    this.petsApi
      .getPet(id)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (pet) => {
          this.pet = pet;
          this.copyToForm(pet);
        },
        error: (error: Error) => this.errorMessage.set(error.message),
      });
  }

  private loadFormData(): void {
    this.loading.set(false);
  }

  private copyToForm(pet: PetRecord): void {
    Object.assign(this.form, {
      name: pet.name,
      speciesId: pet.speciesId,
      species: pet.species,
      breedId: pet.breedId,
      breed: pet.breed,
      gender: pet.gender,
      age: pet.age,
      birthDate: pet.birthDate ? pet.birthDate.slice(0, 10) : '',
      weightKg: pet.weightKg,
      healthStatus: pet.healthStatus,
      medicalNotes: pet.medicalNotes,
      avatar: pet.avatar,
    });
  }

  private emptyForm(): PetPayload {
    return {
      name: '',
      speciesId: '',
      species: '',
      breedId: '',
      breed: '',
      gender: '',
      age: '',
      birthDate: '',
      weightKg: null,
      healthStatus: 'Bình thường',
      medicalNotes: '',
    };
  }

  private ageInDays(value: string): number {
    const age = Number.parseFloat(value);
    if (!Number.isFinite(age)) return 0;
    if (/tháng/i.test(value)) return age * 30;
    if (/ngày/i.test(value)) return age;
    return age * 365;
  }
}
