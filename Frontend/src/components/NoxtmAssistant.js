import React, { useState, useEffect, useRef, useCallback } from 'react';
import { toast } from 'sonner';
import api from '../config/api';
import splitViewIcon from '../assets/split_view.svg';
import './NoxtmAssistant.css';

// ─── Icons ───
const SendIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
  </svg>
);

const SparkleIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 3v1m0 16v1m-7.07-2.93l.71-.71M5.64 5.64l-.71-.71M3 12h1m16 0h1m-2.93 7.07l-.71-.71M18.36 5.64l.71-.71" />
    <circle cx="12" cy="12" r="4" />
  </svg>
);

const TrashIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
  </svg>
);

const ClockIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
  </svg>
);

// Quick suggestions shown when chat is empty
const QUICK_SUGGESTIONS = [
  'Show my tasks',
  'Team overview',
  'Create a task',
  'Campaign stats',
];

// Detect what label to show based on the user's message
function detectLoadingLabel(msg) {
  const m = msg.toLowerCase();
  if (/\b(edit|update|change|modify|fix|rename|set|correct|adjust|replace)\b/.test(m)) return 'Editing';
  if (/\b(delete|remove|cancel|clear|drop)\b/.test(m)) return 'Processing';
  if (/\b(create|make|add|build|generate|schedule|send|launch|write|compose|draft)\b/.test(m)) return 'Working';
  if (/\b(search|find|look|fetch|get|show|list|filter|check)\b/.test(m)) return 'Searching';
  if (/\b(save|remember|store|note|record|memorize)\b/.test(m)) return 'Saving';
  if (/\b(analyz|calculat|stat|analytic|report|summar|breakdown)\b/.test(m)) return 'Analyzing';
  return 'Thinking';
}

// Cycle phases while loading
const LOADING_PHASES = [
  { delay: 0,    suffix: '...' },
  { delay: 4000, label: 'Working', suffix: '...' },
  { delay: 9000, label: 'Almost there', suffix: '...' },
];

