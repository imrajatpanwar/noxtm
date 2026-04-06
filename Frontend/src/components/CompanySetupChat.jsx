import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import './NoxtmBotSignup.css';
import './CompanySetupChat.css';

const API_BASE = (() => {
  if (process.env.REACT_APP_API_URL) return process.env.REACT_APP_API_URL;
  const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  return isLocal ? 'http://localhost:5001' : '';
})();

const SendIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
  </svg>
);

const SKILL_SLUG = 'company-setup';

function CompanySetupChat() {
  const navigate = useNavigate();
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [collected, setCollected] = useState({});
  const [isSliding, setIsSliding] = useState(false);
  const [sessionId] = useState(() => 'css_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9));
  const [isComplete, setIsComplete] = useState(false);
  const [progress, setProgress] = useState({ total: 0, answered: 0, skipped: 0 });
  const [resumed, setResumed] = useState(false);

  // Redirect if user already has company
  useEffect(() => {
    const stored = localStorage.getItem('user');
    if (stored) {
      try {
        const u = JSON.parse(stored);
        if (u.companyId) {
          const sub = u.subscription;
          const hasActive = sub && (sub.status === 'active' || (sub.status === 'trial' && sub.endDate && new Date(sub.endDate) > new Date()));
          navigate(hasActive ? '/dashboard' : '/pricing');
        }
      } catch (e) {}
    }
  }, [navigate]);

  const scrollToBottom = useCallback(() => {
    setTimeout(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, 100);
  }, []);

  useEffect(() => { scrollToBottom(); }, [messages, loading, scrollToBottom]);

  // Start the skill session
  useEffect(() => {
    if (initialized) return;
    const token = localStorage.getItem('token');
    if (!token) { navigate('/login'); return; }

    const start = async () => {
      try {
        setLoading(true);
        const res = await fetch(`${API_BASE}/api/noxtm-skills/start`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({ slug: SKILL_SLUG, sessionId }),
        });
        const data = await res.json();
        if (!data.success) {
          toast.error(data.message || 'Could not start setup');
          return;
        }
        if (data.alreadyComplete) {
          navigate(data.redirect || '/pricing');
          return;
        }

        const initMessages = [{ role: 'assistant', text: data.reply }];

        if (data.resumed && Object.keys(data.collected || {}).length > 0) {
          setResumed(true);
          const fields = Object.keys(data.collected).join(', ');
          initMessages.unshift({
            role: 'assistant',
            text: `Welcome back! I still have your previous answers (${fields}). Let's pick up where we left off.`,
          });
        }

        setMessages(initMessages);
        setCurrentQuestion(data.question);
        setCollected(data.collected || {});
        if (data.progress) setProgress(data.progress);
        setInitialized(true);
      } catch (e) {
        console.error('[CompanySetupChat] start error:', e);
        toast.error('Connection issue. Refresh to retry.');
      } finally {
        setLoading(false);
        setTimeout(() => inputRef.current?.focus(), 200);
      }
    };
    start();
  }, [initialized, sessionId, navigate]);

  const sendMessage = async (text) => {
    if (!text.trim() || loading || isComplete) return;
    const userMsg = text.trim();
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setInput('');
    setLoading(true);

    const token = localStorage.getItem('token');
    try {
      const history = messages.slice(-8).map(m => ({
        role: m.role === 'assistant' ? 'assistant' : 'user',
        content: m.text,
      }));

      const res = await fetch(`${API_BASE}/api/noxtm-skills/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ sessionId, message: userMsg, conversationHistory: history }),
      });
      const data = await res.json();

      if (data.success === false) {
        setMessages(prev => [...prev, { role: 'assistant', text: data.message || "Something went wrong. Try again?" }]);
        return;
      }

      // Show bulk extraction feedback if multiple fields were extracted at once
      if (data.bulkExtraction && data.newlyExtracted?.length >= 2) {
        const fieldNames = data.newlyExtracted.map(f => f.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase()).trim());
        setMessages(prev => [...prev, {
          role: 'assistant',
          text: `Got it — captured ${fieldNames.join(', ')} all at once!`,
          isBulkNote: true,
        }]);
      }

      if (data.reply) {
        setMessages(prev => [...prev, { role: 'assistant', text: data.reply }]);
      }
      if (data.question) setCurrentQuestion(data.question);
      else setCurrentQuestion(null);
      if (data.collected) setCollected(data.collected);
      if (data.progress) setProgress(data.progress);

      if (data.complete) {
        setIsComplete(true);
        const result = data.onComplete?.result;
        if (result?.success && result.companyId) {
          try {
            const u = JSON.parse(localStorage.getItem('user') || '{}');
            u.companyId = result.companyId;
            localStorage.setItem('user', JSON.stringify(u));
            window.dispatchEvent(new Event('userUpdated'));
          } catch (e) {}
          toast.success('Workspace created!');
          setTimeout(() => {
            setIsSliding(true);
            setTimeout(() => navigate(data.onComplete?.redirect || '/pricing'), 900);
          }, 1200);
        } else if (result && !result.success) {
          toast.error(result.error || 'Failed to create workspace');
        }
      }
    } catch (e) {
      console.error('[CompanySetupChat] chat error:', e);
      setMessages(prev => [...prev, { role: 'assistant', text: "Connection hiccup. Try once more?" }]);
    } finally {
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  const handleQuickReply = (text) => sendMessage(text);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const handleSkip = () => sendMessage('skip');

  const handleRestart = async () => {
    const token = localStorage.getItem('token');
    try {
      await fetch(`${API_BASE}/api/noxtm-skills/session/${sessionId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      });
    } catch (e) {}
    setMessages([]);
    setCollected({});
    setCurrentQuestion(null);
    setInitialized(false);
    setIsComplete(false);
    setProgress({ total: 0, answered: 0, skipped: 0 });
    setResumed(false);
  };

  const showOptions = currentQuestion?.type === 'select' && currentQuestion?.options?.length > 0;
  const canSkip = currentQuestion && (currentQuestion.skippable || !currentQuestion.required);
  const placeholder = currentQuestion?.placeholder || 'Type your answer...';
  const progressPct = progress.total > 0 ? Math.round(((progress.answered + progress.skipped) / progress.total) * 100) : 0;

  return (
    <div className={`noxtm-bot-page ${isSliding ? 'noxtm-bot-slide-out' : ''}`}>
      <div className="noxtm-bot-branding">
        <span className="noxtm-bot-brand-text noxtm-bot-brand-logo">noxtm</span>
      </div>

      <div className="noxtm-bot-logout">
        <span className="noxtm-bot-step-indicator">
          Step 1 of 3 · Company Setup
        </span>
        {initialized && !isComplete && (
          <button className="csc-restart-btn" onClick={handleRestart} title="Start over">
            Start over
          </button>
        )}
      </div>

      {progress.total > 0 && (
        <div className="csc-progress-bar-wrapper">
          <div className="csc-progress-bar">
            <div className="csc-progress-fill" style={{ width: `${progressPct}%` }} />
          </div>
          <span className="csc-progress-label">{progressPct}%</span>
        </div>
      )}

      <div className="noxtm-bot-messages">
        {messages.map((msg, i) => (
          <div key={i} className={`noxtm-bot-msg noxtm-bot-msg-${msg.role} ${msg.isBulkNote ? 'csc-bulk-note' : ''}`}>
            <div className="noxtm-bot-msg-bubble">{msg.text}</div>
          </div>
        ))}

        {loading && (
          <div className="noxtm-bot-typing">
            <div className="noxtm-bot-typing-dot" />
            <div className="noxtm-bot-typing-dot" />
            <div className="noxtm-bot-typing-dot" />
          </div>
        )}

        {showOptions && !loading && (
          <div className="noxtm-bot-quick-replies">
            {currentQuestion.options.map(opt => (
              <button key={opt} className="noxtm-bot-quick-btn" onClick={() => handleQuickReply(opt)}>
                {opt}
              </button>
            ))}
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <div className="noxtm-bot-input-area">
        <input
          ref={inputRef}
          type="text"
          className="noxtm-bot-input"
          placeholder={placeholder}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={loading || isComplete || !initialized}
          autoFocus
        />
        {canSkip && !loading && (
          <button className="csc-skip-btn" onClick={handleSkip} disabled={loading || isComplete}>
            Skip
          </button>
        )}
        <button
          className="noxtm-bot-send-btn"
          onClick={() => sendMessage(input)}
          disabled={!input.trim() || loading || isComplete}
        >
          <SendIcon />
        </button>
      </div>
    </div>
  );
}

export default CompanySetupChat;
