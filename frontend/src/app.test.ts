import {
  debounce,
  formatTime,
  parseMessage,
  createMessageElement,
  updateCharCount,
  updateConnectionStatus,
  toggleTheme,
  bindElements,
  initTheme,
} from './app';

jest.useFakeTimers();

function getElements() {
  const input = document.getElementById('msg-input') as HTMLInputElement;
  const charCount = document.getElementById('char-count') as HTMLSpanElement;
  const sendButton = document.getElementById('send-button') as HTMLButtonElement;
  const statusDot = document.querySelector('#connection-status .status-dot') as HTMLSpanElement;
  const statusText = document.querySelector('#connection-status .status-text') as HTMLSpanElement;
  const themeIcon = document.querySelector('#theme-toggle .theme-icon') as HTMLSpanElement;
  return { input, charCount, sendButton, statusDot, statusText, themeIcon };
}

describe('utilities', () => {
  test('parseMessage splits sender and message', () => {
    const { sender, message } = parseMessage('Alice: Hello there');
    expect(sender).toBe('Alice');
    expect(message).toBe('Hello there');
  });

  test('parseMessage falls back when no colon', () => {
    const result = parseMessage('No colon string');
    expect(result.sender).toBe('Unknown');
    expect(result.message).toBe('No colon string');
  });

  test('debounce delays execution and coalesces calls', () => {
    const fn = jest.fn();
    const debounced = debounce(fn, 200);
    debounced();
    debounced();
    expect(fn).not.toHaveBeenCalled();
    jest.advanceTimersByTime(199);
    expect(fn).not.toHaveBeenCalled();
    jest.advanceTimersByTime(1);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  test('formatTime returns HH:MM-like output', () => {
    const date = new Date('2020-01-01T12:34:00');
    const str = formatTime(date);
    expect(str).toMatch(/\d{1,2}:\d{2}/);
  });
});

describe('DOM interactions', () => {
  test('createMessageElement for own message hides sender', () => {
    const el = createMessageElement({ sender: 'You', message: 'Hi', time: '12:00' });
    expect(el.className).toMatch(/msg/);
    expect(el.querySelector('.message-bubble')!.textContent).toBe('Hi');
    const info = el.querySelector('.message-info')!;
    const sender = info.querySelector('.message-sender');
    const time = info.querySelector('.message-time');
    expect(sender).toBeNull();
    expect(time).not.toBeNull();
  });

  test('createMessageElement for other message shows sender and time', () => {
    const el = createMessageElement({ sender: 'Bob', message: 'Yo', time: '09:41' });
    const info = el.querySelector('.message-info')!;
    expect(info.querySelector('.message-sender')!.textContent).toBe('Bob');
    expect(info.querySelector('.message-time')!.textContent).toBe('09:41');
  });

  test('updateCharCount updates text, button state and colors', () => {
    bindElements();
    const { input, charCount, sendButton } = getElements();
    input.value = '';
    updateCharCount();
    expect(charCount.textContent).toBe('0/500');
    expect(sendButton.disabled).toBe(true);

    input.value = 'a'.repeat(450);
    updateCharCount();
    expect(charCount.textContent).toBe('450/500');
    expect(sendButton.disabled).toBe(false);

    input.value = 'a'.repeat(501);
    updateCharCount();
    expect(charCount.textContent).toBe('501/500');
    expect(sendButton.disabled).toBe(true);
  });

  test('updateConnectionStatus toggles classes and text', () => {
    bindElements();
    const { statusDot, statusText } = getElements();
    updateConnectionStatus(true);
    expect(statusDot.classList.contains('connected')).toBe(true);
    expect(statusText.textContent).toBe('Connected');
    updateConnectionStatus(false);
    expect(statusDot.classList.contains('connected')).toBe(false);
    expect(statusText.textContent).toBe('Connecting...');
  });

  test('toggleTheme flips theme icon', () => {
    bindElements();
    const { themeIcon } = getElements();
    initTheme();
    const initial = themeIcon.textContent;
    toggleTheme();
    expect(themeIcon.textContent).not.toBe(initial);
  });
});
