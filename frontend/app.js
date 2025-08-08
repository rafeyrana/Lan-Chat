// ========================================
// Configuration and State Management
// ========================================
const API = "http://localhost:3001";
const REFRESH_INTERVAL = 2000;
const TYPING_TIMEOUT = 3000;
const MAX_MESSAGE_LENGTH = 500;

// Global state
let appState = {
    isConnected: false,
    lastMessageCount: 0,
    typingTimer: null,
    isTyping: false,
    currentTheme: localStorage.getItem('theme') || 'dark',
    username: 'You',
    hasFirstMessage: false
};

// DOM elements
const elements = {
    app: document.querySelector('.app'),
    messagesDiv: document.getElementById("messages"),
    form: document.getElementById("chat-form"),
    input: document.getElementById("msg-input"),
    sendButton: document.getElementById("send-button"),
    themeToggle: document.getElementById("theme-toggle"),
    connectionStatus: document.getElementById("connection-status"),
    typingIndicator: document.getElementById("typing-indicator"),
    charCount: document.getElementById("char-count"),
    loadingOverlay: document.getElementById("loading-overlay"),
    welcomeMessage: document.querySelector(".welcome-message")
};

// ========================================
// Utility Functions
// ========================================

// Debounce function for performance optimization
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Format timestamp for messages
function formatTime(date = new Date()) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// Parse username from message (assumes format "username: message")
function parseMessage(msg) {
    const colonIndex = msg.indexOf(': ');
    if (colonIndex !== -1) {
        return {
            sender: msg.substring(0, colonIndex),
            message: msg.substring(colonIndex + 2),
            time: formatTime()
        };
    }
    return {
        sender: 'Unknown',
        message: msg,
        time: formatTime()
    };
}

// Smooth scroll to bottom of messages
function scrollToBottom(smooth = true) {
    const behavior = smooth ? 'smooth' : 'auto';
    elements.messagesDiv.scrollTo({
        top: elements.messagesDiv.scrollHeight,
        behavior: behavior
    });
}

// Update connection status
function updateConnectionStatus(connected) {
    appState.isConnected = connected;
    const statusDot = elements.connectionStatus.querySelector('.status-dot');
    const statusText = elements.connectionStatus.querySelector('.status-text');
    
    if (connected) {
        statusDot.classList.add('connected');
        statusText.textContent = 'Connected';
    } else {
        statusDot.classList.remove('connected');
        statusText.textContent = 'Connecting...';
    }
}

// Show/hide loading overlay
function toggleLoading(show) {
    if (show) {
        elements.loadingOverlay.classList.remove('hidden');
    } else {
        elements.loadingOverlay.classList.add('hidden');
    }
}

// ========================================
// Theme Management
// ========================================

function initTheme() {
    // Set initial theme
    document.documentElement.setAttribute('data-theme', appState.currentTheme);
    updateThemeToggle();
}

function toggleTheme() {
    appState.currentTheme = appState.currentTheme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', appState.currentTheme);
    localStorage.setItem('theme', appState.currentTheme);
    updateThemeToggle();
    
    // Add visual feedback
    elements.themeToggle.style.transform = 'scale(0.9)';
    setTimeout(() => {
        elements.themeToggle.style.transform = '';
    }, 150);
}

function updateThemeToggle() {
    const themeIcon = elements.themeToggle.querySelector('.theme-icon');
    themeIcon.textContent = appState.currentTheme === 'dark' ? '☀️' : '🌙';
}

// ========================================
// Message Management
// ========================================

function hideWelcomeMessage() {
    if (elements.welcomeMessage && !appState.hasFirstMessage) {
        elements.welcomeMessage.style.opacity = '0';
        elements.welcomeMessage.style.transform = 'translateY(-20px)';
        setTimeout(() => {
            if (elements.welcomeMessage) {
                elements.welcomeMessage.remove();
            }
        }, 300);
        appState.hasFirstMessage = true;
    }
}

