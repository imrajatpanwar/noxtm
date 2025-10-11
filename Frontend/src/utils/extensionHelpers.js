/**
 * Chrome extension message handling utility
 * Provides safe wrappers for extension messaging that properly handle
 * runtime.lastError to prevent "Unchecked runtime.lastError" console messages
 */

/* global chrome */
// The above comment tells ESLint that 'chrome' is a global variable provided by the browser

/**
 * Send a message to the extension and handle lastError properly
 * @param {Object} message - Message to send to extension
 * @param {Function} [callback] - Optional callback for response
 * @returns {Promise} Promise that resolves with response or rejects with error
 */
export const sendExtensionMessage = (message) => {
  // First check if the extension APIs are available
  if (!window.chrome || !chrome.runtime || typeof chrome.runtime.sendMessage !== 'function') {
    return Promise.reject(new Error('Chrome extension API not available'));
  }

  return new Promise((resolve, reject) => {
    try {
      chrome.runtime.sendMessage(message, (response) => {
        // Always check for lastError to prevent "Unchecked runtime.lastError" messages
        if (chrome.runtime.lastError) {
          console.warn('Extension messaging error:', chrome.runtime.lastError.message);
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }
        resolve(response);
      });
    } catch (err) {
      reject(err);
    }
  });
};

/**
 * Listen for messages from the extension content scripts or background page
 * @param {Function} listener - Callback that receives message
 * @returns {Function} Function to remove the listener
 */
export const addExtensionListener = (listener) => {
  if (!window.chrome || !chrome.runtime || typeof chrome.runtime.onMessage === 'undefined') {
    console.warn('Chrome extension API not available - listener not added');
    return () => {}; // No-op removal function
  }
  
  // Wrap the listener to ensure runtime.lastError is always checked
  const wrappedListener = (message, sender, sendResponse) => {
    try {
      const response = listener(message, sender);
      
      // If the listener returns a Promise, handle async responses properly
      if (response instanceof Promise) {
        response.then(sendResponse).catch(error => {
          console.error('Error in extension message listener:', error);
          sendResponse({ error: error.message });
        });
        return true; // Keep the message channel open for async response
      }
      
      // Otherwise send synchronous response if any
      if (response !== undefined) {
        sendResponse(response);
      }
    } catch (error) {
      console.error('Error in extension message handler:', error);
      sendResponse({ error: error.message });
    }
  };
  
  chrome.runtime.onMessage.addListener(wrappedListener);
  return () => chrome.runtime.onMessage.removeListener(wrappedListener);
};

/**
 * Check if a Chrome extension is available and connected
 * @param {string} [extensionId] - Optional specific extension ID to check
 * @returns {Promise<boolean>} Promise resolving to true if extension is connected
 */
export const isExtensionConnected = async (extensionId = null) => {
  if (!window.chrome || !chrome.runtime || typeof chrome.runtime.sendMessage !== 'function') {
    return false;
  }
  
  try {
    // Send a simple ping message
    const args = [{ type: 'ping' }];
    if (extensionId) {
      args.unshift(extensionId);
    }
    
    return new Promise(resolve => {
      chrome.runtime.sendMessage(...args, response => {
        if (chrome.runtime.lastError) {
          resolve(false);
          return;
        }
        resolve(!!response);
      });
      
      // Add a timeout in case the extension doesn't respond
      setTimeout(() => resolve(false), 500);
    });
  } catch (err) {
    return false;
  }
};