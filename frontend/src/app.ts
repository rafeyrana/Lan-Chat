// ========================================
// Configuration and State Management (TypeScript)
// ========================================
const API: string = "http://localhost:3001";
const REFRESH_INTERVAL: number = 2000;
const TYPING_TIMEOUT: number = 3000;
const MAX_MESSAGE_LENGTH: number = 500;

// Extend window for our interval handle
declare global {
  interface Window {
    refreshInterval?: number;
  }
}

// Global state
interface AppState {
  isConnected: boolean;
  lastMessageCount: number;
  typingTimer: number | null;
  isTyping: boolean;
  currentTheme: string;
  username: string;
  hasFirstMessage: boolean;
}

const appState: AppState = {
  isConnected: false,
  lastMessageCount: 0,
  typingTimer: null,
  isTyping: false,
  currentTheme: localStorage.getItem("theme") || "dark",
  username: "You",
  hasFirstMessage: false,
};

// DOM elements
const elements = {
  app: document.querySelector(".app") as HTMLDivElement,
  messagesDiv: document.getElementById("messages") as HTMLDivElement,
  form: document.getElementById("chat-form") as HTMLFormElement,
  input: document.getElementById("msg-input") as HTMLInputElement,
  sendButton: document.getElementById("send-button") as HTMLButtonElement,
  themeToggle: document.getElementById("theme-toggle") as HTMLButtonElement,
  connectionStatus: document.getElementById("connection-status") as HTMLDivElement,
  typingIndicator: document.getElementById("typing-indicator") as HTMLDivElement,
  charCount: document.getElementById("char-count") as HTMLSpanElement,
  loadingOverlay: document.getElementById("loading-overlay") as HTMLDivElement,
  welcomeMessage: document.querySelector(".welcome-message") as HTMLDivElement | null,
};

export function bindElements(): void {
  elements.app = document.querySelector(".app") as HTMLDivElement;
  elements.messagesDiv = document.getElementById("messages") as HTMLDivElement;
  elements.form = document.getElementById("chat-form") as HTMLFormElement;
  elements.input = document.getElementById("msg-input") as HTMLInputElement;
  elements.sendButton = document.getElementById("send-button") as HTMLButtonElement;
  elements.themeToggle = document.getElementById("theme-toggle") as HTMLButtonElement;
  elements.connectionStatus = document.getElementById("connection-status") as HTMLDivElement;
  elements.typingIndicator = document.getElementById("typing-indicator") as HTMLDivElement;
  elements.charCount = document.getElementById("char-count") as HTMLSpanElement;
  elements.loadingOverlay = document.getElementById("loading-overlay") as HTMLDivElement;
  elements.welcomeMessage = document.querySelector(".welcome-message") as HTMLDivElement | null;
}

// ========================================
// Utility Functions
// ========================================

// Debounce function for performance optimization
export function debounce<F extends (...args: any[]) => void>(func: F, wait: number) {
  let timeout: number | undefined;
  return function executedFunction(this: unknown, ...args: Parameters<F>) {
    const later = () => {
      if (timeout !== undefined) {
        window.clearTimeout(timeout);
      }
      func.apply(this, args);
    };
    if (timeout !== undefined) {
      window.clearTimeout(timeout);
    }
    timeout = window.setTimeout(later, wait);
  };
}

