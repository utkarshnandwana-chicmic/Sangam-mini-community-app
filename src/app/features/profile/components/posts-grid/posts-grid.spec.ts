import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PostsGrid } from './posts-grid';

describe('PostsGrid', () => {
  let component: PostsGrid;
  let fixture: ComponentFixture<PostsGrid>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PostsGrid]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PostsGrid);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
