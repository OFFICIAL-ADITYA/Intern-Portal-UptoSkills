import { useState, useCallback } from 'react';
import { sendChatMessage } from '../services/chat.service';

export const useChat = () => {
  const [messages, setMessages] = useState([
    {
      id: 'welcome',
      sender: 'bot',
      text: 'Hello! How can i help you?.',
      timestamp: new Date().toISOString()
    }
  ]);
  const [isLoading, setIsLoading] = useState(false);

  const sendMessage = useCallback(async (text) => {
    if (!text || !text.trim() || isLoading) return;

    const trimmed = text.trim();
    const userMsgId = `user-${Date.now()}`;
    const botLoadingId = `loading-${Date.now()}`;

    // Add user message and "Thinking..." loading placeholder
    setMessages((prev) => [
      ...prev,
      { id: userMsgId, sender: 'user', text: trimmed, timestamp: new Date().toISOString() },
      { id: botLoadingId, sender: 'bot', text: 'Thinking...', loading: true, timestamp: new Date().toISOString() }
    ]);
    setIsLoading(true);

    try {
      const data = await sendChatMessage(trimmed);
      setMessages((prev) =>
        prev.map((m) =>
          m.id === botLoadingId
            ? { ...m, text: data.answer || 'Thank you for your message.', loading: false }
            : m
        )
      );
    } catch (err) {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === botLoadingId
            ? { ...m, text: 'Error: Unable to connect to backend.', loading: false, isError: true }
            : m
        )
      );
    } finally {
      setIsLoading(false);
    }
  }, [isLoading]);

  const clearMessages = useCallback(() => {
    setMessages([
      {
        id: 'welcome',
        sender: 'bot',
        text: 'Hello! How can i help you?.',
        timestamp: new Date().toISOString()
      }
    ]);
  }, []);

  return {
    messages,
    isLoading,
    sendMessage,
    clearMessages
  };
};

export default useChat;
