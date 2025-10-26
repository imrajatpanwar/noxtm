import React, { createContext, useState, useEffect, useCallback, useRef } from 'react';
import { io } from 'socket.io-client';

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
  const socketRef = useRef(null);

  useEffect(() => {
    // Initialize Socket.IO connection
    const socketUrl = getSocketUrl();
    console.log('🔌 MessagingContext: Connecting to Socket.IO at:', socketUrl);

    const newSocket = io(socketUrl, {
      transports: ['polling', 'websocket'],
      withCredentials: true,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 10
    });

    socketRef.current = newSocket;
    setSocket(newSocket);

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
      console.log('✅ MessagingContext: Connected to Socket.IO');
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

    // Listen for new messages (for unread count)
    newSocket.on('new-message', (data) => {
      console.log('📩 MessagingContext: New message received', data);

      // Get current user
      const userData = JSON.parse(localStorage.getItem('user') || '{}');
      const currentUserId = (userData.id || userData._id)?.toString();
      const messageSenderId = data.message.sender._id?.toString();

      // Only dispatch if message is NOT from current user
      if (currentUserId && messageSenderId && currentUserId !== messageSenderId) {
        console.log('📬 Dispatching unread message event for Sidebar badge');
        window.dispatchEvent(new CustomEvent('messaging:newMessage', {
          detail: data
        }));
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

    // Cleanup on unmount
    return () => {
      console.log('🧹 MessagingContext: Cleaning up socket connection');
      if (newSocket) {
        newSocket.disconnect();
      }
    };
  }, []);

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
