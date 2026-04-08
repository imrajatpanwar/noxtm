import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import api from '../config/api';
import './NoxtmBotSignup.css';
import './CompanySetupChat.css';
import setupBg from '../assets/background_setup.webp';

// ─── Pricing Plans (embedded in setup flow) ───
const PLANS = [
  {
    name: 'Starter',
    subtitle: 'For solo entrepreneurs',
    monthlyPrice: 1699,
    yearlyPrice: 1359,
    planKey: 'Starter',
    hasTrial: true,
    features: ['Dashboard management', '5 Team members', 'Business mail', '10 GB Storage', 'AI Analytics', '10+ integrations']
  },
  {
    name: 'Pro +',
    subtitle: 'For Small Businesses',
    monthlyPrice: 2699,
    yearlyPrice: 2159,
    planKey: 'Pro+',
    hasTrial: true,
    popular: true,
    features: ['Everything in Starter', '60 Team members', '10,000 Bulk emails', '50 GB Storage', 'Analytics Bot', 'Priority support']
  },
  {
    name: 'Advance',
    subtitle: 'For High-scale businesses',
    monthlyPrice: 4699,
    yearlyPrice: 3759,
    planKey: 'Advance',
    hasTrial: false,
    features: ['Everything in Pro+', 'Unlimited Team', '50,000 Bulk emails', '75 GB Storage', 'Advanced bot', 'Custom branding']
  }
];

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

