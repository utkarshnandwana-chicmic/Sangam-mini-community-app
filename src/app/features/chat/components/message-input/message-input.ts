import { Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ChatService } from '../../services/chat.service';
import { Message } from '../../models/message.model';

@Component({
  selector: 'app-message-input',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './message-input.html',
  styleUrl: './message-input.scss'
})
export class MessageInputComponent {
  private chatService = inject(ChatService);

  @Input() conversationId!: string;
  @Output() messageSent = new EventEmitter<Message>();

  message = '';

  send() {
    const text = this.message.trim();

    if (!text) return;
    if (!this.conversationId) return;

    this.message = '';

    this.chatService.sendMessage(this.conversationId, text).subscribe({
      next: (message) => {
        this.messageSent.emit(message);
      }
    });
  }

}
