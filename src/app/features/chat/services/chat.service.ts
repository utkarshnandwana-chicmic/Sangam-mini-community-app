import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, merge } from 'rxjs';

import { SOCKET_EVENTS } from '../../../constants/socket-events';
import { API_ENDPOINTS } from '../../../constants/api-endpoints';
import { SocketService } from '../../../core/services/socket';
import { AuthService } from '../../../core/services/auth';
import { environment } from '../../../../environments/environment';

import { Conversation } from '../models/conversation.model';
import { Message } from '../models/message.model';
import { ApiResponse } from '../../profile/models/api-response.model';

@Injectable({ providedIn: 'root' })
export class ChatService {

  private socket = inject(SocketService);
  private http = inject(HttpClient);
  private authService = inject(AuthService);
  disconnect() {
    this.socket.disconnect();
  }

  // socket listener helper
  private listenSocket<T>(event: string): Observable<T> {
    return new Observable((observer) => {

      const handler = (data: T) => observer.next(data);

      this.socket.listen(event, handler);

      return () => this.socket.off(event, handler);

    });
  }

  // ======================
  // ROOMS
  // ======================

  getRooms(search?: string): Observable<Conversation[]> {

    const params: any = {};
    const trimmedSearch = String(search || '').trim();

    if (trimmedSearch) {
      params.search = trimmedSearch;
    }

    return this.http
      .get<any>(`${environment.apiUrl}${API_ENDPOINTS.CONVERSATION.GET_ROOMS}`, {
        params,
        headers: { 'x-skip-loader': 'true' }
      })
      .pipe(
        map(res =>
          (res.data.items || []).map((room: any) =>
            this.normalizeConversation(room)
          )
        )
      );
  }

  createRoom(participantId: string) {
    if (!participantId) {
      return new Observable<Conversation>((observer) => observer.complete());
    }

    const currentUserId = this.authService.getUserId();
    const members = [currentUserId, participantId].filter(
      (memberId): memberId is string => !!memberId
    );

    if (members.length < 2) {
      return new Observable<Conversation>((observer) => observer.complete());
    }

    return new Observable<Conversation>((observer) => {
      this.socket.connect();

      const socket: any = (this.socket as any).socket;

      if (!socket) {
        observer.complete();
        return;
      }

      socket.emit(
        SOCKET_EVENTS.CREATE_ROOM,
        {
          members,
          type: 1
        },
        (response: any) => {
          const room = response?.data || response;
          if (room?._id || room?.roomId) {
            observer.next(this.normalizeConversation(room));
          }
          observer.complete();
        }
      );
    });
  }

  leaveRoom(roomId: string) {
    this.socket.emit(SOCKET_EVENTS.LEAVE_ROOM, { roomId });
  }

  updateRoom(roomId: string, payload: any) {
    this.socket.emit(SOCKET_EVENTS.UPDATE_ROOM, {
      roomId,
      ...payload
    });
  }

  deleteRoom(roomId: string) {
    this.socket.emit(SOCKET_EVENTS.DELETE_ROOM, { roomId });
  }

  // ======================
  // USERS SEARCH
  // ======================

  searchUsersForNewChat(query: string): Observable<any[]> {

    const trimmedQuery = String(query || '').trim();

    return this.http
      .get<ApiResponse<{ items: any[] }>>(
        `${environment.apiUrl}${API_ENDPOINTS.USER.GET_ALL}`,
        {
          params: { search: trimmedQuery },
          headers: { 'x-skip-loader': 'true' }
        }
      )
      .pipe(
        map(res => {

          const users = Array.isArray(res?.data?.items)
            ? res.data.items
            : [];

          return users.filter((user: any) => {
            const isPrivate = Boolean(user?.privateAccount);
            const isFollowing = Boolean(user?.isFollowing);
            return !isPrivate || isFollowing;
          });

        })
      );
  }

  // ======================
  // MESSAGES API
  // ======================

  getMessages(roomId: string): Observable<Message[]> {

    return this.http
      .get<any>(`${environment.apiUrl}${API_ENDPOINTS.CONVERSATION.GET}`, {
        params: { roomId },
        headers: { 'x-skip-loader': 'true' }
      })
      .pipe(
        map(res =>
          (res.data.conversationList || []).map((msg: any) =>
            this.normalizeMessage(msg)
          )
        )
      );
  }

deleteMessageApi(messageId: string) {

  return this.http.delete(
    `${environment.apiUrl}${API_ENDPOINTS.CONVERSATION.GET}/${messageId}`,
    {
      headers: { 'x-skip-loader': 'true' }
    }
  );

}

