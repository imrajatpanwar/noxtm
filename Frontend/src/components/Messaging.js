import React, { useState, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { io } from 'socket.io-client';
import './Messaging.css';

function Messaging() {
  const [activeTab, setActiveTab] = useState('conversations'); // conversations, users, invitations
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messageInput, setMessageInput] = useState('');
  const [users, setUsers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [invitations, setInvitations] = useState([]);
  const [inviteEmail, setInviteEmail] = useState('');
  const [showNewGroupModal, setShowNewGroupModal] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [, setTimestampTrigger] = useState(0); // Force re-render for timestamps
  const messagesEndRef = useRef(null);
  const socketRef = useRef(null);
  const selectedConversationRef = useRef(null);

  useEffect(() => {
    const userData = JSON.parse(localStorage.getItem('user') || '{}');
    setCurrentUser(userData);

    // Initialize Socket.IO connection
    socketRef.current = io('http://noxtm.com:5000', {
      transports: ['websocket', 'polling']
    });

    socketRef.current.on('connect', () => {
      console.log('✅ Connected to Socket.IO');
    });

    socketRef.current.on('new-message', (data) => {
      console.log('📩 New message received:', data);

      // Update messages if it's for the currently selected conversation
      setMessages(prev => {
        // Check if this message is for the currently selected conversation using ref
        if (selectedConversationRef.current?._id === data.conversationId) {
          // Check if message already exists to avoid duplicates
          const messageExists = prev.some(msg => msg._id === data.message._id);
          if (!messageExists) {
            return [...prev, data.message];
          }
        }
        return prev;
      });

      // Update conversations list in real-time
      setConversations(prevConversations => {
        const updatedConversations = prevConversations.map(conv => {
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

        // If conversation doesn't exist in list, reload conversations
        const conversationExists = prevConversations.some(conv => conv._id === data.conversationId);
        if (!conversationExists) {
          loadConversations();
        }

        return updatedConversations;
      });
    });

    const initializeData = async () => {
      await loadConversations();
      loadUsers();
      loadInvitations();
    };

    initializeData();

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, []);

  // Update ref when selectedConversation changes
  useEffect(() => {
    selectedConversationRef.current = selectedConversation;
  }, [selectedConversation]);

  useEffect(() => {
    if (selectedConversation) {
      loadMessages(selectedConversation._id);
      // No need to join room manually - we auto-join all conversations
    }
  }, [selectedConversation]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Update timestamps every 10 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setTimestampTrigger(prev => prev + 1);
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadConversations = async () => {
    try {
      const response = await fetch('/api/messaging/conversations', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const data = await response.json();
      if (response.ok) {
        setConversations(data.conversations || []);

        // Auto-join all conversation rooms for real-time updates
        if (socketRef.current && data.conversations) {
          data.conversations.forEach(conv => {
            socketRef.current.emit('join-conversation', conv._id);
            console.log('🔗 Auto-joined conversation:', conv._id);
          });
        }
      }
    } catch (error) {
      console.error('Error loading conversations:', error);
    }
  };

  const loadMessages = async (conversationId) => {
    try {
      const response = await fetch(`/api/messaging/conversations/${conversationId}/messages`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const data = await response.json();
      if (response.ok) {
        setMessages(data.messages || []);
      }
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };

  const loadUsers = async () => {
    try {
      const response = await fetch('/api/messaging/users', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const data = await response.json();
      if (response.ok) {
        setUsers(data.users || []);
      }
    } catch (error) {
      console.error('Error loading users:', error);
    }
  };

  const loadInvitations = async () => {
    try {
      const response = await fetch('/api/messaging/invitations', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const data = await response.json();
      if (response.ok) {
        setInvitations(data.invitations || []);
      }
    } catch (error) {
      console.error('Error loading invitations:', error);
    }
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!messageInput.trim() || !selectedConversation) return;

    const messageContent = messageInput.trim();
    setMessageInput(''); // Clear input immediately for better UX

    try {
      const response = await fetch(`/api/messaging/conversations/${selectedConversation._id}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          content: messageContent,
          type: 'text'
        })
      });

      const data = await response.json();
      if (!response.ok) {
        toast.error(data.message || 'Failed to send message');
        setMessageInput(messageContent); // Restore message on error
      }
      // Don't manually update messages here - Socket.IO will handle it
      // This prevents duplicate messages and ensures all users see the same update
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
      setMessageInput(messageContent); // Restore message on error
    }
  };

  const startDirectConversation = async (userId) => {
    setLoading(true);
    try {
      const response = await fetch('/api/messaging/conversations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          type: 'direct',
          participantIds: [userId] // Changed from 'participants' to 'participantIds'
        })
      });

      const data = await response.json();
      if (response.ok) {
        setSelectedConversation(data.conversation);
        setActiveTab('conversations');

        // Join the new conversation room immediately
        if (socketRef.current && data.conversation) {
          socketRef.current.emit('join-conversation', data.conversation._id);
          console.log('🔗 Joined new conversation:', data.conversation._id);
        }

        loadConversations();
        toast.success('Conversation started');
      } else {
        toast.error(data.message || 'Failed to start conversation');
      }
    } catch (error) {
      console.error('Error starting conversation:', error);
      toast.error('Failed to start conversation');
    } finally {
      setLoading(false);
    }
  };

  const createGroupChat = async () => {
    if (!groupName.trim() || selectedUsers.length < 2) {
      toast.error('Please enter a group name and select at least 2 members');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/messaging/conversations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          type: 'group',
          name: groupName,
          participantIds: selectedUsers // Changed from 'participants' to 'participantIds'
        })
      });

      const data = await response.json();
      if (response.ok) {
        setSelectedConversation(data.conversation);
        setActiveTab('conversations');

        // Join the new conversation room immediately
        if (socketRef.current && data.conversation) {
          socketRef.current.emit('join-conversation', data.conversation._id);
          console.log('🔗 Joined new group conversation:', data.conversation._id);
        }

        loadConversations();
        setShowNewGroupModal(false);
        setGroupName('');
        setSelectedUsers([]);
        toast.success('Group chat created');
      } else {
        toast.error(data.message || 'Failed to create group');
      }
    } catch (error) {
      console.error('Error creating group:', error);
      toast.error('Failed to create group');
    } finally {
      setLoading(false);
    }
  };

  const sendInvitation = async (e) => {
    e.preventDefault();
    if (!inviteEmail.trim()) {
      toast.error('Please enter an email address');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/messaging/invitations/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ email: inviteEmail })
      });

      const data = await response.json();
      if (response.ok) {
        toast.success('Invitation sent successfully');
        setInviteEmail('');
        loadInvitations();
      } else {
        toast.error(data.message || 'Failed to send invitation');
      }
    } catch (error) {
      console.error('Error sending invitation:', error);
      toast.error('Failed to send invitation');
    } finally {
      setLoading(false);
    }
  };

  const resendInvitation = async (email) => {
    setLoading(true);
    try {
      const response = await fetch('/api/messaging/invitations/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ email })
      });

      const data = await response.json();
      if (response.ok) {
        toast.success('Invitation resent successfully');
        loadInvitations();
      } else {
        toast.error(data.message || 'Failed to resend invitation');
      }
    } catch (error) {
      console.error('Error resending invitation:', error);
      toast.error('Failed to resend invitation');
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days > 7) {
      return date.toLocaleDateString();
    } else if (days > 0) {
      return `${days}d ago`;
    } else if (hours > 0) {
      return `${hours}h ago`;
    } else if (minutes > 0) {
      return `${minutes}m ago`;
    } else if (seconds > 0) {
      return `${seconds}s ago`;
    } else {
      return 'Just now';
    }
  };

  const getConversationName = (conversation) => {
    if (conversation.type === 'group') {
      return conversation.name;
    }
    // For direct messages, show the other person's name
    const otherParticipant = conversation.participants?.find(
      p => p.user?._id !== currentUser?.id && p.user?._id !== currentUser?._id && p.id !== currentUser?.id
    );
    // Try multiple field names for compatibility
    return otherParticipant?.user?.fullName || otherParticipant?.user?.username ||
           otherParticipant?.fullName || otherParticipant?.username || 'Unknown User';
  };

  const filteredUsers = users.filter(user =>
    user.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.department?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="messaging-container">
      <div className="messaging-sidebar">
        <div className="messaging-sidebar-header">
          <h2>Messaging</h2>
          <button
            className="btn-new-group"
            onClick={() => setShowNewGroupModal(true)}
            title="Create Group Chat"
          >
            +
          </button>
        </div>

        <div className="messaging-tabs">
          <button
            className={`tab-btn ${activeTab === 'conversations' ? 'active' : ''}`}
            onClick={() => setActiveTab('conversations')}
          >
            Chats
          </button>
          <button
            className={`tab-btn ${activeTab === 'users' ? 'active' : ''}`}
            onClick={() => setActiveTab('users')}
          >
            Users
          </button>
          <button
            className={`tab-btn ${activeTab === 'invitations' ? 'active' : ''}`}
            onClick={() => setActiveTab('invitations')}
          >
            Invite
          </button>
        </div>

        <div className="messaging-sidebar-content">
          {activeTab === 'conversations' && (
            <div className="conversations-list">
              {conversations.length === 0 ? (
                <div className="empty-state">
                  <p>No conversations yet</p>
                  <small>Start a chat with your teammates</small>
                </div>
              ) : (
                conversations.map(conv => (
                  <div
                    key={conv._id}
                    className={`conversation-item ${selectedConversation?._id === conv._id ? 'active' : ''}`}
                    onClick={() => setSelectedConversation(conv)}
                  >
                    <div className="conversation-avatar">
                      {getConversationName(conv).charAt(0).toUpperCase()}
                    </div>
                    <div className="conversation-info">
                      <div className="conversation-header">
                        <span className="conversation-name">
                          {getConversationName(conv)}
                        </span>
                        <span className="conversation-time">
                          {conv.lastMessage?.timestamp && formatTime(conv.lastMessage.timestamp)}
                        </span>
                      </div>
                      <p className="conversation-preview">
                        {conv.lastMessage?.content || 'No messages yet'}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === 'users' && (
            <div className="users-list">
              <div className="search-box">
                <input
                  type="text"
                  placeholder="Search users..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              {filteredUsers.map(user => (
                <div key={user._id} className="user-item">
                  <div className="user-avatar">
                    {user.username?.charAt(0).toUpperCase()}
                  </div>
                  <div className="user-info">
                    <span className="user-name">{user.username}</span>
                    <small className="user-email">{user.email}</small>
                    {user.department && (
                      <small className="user-department">{user.department}</small>
                    )}
                  </div>
                  <button
                    className="btn-start-chat"
                    onClick={() => startDirectConversation(user._id)}
                    disabled={loading}
                  >
                    Chat
                  </button>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'invitations' && (
            <div className="invitations-panel">
              <form onSubmit={sendInvitation} className="invite-form">
                <input
                  type="email"
                  placeholder="Enter email address"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="invite-input"
                />
                <button type="submit" className="btn-invite" disabled={loading}>
                  {loading ? 'Sending...' : 'Send Invite'}
                </button>
              </form>

              <div className="invitations-list">
                <h4>Pending Invitations</h4>
                {invitations.length === 0 ? (
                  <p className="empty-state-small">No pending invitations</p>
                ) : (
                  invitations.map((inv, index) => {
                    const isExpired = new Date() > new Date(inv.expiresAt);
                    return (
                      <div key={index} className="invitation-item">
                        <div className="invitation-info">
                          <strong>{inv.email}</strong>
                          <small>Sent {formatTime(inv.invitedAt)}</small>
                          {isExpired && <small className="expired-text">Expired</small>}
                        </div>
                        <div className="invitation-actions">
                          {isExpired ? (
                            <button
                              className="btn-resend"
                              onClick={() => resendInvitation(inv.email)}
                              disabled={loading}
                            >
                              Resend
                            </button>
                          ) : (
                            <span className="invitation-status">Pending</span>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="messaging-main">
        {selectedConversation ? (
          <>
            <div className="messaging-header">
              <div className="conversation-header-info">
                <div className="conversation-avatar-large">
                  {getConversationName(selectedConversation).charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3>{getConversationName(selectedConversation)}</h3>
                  <small>
                    {selectedConversation.type === 'group'
                      ? `${selectedConversation.participants?.length} members`
                      : 'Direct Message'}
                  </small>
                </div>
              </div>
            </div>

            <div className="messages-container">
              {messages.length === 0 ? (
                <div className="empty-state-center">
                  <p>No messages yet</p>
                  <small>Start the conversation!</small>
                </div>
              ) : (
                messages.map((msg) => (
                  <div
                    key={msg._id}
                    className={`message ${msg.sender?._id === currentUser?.id || msg.sender?._id === currentUser?._id ? 'sent' : 'received'}`}
                  >
                    <div className="message-avatar">
                      {msg.sender?.username?.charAt(0).toUpperCase()}
                    </div>
                    <div className="message-content">
                      <div className="message-header">
                        <span className="message-sender">{msg.sender?.username}</span>
                        <span className="message-time">{formatTime(msg.createdAt)}</span>
                      </div>
                      <p className="message-text">{msg.content}</p>
                    </div>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            <form onSubmit={sendMessage} className="message-input-container">
              <input
                type="text"
                placeholder="Type a message..."
                value={messageInput}
                onChange={(e) => setMessageInput(e.target.value)}
                className="message-input"
              />
              <button type="submit" className="btn-send" disabled={!messageInput.trim()}>
                Send
              </button>
            </form>
          </>
        ) : (
          <div className="empty-state-center">
            <div className="empty-state-icon">💬</div>
            <h3>Select a conversation</h3>
            <p>Choose a conversation from the sidebar to start messaging</p>
          </div>
        )}
      </div>

      {showNewGroupModal && (
        <div className="modal-overlay" onClick={() => setShowNewGroupModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Create Group Chat</h3>
              <button className="modal-close" onClick={() => setShowNewGroupModal(false)}>
                ×
              </button>
            </div>
            <div className="modal-body">
              <input
                type="text"
                placeholder="Group name"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                className="group-name-input"
              />
              <div className="group-members-selection">
                <h4>Select Members (min 2)</h4>
                <div className="members-list">
                  {users.map(user => (
                    <label key={user._id} className="member-checkbox">
                      <input
                        type="checkbox"
                        checked={selectedUsers.includes(user._id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedUsers([...selectedUsers, user._id]);
                          } else {
                            setSelectedUsers(selectedUsers.filter(id => id !== user._id));
                          }
                        }}
                      />
                      <span>{user.username}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-cancel" onClick={() => setShowNewGroupModal(false)}>
                Cancel
              </button>
              <button
                className="btn-create"
                onClick={createGroupChat}
                disabled={loading || !groupName.trim() || selectedUsers.length < 2}
              >
                {loading ? 'Creating...' : 'Create Group'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Messaging;
