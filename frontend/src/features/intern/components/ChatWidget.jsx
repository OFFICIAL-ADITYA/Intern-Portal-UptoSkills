import { useState, useRef, useEffect } from 'react';
import useChat from '../hooks/useChat';
import { ChatIcon, XIcon, RobotIcon } from '../../../shared/components/Icons';
import './ChatWidget.css';

const QUICK_SUGGESTIONS = [
  'How to request certificate?',
  'Track my request status',
  'How to verify QR code?',
  'Password setup help'
];

export default function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const { messages, isLoading, sendMessage } = useChat();
  const messagesContainerRef = useRef(null);
  const inputRef = useRef(null);

  // Auto-scroll messages to bottom
  useEffect(() => {
    if (isOpen && messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
      inputRef.current?.focus();
    }
  }, [messages, isOpen, isLoading]);

  const toggleChat = () => {
    setIsOpen((prev) => !prev);
  };

  const handleSend = () => {
    if (!input.trim() || isLoading) return;
    sendMessage(input);
    setInput('');
  };

  const handleSuggestionClick = (query) => {
    if (isLoading) return;
    sendMessage(query);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSend();
    }
    if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  return (
    <>
      {/* Floating Button */}
      <button
        id="chat-widget-button"
        type="button"
        onClick={toggleChat}
        aria-label={isOpen ? "Close Support Chatbot" : "Open Website Assistant"}
        title="Website Assistant"
        className={isOpen ? "chat-btn-active" : ""}
      >
        {isOpen ? <XIcon size={20} /> : <ChatIcon size={22} />}
        <span className="chat-btn-pulse" aria-hidden="true"></span>
      </button>

      {/* Floating Chat Box with Mobile Backdrop */}
      {isOpen && (
        <>
          <div className="chat-backdrop-mobile" onClick={toggleChat} aria-hidden="true" />
          
          <div id="chat-widget-box" role="dialog" aria-label="Support Chatbot">
            <div id="chat-header">
              <div className="chat-header-info">
                <div className="chat-avatar-ring">
                  <span className="chat-avatar-icon">
                    <RobotIcon size={18} />
                  </span>
                  <span className="chat-online-beacon" title="Online"></span>
                </div>
                <div>
                  <h4 className="chat-header-title">Website Assistant</h4>
                  <span className="chat-header-subtitle">UptoSkills • Instant Answers</span>
                </div>
              </div>
              <button
                type="button"
                className="chat-close-btn"
                onClick={toggleChat}
                aria-label="Close Chat"
              >
                <XIcon size={16} />
              </button>
            </div>

            <div id="chat-messages" ref={messagesContainerRef} role="log" aria-live="polite">
              {messages.map((m) => (
                <div
                  key={m.id}
                  className={`message ${m.sender === 'user' ? 'user-msg' : 'bot-msg'} ${m.loading ? 'loading-msg' : ''}`}
                >
                  {m.loading ? (
                    <div className="typing-indicator">
                      <span></span>
                      <span></span>
                      <span></span>
                    </div>
                  ) : (
                    m.text
                  )}
                </div>
              ))}

              {/* Quick suggestion chips (show when conversation is fresh) */}
              {messages.length <= 2 && !isLoading && (
                <div className="chat-suggestions-wrap">
                  <span className="chat-suggestions-label">Suggested questions:</span>
                  <div className="chat-suggestions-list">
                    {QUICK_SUGGESTIONS.map((suggestion, idx) => (
                      <button
                        key={idx}
                        type="button"
                        className="chat-chip-btn"
                        onClick={() => handleSuggestionClick(suggestion)}
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div id="chat-input-container">
              <input
                ref={inputRef}
                type="text"
                id="chat-input"
                placeholder="Ask about certificates, requests, settings..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={isLoading}
                aria-label="Type your message"
                maxLength={500}
              />
              <button
                id="chat-send"
                type="button"
                onClick={handleSend}
                disabled={!input.trim() || isLoading}
                aria-label="Send message"
              >
                Send
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );
}
