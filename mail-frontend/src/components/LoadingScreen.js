import React from 'react';
import mailLoadingGif from './images/mail_loding.gif';

const LoadingScreen = ({ message = 'Loading Mail...' }) => {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100vh',
      background: '#f5f5f5',
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      zIndex: 9999
    }}>
      <img
        src={mailLoadingGif}
        alt="Loading..."
        style={{ width: '150px', height: '150px' }}
      />
      <p style={{
        marginTop: '20px',
        fontSize: '16px',
        color: '#666',
        fontFamily: 'Switzer, sans-serif'
      }}>
        {message}
      </p>
    </div>
  );
};

export default LoadingScreen;
