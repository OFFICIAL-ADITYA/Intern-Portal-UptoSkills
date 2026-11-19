import { useState, useEffect, useCallback, useRef } from 'react';
import {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
} from '../services/notification.service';

export const useNotifications = () => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [newNotificationToast, setNewNotificationToast] = useState(null);

  const prevCountRef = useRef(null);
  const stopPollingRef = useRef(null);

  // Fetch unread count and detect increase for Toast
  const checkUnreadCount = useCallback(async () => {
    try {
      const data = await getUnreadCount();
      const count = data.count || 0;

      if (prevCountRef.current !== null && count > prevCountRef.current) {
        const diff = count - prevCountRef.current;
        setNewNotificationToast(
          diff === 1 ? 'You have a new notification.' : `You have ${diff} new notifications.`
        );
      }
      prevCountRef.current = count;
      setUnreadCount(count);
    } catch (err) {
      // If unauthorized (user logged out), stop background polling
      if (err?.response?.status === 401 || err?.status === 401 || err?.statusCode === 401) {
        stopPollingRef.current?.();
      }
    }
  }, []);

  // Fetch full notification list
  const fetchList = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getNotifications({ limit: 30 });
      setNotifications(data.notifications || []);
      if (typeof data.unreadCount === 'number') {
        setUnreadCount(data.unreadCount);
        prevCountRef.current = data.unreadCount;
      }
    } catch (err) {
      setError(err.message || 'Failed to load notifications.');
    } finally {
      setLoading(false);
    }
  }, []);

  // Mark single notification as read
  const handleMarkOne = async (id) => {
    try {
      await markAsRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n._id === id ? { ...n, isRead: true, readAt: new Date() } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
      if (prevCountRef.current !== null) {
        prevCountRef.current = Math.max(0, prevCountRef.current - 1);
      }
    } catch (err) {
      console.error('Failed to mark notification as read:', err);
    }
  };

  // Mark all notifications as read
  const handleMarkAll = async () => {
    try {
      await markAllAsRead();
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, isRead: true, readAt: new Date() }))
      );
      setUnreadCount(0);
      prevCountRef.current = 0;
    } catch (err) {
      console.error('Failed to mark all as read:', err);
    }
  };

  // Initial fetch and 30s polling, paused while tab is hidden
  useEffect(() => {
    checkUnreadCount();

    let intervalId = null;

    const startPolling = () => {
      if (!intervalId) {
        intervalId = setInterval(() => {
          if (document.visibilityState === 'visible') {
            checkUnreadCount();
          }
        }, 30000); // 30 seconds
      }
    };

    const stopPolling = () => {
      if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
      }
    };

    stopPollingRef.current = stopPolling;

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkUnreadCount();
        startPolling();
      } else {
        stopPolling();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    startPolling();

    return () => {
      stopPolling();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [checkUnreadCount]);

  return {
    notifications,
    unreadCount,
    loading,
    error,
    newNotificationToast,
    clearToast: () => setNewNotificationToast(null),
    fetchNotifications: fetchList,
    checkUnreadCount,
    markAsRead: handleMarkOne,
    markAllAsRead: handleMarkAll,
  };
};

export default useNotifications;
