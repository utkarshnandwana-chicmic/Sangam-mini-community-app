export interface NotificationSender {
  _id: string;
  userName: string;
  name: string;
  profilePicture?: string;
  isFollower?: boolean;
  isFollowing?: boolean;
  isRequestedFollower?: boolean;
  isRequestedFollowing?: boolean;
}

export interface AppNotification {
  _id: string;
  userId: string;
  senderId?: string;
  title?: string;
  body?: string;
  type: number;
  read?: boolean;
  createdAt?: string;
  updatedAt?: string;
  sender?: NotificationSender;
}

