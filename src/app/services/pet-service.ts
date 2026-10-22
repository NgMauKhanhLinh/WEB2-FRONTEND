import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { AuthService } from './auth-service';
import { AccountDatasetService } from './account-dataset-service';

const API_BASE = 'http://localhost:8080/api/v1';

interface ApiEnvelope<T> {
  EC?: number;
  EM?: string;
  DT?: T;
}

export interface PetRecord {
  id: string;
  name: string;
  speciesId: string;
  species: string;
  breedId: string;
  breed: string;
  gender: string;
  age: string;
  birthDate: string;
  weightKg: number | null;
  healthStatus: string;
  medicalNotes: string;
  avatar: string;
  lastCheckup: string;
}

export interface PetSpeciesOption {
  id: string;
  name: string;
}

export interface PetBreedOption {
  id: string;
  name: string;
}

export interface MedicalRecord {
  id: string;
  condition: string;
  date: string;
  doctor: string;
  notes: string;
  fileName: string;
  fileUrl: string;
  fileSize?: string;
  fileRaw?: File;
}


export interface PetPayload {
  name: string;
  speciesId: string;
  species: string;
  breedId: string;
  breed: string;
  gender: string;
  age: string;
  birthDate: string;
  weightKg: number | null;
  healthStatus: string;
  medicalNotes: string;
  avatar?: string;
}

@Injectable({ providedIn: 'root' })
export class PetService {
  constructor(
    private readonly http: HttpClient,
    private readonly auth: AuthService,
    private readonly accountDataset: AccountDatasetService,
  ) {}

  getMyPets(): Observable<PetRecord[]> {
    if (!this.auth.isAuthenticated()) {
      return this.accountDataset.getPets().pipe(map((pets) => pets.map((pet) => this.normalizeMockPet(pet))));
    }
    return this.http.get<unknown>(`${API_BASE}/my-pets`, {
      headers: this.authHeaders(),
      withCredentials: true,
    }).pipe(
      map((response) => this.toArray(this.unwrap(response), 'hồ sơ thú cưng').map((pet) => this.normalizePet(pet))),
    );
  }

  getPet(id: string): Observable<PetRecord> {
    if (!this.auth.isAuthenticated()) {
      return this.accountDataset.getPets().pipe(map((pets) => {
        const pet = pets.find((item) => String(item['id'] ?? '') === id);
        if (!pet) throw new Error('Không tìm thấy hồ sơ thú cưng mẫu.');
        return this.normalizeMockPet(pet);
      }));
    }
    return this.http.get<unknown>(`${API_BASE}/pets/${encodeURIComponent(id)}`, {
      headers: this.authHeaders(),
      withCredentials: true,
    }).pipe(map((response) => this.normalizePet(this.toObject(this.unwrap(response), 'hồ sơ thú cưng'))));
  }

  getSpecies(): Observable<PetSpeciesOption[]> {
    return this.http.get<unknown>(`${API_BASE}/pets/species`, {
      headers: this.authHeaders(),
      withCredentials: true,
    }).pipe(
      map((response) => this.toArray(this.unwrap(response), 'loài thú cưng').map((value) => ({
        id: String(value['species_id'] ?? value['id'] ?? ''),
        name: String(value['species_name'] ?? value['name'] ?? ''),
      }))),
    );
  }

  getBreeds(speciesId: string): Observable<PetBreedOption[]> {
    const params = new HttpParams().set('species_id', speciesId);
    return this.http.get<unknown>(`${API_BASE}/pets/breeds`, {
      params,
      headers: this.authHeaders(),
      withCredentials: true,
    }).pipe(
      map((response) => this.toArray(this.unwrap(response), 'giống thú cưng').map((value) => ({
        id: String(value['breed_id'] ?? value['id'] ?? ''),
        name: String(value['breed_name'] ?? value['name'] ?? ''),
      }))),
    );
  }

