import { ComponentFixture, TestBed } from '@angular/core/testing';

import { OtpStep } from './otp-step';

describe('OtpStep', () => {
  let component: OtpStep;
  let fixture: ComponentFixture<OtpStep>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OtpStep]
    })
    .compileComponents();

    fixture = TestBed.createComponent(OtpStep);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
