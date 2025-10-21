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

  const messagesEndRef = useRef(null);
  const selectedConversationRef = useRef(null);

  useEffect(() => {
    const userData = JSON.parse(localStorage.getItem('user') || '{}');
    setCurrentUser(userData);

    loadConversations();
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
    toast.info('Group creation feature coming soon!');
  };

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
    </div>
  );
}

export default Messaging;
