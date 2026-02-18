import { Component, Input, Output, EventEmitter } from '@angular/core';
import { Post } from '../../models/post.model';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-profile-posts-grid',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './posts-grid.html',
  styleUrl: './posts-grid.scss'
})
export class ProfilePostsGridComponent {
  @Input() posts: Post[] = [];
  @Input() profile: any; 
  
  @Output() toggleLike = new EventEmitter<Post>();
  @Output() viewPost = new EventEmitter<string>();

  trackById(index: number, post: Post) {
    return post._id;
  }

  onToggleLike(post: Post) {
    post.isLiked = !post.isLiked;
    post.isLiked ? post.likesCount++ : post.likesCount--;
    this.toggleLike.emit(post);
  }

  onView(post: Post) {
    this.viewPost.emit(post._id);
  }
}