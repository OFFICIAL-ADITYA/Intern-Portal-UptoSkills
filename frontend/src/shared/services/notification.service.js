import axios from 'axios';
import { API_BASE_URL } from '../config/api';

const notificationApi = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

export const getNotifications = async ({ unread, page = 1, limit = 20 } = {}) => {
  try {
    const params = new URLSearchParams();
    if (unread !== undefined && unread !== null) params.append('unread', String(unread));
    if (page) params.append('page', String(page));
    if (limit) params.append('limit', String(limit));

    const response = await notificationApi.get(`/api/notifications?${params.toString()}`);
    return response.data;
  } catch (error) {
    throw error.response?.data || error;
  }
};

export const getUnreadCount = async () => {
  try {
    const response = await notificationApi.get('/api/notifications/unread-count');
    return response.data;
  } catch (error) {
    throw error.response?.data || error;
  }
};

export const markAsRead = async (id) => {
  try {
    const response = await notificationApi.patch(`/api/notifications/${id}/read`);
    return response.data;
  } catch (error) {
    throw error.response?.data || error;
  }
};

export const markAllAsRead = async () => {
  try {
    const response = await notificationApi.patch('/api/notifications/read-all');
    return response.data;
  } catch (error) {
    throw error.response?.data || error;
  }
};

export default {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
};
