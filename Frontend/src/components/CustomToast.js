import React from 'react';
import { toast as sonnerToast } from 'sonner';
import { HiOutlineChatAlt2 } from 'react-icons/hi';
import './CustomToast.css';

/**
 * Custom Toast Component
 * A fully custom toast that maintains animations and interactions from Sonner
 */
function Toast(props) {
  const { title, description, button, id, sender, timestamp } = props;

  // Truncate message to 24 characters
  const truncatedMessage = description && description.length > 24 
    ? description.substring(0, 24) + '...' 
    : description;

  return (
    <div className="custom-toast-container">
      <div className="custom-toast-content">
        <div className="custom-toast-icon">
          <HiOutlineChatAlt2 />
        </div>
        <div className="custom-toast-body">
          <div className="custom-toast-header">
            <p className="custom-toast-sender">{sender || title}</p>
            {timestamp && (
              <span className="custom-toast-timestamp">
                {new Date(timestamp).toLocaleTimeString('en-US', { 
                  hour: 'numeric', 
                  minute: '2-digit' 
                })}
              </span>
            )}
          </div>
          <p className="custom-toast-message">{truncatedMessage}</p>
        </div>
        {button && (
          <button
            className="custom-toast-button"
            onClick={() => {
              button.onClick();
              sonnerToast.dismiss(id);
            }}
          >
            {button.label}
          </button>
        )}
      </div>
    </div>
  );
}

/**
 * Helper function to show custom message toast
 * @param {Object} options - Toast options
 * @param {string} options.title - Toast title (sender name)
 * @param {string} options.description - Toast description (message content)
 * @param {string} options.sender - Sender name
 * @param {string} options.timestamp - Message timestamp
 * @param {string} options.avatarUrl - Sender avatar URL
 * @param {Object} options.button - Button configuration
 * @param {string} options.button.label - Button label
 * @param {Function} options.button.onClick - Button click handler
 */
export function showMessageToast(options) {
  return sonnerToast.custom((id) => (
    <Toast
      id={id}
      title={options.title}
      description={options.description}
      sender={options.sender}
      timestamp={options.timestamp}
      avatarUrl={options.avatarUrl}
      button={options.button}
    />
  ), {
    duration: 4000, // Auto dismiss after 4 seconds
    position: 'top-right',
  });
}

/**
 * Helper function to show simple notification toast
 */
export function showNotificationToast(options) {
  return sonnerToast.custom((id) => (
    <Toast
      id={id}
      title={options.title}
      description={options.description}
      button={options.button}
    />
  ), {
    duration: options.duration || 4000, // Default 4 seconds
    position: 'top-right',
  });
}

export default Toast;
