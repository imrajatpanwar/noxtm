import React from 'react';
import mailLoadingGif from './images/mail_loding.gif';

const LoadingScreen = () => {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100vh',
      background: '#ffffff',
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
        style={{ width: '300px', height: '300px' }}
      />
    </div>
  );
};

export default LoadingScreen;
