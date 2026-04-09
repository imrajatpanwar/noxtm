import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import { getConfig } from './config/configService';

// Prefetch env config from server before first render.
// This populates the cache so all components can call getConfigSync() synchronously.
getConfig().finally(() => {
  const root = ReactDOM.createRoot(document.getElementById('root'));
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
});
