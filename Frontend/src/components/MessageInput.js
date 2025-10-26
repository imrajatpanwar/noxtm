import React, { useState, useRef } from 'react';
import './MessageInput.css';

function MessageInput({ onSendMessage, onSendFile, onTyping, disabled }) {
  const [message, setMessage] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [filePreview, setFilePreview] = useState(null);
  const inputRef = useRef(null);
  const fileInputRef = useRef(null);

  const handleSubmit = (e) => {
    e.preventDefault();

    // Send file if selected
    if (selectedFile && !disabled && onSendFile) {
      onSendFile(selectedFile, message.trim());
      setSelectedFile(null);
      setFilePreview(null);
      setMessage('');
      inputRef.current?.focus();
      return;
    }

    // Send text message
    if (message.trim() && !disabled) {
      onSendMessage(message.trim());
      setMessage('');
      inputRef.current?.focus();
    }
  };

  const handleChange = (e) => {
    setMessage(e.target.value);

    // Emit typing indicator
    if (onTyping && e.target.value.trim()) {
      onTyping();
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      alert('File size must be less than 10MB');
      return;
    }

    setSelectedFile(file);

    // Create preview for images
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFilePreview({ type: 'image', url: reader.result });
      };
      reader.readAsDataURL(file);
    } else {
      setFilePreview({ type: 'file', name: file.name, size: file.size });
    }
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    setFilePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <div className="message-input-container">
      {/* File Preview */}
      {filePreview && (
        <div className="file-preview-container">
          <div className="file-preview-content">
            {filePreview.type === 'image' ? (
              <div className="image-preview">
                <img src={filePreview.url} alt="Preview" />
              </div>
            ) : (
              <div className="file-preview-info">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/>
                  <polyline points="13 2 13 9 20 9"/>
                </svg>
                <div>
                  <div className="file-preview-name">{filePreview.name}</div>
                  <div className="file-preview-size">{formatFileSize(filePreview.size)}</div>
                </div>
              </div>
            )}
            <button
              type="button"
              className="remove-file-button"
              onClick={handleRemoveFile}
              aria-label="Remove file"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 4L4 12M4 4l8 8"/>
              </svg>
            </button>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="message-input-form">
        <div className={`input-wrapper ${isFocused ? 'focused' : ''}`}>
          {/* File Upload Button */}
          <button
            type="button"
            className="attachment-button"
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled}
            aria-label="Attach file"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/>
            </svg>
          </button>

          <input
            ref={fileInputRef}
            type="file"
            onChange={handleFileSelect}
            style={{ display: 'none' }}
            accept="image/*,.pdf,.doc,.docx,.txt,.xlsx,.xls,.ppt,.pptx"
            disabled={disabled}
          />

          <input
            ref={inputRef}
            type="text"
            value={message}
            onChange={handleChange}
            onKeyPress={handleKeyPress}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder={selectedFile ? "Add a caption (optional)..." : "Type a message..."}
            className="message-input"
            disabled={disabled}
            autoComplete="off"
          />

          <button
            type="submit"
            className={`send-button ${(message.trim() || selectedFile) ? 'active' : ''}`}
            disabled={(!message.trim() && !selectedFile) || disabled}
            aria-label="Send message"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="22" y1="2" x2="11" y2="13"></line>
              <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
            </svg>
          </button>
        </div>
      </form>
    </div>
  );
}

export default MessageInput;