function createMessageElement(messageData) {
    const { sender, message, time } = messageData;
    const isOwnMessage = sender === appState.username;
    
    // Create message container
    const msgDiv = document.createElement("div");
    msgDiv.className = `msg ${isOwnMessage ? 'own' : 'other'}`;
    
    // Create message bubble
    const bubble = document.createElement("div");
    bubble.className = "message-bubble";
    bubble.textContent = message;
    
    // Create message info
    const info = document.createElement("div");
    info.className = "message-info";
    
    const senderSpan = document.createElement("span");
    senderSpan.className = "message-sender";
    senderSpan.textContent = sender;
    
    const timeSpan = document.createElement("span");
    timeSpan.className = "message-time";
    timeSpan.textContent = time;
    
    // Build structure
    if (!isOwnMessage) {
        info.appendChild(senderSpan);
        info.appendChild(timeSpan);
    } else {
        info.appendChild(timeSpan);
    }
    
    msgDiv.appendChild(bubble);
    msgDiv.appendChild(info);
    
    return msgDiv;
}

function appendMessage(msg, isOwn = false) {
    hideWelcomeMessage();
    
    const messageData = isOwn ? 
        { sender: appState.username, message: msg, time: formatTime() } :
        parseMessage(msg);
    
    const msgElement = createMessageElement(messageData);
    
    // Add with animation
    msgElement.style.opacity = '0';
    msgElement.style.transform = 'translateY(20px)';
    elements.messagesDiv.appendChild(msgElement);
    
    // Trigger animation
    requestAnimationFrame(() => {
        msgElement.style.opacity = '1';
        msgElement.style.transform = 'translateY(0)';
        msgElement.style.transition = 'all 0.3s ease-out';
    });
    
    // Auto scroll to bottom
    setTimeout(() => scrollToBottom(true), 100);
    
    // Add sound effect (optional - could be enhanced)
    playMessageSound(isOwn);
}

function playMessageSound(isOwn) {
    // Simple audio feedback using Web Audio API
    try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        // Different frequencies for own vs other messages
        oscillator.frequency.setValueAtTime(isOwn ? 800 : 600, audioContext.currentTime);
        oscillator.type = 'sine';
        
        gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.1);
    } catch (e) {
        // Audio not supported or blocked, fail silently
    }
}

// ========================================
// API Communication
// ========================================

async function refreshMessages() {
    try {
        const res = await fetch(`${API}/messages`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        
        const data = await res.json();
        updateConnectionStatus(true);
        
        // Only update if message count changed
        if (data.length !== appState.lastMessageCount) {
            // Clear existing messages except welcome
            const existingMessages = elements.messagesDiv.querySelectorAll('.msg');
            existingMessages.forEach(msg => msg.remove());
            
            // Add all messages
            data.forEach(msg => appendMessage(msg, false));
            appState.lastMessageCount = data.length;
        }
        
    } catch (error) {
        console.error('Failed to refresh messages:', error);
        updateConnectionStatus(false);
    }
}

async function sendMessage(message) {
    try {
        elements.sendButton.disabled = true;
        elements.sendButton.innerHTML = '<span class="send-icon">⏳</span><span class="send-text">Sending...</span>';
        
        const res = await fetch(`${API}/send`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ message })
        });
        
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        
        // Show own message immediately for better UX
        appendMessage(message, true);
        
    } catch (error) {
        console.error('Failed to send message:', error);
        // Show error feedback
        showErrorMessage('Failed to send message. Please try again.');
    } finally {
        elements.sendButton.disabled = false;
        elements.sendButton.innerHTML = '<span class="send-icon">📤</span><span class="send-text">Send</span>';
    }
}

function showErrorMessage(message) {
    // Create temporary error message
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
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
    
    // Remove after 5 seconds
    setTimeout(() => {
        errorDiv.style.opacity = '0';
        setTimeout(() => errorDiv.remove(), 300);
    }, 5000);
}

// ========================================
// Typing Indicators
// ========================================

function showTypingIndicator() {
    elements.typingIndicator.classList.add('show');
    scrollToBottom(true);
}