  // ======================
  // SOCKET MESSAGE ACTIONS
  // ======================

sendMessage(roomId: string, message: string): Observable<Message> {

  const trimmed = String(message || '').trim();

  if (!roomId || !trimmed) {
    return new Observable((observer) => observer.complete());
  }

  return new Observable<Message>((observer) => {
    const socket: any = (this.socket as any).socket;

    socket.emit(
      SOCKET_EVENTS.SEND_MESSAGE,
      {
        roomId,
        message: trimmed,
        messageType: 1
      },
      (response: any) => {
        if (!response?.data) {
          observer.complete();
          return;
        }

        observer.next(this.normalizeMessage(response.data));
        observer.complete();
      }
    );
  });

}

  updateMessage(conversationId: string, message: string) {

    const trimmed = String(message || '').trim();

    if (!conversationId || !trimmed) return;

    this.socket.emit(SOCKET_EVENTS.UPDATE_MESSAGE, {
      conversationId,
      message: trimmed
    });
  }

  deleteMessage(messageId: string, roomId?: string) {

    if (!messageId) return;

    this.socket.emit(SOCKET_EVENTS.MESSAGE_DELETE, {
      messageId,
      roomId
    });
  }

  // ======================
  // SOCKET LISTENERS
  // ======================

onNewMessage(): Observable<Message> {
  return this.listenSocket<any>(SOCKET_EVENTS.NEW_MESSAGE).pipe(
    map((payload) => this.normalizeIncomingMessage(payload))
  );

}

  onMessageUpdated(): Observable<Message> {
    return this.listenSocket<any>(SOCKET_EVENTS.MESSAGE_UPDATED).pipe(
      map((payload) => this.normalizeIncomingMessage(payload))
    );
  }

  onMessageDeleted(): Observable<any> {
    return this.listenSocket<any>(SOCKET_EVENTS.MESSAGE_DELETED_FOR_EVERYONE);
  }

  onMessageSeen(): Observable<any> {
    return merge(
      this.listenSocket<any>(SOCKET_EVENTS.MESSAGE_SEEN_BY_USER),
      this.listenSocket<any>(SOCKET_EVENTS.MESSAGE_SEEN)
    ).pipe(
      map((payload) => this.normalizeSeenPayload(payload))
    );
  }

  onTyping(): Observable<any> {
    return this.listenSocket<any>(SOCKET_EVENTS.MESSAGE_TYPING_BY_USER);
  }

  onRoomCreated(): Observable<Conversation> {
    return this.listenSocket<any>(SOCKET_EVENTS.CREATE_ROOM)
      .pipe(
        map(room => this.normalizeConversation(room))
      );
  }

  // ======================
  // NORMALIZERS
  // ======================

  private normalizeConversation(room: any): Conversation {

    const roomId = room?._id || room?.roomId || '';

    return {
      _id: String(roomId),
      conversationName: room.conversationName || 'Conversation',
      conversationImage: room.conversationImage || '',
      unreadCount: Number(room.unreadCount || 0),
      members: Array.isArray(room.members) ? room.members : [],
      lastMessage: room.lastMessage
        ? {
            message: String(room.lastMessage.message || ''),
            createdAt: String(
              room.lastMessage.createdAt || new Date().toISOString()
            )
          }
        : undefined
    };
  }

  private normalizeIncomingMessage(payload: any): Message {
    const message = payload?.data ?? payload;
    return this.normalizeMessage(message);
  }

  private normalizeSeenPayload(payload: any) {
    const data = payload?.data ?? payload ?? {};

    return {
      roomId: String(
        data?.roomId ||
        data?.conversationId ||
        data?.conversation?._id ||
        ''
      ),
      messageId: String(
        data?.messageId ||
        data?._id ||
        data?.message?._id ||
        ''
      ),
      userId: String(
        data?.userId ||
        data?.seenBy?._id ||
        data?.user?._id ||
        ''
      )
    };
  }

  private normalizeMessage(message: any): Message {

    const roomId = String(
      message?.roomId ||
      message?.conversationId ||
      message?.conversation?._id ||
      ''
    );

    const senderId = String(
      message?.senderId ||
      message?.sender?._id ||
      ''
    );

    const seenBy = Array.isArray(message?.seenBy)
      ? message.seenBy
          .map((user: any) => {
            if (!user) return '';
            if (typeof user === 'string') return user;
            return String(user._id || user.userId || '');
          })
          .filter((userId: string) => !!userId)
      : [];

    return {
      ...message,
      _id: String(message._id),
      conversationId: roomId,
      roomId,
      message: String(message.message || ''),
      createdAt: String(message.createdAt || new Date().toISOString()),
      senderId,
      seenBy
    };

  }
markSeen(messageId: string) {

  if (!messageId) return;

  this.socket.emit(SOCKET_EVENTS.MESSAGE_SEEN, {
    messageId
  });

}

}
