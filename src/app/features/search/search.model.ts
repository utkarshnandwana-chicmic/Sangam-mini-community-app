export interface SearchItem {
  _id: string;
  text: string;
  searchBy: string;
  createdAt: string;
  searchAt: string;
  updatedAt: string;
}

export interface SearchUser {
  _id: string;
  userName: string;
  name: string;
  profilePicture?: string;
  isFollower: boolean;
  isFollowing: boolean;
}

export interface SearchResponse {
  searches: SearchItem[];
  userSearch: SearchItem[];
}