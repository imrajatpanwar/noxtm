import React, { useState, useEffect, useContext } from 'react';
import { MessagingContext } from '../contexts/MessagingContext';
import {
  formatTimestamp,
  truncateMessage,
  getConversationName,
  getInitials,
  sortConversationsByTime
} from '../utils/timeUtils';
import './ConversationList.css';

function ConversationList({
  conversations,
  currentUser,
  selectedConversation,
  onSelectConversation,
  onCreateGroup
}) {
  const { onlineUsers } = useContext(MessagingContext);
  const [searchQuery, setSearchQuery] = useState('');
  const [showPinned, setShowPinned] = useState(true);
  const [showMenu, setShowMenu] = useState(false);
  const [filteredConversations, setFilteredConversations] = useState([]);

  useEffect(() => {
    // Filter conversations based on search query
    let filtered = conversations || [];

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(conv => {
        const name = getConversationName(conv, currentUser).toLowerCase();
        const lastMsg = conv.lastMessage?.content?.toLowerCase() || '';
        return name.includes(query) || lastMsg.includes(query);
      });
    }

    // Sort by most recent
    filtered = sortConversationsByTime(filtered);

    setFilteredConversations(filtered);
  }, [conversations, searchQuery, currentUser]);

  // Check if user is online
  const isUserOnline = (userId) => {
    if (!userId) return false;
    const userIdStr = userId.toString();
    return onlineUsers.includes(userIdStr);
  };

  // Get online status for conversation
  const getConversationOnlineStatus = (conversation) => {
    if (!conversation.isDirectMessage) return false;

    const currentUserId = currentUser?.id || currentUser?._id;
    const otherParticipant = conversation.participants?.find(
      p => {
        const participantId = p._id || p.id || p;
        return participantId.toString() !== currentUserId?.toString();
      }
    );

    if (!otherParticipant) return false;
    const participantId = otherParticipant._id || otherParticipant.id || otherParticipant;
    return isUserOnline(participantId);
  };

  // Separate pinned and unpinned conversations
  const pinnedConversations = filteredConversations.filter(conv => conv.isPinned);
  const unpinnedConversations = filteredConversations.filter(conv => !conv.isPinned);

  const renderConversationItem = (conversation) => {
    const name = getConversationName(conversation, currentUser);
    const initials = getInitials(name);
    const lastMessage = conversation.lastMessage?.content || 'No messages yet';
    const timestamp = conversation.lastMessage?.timestamp || conversation.updatedAt;
    const unreadCount = conversation.unreadCount || 0;
    const isOnline = getConversationOnlineStatus(conversation);
    const isSelected = selectedConversation?._id === conversation._id;

    return (
      <div
        key={conversation._id}
        className={`conversation-item ${isSelected ? 'selected' : ''}`}
        onClick={() => onSelectConversation(conversation)}
      >
        <div className="conversation-avatar-wrapper">
          <div className="conversation-avatar">
            {initials}
          </div>
          {isOnline && <div className="online-indicator"></div>}
        </div>

        <div className="conversation-info">
          <div className="conversation-header">
            <span className="conversation-name">{name}</span>
            <span className="conversation-time">{formatTimestamp(timestamp)}</span>
          </div>
          <div className="conversation-preview">
            <span className="last-message">{truncateMessage(lastMessage, 35)}</span>
            {unreadCount > 0 && (
              <span className="unread-badge">{unreadCount > 99 ? '99+' : unreadCount}</span>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="conversation-list-container">
      {/* Header */}
      <div className="conversation-list-header">
        <h2 className="header-title">Team Chats</h2>
        <div className="menu-wrapper">
          <button
            className="menu-button"
            onClick={() => setShowMenu(!showMenu)}
            title="Menu"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
              <circle cx="10" cy="4" r="1.5" />
              <circle cx="10" cy="10" r="1.5" />
              <circle cx="10" cy="16" r="1.5" />
            </svg>
          </button>

          {/* Dropdown Menu */}
          {showMenu && (
            <div className="dropdown-menu">
              <button
                className="menu-item"
                onClick={() => {
                  setShowMenu(false);
                  onCreateGroup();
                }}
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M8 3.5a1 1 0 011 1V7h2.5a1 1 0 110 2H9v2.5a1 1 0 11-2 0V9H4.5a1 1 0 110-2H7V4.5a1 1 0 011-1z"/>
                </svg>
                <span>Create Group</span>
              </button>
              <button className="menu-item">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M8 1a7 7 0 100 14A7 7 0 008 1zM7 11V9h2v2H7zm0-4V4h2v3H7z"/>
                </svg>
                <span>Settings</span>
              </button>
              <button className="menu-item">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M8 1a7 7 0 100 14A7 7 0 008 1zM7 11V9h2v2H7zm0-4V4h2v3H7z"/>
                </svg>
                <span>Help</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Search Bar */}
      <div className="conversation-search">
        <div className="search-input-wrapper">
          <svg className="search-icon" width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001c.03.04.062.078.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1.007 1.007 0 0 0-.115-.1zM12 6.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0z"/>
          </svg>
          <input
            type="text"
            placeholder="Search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
          />
          {searchQuery && (
            <button
              className="clear-search"
              onClick={() => setSearchQuery('')}
            >
              ×
            </button>
          )}
        </div>
      </div>

      {/* Conversations List */}
      <div className="conversations-scroll">
        {/* Pinned Chats Section */}
        {pinnedConversations.length > 0 && (
          <div className="conversation-section pinned-section">
            <div
              className="section-header"
              onClick={() => setShowPinned(!showPinned)}
            >
              <div className="section-header-content">
                <svg
                  className={`chevron-icon ${showPinned ? 'open' : ''}`}
                  width="12"
                  height="12"
                  viewBox="0 0 12 12"
                  fill="currentColor"
                >
                  <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
                <span className="section-title">Pinned Chats</span>
              </div>
            </div>
            {showPinned && (
              <div className="section-content">
                {pinnedConversations.map(renderConversationItem)}
              </div>
            )}
          </div>
        )}

        {/* Regular Chats Section */}
        <div className="conversation-section">
          <div className="section-content">
            {unpinnedConversations.length > 0 ? (
              unpinnedConversations.map(renderConversationItem)
            ) : (
              !pinnedConversations.length && (
                <div className="empty-conversations">
                  <div className="empty-icon">💬</div>
                  <p>No conversations yet</p>
                  <span>Start a new conversation or create a group</span>
                </div>
              )
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default ConversationList;
