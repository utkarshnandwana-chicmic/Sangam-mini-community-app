import {
  Component,
  Input,
  Output,
  EventEmitter,
  ChangeDetectionStrategy
} from '@angular/core';

import { Post } from '../../models/post.model';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-profile-posts-grid',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './posts-grid.html',
  styleUrl: './posts-grid.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProfilePostsGridComponent {

  @Input({ required: true }) posts: Post[] = [];

  @Output() toggleLike = new EventEmitter<Post>();
  @Output() viewPost = new EventEmitter<Post>();

  trackById(_: number, post: Post) {
    return post._id;
  }

  onToggleLike(post: Post, event: Event) {
    event.stopPropagation(); // prevent modal open
    this.toggleLike.emit(post);
  }

  onView(post: Post) {
    this.viewPost.emit(post);
  }

  getFirstMedia(post: Post) {
    return post.media?.[0] ?? null;
  }

}