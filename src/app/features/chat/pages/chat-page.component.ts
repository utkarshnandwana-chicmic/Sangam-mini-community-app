import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subject, catchError, debounceTime, distinctUntilChanged, finalize, of, switchMap, take } from 'rxjs';

import { Conversation } from '../models/conversation.model';
import { ConversationListComponent } from '../components/conversation-list/conversation-list';
import { ChatWindowComponent } from '../components/chat-window/chat-window';
import { ChatService } from '../services/chat.service';
import { AuthService } from '../../../core/services/auth';
import { ImageUrlPipe } from '../../../core/pipes/image-url-pipe';

@Component({
  selector: 'app-chat-page',
  standalone: true,
  imports: [
    CommonModule,
    ConversationListComponent,
    ChatWindowComponent,
    ImageUrlPipe
  ],
  templateUrl: './chat-page.component.html',
  styleUrl: './chat-page.scss'
})
export class ChatPageComponent implements OnInit {
  private chatService = inject(ChatService);
  private authService = inject(AuthService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private destroyRef = inject(DestroyRef);
  private newChatSearch$ = new Subject<string>();

  selectedConversation = signal<Conversation | null>(null);
  showUserSearch = signal(false);
  newChatResults = signal<any[]>([]);
  isSearchingUsers = signal(false);

  newChatQuery = '';

  private hasLoadedConversations = false;
  private creatingConversationForUserId: string | null = null;
  private pendingTargetUserId: string | null = null;
  private latestConversations: Conversation[] = [];

  ngOnInit(): void {
    this.setupNewChatSearch();

    this.route.queryParamMap
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((params) => {
        const userId = String(params.get('userId') || '').trim();
        this.pendingTargetUserId = userId || null;
        this.tryOpenOrCreatePendingTargetConversation();
      });
  }

  openUserSearch() {
    this.showUserSearch.set(true);
    this.newChatQuery = '';
    this.newChatResults.set([]);
  }

  closeUserSearch() {
    this.showUserSearch.set(false);
    this.newChatQuery = '';
    this.newChatResults.set([]);
    this.isSearchingUsers.set(false);
  }

  startConversation(user: any) {
    const targetUserId = this.getUserId(user);
    if (!targetUserId) return;

    this.openOrCreateConversationByUserId(targetUserId, true);
  }

  onSelectConversation(conversation: Conversation) {
    this.selectedConversation.set(conversation);
  }

  onConversationsLoaded(conversations: Conversation[]) {
    this.hasLoadedConversations = true;
    this.latestConversations = Array.isArray(conversations) ? [...conversations] : [];

    if (!Array.isArray(conversations) || conversations.length === 0) {
      this.selectedConversation.set(null);
      this.tryOpenOrCreatePendingTargetConversation();
      return;
    }

    const current = this.selectedConversation();
    if (!current?._id) {
      const pendingRoom = this.findConversationByOtherMemberId(
        this.latestConversations,
        this.pendingTargetUserId
      );
      this.selectedConversation.set(
        this.pendingTargetUserId ? pendingRoom : (pendingRoom || conversations[0])
      );
      this.tryOpenOrCreatePendingTargetConversation();
      return;
    }

    const updatedCurrent = conversations.find((conversation) => conversation._id === current._id);
    if (updatedCurrent) {
      this.selectedConversation.set(updatedCurrent);
    }

    this.tryOpenOrCreatePendingTargetConversation();
  }

  onNewChatSearchInput(event: Event): void {
    const input = event.target as HTMLInputElement | null;
    const value = String(input?.value || '');
    this.newChatQuery = value;
    this.newChatSearch$.next(value);
  }

  clearNewChatSearch(): void {
    this.newChatQuery = '';
    this.newChatResults.set([]);
    this.newChatSearch$.next('');
  }

  private setupNewChatSearch(): void {
    this.newChatSearch$
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        switchMap((query) => {
          const trimmedQuery = String(query || '').trim();
          if (trimmedQuery.length < 2) {
            this.isSearchingUsers.set(false);
            return of(null);
          }

          this.isSearchingUsers.set(true);
          return this.chatService.searchUsersForNewChat(trimmedQuery).pipe(
            catchError(() => of([] as any[])),
            finalize(() => this.isSearchingUsers.set(false))
          );
        }),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe((users) => {
        if (users === null) {
          this.newChatResults.set([]);
          return;
        }

        const currentUserId = this.authService.getUserId();
        const filtered = users.filter((user: any) => {
          const userId = this.getUserId(user);
          return !!userId && userId !== currentUserId;
        });
        this.newChatResults.set(filtered);
      });
  }

  private tryOpenOrCreatePendingTargetConversation(): void {
    if (!this.hasLoadedConversations || !this.pendingTargetUserId) return;
    this.openOrCreateConversationByUserId(this.pendingTargetUserId, false);
  }

  private openOrCreateConversationByUserId(targetUserId: string, closeSearchOnSuccess: boolean): void {
    if (!targetUserId) return;

    const currentUserId = this.authService.getUserId();
    if (currentUserId && targetUserId === currentUserId) return;

    const existingConversation = this.findConversationByOtherMemberId(
      this.latestConversations,
      targetUserId
    );

    if (existingConversation) {
      this.selectedConversation.set(existingConversation);
      if (closeSearchOnSuccess) this.closeUserSearch();
      this.creatingConversationForUserId = null;
      this.pendingTargetUserId = null;
      this.clearTargetUserQueryParam();
      return;
    }

    if (this.creatingConversationForUserId === targetUserId) return;
    this.creatingConversationForUserId = targetUserId;

    this.chatService.onRoomCreated()
      .pipe(
        take(1),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe((room: Conversation) => {
        if (room?._id) {
          this.latestConversations = [
            room,
            ...this.latestConversations.filter((item) => item._id !== room._id)
          ];
          this.selectedConversation.set(room);
        }
        if (closeSearchOnSuccess) this.closeUserSearch();
        this.creatingConversationForUserId = null;
        this.pendingTargetUserId = null;
        this.clearTargetUserQueryParam();
      });

    this.chatService.createRoom(targetUserId)
      .pipe(take(1))
      .subscribe((room: Conversation) => {
        if (!room?._id || this.creatingConversationForUserId !== targetUserId) return;

        this.latestConversations = [
          room,
          ...this.latestConversations.filter((item) => item._id !== room._id)
        ];
        this.selectedConversation.set(room);
        if (closeSearchOnSuccess) this.closeUserSearch();
        this.creatingConversationForUserId = null;
        this.pendingTargetUserId = null;
        this.clearTargetUserQueryParam();
      });

    this.tryResolveCreatedConversation(targetUserId, closeSearchOnSuccess, 3);
  }

  private clearTargetUserQueryParam(): void {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { userId: null },
      queryParamsHandling: 'merge',
      replaceUrl: true
    });
  }

