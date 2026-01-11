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
import DomainOnboardingModal from './DomainOnboardingModal';
import api from '../config/api';
import { MAIL_LOGIN_URL, getMainAppUrl } from '../config/authConfig';
import mailLoadingGif from './images/mail_loding.gif';
import './Inbox.css';

function Inbox() {
  const [user, setUser] = useState(null);
  const [activeView, setActiveView] = useState('personal'); // personal, analytics, sla, templates, rules, domains
  const [showDomainWizard, setShowDomainWizard] = useState(false);
  const [showOnboardingModal, setShowOnboardingModal] = useState(false);
  const [hasVerifiedDomain, setHasVerifiedDomain] = useState(false);
  const [domainCheckComplete, setDomainCheckComplete] = useState(false); // NEW: Track if domain check is done
  const navigate = useNavigate();

  useEffect(() => {
    console.log('[INBOX] Component mounted - Starting authentication flow...');

    // Set loading flag to prevent API interceptor from redirecting during auth
    // This flag will stay true until ALL initialization is complete
    window.__NOXTM_AUTH_LOADING__ = true;

    // NOTE: Token extraction from URL is now handled by ProtectedRoute
    // We just need to verify it exists and load user profile

    const loadUser = async () => {
      console.log('[INBOX] Fetching user profile from /api/profile...');

      // Verify token exists (should be set by ProtectedRoute)
      const token = localStorage.getItem('token');
      console.log('[INBOX] Token exists:', token ? 'YES (length: ' + token.length + ')' : 'NO');

      if (!token) {
        console.error('[INBOX] ❌ No token found! ProtectedRoute should have set it.');
        window.__NOXTM_AUTH_LOADING__ = false;
        window.location.href = MAIL_LOGIN_URL;
        return;
      }

      // Retry logic - try up to 3 times with 1 second delay
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          // Check SSO cookie via /profile endpoint
          const response = await api.get('/profile');
          console.log('[INBOX] ✅ Profile fetch SUCCESS:', response.data);
          setUser(response.data);
          localStorage.setItem('user', JSON.stringify(response.data));

          // Check if user has a verified domain (skip for admins)
          if (response.data.role !== 'Admin') {
            console.log('[INBOX] User is not Admin, checking domain setup...');
            await checkDomainSetup(); // Wait for domain check to complete
          } else {
            console.log('[INBOX] User is Admin - bypassing domain verification requirement');
            setHasVerifiedDomain(true); // Admins bypass domain requirement
            setDomainCheckComplete(true); // CRITICAL: Mark as complete for admins
          }

          // CRITICAL: Only clear loading flag AFTER everything is complete
          window.__NOXTM_AUTH_LOADING__ = false;
          console.log('[INBOX] ✅ Authentication flow complete, clearing loading flag');

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

    // Start loading user immediately (ProtectedRoute already extracted token)
    loadUser().catch((err) => {
      console.error('[INBOX] Fatal error in loadUser:', err);
      window.__NOXTM_AUTH_LOADING__ = false;
    });
  }, [navigate]);

  const checkDomainSetup = async (retryCount = 0) => {
    console.log(`[INBOX] Checking domain setup via /api/user-domains/count... (attempt ${retryCount + 1})`);
    try {
      const response = await api.get('/user-domains/count');
      console.log('[INBOX] ✅ User domains count response:', response.data);

      const hasVerified = response.data.hasVerifiedDomain;

      if (hasVerified) {
        console.log('[INBOX] ✅ User has verified domain');
        setHasVerifiedDomain(true);
        setShowOnboardingModal(false);
      } else {
        console.log('[INBOX] ⚠️  No verified domain found - SHOWING ONBOARDING MODAL');

        // No verified domain - show onboarding modal
        setHasVerifiedDomain(false);
        setShowOnboardingModal(true);
      }

      // Mark domain check as complete
      setDomainCheckComplete(true);
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

      // If still failing or not a 401, show modal anyway (user needs to set up domain)
      console.log('[INBOX] Error checking domains - showing onboarding modal');
      setHasVerifiedDomain(false);
      setShowOnboardingModal(true);
      setDomainCheckComplete(true);
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
      <div className="loading-container" style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        background: '#f5f5f5'
      }}>
        <img
          src={mailLoadingGif}
          alt="Loading..."
          style={{ width: '150px', height: '150px' }}
        />
        <p style={{ marginTop: '20px', fontSize: '16px', color: '#666' }}>Loading Mail...</p>
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
    <div className="mail-inbox-container">
      {/* Sidebar */}
      <div className="mail-inbox-sidebar">
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
      <div className="mail-inbox-content">
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

      {/* Domain Onboarding Modal */}
      {showOnboardingModal && (
        <DomainOnboardingModal
          onClose={() => setShowOnboardingModal(false)}
          onDomainAdded={() => {
            setShowOnboardingModal(false);
            checkDomainSetup();
          }}
          userRole={user?.role}
        />
      )}
    </div>
  );
}

export default Inbox;
