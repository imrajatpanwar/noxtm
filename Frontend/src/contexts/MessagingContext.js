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
  return isDevelopment ? 'http://localhost:5000' : `${window.location.protocol}//${window.location.hostname}:5000`;
};

export function MessagingProvider({ children }) {
  const [socket, setSocket] = useState(null);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [typingUsers, setTypingUsers] = useState({});
  const socketRef = useRef(null);

  useEffect(() => {
    // Initialize Socket.IO connection
    const socketUrl = getSocketUrl();
    console.log('🔌 MessagingContext: Connecting to Socket.IO at:', socketUrl);

    const newSocket = io(socketUrl, {
      transports: ['polling', 'websocket'],
      withCredentials: true
    });

    socketRef.current = newSocket;
    setSocket(newSocket);

    newSocket.on('connect', () => {
      console.log('✅ MessagingContext: Connected to Socket.IO');

      // Get current user from localStorage
      const userData = JSON.parse(localStorage.getItem('user') || '{}');
      if (userData.id || userData._id) {
        const userId = userData.id || userData._id;
        // Emit user-online event
        newSocket.emit('user-online', userId);
        console.log('👤 MessagingContext: User online event sent:', userId);
      }
    });

    newSocket.on('disconnect', () => {
      console.log('❌ MessagingContext: Disconnected from Socket.IO');
    });

    // Listen for user status changes
    newSocket.on('user-status-changed', (data) => {
      console.log('👤 MessagingContext: User status changed:', data);
      const { userId, status } = data;

      if (status === 'online') {
        setOnlineUsers(prev => {
          if (!prev.includes(userId)) {
            return [...prev, userId];
          }
          return prev;
        });
      } else if (status === 'offline') {
        setOnlineUsers(prev => prev.filter(id => id !== userId));
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
      console.log('📩 MessagingContext: New message received');
      // You can increment unread count here if needed
      // We'll handle this in the Messaging component for now
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
