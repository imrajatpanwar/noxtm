/**
 * Botgit Extension Integration Module
 * 
 * This module initializes the connection with the Botgit Chrome extension
 * and sets up proper message handling to prevent "Unchecked runtime.lastError" errors.
 */

/* global chrome */
// The above comment tells ESLint that 'chrome' is a global variable provided by the browser
import { addExtensionListener } from './extensionHelpers';

// Extension connection state
let extensionConnected = false;
let connectionChecked = false;
let connectionListeners = [];

/**
 * Check if extension is connected
 * @returns {Promise<boolean>} Promise that resolves to connection status
 */
export const checkExtensionConnection = async () => {
  if (connectionChecked) {
    return extensionConnected;
  }
  
  try {
    // Check if Chrome extension APIs are available
    if (!window.chrome || !chrome.runtime || typeof chrome.runtime.sendMessage !== 'function') {
      extensionConnected = false;
      connectionChecked = true;
      return false;
    }
    
    // Try sending a ping message
    extensionConnected = await new Promise(resolve => {
      try {
        chrome.runtime.sendMessage({ type: 'ping' }, response => {
          if (chrome.runtime.lastError) {
            resolve(false);
            return;
          }
          resolve(!!response);
        });
        
        // Add a timeout in case the extension doesn't respond
        setTimeout(() => resolve(false), 500);
      } catch (err) {
        resolve(false);
      }
    });
    
    connectionChecked = true;
    
    // Notify listeners of connection state
    connectionListeners.forEach(listener => {
      try {
        listener(extensionConnected);
      } catch (err) {
        console.error('Error in extension connection listener:', err);
      }
    });
    
    return extensionConnected;
  } catch (err) {
    console.warn('Error checking extension connection:', err);
    connectionChecked = true;
    extensionConnected = false;
    return false;
  }
};

/**
 * Register a listener for extension connection state changes
 * @param {Function} listener - Callback that receives connection state boolean
 * @returns {Function} Function to remove the listener
 */
export const addConnectionListener = (listener) => {
  connectionListeners.push(listener);
  // If we already checked connection, immediately notify
  if (connectionChecked) {
    setTimeout(() => listener(extensionConnected), 0);
  }
  return () => {
    connectionListeners = connectionListeners.filter(l => l !== listener);
  };
};

/**
 * Initialize extension connection and message handling
 * Call this early in your app initialization
 */
export const initializeExtension = () => {
  // Check connection status
  checkExtensionConnection();
  
  // Set up message listener for extension
  addExtensionListener((message, sender) => {
    // Handle incoming messages from extension
    console.log('Received message from extension:', message, sender);
    
    switch (message?.type) {
      case 'connectionStatus':
        extensionConnected = message.connected;
        connectionListeners.forEach(listener => {
          try {
            listener(extensionConnected);
          } catch (err) {
            console.error('Error in extension connection listener:', err);
          }
        });
        return { received: true };
        
      case 'ping':
        return { pong: true };
        
      default:
        console.log('Unknown message type from extension:', message?.type);
        return { error: 'Unknown message type' };
    }
  });
  
  // Set up disconnection detection
  if (window.chrome?.runtime) {
    chrome.runtime.onMessageExternal?.addListener((message, sender, sendResponse) => {
      // Handle messages from external extensions
      if (message?.type === 'botgitConnect') {
        extensionConnected = true;
        connectionListeners.forEach(l => l(true));
        sendResponse({ connected: true });
        return true;
      }
    });
  }
};

// Export a function to get current connection state
export const getExtensionConnectionState = () => ({
  connected: extensionConnected,
  checked: connectionChecked
});

/**
 * Simple function to check if extension is connected
 * This is a convenience re-export for components that don't need the full connection state
 * @returns {Promise<boolean>} Promise that resolves to true if extension is connected
 */
export const isExtensionConnected = checkExtensionConnection;