import { Message } from './message.model';

export interface Room {

  _id: string;

  type: number;

  groupName?: string;

  groupImage?: string;

  members: string[];

  lastMessage?: Message;

  unreadCount?: number;

  createdAt?: string;

}