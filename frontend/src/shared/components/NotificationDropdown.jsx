import { useEffect, useRef } from 'react';
import { CheckCircleIcon } from './Icons';
import './NotificationBell.css';

export default function NotificationDropdown({
  notifications = [],
  loading = false,
  error = null,
  isOpen = false,
  onClose,
  onMarkAllRead,
  onNotificationClick,
  onRetry,
}) {
  const dropdownRef = useRef(null);

  // Close on outside click or Escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      ref={dropdownRef}
      className="notif-dropdown-menu"
      role="dialog"
      aria-label="Notifications list"
    >
      <div className="notif-dropdown-header">
        <span className="notif-dropdown-title">Notifications</span>
        {notifications.some((n) => !n.isRead) && (
          <button
            type="button"
            className="notif-mark-all-btn"
            onClick={onMarkAllRead}
          >
            Mark all read
          </button>
        )}
      </div>

      <div className="notif-dropdown-body">
        {loading ? (
          <div className="notif-state-message">
            <div className="notif-spinner"></div>
            <span>Loading notifications...</span>
          </div>
        ) : error ? (
          <div className="notif-state-message error">
            <span>{error}</span>
            {onRetry && (
              <button type="button" className="notif-retry-btn" onClick={onRetry}>
                Retry
              </button>
            )}
          </div>
        ) : notifications.length === 0 ? (
          <div className="notif-state-message empty">
            <span className="notif-empty-icon">
              <CheckCircleIcon size={32} />
            </span>
            <p className="notif-empty-title">You're all caught up</p>
            <p className="notif-empty-sub">No new notifications at this time.</p>
          </div>
        ) : (
          <ul className="notif-list" role="list">
            {notifications.map((item) => {
              const dateStr = item.createdAt
                ? new Date(item.createdAt).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })
                : '';

              return (
                <li
                  key={item._id}
                  className={`notif-item ${!item.isRead ? 'unread' : 'read'}`}
                  onClick={() => onNotificationClick(item)}
                  tabIndex={0}
                  role="button"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onNotificationClick(item);
                    }
                  }}
                >
                  <div className="notif-item-indicator">
                    {!item.isRead && <span className="notif-unread-dot"></span>}
                  </div>
                  <div className="notif-item-content">
                    <p className="notif-item-title">{item.title}</p>
                    <p className="notif-item-message">{item.message}</p>
                    <span className="notif-item-time">{dateStr}</span>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
