import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter, Router } from '@angular/router';
import { of } from 'rxjs';
import { MedicalRecordModalComponent } from '../medical-record-modal-component/medical-record-modal-component';
import { PetService } from '../services/pet-service';
import { PetManagementComponent } from './pet-management';

describe('PetManagementComponent', () => {
  let fixture: ComponentFixture<PetManagementComponent>;
  let router: Router;
  let routerUrl: ReturnType<typeof vi.spyOn>;
  let routeUrl = '/thu-cung-cua-toi/them-moi';
  const route = {
    url: of([]),
    snapshot: { paramMap: { get: vi.fn(() => 'pet-1') } },
  };
  const petsApi = {
    getMyPets: vi.fn(() => of([])),
    getPet: vi.fn(() => of({
      id: 'pet-1',
      name: 'Mimi',
      speciesId: 'cat',
      species: 'Mèo',
      breedId: '',
      breed: '',
      gender: 'female',
      age: '2',
      birthDate: '',
      weightKg: 3,
      healthStatus: 'Bình thường',
      medicalNotes: '',
      avatar: '',
      lastCheckup: '',
    })),
    getMedicalRecords: vi.fn(() => of([])),
    createPet: vi.fn(() => of({})),
    updatePet: vi.fn(() => of({})),
    deletePet: vi.fn(() => of(undefined)),
  };

  beforeEach(async () => {
    routeUrl = '/thu-cung-cua-toi/them-moi';
    await TestBed.configureTestingModule({
      imports: [PetManagementComponent],
      providers: [
        provideRouter([]),
        { provide: ActivatedRoute, useValue: route },
        { provide: PetService, useValue: petsApi },
      ],
    }).compileComponents();
    router = TestBed.inject(Router);
    routerUrl = vi.spyOn(router, 'url', 'get').mockReturnValue(routeUrl);
    fixture = TestBed.createComponent(PetManagementComponent);
    fixture.detectChanges();
  });

  it('renders the new pet form and opens the medical record modal', () => {
    const element = fixture.nativeElement as HTMLElement;
    expect(fixture.componentInstance.mode).toBe('create');
    expect(element.querySelector('h1')?.textContent).toContain('Tạo hồ sơ thú cưng');
    expect(element.querySelectorAll('.pet-form-section')).toHaveLength(3);
    expect(element.querySelector('input[name="name"]')).toBeTruthy();

    element.querySelector<HTMLButtonElement>('.add-record-button')?.click();
    fixture.detectChanges();
    expect(element.querySelector('app-medical-record-modal-component')).toBeTruthy();
    expect(element.textContent).toContain('Thêm bệnh án mới');
  });

  it('recognizes a pet detail route', () => {
    routeUrl = '/thu-cung-cua-toi/pet-1';
    routerUrl.mockReturnValue(routeUrl);
    fixture.destroy();
    fixture = TestBed.createComponent(PetManagementComponent);
    fixture.detectChanges();

    expect(fixture.componentInstance.mode).toBe('detail');
    expect(fixture.nativeElement.textContent).toContain('Mimi');
    expect(petsApi.getPet).toHaveBeenCalledWith('pet-1');
  });
});