import React from 'react';
import { showMessageToast, showNotificationToast } from './CustomToast';

/**
 * Demo component showing how to use custom toasts
 * You can trigger these from anywhere in your app
 */
function ToastDemo() {
  const handleShowMessageToast = () => {
    showMessageToast({
      title: 'Team Updates',
      description: 'Hey! I just finished the new feature we discussed yesterday.',
      sender: 'John Doe',
      timestamp: new Date().toISOString(),
      avatarUrl: 'https://ui-avatars.com/api/?name=John+Doe&background=667eea&color=fff',
      button: {
        label: 'Reply',
        onClick: () => {
          console.log('Reply button clicked');
          // Add your reply logic here
        }
      }
    });
  };

  const handleShowNotificationToast = () => {
    showNotificationToast({
      title: 'System Notification',
      description: 'Your profile has been updated successfully.',
      button: {
        label: 'View',
        onClick: () => {
          console.log('View button clicked');
          // Add your navigation logic here
        }
      }
    });
  };

  return (
    <div style={{ padding: '20px' }}>
      <h2>Custom Toast Demo</h2>
      <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
        <button
          onClick={handleShowMessageToast}
          style={{
            padding: '10px 20px',
            background: '#667eea',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontWeight: '600'
          }}
        >
          Show Message Toast
        </button>
        <button
          onClick={handleShowNotificationToast}
          style={{
            padding: '10px 20px',
            background: '#48bb78',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontWeight: '600'
          }}
        >
          Show Notification Toast
        </button>
      </div>
    </div>
  );
}

export default ToastDemo;
