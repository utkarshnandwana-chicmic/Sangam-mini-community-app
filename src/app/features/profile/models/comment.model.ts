export interface Comment {
  _id: string;
  postId: string;
  userId: string;
  content?: string;
  media?: any[];
  hashtags?: string[];
  taggedUserIds?: string[];
  commentId?: string;

  createdAt: string;
  updatedAt: string;

  user?: {
    _id: string;
    userName: string;
    name: string;
    profilePicture?: string;
  };

  isLiked?: boolean;
  likesCount?: number;
  commentsCount?: number;
}
