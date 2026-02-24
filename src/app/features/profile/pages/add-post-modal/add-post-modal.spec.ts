import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AddPostModal } from './add-post-modal';

describe('AddPostModal', () => {
  let component: AddPostModal;
  let fixture: ComponentFixture<AddPostModal>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AddPostModal]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AddPostModal);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
