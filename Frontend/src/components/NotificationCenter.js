import React, { useState, useEffect, useRef, useCallback } from 'react';
import { FiBell, FiX, FiCheck, FiCheckCircle, FiInfo, FiAlertCircle, FiMail, FiTrash2, FiFileText } from 'react-icons/fi';
import { useRole } from '../contexts/RoleContext';
import api from '../config/api';
import './NotificationCenter.css';

function NotificationCenter() {
  const { currentUser, permissionUpdateTrigger } = useRole();
  const [notifications, setNotifications] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const panelRef = useRef(null);

  // Close on click outside
  useEffect(() => {
    function handleClickOutside(e) {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    }
    if (isOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Add notification when permissions change
  useEffect(() => {
    if (permissionUpdateTrigger > 0) {
      const newNotification = {
        id: Date.now(),
        type: 'permission_update',
        title: 'Permissions Updated',
        message: 'Your access permissions have been modified by an administrator.',
        timestamp: new Date(),
        read: false,
        icon: 'shield'
      };
      setNotifications(prev => [newNotification, ...prev.slice(0, 9)]);
      setUnreadCount(prev => prev + 1);
    }
  }, [permissionUpdateTrigger]);

  // Fetch notifications from backend
  const fetchNotifications = useCallback(async () => {
    try {
      const res = await api.get('/notifications');
      if (res.data.success) {
        // Merge backend notifications with local-only ones (permission_update etc)
        const localOnly = JSON.parse(localStorage.getItem(`notifications_local_${currentUser?.id}`) || '[]');
        const merged = [...res.data.notifications, ...localOnly].sort((a, b) => new Date(b.createdAt || b.timestamp) - new Date(a.createdAt || a.timestamp));
        setNotifications(merged);
        setUnreadCount(merged.filter(n => !n.read).length);
      }
    } catch {
      // Fallback to localStorage if API fails
      const saved = JSON.parse(localStorage.getItem(`notifications_${currentUser?.id}`) || '[]');
      setNotifications(saved);
      setUnreadCount(saved.filter(n => !n.read).length);
    }
  }, [currentUser?.id]);

  // Load on mount + poll every 30s
  useEffect(() => {
    if (!currentUser?.id) return;
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [currentUser?.id, fetchNotifications]);

  // Save local-only notifications (permission_update etc)
  useEffect(() => {
    if (permissionUpdateTrigger > 0) {
      const newNotification = {
        id: Date.now(),
        type: 'permission_update',
        title: 'Permissions Updated',
        message: 'Your access permissions have been modified by an administrator.',
        timestamp: new Date(),
        read: false,
        icon: 'shield'
      };
      const localOnly = JSON.parse(localStorage.getItem(`notifications_local_${currentUser?.id}`) || '[]');
      const updated = [newNotification, ...localOnly.slice(0, 9)];
      localStorage.setItem(`notifications_local_${currentUser?.id}`, JSON.stringify(updated));
      fetchNotifications();
    }
  }, [permissionUpdateTrigger]);  // eslint-disable-line

  // Listen for external notification updates
  useEffect(() => {
    if (!currentUser?.id) return;
    window.addEventListener('notifications:update', fetchNotifications);
    return () => window.removeEventListener('notifications:update', fetchNotifications);
  }, [currentUser?.id, fetchNotifications]);

  const markAsRead = async (notificationId) => {
    setNotifications(prev => prev.map(n => n._id === notificationId || n.id === notificationId ? { ...n, read: true } : n));
    setUnreadCount(prev => Math.max(0, prev - 1));
    // Backend notifications have _id, local ones have id
    if (typeof notificationId === 'string' && notificationId.length === 24) {
      api.patch(`/notifications/${notificationId}/read`).catch(() => {});
    }
  };

  const markAllAsRead = async () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setUnreadCount(0);
    api.patch('/notifications/read-all').catch(() => {});
    // Clear local unread too
    if (currentUser?.id) {
      const local = JSON.parse(localStorage.getItem(`notifications_local_${currentUser.id}`) || '[]');
      localStorage.setItem(`notifications_local_${currentUser.id}`, JSON.stringify(local.map(n => ({ ...n, read: true }))));
    }
  };

  const removeNotification = (notificationId) => {
    setNotifications(prev => {
      const notification = prev.find(n => (n._id || n.id) === notificationId);
      if (notification && !notification.read) setUnreadCount(count => Math.max(0, count - 1));
      return prev.filter(n => (n._id || n.id) !== notificationId);
    });
    if (typeof notificationId === 'string' && notificationId.length === 24) {
      api.delete(`/notifications/${notificationId}`).catch(() => {});
    } else if (currentUser?.id) {
      const local = JSON.parse(localStorage.getItem(`notifications_local_${currentUser.id}`) || '[]');
      localStorage.setItem(`notifications_local_${currentUser.id}`, JSON.stringify(local.filter(n => n.id !== notificationId)));
    }
  };

  const clearAllNotifications = async () => {
    setNotifications([]);
    setUnreadCount(0);
    api.delete('/notifications').catch(() => {});
    if (currentUser?.id) {
      localStorage.removeItem(`notifications_local_${currentUser.id}`);
      localStorage.removeItem(`notifications_${currentUser.id}`);
    }
  };

  const getNotificationIcon = (type, iconType) => {
    switch (iconType) {
      case 'policy':
        return (
          <div className="nc-icon-circle nc-icon-blue">
            <FiFileText size={15} />
          </div>
        );
      case 'shield':
        return (
          <div className="nc-icon-circle nc-icon-amber">
            <FiAlertCircle size={15} />
          </div>
        );
      case 'info':
        return (
          <div className="nc-icon-circle nc-icon-blue">
            <FiInfo size={15} />
          </div>
        );
      case 'success':
        return (
          <div className="nc-icon-circle nc-icon-green">
            <FiCheckCircle size={15} />
          </div>
        );
      case 'mail':
        return (
          <div className="nc-icon-circle nc-icon-purple">
            <FiMail size={15} />
          </div>
        );
      default:
        return (
          <div className="nc-icon-circle nc-icon-gray">
            <FiBell size={15} />
          </div>
        );
    }
  };

  const handleNotificationClick = (notification) => {
    const notifId = notification._id || notification.id;
    if (!notification.read) markAsRead(notifId);
    if (notification.link) {
      setIsOpen(false);
      window.dispatchEvent(new CustomEvent('navigate:section', { detail: { section: notification.link } }));
    } else if (notification.type === 'new_email') {
      const mailUrl = process.env.REACT_APP_MAIL_URL || 'https://mail.noxtm.com';
      const token = localStorage.getItem('token');
      const url = token ? `${mailUrl}?auth_token=${encodeURIComponent(token)}` : mailUrl;
      window.open(url, '_blank');
    }
  };

  const formatTimestamp = (timestamp) => {
    const now = new Date();
    const notificationTime = new Date(timestamp);
    const diffInMinutes = Math.floor((now - notificationTime) / (1000 * 60));

    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return notificationTime.toLocaleDateString();
  };

  return (
    <div className="nc-root" ref={panelRef}>
      {/* Bell Button */}
      <button
        className={`nc-bell ${unreadCount > 0 ? 'nc-bell-active' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
        title="Notifications"
      >
        <FiBell size={18} />
        {unreadCount > 0 && (
          <span className="nc-badge">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div className="nc-panel">
          {/* Header */}
          <div className="nc-header">
            <div className="nc-header-left">
              <h3 className="nc-title">Notifications</h3>
              {unreadCount > 0 && (
                <span className="nc-unread-pill">{unreadCount} new</span>
              )}
            </div>
            <div className="nc-header-actions">
              {unreadCount > 0 && (
                <button className="nc-action-btn" onClick={markAllAsRead} title="Mark all as read">
                  <FiCheck size={14} />
                  <span>Read all</span>
                </button>
              )}
              {notifications.length > 0 && (
                <button className="nc-action-btn nc-action-danger" onClick={clearAllNotifications} title="Clear all">
                  <FiTrash2 size={13} />
                </button>
              )}
              <button className="nc-close-btn" onClick={() => setIsOpen(false)}>
                <FiX size={16} />
              </button>
            </div>
          </div>

          {/* Body */}
          <div className="nc-body">
            {notifications.length === 0 ? (
              <div className="nc-empty">
                <div className="nc-empty-icon">
                  <FiBell size={28} />
                </div>
                <p className="nc-empty-title">All caught up!</p>
                <p className="nc-empty-sub">No notifications right now</p>
              </div>
            ) : (
              <div className="nc-list">
                {notifications.map(notification => (
                  <div
                    key={notification._id || notification.id}
                    className={`nc-item ${notification.read ? 'nc-item-read' : 'nc-item-unread'} ${notification.link ? 'nc-item-clickable' : ''}`}
                    onClick={() => handleNotificationClick(notification)}
                  >
                    {!notification.read && <span className="nc-item-dot" />}
                    <div className="nc-item-icon">
                      {getNotificationIcon(notification.type, notification.icon)}
                    </div>
                    <div className="nc-item-content">
                      <p className="nc-item-title">{notification.title}</p>
                      <p className="nc-item-message">{notification.message}</p>
                      <span className="nc-item-time">{formatTimestamp(notification.createdAt || notification.timestamp)}</span>
                    </div>
                    <button
                      className="nc-item-remove"
                      onClick={(e) => { e.stopPropagation(); removeNotification(notification._id || notification.id); }}
                      title="Remove"
                    >
                      <FiX size={13} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default NotificationCenter;
