import { Component, DestroyRef, EventEmitter, Input, OnInit, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subject, catchError, debounceTime, distinctUntilChanged, finalize, of, switchMap } from 'rxjs';

import { ChatService } from '../../services/chat.service';
import { Conversation } from '../../models/conversation.model';
import { Message } from '../../models/message.model';

@Component({
  selector: 'app-conversation-list',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './conversation-list.html',
  styleUrls: ['./conversation-list.scss']
})
export class ConversationListComponent implements OnInit {
  private static readonly RECENT_CHATS_CACHE_KEY = 'chat.recent.cache.v1';

  private chatService = inject(ChatService);
  private destroyRef = inject(DestroyRef);
  private conversationSearch$ = new Subject<string>();

  @Input() activeConversationId: string | null = null;

  conversations: Conversation[] = [];
  searchQuery = '';
  loading = false;
  loadFailed = false;

  @Output() conversationSelected = new EventEmitter<Conversation>();
  @Output() conversationsLoaded = new EventEmitter<Conversation[]>();
  @Output() newChat = new EventEmitter<void>();

  ngOnInit() {
    this.setupConversationSearch();
    this.hydrateFromCache();
    this.conversationsLoaded.emit([...this.conversations]);
    this.loadConversations();

    this.chatService.onNewMessage()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((message: Message) => {
        this.upsertRecentConversationFromMessage(message);
      });

    this.chatService.onMessageUpdated()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((message: Message) => {
        this.upsertRecentConversationFromMessage(message);
      });
  }

  loadConversations() {
    this.loading = true;
    this.loadFailed = false;

    this.chatService.getRooms().subscribe({
      next: (res) => {
        const conversations = Array.isArray(res) ? [...res] : [];
        this.setConversations(conversations);
        this.loading = false;
        this.conversationsLoaded.emit([...this.conversations]);
      },
      error: () => {
        this.loading = false;
        this.loadFailed = true;
      }
    });
  }

  selectConversation(conversation: Conversation) {
    this.activeConversationId = conversation._id;
    this.conversationSelected.emit(conversation);
  }

  openNewChat() {
    this.newChat.emit();
  }

  onSearchInput(event: Event): void {
    const input = event.target as HTMLInputElement | null;
    const value = input?.value ?? '';
    this.searchQuery = value;
    this.conversationSearch$.next(value);
  }

  clearSearch(): void {
    this.searchQuery = '';
    this.conversationSearch$.next('');
  }

  private setConversations(conversations: Conversation[]) {
    conversations.sort((a, b) => {
      const aTime = new Date(a?.lastMessage?.createdAt || 0).getTime();
      const bTime = new Date(b?.lastMessage?.createdAt || 0).getTime();
      return bTime - aTime;
    });

    this.conversations = conversations;
    this.persistToCache();
  }

  private setupConversationSearch() {
    this.conversationSearch$
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        switchMap((query) => {
          const trimmed = String(query || '').trim();
          if (!trimmed) {
            this.loadConversations();
            return of(null);
          }

          this.loading = true;
          this.loadFailed = false;

          return this.chatService.getRooms(trimmed).pipe(
            catchError(() => {
              this.loadFailed = true;
              return of([] as Conversation[]);
            }),
            finalize(() => {
              this.loading = false;
            })
          );
        }),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe((res) => {
        if (res === null) return;
        const conversations = Array.isArray(res) ? [...res] : [];
        this.setConversations(conversations);
        this.conversationsLoaded.emit([...this.conversations]);
      });
  }

  private upsertRecentConversationFromMessage(message: Message) {
    const roomId = message?.conversationId || message?.roomId;
    if (!roomId || !message?.message) return;

    const incomingTime = message.createdAt || new Date().toISOString();
    const existingIndex = this.conversations.findIndex((conversation) => conversation._id === roomId);

    if (existingIndex >= 0) {
      const updatedConversation: Conversation = {
        ...this.conversations[existingIndex],
        lastMessage: {
          message: message.message,
          createdAt: incomingTime
        }
      };

      const next = [...this.conversations];
      next.splice(existingIndex, 1);
      this.setConversations([updatedConversation, ...next]);
      return;
    }

    const sender = message?.sender;
    const fallbackConversation: Conversation = {
      _id: roomId,
      conversationName: sender?.username || 'Conversation',
      conversationImage: sender?.avatar || '',
      unreadCount: 0,
      members: [],
      lastMessage: {
        message: message.message,
        createdAt: incomingTime
      }
    };

    this.setConversations([fallbackConversation, ...this.conversations]);
  }

  private hydrateFromCache() {
    try {
      const raw = localStorage.getItem(ConversationListComponent.RECENT_CHATS_CACHE_KEY);
      if (!raw) return;

      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return;

      this.conversations = parsed.filter((item: any) => item && typeof item._id === 'string');
    } catch {
      this.conversations = [];
    }
  }

  private persistToCache() {
    try {
      localStorage.setItem(
        ConversationListComponent.RECENT_CHATS_CACHE_KEY,
        JSON.stringify(this.conversations)
      );
    } catch {
      // Ignore localStorage failures.
    }
  }
}
