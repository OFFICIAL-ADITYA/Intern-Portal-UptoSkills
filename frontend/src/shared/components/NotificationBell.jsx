import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useNotifications from '../hooks/useNotifications';
import NotificationDropdown from './NotificationDropdown';
import Toast from '../../features/shared/components/Toast';
import { useAuth } from '../../features/auth/hooks/useAuth';
import { BellIcon } from './Icons';
import './NotificationBell.css';

export default function NotificationBell({ onNavigateByRole }) {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();

  const {
    notifications,
    unreadCount,
    loading,
    error,
    newNotificationToast,
    clearToast,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
  } = useNotifications();

  const toggleDropdown = () => {
    if (!isOpen) {
      fetchNotifications();
    }
    setIsOpen((prev) => !prev);
  };

  const handleNotificationClick = async (notification) => {
    if (!notification.isRead) {
      await markAsRead(notification._id);
    }
    setIsOpen(false);

    // If an external navigation handler is provided, use it first
    if (onNavigateByRole) {
      onNavigateByRole(notification, user?.role);
      return;
    }

    // Role-based navigation as specified in Task E
    const role = user?.role;
    if (role === 'intern') {
      navigate('/intern/dashboard?view=certificates');
    } else if (role === 'teamleader') {
      navigate('/teamleader/dashboard?view=requests');
    } else if (role === 'admin') {
      navigate('/admin/dashboard?view=requests');
    }
  };

  const displayCount = unreadCount > 9 ? '9+' : unreadCount;

  return (
    <div className="notif-bell-container">
      {/* Toast notification on count increase */}
      {newNotificationToast && (
        <Toast
          message={newNotificationToast}
          type="info"
          onClose={clearToast}
        />
      )}

      <button
        type="button"
        className={`notif-bell-btn ${isOpen ? 'active' : ''}`}
        onClick={toggleDropdown}
        aria-label={`Notifications, ${unreadCount} unread`}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
      >
        <span className="notif-bell-icon">
          <BellIcon size={18} />
        </span>
        {unreadCount > 0 && (
          <span className="notif-badge" aria-hidden="true">
            {displayCount}
          </span>
        )}
      </button>

      <NotificationDropdown
        notifications={notifications}
        loading={loading}
        error={error}
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        onMarkAllRead={markAllAsRead}
        onNotificationClick={handleNotificationClick}
        onRetry={fetchNotifications}
      />
    </div>
  );
}
