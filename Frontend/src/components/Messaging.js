import React, { useState, useEffect, useRef, useContext } from 'react';
import { toast } from 'sonner';
import { MessagingContext } from '../contexts/MessagingContext';
import MessageList from './MessageList';
import MessageInput from './MessageInput';
import ConversationList from './ConversationList';
import api from '../config/api';
import { MdSend } from 'react-icons/md';
import './Messaging.css';
// Group icon PNG imports
import groupIcon1 from './image/group-icons/group_icon (1).png';
import groupIcon2 from './image/group-icons/group_icon (2).png';
import groupIcon3 from './image/group-icons/group_icon (3).png';
import groupIcon4 from './image/group-icons/group_icon (4).png';
import groupIcon5 from './image/group-icons/group_icon (5).png';
import groupIcon6 from './image/group-icons/group_icon (6).png';
import groupIcon7 from './image/group-icons/group_icon (7).png';

// Available icons for group selection (7 PNG icons)
const AVAILABLE_ICONS = [
  { id: 1, name: 'group_icon (1).png', src: groupIcon1, label: 'Icon 1' },
  { id: 2, name: 'group_icon (2).png', src: groupIcon2, label: 'Icon 2' },
  { id: 3, name: 'group_icon (3).png', src: groupIcon3, label: 'Icon 3' },
  { id: 4, name: 'group_icon (4).png', src: groupIcon4, label: 'Icon 4' },
  { id: 5, name: 'group_icon (5).png', src: groupIcon5, label: 'Icon 5' },
  { id: 6, name: 'group_icon (6).png', src: groupIcon6, label: 'Icon 6' },
  { id: 7, name: 'group_icon (7).png', src: groupIcon7, label: 'Icon 7' }
];

// Helper function to get icon source from filename
const getGroupIconSrc = (iconName) => {
  const icon = AVAILABLE_ICONS.find(i => i.name === iconName);
  return icon ? icon.src : groupIcon1; // Default to first icon if not found
};

// Helper function to get random group icon
const getRandomGroupIcon = () => {
  const randomIndex = Math.floor(Math.random() * 7) + 1;
  return `group_icon (${randomIndex}).png`;
};

