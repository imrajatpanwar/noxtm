import React, { useEffect, useState } from 'react';

function ExtensionAuthCallback() {
  const [status, setStatus] = useState('processing');
  const [message, setMessage] = useState('Connecting to extension...');

  useEffect(() => {
    // Extract token and user data from URL fragment
    const hash = window.location.hash.substring(1); // Remove the '#'
    const params = new URLSearchParams(hash);

    const token = params.get('token');
    const userStr = params.get('user');

    if (token && userStr) {
      try {
        // Parse user data to validate it
        JSON.parse(decodeURIComponent(userStr));

        setStatus('success');
        setMessage('Authentication successful! Redirecting...');

        // The extension will capture this URL and extract the token
        // We can also try to communicate directly if extension ID is known

        // Close this window after a short delay
        setTimeout(() => {
          window.close();
        }, 2000);

      } catch (error) {
        console.error('Failed to parse user data:', error);
        setStatus('error');
        setMessage('Authentication failed. Please try again.');
      }
    } else {
      setStatus('error');
      setMessage('Missing authentication data. Please try logging in again.');
    }
  }, []);

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    }}>
      <div style={{
        background: 'white',
        padding: '48px',
        borderRadius: '16px',
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
        maxWidth: '450px',
        width: '100%',
        textAlign: 'center'
      }}>
        {status === 'processing' && (
          <>
            <div style={{
              width: '60px',
              height: '60px',
              border: '4px solid #f3f4f6',
              borderTopColor: '#667eea',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
              margin: '0 auto 24px'
            }}></div>
            <h2 style={{ color: '#333', marginBottom: '12px' }}>
              Authenticating
            </h2>
            <p style={{ color: '#666', fontSize: '15px' }}>
              {message}
            </p>
          </>
        )}

        {status === 'success' && (
          <>
            <div style={{
              width: '60px',
              height: '60px',
              background: '#10b981',
              borderRadius: '50%',
              margin: '0 auto 24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
            </div>
            <h2 style={{ color: '#10b981', marginBottom: '12px' }}>
              Success!
            </h2>
            <p style={{ color: '#666', fontSize: '15px' }}>
              {message}
            </p>
            <p style={{ color: '#999', fontSize: '13px', marginTop: '16px' }}>
              This window will close automatically...
            </p>
          </>
        )}

        {status === 'error' && (
          <>
            <div style={{
              width: '60px',
              height: '60px',
              background: '#ef4444',
              borderRadius: '50%',
              margin: '0 auto 24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </div>
            <h2 style={{ color: '#ef4444', marginBottom: '12px' }}>
              Authentication Failed
            </h2>
            <p style={{ color: '#666', fontSize: '15px' }}>
              {message}
            </p>
            <button
              onClick={() => window.close()}
              style={{
                marginTop: '24px',
                padding: '12px 24px',
                background: '#667eea',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              Close Window
            </button>
          </>
        )}

        <style>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    </div>
  );
}

export default ExtensionAuthCallback;
