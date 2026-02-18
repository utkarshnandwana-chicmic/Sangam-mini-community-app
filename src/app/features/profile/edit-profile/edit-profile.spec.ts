import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EditProfileFormComponent } from './edit-profile';

describe('EditProfile', () => {
  let component: EditProfileFormComponent;
  let fixture: ComponentFixture<EditProfileFormComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EditProfileFormComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EditProfileFormComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