const INDUSTRIES = [
  'Technology', 'Marketing', 'Healthcare', 'Finance', 'Education',
  'E-commerce', 'Real Estate', 'Manufacturing', 'Media', 'Consulting',
  'Legal', 'Non-profit', 'Hospitality', 'Retail', 'Automotive',
  'Agriculture', 'Construction', 'Energy', 'Entertainment', 'Food & Beverage',
  'Insurance', 'Logistics', 'Pharmaceutical', 'Sports', 'Telecom',
  'Design', 'SaaS', 'Agency', 'Freelance', 'Other',
];

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
  const [enrichEditing, setEnrichEditing] = useState(null); // null | { description, industry, country }
  const [showPlanPicker, setShowPlanPicker] = useState(false);
  const [billingType, setBillingType] = useState('monthly');
  const [planLoading, setPlanLoading] = useState(false);

  // Redirect if user already has company — or show plan picker if no plan
  useEffect(() => {
    const stored = localStorage.getItem('user');
    if (stored) {
      try {
        const u = JSON.parse(stored);
        if (u.companyId) {
          const sub = u.subscription;
          const hasActive = sub && (sub.status === 'active' || (sub.status === 'trial' && sub.endDate && new Date(sub.endDate) > new Date()));
          if (hasActive) {
            navigate('/dashboard');
          } else {
            // Company exists but no plan — show plan picker
            setIsComplete(true);
            setShowPlanPicker(true);
            setInitialized(true);
          }
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
          body: JSON.stringify({ slug: currentSlug, sessionId, userContext: { timezone: Intl.DateTimeFormat().resolvedOptions().timeZone } }),
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
      if (data.enrichResult?.pendingConfirmation && data.enrichResult?.domain) {
        setEnrichInfo(data.enrichResult);
        setEnrichEditing(null);
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
          // No more skills — show plan picker inline instead of redirecting
          if (result?.success) {
            setTimeout(() => setShowPlanPicker(true), 800);
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

  // Enrichment card: "Looks good!" — just dismiss, data already saved
  const handleEnrichConfirm = useCallback(() => {
    setEnrichEditing(null);
    setEnrichInfo(null);
  }, []);

  // Enrichment card: "Save changes" — PATCH overridden fields to backend
  const handleEnrichSave = useCallback(async (edits) => {
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`${API_BASE}/api/noxtm-skills/session/${sessionId}/enrich`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          fields: {
            description: edits.description,
            industry: edits.industry,
            companyCountry: edits.country,
          },
        }),
      });
      const data = await res.json();
      if (data.success && data.collected) {
        setCollected(data.collected);
      }
    } catch (e) {
      console.error('[EnrichSave] error:', e);
    }
    setEnrichEditing(null);
    setEnrichInfo(null);
  }, [sessionId]);

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

  // ─── Plan Selection Handler ───
  const handlePlanSelect = useCallback(async (plan) => {
    setPlanLoading(true);
    try {
      if (plan.hasTrial) {
        const response = await api.post('/subscription/start-trial', { plan: plan.planKey });
        if (response.data.success) {
          localStorage.setItem('user', JSON.stringify(response.data.user));
          window.dispatchEvent(new Event('userUpdated'));
          toast.success(`14-day free trial of ${plan.name} started!`);
          setIsSliding(true);
          setTimeout(() => navigate('/dashboard'), 900);
        } else {
          toast.error(response.data.message || 'Failed to start trial');
        }
      } else {
        // Advance plan — go to payment checkout
        setIsSliding(true);
        setTimeout(() => navigate(`/checkout?plan=${encodeURIComponent(plan.planKey)}&billing=${billingType === 'yearly' ? 'Annual' : 'Monthly'}`), 900);
      }
    } catch (error) {
      const msg = error.response?.data?.message || 'Failed to process. Please try again.';
      toast.error(msg);
    } finally {
      setPlanLoading(false);
    }
  }, [billingType, navigate]);

  const showOptions = currentQuestion?.type === 'select' && currentQuestion?.options?.length > 0;
  const canSkip = currentQuestion && (currentQuestion.skippable || !currentQuestion.required);
  const canDefer = currentQuestion?.deferrable;
  const showFileUpload = currentQuestion?.type === 'file' || currentQuestion?.type === 'image';
  const placeholder = currentQuestion?.placeholder || 'Type your answer...';
  const progressPct = progress.total > 0 ? Math.round(((progress.answered + progress.skipped + (progress.deferred || 0)) / progress.total) * 100) : 0;

  return (
    <div className={`csc-page ${isSliding ? 'noxtm-bot-slide-out' : ''}`} style={{ backgroundImage: `url(${setupBg})` }}>
      <div className={`csc-glass-card ${showPlanPicker ? 'csc-glass-card-wide' : ''}`}>
        {/* Card Header */}
        <div className="csc-card-header">
          <span className="csc-brand">noxtm</span>
          <div className="csc-header-right">
            <span className="csc-step-label">{showPlanPicker ? 'Choose Plan' : 'Company Setup'}</span>
            {initialized && !isComplete && !showPlanPicker && (
              <button className="csc-restart-btn" onClick={handleRestart}>Start over</button>
            )}
          </div>
        </div>

        {/* ─── Plan Picker (shown after setup completes) ─── */}
        {showPlanPicker ? (
          <div className="csc-plan-picker">
            <div className="csc-plan-header">
              <h2 className="csc-plan-title">Choose your plan</h2>
              <p className="csc-plan-subtitle">Start with a 14-day free trial, upgrade anytime</p>
              <div className="csc-billing-toggle">
                <button className={`csc-billing-btn ${billingType === 'monthly' ? 'active' : ''}`} onClick={() => setBillingType('monthly')}>Monthly</button>
                <button className={`csc-billing-btn ${billingType === 'yearly' ? 'active' : ''}`} onClick={() => setBillingType('yearly')}>
                  Yearly <span className="csc-save-badge">Save 20%</span>
                </button>
              </div>
            </div>
            <div className="csc-plan-cards">
              {PLANS.map((plan) => (
                <div key={plan.planKey} className={`csc-plan-card ${plan.popular ? 'csc-plan-popular' : ''}`}>
                  {plan.popular && <div className="csc-popular-tag">Popular</div>}
                  <div className="csc-plan-card-top">
                    <h3 className="csc-plan-name">{plan.name}</h3>
                    <p className="csc-plan-desc">{plan.subtitle}</p>
                  </div>
                  <div className="csc-plan-price">
                    <span className="csc-plan-currency">&#8377;</span>
                    <span className="csc-plan-amount">{billingType === 'yearly' ? plan.yearlyPrice : plan.monthlyPrice}</span>
                    <span className="csc-plan-period">/mo</span>
                  </div>
                  <button
                    className={`csc-plan-cta ${plan.hasTrial ? 'csc-plan-trial' : ''}`}
                    onClick={() => handlePlanSelect(plan)}
                    disabled={planLoading}
                  >
                    {planLoading ? 'Processing...' : plan.hasTrial ? 'Start Free Trial' : 'Get Started'}
                  </button>
                  <ul className="csc-plan-features">
                    {plan.features.map((f, i) => (
                      <li key={i}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                        {f}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        ) : (
        <>
        {progress.total > 0 && (
          <div className="csc-progress-bar-wrapper">
            <div className="csc-progress-bar">
              <div className="csc-progress-fill" style={{ width: `${progressPct}%` }} />
            </div>
            <span className="csc-progress-label">{progressPct}%</span>
          </div>
        )}

        <div className="csc-messages">
        {messages.map((msg, i) => {
          if (msg.isDivider) {
            return <div key={i} className="csc-divider"><span>Next Step</span></div>;
          }

          return (
            <div key={i} className={`noxtm-bot-msg noxtm-bot-msg-${msg.role} ${msg.isBulkNote ? 'csc-bulk-note' : ''} ${msg.isEnrichNote ? 'csc-enrich-note' : ''}`}>
              {msg.imagePreview && (
                <img src={msg.imagePreview} alt="upload" className="csc-upload-preview" />
              )}
              {msg.isEnrichNote && msg.enrichData && (
                <div className="csc-enrich-card">
                  {/* Header: Logo + Name + Domain */}
                  <div className="csc-enrich-header">
                    {msg.enrichData.logo && (
                      <img src={`${API_BASE}${msg.enrichData.logo}`} alt="logo" className="csc-enrich-logo" onError={(e) => { e.target.style.display = 'none'; }} />
                    )}
                    <div className="csc-enrich-info">
                      <span className="csc-enrich-name">{msg.enrichData.companyName || msg.enrichData.domain}</span>
                      <a href={msg.enrichData.website || `https://${msg.enrichData.domain}`} target="_blank" rel="noopener noreferrer" className="csc-enrich-domain">{msg.enrichData.domain}</a>
                    </div>
                  </div>

                  {/* Tags: Industry + Country + Size */}
                  <div className="csc-enrich-meta">
                    {msg.enrichData.industry && <span className="csc-enrich-industry">{msg.enrichData.industry}</span>}
                    {msg.enrichData.country && <span className="csc-enrich-tag">{msg.enrichData.city ? `${msg.enrichData.city}, ` : ''}{msg.enrichData.country}</span>}
                    {msg.enrichData.size && <span className="csc-enrich-tag">{msg.enrichData.size} employees</span>}
                    {msg.enrichData.foundedYear && <span className="csc-enrich-tag">Est. {msg.enrichData.foundedYear}</span>}
                  </div>

                  {/* Description */}
                  {msg.enrichData.description && !enrichEditing && (
                    <div className="csc-enrich-description">{msg.enrichData.description}</div>
                  )}

                  {/* Extra Details Row */}
                  {!enrichEditing && (msg.enrichData.phone || msg.enrichData.specialties?.length > 0 || msg.enrichData.techStack?.length > 0) && (
                    <div className="csc-enrich-details">
                      {msg.enrichData.phone && (
                        <div className="csc-enrich-detail-row">
                          <span className="csc-enrich-detail-label">Phone</span>
                          <span className="csc-enrich-detail-value">{msg.enrichData.phone}</span>
                        </div>
                      )}
                      {msg.enrichData.specialties?.length > 0 && (
                        <div className="csc-enrich-detail-row">
                          <span className="csc-enrich-detail-label">Specialties</span>
                          <span className="csc-enrich-detail-value">{msg.enrichData.specialties.join(', ')}</span>
                        </div>
                      )}
                      {msg.enrichData.techStack?.length > 0 && (
                        <div className="csc-enrich-detail-row">
                          <span className="csc-enrich-detail-label">Tech</span>
                          <span className="csc-enrich-detail-value">{msg.enrichData.techStack.slice(0, 5).join(', ')}</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Social Links */}
                  {!enrichEditing && msg.enrichData.socialLinks && Object.values(msg.enrichData.socialLinks).some(Boolean) && (
                    <div className="csc-enrich-socials">
                      {msg.enrichData.socialLinks.linkedin && <a href={msg.enrichData.socialLinks.linkedin} target="_blank" rel="noopener noreferrer" className="csc-enrich-social-link">LinkedIn</a>}
                      {msg.enrichData.socialLinks.twitter && <a href={msg.enrichData.socialLinks.twitter} target="_blank" rel="noopener noreferrer" className="csc-enrich-social-link">Twitter</a>}
                      {msg.enrichData.socialLinks.facebook && <a href={msg.enrichData.socialLinks.facebook} target="_blank" rel="noopener noreferrer" className="csc-enrich-social-link">Facebook</a>}
                      {msg.enrichData.socialLinks.instagram && <a href={msg.enrichData.socialLinks.instagram} target="_blank" rel="noopener noreferrer" className="csc-enrich-social-link">Instagram</a>}
                    </div>
                  )}

                  {/* Edit Mode */}
                  {enrichEditing && (
                    <div className="csc-enrich-edit-fields">
                      <div className="csc-enrich-edit-row">
                        <label className="csc-enrich-edit-label">Description</label>
                        <input className="csc-enrich-edit-input" value={enrichEditing.description} onChange={(e) => setEnrichEditing(prev => ({ ...prev, description: e.target.value }))} />
                      </div>
                      <div className="csc-enrich-edit-row">
                        <label className="csc-enrich-edit-label">Industry</label>
                        <select className="csc-enrich-edit-select" value={enrichEditing.industry} onChange={(e) => setEnrichEditing(prev => ({ ...prev, industry: e.target.value }))}>
                          <option value="">Select...</option>
                          {INDUSTRIES.map(ind => <option key={ind} value={ind}>{ind}</option>)}
                        </select>
                      </div>
                      <div className="csc-enrich-edit-row">
                        <label className="csc-enrich-edit-label">Country</label>
                        <input className="csc-enrich-edit-input" value={enrichEditing.country} onChange={(e) => setEnrichEditing(prev => ({ ...prev, country: e.target.value }))} />
                      </div>
                    </div>
                  )}

                  {/* Action Buttons */}
                  {!isComplete && (
                    <div className="csc-enrich-actions">
                      {enrichEditing ? (
                        <button className="csc-enrich-confirm-btn" onClick={() => handleEnrichSave(enrichEditing)}>
                          Save changes
                        </button>
                      ) : (
                        <>
                          <button className="csc-enrich-confirm-btn" onClick={handleEnrichConfirm}>
                            Looks good!
                          </button>
                          <button className="csc-enrich-edit-btn" onClick={() => setEnrichEditing({
                            description: msg.enrichData.description || '',
                            industry: msg.enrichData.industry || '',
                            country: msg.enrichData.country || '',
                          })}>
                            Edit details
                          </button>
                        </>
                      )}
                    </div>
                  )}
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

        {/* Input Area */}
        <div className="csc-input-area">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,.pdf,.doc,.docx"
            style={{ display: 'none' }}
            onChange={handleFileSelect}
          />

          {showFileUpload && !loading && (
            <button className="csc-upload-btn" onClick={() => fileInputRef.current?.click()} title="Upload file">
              <UploadIcon />
            </button>
          )}

          <input
            ref={inputRef}
            type="text"
            className="csc-input"
            placeholder={isListening ? 'Listening...' : placeholder}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={loading || isComplete || !initialized}
            autoFocus
          />

          {canDefer && !canSkip && !loading && (
            <button className="csc-defer-btn" onClick={handleDefer} disabled={loading || isComplete}>Later</button>
          )}
          {canSkip && !loading && (
            <button className="csc-skip-btn" onClick={handleSkip} disabled={loading || isComplete}>Skip</button>
          )}

          {hasSpeech && !loading && !isComplete && (
            <button className={`csc-mic-btn ${isListening ? 'csc-mic-active' : ''}`} onClick={toggleVoice}>
              <MicIcon active={isListening} />
            </button>
          )}

          <button className="csc-send-btn" onClick={() => sendMessage(input)} disabled={!input.trim() || loading || isComplete}>
            <SendIcon />
          </button>
        </div>
        </>
        )}
      </div>
    </div>
  );
}

export default CompanySetupChat;
