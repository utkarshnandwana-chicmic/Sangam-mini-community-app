import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ProfileStep } from './profile-step';

describe('ProfileStep', () => {
  let component: ProfileStep;
  let fixture: ComponentFixture<ProfileStep>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProfileStep]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ProfileStep);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