// Format timestamp for messages
export function formatTime(date: Date = new Date()): string {
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

// Parse username from message (assumes format "username: message")
export interface ParsedMessage {
  sender: string;
  message: string;
  time: string;
}

export function parseMessage(msg: string): ParsedMessage {
  const colonIndex = msg.indexOf(": ");
  if (colonIndex !== -1) {
    return {
      sender: msg.substring(0, colonIndex),
      message: msg.substring(colonIndex + 2),
      time: formatTime(),
    };
  }
  return {
    sender: "Unknown",
    message: msg,
    time: formatTime(),
  };
}

// Smooth scroll to bottom of messages
export function scrollToBottom(smooth: boolean = true): void {
  const behavior: ScrollBehavior = smooth ? "smooth" : "auto";
  elements.messagesDiv.scrollTo({
    top: elements.messagesDiv.scrollHeight,
    behavior,
  });
}

// Update connection status
export function updateConnectionStatus(connected: boolean): void {
  appState.isConnected = connected;
  const statusDot = elements.connectionStatus.querySelector(".status-dot") as HTMLSpanElement | null;
  const statusText = elements.connectionStatus.querySelector(".status-text") as HTMLSpanElement | null;

  if (!statusDot || !statusText) return;

  if (connected) {
    statusDot.classList.add("connected");
    statusText.textContent = "Connected";
  } else {
    statusDot.classList.remove("connected");
    statusText.textContent = "Connecting...";
  }
}

// Show/hide loading overlay
export function toggleLoading(show: boolean): void {
  if (show) {
    elements.loadingOverlay.classList.remove("hidden");
  } else {
    elements.loadingOverlay.classList.add("hidden");
  }
}

// ========================================
// Theme Management
// ========================================

export function initTheme(): void {
  document.documentElement.setAttribute("data-theme", appState.currentTheme);
  updateThemeToggle();
}

export function toggleTheme(): void {
  appState.currentTheme = appState.currentTheme === "dark" ? "light" : "dark";
  document.documentElement.setAttribute("data-theme", appState.currentTheme);
  localStorage.setItem("theme", appState.currentTheme);
  updateThemeToggle();

  elements.themeToggle.style.transform = "scale(0.9)";
  window.setTimeout(() => {
    elements.themeToggle.style.transform = "";
  }, 150);
}

export function updateThemeToggle(): void {
  const themeIcon = elements.themeToggle.querySelector(".theme-icon") as HTMLSpanElement | null;
  if (themeIcon) {
    themeIcon.textContent = appState.currentTheme === "dark" ? "☀️" : "🌙";
  }
}

// ========================================
// Message Management
// ========================================

export function hideWelcomeMessage(): void {
  if (elements.welcomeMessage && !appState.hasFirstMessage) {
    elements.welcomeMessage.style.opacity = "0";
    elements.welcomeMessage.style.transform = "translateY(-20px)";
    window.setTimeout(() => {
      if (elements.welcomeMessage) {
        elements.welcomeMessage.remove();
      }
    }, 300);
    appState.hasFirstMessage = true;
  }
}

export function createMessageElement(messageData: ParsedMessage): HTMLDivElement {
  const { sender, message, time } = messageData;
  const isOwnMessage = sender === appState.username;

  const msgDiv = document.createElement("div");
  msgDiv.className = `msg ${isOwnMessage ? "own" : "other"}`;

  const bubble = document.createElement("div");
  bubble.className = "message-bubble";
  bubble.textContent = message;

  const info = document.createElement("div");
  info.className = "message-info";

  const senderSpan = document.createElement("span");
  senderSpan.className = "message-sender";
  senderSpan.textContent = sender;

  const timeSpan = document.createElement("span");
  timeSpan.className = "message-time";
  timeSpan.textContent = time;

  if (!isOwnMessage) {
    info.appendChild(senderSpan);
    info.appendChild(timeSpan);
  } else {
    info.appendChild(timeSpan);
  }

  msgDiv.appendChild(bubble);
  msgDiv.appendChild(info);

  return msgDiv as HTMLDivElement;
}

export function appendMessage(msg: string, isOwn: boolean = false): void {
  hideWelcomeMessage();

  const messageData = isOwn
    ? { sender: appState.username, message: msg, time: formatTime() }
    : parseMessage(msg);

  const msgElement = createMessageElement(messageData);

  msgElement.style.opacity = "0";
  msgElement.style.transform = "translateY(20px)";
  elements.messagesDiv.appendChild(msgElement);

  requestAnimationFrame(() => {
    msgElement.style.opacity = "1";
    msgElement.style.transform = "translateY(0)";
    msgElement.style.transition = "all 0.3s ease-out";
  });

  window.setTimeout(() => scrollToBottom(true), 100);

  playMessageSound(isOwn);
}

export function playMessageSound(isOwn: boolean): void {
  try {
    const AnyWindow = window as any;
    const AudioContextClass = (window as any).AudioContext || AnyWindow.webkitAudioContext;
    if (!AudioContextClass) return;
    const audioContext = new AudioContextClass();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.frequency.setValueAtTime(isOwn ? 800 : 600, audioContext.currentTime);
    oscillator.type = "sine";

    gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
    // @ts-expect-error: exponentialRampToValueAtTime accepts numbers; TS lib types OK
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.1);
  } catch {
    // ignore
  }
}

// ========================================
// API Communication
// ========================================

export async function refreshMessages(): Promise<void> {
  try {
    const res = await fetch(`${API}/messages`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const data: string[] = await res.json();
    updateConnectionStatus(true);

    if (data.length !== appState.lastMessageCount) {
      const existingMessages = elements.messagesDiv.querySelectorAll(".msg");
      existingMessages.forEach((msg) => msg.remove());

      data.forEach((msg) => appendMessage(msg, false));
      appState.lastMessageCount = data.length;
    }
  } catch (error) {
    console.error("Failed to refresh messages:", error);
    updateConnectionStatus(false);
  }
}

export async function sendMessage(message: string): Promise<void> {
  try {
    elements.sendButton.disabled = true;
    elements.sendButton.innerHTML = '<span class="send-icon">⏳</span><span class="send-text">Sending...</span>';

    const res = await fetch(`${API}/send`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message }),
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    appendMessage(message, true);
  } catch (error) {
    console.error("Failed to send message:", error);
    showErrorMessage("Failed to send message. Please try again.");
  } finally {
    elements.sendButton.disabled = false;
    elements.sendButton.innerHTML = '<span class="send-icon">📤</span><span class="send-text">Send</span>';
  }
}

