import React, { useState, useRef, useEffect } from 'react';
import './MessageList.css';
// Import SVG emoji assets
import doneEmoji from './assets/emoji/done.svg';
import hahaEmoji from './assets/emoji/haha.svg';
import niceEmoji from './assets/emoji/nice.svg';
import partyEmoji from './assets/emoji/party.svg';
import sadEmoji from './assets/emoji/sad.svg';

function MessageList({
  messages,
  currentUserId,
  messagesEndRef,
  typingUser,
  onEditMessage,
  onDeleteMessage,
  onReactToMessage,
  onlineUsers = []
}) {
  const [showActionsFor, setShowActionsFor] = useState(null);
  const [showReactionPickerFor, setShowReactionPickerFor] = useState(null);
  const [editingMessageId, setEditingMessageId] = useState(null);
  const [editContent, setEditContent] = useState('');
  const actionsRef = useRef(null);
  const reactionPickerRef = useRef(null);

  // SVG emoji reactions with their identifiers
  const REACTION_EMOJIS = [
    { id: 'done', src: doneEmoji, alt: 'Done' },
    { id: 'haha', src: hahaEmoji, alt: 'Haha' },
    { id: 'nice', src: niceEmoji, alt: 'Nice' },
    { id: 'party', src: partyEmoji, alt: 'Party' },
    { id: 'sad', src: sadEmoji, alt: 'Sad' }
  ];

  // Handle click outside and keyboard events to close menus
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (actionsRef.current && !actionsRef.current.contains(event.target)) {
        setShowActionsFor(null);
      }
      if (reactionPickerRef.current && !reactionPickerRef.current.contains(event.target)) {
        setShowReactionPickerFor(null);
      }
    };

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setShowActionsFor(null);
        setShowReactionPickerFor(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  };

  const formatDateHeader = (timestamp) => {
    const messageDate = new Date(timestamp);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    messageDate.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);
    yesterday.setHours(0, 0, 0, 0);

    if (messageDate.getTime() === today.getTime()) {
      return 'Today';
    } else if (messageDate.getTime() === yesterday.getTime()) {
      return 'Yesterday';
    } else {
      return messageDate.toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric'
      });
    }
  };

  const shouldShowDateHeader = (currentMsg, previousMsg) => {
    if (!previousMsg) return true;

    const currentDate = new Date(currentMsg.createdAt);
    const previousDate = new Date(previousMsg.createdAt);

    currentDate.setHours(0, 0, 0, 0);
    previousDate.setHours(0, 0, 0, 0);

    return currentDate.getTime() !== previousDate.getTime();
  };

  const getInitials = (name) => {
    if (!name) return 'U';
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.charAt(0).toUpperCase();
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const getMessageStatus = (msg, isSent) => {
    if (!isSent) return null;

    // Get recipient from readBy/deliveredTo (excluding sender)
    const readByCount = msg.readBy?.filter(r => r.user.toString() !== currentUserId.toString()).length || 0;
    const deliveredToCount = msg.deliveredTo?.filter(d => d.user.toString() !== currentUserId.toString()).length || 0;

    // Check if any recipient is online
    const hasOnlineRecipient = msg.readBy?.some(r =>
      r.user.toString() !== currentUserId.toString() &&
      (onlineUsers.includes(r.user.toString()) || onlineUsers.includes(r.user._id?.toString()))
    ) || msg.deliveredTo?.some(d =>
      d.user.toString() !== currentUserId.toString() &&
      (onlineUsers.includes(d.user.toString()) || onlineUsers.includes(d.user._id?.toString()))
    );

    // Priority: Seen > Delivered (online) > Sent (offline or not delivered)
    if (readByCount > 0) {
      // Message was read/seen - Green double tick
      return { status: 'Seen', icon: '✓✓', color: '#4ade80' };
    } else if (deliveredToCount > 0 && hasOnlineRecipient) {
      // Message delivered and recipient is online - Gray double tick
      return { status: 'Delivered', icon: '✓✓', color: 'rgba(255, 255, 255, 0.5)' };
    } else {
      // Message sent but not delivered or recipient offline - Single tick
      return { status: 'Sent', icon: '✓', color: 'rgba(255, 255, 255, 0.5)' };
    }
  };

  const handleEdit = (msg) => {
    setEditingMessageId(msg._id);
    setEditContent(msg.content);
    setShowActionsFor(null);
  };

  const handleSaveEdit = (msgId) => {
    if (editContent.trim() && onEditMessage) {
      onEditMessage(msgId, editContent);
      setEditingMessageId(null);
      setEditContent('');
    }
  };

  const handleCancelEdit = () => {
    setEditingMessageId(null);
    setEditContent('');
  };

  const handleDelete = (msgId) => {
    if (onDeleteMessage) {
      onDeleteMessage(msgId);
      setShowActionsFor(null);
    }
  };

  const handleReaction = (msgId, emojiId) => {
    if (onReactToMessage) {
      onReactToMessage(msgId, emojiId);
      setShowReactionPickerFor(null);
    }
  };

  const getReactionSummary = (reactions) => {
    if (!reactions || reactions.length === 0) return [];

    const summary = {};
    reactions.forEach(reaction => {
      const emojiId = reaction.emoji;
      if (!summary[emojiId]) {
        summary[emojiId] = {
          emojiId: emojiId,
          count: 0,
          users: []
        };
      }
      summary[emojiId].count++;
      summary[emojiId].users.push(reaction.user);
    });

    return Object.values(summary);
  };

  const hasUserReacted = (reaction, currentUserId) => {
    return reaction.users.some(userId =>
      userId.toString() === currentUserId.toString()
    );
  };

  const renderFileAttachment = (msg) => {
    if (msg.type === 'image') {
      return (
        <div className="image-attachment">
          <img src={msg.fileUrl} alt={msg.fileName || 'Image'} />
        </div>
      );
    }

    if (msg.type === 'file') {
      return (
        <div className="file-attachment" onClick={() => window.open(msg.fileUrl, '_blank')}>
          <div className="file-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/>
              <polyline points="13 2 13 9 20 9"/>
            </svg>
          </div>
          <div className="file-info">
            <div className="file-name">{msg.fileName}</div>
            <div className="file-size">{formatFileSize(msg.fileSize)}</div>
          </div>
          <svg className="file-download-icon" width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M10 3v11m0 0L6 10m4 4l4-4M3 17h14"/>
          </svg>
        </div>
      );
    }

    return null;
  };

  return (
    <div className="message-list">
      {messages.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">💬</div>
          <p>No messages yet</p>
          <span>Start the conversation!</span>
        </div>
      ) : (
        <>
          {messages.map((msg, index) => {
            const isSent = msg.sender?._id === currentUserId || msg.sender?.id === currentUserId;
            const showAvatar = index === 0 || messages[index - 1]?.sender?._id !== msg.sender?._id;
            const showDateHeader = shouldShowDateHeader(msg, messages[index - 1]);
            const status = getMessageStatus(msg, isSent);
            const reactionSummary = getReactionSummary(msg.reactions);
            const isEditing = editingMessageId === msg._id;
            const isDeleted = msg.isDeleted;

            return (
              <React.Fragment key={msg._id || index}>
                {/* Date Header */}
                {showDateHeader && (
                  <div className="date-divider">
                    <span className="date-label">{formatDateHeader(msg.createdAt)}</span>
                  </div>
                )}

                {/* Message */}
                <div
                  className={`message-wrapper ${isSent ? 'sent' : 'received'} ${isDeleted ? 'deleted-message' : ''} message-fade-in`}
                  onMouseEnter={() => !isDeleted && !isSent && setShowReactionPickerFor(msg._id)}
                  onMouseLeave={() => setShowReactionPickerFor(null)}
                  onContextMenu={(e) => {
                    // Show edit/delete menu on right-click for sent messages
                    if (isSent && !isDeleted && !isEditing) {
                      e.preventDefault();
                      setShowActionsFor(msg._id);
                    }
                  }}
                >
                  {!isSent && showAvatar && (
                    <div className="message-avatar">
                      {getInitials(msg.sender?.username || msg.sender?.name || msg.sender?.displayName)}
                    </div>
                  )}

                  <div className="message-content-wrapper">
                    <div style={{ position: 'relative' }}>
                      <div className={`message-bubble ${isSent ? 'sent-bubble' : 'received-bubble'}`}>
                        {/* File/Image Attachment */}
                        {(msg.type === 'file' || msg.type === 'image') && renderFileAttachment(msg)}

                        {/* Message Content */}
                        {isDeleted ? (
                          <p className="message-text" style={{ fontStyle: 'italic', opacity: 0.6 }}>
                            This message was deleted
                          </p>
                        ) : isEditing ? (
                          <div>
                            <input
                              type="text"
                              value={editContent}
                              onChange={(e) => setEditContent(e.target.value)}
                              onKeyPress={(e) => {
                                if (e.key === 'Enter') handleSaveEdit(msg._id);
                                if (e.key === 'Escape') handleCancelEdit();
                              }}
                              style={{
                                width: '100%',
                                padding: '8px',
                                background: 'rgba(255, 255, 255, 0.2)',
                                border: '1px solid rgba(255, 255, 255, 0.3)',
                                borderRadius: '6px',
                                color: isSent ? 'white' : 'black',
                                fontSize: '15px'
                              }}
                              autoFocus
                            />
                            <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                              <button
                                onClick={() => handleSaveEdit(msg._id)}
                                style={{
                                  padding: '4px 12px',
                                  background: 'white',
                                  color: 'black',
                                  border: 'none',
                                  borderRadius: '6px',
                                  cursor: 'pointer',
                                  fontSize: '12px'
                                }}
                              >
                                Save
                              </button>
                              <button
                                onClick={handleCancelEdit}
                                style={{
                                  padding: '4px 12px',
                                  background: 'transparent',
                                  color: isSent ? 'white' : 'black',
                                  border: '1px solid',
                                  borderRadius: '6px',
                                  cursor: 'pointer',
                                  fontSize: '12px'
                                }}
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="message-text-container">
                            <span className="message-text">
                              {msg.content}
                              {msg.isEdited && <span className="edited-indicator">(edited)</span>}
                            </span>
                            <span className="message-time-inline">
                              {formatTime(msg.createdAt)}
                              {isSent && status && (
                                <span style={{ color: status.color, marginLeft: '4px' }}>{status.icon}</span>
                              )}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Actions Menu (Edit/Delete) - Only for sender - Right-click context menu */}
                      {isSent && !isDeleted && !isEditing && showActionsFor === msg._id && (
                        <div className="message-actions-menu" ref={actionsRef}>
                          <button
                            className="message-actions-menu-item"
                            onClick={() => handleEdit(msg)}
                          >
                            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                              <path d="M11.333 2A2.827 2.827 0 0 1 14 4.667L5.333 13.333H2v-3.333L10.667 2z"/>
                            </svg>
                            <span>Edit</span>
                          </button>
                          <button
                            className="message-actions-menu-item delete"
                            onClick={() => handleDelete(msg._id)}
                          >
                            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                              <path d="M2 4h12M5.333 4V2.667a1.333 1.333 0 0 1 1.334-1.334h2.666a1.333 1.333 0 0 1 1.334 1.334V4m2 0v9.333a1.333 1.333 0 0 1-1.334 1.334H4.667a1.333 1.333 0 0 1-1.334-1.334V4h9.334z"/>
                            </svg>
                            <span>Delete</span>
                          </button>
                        </div>
                      )}

                      {/* Hover Reaction Picker - Shows on hover for all messages */}
                      {!isDeleted && showReactionPickerFor === msg._id && (
                        <div className="hover-reaction-picker" ref={reactionPickerRef}>
                          {REACTION_EMOJIS.map((emoji) => (
                            <button
                              key={emoji.id}
                              className="hover-reaction-option"
                              onClick={() => handleReaction(msg._id, emoji.id)}
                              title={`React with ${emoji.alt}`}
                            >
                              <img src={emoji.src} alt={emoji.alt} className="reaction-emoji-svg" />
                            </button>
                          ))}
                        </div>
                      )}

                      {/* Display Reactions (if any exist) */}
                      {!isDeleted && reactionSummary.length > 0 && (
                        <div className="message-reactions-display">
                          {reactionSummary.map((reaction, idx) => {
                            const emojiData = REACTION_EMOJIS.find(e => e.id === reaction.emojiId);
                            if (!emojiData) return null;

                            return (
                              <div
                                key={idx}
                                className={`reaction-item ${hasUserReacted(reaction, currentUserId) ? 'user-reacted' : ''}`}
                                onClick={() => handleReaction(msg._id, reaction.emojiId)}
                                title={`${reaction.count} reaction${reaction.count > 1 ? 's' : ''}`}
                              >
                                <img src={emojiData.src} alt={emojiData.alt} className="reaction-emoji-svg-small" />
                                <span className="reaction-count">{reaction.count}</span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </React.Fragment>
            );
          })}
        </>
      )}

      {/* Typing Indicator */}
      {typingUser && (
        <div className="typing-indicator-wrapper">
          <div className="typing-avatar">
            {getInitials(typingUser.userName)}
          </div>
          <div className="typing-indicator">
            <span></span>
            <span></span>
            <span></span>
          </div>
        </div>
      )}

      <div ref={messagesEndRef} />
    </div>
  );
}

export default MessageList;
