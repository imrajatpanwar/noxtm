import React, { useState, useEffect, useContext, useRef } from 'react';
import { MessagingContext } from '../contexts/MessagingContext';
import api from '../config/api';
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
  const [companyMembers, setCompanyMembers] = useState([]);
  const [contextMenu, setContextMenu] = useState({ visible: false, x: 0, y: 0, conversation: null });
  const menuRef = useRef(null);
  const contextMenuRef = useRef(null);

  // Fetch all company members
  useEffect(() => {
    const fetchMembers = async () => {
      try {
        const response = await api.get('/messaging/users');
        const members = response.data.users || response.data.members || [];
        setCompanyMembers(members);
      } catch (error) {
        console.error('Error fetching company members:', error);
      }
    };
    fetchMembers();
  }, []);

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
      if (contextMenuRef.current && !contextMenuRef.current.contains(event.target)) {
        setContextMenu(prev => ({ ...prev, visible: false }));
      }
    };

    if (showMenu || contextMenu.visible) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showMenu, contextMenu.visible]);

  // Handle context menu on conversation item
  const handleConversationContextMenu = (e, conversation) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({
      visible: true,
      x: e.clientX,
      y: e.clientY,
      conversation
    });
  };

  const handleMuteChat = (conversation) => {
    console.log('Mute chat:', conversation._id || conversation.name);
    setContextMenu(prev => ({ ...prev, visible: false }));
  };

  const handleClearChat = (conversation) => {
    console.log('Clear chat:', conversation._id || conversation.name);
    setContextMenu(prev => ({ ...prev, visible: false }));
  };

  const handlePinChat = (conversation) => {
    console.log('Pin chat:', conversation._id || conversation.name);
    setContextMenu(prev => ({ ...prev, visible: false }));
  };

  const handleArchiveChat = (conversation) => {
    console.log('Archive chat:', conversation._id || conversation.name);
    setContextMenu(prev => ({ ...prev, visible: false }));
  };

  const handleMarkUnread = (conversation) => {
    console.log('Mark unread:', conversation._id || conversation.name);
    setContextMenu(prev => ({ ...prev, visible: false }));
  };

  const handleBlockUser = (conversation) => {
    console.log('Block user:', conversation._id || conversation.name);
    setContextMenu(prev => ({ ...prev, visible: false }));
  };

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
        onContextMenu={(e) => handleConversationContextMenu(e, conversation)}
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
      <div className="cl-conversations-scroll" style={{ position: 'relative' }}>
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
              {/* Show existing DM conversations first */}
              {directMessageConversations.map(renderConversationItem)}

              {/* Show remaining company members who have no DM conversation yet */}
              {(() => {
                const currentUserId = currentUser?.id || currentUser?._id;
                // Collect user IDs who already have a DM conversation
                const dmUserIds = new Set();
                directMessageConversations.forEach(conv => {
                  conv.participants?.forEach(p => {
                    // Extract ID from various possible structures
                    const pid = (typeof p === 'string' ? p : (p.user?._id || p.user?.id || p._id || p.id || p))?.toString();
                    if (pid && pid !== currentUserId?.toString()) {
                      dmUserIds.add(pid);
                    }
                  });
                });

                // Filter company members not in existing DMs
                let remainingMembers = companyMembers.filter(m => {
                  const memberId = (m._id || m.id)?.toString();
                  return memberId !== currentUserId?.toString() && !dmUserIds.has(memberId);
                });

                // Apply search filter
                if (searchQuery.trim()) {
                  const query = searchQuery.toLowerCase();
                  remainingMembers = remainingMembers.filter(m =>
                    (m.fullName || m.username || '').toLowerCase().includes(query) ||
                    (m.email || '').toLowerCase().includes(query)
                  );
                }

                return remainingMembers.map(member => {
                  const memberId = member._id || member.id;
                  const name = member.fullName || member.username || member.email?.split('@')[0] || 'User';
                  const initials = getInitials(name);
                  const memberOnline = isUserOnline(memberId);
                  let profileImg = member.profileImage;
                  if (profileImg && !profileImg.startsWith('http') && !profileImg.startsWith('data:')) {
                    const isDev = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
                    profileImg = `${isDev ? 'http://localhost:5000' : ''}${profileImg}`;
                  }

                  return (
                    <div
                      key={memberId}
                      className="cl-noxtm-direct-message-item cl-member-no-convo"
                      onContextMenu={(e) => handleConversationContextMenu(e, {
                        _id: `new_dm_${memberId}`,
                        isDirectMessage: true,
                        isNewDm: true,
                        targetUser: member,
                        participants: [
                          { _id: currentUserId, fullName: currentUser?.fullName || currentUser?.username },
                          { _id: memberId, fullName: name, profileImage: member.profileImage }
                        ],
                        name: name
                      })}
                      onClick={() => {
                        // Create a temporary pseudo-conversation object to start a DM
                        onSelectConversation({
                          _id: `new_dm_${memberId}`,
                          isDirectMessage: true,
                          isNewDm: true,
                          targetUser: member,
                          participants: [
                            { _id: currentUserId, fullName: currentUser?.fullName || currentUser?.username },
                            { _id: memberId, fullName: name, profileImage: member.profileImage }
                          ],
                          name: name
                        });
                      }}
                    >
                      <div className="cl-dm-avatar-wrapper">
                        <div className="cl-dm-avatar cl-user-avatar">
                          {profileImg ? (
                            <img
                              src={profileImg}
                              alt={name}
                              style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }}
                              onError={(e) => { e.target.style.display = 'none'; }}
                            />
                          ) : (
                            initials
                          )}
                        </div>
                        {memberOnline && <div className="cl-dm-online-indicator"></div>}
                      </div>
                      <div className="cl-conversation-info">
                        <div className="cl-dm-conversation-header">
                          <span className="cl-conversation-name">{name}</span>
                        </div>
                        <div className="cl-conversation-preview">
                          <span className="cl-last-message cl-member-role">{member.roleInCompany || 'Member'}</span>
                        </div>
                      </div>
                    </div>
                  );
                });
              })()}

              {/* Context Menu */}
              {contextMenu.visible && (
                <div
                  ref={contextMenuRef}
                  className="cl-context-menu"
                  style={{ position: 'fixed', top: contextMenu.y, left: contextMenu.x }}
                >
                  <button className="cl-context-menu-item" onClick={() => handleMuteChat(contextMenu.conversation)}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M11 5L6 9H2v6h4l5 4V5z"/>
                      <line x1="23" y1="9" x2="17" y2="15"/>
                      <line x1="17" y1="9" x2="23" y2="15"/>
                    </svg>
                    <span>Mute</span>
                  </button>
                  <button className="cl-context-menu-item" onClick={() => handlePinChat(contextMenu.conversation)}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 17v5"/>
                      <path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24Z"/>
                    </svg>
                    <span>Pin Chat</span>
                  </button>
                  <button className="cl-context-menu-item" onClick={() => handleMarkUnread(contextMenu.conversation)}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10"/>
                      <circle cx="12" cy="12" r="4" fill="currentColor"/>
                    </svg>
                    <span>Mark as Unread</span>
                  </button>
                  <div className="cl-context-menu-divider"></div>
                  <button className="cl-context-menu-item" onClick={() => handleArchiveChat(contextMenu.conversation)}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="2" y="3" width="20" height="5" rx="1"/>
                      <path d="M4 8v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8"/>
                      <path d="M10 12h4"/>
                    </svg>
                    <span>Archive Chat</span>
                  </button>
                  <button className="cl-context-menu-item" onClick={() => handleClearChat(contextMenu.conversation)}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3 6h18"/>
                      <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/>
                    </svg>
                    <span>Clear Chat</span>
                  </button>
                  <div className="cl-context-menu-divider"></div>
                  <button className="cl-context-menu-item cl-context-menu-danger" onClick={() => handleBlockUser(contextMenu.conversation)}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10"/>
                      <line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/>
                    </svg>
                    <span>Block User</span>
                  </button>
                </div>
              )}

              {directMessageConversations.length === 0 && companyMembers.length === 0 && (
                <div className="cl-empty-conversations">
                  <div className="cl-empty-icon">💬</div>
                  <p>No team members yet</p>
                  <span>Invite members to your company to start chatting</span>
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
