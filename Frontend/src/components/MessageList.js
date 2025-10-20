import React from 'react';
import './MessageList.css';

function MessageList({ messages, currentUserId, messagesEndRef, typingUser }) {
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

    // Reset time to midnight for comparison
    messageDate.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);
    yesterday.setHours(0, 0, 0, 0);

    if (messageDate.getTime() === today.getTime()) {
      return 'Today';
    } else if (messageDate.getTime() === yesterday.getTime()) {
      return 'Yesterday';
    } else {
      // Format as "January 15, 2025"
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
                  className={`message-wrapper ${isSent ? 'sent' : 'received'} message-fade-in`}
                >
                  {!isSent && showAvatar && (
                    <div className="message-avatar">
                      {getInitials(msg.sender?.fullName || msg.sender?.username)}
                    </div>
                  )}

                  <div className="message-content-wrapper">
                    {!isSent && showAvatar && (
                      <div className="message-sender-info">
                        <span className="message-sender-name">
                          {msg.sender?.fullName || msg.sender?.username || 'Unknown User'}
                        </span>
                        <span className="message-time">{formatTime(msg.createdAt)}</span>
                      </div>
                    )}

                    <div className={`message-bubble ${isSent ? 'sent-bubble' : 'received-bubble'}`}>
                      <p className="message-text">{msg.content}</p>
                      {isSent && <span className="message-time-sent">{formatTime(msg.createdAt)}</span>}
                    </div>

                    {!isSent && !showAvatar && (
                      <span className="message-time-hover">{formatTime(msg.createdAt)}</span>
                    )}
                  </div>

                  {isSent && <div className="message-avatar-placeholder" />}
                </div>
              </React.Fragment>
            );
          })}

          {/* Typing Indicator */}
          {typingUser && (
            <div className="message-wrapper received typing-indicator-wrapper">
              <div className="message-avatar">
                {getInitials(typingUser.userName)}
              </div>
              <div className="message-content-wrapper">
                <div className="message-sender-info">
                  <span className="message-sender-name">{typingUser.userName}</span>
                </div>
                <div className="typing-indicator">
                  <div className="typing-dot"></div>
                  <div className="typing-dot"></div>
                  <div className="typing-dot"></div>
                </div>
              </div>
            </div>
          )}
        </>
      )}
      <div ref={messagesEndRef} />
    </div>
  );
}

export default MessageList;
