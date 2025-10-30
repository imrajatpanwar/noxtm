import React, { createContext, useState, useEffect, useCallback, useRef } from 'react';
import { io } from 'socket.io-client';
import { toast } from 'sonner';
import axios from 'axios';
import notificationSound from '../components/assets/notification.mp3';

export const MessagingContext = createContext({
  socket: null,
  onlineUsers: [],
  unreadCount: 0,
  typingUsers: {},
  incrementUnread: () => {},
  resetUnread: () => {},
  setUserOnline: () => {},
  setUserOffline: () => {}
});

// Helper function to get the Socket.IO server URL
const getSocketUrl = () => {
  const isDevelopment = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  // In production, use relative path (same as API config)
  // Socket.IO will connect to the same host/port as the frontend
  return isDevelopment ? 'http://localhost:5000' : window.location.origin;
};

export function MessagingProvider({ children }) {
  const [socket, setSocket] = useState(null);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [typingUsers, setTypingUsers] = useState({});
  const [isConnected, setIsConnected] = useState(false);
  const [conversations, setConversations] = useState([]);
  const [chatSettings, setChatSettings] = useState({
    notifications: true,
    dataSharing: false,
    readReceipts: true,
    typingIndicator: true,
    tag: true
  });
  const socketRef = useRef(null);
  const conversationsRef = useRef(conversations);
  const chatSettingsRef = useRef(chatSettings);

  // Create singleton audio instance for notification sound
  const [notificationAudio] = useState(() => {
    const audio = new Audio(notificationSound);
    audio.volume = 0.5;  // 50% volume
    audio.preload = 'auto';
    return audio;
  });

  // Function to play notification sound
  const playNotificationSound = useCallback(() => {
    if (notificationAudio) {
      notificationAudio.currentTime = 0;  // Reset to start
      notificationAudio.play().catch(error => {
        // Silently handle autoplay restrictions
        console.log('Audio play prevented:', error.message);
      });
    }
  }, [notificationAudio]);

  // Load chat settings from localStorage on mount
  useEffect(() => {
    const savedSettings = localStorage.getItem('chatSettings');
    if (savedSettings) {
      const parsed = JSON.parse(savedSettings);

      // DEBUG: Log loaded settings
      console.log('🔧 Loaded chat settings from localStorage:', parsed);
      console.log('🔧 Notifications enabled?', parsed.notifications);

      // FORCE ENABLE notifications if disabled (for debugging toast issues)
      if (parsed.notifications === false) {
        console.warn('⚠️ Notifications were disabled in localStorage. Forcing ON for debugging.');
        parsed.notifications = true;
        localStorage.setItem('chatSettings', JSON.stringify(parsed));
      }

      setChatSettings(parsed);
      chatSettingsRef.current = parsed;
    } else {
      // First time: Save default settings to localStorage
      const defaultSettings = {
        notifications: true,
        dataSharing: false,
        readReceipts: true,
        typingIndicator: true,
        tag: true
      };
      console.log('💾 No saved settings found. Using defaults:', defaultSettings);
      localStorage.setItem('chatSettings', JSON.stringify(defaultSettings));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep refs synchronized
  useEffect(() => {
    conversationsRef.current = conversations;
  }, [conversations]);

  useEffect(() => {
    chatSettingsRef.current = chatSettings;
  }, [chatSettings]);

  // Initialize socket connection IMMEDIATELY for real-time messaging
  useEffect(() => {
    const t0 = performance.now();
    let newSocket = null;

    const initializeMessaging = async () => {
      // Step 1: Load cached conversations immediately for instant availability
      const cachedConversations = localStorage.getItem('cachedConversations');
      if (cachedConversations) {
        try {
          const parsed = JSON.parse(cachedConversations);
          setConversations(parsed);
          conversationsRef.current = parsed;
          console.log(`⚡ [T=${(performance.now() - t0).toFixed(0)}ms] Loaded ${parsed.length} cached conversations`);
        } catch (e) {
          console.error('Cache parse error:', e);
        }
      }

      // Step 2: Connect socket IMMEDIATELY (don't wait for API!)
      const socketUrl = getSocketUrl();
      console.log(`🔌 [T=${(performance.now() - t0).toFixed(0)}ms] Connecting socket immediately...`);

      newSocket = io(socketUrl, {
        transports: ['polling', 'websocket'],  // ⚡ Start with polling (more stable), upgrade to WebSocket
        withCredentials: true,
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionAttempts: 10,
        reconnectionDelayMax: 5000,
        randomizationFactor: 0.5,
        timeout: 20000,             // 20 second timeout
        upgrade: true,              // Allow transport upgrades to WebSocket
        rememberUpgrade: true,      // Cache successful WebSocket connection
        autoConnect: true           // Connect immediately
      });

      socketRef.current = newSocket;
      setSocket(newSocket);

      // Step 3: Load fresh conversations from API (in parallel, non-blocking!)
      const loadConversationsAsync = async () => {
        try {
          const token = localStorage.getItem('token');
          if (token) {
            console.log(`📋 [T=${(performance.now() - t0).toFixed(0)}ms] Fetching conversations (async)...`);
            const response = await axios.get('/api/messaging/conversations', {
              headers: { Authorization: `Bearer ${token}` }
            });

            if (response.data.conversations) {
              setConversations(response.data.conversations);
              conversationsRef.current = response.data.conversations;
              // Update cache
              localStorage.setItem('cachedConversations', JSON.stringify(response.data.conversations));
              console.log(`✅ [T=${(performance.now() - t0).toFixed(0)}ms] Loaded ${response.data.conversations.length} fresh conversations`);
            }
          }
        } catch (error) {
          console.error('Error loading conversations:', error);
          // Socket still works even if API fails!
        }
      };

      // Start loading conversations in the background (non-blocking)
      loadConversationsAsync();

    const registerUserOnline = () => {
      // Get current user from localStorage
      const userData = JSON.parse(localStorage.getItem('user') || '{}');
      if (userData.id || userData._id) {
        const userId = (userData.id || userData._id).toString();
        // Emit user-online event
        newSocket.emit('user-online', userId);
        console.log('👤 MessagingContext: User online event sent:', userId);

        // Store userId in socket for later reference
        newSocket.userId = userId;
      }
    };

    newSocket.on('connect', () => {
      console.log(`✅ [T=${(performance.now() - t0).toFixed(0)}ms] Socket connected! Ready to receive messages 🚀`);
      setIsConnected(true);
      registerUserOnline();
    });

    newSocket.on('reconnect', (attemptNumber) => {
      console.log(`🔄 MessagingContext: Reconnected after ${attemptNumber} attempts`);
      setIsConnected(true);
      registerUserOnline();

      // Dispatch reconnection event for components to rejoin rooms
      window.dispatchEvent(new CustomEvent('socket:reconnected'));
    });

    newSocket.on('disconnect', (reason) => {
      console.log('❌ MessagingContext: Disconnected from Socket.IO. Reason:', reason);
      setIsConnected(false);
      window.dispatchEvent(new CustomEvent('socket:disconnected', { detail: { reason } }));
    });

    newSocket.on('connect_error', (error) => {
      console.error('🔴 Socket connection error:', error.message);
      console.error('Error details:', error);
    });

    newSocket.on('error', (error) => {
      console.error('🔴 Socket error:', error);
    });

    // Listen for initial online users list
    newSocket.on('online-users-list', (data) => {
      console.log('📋 MessagingContext: Received online users list:', data.onlineUsers);
      // Convert all IDs to strings for consistent comparison
      const onlineUserIds = (data.onlineUsers || []).map(id => id.toString());
      setOnlineUsers(onlineUserIds);
    });

    // Listen for user status changes
    newSocket.on('user-status-changed', (data) => {
      console.log('👤 MessagingContext: User status changed:', data);
      const { userId, status } = data;
      const userIdStr = userId.toString();

      if (status === 'online') {
        setOnlineUsers(prev => {
          if (!prev.includes(userIdStr)) {
            console.log('➕ Adding user to online list:', userIdStr);
            return [...prev, userIdStr];
          }
          return prev;
        });
      } else if (status === 'offline') {
        console.log('➖ Removing user from online list:', userIdStr);
        setOnlineUsers(prev => prev.filter(id => id !== userIdStr));
      }
    });

    // Listen for typing indicators
    newSocket.on('user-typing', (data) => {
      const { conversationId, userId, userName, isTyping } = data;
      console.log('⌨️ MessagingContext: User typing:', { conversationId, userId, isTyping });

      setTypingUsers(prev => {
        const newTypingUsers = { ...prev };
        if (isTyping) {
          newTypingUsers[conversationId] = {
            userId,
            userName,
            timestamp: Date.now()
          };
        } else {
          delete newTypingUsers[conversationId];
        }
        return newTypingUsers;
      });

      // Auto-clear typing indicator after 3 seconds
      if (isTyping) {
        setTimeout(() => {
          setTypingUsers(prev => {
            const newTypingUsers = { ...prev };
            if (newTypingUsers[conversationId]?.userId === userId) {
              delete newTypingUsers[conversationId];
            }
            return newTypingUsers;
          });
        }, 3000);
      }
    });

    // Listen for new messages (for unread count and toast notifications)
    newSocket.on('new-message', (data) => {
      console.log('📩 MessagingContext: New message received', data);

      // Get current user
      const userData = JSON.parse(localStorage.getItem('user') || '{}');
      const currentUserId = (userData.id || userData._id)?.toString();
      const messageSenderId = data.message.sender._id?.toString();
      const isOwnMessage = currentUserId && messageSenderId && currentUserId === messageSenderId;

      // DEBUG: Log message arrival details
      console.log('🔍 Debug - Current user ID:', currentUserId);
      console.log('🔍 Debug - Message sender ID:', messageSenderId);
      console.log('🔍 Debug - Is own message?', isOwnMessage);
      console.log('🔍 Debug - Notifications enabled?', chatSettingsRef.current.notifications);
      console.log('🔍 Debug - Should show toast?', !isOwnMessage && chatSettingsRef.current.notifications);

      // Only dispatch if message is NOT from current user
      if (!isOwnMessage) {
        console.log('📬 Dispatching unread message event for Sidebar badge');
        window.dispatchEvent(new CustomEvent('messaging:newMessage', {
          detail: data
        }));

        // Show toast notification if notifications are enabled
        if (chatSettingsRef.current.notifications) {
          console.log('🔔 Showing toast notification for new message');

          // Find the conversation to get its name
          const conversation = conversationsRef.current.find(c => c._id === data.conversationId);

          // Smart fallback for conversation name:
          // 1. Try conversation.name (for group chats)
          // 2. Try to find the other participant's name (for 1-on-1 chats)
          // 3. Use sender's name directly as fallback
          // 4. Last resort: "New Message"
          let conversationName = 'New Message';

          if (conversation?.name) {
            // Group chat with a name
            conversationName = conversation.name;
          } else if (conversation?.participants) {
            // 1-on-1 chat: find the other person
            const otherParticipant = conversation.participants.find(p => p._id !== currentUserId);
            if (otherParticipant?.fullName) {
              conversationName = otherParticipant.fullName;
            }
          } else if (data.message.sender?.fullName) {
            // Fallback: use sender's name directly from the message data
            conversationName = data.message.sender.fullName;
          }

          // Truncate message content for preview
          const messagePreview = data.message.content.length > 50
            ? data.message.content.substring(0, 50) + '...'
            : data.message.content;

          // Show toast with sender name and message preview
          toast.info(
            `${data.message.sender.fullName}: ${messagePreview}`,
            {
              description: conversationName !== data.message.sender.fullName ? `in ${conversationName}` : '',
              duration: 4000
            }
          );

          // Play notification sound
          playNotificationSound();

          console.log('✅ Toast shown for message from:', data.message.sender.fullName, 'in:', conversationName);
        }
      } else {
        console.log('📭 Skipping badge update (message from current user)');
      }
    });

    // Listen for message edits
    newSocket.on('message-edited', (data) => {
      console.log('✏️ MessagingContext: Message edited', data);
      window.dispatchEvent(new CustomEvent('messaging:messageEdited', {
        detail: data
      }));
    });

    // Listen for message deletes
    newSocket.on('message-deleted', (data) => {
      console.log('🗑️ MessagingContext: Message deleted', data);
      window.dispatchEvent(new CustomEvent('messaging:messageDeleted', {
        detail: data
      }));
    });

    // Listen for message reactions
    newSocket.on('message-reaction', (data) => {
      console.log('👍 MessagingContext: Message reaction', data);
      window.dispatchEvent(new CustomEvent('messaging:messageReaction', {
        detail: data
      }));
    });

    };

    // Initialize everything
    initializeMessaging();

    // Cleanup on unmount
    return () => {
      console.log('🧹 MessagingContext: Cleaning up socket connection');
      if (newSocket) {
        newSocket.disconnect();
      }
    };
  }, [playNotificationSound]);

  const incrementUnread = useCallback((by = 1) => {
    setUnreadCount(prev => prev + by);
  }, []);

  const resetUnread = useCallback(() => {
    setUnreadCount(0);
  }, []);

  const setUserOnline = useCallback((userId) => {
    setOnlineUsers(prev => {
      if (!prev.includes(userId)) {
        return [...prev, userId];
      }
      return prev;
    });
  }, []);

  const setUserOffline = useCallback((userId) => {
    setOnlineUsers(prev => prev.filter(id => id !== userId));
  }, []);

  // Helper to emit typing events
  const emitTypingStart = useCallback((conversationId, userId, userName) => {
    if (socketRef.current) {
      socketRef.current.emit('typing-start', { conversationId, userId, userName });
    }
  }, []);

  const emitTypingStop = useCallback((conversationId, userId) => {
    if (socketRef.current) {
      socketRef.current.emit('typing-stop', { conversationId, userId });
    }
  }, []);

  const value = {
    socket,
    onlineUsers,
    unreadCount,
    typingUsers,
    isConnected,
    incrementUnread,
    resetUnread,
    setUserOnline,
    setUserOffline,
    emitTypingStart,
    emitTypingStop
  };

  return (
    <MessagingContext.Provider value={value}>
      {children}
    </MessagingContext.Provider>
  );
}

export default MessagingProvider;
