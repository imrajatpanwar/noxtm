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

const MicIcon = ({ active }) => (
  <svg viewBox="0 0 24 24" fill={active ? '#ef4444' : 'none'} stroke={active ? '#ef4444' : 'currentColor'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
    <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
    <line x1="12" y1="19" x2="12" y2="23" /><line x1="8" y1="23" x2="16" y2="23" />
  </svg>
);

const UploadIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" />
  </svg>
);

const SKILL_SLUG = 'company-setup';

// Web Speech API availability
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
const hasSpeech = !!SpeechRecognition;

function CompanySetupChat() {
  const navigate = useNavigate();
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const fileInputRef = useRef(null);
  const recognitionRef = useRef(null);

  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [collected, setCollected] = useState({});
  const [isSliding, setIsSliding] = useState(false);
  const [sessionId, setSessionId] = useState(() => 'css_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9));
  const [isComplete, setIsComplete] = useState(false);
  const [progress, setProgress] = useState({ total: 0, answered: 0, skipped: 0, deferred: 0 });
  const [resumed, setResumed] = useState(false);
  const [enrichInfo, setEnrichInfo] = useState(null);
  const [isListening, setIsListening] = useState(false);
  const [currentSlug, setCurrentSlug] = useState(SKILL_SLUG);

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

  // Cleanup speech recognition on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
        recognitionRef.current = null;
      }
    };
  }, []);

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
          body: JSON.stringify({ slug: currentSlug, sessionId }),
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

        setMessages(prev => [...prev, ...initMessages]);
        setCurrentQuestion(data.question);
        setCollected(data.collected || {});
        if (data.progress) setProgress(data.progress);
        if (data.enrichResult) setEnrichInfo(data.enrichResult);
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
  }, [initialized, sessionId, currentSlug, navigate]);

  // Skill composition: start next skill after current one completes
  const startNextSkill = useCallback((nextSlug) => {
    const newSid = 'css_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    setSessionId(newSid);
    setCurrentSlug(nextSlug);
    setCurrentQuestion(null);
    setCollected({});
    setIsComplete(false);
    setProgress({ total: 0, answered: 0, skipped: 0, deferred: 0 });
    setEnrichInfo(null);
    setInitialized(false);
    // Keep existing messages so the conversation feels continuous
    setMessages(prev => [...prev, { role: 'assistant', text: '---', isDivider: true }]);
  }, []);

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

      // Show bulk extraction feedback
      if (data.bulkExtraction && data.newlyExtracted?.length >= 2) {
        const fieldNames = data.newlyExtracted.map(f => f.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase()).trim());
        setMessages(prev => [...prev, {
          role: 'assistant',
          text: `Got it — captured ${fieldNames.join(', ')} all at once!`,
          isBulkNote: true,
        }]);
      }

      // Show enrichment result (company found from email/domain)
      if (data.enrichResult?.logo && data.enrichResult?.domain) {
        setEnrichInfo(data.enrichResult);
        setMessages(prev => [...prev, {
          role: 'assistant',
          text: `Found your company!`,
          isEnrichNote: true,
          enrichData: data.enrichResult,
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
        }

        // Skill composition: if nextSkill is returned, chain into it
        const nextSkill = data.onComplete?.nextSkill;
        if (nextSkill) {
          setTimeout(() => startNextSkill(nextSkill), 1500);
        } else {
          // No more skills — redirect
          if (result?.success) {
            setTimeout(() => {
              setIsSliding(true);
              setTimeout(() => navigate(data.onComplete?.redirect || '/pricing'), 900);
            }, 1200);
          } else if (result && !result.success) {
            toast.error(result.error || 'Failed to create workspace');
          }
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
  const handleDefer = () => sendMessage('later');

  // Voice input via Web Speech API
  const toggleVoice = useCallback(() => {
    if (!hasSpeech) {
      toast.error('Voice input not supported in this browser');
      return;
    }

    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setInput(prev => prev ? `${prev} ${transcript}` : transcript);
      setIsListening(false);
    };

    recognition.onerror = (event) => {
      console.error('[Voice] error:', event.error);
      if (event.error !== 'aborted') toast.error('Voice input failed. Try again.');
      setIsListening(false);
    };

    recognition.onend = () => setIsListening(false);

    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
  }, [isListening]);

  // File upload (logo, business card)
  const handleFileSelect = useCallback(async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File too large (max 5MB)');
      return;
    }

    // For images, show preview + send filename as message
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        setMessages(prev => [...prev, {
          role: 'user',
          text: `[Uploaded: ${file.name}]`,
          imagePreview: ev.target.result,
        }]);
      };
      reader.readAsDataURL(file);

      // Send the filename as the message (backend will handle as text for now)
      sendMessage(`[file: ${file.name}]`);
    } else {
      sendMessage(`[file: ${file.name}]`);
    }

    // Reset file input
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, []);

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
    setProgress({ total: 0, answered: 0, skipped: 0, deferred: 0 });
    setResumed(false);
    setEnrichInfo(null);
    setCurrentSlug(SKILL_SLUG);
    setSessionId('css_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9));
  };

  const showOptions = currentQuestion?.type === 'select' && currentQuestion?.options?.length > 0;
  const canSkip = currentQuestion && (currentQuestion.skippable || !currentQuestion.required);
  const canDefer = currentQuestion?.deferrable;
  const showFileUpload = currentQuestion?.type === 'file' || currentQuestion?.type === 'image';
  const placeholder = currentQuestion?.placeholder || 'Type your answer...';
  const progressPct = progress.total > 0 ? Math.round(((progress.answered + progress.skipped + (progress.deferred || 0)) / progress.total) * 100) : 0;

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
        {messages.map((msg, i) => {
          if (msg.isDivider) {
            return <div key={i} className="csc-divider"><span>Next Step</span></div>;
          }

          return (
            <div key={i} className={`noxtm-bot-msg noxtm-bot-msg-${msg.role} ${msg.isBulkNote ? 'csc-bulk-note' : ''} ${msg.isEnrichNote ? 'csc-enrich-note' : ''}`}>
              {msg.imagePreview && (
                <img src={msg.imagePreview} alt="upload" className="csc-upload-preview" />
              )}
              {msg.isEnrichNote && msg.enrichData?.logo && (
                <div className="csc-enrich-card">
                  <img src={msg.enrichData.logo} alt="logo" className="csc-enrich-logo" onError={(e) => { e.target.style.display = 'none'; }} />
                  <span className="csc-enrich-domain">{msg.enrichData.domain}</span>
                </div>
              )}
              <div className="noxtm-bot-msg-bubble">{msg.text}</div>
            </div>
          );
        })}

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
        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,.pdf,.doc,.docx"
          style={{ display: 'none' }}
          onChange={handleFileSelect}
        />

        {showFileUpload && !loading && (
          <button
            className="csc-upload-btn"
            onClick={() => fileInputRef.current?.click()}
            title="Upload file"
          >
            <UploadIcon />
          </button>
        )}

        <input
          ref={inputRef}
          type="text"
          className="noxtm-bot-input"
          placeholder={isListening ? 'Listening...' : placeholder}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={loading || isComplete || !initialized}
          autoFocus
        />

        {canDefer && !canSkip && !loading && (
          <button className="csc-defer-btn" onClick={handleDefer} disabled={loading || isComplete} title="Answer later">
            Later
          </button>
        )}
        {canSkip && !loading && (
          <button className="csc-skip-btn" onClick={handleSkip} disabled={loading || isComplete}>
            Skip
          </button>
        )}

        {hasSpeech && !loading && !isComplete && (
          <button
            className={`csc-mic-btn ${isListening ? 'csc-mic-active' : ''}`}
            onClick={toggleVoice}
            title={isListening ? 'Stop listening' : 'Voice input'}
          >
            <MicIcon active={isListening} />
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
