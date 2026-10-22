import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MedicalRecordModalComponent } from './medical-record-modal-component';

describe('MedicalRecordModalComponent', () => {
  let component: MedicalRecordModalComponent;
  let fixture: ComponentFixture<MedicalRecordModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MedicalRecordModalComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(MedicalRecordModalComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
