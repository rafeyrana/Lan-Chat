// Jest setup for DOM and timers
import '@testing-library/jest-dom';

// Ensure we start in test env (ts module checks this)
process.env.NODE_ENV = process.env.NODE_ENV || 'test';

// Minimal HTML skeleton to satisfy querySelectors when modules are imported
beforeEach(() => {
  document.body.innerHTML = `
    <div class="app">
      <header class="header">
        <div id="connection-status" class="connection-status">
          <span class="status-dot"></span>
          <span class="status-text">Connecting...</span>
        </div>
        <button id="theme-toggle"><span class="theme-icon">🌙</span></button>
      </header>
      <main>
        <div id="messages" class="messages">
          <div class="welcome-message"></div>
        </div>
        <div id="typing-indicator" class="typing-indicator"></div>
      </main>
      <footer>
        <form id="chat-form">
          <input id="msg-input" />
          <span id="char-count">0/500</span>
          <button id="send-button" type="submit"></button>
        </form>
      </footer>
      <div id="loading-overlay" class="hidden"></div>
    </div>
  `;
});
