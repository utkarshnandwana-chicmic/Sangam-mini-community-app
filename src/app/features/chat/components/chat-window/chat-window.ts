import {
  AfterViewInit,
  AfterViewChecked,
  ChangeDetectorRef,
  Component,
  DestroyRef,
  ElementRef,
  HostListener,
  Input,
  OnChanges,
  OnInit,
  QueryList,
  SimpleChanges,
  ViewChild,
  ViewChildren,
  inject
} from '@angular/core';

import { CommonModule } from '@angular/common';
import { finalize } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { Conversation } from '../../models/conversation.model';
import { ChatService } from '../../services/chat.service';
import { Message } from '../../models/message.model';
import { MessageInputComponent } from '../message-input/message-input';
import { AuthService } from '../../../../core/services/auth';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-chat-window',
  standalone: true,
  imports: [CommonModule, MessageInputComponent, FormsModule],
  templateUrl: './chat-window.html',
  styleUrls: ['./chat-window.scss']
})
export class ChatWindowComponent implements OnInit, OnChanges, AfterViewInit, AfterViewChecked {

  @ViewChild('scrollContainer') private scrollContainer!: ElementRef;
  @ViewChildren('messageRow') private messageRows!: QueryList<ElementRef<HTMLElement>>;

  private chatService = inject(ChatService);
  private destroyRef = inject(DestroyRef);
  private authService = inject(AuthService);
  private cdr = inject(ChangeDetectorRef);

  @Input() conversation: Conversation | null = null;

  messages: Message[] = [];
  isLoadingMessages = false;
  isUserTyping = false;

  activeMessageMenu: string | null = null;
  editingMessageId: string | null = null;
  editingText = '';

  private shouldAutoScroll = false;
  private loadedConversationId: string | null = null;
  private intersectionObserver: IntersectionObserver | null = null;

  currentUserId = this.authService.getUserId() ?? "";

  ngOnInit() {
    this.setupIntersectionObserver();

    // =============================
    // NEW MESSAGE
    // =============================
this.chatService.onNewMessage()
  .pipe(takeUntilDestroyed(this.destroyRef))
  .subscribe((msg) => {

    if (!this.conversation) {
      return;
    }

    if (msg.roomId !== this.conversation._id) {
      return;
    }

    const exists = this.messages.some(m => m._id === msg._id);

    if (exists) {
      return;
    }

    this.messages = [...this.messages, msg];

    if (
      msg.senderId !== this.currentUserId &&
      document.visibilityState === 'visible'
    ) {
      this.chatService.markSeen(msg._id);
    }

    this.shouldAutoScroll = true;

    this.cdr.markForCheck();

  });

    // =============================
    // MESSAGE UPDATED
    // =============================
this.chatService.onMessageUpdated()
  .pipe(takeUntilDestroyed(this.destroyRef))
  .subscribe((updated: Message) => {

    const index = this.messages.findIndex(m => m._id === updated._id);

    if (index >= 0) {

      const next = [...this.messages];
      next[index] = updated;
      this.messages = next;

      this.cdr.markForCheck();

    }

  });

    // =============================
    // MESSAGE DELETED
    // =============================
    this.chatService.onMessageDeleted()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((payload: any) => {

        const messageId = payload?.messageId || payload?._id;
        if (!messageId) return;

        this.messages = this.messages.filter(m => m._id !== messageId);
        this.cdr.markForCheck();

      });

    // =============================
    // MESSAGE SEEN
    // =============================
    this.chatService.onMessageSeen()
      .pipe(takeUntilDestroyed(this.destroyRef))
.subscribe((data: any) => {

  if (!this.conversation) return;

        const belongsToActiveConversation =
          !data.roomId || data.roomId === this.conversation._id;

        if (!belongsToActiveConversation) return;

        const index = this.messages.findIndex(m => m._id === data.messageId);

        if (index >= 0) {

          const next = [...this.messages];
          const msg: any = next[index];

if (data.userId && !msg.seenBy?.includes(data.userId)) {
  msg.seenBy = [...(msg.seenBy || []), data.userId];
}

          next[index] = msg;
          this.messages = next;

          this.cdr.markForCheck();
        }

      });

    // =============================
    // TYPING
    // =============================
    this.chatService.onTyping()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((data: any) => {

        if (!this.conversation) return;
        if (data.roomId !== this.conversation._id) return;
        if (data.userId === this.currentUserId) return;

        this.isUserTyping = true;

        setTimeout(() => {
          this.isUserTyping = false;
          this.cdr.markForCheck();
        }, 2000);

      });

  }