function hideTypingIndicator() {
    elements.typingIndicator.classList.remove('show');
}

// Simulated typing detection (in real app, this would come from server)
function handleTypingIndicator() {
    if (!appState.isTyping && elements.input.value.length > 0) {
        appState.isTyping = true;
        // In real implementation, send typing status to server
    }
    
    clearTimeout(appState.typingTimer);
    appState.typingTimer = setTimeout(() => {
        appState.isTyping = false;
        // In real implementation, send stop typing to server
    }, TYPING_TIMEOUT);
}

// ========================================
// Input Handling
// ========================================

function updateCharCount() {
    const count = elements.input.value.length;
    elements.charCount.textContent = `${count}/${MAX_MESSAGE_LENGTH}`;
    
    // Update send button state
    const isEmpty = count === 0;
    const isTooLong = count > MAX_MESSAGE_LENGTH;
    
    elements.sendButton.disabled = isEmpty || isTooLong;
    
    // Color code character count
    if (isTooLong) {
        elements.charCount.style.color = '#dc3545';
    } else if (count > MAX_MESSAGE_LENGTH * 0.8) {
        elements.charCount.style.color = '#ffc107';
    } else {
        elements.charCount.style.color = 'var(--text-muted)';
    }
}

function handleFormSubmit(e) {
    e.preventDefault();
    
    const message = elements.input.value.trim();
    if (!message || message.length > MAX_MESSAGE_LENGTH) return;
    
    // Clear input
    elements.input.value = "";
    updateCharCount();
    
    // Send message
    sendMessage(message);
    
    // Clear typing state
    clearTimeout(appState.typingTimer);
    appState.isTyping = false;
}

// ========================================
// Event Listeners
// ========================================

function initEventListeners() {
    // Form submission
    elements.form.addEventListener("submit", handleFormSubmit);
    
    // Theme toggle
    elements.themeToggle.addEventListener("click", toggleTheme);
    
    // Input events
    elements.input.addEventListener("input", debounce(() => {
        updateCharCount();
        handleTypingIndicator();
    }, 100));
    
    // Keyboard shortcuts
    elements.input.addEventListener("keydown", (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleFormSubmit(e);
        }
    });
    
    // Auto-resize input (if needed)
    elements.input.addEventListener("input", () => {
        elements.input.style.height = 'auto';
        elements.input.style.height = Math.min(elements.input.scrollHeight, 120) + 'px';
    });
    
    // Focus input on page load
    setTimeout(() => elements.input.focus(), 500);
    
    // Handle visibility change for better performance
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            // Reduce refresh frequency when tab is not visible
            clearInterval(window.refreshInterval);
        } else {
            // Resume normal refresh when tab becomes visible
            initRefreshInterval();
            refreshMessages(); // Immediate refresh
        }
    });
}

// ========================================
// Initialization
// ========================================

function initRefreshInterval() {
    // Clear existing interval
    if (window.refreshInterval) {
        clearInterval(window.refreshInterval);
    }
    
    // Set new interval
    window.refreshInterval = setInterval(refreshMessages, REFRESH_INTERVAL);
}

async function initApp() {
    try {
        // Show loading
        toggleLoading(true);
        
        // Initialize theme
        initTheme();
        
        // Initialize event listeners
        initEventListeners();
        
        // Initial setup
        updateCharCount();
        updateConnectionStatus(false);
        
        // Start message refresh
        await refreshMessages();
        initRefreshInterval();
        
        // Hide loading
        setTimeout(() => toggleLoading(false), 1000);
        
        console.log('🚀 LAN-Chat initialized successfully');
        
    } catch (error) {
        console.error('Failed to initialize app:', error);
        toggleLoading(false);
        showErrorMessage('Failed to connect to chat server');
    }
}

// ========================================
// App Startup
// ========================================

// Start app when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();
}

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    if (window.refreshInterval) {
        clearInterval(window.refreshInterval);
    }
    if (appState.typingTimer) {
        clearTimeout(appState.typingTimer);
    }
}); 