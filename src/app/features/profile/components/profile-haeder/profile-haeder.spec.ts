import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ProfileHeaderComponent } from './profile-haeder';

describe('ProfileHaeder', () => {
  let component: ProfileHeaderComponent;
  let fixture: ComponentFixture<ProfileHeaderComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProfileHeaderComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ProfileHeaderComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