  createPet(pet: PetPayload): Observable<PetRecord> {
    return this.http.post<unknown>(`${API_BASE}/pets`, this.toPetPayload(pet), {
      headers: this.authHeaders(),
      withCredentials: true,
    }).pipe(map((response) => this.normalizePet(this.toObject(this.unwrap(response), 'hồ sơ thú cưng'))));
  }

  updatePet(id: string, pet: PetPayload): Observable<PetRecord> {
    return this.http.put<unknown>(`${API_BASE}/pets/${encodeURIComponent(id)}`, this.toPetPayload(pet), {
      headers: this.authHeaders(),
      withCredentials: true,
    }).pipe(map((response) => this.normalizePet(this.toObject(this.unwrap(response), 'hồ sơ thú cưng'))));
  }

  deletePet(id: string): Observable<void> {
    return this.http.delete<unknown>(`${API_BASE}/pets/${encodeURIComponent(id)}`, {
      headers: this.authHeaders(),
      withCredentials: true,
    }).pipe(map((response) => {
      this.unwrap(response);
      return undefined;
    }));
  }

  getMedicalRecords(id: string): Observable<MedicalRecord[]> {
    if (!this.auth.isAuthenticated()) {
      return this.accountDataset.getPets().pipe(map((pets) => {
        const pet = pets.find((item) => String(item['id'] ?? '') === id);
        if (!pet) throw new Error('Không tìm thấy hồ sơ bệnh án mẫu.');
        const records = pet['medicalRecords'];
        if (!Array.isArray(records)) throw new Error('Danh sách bệnh án mẫu không đúng định dạng.');
        return records.map((value) => {
          if (!value || typeof value !== 'object') throw new Error('Dữ liệu bệnh án mẫu không đúng định dạng.');
          const record = value as Record<string, unknown>;
          return {
            id: String(record['id'] ?? ''),
            condition: String(record['condition'] ?? 'Bệnh án'),
            date: String(record['date'] ?? ''),
            doctor: String(record['doctor'] ?? ''),
            notes: String(record['notes'] ?? ''),
            fileName: String(record['name'] ?? ''),
            fileUrl: String(record['fileUrl'] ?? ''),
          };
        });
      }));
    }
    return this.http.get<unknown>(`${API_BASE}/medical-records/pet/${encodeURIComponent(id)}`, {
      headers: this.authHeaders(),
      withCredentials: true,
    }).pipe(
      map((response) => this.toArray(this.unwrap(response), 'bệnh án').map((record) => {
        const attachment = Array.isArray(record['attachments']) ? record['attachments'][0] as Record<string, unknown> : {};
        return {
          id: String(record['record_id'] ?? record['id'] ?? ''),
          condition: String(record['record_name'] ?? record['condition'] ?? record['diagnosis'] ?? 'Bệnh án'),
          date: this.formatDate(record['visit_date'] ?? record['date']),
          doctor: String((record['doctor'] as Record<string, unknown> | undefined)?.['full_name'] ?? record['doctor'] ?? 'Chưa rõ'),
          notes: String(record['treatment_note'] ?? record['notes'] ?? record['diagnosis'] ?? ''),
          fileName: String(attachment['file_name'] ?? record['fileName'] ?? ''),
          fileUrl: String(attachment['file_url'] ?? record['fileUrl'] ?? ''),
        };
      })),
    );
  }

  private normalizeMockPet(value: Record<string, unknown>): PetRecord {
    const name = String(value['name'] ?? '');
    return this.normalizePet({
      ...value,
      pet_id: value['id'],
      pet_name: name,
      profile_image_url: value['avatar'] || this.mockPetAvatar(name),
    });
  }

  private mockPetAvatar(name: string): string {
    const filename = name.toLocaleLowerCase('en-US');
    return `/assets/images/pets/${filename}.jpg`;
  }

