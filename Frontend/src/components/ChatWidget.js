import React, { useState, useEffect, useRef, useContext } from 'react';
import { MdChat, MdClose, MdSend } from 'react-icons/md';
import { FiMessageCircle, FiChevronLeft, FiTrash2 } from 'react-icons/fi';
import { MessagingContext } from '../contexts/MessagingContext';
import api from '../config/api';
import { toast } from 'sonner';
import './ChatWidget.css';

const ChatWidget = ({ onNavigateToMessages }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [view, setView] = useState('list'); // 'list' | 'noxtm-chat'
  const [conversations, setConversations] = useState([]);
  const [loadingConversations, setLoadingConversations] = useState(false);

  // Noxtm chat state
  const [noxtmMessages, setNoxtmMessages] = useState([]);
  const [noxtmInput, setNoxtmInput] = useState('');
  const [noxtmLoading, setNoxtmLoading] = useState(false);
  const [noxtmConfig, setNoxtmConfig] = useState(null);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const { socket } = useContext(MessagingContext);

  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');

  // Derive bot appearance from config
  const botName = noxtmConfig?.botName || 'Navraj Panwar';
  const botTitle = noxtmConfig?.botTitle || 'Founder';
  const botPicture = noxtmConfig?.botProfilePicture || '';
  const showVerified = noxtmConfig?.showVerifiedBadge !== false;
  const botInitials = botName.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase();

  const VerifiedBadge = ({ size = 16 }) => showVerified ? (
    <svg className="chat-widget-verified" viewBox="0 0 22 22" width={size} height={size}><path d="M20.396 11c-.018-.646-.215-1.275-.57-1.816-.354-.54-.852-.972-1.438-1.246.223-.607.27-1.264.14-1.897-.131-.634-.437-1.218-.882-1.687-.47-.445-1.053-.75-1.687-.882-.633-.13-1.29-.083-1.897.14-.273-.587-.704-1.086-1.245-1.44S11.647 1.62 11 1.604c-.646.017-1.273.213-1.813.568s-.969.855-1.24 1.44c-.608-.223-1.267-.272-1.902-.14-.635.13-1.22.436-1.69.882-.445.47-.749 1.055-.878 1.69-.13.633-.08 1.29.144 1.896-.587.274-1.087.705-1.443 1.245-.356.54-.555 1.17-.574 1.817.02.647.218 1.276.574 1.817.356.54.856.972 1.443 1.245-.224.606-.274 1.263-.144 1.896.13.636.433 1.221.878 1.69.47.446 1.055.752 1.69.883.635.13 1.294.083 1.902-.141.27.587.7 1.086 1.24 1.44s1.167.551 1.813.568c.647-.017 1.277-.213 1.817-.567s.972-.854 1.245-1.44c.604.223 1.261.272 1.894.141.636-.131 1.22-.437 1.69-.883.445-.47.75-1.055.88-1.69.131-.633.084-1.29-.139-1.896.586-.274 1.084-.705 1.438-1.246.355-.54.552-1.17.57-1.817zM9.662 14.85l-3.429-3.428 1.293-1.302 2.072 2.072 4.4-4.794 1.347 1.246z" fill="#1d9bf0"/></svg>
  ) : null;

  const BotAvatar = ({ className }) => (
    botPicture
      ? <img src={botPicture} alt={botName} className={`${className} chat-widget-avatar-img`} />
      : <div className={className}>{botInitials}</div>
  );

  // Load conversations when widget opens
  useEffect(() => {
    if (isOpen && view === 'list') {
      loadConversations();
    }
  }, [isOpen, view]);

  // Load Noxtm config on mount
  useEffect(() => {
    loadNoxtmConfig();
  }, []);

  // Auto-scroll in Noxtm chat
  useEffect(() => {
    if (view === 'noxtm-chat') {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [noxtmMessages, noxtmLoading, view]);

  // Focus input when entering Noxtm chat
  useEffect(() => {
    if (view === 'noxtm-chat' && inputRef.current) {
      inputRef.current.focus();
    }
  }, [view]);

  // Listen for new messages via socket
  useEffect(() => {
    if (!socket) return;
    const handleNewMessage = () => {
      if (isOpen && view === 'list') loadConversations();
    };
    socket.on('new-message', handleNewMessage);
    return () => socket.off('new-message', handleNewMessage);
  }, [socket, isOpen, view]);

  const loadConversations = async () => {
    setLoadingConversations(true);
    try {
      const res = await api.get('/messaging/conversations');
      setConversations((res.data.conversations || []).slice(0, 8)); // Show recent 8
    } catch (err) {
      console.error('Failed to load conversations:', err);
    } finally {
      setLoadingConversations(false);
    }
  };

  const loadNoxtmConfig = async () => {
    try {
      const res = await api.get('/noxtm-chat/config');
      if (res.data.success) setNoxtmConfig(res.data.config);
    } catch (err) {
      console.error('Failed to load Noxtm config:', err);
    }
  };

  const loadNoxtmHistory = async () => {
    setLoadingHistory(true);
    try {
      const res = await api.get('/noxtm-chat/messages?limit=50');
      if (res.data.success) setNoxtmMessages(res.data.messages);
    } catch (err) {
      console.error('Failed to load Noxtm history:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  const openNoxtmChat = () => {
    setView('noxtm-chat');
    loadNoxtmHistory();
  };

  const handleSendNoxtm = async () => {
    if (!noxtmInput.trim() || noxtmLoading) return;
    const msg = noxtmInput.trim();
    setNoxtmInput('');

    // Optimistic add
    const tempUserMsg = { _id: 'temp-' + Date.now(), role: 'user', content: msg, createdAt: new Date().toISOString() };
    setNoxtmMessages(prev => [...prev, tempUserMsg]);
    setNoxtmLoading(true);

    try {
      const res = await api.post('/noxtm-chat/send', { message: msg });
      if (res.data.success) {
        // Replace temp message with real one, add assistant response
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

  const clearNoxtmChat = async () => {
    try {
      await api.delete('/noxtm-chat/messages');
      setNoxtmMessages([]);
      toast.success('Chat history cleared');
    } catch (err) {
      toast.error('Failed to clear chat');
    }
  };

  const handleNoxtmKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendNoxtm();
    }
  };

  const getConversationName = (conv) => {
    if (conv.type === 'group') return conv.name || 'Group Chat';
    const other = conv.participants?.find(p => p.user?._id !== currentUser._id);
    return other?.user?.fullName || 'Unknown';
  };

  const getConversationInitials = (conv) => {
    const name = getConversationName(conv);
    return name.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase();
  };

  const getTimeAgo = (date) => {
    if (!date) return '';
    const diff = Date.now() - new Date(date).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'now';
    if (mins < 60) return `${mins}m`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h`;
    const days = Math.floor(hrs / 24);
    return `${days}d`;
  };

  const totalUnread = conversations.reduce((sum, c) => sum + (c.unreadCount || 0), 0);

  return (
    <>
      {/* Floating Chat Button */}
      {!isOpen && (
        <button
          className="chat-button"
          onClick={() => setIsOpen(true)}
          aria-label="Open chat"
        >
          <MdChat size={22} />
          {totalUnread > 0 && (
            <span className="chat-button-badge">{totalUnread > 9 ? '9+' : totalUnread}</span>
          )}
        </button>
      )}

      {/* Chat Popup */}
      {isOpen && (
        <div className="chat-widget-popup">
          {/* === CONVERSATION LIST VIEW === */}
          {view === 'list' && (
            <>
              <div className="chat-widget-header">
                <span className="chat-widget-title">Messages</span>
                <button className="chat-widget-close" onClick={() => setIsOpen(false)}>
                  <MdClose size={18} />
                </button>
              </div>

              <div className="chat-widget-body">
                {/* Noxtm AI Chat — pinned at top */}
                <div className="chat-widget-noxtm-item" onClick={openNoxtmChat}>
                  <BotAvatar className="chat-widget-noxtm-avatar" />
                  <div className="chat-widget-item-info">
                    <div className="chat-widget-item-name">
                      {botName}
                      <VerifiedBadge size={16} />
                      <span className="chat-widget-noxtm-badge">{botTitle}</span>
                    </div>
                    <div className="chat-widget-item-preview">
                      {noxtmConfig?.welcomeMessage
                        ? noxtmConfig.welcomeMessage.substring(0, 45) + '...'
                        : 'Ask me anything about your workspace'}
                    </div>
                  </div>
                </div>

                <div className="chat-widget-divider" />

                {/* Recent Conversations */}
                {loadingConversations ? (
                  <div className="chat-widget-loading">Loading chats...</div>
                ) : conversations.length === 0 ? (
                  <div className="chat-widget-empty">No conversations yet</div>
                ) : (
                  conversations.map(conv => (
                    <div
                      key={conv._id}
                      className="chat-widget-conv-item"
                      onClick={() => {
                        setIsOpen(false);
                        if (onNavigateToMessages) onNavigateToMessages();
                      }}
                    >
                      <div className="chat-widget-conv-avatar">
                        {getConversationInitials(conv)}
                      </div>
                      <div className="chat-widget-item-info">
                        <div className="chat-widget-item-name">
                          {getConversationName(conv)}
                          {conv.lastMessage?.timestamp && (
                            <span className="chat-widget-time">{getTimeAgo(conv.lastMessage.timestamp)}</span>
                          )}
                        </div>
                        <div className="chat-widget-item-preview">
                          {conv.lastMessage?.content?.substring(0, 50) || 'No messages yet'}
                        </div>
                      </div>
                      {conv.unreadCount > 0 && (
                        <span className="chat-widget-unread">{conv.unreadCount}</span>
                      )}
                    </div>
                  ))
                )}
              </div>

              <div className="chat-widget-footer" onClick={() => {
                setIsOpen(false);
                if (onNavigateToMessages) onNavigateToMessages();
              }}>
                <FiMessageCircle size={14} />
                <span>Open Messages</span>
              </div>
            </>
          )}

          {/* === NOXTM CHAT VIEW === */}
          {view === 'noxtm-chat' && (
            <>
              <div className="chat-widget-header chat-widget-header-noxtm">
                <div className="chat-widget-header-left">
                  <button className="chat-widget-back" onClick={() => setView('list')}>
                    <FiChevronLeft size={18} />
                  </button>
                  <BotAvatar className="chat-widget-noxtm-avatar-sm" />
                  <div>
                    <div className="chat-widget-header-name">{botName} <VerifiedBadge size={14} /></div>
                    <div className="chat-widget-header-status">{botTitle}</div>
                  </div>
                </div>
                <div className="chat-widget-header-actions">
                  {noxtmMessages.length > 0 && (
                    <button className="chat-widget-action-btn" onClick={clearNoxtmChat} title="Clear chat">
                      <FiTrash2 size={14} />
                    </button>
                  )}
                  <button className="chat-widget-close" onClick={() => { setIsOpen(false); setView('list'); }}>
                    <MdClose size={18} />
                  </button>
                </div>
              </div>

              <div className="chat-widget-messages">
                {loadingHistory ? (
                  <div className="chat-widget-loading">Loading messages...</div>
                ) : noxtmMessages.length === 0 ? (
                  <div className="chat-widget-welcome">
                    <BotAvatar className="chat-widget-welcome-avatar" />
                    <h4>{botName} <VerifiedBadge size={16} /></h4>
                    <p>{noxtmConfig?.welcomeMessage || `Hi! I'm ${botName}, ${botTitle} of Noxtm. How can I help you?`}</p>
                  </div>
                ) : (
                  noxtmMessages.map((msg) => (
                    <div key={msg._id} className={`chat-widget-msg ${msg.role}`}>
                      <div className="chat-widget-msg-bubble">{msg.content}</div>
                      <div className="chat-widget-msg-time">
                        {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  ))
                )}

                {noxtmLoading && (
                  <div className="chat-widget-msg assistant">
                    <div className="chat-widget-typing">
                      <span></span><span></span><span></span>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              <div className="chat-widget-input-area">
                <input
                  ref={inputRef}
                  type="text"
                  value={noxtmInput}
                  onChange={(e) => setNoxtmInput(e.target.value)}
                  onKeyPress={handleNoxtmKeyPress}
                  placeholder={`Message ${botName.split(' ')[0]}...`}
                  disabled={noxtmLoading}
                  maxLength={2000}
                />
                <button
                  onClick={handleSendNoxtm}
                  disabled={!noxtmInput.trim() || noxtmLoading}
                  className="chat-widget-send"
                >
                  <MdSend size={18} />
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
};

export default ChatWidget;
