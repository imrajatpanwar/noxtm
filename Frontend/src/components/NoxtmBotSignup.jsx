// v2
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import SendMsgIcon from '../assets/Send_msg.svg';
import './NoxtmBotSignup.css';

// Use same backend URL as the rest of the app (config/api.js)
const API_BASE = (() => {
  if (process.env.REACT_APP_API_URL) return process.env.REACT_APP_API_URL;
  const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  return isLocal ? 'http://localhost:5001' : '';
})();

const GOOGLE_CLIENT_ID = '765005911235-ntg3ieuf0okgj7b4d7ve3bn4dr1gunjv.apps.googleusercontent.com';

const PLANS = {
  Starter: { price: '₹1,699/mo', trial: true, members: '5 members', storage: '10 GB', features: ['Task Manager', 'Team Chat', 'Notes', 'Basic HR'] },
  'Pro+': { price: '₹2,699/mo', trial: true, members: '60 members', storage: '50 GB', popular: true, features: ['Everything in Starter', 'Email Marketing', 'Campaign Setup', 'Advanced Analytics'] },
  Advance: { price: '₹4,699/mo', trial: false, members: 'Unlimited', storage: '75 GB', features: ['Everything in Pro+', 'LinkedIn AI', 'WhatsApp Marketing', 'Priority Support'] },
};

const INDUSTRIES = ['Technology', 'Finance', 'Healthcare', 'Retail', 'Manufacturing', 'Education', 'Real Estate', 'Hospitality', 'Consulting', 'Marketing', 'Other'];
const SIZES = ['1-10', '11-50', '51-200', '201-500', '500+'];

// Google SVG icon
const GoogleIcon = () => (
  <svg viewBox="0 0 24 24" width="18" height="18">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
  </svg>
);


