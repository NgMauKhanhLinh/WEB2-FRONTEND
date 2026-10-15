import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { PetService } from './pet-service';

describe('PetService', () => {
  let service: PetService;
  let http: HttpTestingController;

  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(PetService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('loads and normalizes a user pet list', () => {
    let petName = '';
    service.getMyPets().subscribe((pets) => petName = pets[0].name);
    const request = http.expectOne('http://localhost:8080/api/v1/my-pets');
    request.flush({ EC: 0, DT: { pets: [{ pet_id: 7, pet_name: 'Milo', species: { species_name: 'Chó' }, health_status: 'healthy' }] } });
    expect(petName).toBe('Milo');
  });

  it('sends backend field names on create and surfaces API errors', () => {
    let errorMessage = '';
    service.createPet({
      name: 'Milo', speciesId: '1', species: 'Chó', breedId: '', breed: 'Poodle',
      gender: 'male', age: '2', birthDate: '', weightKg: 5, healthStatus: 'Bình thường', medicalNotes: '',
    }).subscribe({ error: (error: Error) => errorMessage = error.message });
    const request = http.expectOne('http://localhost:8080/api/v1/pets');
    expect(request.request.body).toEqual({
      pet_name: 'Milo', species_id: '1', species_name: 'Chó', breed_id: undefined,
      breed_name: 'Poodle', gender: 'male', birth_date: undefined, age: '2', weight_kg: 5,
      health_status: 'healthy', medical_note: undefined, profile_image_url: undefined,
    });
    request.flush({ EC: 1, EM: 'Không thể lưu hồ sơ' });
    expect(errorMessage).toBe('Không thể lưu hồ sơ');
  });
});
