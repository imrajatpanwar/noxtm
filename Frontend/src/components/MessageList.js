import React from 'react';
import './MessageList.css';

function MessageList({ messages, currentUserId, messagesEndRef }) {
  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  };

  return (
    <div className="message-list">
      {messages.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">💬</div>
          <p>No messages yet</p>
          <span>Start a conversation!</span>
        </div>
      ) : (
        messages.map((msg, index) => {
          const isSent = msg.sender?._id === currentUserId || msg.sender?.id === currentUserId;
          const showAvatar = index === 0 || messages[index - 1]?.sender?._id !== msg.sender?._id;

          return (
            <div
              key={msg._id || index}
              className={`message-wrapper ${isSent ? 'sent' : 'received'} message-fade-in`}
            >
              {!isSent && showAvatar && (
                <div className="message-avatar">
                  {msg.sender?.fullName?.charAt(0)?.toUpperCase() || 'U'}
                </div>
              )}

              <div className="message-content-wrapper">
                {!isSent && showAvatar && (
                  <div className="message-sender-name">
                    {msg.sender?.fullName || 'Unknown User'}
                  </div>
                )}

                <div className={`message-bubble ${isSent ? 'sent-bubble' : 'received-bubble'}`}>
                  <p className="message-text">{msg.content}</p>
                  <span className="message-time">{formatTime(msg.createdAt)}</span>
                </div>
              </div>

              {isSent && <div className="message-avatar-placeholder" />}
            </div>
          );
        })
      )}
      <div ref={messagesEndRef} />
    </div>
  );
}

export default MessageList;
