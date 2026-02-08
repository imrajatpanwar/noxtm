import React, { useState, useEffect, useContext, useRef } from 'react';
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
  onCreateGroup,
  onOpenChatSettings,
  getGroupIconSrc,
  noxtmConfig,
  isNoxtmBotSelected,
  onSelectNoxtmBot
}) {
  const { onlineUsers } = useContext(MessagingContext);
  const [searchQuery, setSearchQuery] = useState('');
  const [showGroups, setShowGroups] = useState(true);
  const [showChats, setShowChats] = useState(true);
  const [showMenu, setShowMenu] = useState(false);
  const [filteredConversations, setFilteredConversations] = useState([]);
  const menuRef = useRef(null);

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

  // Handle click outside to close dropdown menu
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setShowMenu(false);
      }
    };

    if (showMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showMenu]);

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

  // Separate groups and direct messages
  const groupConversations = filteredConversations.filter(conv => !conv.isDirectMessage);
  const directMessageConversations = filteredConversations.filter(conv => conv.isDirectMessage);

  const renderConversationItem = (conversation) => {
    const name = getConversationName(conversation, currentUser);
    const initials = getInitials(name);
    const lastMessage = conversation.lastMessage?.content || 'No messages yet';
    const timestamp = conversation.lastMessage?.timestamp || conversation.updatedAt;
    const unreadCount = conversation.unreadCount || 0;
    const isOnline = getConversationOnlineStatus(conversation);
    const isSelected = selectedConversation?._id === conversation._id;
    const isGroup = conversation.type === 'group' || !conversation.isDirectMessage;

    // Debug group icon
    if (isGroup) {
      console.log('Group conversation:', {
        name: conversation.name,
        type: conversation.type,
        isDirectMessage: conversation.isDirectMessage,
        groupIcon: conversation.groupIcon,
        hasGroupIcon: !!conversation.groupIcon
      });
    }

    // Get other participant's profile image for direct messages
    const currentUserId = currentUser?.id || currentUser?._id;
    const otherParticipant = conversation.isDirectMessage 
      ? conversation.participants?.find(p => {
          const participantId = p._id || p.id || p.user?._id || p.user?.id;
          return participantId?.toString() !== currentUserId?.toString();
        })
      : null;
    const otherUser = otherParticipant?.user || otherParticipant;
    
    // Debug logging
    console.log('Conversation:', conversation.name || 'Direct Message');
    console.log('Other user:', otherUser);
    console.log('Profile image fields:', {
      profileImage: otherUser?.profileImage,
      avatarUrl: otherUser?.avatarUrl,
      image: otherUser?.image,
      photoUrl: otherUser?.photoUrl
    });
    
    // Get profile image with proper URL construction
    let profileImage = otherUser?.profileImage || otherUser?.avatarUrl || otherUser?.image || otherUser?.photoUrl;
    
    console.log('Selected profile image:', profileImage);
    
    // If profile image is a relative path, prepend the API base URL
    if (profileImage && !profileImage.startsWith('http') && !profileImage.startsWith('data:')) {
      const isDevelopment = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
      const apiBaseUrl = isDevelopment ? 'http://localhost:5000' : '';
      profileImage = `${apiBaseUrl}${profileImage}`;
      console.log('Constructed full URL:', profileImage);
    }

    return (
      <div
        key={conversation._id}
        className={isGroup ? `cl-noxtm-sidepanel-conversation-item cl-noxtm-group-chat ${isSelected ? 'cl-selected' : ''}` : `cl-noxtm-direct-message-item ${isSelected ? 'cl-dm-selected' : ''}`}
        onClick={() => onSelectConversation(conversation)}
      >
        <div className={isGroup ? "cl-conversation-avatar-wrapper" : "cl-dm-avatar-wrapper"}>
          <div className={isGroup ? `cl-main-chat-sidebar-conversation-avatar cl-group-avatar` : `cl-dm-avatar cl-user-avatar`}>
            {isGroup && conversation.groupIcon ? (
              <img src={getGroupIconSrc(conversation.groupIcon)} alt="Group icon" />
            ) : !isGroup && profileImage ? (
              <img
                src={profileImage}
                alt={name}
                style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }}
                onError={(e) => {
                  console.log('Failed to load profile image:', profileImage);
                  e.target.style.display = 'none';
                }}
              />
            ) : (
              initials
            )}
          </div>
          {!isGroup && isOnline && <div className="cl-dm-online-indicator"></div>}
        </div>

        <div className="cl-conversation-info">
          <div className={`${isGroup ? 'cl-conversation-header' : 'cl-dm-conversation-header'}`}>
            <span className="cl-conversation-name">{name}</span>
            <span className="cl-conversation-time">{formatTimestamp(timestamp)}</span>
          </div>
          <div className="cl-conversation-preview">
            <span className="cl-last-message">{truncateMessage(lastMessage, 35)}</span>
            {unreadCount > 0 && (
              <span className="cl-unread-badge">{unreadCount > 99 ? '99+' : unreadCount}</span>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="cl-conversation-list-container">
      {/* Header */}
      <div className="cl-conversation-list-header">
  <h2 className="cl-header-title">Team Direct Messages</h2>
        <div className="cl-menu-wrapper" ref={menuRef}>
          <button
            className="cl-menu-button"
            onClick={() => {
              console.log('Menu button clicked, current state:', showMenu);
              setShowMenu(!showMenu);
            }}
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
            <div className="cl-dropdown-menu">
              <button
                className="cl-menu-item"
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
              <button
                className="cl-menu-item"
                onClick={() => {
                  setShowMenu(false);
                  onOpenChatSettings();
                }}
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M8 1a7 7 0 100 14A7 7 0 008 1zM7 11V9h2v2H7zm0-4V4h2v3H7z"/>
                </svg>
                <span>Chat Settings</span>
              </button>
              <button className="cl-menu-item">
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
      <div className="cl-noxtm-msg-conversation-search">
        <div className="cl-noxtm-msg-search-input-wrapper">
          <svg className="cl-noxtm-msg-search-icon" width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001c.03.04.062.078.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1.007 1.007 0 0 0-.115-.1zM12 6.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0z"/>
          </svg>
          <input
            type="text"
            placeholder="Search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="cl-noxtm-msg-search-input"
          />
          {searchQuery && (
            <button
              className="cl-noxtm-msg-clear-search"
              onClick={() => setSearchQuery('')}
            >
              ×
            </button>
          )}
        </div>
      </div>

      {/* Conversations List */}
      <div className="cl-conversations-scroll">
        {/* Noxtm Bot — Pinned at top */}
        {onSelectNoxtmBot && (
          <div
            className={`cl-noxtm-bot-pinned ${isNoxtmBotSelected ? 'cl-dm-selected' : ''}`}
            onClick={onSelectNoxtmBot}
          >
            <div className="cl-dm-avatar-wrapper">
              <div className="cl-dm-avatar cl-user-avatar cl-noxtm-bot-avatar">
                {noxtmConfig?.botProfilePicture ? (
                  <img src={noxtmConfig.botProfilePicture} alt={noxtmConfig?.botName || 'Bot'} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  (noxtmConfig?.botName || 'NP').split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase()
                )}
              </div>
              <div className="cl-dm-online-indicator"></div>
            </div>
            <div className="cl-conversation-info">
              <div className="cl-dm-conversation-header">
                <span className="cl-conversation-name">{noxtmConfig?.botName || 'Navraj Panwar'}</span>
              </div>
              <div className="cl-conversation-preview">
                <span className="cl-last-message">{noxtmConfig?.welcomeMessage?.substring(0, 35) || 'Ask me anything...'}</span>
              </div>
            </div>
          </div>
        )}

        {/* Groups Section */}
        {groupConversations.length > 0 && (
          <div className="cl-conversation-section cl-groups-section">
            <div
                className="cl-message-internal cl-section-header"
              onClick={() => setShowGroups(!showGroups)}
            >
              <div className="cl-section-header-content">
                <svg
                  className={`cl-chevron-icon ${showGroups ? 'cl-open' : ''}`}
                  width="12"
                  height="12"
                  viewBox="0 0 12 12"
                  fill="currentColor"
                >
                  <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
                <span className="cl-message-group-nox cl-section-title">Groups</span>
              </div>
            </div>
            {showGroups && (
              <div className="cl-section-content">
                {groupConversations.map(renderConversationItem)}
              </div>
            )}
          </div>
        )}

        {/* Direct Messages Section - All Company Members */}
        <div className="cl-conversation-section cl-chats-section">
          <div
              className="cl-message-internal cl-section-header"
            onClick={() => setShowChats(!showChats)}
          >
            <div className="cl-section-header-content">
              <svg
                className={`cl-chevron-icon ${showChats ? 'cl-open' : ''}`}
                width="12"
                height="12"
                viewBox="0 0 12 12"
                fill="currentColor"
              >
                <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
              <span className="cl-Message-nox-ls-Section-title">Direct Messages</span>
            </div>
          </div>
          {showChats && (
            <div className="cl-section-content">
              {directMessageConversations.length > 0 ? (
                directMessageConversations.map(renderConversationItem)
              ) : (
                <div className="cl-empty-conversations">
                  <div className="cl-empty-icon">💬</div>
                  <p>No direct messages yet</p>
                  <span>Start a direct message with a team member</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default ConversationList;
