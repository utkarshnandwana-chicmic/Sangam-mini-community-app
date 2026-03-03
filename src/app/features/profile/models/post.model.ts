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

  // API can return post author either nested in `user` or as flat fields.
  user?: PostUser;
  userName?: string;
  name?: string;
  profilePicture?: string;

  caption: string | null;
  hashtags?: string[];
  taggedUserIds?: string[];
  taggedUsers?: PostUser[];
  address?: string;
  location?: {
    type: 'Point';
    coordinates: [number, number];
  };
  latitude?: number;
  longitude?: number;

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

export interface CreatePostRequest {
  caption?: string;
  hashtags?: string[];
  taggedUserIds?: string[];
  visibility: number;
  postType?: number;
  hideComments?: boolean;
  hideLikes?: boolean;
  hideShares?: boolean;
  address?: string;
  location?: {
    type: 'Point';
    coordinates: [number, number];
  };
  latitude?: number;
  longitude?: number;
  repostId?: string;
  media?: {
    url: string;
    mediaType: number;
    thumbnailUrl?: string;
  }[];
  audio?: string;
  audioName?: string;
  scanId?: string;
}
