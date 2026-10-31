import {
  CHAT_COOLDOWN_MS,
  CHAT_MAX_LENGTH,
  CHAT_MAX_MESSAGES
} from '../../../shared/constants';
import { ChatMessageItem } from '../net/client';

export interface ChatUICallbacks {
  onSendMessage: (text: string) => void;
  onReportMessage: (messageId: string) => void;
}

/**
 * Khung Chat trong phòng (Mục 7):
 * - Ở góc phải màn hình, hiện 50 tin gần nhất (tên người gửi + giờ gửi + nội dung).
 * - Tối đa 200 ký tự, giới hạn 1 tin/2 giây (gửi nhanh hơn báo "Bạn gửi quá nhanh, chờ 2 giây").
 * - Có nút ẩn/hiện khung chat.
 * - Có nút Báo cáo tin nhắn xấu (ẩn ngay với riêng người báo cáo và ghi log phía server).
 */
export class ChatUI {
  private container: HTMLElement;
  private callbacks: ChatUICallbacks;
  private messagesListEl!: HTMLElement;
  private inputEl!: HTMLInputElement;
  private errorBannerEl!: HTMLElement;
  private chatBodyEl!: HTMLElement;
  private toggleBtnEl!: HTMLButtonElement;

  private hiddenMessageIds = new Set<string>();
  private allMessages: ChatMessageItem[] = [];
  private isCollapsed = false;
  private lastLocalSendAt = 0;
  private errorTimeout?: number;

  constructor(callbacks: ChatUICallbacks) {
    this.callbacks = callbacks;
    this.container = document.getElementById('chat-overlay')!;
    this.renderHTML();
    this.bindEvents();
    if (window.innerWidth <= 768) {
      this.setCollapsed(true);
    }
  }

  private renderHTML(): void {
    this.container.innerHTML = `
      <div class="chat-panel">
        <div class="chat-header">
          <span class="chat-title">💬 Trò chuyện trong phòng</span>
          <button id="btn-toggle-chat" class="btn-chat-toggle" title="Ẩn / Hiện khung chat">Thu gọn</button>
        </div>
        <div id="chat-body" class="chat-body">
          <div id="chat-messages-list" class="chat-messages-list">
            <div class="chat-empty-hint">Chưa có tin nhắn nào. Hãy gửi lời chào hoan hỷ!</div>
          </div>
          <div id="chat-error-banner" class="chat-error-banner hidden"></div>
          <div class="chat-input-row">
            <input
              id="chat-input"
              type="text"
              maxlength="${CHAT_MAX_LENGTH}"
              placeholder="Nhập tin nhắn (tối đa 200 ký tự)..."
              autocomplete="off"
            />
            <button id="btn-send-chat" class="btn-send-chat">Gửi</button>
          </div>
        </div>
      </div>
    `;

    this.messagesListEl = document.getElementById('chat-messages-list')!;
    this.inputEl = document.getElementById('chat-input') as HTMLInputElement;
    this.errorBannerEl = document.getElementById('chat-error-banner')!;
    this.chatBodyEl = document.getElementById('chat-body')!;
    this.toggleBtnEl = document.getElementById('btn-toggle-chat') as HTMLButtonElement;
  }

  private bindEvents(): void {
    const submitChat = () => {
      const text = this.inputEl.value.trim();
      if (!text) return;

      if (text.length > CHAT_MAX_LENGTH) {
        this.showError(`Tin nhắn tối đa ${CHAT_MAX_LENGTH} ký tự`);
        return;
      }

      const now = Date.now();
      if (now - this.lastLocalSendAt < CHAT_COOLDOWN_MS) {
        this.showError('Bạn gửi quá nhanh, chờ 2 giây');
        return;
      }

      this.lastLocalSendAt = now;
      this.inputEl.value = '';
      this.callbacks.onSendMessage(text);
    };

    document.getElementById('btn-send-chat')!.addEventListener('click', submitChat);
    this.inputEl.addEventListener('keydown', (e: KeyboardEvent) => {
      e.stopPropagation();
      if (e.key === 'Enter') {
        submitChat();
      }
    });

    this.toggleBtnEl.addEventListener('click', () => {
      this.setCollapsed(!this.isCollapsed);
    });
  }

  public setCollapsed(collapsed: boolean): void {
    this.isCollapsed = collapsed;
    this.chatBodyEl.classList.toggle('hidden', this.isCollapsed);
    this.toggleBtnEl.textContent = this.isCollapsed ? 'Mở chat' : 'Thu gọn';
  }

  public isChatCollapsed(): boolean {
    return this.isCollapsed;
  }

  public updateMessages(messages: ChatMessageItem[]): void {
    // Giữ tối đa 50 tin gần nhất
    this.allMessages = messages.slice(-CHAT_MAX_MESSAGES);
    this.renderMessages();
  }

  private renderMessages(): void {
    const visibleMsgs = this.allMessages.filter((m) => !this.hiddenMessageIds.has(m.id));
    if (visibleMsgs.length === 0) {
      this.messagesListEl.innerHTML = `<div class="chat-empty-hint">Chưa có tin nhắn hiển thị.</div>`;
      return;
    }

    this.messagesListEl.innerHTML = '';
    for (const msg of visibleMsgs) {
      const item = document.createElement('div');
      item.className = 'chat-msg-item';

      const metaSpan = document.createElement('span');
      metaSpan.className = 'chat-msg-meta';
      metaSpan.textContent = `[${msg.timeString}] ${msg.senderName}: `;

      const contentSpan = document.createElement('span');
      contentSpan.className = 'chat-msg-text';
      contentSpan.textContent = msg.text;

      const reportBtn = document.createElement('button');
      reportBtn.className = 'btn-report-msg';
      reportBtn.title = 'Báo cáo và ẩn tin nhắn này';
      reportBtn.textContent = '⚑ Báo cáo';
      reportBtn.addEventListener('click', () => {
        // Ẩn ngay với riêng người báo cáo và gửi log về phía server (Mục 7)
        this.hiddenMessageIds.add(msg.id);
        this.callbacks.onReportMessage(msg.id);
        this.renderMessages();
      });

      item.appendChild(metaSpan);
      item.appendChild(contentSpan);
      item.appendChild(reportBtn);
      this.messagesListEl.appendChild(item);
    }

    this.messagesListEl.scrollTop = this.messagesListEl.scrollHeight;
  }

  public showError(msg: string): void {
    this.errorBannerEl.textContent = msg;
    this.errorBannerEl.classList.remove('hidden');
    if (this.errorTimeout) {
      clearTimeout(this.errorTimeout);
    }
    this.errorTimeout = window.setTimeout(() => {
      this.errorBannerEl.classList.add('hidden');
    }, 3200);
  }

  public show(): void {
    this.container.classList.remove('hidden');
  }

  public hide(): void {
    this.container.classList.add('hidden');
  }

  public isHidden(): boolean {
    return this.container.classList.contains('hidden');
  }
}