  private normalizePet(value: Record<string, unknown>): PetRecord {
    const species = value['species'] && typeof value['species'] === 'object'
      ? value['species'] as Record<string, unknown>
      : {};
    const breed = value['breed'] && typeof value['breed'] === 'object'
      ? value['breed'] as Record<string, unknown>
      : {};
    const images = Array.isArray(value['pet_images']) ? value['pet_images'] as Record<string, unknown>[] : [];
    const primaryImage = images.find((image) => image['is_primary']) ?? images[0];
    const healthStatusCode = String(value['health_status'] ?? value['healthStatus'] ?? 'unknown');
    const statusLabels: Record<string, string> = {
      healthy: 'Bình thường',
      treating: 'Đang điều trị',
      need_recheck: 'Cần tái khám',
      unknown: 'Chưa cập nhật',
    };
    return {
      id: String(value['pet_id'] ?? value['id'] ?? ''),
      name: String(value['pet_name'] ?? value['name'] ?? ''),
      speciesId: String(value['species_id'] ?? species['species_id'] ?? ''),
      species: String(species['species_name'] ?? value['species_name'] ?? (typeof value['species'] === 'string' ? value['species'] : '')),
      breedId: String(value['breed_id'] ?? breed['breed_id'] ?? ''),
      breed: String(breed['breed_name'] ?? value['breed_name'] ?? (typeof value['breed'] === 'string' ? value['breed'] : '')),
      gender: String(value['gender'] ?? ''),
      age: String(value['age'] ?? ''),
      birthDate: String(value['birth_date'] ?? value['birthDate'] ?? ''),
      weightKg: value['weight_kg'] == null ? null : Number(value['weight_kg']),
      healthStatus: statusLabels[healthStatusCode] ?? healthStatusCode,
      medicalNotes: String(value['medical_note'] ?? value['medicalNotes'] ?? ''),
      avatar: String(value['profile_image_url'] ?? primaryImage?.['image_url'] ?? ''),
      lastCheckup: this.formatDate(value['latest_exam_date'] ?? value['lastCheckup']),
    };
  }

  private toPetPayload(pet: PetPayload): Record<string, unknown> {
    const statusCodes: Record<string, string> = {
      'Bình thường': 'healthy',
      'Đang điều trị': 'treating',
      'Cần tái khám': 'need_recheck',
    };
    return {
      pet_name: pet.name,
      species_id: pet.speciesId || undefined,
      species_name: pet.species || undefined,
      breed_id: pet.breedId || undefined,
      breed_name: pet.breed || undefined,
      gender: pet.gender || 'unknown',
      birth_date: pet.birthDate || undefined,
      age: pet.age || undefined,
      weight_kg: pet.weightKg,
      health_status: statusCodes[pet.healthStatus] ?? 'unknown',
      medical_note: pet.medicalNotes || undefined,
      profile_image_url: pet.avatar || undefined,
    };
  }

  private unwrap(value: unknown): unknown {
    if (value && typeof value === 'object' && 'EC' in value) {
      const response = value as ApiEnvelope<unknown>;
      if (response.EC !== 0) throw new Error(response.EM || 'Không thể xử lý yêu cầu hồ sơ thú cưng.');
      return response.DT;
    }
    return value;
  }

  private toArray(value: unknown, label: string): Record<string, unknown>[] {
    if (Array.isArray(value)) return value as Record<string, unknown>[];
    if (value && typeof value === 'object') {
      for (const key of ['pets', 'species', 'breeds', 'records', 'medical_records']) {
        const items = (value as Record<string, unknown>)[key];
        if (Array.isArray(items)) return items as Record<string, unknown>[];
      }
    }
    if (value == null) return [];
    throw new Error(`Dữ liệu ${label} không đúng định dạng.`);
  }

  private toObject(value: unknown, label: string): Record<string, unknown> {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      const object = value as Record<string, unknown>;
      const nested = object['pet'] ?? object['record'];
      return nested && typeof nested === 'object' ? nested as Record<string, unknown> : object;
    }
    throw new Error(`Dữ liệu ${label} không đúng định dạng.`);
  }

  private authHeaders(): Record<string, string> {
    const token = this.auth.getAccessToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  private formatDate(value: unknown): string {
    if (!value) return '';
    const date = new Date(String(value));
    if (Number.isNaN(date.getTime())) return String(value);
    return new Intl.DateTimeFormat('vi-VN').format(date);
  }
}
