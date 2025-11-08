import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ManageReservation } from './manage-reservation';

describe('ManageReservation', () => {
  let component: ManageReservation;
  let fixture: ComponentFixture<ManageReservation>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ManageReservation]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ManageReservation);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
