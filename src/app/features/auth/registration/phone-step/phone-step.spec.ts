import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PhoneStep } from './phone-step';

describe('PhoneStep', () => {
  let component: PhoneStep;
  let fixture: ComponentFixture<PhoneStep>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PhoneStep]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PhoneStep);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
