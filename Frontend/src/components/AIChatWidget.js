import React, { useState, useEffect, useRef } from 'react';
import { MdChat, MdClose, MdSend } from 'react-icons/md';
import api from '../config/api';
import { toast } from 'sonner';
import './AIChatWidget.css';

const AIChatWidget = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Load chat history from localStorage on mount
  useEffect(() => {
    const savedMessages = localStorage.getItem('ai-chat-history');
    if (savedMessages) {
      try {
        const parsed = JSON.parse(savedMessages);
        setMessages(parsed);
      } catch (error) {
        console.error('Failed to load chat history:', error);
      }
    }
  }, []);

  // Save messages to localStorage whenever they change
  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem('ai-chat-history', JSON.stringify(messages));
    }
  }, [messages]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // Focus input when chat opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage = inputValue.trim();
    setInputValue('');

    // Add user message to chat
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    try {
      // Prepare conversation history (exclude system messages)
      const conversationHistory = messages.filter(m => m.role !== 'system');

      // Call AI API
      const response = await api.post('/ai/chat', {
        message: userMessage,
        conversationHistory
      });

      if (response.data.success) {
        // Add AI response to chat
        setMessages(prev => [
          ...prev,
          { role: 'assistant', content: response.data.reply }
        ]);
      } else {
        throw new Error(response.data.message || 'Failed to get response');
      }
    } catch (error) {
      console.error('AI chat error:', error);
      const errorMessage =
        error.response?.data?.message ||
        error.message ||
        'Sorry, I encountered an error. Please try again.';

      toast.error(errorMessage);

      // Add error message to chat
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: errorMessage
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const clearChat = () => {
    setMessages([]);
    localStorage.removeItem('ai-chat-history');
    toast.success('Chat history cleared');
  };

  return (
    <>
      {!isOpen && (
        <button
          className="ai-chat-button"
          onClick={() => setIsOpen(true)}
          aria-label="Open AI Chat"
        >
          <MdChat size={24} />
        </button>
      )}

      {isOpen && (
        <div className="ai-chat-modal">
          <div className="ai-chat-header">
            <div className="ai-chat-title">
              <MdChat size={20} />
              <span>AI Assistant</span>
            </div>
            <div className="ai-chat-actions">
              {messages.length > 0 && (
                <button
                  onClick={clearChat}
                  className="ai-chat-clear"
                  aria-label="Clear chat"
                >
                  Clear
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="ai-chat-close-btn"
                aria-label="Close chat"
              >
                <MdClose size={20} />
              </button>
            </div>
          </div>

          <div className="ai-chat-messages">
            {messages.length === 0 && (
              <div className="ai-chat-welcome">
                <MdChat size={48} />
                <h3>Hi! I'm your AI Assistant</h3>
                <p>I can help you with:</p>
                <ul>
                  <li>Understanding your dashboard data</li>
                  <li>Navigating features</li>
                  <li>Answering questions about your projects, campaigns, and clients</li>
                  <li>Providing insights based on your leads and email accounts</li>
                </ul>
                <p className="ai-chat-welcome-prompt">Ask me anything!</p>
              </div>
            )}

            {messages.map((msg, index) => (
              <div key={index} className={`ai-chat-message ${msg.role}`}>
                <div className="ai-chat-message-content">{msg.content}</div>
              </div>
            ))}

            {isLoading && (
              <div className="ai-chat-message assistant">
                <div className="ai-chat-typing">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          <div className="ai-chat-input-container">
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask me anything..."
              className="ai-chat-input"
              disabled={isLoading}
              maxLength={1000}
              aria-label="Chat message input"
            />
            <button
              onClick={handleSendMessage}
              disabled={!inputValue.trim() || isLoading}
              className="ai-chat-send"
              aria-label="Send message"
            >
              <MdSend size={20} />
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default AIChatWidget;
