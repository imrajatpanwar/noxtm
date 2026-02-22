import React, { useState, useEffect } from 'react';
import { FiBell, FiX, FiCheck, FiInfo, FiAlertCircle, FiMail } from 'react-icons/fi';
import { useRole } from '../contexts/RoleContext';
import './NotificationCenter.css';

function NotificationCenter() {
  const { currentUser, permissionUpdateTrigger } = useRole();
  const [notifications, setNotifications] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

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
      
      setNotifications(prev => [newNotification, ...prev.slice(0, 9)]); // Keep only 10 notifications
      setUnreadCount(prev => prev + 1);
    }
  }, [permissionUpdateTrigger]);

  // Load notifications from localStorage on mount
  useEffect(() => {
    const savedNotifications = JSON.parse(localStorage.getItem(`notifications_${currentUser?.id}`) || '[]');
    setNotifications(savedNotifications);
    setUnreadCount(savedNotifications.filter(n => !n.read).length);
  }, [currentUser]);

  // Listen for external notification updates (e.g. from MailPoller)
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

  // Save notifications to localStorage when they change
  useEffect(() => {
    if (currentUser?.id) {
      localStorage.setItem(`notifications_${currentUser.id}`, JSON.stringify(notifications));
    }
  }, [notifications, currentUser]);

  const markAsRead = (notificationId) => {
    setNotifications(prev => prev.map(notification => 
      notification.id === notificationId 
        ? { ...notification, read: true }
        : notification
    ));
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(notification => ({ ...notification, read: true })));
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

  const getNotificationIcon = (type, iconType) => {
    switch (iconType) {
      case 'shield':
        return <FiAlertCircle className="notification-icon shield" />;
      case 'info':
        return <FiInfo className="notification-icon info" />;
      case 'success':
        return <FiCheck className="notification-icon success" />;
      case 'mail':
        return <FiMail className="notification-icon mail" />;
      default:
        return <FiBell className="notification-icon default" />;
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
    <div className="notification-center">
      <button 
        className={`notification-bell ${unreadCount > 0 ? 'has-unread' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
        title="Notifications"
      >
        <FiBell />
        {unreadCount > 0 && (
          <span className="notification-badge">{unreadCount > 99 ? '99+' : unreadCount}</span>
        )}
      </button>

      {isOpen && (
        <div className="notification-dropdown">
          <div className="notification-header">
            <h3>Notifications</h3>
            <div className="notification-actions">
              {unreadCount > 0 && (
                <button 
                  className="mark-all-read"
                  onClick={markAllAsRead}
                  title="Mark all as read"
                >
                  <FiCheck />
                </button>
              )}
              <button 
                className="close-notifications"
                onClick={() => setIsOpen(false)}
                title="Close"
              >
                <FiX />
              </button>
            </div>
          </div>

          <div className="notification-list">
            {notifications.length === 0 ? (
              <div className="no-notifications">
                <FiBell className="no-notifications-icon" />
                <p>No notifications</p>
              </div>
            ) : (
              notifications.map(notification => (
                <div 
                  key={notification.id}
                  className={`notification-item ${notification.read ? 'read' : 'unread'}`}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div className="notification-content">
                    <div className="notification-icon-wrapper">
                      {getNotificationIcon(notification.type, notification.icon)}
                    </div>
                    <div className="notification-text">
                      <h4>{notification.title}</h4>
                      <p>{notification.message}</p>
                      <span className="notification-time">
                        {formatTimestamp(notification.timestamp)}
                      </span>
                    </div>
                  </div>
                  <button 
                    className="remove-notification"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeNotification(notification.id);
                    }}
                    title="Remove notification"
                  >
                    <FiX />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default NotificationCenter;
