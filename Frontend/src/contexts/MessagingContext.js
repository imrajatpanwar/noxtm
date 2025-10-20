import React, { createContext, useState, useCallback } from 'react';

export const MessagingContext = createContext({
  unreadCount: 0,
  incrementUnread: () => {},
  resetUnread: () => {}
});

export function MessagingProvider({ children }) {
  const [unreadCount, setUnreadCount] = useState(0);

  const incrementUnread = useCallback((by = 1) => {
    setUnreadCount(prev => prev + by);
  }, []);

  const resetUnread = useCallback(() => {
    setUnreadCount(0);
  }, []);

  return (
    <MessagingContext.Provider value={{ unreadCount, incrementUnread, resetUnread }}>
      {children}
    </MessagingContext.Provider>
  );
}

export default MessagingProvider;
