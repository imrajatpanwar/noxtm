import React, { useState, useEffect, useRef } from 'react';
import { FiBell, FiX, FiCheck, FiCheckCircle, FiInfo, FiAlertCircle, FiMail, FiTrash2 } from 'react-icons/fi';
import { useRole } from '../contexts/RoleContext';
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

  // Load notifications from localStorage on mount
  useEffect(() => {
    const savedNotifications = JSON.parse(localStorage.getItem(`notifications_${currentUser?.id}`) || '[]');
    setNotifications(savedNotifications);
    setUnreadCount(savedNotifications.filter(n => !n.read).length);
  }, [currentUser]);

  // Listen for external notification updates
  useEffect(() => {
    if (!currentUser?.id) return;
    const handleExternalUpdate = () => {
      const saved = JSON.parse(localStorage.getItem(`notifications_${currentUser.id}`) || '[]');
      setNotifications(saved);
      setUnreadCount(saved.filter(n => !n.read).length);
    };
    window.addEventListener('notifications:update', handleExternalUpdate);
    return () => window.removeEventListener('notifications:update', handleExternalUpdate);
  }, [currentUser?.id]);

  // Save notifications to localStorage
  useEffect(() => {
    if (currentUser?.id) {
      localStorage.setItem(`notifications_${currentUser.id}`, JSON.stringify(notifications));
    }
  }, [notifications, currentUser]);

  const markAsRead = (notificationId) => {
    setNotifications(prev => prev.map(n =>
      n.id === notificationId ? { ...n, read: true } : n
    ));
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setUnreadCount(0);
  };

  const removeNotification = (notificationId) => {
    setNotifications(prev => {
      const notification = prev.find(n => n.id === notificationId);
      if (notification && !notification.read) {
        setUnreadCount(count => Math.max(0, count - 1));
      }
      return prev.filter(n => n.id !== notificationId);
    });
  };

  const clearAllNotifications = () => {
    setNotifications([]);
    setUnreadCount(0);
    if (currentUser?.id) {
      localStorage.removeItem(`notifications_${currentUser.id}`);
    }
  };

  const getNotificationIcon = (type, iconType) => {
    switch (iconType) {
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
    if (!notification.read) markAsRead(notification.id);
    if (notification.type === 'new_email') {
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
                    key={notification.id}
                    className={`nc-item ${notification.read ? 'nc-item-read' : 'nc-item-unread'}`}
                    onClick={() => handleNotificationClick(notification)}
                  >
                    {!notification.read && <span className="nc-item-dot" />}
                    <div className="nc-item-icon">
                      {getNotificationIcon(notification.type, notification.icon)}
                    </div>
                    <div className="nc-item-content">
                      <p className="nc-item-title">{notification.title}</p>
                      <p className="nc-item-message">{notification.message}</p>
                      <span className="nc-item-time">{formatTimestamp(notification.timestamp)}</span>
                    </div>
                    <button
                      className="nc-item-remove"
                      onClick={(e) => { e.stopPropagation(); removeNotification(notification.id); }}
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
