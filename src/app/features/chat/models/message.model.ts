export interface Message {
  _id: string;

  conversationId?: string;   // frontend use
  roomId?: string;           // backend use

  message: string;
  createdAt: string;

  sender?: Sender;
  senderId?: string;

  messageType?: number;
  seenBy?: string[];
}

export interface Sender {

  _id: string;

  username: string;

  avatar?: string;

}