import React, { useState, useEffect, useRef, useContext } from 'react';
import { toast } from 'sonner';
import { MessagingContext } from '../contexts/MessagingContext';
import MessageList from './MessageList';
import MessageInput from './MessageInput';
import ConversationList from './ConversationList';
import api from '../config/api';
import './Messaging.css';

function Messaging() {
  const { socket, onlineUsers, typingUsers, isConnected, emitTypingStart, emitTypingStop } = useContext(MessagingContext);

  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [typingTimeout, setTypingTimeout] = useState(null);

  // Menu and Modal States
  const [showHeaderMenu, setShowHeaderMenu] = useState(false);
  const [showChatSettings, setShowChatSettings] = useState(false);
  const [showCreateGroupModal, setShowCreateGroupModal] = useState(false);

  // Chat Settings State
  const [chatSettings, setChatSettings] = useState({
    notifications: true,
    dataSharing: false,
    readReceipts: true,
    typingIndicator: true,
    tag: true
  });

  // Create Group State
  const [groupIcon, setGroupIcon] = useState(null);
  const [groupName, setGroupName] = useState('');
  const [availableUsers, setAvailableUsers] = useState([]);
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [memberSearchQuery, setMemberSearchQuery] = useState('');

  const messagesEndRef = useRef(null);
  const selectedConversationRef = useRef(null);
  const menuRef = useRef(null);

  useEffect(() => {
    const userData = JSON.parse(localStorage.getItem('user') || '{}');
    setCurrentUser(userData);

    // Load chat settings from localStorage
    const savedSettings = localStorage.getItem('chatSettings');
    if (savedSettings) {
      setChatSettings(JSON.parse(savedSettings));
    }

    loadConversations();
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setShowHeaderMenu(false);
      }
    };

    if (showHeaderMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showHeaderMenu]);

  // Close modals on ESC key
  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        setShowChatSettings(false);
        setShowCreateGroupModal(false);
        setShowHeaderMenu(false);
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, []);

  // Handle socket reconnection
  useEffect(() => {
    const handleReconnect = () => {
      console.log('🔄 Socket reconnected, rejoining conversation room');
      if (selectedConversation && socket) {
        socket.emit('join-conversation', selectedConversation._id);
        toast.success('Reconnected to messaging');
      }
    };

    const handleDisconnect = () => {
      toast.error('Connection lost. Trying to reconnect...', { duration: 2000 });
    };

    window.addEventListener('socket:reconnected', handleReconnect);
    window.addEventListener('socket:disconnected', handleDisconnect);

    return () => {
      window.removeEventListener('socket:reconnected', handleReconnect);
      window.removeEventListener('socket:disconnected', handleDisconnect);
    };
  }, [selectedConversation, socket]);

  // Update ref when selectedConversation changes
  useEffect(() => {
    selectedConversationRef.current = selectedConversation;
  }, [selectedConversation]);

  // Listen for new messages from Socket.IO
  useEffect(() => {
    if (!socket) return;

    const handleNewMessage = (data) => {
      console.log('📩 New message received:', data);

      // Update messages if it's for the currently selected conversation
      if (selectedConversationRef.current?._id === data.conversationId) {
        setMessages(prev => {
          const messageExists = prev.some(msg => msg._id === data.message._id);
          if (!messageExists) {
            return [...prev, data.message];
          }
          return prev;
        });
      }

      // Update conversations list
      setConversations(prevConversations => {
        return prevConversations.map(conv => {
          if (conv._id === data.conversationId) {
            return {
              ...conv,
              lastMessage: {
                content: data.message.content,
                timestamp: data.message.createdAt,
                sender: data.message.sender
              }
            };
          }
          return conv;
        });
      });
    };

    socket.on('new-message', handleNewMessage);

    return () => {
      socket.off('new-message', handleNewMessage);
    };
  }, [socket]);

  useEffect(() => {
    if (selectedConversation) {
      loadMessages(selectedConversation._id);

      // Join conversation room
      if (socket) {
        socket.emit('join-conversation', selectedConversation._id);
      }
    }
  }, [selectedConversation, socket]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadConversations = async () => {
    try {
      const response = await api.get('/messaging/conversations');
      setConversations(response.data.conversations || []);
    } catch (error) {
      console.error('Load conversations error:', error);
    }
  };

  const loadMessages = async (conversationId) => {
    try {
      setMessagesLoading(true);
      const response = await api.get(`/messaging/conversations/${conversationId}/messages`);
      setMessages(response.data.messages || []);
    } catch (error) {
      console.error('Load messages error:', error);
      toast.error('Failed to load messages');
    } finally {
      setMessagesLoading(false);
    }
  };

  const handleSelectConversation = (conversation) => {
    setSelectedConversation(conversation);
  };

  const handleCreateGroup = () => {
    setShowHeaderMenu(false);
    setShowCreateGroupModal(true);
    loadAvailableUsers();
  };

  const handleOpenChatSettings = () => {
    setShowHeaderMenu(false);
    setShowChatSettings(true);
  };

  const handleToggleSetting = (setting) => {
    const newSettings = {
      ...chatSettings,
      [setting]: !chatSettings[setting]
    };
    setChatSettings(newSettings);
    localStorage.setItem('chatSettings', JSON.stringify(newSettings));
    toast.success('Setting updated');
  };

  const loadAvailableUsers = async () => {
    try {
      const response = await api.get('/users');
      const users = response.data.users || response.data || [];
      // Filter out current user
      const currentUserId = currentUser?.id || currentUser?._id;
      const filteredUsers = users.filter(user => {
        const userId = user._id || user.id;
        return userId?.toString() !== currentUserId?.toString();
      });
      setAvailableUsers(filteredUsers);
    } catch (error) {
      console.error('Error loading users:', error);
      toast.error('Failed to load users');
    }
  };

  const handleGroupIconUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Image size should be less than 5MB');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setGroupIcon(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleToggleMember = (user) => {
    const userId = user._id || user.id;
    const isSelected = selectedMembers.some(m => (m._id || m.id) === userId);

    if (isSelected) {
      setSelectedMembers(selectedMembers.filter(m => (m._id || m.id) !== userId));
    } else {
      setSelectedMembers([...selectedMembers, user]);
    }
  };

  const handleCreateGroupSubmit = async () => {
    if (!groupName.trim()) {
      toast.error('Please enter a group name');
      return;
    }

    if (selectedMembers.length === 0) {
      toast.error('Please select at least one member');
      return;
    }

    try {
      const memberIds = selectedMembers.map(m => m._id || m.id);
      await api.post('/messaging/conversations', {
        isDirectMessage: false,
        name: groupName,
        participants: memberIds,
        groupIcon: groupIcon
      });

      toast.success('Group created successfully!');

      // Reset form
      setGroupName('');
      setGroupIcon(null);
      setSelectedMembers([]);
      setMemberSearchQuery('');
      setShowCreateGroupModal(false);

      // Reload conversations
      loadConversations();
    } catch (error) {
      console.error('Error creating group:', error);
      toast.error(error.response?.data?.message || 'Failed to create group');
    }
  };

  const filteredAvailableUsers = availableUsers.filter(user => {
    const searchLower = memberSearchQuery.toLowerCase();
    const fullName = user.fullName?.toLowerCase() || '';
    const email = user.email?.toLowerCase() || '';
    return fullName.includes(searchLower) || email.includes(searchLower);
  });

  const handleSendMessage = async (content) => {
    if (!selectedConversation) {
      toast.error('Please select a conversation first');
      return;
    }

    // Stop typing indicator
    if (typingTimeout) {
      clearTimeout(typingTimeout);
    }
    emitTypingStop(selectedConversation._id, currentUser.id || currentUser._id);

    // Create optimistic message (show immediately)
    const optimisticMessage = {
      _id: `temp-${Date.now()}`,
      content,
      sender: {
        _id: currentUser.id || currentUser._id,
        fullName: currentUser.fullName,
        email: currentUser.email
      },
      createdAt: new Date().toISOString(),
      isPending: true
    };

    // Add optimistic message to UI immediately
    setMessages(prev => [...prev, optimisticMessage]);

    try {
      console.log('📤 Sending message:', {
        conversationId: selectedConversation._id,
        content: content.substring(0, 50)
      });

      const response = await api.post(`/messaging/conversations/${selectedConversation._id}/messages`, {
        content
      });

      console.log('✅ Message sent successfully:', response.data);

      const newMessage = response.data.data || response.data.message;

      // Replace optimistic message with real message
      setMessages(prev =>
        prev.map(msg =>
          msg._id === optimisticMessage._id ? newMessage : msg
        )
      );
    } catch (error) {
      console.error('❌ Send message error:', error);

      // Remove optimistic message on error
      setMessages(prev => prev.filter(msg => msg._id !== optimisticMessage._id));

      console.error('Error details:', {
        status: error.response?.status,
        message: error.response?.data?.message,
        data: error.response?.data
      });

      if (error.response?.status === 404) {
        toast.error('Conversation not found. Please refresh and try again.');
      } else if (error.response?.status === 403) {
        toast.error('Access denied to this conversation');
      } else {
        toast.error(error.response?.data?.message || 'Failed to send message');
      }
    }
  };

  const handleTyping = () => {
    if (!selectedConversation || !currentUser) return;

    // Emit typing start
    emitTypingStart(
      selectedConversation._id,
      currentUser.id || currentUser._id,
      currentUser.fullName || currentUser.email
    );

    // Clear existing timeout
    if (typingTimeout) {
      clearTimeout(typingTimeout);
    }

    // Set new timeout to stop typing after 2 seconds
    const timeout = setTimeout(() => {
      emitTypingStop(selectedConversation._id, currentUser.id || currentUser._id);
    }, 2000);

    setTypingTimeout(timeout);
  };

  const getOtherParticipant = (conversation) => {
    if (!conversation || !currentUser) return null;

    const currentUserId = currentUser.id || currentUser._id;
    return conversation.participants?.find(
      p => (p._id || p.id) !== currentUserId
    );
  };

  const isUserOnline = (userId) => {
    return onlineUsers.includes(userId) || onlineUsers.includes(userId?.toString());
  };

  const currentTypingUser = selectedConversation
    ? typingUsers[selectedConversation._id]
    : null;

  return (
    <div className="messaging-container">
      {/* Connection Status Banner */}
      {!isConnected && (
        <div className="connection-banner offline">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
            <circle cx="12" cy="12" r="3"></circle>
            <line x1="1" y1="1" x2="23" y2="23"></line>
          </svg>
          <span>Disconnected - Trying to reconnect...</span>
        </div>
      )}

      {/* Left Sidebar - Conversation List */}
      <div className="messaging-sidebar">
        <ConversationList
          conversations={conversations}
          currentUser={currentUser}
          selectedConversation={selectedConversation}
          onSelectConversation={handleSelectConversation}
          onCreateGroup={handleCreateGroup}
        />
      </div>

      {/* Right Side - Chat Area */}
      <div className="messaging-main">
        {selectedConversation ? (
          <>
            {/* Chat Header */}
            <div className="messaging-header">
              <div className="chat-header-info">
                {selectedConversation.isDirectMessage ? (
                  <>
                    {(() => {
                      const otherUser = getOtherParticipant(selectedConversation);
                      const userId = otherUser?._id || otherUser?.id;
                      const online = isUserOnline(userId);

                      return (
                        <>
                          <div className="chat-avatar-container">
                            <div className={`chat-avatar ${online ? 'online' : ''}`}>
                              {otherUser?.fullName?.charAt(0)?.toUpperCase() || 'U'}
                            </div>
                            <div className={`status-dot ${online ? 'online' : 'offline'}`} />
                          </div>
                          <div className="chat-header-text">
                            <h3>{otherUser?.fullName || 'Unknown User'}</h3>
                            <span className={`user-status ${online ? 'online' : 'offline'}`}>
                              {online ? 'Online' : 'Offline'}
                            </span>
                          </div>
                        </>
                      );
                    })()}
                  </>
                ) : (
                  <>
                    <div className="chat-avatar">#</div>
                    <div className="chat-header-text">
                      <h3>{selectedConversation.name || 'Group Chat'}</h3>
                      <span className="group-members">
                        {selectedConversation.participants?.length || 0} members
                      </span>
                    </div>
                  </>
                )}
              </div>

              {/* 3-Dot Menu */}
              <div className="header-menu-wrapper" ref={menuRef}>
                <button
                  className="header-menu-button"
                  onClick={() => setShowHeaderMenu(!showHeaderMenu)}
                  title="Options"
                >
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                    <circle cx="10" cy="4" r="1.5" />
                    <circle cx="10" cy="10" r="1.5" />
                    <circle cx="10" cy="16" r="1.5" />
                  </svg>
                </button>

                {showHeaderMenu && (
                  <div className="header-dropdown-menu">
                    <button
                      className="header-menu-item"
                      onClick={handleCreateGroup}
                    >
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                        <path d="M8 3.5a1 1 0 011 1V7h2.5a1 1 0 110 2H9v2.5a1 1 0 11-2 0V9H4.5a1 1 0 110-2H7V4.5a1 1 0 011-1z"/>
                      </svg>
                      <span>Create Group</span>
                    </button>
                    <button
                      className="header-menu-item"
                      onClick={handleOpenChatSettings}
                    >
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                        <path d="M8 1a7 7 0 100 14A7 7 0 008 1zM6.5 9.5h3v1h-3v-1zm0-2h5v1h-5v-1zm0-2h5v1h-5v-1z"/>
                      </svg>
                      <span>Chat Settings</span>
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Messages Area */}
            <div className="messaging-body">
              {messagesLoading ? (
                <div className="messages-loading">
                  <div className="loading-spinner"></div>
                  <p>Loading messages...</p>
                </div>
              ) : (
                <MessageList
                  messages={messages}
                  currentUserId={currentUser?.id || currentUser?._id}
                  messagesEndRef={messagesEndRef}
                  typingUser={currentTypingUser}
                />
              )}
            </div>

            {/* Message Input */}
            <div className="messaging-footer">
              <MessageInput
                onSendMessage={handleSendMessage}
                onTyping={handleTyping}
                disabled={!selectedConversation}
              />
            </div>

            {/* Chat Settings Panel */}
            {showChatSettings && (
              <>
                <div className="settings-backdrop" onClick={() => setShowChatSettings(false)} />
                <div className="chat-settings-panel">
                  <div className="settings-panel-header">
                    <h3>Chat Setting & Privacy</h3>
                    <button
                      className="close-panel-button"
                      onClick={() => setShowChatSettings(false)}
                    >
                      <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z"/>
                      </svg>
                    </button>
                  </div>

                  <div className="settings-panel-content">
                    {/* Notification Settings */}
                    <div className="setting-item">
                      <div className="setting-info">
                        <label>Notification Settings</label>
                        <p>When a chat arrives you will be notified</p>
                      </div>
                      <button
                        className={`toggle-switch ${chatSettings.notifications ? 'active' : ''}`}
                        onClick={() => handleToggleSetting('notifications')}
                      >
                        <span className="toggle-slider" />
                      </button>
                    </div>

                    {/* Data Sharing */}
                    <div className="setting-item">
                      <div className="setting-info">
                        <label>Data Sharing</label>
                        <p>Data sharing for business activities</p>
                      </div>
                      <button
                        className={`toggle-switch ${chatSettings.dataSharing ? 'active' : ''}`}
                        onClick={() => handleToggleSetting('dataSharing')}
                      >
                        <span className="toggle-slider" />
                      </button>
                    </div>

                    {/* Read Receipts */}
                    <div className="setting-item">
                      <div className="setting-info">
                        <label>Read Receipts</label>
                        <p>Others can see when you've read their messages</p>
                      </div>
                      <button
                        className={`toggle-switch ${chatSettings.readReceipts ? 'active' : ''}`}
                        onClick={() => handleToggleSetting('readReceipts')}
                      >
                        <span className="toggle-slider" />
                      </button>
                    </div>

                    {/* Typing Indicator */}
                    <div className="setting-item">
                      <div className="setting-info">
                        <label>Typing Indicator</label>
                        <p>Others can see when you're typing</p>
                      </div>
                      <button
                        className={`toggle-switch ${chatSettings.typingIndicator ? 'active' : ''}`}
                        onClick={() => handleToggleSetting('typingIndicator')}
                      >
                        <span className="toggle-slider" />
                      </button>
                    </div>

                    {/* Tag */}
                    <div className="setting-item">
                      <div className="setting-info">
                        <label>Tag</label>
                        <p>Others can tag you in the group</p>
                      </div>
                      <button
                        className={`toggle-switch ${chatSettings.tag ? 'active' : ''}`}
                        onClick={() => handleToggleSetting('tag')}
                      >
                        <span className="toggle-slider" />
                      </button>
                    </div>
                  </div>
                </div>
              </>
            )}
          </>
        ) : (
          <div className="messaging-empty-state">
            <div className="empty-state-icon">💬</div>
            <h3>Welcome to NOXTM Messaging</h3>
            <p>Select a conversation from the left to start chatting</p>
            <div className="empty-state-features">
              <div className="feature-item">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"></circle>
                  <polyline points="12 6 12 12 16 14"></polyline>
                </svg>
                <span>Real-time messaging</span>
              </div>
              <div className="feature-item">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                  <circle cx="9" cy="7" r="4"></circle>
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                  <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                </svg>
                <span>See who's online</span>
              </div>
              <div className="feature-item">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
                </svg>
                <span>Typing indicators</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Create Group Modal */}
      {showCreateGroupModal && (
        <>
          <div className="modal-backdrop" onClick={() => setShowCreateGroupModal(false)} />
          <div className="create-group-modal">
            <div className="modal-header">
              <h3>Create Group</h3>
              <button
                className="close-modal-button"
                onClick={() => setShowCreateGroupModal(false)}
              >
                <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z"/>
                </svg>
              </button>
            </div>

            <div className="modal-content">
              {/* Group Icon Upload */}
              <div className="group-icon-section">
                <label className="group-icon-label">Group Icon</label>
                <div className="group-icon-upload">
                  <input
                    type="file"
                    id="group-icon-input"
                    accept="image/*"
                    onChange={handleGroupIconUpload}
                    style={{ display: 'none' }}
                  />
                  <label htmlFor="group-icon-input" className="group-icon-preview">
                    {groupIcon ? (
                      <img src={groupIcon} alt="Group Icon" />
                    ) : (
                      <div className="icon-placeholder">
                        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                          <circle cx="9" cy="7" r="4"></circle>
                          <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                          <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                        </svg>
                      </div>
                    )}
                    <div className="edit-icon-overlay">
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                        <path d="M12.146.146a.5.5 0 0 1 .708 0l3 3a.5.5 0 0 1 0 .708l-10 10a.5.5 0 0 1-.168.11l-5 2a.5.5 0 0 1-.65-.65l2-5a.5.5 0 0 1 .11-.168l10-10zM11.207 2.5L13.5 4.793 14.793 3.5 12.5 1.207 11.207 2.5zm1.586 3L10.5 3.207 4 9.707V10h.5a.5.5 0 0 1 .5.5v.5h.5a.5.5 0 0 1 .5.5v.5h.293l6.5-6.5zm-9.761 5.175l-.106.106-1.528 3.821 3.821-1.528.106-.106A.5.5 0 0 1 5 12.5V12h-.5a.5.5 0 0 1-.5-.5V11h-.5a.5.5 0 0 1-.468-.325z"/>
                      </svg>
                    </div>
                  </label>
                </div>
              </div>

              {/* Group Name */}
              <div className="form-group">
                <label htmlFor="group-name">Group Name</label>
                <input
                  type="text"
                  id="group-name"
                  placeholder="Enter group name"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  className="group-name-input"
                />
              </div>

              {/* Add Members */}
              <div className="form-group">
                <label>Add Members</label>
                <input
                  type="text"
                  placeholder="Search users..."
                  value={memberSearchQuery}
                  onChange={(e) => setMemberSearchQuery(e.target.value)}
                  className="member-search-input"
                />
              </div>

              {/* Selected Members */}
              {selectedMembers.length > 0 && (
                <div className="selected-members">
                  <label>Selected Members ({selectedMembers.length})</label>
                  <div className="selected-members-list">
                    {selectedMembers.map(member => (
                      <div key={member._id || member.id} className="selected-member-chip">
                        <span>{member.fullName || member.email}</span>
                        <button
                          onClick={() => handleToggleMember(member)}
                          className="remove-member-button"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Available Users List */}
              <div className="members-list">
                {filteredAvailableUsers.length > 0 ? (
                  filteredAvailableUsers.map(user => {
                    const userId = user._id || user.id;
                    const isSelected = selectedMembers.some(m => (m._id || m.id) === userId);

                    return (
                      <div
                        key={userId}
                        className={`member-item ${isSelected ? 'selected' : ''}`}
                        onClick={() => handleToggleMember(user)}
                      >
                        <div className="member-avatar">
                          {user.fullName?.charAt(0)?.toUpperCase() || 'U'}
                        </div>
                        <div className="member-info">
                          <div className="member-name">{user.fullName || 'Unknown'}</div>
                          <div className="member-email">{user.email}</div>
                        </div>
                        <div className="member-checkbox">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => {}}
                            onClick={(e) => e.stopPropagation()}
                          />
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="no-users">
                    {memberSearchQuery ? 'No users found' : 'Loading users...'}
                  </div>
                )}
              </div>
            </div>

            <div className="modal-footer">
              <button
                className="btn-cancel"
                onClick={() => setShowCreateGroupModal(false)}
              >
                Cancel
              </button>
              <button
                className="btn-create-group"
                onClick={handleCreateGroupSubmit}
                disabled={!groupName.trim() || selectedMembers.length === 0}
              >
                Create Group
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default Messaging;
