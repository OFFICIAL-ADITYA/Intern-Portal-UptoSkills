import axios from 'axios';
import { API_BASE_URL } from '../../../shared/config/api';

const CHATBOT_FASTAPI_URL = import.meta.env.VITE_CHATBOT_URL || 'http://localhost:8000/api/chat';

/**
 * Sends user question to the Web Support Chatbot service (FastAPI on port 8000),
 * with graceful fallback to portal backend /api/intern/chat.
 *
 * @param {string} question - Question query from the user
 * @returns {Promise<{ answer: string }>}
 */
export const sendChatMessage = async (question) => {
  const cleanQuestion = (question || '').trim();
  if (!cleanQuestion) {
    throw new Error('A non-empty question is required.');
  }

  // 1. Try direct connection to Web_Support_Chatbot FastAPI service (port 8000)
  try {
    const response = await axios.post(
      CHATBOT_FASTAPI_URL,
      { question: cleanQuestion },
      {
        timeout: 6000,
        headers: { 'Content-Type': 'application/json' }
      }
    );

    if (response.data && (response.data.answer || response.data.reply)) {
      return { answer: response.data.answer || response.data.reply };
    }
  } catch (fastApiErr) {
    // If FastAPI service is not running or network fails, gracefully fall back to portal backend
  }

  // 2. Fallback to portal backend /api/intern/chat
  try {
    const response = await axios.post(
      `${API_BASE_URL}/api/intern/chat`,
      { question: cleanQuestion, message: cleanQuestion },
      {
        timeout: 8000,
        withCredentials: true,
        headers: { 'Content-Type': 'application/json' }
      }
    );

    return {
      answer: response.data?.answer || response.data?.reply || response.data?.message || 'How can I assist you today?'
    };
  } catch (backendErr) {
    throw new Error('Error: Unable to connect to backend.');
  }
};

export default { sendChatMessage };