export function showErrorMessage(message: string): void {
  const errorDiv = document.createElement("div");
  errorDiv.className = "error-message";
  errorDiv.style.cssText = `
        background: #dc3545;
        color: white;
        padding: 0.75rem 1rem;
        border-radius: 8px;
        margin: 0.5rem;
        animation: slideInUp 0.3s ease-out;
        text-align: center;
        font-weight: 500;
    `;
  errorDiv.textContent = message;

  elements.messagesDiv.appendChild(errorDiv);
  scrollToBottom(true);

  window.setTimeout(() => {
    errorDiv.style.opacity = "0";
    window.setTimeout(() => errorDiv.remove(), 300);
  }, 5000);
}

// ========================================
// Typing Indicators
// ========================================

export function showTypingIndicator(): void {
  elements.typingIndicator.classList.add("show");
  scrollToBottom(true);
}

export function hideTypingIndicator(): void {
  elements.typingIndicator.classList.remove("show");
}

export function handleTypingIndicator(): void {
  if (!appState.isTyping && elements.input.value.length > 0) {
    appState.isTyping = true;
  }

  if (appState.typingTimer) {
    window.clearTimeout(appState.typingTimer);
  }
  appState.typingTimer = window.setTimeout(() => {
    appState.isTyping = false;
  }, TYPING_TIMEOUT);
}

// ========================================
// Input Handling
// ========================================

export function updateCharCount(): void {
  const count = elements.input.value.length;
  elements.charCount.textContent = `${count}/${MAX_MESSAGE_LENGTH}`;

  const isEmpty = count === 0;
  const isTooLong = count > MAX_MESSAGE_LENGTH;

  elements.sendButton.disabled = isEmpty || isTooLong;

  if (isTooLong) {
    elements.charCount.style.color = "#dc3545";
  } else if (count > MAX_MESSAGE_LENGTH * 0.8) {
    elements.charCount.style.color = "#ffc107";
  } else {
    elements.charCount.style.color = "var(--text-muted)";
  }
}

export function handleFormSubmit(e: SubmitEvent): void {
  e.preventDefault();

  const message = elements.input.value.trim();
  if (!message || message.length > MAX_MESSAGE_LENGTH) return;

  elements.input.value = "";
  updateCharCount();

  void sendMessage(message);

  if (appState.typingTimer) {
    window.clearTimeout(appState.typingTimer);
  }
  appState.isTyping = false;
}

// ========================================
// Event Listeners
// ========================================

export function initEventListeners(): void {
  elements.form.addEventListener("submit", handleFormSubmit);

  elements.themeToggle.addEventListener("click", toggleTheme);

  elements.input.addEventListener(
    "input",
    debounce(() => {
      updateCharCount();
      handleTypingIndicator();
    }, 100)
  );

  elements.input.addEventListener("keydown", (e: KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleFormSubmit(e as unknown as SubmitEvent);
    }
  });

  elements.input.addEventListener("input", () => {
    elements.input.style.height = "auto";
    elements.input.style.height = Math.min(elements.input.scrollHeight, 120) + "px";
  });

  window.setTimeout(() => elements.input.focus(), 500);

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      if (window.refreshInterval) {
        window.clearInterval(window.refreshInterval);
      }
    } else {
      initRefreshInterval();
      void refreshMessages();
    }
  });
}

// ========================================
// Initialization
// ========================================

export function initRefreshInterval(): void {
  if (window.refreshInterval) {
    window.clearInterval(window.refreshInterval);
  }
  window.refreshInterval = window.setInterval(refreshMessages, REFRESH_INTERVAL);
}

export async function initApp(): Promise<void> {
  try {
    bindElements();
    toggleLoading(true);

    initTheme();

    initEventListeners();

    updateCharCount();
    updateConnectionStatus(false);

    await refreshMessages();
    initRefreshInterval();

    window.setTimeout(() => toggleLoading(false), 1000);

    // eslint-disable-next-line no-console
    console.log("🚀 LAN-Chat initialized successfully");
  } catch (error) {
    console.error("Failed to initialize app:", error);
    toggleLoading(false);
    showErrorMessage("Failed to connect to chat server");
  }
}

// ========================================
// App Startup
// ========================================

// Auto-start only outside of test environment
const isTestEnvironment = typeof process !== "undefined" && process.env && process.env.NODE_ENV === "test";
if (!isTestEnvironment) {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => void initApp());
  } else {
    void initApp();
  }

  window.addEventListener("beforeunload", () => {
    if (window.refreshInterval) {
      window.clearInterval(window.refreshInterval);
    }
    if (appState.typingTimer) {
      window.clearTimeout(appState.typingTimer);
    }
  });
}