  ngAfterViewInit() {
    this.observeVisibleMessages();

    this.messageRows.changes
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.observeVisibleMessages();
      });
  }

  // =============================
  // CONVERSATION CHANGE
  // =============================

  ngOnChanges(changes: SimpleChanges) {

    if (!changes['conversation']) return;

    const nextId = this.conversation?._id || null;

    if (!nextId || this.loadedConversationId === nextId) return;

    this.loadedConversationId = nextId;
    this.messages = [];
    this.loadMessages();

  }

  // =============================
  // AUTO SCROLL
  // =============================

  ngAfterViewChecked() {

    if (this.shouldAutoScroll) {
      this.scrollToBottom();
      this.shouldAutoScroll = false;
    }

  }

  // =============================
  // LOAD MESSAGES
  // =============================

  private loadMessages() {

    if (!this.conversation) return;

    const roomId = this.conversation._id;

    this.isLoadingMessages = true;

    this.chatService.getMessages(roomId)
      .pipe(
        finalize(() => {
          this.isLoadingMessages = false;
          this.cdr.markForCheck();
        })
      )
      .subscribe({

next: (messages) => {
  this.messages = messages.sort((a, b) =>
    new Date(a.createdAt).getTime() -
    new Date(b.createdAt).getTime()
  );

  this.shouldAutoScroll = true;
  this.cdr.detectChanges();
  this.observeVisibleMessages();

},

        error: () => {
          this.messages = [];
        }

      });

  }

  // =============================
  // EDIT MESSAGE
  // =============================

  startEditMessage(msg: Message) {
    if (!this.canEditMessage(msg)) {
      this.activeMessageMenu = null;
      return;
    }

    this.editingMessageId = msg._id;
    this.editingText = msg.message;
    this.activeMessageMenu = null;

  }

  saveEditMessage(msg: Message) {

    const text = this.editingText.trim();

    if (!text || text === msg.message) {
      this.cancelEditMessage();
      return;
    }

    this.chatService.updateMessage(msg._id, text);

    this.messages = this.messages.map(m =>
      m._id === msg._id ? { ...m, message: text } : m
    );

    this.cancelEditMessage();
    this.cdr.markForCheck();

  }

  cancelEditMessage() {

    this.editingMessageId = null;
    this.editingText = '';

  }

  // =============================
  // DELETE MESSAGE
  // =============================

  deleteMessage(msg: Message) {

    if (!msg?._id) return;

    const roomId = this.conversation?._id;

    const previousMessages = [...this.messages];

    this.messages = this.messages.filter(m => m._id !== msg._id);

    this.cdr.markForCheck();

    this.chatService.deleteMessageApi(msg._id).subscribe({

      next: () => {
        this.chatService.deleteMessage(msg._id, roomId);
      },

      error: () => {

        this.messages = previousMessages;
        this.cdr.markForCheck();

      }

    });

  }

  // =============================
  // HELPERS
  // =============================

  toggleMenu(msg: Message) {

    this.activeMessageMenu =
      this.activeMessageMenu === msg._id ? null : msg._id;

  }

  canEditMessage(msg: Message): boolean {
    if (!this.isOwnMessage(msg) || !msg?.createdAt) return false;

    const createdAt = new Date(msg.createdAt).getTime();
    if (Number.isNaN(createdAt)) return false;

    return Date.now() - createdAt <= 3 * 60 * 1000;
  }

  isOwnMessage(msg: Message) {
    return msg.senderId === this.currentUserId;
  }

  onMessageSent(message: Message) {
    if (!this.conversation) return;
    if ((message.roomId || message.conversationId) !== this.conversation._id) return;

    const exists = this.messages.some((msg) => msg._id === message._id);
    if (exists) return;

    this.messages = [...this.messages, message];
    this.shouldAutoScroll = true;
    this.cdr.markForCheck();
  }

  @HostListener('document:click')
  closeMenu() {
    this.activeMessageMenu = null;
  }

  isMessageSeen(msg: Message): boolean {

    if (!msg?.seenBy?.length) return false;

    return msg.seenBy.some(userId => userId !== this.currentUserId);

  }

  trackByMessage(index: number, msg: Message) {
    return msg._id;
  }

  private scrollToBottom() {

    if (!this.scrollContainer) return;

    const el = this.scrollContainer.nativeElement;
    el.scrollTop = el.scrollHeight;

  }

  private setupIntersectionObserver() {

    if (typeof IntersectionObserver === 'undefined') return;

    this.intersectionObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting || entry.intersectionRatio < 0.6) return;
          if (document.visibilityState !== 'visible') return;

          const element = entry.target as HTMLElement;
          const messageId = element.dataset['messageId'];

          if (!messageId) return;

          const message = this.messages.find((msg) => msg._id === messageId);
          if (!message) return;
          if (message.senderId === this.currentUserId) return;
          if ((message.seenBy || []).includes(this.currentUserId)) return;

          this.chatService.markSeen(messageId);
          this.intersectionObserver?.unobserve(element);
        });
      },
      {
        threshold: 0.6
      }
    );

  }

  private observeVisibleMessages() {

    if (!this.intersectionObserver || !this.messageRows) return;

    this.messageRows.forEach((rowRef) => {
      const element = rowRef.nativeElement;
      const messageId = element.dataset['messageId'];

      if (!messageId) return;

      const message = this.messages.find((msg) => msg._id === messageId);
      if (!message) return;
      if (message.senderId === this.currentUserId) return;
      if ((message.seenBy || []).includes(this.currentUserId)) return;

      this.intersectionObserver?.observe(element);
    });

  }

}
