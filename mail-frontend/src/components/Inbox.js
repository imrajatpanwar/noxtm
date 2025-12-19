import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiMail, FiSend, FiTrash2, FiArchive, FiStar, FiClock, FiUsers, FiSettings, FiLogOut, FiBarChart2, FiUpload } from 'react-icons/fi';
import MainstreamInbox from './MainstreamInbox';
import AnalyticsDashboard from './email/AnalyticsDashboard';
import SLAMonitor from './email/SLAMonitor';
import TemplateManager from './email/TemplateManager';
import RulesManager from './email/RulesManager';
import DomainManagement from './email/DomainManagement';
import CreateCampaign from './campaign/CreateCampaign';
import ImportMail from './campaign/ImportMail';
import CampaignAnalytics from './campaign/CampaignAnalytics';
import DomainSetupWizard from './onboarding/DomainSetupWizard';
import api from '../config/api';
import { MAIL_LOGIN_URL, getMainAppUrl } from '../config/authConfig';
import './Inbox.css';

function Inbox() {
  const [user, setUser] = useState(null);
  const [activeView, setActiveView] = useState('personal'); // personal, analytics, sla, templates, rules, domains
  const [showDomainWizard, setShowDomainWizard] = useState(false);
  const [hasVerifiedDomain, setHasVerifiedDomain] = useState(false);
  const [domainCheckComplete, setDomainCheckComplete] = useState(false); // NEW: Track if domain check is done
  const navigate = useNavigate();

  useEffect(() => {
    console.log('[INBOX] Component mounted - Starting authentication flow...');

    // Set loading flag to prevent API interceptor from redirecting during auth
    window.__NOXTM_AUTH_LOADING__ = true;

    // Check for auth_token in URL (from main app redirect after login)
    const urlParams = new URLSearchParams(window.location.search);
    const urlToken = urlParams.get('auth_token');

    const initializeTokenAndSync = async () => {
      if (urlToken) {
        console.log('[INBOX] ✅ Token found in URL, saving to localStorage');
        console.log('[INBOX] Token preview:', urlToken.substring(0, 20) + '...');

        // Save token from URL to localStorage
        localStorage.setItem('token', urlToken);

        // Also set Authorization header for immediate requests
        api.defaults.headers.common['Authorization'] = `Bearer ${urlToken}`;
        console.log('[INBOX] Authorization header set for immediate requests');

        // VERIFY token was saved
        const savedToken = localStorage.getItem('token');
        console.log('[INBOX] Token saved:', savedToken ? 'YES' : 'NO');

        // CRITICAL: Also store in a backup location in case something clears localStorage
        window.__NOXTM_AUTH_TOKEN__ = urlToken;
        console.log('[INBOX] Token also saved to window.__NOXTM_AUTH_TOKEN__ as backup');

        // Clean up URL by removing the token parameter
        const newUrl = window.location.pathname;
        window.history.replaceState({}, document.title, newUrl);
        console.log('[INBOX] URL cleaned, token removed from visible URL');

        // CRITICAL: Wait for cookie to sync across subdomains (1 second)
        console.log('[INBOX] Waiting 1s for auth cookie to sync across subdomains...');
        await new Promise(resolve => setTimeout(resolve, 1000));
        console.log('[INBOX] Auth sync wait complete, proceeding with API calls');
      } else {
        console.log('[INBOX] No token in URL, checking localStorage...');
        const storedToken = localStorage.getItem('token');
        if (storedToken) {
          console.log('[INBOX] ✅ Token found in localStorage');
          // Ensure Authorization header is set
          api.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`;
        } else {
          console.log('[INBOX] ⚠️  No token in localStorage either');
        }
      }
    };

    // Call async initialization then proceed with user load
    initializeTokenAndSync().then(() => {
      loadUser();
    });

    // Load user from localStorage or fetch from API (SSO check)
    const loadUser = async () => {
      // Ensure token is restored from backup BEFORE API calls
      let token = localStorage.getItem('token');
      if (!token && window.__NOXTM_AUTH_TOKEN__) {
        console.log('[INBOX] Restoring token from backup');
        localStorage.setItem('token', window.__NOXTM_AUTH_TOKEN__);
        token = window.__NOXTM_AUTH_TOKEN__;
      }

      console.log('[INBOX] Fetching user profile from /api/profile...');
      console.log('[INBOX] Token exists:', token ? 'YES (length: ' + token.length + ')' : 'NO');

      // Retry logic - try up to 3 times with 1 second delay
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          // Check SSO cookie via /profile endpoint
          const response = await api.get('/profile');
          console.log('[INBOX] ✅ Profile fetch SUCCESS:', response.data);
          setUser(response.data);
          localStorage.setItem('user', JSON.stringify(response.data));

          // Clear loading flag on success
          window.__NOXTM_AUTH_LOADING__ = false;

          // Check if user has a verified domain (skip for admins)
          if (response.data.role !== 'Admin') {
            console.log('[INBOX] User is not Admin, checking domain setup...');
            checkDomainSetup();
          } else {
            console.log('[INBOX] User is Admin - bypassing domain verification requirement');
            setHasVerifiedDomain(true); // Admins bypass domain requirement
            setDomainCheckComplete(true); // CRITICAL: Mark as complete for admins
          }
          return; // Success - exit function
        } catch (err) {
          console.error(`[INBOX] ❌ Profile fetch attempt ${attempt} FAILED:`, err);
          console.error('[INBOX] Error status:', err.response?.status);
          console.error('[INBOX] Error message:', err.response?.data);

          if (attempt < 3) {
            console.log(`[INBOX] Retrying in 1 second (attempt ${attempt + 1}/3)...`);
            await new Promise(resolve => setTimeout(resolve, 1000));
          } else {
            console.log('[INBOX] All retry attempts failed, redirecting to login:', MAIL_LOGIN_URL);
            // Clear loading flag before redirect
            window.__NOXTM_AUTH_LOADING__ = false;
            // No SSO session after all retries, redirect to main app login with redirect parameter
            window.location.href = MAIL_LOGIN_URL;
          }
        }
      }
    };

    // loadUser is now called in initializeTokenAndSync().then() - removed duplicate call
  }, [navigate]);

  const checkDomainSetup = async (retryCount = 0) => {
    console.log(`[INBOX] Checking domain setup via /api/email-domains... (attempt ${retryCount + 1})`);
    try {
      const response = await api.get('/email-domains');
      console.log('[INBOX] ✅ Email domains response:', response.data);

      const verifiedDomain = response.data.data?.find(d => d.verified);

      if (verifiedDomain) {
        console.log('[INBOX] ✅ Found verified domain:', verifiedDomain.domain);
        setHasVerifiedDomain(true);
        setShowDomainWizard(false);
      } else {
        console.log('[INBOX] ⚠️  No verified domain found - SHOWING DOMAIN WIZARD');
        console.log('[INBOX] Total domains:', response.data.data?.length || 0);

        // No verified domain - show wizard
        setHasVerifiedDomain(false);
        setShowDomainWizard(true);
      }
    } catch (err) {
      console.error('[INBOX] ❌ Error checking domain setup:', err);
      console.error('[INBOX] Error status:', err.response?.status);
      console.error('[INBOX] Error message:', err.response?.data);

      // If 401 and we haven't retried yet, try one more time after delay
      if (err.response?.status === 401 && retryCount === 0) {
        console.log('[INBOX] 401 error, retrying domain check in 1 second...');
        await new Promise(resolve => setTimeout(resolve, 1000));
        return checkDomainSetup(1); // Retry once with retryCount = 1
      }

      // If still failing or not a 401, don't block user - let them proceed
      console.log('[INBOX] Allowing user to proceed despite error (fail-open policy)');
      setHasVerifiedDomain(true);
    } finally {
      // CRITICAL: Mark domain check as complete to allow rendering
      setDomainCheckComplete(true);
      console.log('[INBOX] Domain check complete, allowing UI to render');
    }
  };

  const handleWizardComplete = (domain) => {
    console.log('Domain setup complete:', domain);
    setHasVerifiedDomain(true);
    setShowDomainWizard(false);
    setActiveView('domains'); // Show domain management after setup
  };

  const handleSkipWizard = () => {
    // Only admins can skip
    if (user?.role === 'Admin') {
      setShowDomainWizard(false);
      setHasVerifiedDomain(true);
    }
  };

  const handleLogout = async () => {
    try {
      await api.post('/logout');
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      navigate('/login');
    }
  };

  if (!user) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Loading...</p>
      </div>
    );
  }

  // CRITICAL: Wait for domain check to complete before rendering anything
  // This prevents MainstreamInbox from mounting and making API calls before we know if wizard should show
  if (!domainCheckComplete) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Checking domain setup...</p>
      </div>
    );
  }

  // Show domain setup wizard if user doesn't have a verified domain
  if (showDomainWizard) {
    return (
      <DomainSetupWizard
        onComplete={handleWizardComplete}
        onSkip={handleSkipWizard}
      />
    );
  }

  return (
    <div className="inbox-container">
      {/* Sidebar */}
      <div className="inbox-sidebar">
        <div className="sidebar-header">
          <h1>Mail</h1>
          <div className="user-info">
            <p className="user-name">{user.fullName}</p>
            <p className="user-email">{user.email}</p>
          </div>
        </div>

        <nav className="sidebar-nav">
          <button
            className={`nav-item ${activeView === 'personal' ? 'active' : ''}`}
            onClick={() => setActiveView('personal')}
          >
            <FiMail /> Personal Inbox
          </button>

          <div className="nav-divider"></div>

          <button
            className={`nav-item ${activeView === 'analytics' ? 'active' : ''}`}
            onClick={() => setActiveView('analytics')}
          >
            <FiBarChart2 /> Analytics
          </button>

          <button
            className={`nav-item ${activeView === 'sla' ? 'active' : ''}`}
            onClick={() => setActiveView('sla')}
          >
            <FiClock /> SLA Monitor
          </button>

          <button
            className={`nav-item ${activeView === 'templates' ? 'active' : ''}`}
            onClick={() => setActiveView('templates')}
          >
            <FiSend /> Templates
          </button>

          <button
            className={`nav-item ${activeView === 'rules' ? 'active' : ''}`}
            onClick={() => setActiveView('rules')}
          >
            <FiSettings /> Assignment Rules
          </button>

          <button
            className={`nav-item ${activeView === 'domains' ? 'active' : ''}`}
            onClick={() => setActiveView('domains')}
          >
            <FiMail /> Domain Management
          </button>

          <div className="nav-divider"></div>

          <button
            className={`nav-item ${activeView === 'create-campaign' ? 'active' : ''}`}
            onClick={() => setActiveView('create-campaign')}
          >
            <FiSend /> Create Campaign Email
          </button>

          <button
            className={`nav-item ${activeView === 'import-mail' ? 'active' : ''}`}
            onClick={() => setActiveView('import-mail')}
          >
            <FiUpload /> Import Mail
          </button>

          <button
            className={`nav-item ${activeView === 'campaign-analytics' ? 'active' : ''}`}
            onClick={() => setActiveView('campaign-analytics')}
          >
            <FiBarChart2 /> Campaign Analytics
          </button>

          <div className="nav-divider"></div>

          <button className="nav-item logout-btn" onClick={handleLogout}>
            <FiLogOut /> Sign Out
          </button>
        </nav>

        <div className="sidebar-footer">
          <a href={getMainAppUrl()} target="_blank" rel="noopener noreferrer">
            Back to Dashboard
          </a>
        </div>
      </div>

      {/* Main Content */}
      <div className="inbox-content">
        {activeView === 'personal' && <MainstreamInbox user={user} onNavigateToDomains={() => setActiveView('domains')} />}
        {activeView === 'analytics' && <AnalyticsDashboard />}
        {activeView === 'sla' && <SLAMonitor />}
        {activeView === 'templates' && <TemplateManager />}
        {activeView === 'rules' && <RulesManager />}
        {activeView === 'domains' && <DomainManagement />}
        {activeView === 'create-campaign' && <CreateCampaign />}
        {activeView === 'import-mail' && <ImportMail />}
        {activeView === 'campaign-analytics' && <CampaignAnalytics />}
      </div>
    </div>
  );
}

export default Inbox;