function NoxtmBotSignup({ onSignup }) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Core state
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [flowState, setFlowState] = useState('INTRO');
  const [collectedData, setCollectedData] = useState({});
  const [loading, setLoading] = useState(false);
  const [sessionId] = useState(() => 'noxtm_bot_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9));
  const [isSliding, setIsSliding] = useState(false);
  const [showPlans, setShowPlans] = useState(false);
  const [showIndustries, setShowIndustries] = useState(false);
  const [showSizes, setShowSizes] = useState(false);
  const [authToken, setAuthToken] = useState(null);

  // Scroll to bottom on new messages
  const scrollToBottom = useCallback(() => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  }, []);

  useEffect(() => { scrollToBottom(); }, [messages, loading, scrollToBottom]);

  // Restore session from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('noxtm_bot_session');
    if (saved) {
      try {
        const data = JSON.parse(saved);
        // Only restore sessions less than 15 minutes old with valid state
        if (Date.now() - data.timestamp < 15 * 60 * 1000 && data.messages?.length > 0) {
          setMessages(data.messages || []);
          setFlowState(data.flowState || 'INTRO');
          setCollectedData(data.collectedData || {});
          if (data.authToken) setAuthToken(data.authToken);
          return; // Don't fetch intro
        } else {
          localStorage.removeItem('noxtm_bot_session');
        }
      } catch (e) {
        localStorage.removeItem('noxtm_bot_session');
      }
    }

    // Check if returning from Google OAuth
    const resumed = searchParams.get('resumed');
    if (resumed === 'true') {
      const token = localStorage.getItem('token');
      const user = localStorage.getItem('user');
      if (token && user) {
        const userData = JSON.parse(user);
        setAuthToken(token);
        setCollectedData({ fullName: userData.fullName, email: userData.email, userId: userData._id });
        setFlowState('PLAN_SELECT');
        setMessages([
          { role: 'assistant', text: `Welcome back, ${userData.fullName?.split(' ')[0] || 'there'}! Google sign-in worked perfectly. Now let's pick a plan for you:` }
        ]);
        setShowPlans(true);
        return;
      }
    }

    // Fetch intro message
    fetchIntro();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persist session
  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem('noxtm_bot_session', JSON.stringify({
        messages, flowState, collectedData, authToken, timestamp: Date.now()
      }));
    }
  }, [messages, flowState, collectedData, authToken]);

  const fetchIntro = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/noxtm-bot/intro`);
      const data = await res.json();
      if (data.success) {
        setMessages([{ role: 'assistant', text: data.message }]);
      }
    } catch (e) {
      setMessages([{ role: 'assistant', text: "Hey! I'm Noxtm Bot, your setup assistant. Ready to create your workspace? Sign up with email or continue with Google!" }]);
    }
  };

  const sendMessage = async (text) => {
    if (!text.trim() || loading) return;

    const userMsg = text.trim();
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setInput('');
    setLoading(true);
    setShowPlans(false);
    setShowIndustries(false);
    setShowSizes(false);

    try {
      // Build conversation history for Claude context
      const history = messages.slice(-8).map(m => ({
        role: m.role === 'assistant' ? 'assistant' : 'user',
        content: m.text
      }));

      const res = await fetch(`${API_BASE}/api/noxtm-bot/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(authToken ? { 'Authorization': `Bearer ${authToken}` } : {})
        },
        body: JSON.stringify({
          sessionId,
          message: userMsg,
          flowState,
          collectedData,
          conversationHistory: history
        })
      });

      const data = await res.json();

      if (data.reply) {
        setMessages(prev => [...prev, { role: 'assistant', text: data.reply }]);

        if (data.newFlowState) setFlowState(data.newFlowState);
        if (data.collectedData) setCollectedData(data.collectedData);

        // Handle actions
        handleAction(data.action, data.actionData, data.newFlowState);
      } else if (data.success === false && !data.reply) {
        // Server error without reply - provide contextual fallback
        const fallbacks = {
          INTRO: "Let's get started! Would you like to sign up with email or Google?",
          COLLECT_NAME: "What's your full name?",
          COLLECT_EMAIL: "What's your email address?",
          COLLECT_PASSWORD: "Create a password (at least 6 characters).",
          EMAIL_VERIFY: "Enter the 6-digit code from your email. If the email is wrong, say \"change email\".",
          PLAN_SELECT: "Pick a plan from the options above!",
          COMPANY_NAME: "What's your company name?",
          COMPANY_EMAIL: "What's your company email?",
          COMPANY_INDUSTRY: "What industry are you in?",
          COMPANY_SIZE: "How big is your team?",
        };
        setMessages(prev => [...prev, { role: 'assistant', text: fallbacks[flowState] || "Could you try that again?" }]);
      } else {
        setMessages(prev => [...prev, { role: 'assistant', text: data.reply || "Could you try that again?" }]);
      }
    } catch (error) {
      console.error('[NoxtmBot] Send error:', error);
      setMessages(prev => [...prev, { role: 'assistant', text: "Connection hiccup! Could you try again?" }]);
    } finally {
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  const handleAction = (action, actionData, newState) => {
    if (!action) {
      // Show UI elements based on state
      if (newState === 'PLAN_SELECT') setShowPlans(true);
      if (newState === 'COMPANY_INDUSTRY') setShowIndustries(true);
      if (newState === 'COMPANY_SIZE') setShowSizes(true);
      return;
    }

    switch (action) {
      case 'GOOGLE_SIGNUP':
        // Will show Google button
        break;

      case 'SHOW_PLANS':
        if (actionData?.token) {
          localStorage.setItem('token', actionData.token);
          localStorage.setItem('user', JSON.stringify(actionData.user));
          setAuthToken(actionData.token);
          window.dispatchEvent(new Event('userUpdated'));
        }
        setShowPlans(true);
        break;

      case 'TRIAL_STARTED':
        // Update user in localStorage with subscription
        try {
          const stored = JSON.parse(localStorage.getItem('user') || '{}');
          stored.subscription = {
            plan: actionData.plan,
            status: 'trial',
            endDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString()
          };
          localStorage.setItem('user', JSON.stringify(stored));
          window.dispatchEvent(new Event('userUpdated'));
        } catch (e) { /* ignore */ }
        break;

      case 'SHOW_INDUSTRIES':
        setShowIndustries(true);
        break;

      case 'SHOW_SIZES':
        setShowSizes(true);
        break;

      case 'OPEN_RAZORPAY':
        handleRazorpay(actionData?.plan || 'Advance');
        break;

      case 'COMPLETE':
        if (actionData?.token) {
          localStorage.setItem('token', actionData.token);
          setAuthToken(actionData.token);
        }
        if (actionData?.user) {
          localStorage.setItem('user', JSON.stringify(actionData.user));
          window.dispatchEvent(new Event('userUpdated'));
        }
        // Trigger slide animation
        setTimeout(() => {
          setIsSliding(true);
          setTimeout(() => {
            localStorage.removeItem('noxtm_bot_session');
            navigate('/dashboard');
          }, 900);
        }, 1500);
        break;

      case 'EMAIL_EXISTS':
        // Just show the message, no special action
        break;

      case 'STORE_AUTH':
        if (actionData?.token) {
          localStorage.setItem('token', actionData.token);
          localStorage.setItem('user', JSON.stringify(actionData.user));
          setAuthToken(actionData.token);
          window.dispatchEvent(new Event('userUpdated'));
        }
        setShowPlans(true);
        break;

      default:
        break;
    }
  };

  const handleGoogleSignup = () => {
    localStorage.setItem('noxtm_bot_onboarding', 'true');
    const googleAuthUrl = `${API_BASE}/api/auth/google`;
    window.location.href = googleAuthUrl;
  };

  const handleRazorpay = async (plan) => {
    try {
      // Load Razorpay script if not loaded
      if (!window.Razorpay) {
        await new Promise((resolve, reject) => {
          const script = document.createElement('script');
          script.src = 'https://checkout.razorpay.com/v1/checkout.js';
          script.onload = resolve;
          script.onerror = reject;
          document.body.appendChild(script);
        });
      }

      // Create order
      const res = await fetch(`${API_BASE}/api/razorpay/create-order`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({ plan, billingCycle: 'Monthly' })
      });

      const orderData = await res.json();
      if (!orderData.orderId) throw new Error('No order ID');

      const options = {
        key: orderData.key || 'rzp_live_CGeXYOLiJEIqJE',
        amount: orderData.amount,
        currency: 'INR',
        name: 'Noxtm',
        description: `${plan} Plan - Monthly`,
        order_id: orderData.orderId,
        handler: async function (response) {
          // Verify payment
          try {
            await fetch(`${API_BASE}/api/razorpay/verify-payment`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
              },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                plan,
                billingCycle: 'Monthly'
              })
            });

            // Tell backend payment is done
            await fetch(`${API_BASE}/api/noxtm-bot/payment-complete`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
              },
              body: JSON.stringify({ sessionId, plan })
            });

            setFlowState('COMPANY_NAME');
            setCollectedData(prev => ({ ...prev, plan }));
            setMessages(prev => [...prev, {
              role: 'assistant',
              text: `Payment successful! The ${plan} plan is all yours. Now let's set up your workspace — what's your company name?`
            }]);
          } catch (e) {
            setMessages(prev => [...prev, {
              role: 'assistant',
              text: "Payment went through but I had trouble updating things. Don't worry — try telling me your company name and we'll keep going!"
            }]);
            setFlowState('COMPANY_NAME');
          }
        },
        theme: { color: '#111827' },
        modal: {
          ondismiss: () => {
            setMessages(prev => [...prev, {
              role: 'assistant',
              text: "No worries! You can pick a different plan or try the payment again. What would you prefer?"
            }]);
            setShowPlans(true);
          }
        }
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (error) {
      console.error('[NoxtmBot] Razorpay error:', error);
      setMessages(prev => [...prev, {
        role: 'assistant',
        text: "Couldn't load the payment form. Want to try a plan with a free trial instead?"
      }]);
      setShowPlans(true);
    }
  };

  const handlePlanSelect = (planName) => {
    sendMessage(planName);
  };

  const handleQuickReply = (text) => {
    sendMessage(text);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const isPasswordState = flowState === 'COLLECT_PASSWORD';
  const isEmailVerifyState = flowState === 'EMAIL_VERIFY';

  const getPlaceholder = () => {
    switch (flowState) {
      case 'INTRO': return 'Type "email" to sign up or use Google below...';
      case 'COLLECT_NAME': return 'Enter your full name...';
      case 'COLLECT_EMAIL': return 'Enter your email address...';
      case 'COLLECT_PASSWORD': return 'Create a password (6+ chars)...';
      case 'EMAIL_VERIFY': return 'Enter the 6-digit code or type "change email"...';
      case 'PLAN_SELECT': return 'Pick a plan above or type its name...';
      case 'COMPANY_NAME': return 'Enter your company name...';
      case 'COMPANY_EMAIL': return 'Enter company email...';
      case 'COMPANY_INDUSTRY': return 'Pick an industry or type one...';
      case 'COMPANY_SIZE': return 'Select your team size...';
      default: return 'Type a message...';
    }
  };

  return (
    <div className={`noxtm-bot-page ${isSliding ? 'noxtm-bot-slide-out' : ''}`}>
      {/* Noxtm brand - always top left */}
      <div className="noxtm-bot-branding">
        <span className="noxtm-bot-brand-text noxtm-bot-brand-logo">noxtm</span>
      </div>

      {/* Log out - top right, only after signup (authToken set) */}
      {authToken && (
        <div className="noxtm-bot-logout">
          <Link to="/login" className="noxtm-bot-brand-text" onClick={() => {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            localStorage.removeItem('noxtm_bot_session');
          }}>Log out</Link>
        </div>
      )}

      {/* Messages */}
      <div className="noxtm-bot-messages">
        {messages.map((msg, i) => (
          <div key={i} className={`noxtm-bot-msg noxtm-bot-msg-${msg.role}`}>
            <div className="noxtm-bot-msg-bubble">{msg.text}</div>
          </div>
        ))}

        {/* Typing indicator */}
        {loading && (
          <div className="noxtm-bot-typing">
            <div className="noxtm-bot-typing-dot" />
            <div className="noxtm-bot-typing-dot" />
            <div className="noxtm-bot-typing-dot" />
          </div>
        )}

        {/* Change email hint during verification */}
        {isEmailVerifyState && !loading && (
          <div className="noxtm-bot-quick-replies">
            <button className="noxtm-bot-quick-btn" onClick={() => handleQuickReply('change email')}>
              Change Email Address
            </button>
          </div>
        )}

        {/* Plan cards */}
        {showPlans && !loading && (
          <div className="noxtm-bot-plans">
            {Object.entries(PLANS).map(([name, plan]) => (
              <div
                key={name}
                className={`noxtm-bot-plan-card ${plan.popular ? 'popular' : ''}`}
                onClick={() => handlePlanSelect(name)}
              >
                {plan.popular && <div className="noxtm-bot-plan-badge">Popular</div>}
                <div className="noxtm-bot-plan-card-header">
                  <span className="noxtm-bot-plan-name">{name}</span>
                  <span className="noxtm-bot-plan-price">{plan.price}</span>
                </div>
                <div className="noxtm-bot-plan-features">
                  <span className="noxtm-bot-plan-feature">{plan.members}</span>
                  <span className="noxtm-bot-plan-feature">{plan.storage}</span>
                  {plan.features.slice(0, 2).map((f, j) => (
                    <span key={j} className="noxtm-bot-plan-feature">{f}</span>
                  ))}
                </div>
                {plan.trial && <div className="noxtm-bot-plan-trial">14-day free trial</div>}
              </div>
            ))}
          </div>
        )}

        {/* Industry quick replies */}
        {showIndustries && !loading && (
          <div className="noxtm-bot-quick-replies">
            {INDUSTRIES.map(ind => (
              <button key={ind} className="noxtm-bot-quick-btn" onClick={() => handleQuickReply(ind)}>{ind}</button>
            ))}
          </div>
        )}

        {/* Size quick replies */}
        {showSizes && !loading && (
          <div className="noxtm-bot-quick-replies">
            {SIZES.map(size => (
              <button key={size} className="noxtm-bot-quick-btn" onClick={() => handleQuickReply(size)}>{size}</button>
            ))}
          </div>
        )}

        {/* Google signup button (only in INTRO) */}
        {flowState === 'INTRO' && messages.length > 0 && !loading && (
          <div className="noxtm-bot-quick-replies">
            <button className="noxtm-bot-quick-btn" onClick={() => handleQuickReply('I want to sign up with email')}>
              Sign up with Email
            </button>
            <button className="noxtm-bot-quick-btn" onClick={handleGoogleSignup}>
              Continue with Google
            </button>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="noxtm-bot-input-area">
        {isPasswordState ? (
          <input
            ref={inputRef}
            type="password"
            className="noxtm-bot-input password-mode"
            placeholder={getPlaceholder()}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={loading || flowState === 'COMPLETE'}
            autoFocus
          />
        ) : (
          <textarea
            ref={inputRef}
            className="noxtm-bot-input noxtm-bot-input-textarea"
            placeholder={getPlaceholder()}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={loading || flowState === 'COMPLETE'}
            autoFocus
            rows={1}
          />
        )}
        <button
          className="noxtm-bot-send-btn"
          onClick={() => sendMessage(input)}
          disabled={!input.trim() || loading}
        >
          <img src={SendMsgIcon} alt="Send" />
        </button>
      </div>

      {/* Login link */}
      <div className="noxtm-bot-login-link">
        Already have an account? <Link to="/login">Log in</Link>
      </div>
    </div>
  );
}

export default NoxtmBotSignup;