function Messaging() {
  const { socket, onlineUsers, typingUsers, isConnected, emitTypingStart, emitTypingStop } = useContext(MessagingContext);

  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [typingTimeout, setTypingTimeout] = useState(null);

  // Noxtm Bot Chat State
  const [noxtmConfig, setNoxtmConfig] = useState(null);
  const [noxtmMessages, setNoxtmMessages] = useState([]);
  const [noxtmInput, setNoxtmInput] = useState('');
  const [noxtmLoading, setNoxtmLoading] = useState(false);
  const [isNoxtmBotSelected, setIsNoxtmBotSelected] = useState(false);
  const noxtmMessagesEndRef = useRef(null);
  const noxtmInputRef = useRef(null);

  // Modal States
  const [showChatSettings, setShowChatSettings] = useState(false);
  const [showCreateGroupModal, setShowCreateGroupModal] = useState(false);
  const [showGroupInfo, setShowGroupInfo] = useState(false);

  // Chat Settings State
  const [chatSettings, setChatSettings] = useState({
    notifications: true,
    dataSharing: false,
    readReceipts: true,
    typingIndicator: true,
    tag: true
  });

  // Create Group State
  const [groupIcon, setGroupIcon] = useState('group_icon (1).png'); // Stores PNG filename
  const [groupName, setGroupName] = useState('');
  const [availableUsers, setAvailableUsers] = useState([]);
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [memberSearchQuery, setMemberSearchQuery] = useState('');

  const messagesEndRef = useRef(null);
  const selectedConversationRef = useRef(null);
  const currentUserRef = useRef(null);
  const chatSettingsRef = useRef(chatSettings);
  const conversationsRef = useRef(conversations);

  useEffect(() => {
    const userData = JSON.parse(localStorage.getItem('user') || '{}');
    setCurrentUser(userData);

    // Load chat settings from localStorage
    const savedSettings = localStorage.getItem('chatSettings');
    if (savedSettings) {
      setChatSettings(JSON.parse(savedSettings));
    }

    loadConversations();
    loadNoxtmConfig();

    // Cleanup: Clear active conversation when leaving messaging section
    return () => {
      console.log('🧹 Messaging component unmounting - clearing active conversation');
      sessionStorage.removeItem('activeConversationId');
    };
  }, []);

  // Close modals on ESC key
  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        setShowChatSettings(false);
        setShowCreateGroupModal(false);
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

  // Update refs when selectedConversation or currentUser changes
  useEffect(() => {
    selectedConversationRef.current = selectedConversation;
  }, [selectedConversation]);

  useEffect(() => {
    currentUserRef.current = currentUser;
  }, [currentUser]);

  useEffect(() => {
    chatSettingsRef.current = chatSettings;
  }, [chatSettings]);

  useEffect(() => {
    conversationsRef.current = conversations;
  }, [conversations]);

  // Listen for open conversation events (from toast notifications)
  useEffect(() => {
    const handleOpenConversation = (event) => {
      const { conversationId } = event.detail;
      const conversation = conversations.find(c => c._id === conversationId);
      if (conversation) {
        setSelectedConversation(conversation);
        // Close any open modals
        setShowChatSettings(false);
        setShowCreateGroupModal(false);
        setShowGroupInfo(false);
      }
    };

    window.addEventListener('messaging:openConversation', handleOpenConversation);
    return () => window.removeEventListener('messaging:openConversation', handleOpenConversation);
  }, [conversations]);

  // Listen for new messages from Socket.IO
  useEffect(() => {
    if (!socket) return;

    const handleNewMessage = (data) => {
      console.log('📩 New message received:', data);

      const isOwnMessage = data.message.sender._id === currentUserRef.current?._id;
      const isCurrentConversation = selectedConversationRef.current?._id === data.conversationId;

      // Note: Toast notifications are now handled globally by MessagingContext
      // This component only updates the UI for the current conversation

      // Update messages if it's for the currently selected conversation
      if (isCurrentConversation) {
        setMessages(prev => {
          // Check if message already exists by real ID to prevent duplicates
          const messageExists = prev.some(msg => msg._id === data.message._id);
          
          if (!messageExists) {
            console.log('➕ Adding new message to conversation');
            return [...prev, data.message];
          } else {
            console.log('⚠️ Message already exists, skipping duplicate');
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
              },
              // Increment unread count if not viewing this conversation and not own message
              unreadCount: (!isCurrentConversation && !isOwnMessage)
                ? (conv.unreadCount || 0) + 1
                : conv.unreadCount || 0
            };
          }
          return conv;
        });
      });
    };

    // Handle message edit
    const handleMessageEdit = (data) => {
      const { conversationId, messageId, content, isEdited, updatedAt } = data;

      // Update message in state if viewing this conversation
      if (selectedConversationRef.current?._id === conversationId) {
        setMessages(prev =>
          prev.map(msg =>
            msg._id === messageId
              ? { ...msg, content, isEdited, updatedAt }
              : msg
          )
        );
      }
    };

    // Handle message delete
    const handleMessageDelete = (data) => {
      const { conversationId, messageId, isDeleted, deletedAt } = data;

      // Update message in state if viewing this conversation
      if (selectedConversationRef.current?._id === conversationId) {
        setMessages(prev =>
          prev.map(msg =>
            msg._id === messageId
              ? { ...msg, content: 'This message was deleted', isDeleted, deletedAt }
              : msg
          )
        );
      }
    };

    // Handle message reaction
    const handleMessageReaction = (data) => {
      const { conversationId, messageId, reactions } = data;

      // Update message in state if viewing this conversation
      if (selectedConversationRef.current?._id === conversationId) {
        setMessages(prev =>
          prev.map(msg =>
            msg._id === messageId
              ? { ...msg, reactions }
              : msg
          )
        );
      }
    };

    // Handle unread count update
    const handleUnreadCountUpdate = (data) => {
      const { conversationId, unreadCount } = data;
      console.log('📊 Unread count update received:', data);

      setConversations(prevConversations => {
        return prevConversations.map(conv => {
          if (conv._id === conversationId) {
            return {
              ...conv,
              unreadCount: unreadCount
            };
          }
          return conv;
        });
      });
    };

    socket.on('new-message', handleNewMessage);
    socket.on('message-edited', handleMessageEdit);
    socket.on('message-deleted', handleMessageDelete);
    socket.on('message-reaction', handleMessageReaction);
    socket.on('unread-count-update', handleUnreadCountUpdate);

    return () => {
      socket.off('new-message', handleNewMessage);
      socket.off('message-edited', handleMessageEdit);
      socket.off('message-deleted', handleMessageDelete);
      socket.off('message-reaction', handleMessageReaction);
      socket.off('unread-count-update', handleUnreadCountUpdate);
    };
  }, [socket]);

  useEffect(() => {
    if (selectedConversation) {
      // Store active conversation ID in sessionStorage to prevent toast notifications
      sessionStorage.setItem('activeConversationId', selectedConversation._id);
      
      // Load messages first
      loadMessages(selectedConversation._id).then(() => {
        // Mark conversation as read after messages are loaded and displayed
        markConversationAsRead(selectedConversation._id);
      });

      // Join conversation room
      if (socket) {
        socket.emit('join-conversation', selectedConversation._id);
      }
    } else {
      // Clear active conversation ID when no conversation is selected
      sessionStorage.removeItem('activeConversationId');
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

  // === Noxtm Bot Chat Functions ===
  const loadNoxtmConfig = async () => {
    try {
      const res = await api.get('/noxtm-chat/config');
      if (res.data.success) setNoxtmConfig(res.data.config);
    } catch (err) {
      console.error('Failed to load Noxtm config:', err);
    }
  };

  const loadNoxtmHistory = async () => {
    try {
      const res = await api.get('/noxtm-chat/messages?limit=50');
      if (res.data.success) setNoxtmMessages(res.data.messages);
    } catch (err) {
      console.error('Failed to load Noxtm history:', err);
    }
  };

  const handleSelectNoxtmBot = () => {
    setSelectedConversation(null);
    setIsNoxtmBotSelected(true);
    loadNoxtmHistory();
    setTimeout(() => noxtmInputRef.current?.focus(), 100);
  };

  const handleSendNoxtm = async () => {
    if (!noxtmInput.trim() || noxtmLoading) return;
    const msg = noxtmInput.trim();
    setNoxtmInput('');

    const tempUserMsg = { _id: 'temp-' + Date.now(), role: 'user', content: msg, createdAt: new Date().toISOString() };
    setNoxtmMessages(prev => [...prev, tempUserMsg]);
    setNoxtmLoading(true);

    try {
      const res = await api.post('/noxtm-chat/send', { message: msg });
      if (res.data.success) {
        setNoxtmMessages(prev => {
          const filtered = prev.filter(m => m._id !== tempUserMsg._id);
          return [...filtered, res.data.userMessage, res.data.reply];
        });
      }
    } catch (err) {
      const errMsg = err.response?.data?.message || 'Failed to send message';
      toast.error(errMsg);
      setNoxtmMessages(prev => [
        ...prev,
        { _id: 'err-' + Date.now(), role: 'assistant', content: errMsg, createdAt: new Date().toISOString() }
      ]);
    } finally {
      setNoxtmLoading(false);
    }
  };

  const handleNoxtmKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendNoxtm();
    }
  };

  // Auto-scroll noxtm messages
  useEffect(() => {
    if (isNoxtmBotSelected) {
      noxtmMessagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [noxtmMessages, noxtmLoading, isNoxtmBotSelected]);

  // Bot config derived values
  const botName = noxtmConfig?.botName || 'Navraj Panwar';
  const botPicture = noxtmConfig?.botProfilePicture || '';
  const botInitials = botName.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase();

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

  const markConversationAsRead = async (conversationId) => {
    try {
      await api.post(`/messaging/conversations/${conversationId}/mark-read`);

      // Reset unread count in local state after successfully marking as read
      setConversations(prevConversations => {
        return prevConversations.map(conv => {
          if (conv._id === conversationId) {
            return {
              ...conv,
              unreadCount: 0
            };
          }
          return conv;
        });
      });

      // Emit event to notify Sidebar to update unread count instantly
      window.dispatchEvent(new CustomEvent('conversation:markedAsRead', {
        detail: { conversationId }
      }));
    } catch (error) {
      console.error('Mark as read error:', error);
    }
  };

  const handleSelectConversation = (conversation) => {
    setIsNoxtmBotSelected(false);
    setSelectedConversation(conversation);
    // Note: Unread count will be reset when messages are loaded and marked as read
  };

  const handleCreateGroup = () => {
    // Auto-assign random group icon
    setGroupIcon(getRandomGroupIcon());
    setShowCreateGroupModal(true);
    loadAvailableUsers();
  };

  const handleOpenChatSettings = () => {
    setShowChatSettings(true);
  };

  const handleOpenGroupInfo = () => {
    if (selectedConversation && (selectedConversation.type === 'group' || !selectedConversation.isDirectMessage)) {
      setShowGroupInfo(true);
    }
  };

  const handleDeleteGroup = async () => {
    if (!selectedConversation) return;

    const confirmed = window.confirm('Are you sure you want to delete this group? This action cannot be undone.');
    if (!confirmed) return;

    try {
      await api.delete(`/messaging/conversations/${selectedConversation._id}`);
      toast.success('Group deleted successfully');

      // Clear selected conversation
      setSelectedConversation(null);
      setShowGroupInfo(false);

      // Reload conversations
      loadConversations();
    } catch (error) {
      console.error('Delete group error:', error);
      toast.error(error.response?.data?.message || 'Failed to delete group');
    }
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
      console.log('Loading available users...');
      console.log('Current user:', currentUser);

      const response = await api.get('/users');
      const users = response.data.users || response.data || [];
      console.log('Fetched users from API:', users.length, users);

      // Get current user's company ID
      const currentUserId = currentUser?.id || currentUser?._id;
      const currentUserCompanyId = currentUser?.company?._id || currentUser?.company?.id || currentUser?.companyId;

      console.log('Current User ID:', currentUserId);
      console.log('Current User Company ID:', currentUserCompanyId);

      // Filter users: exclude current user AND only show users from same company
      const filteredUsers = users.filter(user => {
        const userId = user._id || user.id;
        const userCompanyId = user.company?._id || user.company?.id || user.companyId;

        console.log(`Checking user ${user.firstName} ${user.lastName}:`, {
          userId,
          userCompanyId,
          isSameCompany: userCompanyId?.toString() === currentUserCompanyId?.toString(),
          isCurrentUser: userId?.toString() === currentUserId?.toString()
        });

        // Exclude current user
        if (userId?.toString() === currentUserId?.toString()) {
          return false;
        }

        // Only include users from the same company
        if (currentUserCompanyId && userCompanyId) {
          return userCompanyId?.toString() === currentUserCompanyId?.toString();
        }

        // If no company ID, don't include (safety measure)
        return false;
      });

      console.log('Filtered users for group creation:', filteredUsers.length, filteredUsers);
      setAvailableUsers(filteredUsers);

      if (filteredUsers.length === 0) {
        console.warn('No users available to add to group!');
      }
    } catch (error) {
      console.error('Error loading users:', error);
      console.error('Error details:', error.response?.data || error.message);
      toast.error('Failed to load users');
      setAvailableUsers([]);
    }
  };

  const handleToggleMember = (user) => {
    console.log('Toggle member clicked:', user);
    const userId = user._id || user.id;
    const isSelected = selectedMembers.some(m => (m._id || m.id) === userId);

    console.log('User ID:', userId, 'Is already selected:', isSelected);

    if (isSelected) {
      const updatedMembers = selectedMembers.filter(m => (m._id || m.id) !== userId);
      console.log('Removing member. Updated list:', updatedMembers);
      setSelectedMembers(updatedMembers);
    } else {
      const updatedMembers = [...selectedMembers, user];
      console.log('Adding member. Updated list:', updatedMembers);
      setSelectedMembers(updatedMembers);
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
        type: 'group',
        name: groupName,
        participantIds: memberIds,
        groupIcon: groupIcon
      });

      toast.success('Group created successfully!');

      // Reset form
      setGroupName('');
      setGroupIcon(getRandomGroupIcon()); // Reset to random icon for next use
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

    try {
      console.log('📤 Sending message:', {
        conversationId: selectedConversation._id,
        content: content.substring(0, 50)
      });

      // Send message to server - don't add locally, let socket event handle it
      const response = await api.post(`/messaging/conversations/${selectedConversation._id}/messages`, {
        content
      });

      console.log('✅ Message sent successfully:', response.data);
      
      // Message will be added to UI via socket 'new-message' event
      // No local update needed - prevents duplicates
      
    } catch (error) {
      console.error('❌ Send message error:', error);

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

  // Handle file upload
  const handleSendFile = async (file, caption) => {
    if (!selectedConversation) {
      toast.error('Please select a conversation first');
      return;
    }

    try {
      const formData = new FormData();
      formData.append('file', file);
      if (caption) formData.append('content', caption);

      console.log('📎 Uploading file:', file.name);

      const response = await api.post(
        `/messaging/conversations/${selectedConversation._id}/messages/upload`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        }
      );

      console.log('✅ File uploaded successfully');

      const newMessage = response.data.data || response.data.message;
      setMessages(prev => [...prev, newMessage]);

      toast.success('File sent successfully');
    } catch (error) {
      console.error('❌ File upload error:', error);
      toast.error(error.response?.data?.message || 'Failed to upload file');
    }
  };

  // Handle edit message
  const handleEditMessage = async (messageId, newContent) => {
    if (!selectedConversation) return;

    try {
      console.log('✏️ Editing message:', messageId);

      const response = await api.put(
        `/messaging/conversations/${selectedConversation._id}/messages/${messageId}`,
        { content: newContent }
      );

      console.log('✅ Message edited successfully');

      const updatedMessage = response.data.data || response.data.message;

      // Update message in state
      setMessages(prev =>
        prev.map(msg => (msg._id === messageId ? updatedMessage : msg))
      );

      toast.success('Message edited');
    } catch (error) {
      console.error('❌ Edit message error:', error);
      toast.error(error.response?.data?.message || 'Failed to edit message');
    }
  };

  // Handle delete message
  const handleDeleteMessage = async (messageId) => {
    if (!selectedConversation) return;

    try {
      console.log('🗑️ Deleting message:', messageId);

      const response = await api.delete(
        `/messaging/conversations/${selectedConversation._id}/messages/${messageId}`
      );

      console.log('✅ Message deleted successfully');

      const deletedMessage = response.data.data || response.data.message;

      // Update message in state (soft delete - mark as deleted)
      setMessages(prev =>
        prev.map(msg => (msg._id === messageId ? deletedMessage : msg))
      );

      toast.success('Message deleted');
    } catch (error) {
      console.error('❌ Delete message error:', error);
      toast.error(error.response?.data?.message || 'Failed to delete message');
    }
  };

  // Handle reaction to message
  const handleReactToMessage = async (messageId, emoji) => {
    if (!selectedConversation) return;

    try {
      console.log('👍 Reacting to message:', messageId, emoji);

      const response = await api.post(
        `/messaging/conversations/${selectedConversation._id}/messages/${messageId}/react`,
        { emoji }
      );

      console.log('✅ Reaction added successfully');

      const updatedMessage = response.data.data || response.data.message;

      // Update message in state
      setMessages(prev =>
        prev.map(msg => (msg._id === messageId ? updatedMessage : msg))
      );
    } catch (error) {
      console.error('❌ Reaction error:', error);
      toast.error(error.response?.data?.message || 'Failed to add reaction');
    }
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
          onOpenChatSettings={handleOpenChatSettings}
          getGroupIconSrc={getGroupIconSrc}
          noxtmConfig={noxtmConfig}
          isNoxtmBotSelected={isNoxtmBotSelected}
          onSelectNoxtmBot={handleSelectNoxtmBot}
        />
      </div>

      {/* Right Side - Chat Area */}
      <div className="messaging-main">
        {showChatSettings ? (
          /* Chat Settings View */
          <div className="settings-main-view">
            <div className="settings-header">
              <button
                className="back-button"
                onClick={() => setShowChatSettings(false)}
                title="Back"
              >
                <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z"/>
                </svg>
              </button>
              <h2>Chat Settings & Privacy</h2>
            </div>

            <div className="settings-content">
              {/* Notification Settings */}
              <div className="setting-item">
                <div className="setting-info">
                  <div className="setting-icon">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                      <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
                    </svg>
                  </div>
                  <div>
                    <label>Notification Settings</label>
                    <p>When a chat arrives you will be notified</p>
                  </div>
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
                  <div className="setting-icon">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                      <polyline points="22,6 12,13 2,6"></polyline>
                    </svg>
                  </div>
                  <div>
                    <label>Data Sharing</label>
                    <p>Data sharing for business activities</p>
                  </div>
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
                  <div className="setting-icon">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                  </div>
                  <div>
                    <label>Read Receipts</label>
                    <p>Others can see when you've read their messages</p>
                  </div>
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
                  <div className="setting-icon">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
                    </svg>
                  </div>
                  <div>
                    <label>Typing Indicator</label>
                    <p>Others can see when you're typing</p>
                  </div>
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
                  <div className="setting-icon">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path>
                      <line x1="7" y1="7" x2="7.01" y2="7"></line>
                    </svg>
                  </div>
                  <div>
                    <label>Tag</label>
                    <p>Others can tag you in the group</p>
                  </div>
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
        ) : showGroupInfo && selectedConversation && (selectedConversation.type === 'group' || !selectedConversation.isDirectMessage) ? (
          /* Group Info View */
          <div className="group-info-view">
            <div className="group-info-header">
              <button className="back-button" onClick={() => setShowGroupInfo(false)}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M19 12H5M12 19l-7-7 7-7"/>
                </svg>
              </button>
              <h2>Group Info</h2>
            </div>
            <div className="group-info-content">
              <div className="group-info-top-section">
                <div className="group-info-main">
                  <div className="group-icon-display">
                    {selectedConversation.groupIcon ? (
                      <img src={getGroupIconSrc(selectedConversation.groupIcon)} alt="Group icon" />
                    ) : (
                      <div className="default-group-icon">#</div>
                    )}
                  </div>
                  <div className="group-info-text">
                    <h3 className="group-name">{selectedConversation.name || 'Group Chat'}</h3>
                    <p className="created-by-text">Created by :</p>
                  </div>
                </div>
                <div className="group-created-date">
                  {new Date(selectedConversation.createdAt).toLocaleDateString('en-US', {
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric'
                  })}
                </div>
              </div>

              <div className="group-members-header">
                <h4 className="group-members-title">
                  Group Member's : <span className="members-count">{selectedConversation.participants?.length || 0}</span>
                </h4>
                <button className="edit-group-btn">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                  </svg>
                  Edit Group
                </button>
              </div>

              <div className="members-list">
                {selectedConversation.participants?.map((participant, index) => {
                  const user = participant.user || participant;
                  const isAdmin = index === 0; // First user is admin for demo
                  return (
                    <div key={user._id || user.id} className="member-item">
                      <div className="member-avatar-circle">
                        {user.fullName?.charAt(0)?.toUpperCase() || 'U'}
                      </div>
                      <div className="member-info">
                        <p className="member-name">{user.fullName || 'Unknown'}</p>
                        <p className="member-email">{user.email}</p>
                      </div>
                      {isAdmin && <span className="admin-badge">Admin</span>}
                    </div>
                  );
                })}
              </div>

              <div className="delete-group-section">
                <p className="delete-warning">Once deleted, all messages and members will be removed permanently.</p>
                <button className="delete-group-btn" onClick={handleDeleteGroup}>
                  Delete Group
                </button>
              </div>
            </div>
          </div>
        ) : isNoxtmBotSelected ? (
          /* Noxtm Bot Chat View */
          <>
            <div className="messaging-header">
              <div className="chat-header-info">
                <div className="chat-avatar-container">
                  <div className="chat-avatar online">
                    {botPicture ? (
                      <img src={botPicture} alt={botName} style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                    ) : (
                      <span className="avatar-fallback" style={{ display: 'flex' }}>{botInitials}</span>
                    )}
                  </div>
                  <div className="status-dot online" />
                </div>
                <div className="chat-header-text">
                  <h3 className="chat-header-name">{botName}</h3>
                  <span className="user-status online">Online</span>
                </div>
              </div>
            </div>

            <div className="messaging-body noxtm-bot-messages">
              {noxtmMessages.length === 0 ? (
                <div className="noxtm-bot-welcome">
                  <div className="noxtm-bot-welcome-avatar">
                    {botPicture ? (
                      <img src={botPicture} alt={botName} />
                    ) : (
                      <span>{botInitials}</span>
                    )}
                  </div>
                  <h4>{botName}</h4>
                  <p>{noxtmConfig?.welcomeMessage || `Hi! I'm ${botName}. How can I help you?`}</p>
                </div>
              ) : (
                noxtmMessages.map((msg) => (
                  <div key={msg._id} className={`noxtm-bot-msg ${msg.role}`}>
                    {msg.role === 'assistant' && (
                      <div className="noxtm-bot-msg-avatar">
                        {botPicture ? (
                          <img src={botPicture} alt={botName} />
                        ) : (
                          <span>{botInitials}</span>
                        )}
                      </div>
                    )}
                    <div className="noxtm-bot-msg-content">
                      <div className="noxtm-bot-msg-bubble" style={{ whiteSpace: 'pre-wrap' }}>{msg.content}</div>
                      <div className="noxtm-bot-msg-time">
                        {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  </div>
                ))
              )}
              {noxtmLoading && (
                <div className="noxtm-bot-msg assistant">
                  <div className="noxtm-bot-msg-avatar">
                    {botPicture ? <img src={botPicture} alt={botName} /> : <span>{botInitials}</span>}
                  </div>
                  <div className="noxtm-bot-msg-content">
                    <div className="noxtm-bot-typing"><span></span><span></span><span></span></div>
                  </div>
                </div>
              )}
              <div ref={noxtmMessagesEndRef} />
            </div>

            <div className="messaging-footer noxtm-bot-footer">
              <div className="noxtm-bot-input-wrapper">
                <input
                  ref={noxtmInputRef}
                  type="text"
                  value={noxtmInput}
                  onChange={(e) => setNoxtmInput(e.target.value)}
                  onKeyPress={handleNoxtmKeyPress}
                  placeholder={`Message ${botName.split(' ')[0]}...`}
                  disabled={noxtmLoading}
                  maxLength={2000}
                  className="noxtm-bot-input"
                />
                <button
                  onClick={handleSendNoxtm}
                  disabled={!noxtmInput.trim() || noxtmLoading}
                  className="noxtm-bot-send-btn"
                >
                  <MdSend size={18} />
                </button>
              </div>
            </div>
          </>
        ) : selectedConversation ? (
          <>
            {/* Chat Header */}
            <div className="messaging-header">
              <div
                className={`chat-header-info ${!selectedConversation.isDirectMessage ? 'clickable' : ''}`}
                onClick={!selectedConversation.isDirectMessage ? handleOpenGroupInfo : undefined}
                style={!selectedConversation.isDirectMessage ? { cursor: 'pointer' } : {}}
              >
                {selectedConversation.isDirectMessage ? (
                  <>
                    {(() => {
                      const otherUser = getOtherParticipant(selectedConversation);
                      const userId = otherUser?._id || otherUser?.id;
                      const online = isUserOnline(userId);
                      
                      // Get profile image
                      let profileImage = otherUser?.profileImage || otherUser?.avatarUrl || otherUser?.image || otherUser?.photoUrl;
                      const isDevelopment = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
                      const apiBaseUrl = isDevelopment ? 'http://localhost:5000' : '';
                      
                      if (profileImage && !profileImage.startsWith('http') && !profileImage.startsWith('data:')) {
                        profileImage = `${apiBaseUrl}${profileImage}`;
                      }

                      return (
                        <>
                          <div className="chat-avatar-container">
                            <div className={`chat-avatar ${online ? 'online' : ''}`}>
                              {profileImage ? (
                                <img src={profileImage} alt={otherUser?.fullName} onError={(e) => {
                                  e.target.style.display = 'none';
                                  e.target.nextSibling.style.display = 'flex';
                                }} />
                              ) : null}
                              <span className="avatar-fallback" style={{ display: profileImage ? 'none' : 'flex' }}>
                                {otherUser?.fullName?.charAt(0)?.toUpperCase() || 'U'}
                              </span>
                            </div>
                            <div className={`status-dot ${online ? 'online' : 'offline'}`} />
                          </div>
                          <div className="chat-header-text">
                            <h3 className="chat-header-name">{otherUser?.fullName || 'Unknown User'}</h3>
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
                    <div className="chat-avatar">
                      {selectedConversation.groupIcon ? (
                        <img src={getGroupIconSrc(selectedConversation.groupIcon)} alt="Group icon" />
                      ) : (
                        '#'
                      )}
                    </div>
                    <div className="chat-header-text">
                      <h3 className="chat-header-name">{selectedConversation.name || 'Group Chat'}</h3>
                      <span className="group-members-count">
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
                  onEditMessage={handleEditMessage}
                  onDeleteMessage={handleDeleteMessage}
                  onReactToMessage={handleReactToMessage}
                  onlineUsers={onlineUsers}
                />
              )}
            </div>

            {/* Message Input */}
            <div className="messaging-footer">
              <MessageInput
                onSendMessage={handleSendMessage}
                onSendFile={handleSendFile}
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

      {/* Create Group Modal */}
      {showCreateGroupModal && (
        <div className="noxtm-overlay" onClick={() => setShowCreateGroupModal(false)}>
          <div className="popup-x-msg-modal" onClick={(e) => e.stopPropagation()}>
            <div className="popup-x-msg-header">
              <h3>Create Group</h3>
              <button
                className="popup-x-msg-close-button"
                onClick={() => setShowCreateGroupModal(false)}
              >
                <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z"/>
                </svg>
              </button>
            </div>

            <div className="popup-x-msg-content">
              {/* Group Name */}
              <div className="popup-x-msg-form-group">
                <label htmlFor="group-name">Group Name</label>
                <input
                  type="text"
                  id="group-name"
                  placeholder="Enter group name"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  className="popup-x-msg-input"
                />
              </div>

              {/* Add Members */}
              <div className="popup-x-msg-form-group">
                <label>Add Members</label>
                <input
                  type="text"
                  placeholder="Search users..."
                  value={memberSearchQuery}
                  onChange={(e) => setMemberSearchQuery(e.target.value)}
                  className="popup-x-msg-input"
                />
              </div>

              {/* Selected Members */}
              {selectedMembers.length > 0 && (
                <div className="popup-x-msg-selected-members">
                  <label>Selected Members ({selectedMembers.length})</label>
                  <div className="popup-x-msg-selected-list">
                    {selectedMembers.map(member => (
                      <div key={member._id || member.id} className="popup-x-msg-member-chip">
                        <span>{member.fullName || member.email}</span>
                        <button
                          onClick={() => handleToggleMember(member)}
                          className="popup-x-msg-remove-btn"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Available Users List */}
              <div className="popup-x-msg-members-list">
                {filteredAvailableUsers.length > 0 ? (
                  filteredAvailableUsers.map(user => {
                    const userId = user._id || user.id;
                    const isSelected = selectedMembers.some(m => (m._id || m.id) === userId);

                    return (
                      <div
                        key={userId}
                        className={`popup-x-msg-member-item ${isSelected ? 'selected' : ''}`}
                        onClick={() => handleToggleMember(user)}
                      >
                        <div className="popup-x-msg-member-avatar">
                          {user.fullName?.charAt(0)?.toUpperCase() || 'U'}
                        </div>
                        <div className="popup-x-msg-member-info">
                          <div className="popup-x-msg-member-name">{user.fullName || 'Unknown'}</div>
                          <div className="popup-x-msg-member-email">{user.email}</div>
                        </div>
                        <div className="popup-x-msg-member-checkbox">
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
                  <div className="popup-x-msg-no-users">
                    {memberSearchQuery
                      ? 'No users found matching your search'
                      : availableUsers.length === 0
                        ? 'No users available. Make sure you have colleagues in your company.'
                        : 'Loading users...'}
                  </div>
                )}
              </div>
            </div>

            <div className="popup-x-msg-footer">
              <button
                className="popup-x-msg-btn-cancel"
                onClick={() => setShowCreateGroupModal(false)}
              >
                Cancel
              </button>
              <button
                className="popup-x-msg-btn-create"
                onClick={handleCreateGroupSubmit}
                disabled={!groupName.trim() || selectedMembers.length === 0}
              >
                Create Group
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Messaging;
