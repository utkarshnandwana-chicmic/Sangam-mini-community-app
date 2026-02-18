export interface PostMedia {
  completeUrl: string;
  url: string;
  mediaType: number;
  thumbnailUrl?: string;
}

export interface PostUser {
  _id: string;
  name: string;
  userName: string;
  profilePicture?: string;
}

export interface Post {

  _id: string;
  userId: string;

  caption: string | null;

  media: {
    completeUrl?: string;
    thumbnailUrl?: string;
    url?: string;
    mediaType: number;
  }[];

  hideLikes: boolean;
  hideComments: boolean;
  hideShares: boolean;

  isLiked: boolean;
  isSaved: boolean;

  likesCount: number;
  commentsCount: number;
  viewCount: number;
  shareCount: number;

  createdAt: string;
  updatedAt: string;
}


export interface PostResponse {
  data: {
    items: Post[];
    isNext: boolean;
  };
}

