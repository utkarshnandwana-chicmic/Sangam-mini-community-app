export interface Conversation {

  _id: string;

  conversationName: string;

  conversationImage: string;

  unreadCount: number;

  members: any[];

  lastMessage?: {

    message: string;

    createdAt: string;

  };

}