function NoxtmAssistant({ onCollapse }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingLabel, setLoadingLabel] = useState('Thinking');
  const [hasMore, setHasMore] = useState(false);
  const [scheduledActions, setScheduledActions] = useState([]);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const loadingTimers = useRef([]);

  // Load chat history on mount
  useEffect(() => {
    const loadHistory = async () => {
      try {
        const res = await api.get('/noxtm-assistant/history?limit=30');
        if (res.data.messages?.length > 0) {
          setMessages(res.data.messages.map(m => ({
            role: m.role,
            content: m.content,
            id: m._id,
            time: m.createdAt
          })));
          setHasMore(res.data.hasMore);
        }
      } catch (err) {
        console.debug('[Assistant] History load skipped:', err.message);
      }
    };

    const loadActions = async () => {
      try {
        const res = await api.get('/noxtm-assistant/actions?status=pending');
        setScheduledActions(res.data.actions || []);
      } catch (err) {
        console.debug('[Assistant] Actions load skipped:', err.message);
      }
    };

    loadHistory();
    loadActions();
  }, []);

  // Auto-scroll to bottom
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, loading]);

  // Focus input on mount
  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 300);
  }, []);

  const sendMessage = useCallback(async (text) => {
    const msg = (text || input).trim();
    if (!msg || loading) return;

    setInput('');
    if (inputRef.current) inputRef.current.style.height = 'auto';
    setMessages(prev => [...prev, { role: 'user', content: msg, time: new Date().toISOString() }]);

    // Detect initial label and set up phase cycling
    const initialLabel = detectLoadingLabel(msg);
    setLoadingLabel(initialLabel);
    loadingTimers.current.forEach(clearTimeout);
    loadingTimers.current = [];
    LOADING_PHASES.slice(1).forEach(phase => {
      const t = setTimeout(() => setLoadingLabel(phase.label || initialLabel), phase.delay);
      loadingTimers.current.push(t);
    });

    setLoading(true);

    try {
      const res = await api.post('/noxtm-assistant/chat', { message: msg });
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: res.data.message,
        time: new Date().toISOString()
      }]);

      // Show success toasts for any actions the bot performed
      const TOAST_LABELS = {
        create_task: 'Task created by Noxtm Bot',
        create_whatsapp_campaign: 'WhatsApp Campaign created by Noxtm Bot',
        schedule_action: 'Action scheduled by Noxtm Bot',
        save_memory: 'Memory saved by Noxtm Bot',
        send_team_message: 'Message sent by Noxtm Bot',
        send_whatsapp_message: 'WhatsApp message sent by Noxtm Bot',
      };
      (res.data.actionsPerformed || []).forEach(action => {
        const label = TOAST_LABELS[action.type] || `${action.label} done by Noxtm Bot`;
        const detail = action.title ? `: "${action.title}"` : '';
        toast.success(`${label}${detail}`);
      });

      // Refresh scheduled actions after each message (in case a new one was created)
      try {
        const actionsRes = await api.get('/noxtm-assistant/actions?status=pending');
        setScheduledActions(actionsRes.data.actions || []);
      } catch {}
    } catch (err) {
      const errMsg = err.response?.data?.error || 'Failed to send. Try again.';
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: errMsg,
        time: new Date().toISOString(),
        isError: true
      }]);
    } finally {
      loadingTimers.current.forEach(clearTimeout);
      loadingTimers.current = [];
      setLoading(false);
      setLoadingLabel('Thinking');
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [input, loading]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleClearChat = async () => {
    try {
      await api.delete('/noxtm-assistant/history');
      setMessages([]);
    } catch {}
  };

  const handleCancelAction = async (actionId) => {
    try {
      await api.delete(`/noxtm-assistant/actions/${actionId}`);
      setScheduledActions(prev => prev.filter(a => a._id !== actionId));
    } catch {}
  };

  const formatTime = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const isEmpty = messages.length === 0;

  return (
    <div className="na-container">
      {/* Header */}
      <div className="na-header">
        <div className="na-header-left">
          <button className="na-collapse-btn" onClick={onCollapse} title="Collapse assistant">
            <img src={splitViewIcon} alt="Collapse" className="na-split-icon" />
          </button>
          <div className="na-header-info">
            <span className="na-header-name">Noxtm</span>
          </div>
        </div>
        {messages.length > 0 && (
          <button className="na-clear-btn" onClick={handleClearChat} title="Clear chat">
            <TrashIcon />
          </button>
        )}
      </div>

      {/* Scheduled Actions Banner */}
      {scheduledActions.length > 0 && (
        <div className="na-actions-banner">
          <div className="na-actions-label">
            <ClockIcon /> {scheduledActions.length} scheduled
          </div>
          <div className="na-actions-list">
            {scheduledActions.slice(0, 3).map(action => (
              <div key={action._id} className="na-action-item">
                <span className="na-action-desc">{action.description?.substring(0, 60)}</span>
                <span className="na-action-time">{formatTime(action.scheduledAt)}</span>
                <button className="na-action-cancel" onClick={() => handleCancelAction(action._id)}>x</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Messages */}
      <div className="na-messages" ref={messagesContainerRef}>
        {isEmpty && !loading && (
          <div className="na-empty">
            <div className="na-empty-icon">
              <SparkleIcon />
            </div>
            <p className="na-empty-title">Ask me anything</p>
            <p className="na-empty-desc">I can manage tasks, send messages, check analytics, schedule actions, and more.</p>
            <div className="na-suggestions">
              {QUICK_SUGGESTIONS.map((s, i) => (
                <button key={i} className="na-suggestion-btn" onClick={() => sendMessage(s)}>
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`na-msg na-msg-${msg.role} ${msg.isError ? 'na-msg-error' : ''}`}>
            <div className="na-msg-bubble">
              {msg.content}
            </div>
            <span className="na-msg-time">{formatTime(msg.time)}</span>
          </div>
        ))}

        {loading && (
          <div className="na-msg na-msg-assistant">
            <div className="na-thinking-bubble">
              <span className="na-thinking-label">
                {loadingLabel}
                <span className="na-thinking-dot">.</span>
                <span className="na-thinking-dot">.</span>
                <span className="na-thinking-dot">.</span>
              </span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="na-input-area">
        <textarea
          ref={inputRef}
          className="na-input"
          placeholder="Ask anything..."
          value={input}
          rows={1}
          onChange={(e) => {
            setInput(e.target.value);
            e.target.style.height = 'auto';
            e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
          }}
          onKeyDown={handleKeyDown}
          disabled={loading}
        />
        <button
          className="na-send-btn"
          onClick={() => sendMessage()}
          disabled={!input.trim() || loading}
        >
          <SendIcon />
        </button>
      </div>
    </div>
  );
}

export default NoxtmAssistant;
