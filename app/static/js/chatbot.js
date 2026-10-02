/**
 * TravelSphere AI Chatbot Concierge
 * Powered by Groq LLM Inference
 */

(function () {
  'use strict';

  const STORAGE_KEY = 'travel_chat_history_v1';
  let chatHistory = [];
  let isAwaitingResponse = false;

  // Initialize once DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initChatbot);
  } else {
    initChatbot();
  }

  function initChatbot() {
    if (document.getElementById('travelChatbotLauncher')) return;

    loadStoredHistory();
    renderChatbotDOM();
    bindEvents();
    loadSuggestions();

    if (chatHistory.length === 0) {
      addInitialWelcomeMessage();
    } else {
      renderMessagesFromHistory();
    }
  }

  function renderChatbotDOM() {
    const container = document.createElement('div');
    container.id = 'travelChatbotContainer';
    container.innerHTML = `
      <!-- Launcher Button & Tooltip -->
      <div class="chatbot-launcher-container" id="travelChatbotLauncher">
        <div class="chatbot-tooltip" id="chatbotTooltip">
          <span class="chatbot-tooltip-dot"></span>
          <span>Ask AI Travel Concierge</span>
        </div>
        <button class="chatbot-launcher-btn" id="chatbotToggleBtn" aria-label="Open AI Travel Concierge">
          <span class="chatbot-launcher-icon" id="chatbotIcon">✨</span>
          <span class="chatbot-unread-badge" id="chatbotBadge" style="display:none;">1</span>
        </button>
      </div>

      <!-- Chat Modal Window -->
      <div class="chatbot-window hidden" id="chatbotWindow">
        <div class="chatbot-header">
          <div class="chatbot-header-info">
            <div class="chatbot-avatar">
              <span>✈️</span>
              <span class="chatbot-online-indicator" title="Groq AI Online"></span>
            </div>
            <div>
              <h3 class="chatbot-title">TravelSphere AI</h3>
              <div class="chatbot-badge-groq">
                <span>⚡ Powered by Groq</span>
              </div>
            </div>
          </div>
          <div class="chatbot-header-actions">
            <button class="chatbot-action-btn" id="chatbotClearBtn" title="Clear Conversation">
              🗑️
            </button>
            <button class="chatbot-action-btn" id="chatbotCloseBtn" title="Close Chat">
              ✕
            </button>
          </div>
        </div>

        <!-- Quick Prompt Chips -->
        <div class="chatbot-suggestions-container" id="chatbotSuggestions">
          <!-- Dynamically populated -->
        </div>

        <!-- Message Stream -->
        <div class="chatbot-messages" id="chatbotMessages">
          <!-- Dynamically populated -->
        </div>

        <!-- Input Bar -->
        <div class="chatbot-input-bar">
          <form class="chatbot-form" id="chatbotForm">
            <input 
              type="text" 
              class="chatbot-input" 
              id="chatbotInput" 
              placeholder="Ask for hotel advice, prices, routes..." 
              autocomplete="off"
              maxlength="1000"
            />
            <button type="submit" class="chatbot-send-btn" id="chatbotSendBtn" aria-label="Send Message">
              ➤
            </button>
          </form>
          <div class="chatbot-footer-caption">
            Instant recommendations & GPS assistance
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(container);
  }

  function bindEvents() {
    const toggleBtn = document.getElementById('chatbotToggleBtn');
    const closeBtn = document.getElementById('chatbotCloseBtn');
    const clearBtn = document.getElementById('chatbotClearBtn');
    const form = document.getElementById('chatbotForm');
    const tooltip = document.getElementById('chatbotTooltip');

    toggleBtn.addEventListener('click', () => {
      toggleChatWindow();
      if (tooltip) tooltip.style.display = 'none';
    });

    closeBtn.addEventListener('click', () => {
      closeChatWindow();
    });

    clearBtn.addEventListener('click', () => {
      if (confirm('Clear current chat conversation?')) {
        chatHistory = [];
        saveStoredHistory();
        const messagesContainer = document.getElementById('chatbotMessages');
        if (messagesContainer) messagesContainer.innerHTML = '';
        addInitialWelcomeMessage();
      }
    });

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      handleSendMessage();
    });
  }

  function toggleChatWindow() {
    const win = document.getElementById('chatbotWindow');
    const icon = document.getElementById('chatbotIcon');
    const badge = document.getElementById('chatbotBadge');

    if (win.classList.contains('hidden')) {
      win.classList.remove('hidden');
      icon.textContent = '✕';
      if (badge) badge.style.display = 'none';
      setTimeout(() => {
        document.getElementById('chatbotInput').focus();
        scrollToBottom();
      }, 150);
    } else {
      closeChatWindow();
    }
  }

  function closeChatWindow() {
    const win = document.getElementById('chatbotWindow');
    const icon = document.getElementById('chatbotIcon');
    win.classList.add('hidden');
    icon.textContent = '✨';
  }

  function addInitialWelcomeMessage() {
    const user = (window.API && typeof window.API.getUser === 'function') ? window.API.getUser() : null;
    const greeting = user && user.name ? `Hello, **${user.name}**!` : 'Hello traveler!';
    const welcome = `${greeting} Welcome to **TravelSphere Concierge** 🌏\n\nI can help you find luxury stays, compare hotel rates, check room amenities, or navigate using our [Live GPS Route Tracker](/dashboard.html).\n\nWhat would you like to explore today?`;
    
    appendMessageToUI('bot', welcome, false);
    chatHistory.push({ role: 'assistant', content: welcome });
    saveStoredHistory();
  }

  async function loadSuggestions() {
    const container = document.getElementById('chatbotSuggestions');
    if (!container) return;

    try {
      let suggestions = [];
      if (window.API && typeof window.API.get === 'function') {
        const res = await window.API.get('/chat/suggestions');
        suggestions = res.suggestions || [];
      } else {
        const res = await fetch('/api/chat/suggestions');
        const data = await res.json();
        suggestions = data.suggestions || [];
      }

      container.innerHTML = suggestions.map(s => `
        <button class="chatbot-chip" type="button" data-query="${escapeHtml(s.query)}">
          ${escapeHtml(s.label)}
        </button>
      `).join('');

      container.querySelectorAll('.chatbot-chip').forEach(btn => {
        btn.addEventListener('click', () => {
          const query = btn.getAttribute('data-query');
          if (query) {
            document.getElementById('chatbotInput').value = query;
            handleSendMessage();
          }
        });
      });
    } catch (e) {
      console.warn('Could not load suggestions:', e);
      container.style.display = 'none';
    }
  }

  async function handleSendMessage() {
    if (isAwaitingResponse) return;

    const input = document.getElementById('chatbotInput');
    const sendBtn = document.getElementById('chatbotSendBtn');
    const text = input.value.trim();

    if (!text) return;

    // Render user message
    appendMessageToUI('user', text, true);
    chatHistory.push({ role: 'user', content: text });
    saveStoredHistory();

    input.value = '';
    isAwaitingResponse = true;
    sendBtn.disabled = true;

    // Show typing animation
    showTypingIndicator();

    try {
      let data;
      const payload = {
        message: text,
        history: chatHistory.slice(-8)
      };

      if (window.API && typeof window.API.post === 'function') {
        data = await window.API.post('/chat', payload);
      } else {
        const token = localStorage.getItem('travel_token');
        const headers = { 'Content-Type': 'application/json' };
        if (token) headers['Authorization'] = `Bearer ${token}`;

        const res = await fetch('/api/chat', {
          method: 'POST',
          headers,
          body: JSON.stringify(payload)
        });
        data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Chat request failed');
      }

      hideTypingIndicator();
      const botReply = data.reply || "I'm sorry, I couldn't formulate a response right now. Please try again.";
      appendMessageToUI('bot', botReply, true);
      chatHistory.push({ role: 'assistant', content: botReply });
      saveStoredHistory();

    } catch (err) {
      hideTypingIndicator();
      const errMsg = `⚠️ Unable to reach AI Concierge (${err.message || 'Network error'}). Please try again.`;
      appendMessageToUI('bot', errMsg, true);
    } finally {
      isAwaitingResponse = false;
      sendBtn.disabled = false;
      input.focus();
    }
  }

  function appendMessageToUI(sender, content, animate = true) {
    const messagesContainer = document.getElementById('chatbotMessages');
    if (!messagesContainer) return;

    const msgEl = document.createElement('div');
    msgEl.className = `chatbot-message ${sender}`;
    if (!animate) msgEl.style.animation = 'none';

    const avatar = sender === 'bot' ? '🤖' : '👤';
    const formattedHtml = formatMarkdown(content);
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    msgEl.innerHTML = `
      <div class="chatbot-msg-avatar">${avatar}</div>
      <div>
        <div class="chatbot-bubble">
          ${formattedHtml}
        </div>
        <div class="chatbot-timestamp">${timeStr}</div>
      </div>
    `;

    messagesContainer.appendChild(msgEl);
    scrollToBottom();
  }

  function showTypingIndicator() {
    const messagesContainer = document.getElementById('chatbotMessages');
    if (!messagesContainer || document.getElementById('chatbotTypingIndicator')) return;

    const typingEl = document.createElement('div');
    typingEl.id = 'chatbotTypingIndicator';
    typingEl.className = 'chatbot-message bot';
    typingEl.innerHTML = `
      <div class="chatbot-msg-avatar">🤖</div>
      <div class="chatbot-typing">
        <div class="chatbot-typing-dot"></div>
        <div class="chatbot-typing-dot"></div>
        <div class="chatbot-typing-dot"></div>
      </div>
    `;
    messagesContainer.appendChild(typingEl);
    scrollToBottom();
  }

  function hideTypingIndicator() {
    const el = document.getElementById('chatbotTypingIndicator');
    if (el) el.remove();
  }

  function renderMessagesFromHistory() {
    const messagesContainer = document.getElementById('chatbotMessages');
    if (!messagesContainer) return;
    messagesContainer.innerHTML = '';

    chatHistory.forEach(item => {
      const sender = item.role === 'assistant' ? 'bot' : 'user';
      appendMessageToUI(sender, item.content, false);
    });
  }

  function scrollToBottom() {
    const container = document.getElementById('chatbotMessages');
    if (container) {
      container.scrollTop = container.scrollHeight;
    }
  }

  function loadStoredHistory() {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (raw) {
        chatHistory = JSON.parse(raw);
        if (!Array.isArray(chatHistory)) chatHistory = [];
      }
    } catch {
      chatHistory = [];
    }
  }

  function saveStoredHistory() {
    try {
      // Keep up to 20 messages in session
      const trimmed = chatHistory.slice(-20);
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
    } catch (e) {
      console.warn('Could not save chat history:', e);
    }
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  /**
   * Safe lightweight markdown parser for chatbot responses
   */
  function formatMarkdown(text) {
    if (!text) return '';

    // First escape HTML to prevent XSS
    let escaped = escapeHtml(text);

    // Parse Markdown tables
    escaped = parseMarkdownTables(escaped);

    // Headers (###, ##, #)
    escaped = escaped.replace(/^### (.*$)/gim, '<h4 style="margin:6px 0;font-size:0.95rem;color:#93c5fd;">$1</h4>');
    escaped = escaped.replace(/^## (.*$)/gim, '<h3 style="margin:8px 0;font-size:1rem;color:#60a5fa;">$1</h3>');
    escaped = escaped.replace(/^# (.*$)/gim, '<h2 style="margin:10px 0;font-size:1.1rem;color:#3b82f6;">$1</h2>');

    // Bold (**text**)
    escaped = escaped.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

    // Italic (*text*)
    escaped = escaped.replace(/\*(.*?)\*/g, '<em>$1</em>');

    // Code `text`
    escaped = escaped.replace(/`([^`]+)`/g, '<code style="background:rgba(255,255,255,0.1);padding:2px 4px;border-radius:4px;font-size:0.8rem;">$1</code>');

    // Clickable Links [text](url)
    escaped = escaped.replace(/\[(.*?)\]\((.*?)\)/g, (match, title, url) => {
      // Clean url to only allow relative routes or http/https
      const safeUrl = (url.startsWith('/') || url.startsWith('http')) ? url : '#';
      return `<a href="${safeUrl}" target="${safeUrl.startsWith('http') ? '_blank' : '_self'}" rel="noopener">${title}</a>`;
    });

    // Unordered lists (- item or * item)
    escaped = escaped.replace(/(?:^|\n)[-*] (.*)/g, '<li>$1</li>');
    escaped = escaped.replace(/(<li>.*<\/li>)/gs, '<ul>$1</ul>');

    // Horizontal rule (---)
    escaped = escaped.replace(/\n---+\n/g, '<hr style="border:none;border-top:1px solid rgba(255,255,255,0.1);margin:8px 0;">');

    // Line breaks (preserving paragraphs)
    escaped = escaped.replace(/\n\n+/g, '</p><p>');
    escaped = escaped.replace(/\n/g, '<br>');

    return `<p>${escaped}</p>`;
  }

  function parseMarkdownTables(text) {
    const lines = text.split('\n');
    let inTable = false;
    let tableHtml = '';
    const outputLines = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line.startsWith('|') && line.endsWith('|')) {
        const cells = line.split('|').slice(1, -1).map(c => c.trim());
        // Check if it's separator line (e.g., |---|---|)
        if (cells.every(c => /^:?-+:?$/.test(c))) {
          continue; // Separator row
        }

        if (!inTable) {
          inTable = true;
          tableHtml = '<table><thead><tr>' + cells.map(c => `<th>${c}</th>`).join('') + '</tr></thead><tbody>';
        } else {
          tableHtml += '<tr>' + cells.map(c => `<td>${c}</td>`).join('') + '</tr>';
        }
      } else {
        if (inTable) {
          tableHtml += '</tbody></table>';
          outputLines.push(tableHtml);
          tableHtml = '';
          inTable = false;
        }
        outputLines.push(lines[i]);
      }
    }

    if (inTable) {
      tableHtml += '</tbody></table>';
      outputLines.push(tableHtml);
    }

    return outputLines.join('\n');
  }

})();