  private findConversationByOtherMemberId(conversations: Conversation[], otherUserId: string | null): Conversation | null {
    if (!otherUserId) return null;

    return conversations.find((conversation) => {
      const members = Array.isArray(conversation?.members)
        ? conversation.members
        : [];

      const memberIds = members
        .map((member: any) => {
          if (!member) return null;
          if (typeof member === 'string') return member;
          return member._id || member.userId || member?.user?._id || member?.user?.userId || member?.id || null;
        })
        .filter((id: string | null): id is string => !!id);

      return memberIds.includes(otherUserId);
    }) || null;
  }

  private getUserId(user: any): string {
    return String(
      user?._id ||
      user?.userId ||
      user?.id ||
      user?.user?._id ||
      user?.user?.userId ||
      ''
    ).trim();
  }

  private tryResolveCreatedConversation(targetUserId: string, closeSearchOnSuccess: boolean, attemptsLeft: number): void {
    setTimeout(() => {
      if (this.creatingConversationForUserId !== targetUserId) return;

      this.chatService.getRooms().pipe(take(1)).subscribe((rooms) => {
        this.latestConversations = Array.isArray(rooms) ? [...rooms] : [];

        const createdRoom = this.findConversationByOtherMemberId(this.latestConversations, targetUserId);
        if (createdRoom) {
          this.selectedConversation.set(createdRoom);
          if (closeSearchOnSuccess) this.closeUserSearch();
          this.creatingConversationForUserId = null;
          this.pendingTargetUserId = null;
          this.clearTargetUserQueryParam();
          return;
        }

        if (attemptsLeft > 1) {
          this.tryResolveCreatedConversation(targetUserId, closeSearchOnSuccess, attemptsLeft - 1);
          return;
        }

        this.creatingConversationForUserId = null;
      });
    }, 900);
  }
}
