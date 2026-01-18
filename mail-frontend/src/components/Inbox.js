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
import LoadingScreen from './LoadingScreen';
import api from '../config/api';
import { MAIL_LOGIN_URL, getMainAppUrl } from '../config/authConfig';
import './Inbox.css';

// Check if user has valid subscription for mail access
function checkSubscriptionStatus(subscription) {
  if (!subscription) return false;

  const { plan, status, endDate } = subscription;

  // No plan or None plan
  if (!plan || plan === 'None') return false;

  // Must be active or trial status
  if (status !== 'active' && status !== 'trial') return false;

  // Check if expired (with 7-day grace period)
  if (endDate) {
    const now = new Date();
    const subscriptionEnd = new Date(endDate);
    const gracePeriodMs = 7 * 24 * 60 * 60 * 1000; // 7 days
    const gracePeriodEnd = new Date(subscriptionEnd.getTime() + gracePeriodMs);

    if (now > gracePeriodEnd) {
      console.log('[INBOX] Subscription expired past grace period');
      return false;
    }
  }

  return true;
}

function Inbox() {
  const [user, setUser] = useState(null);
  const [activeView, setActiveView] = useState('personal'); // personal, analytics, sla, templates, rules, domains
  const [showDomainWizard, setShowDomainWizard] = useState(false);
  const [showOnboardingModal, setShowOnboardingModal] = useState(false);
  const [hasVerifiedDomain, setHasVerifiedDomain] = useState(false);

  // NEW: Consolidated initialization state
  const [initializationComplete, setInitializationComplete] = useState(false);
  const [shouldShowDomainModal, setShouldShowDomainModal] = useState(false);
  const [shouldShowInbox, setShouldShowInbox] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {
    console.log('[INBOX] Component mounted - Starting consolidated initialization...');

    // Set loading flag to prevent API interceptor from redirecting during auth
    // This flag will stay true until ALL initialization is complete
    window.__NOXTM_AUTH_LOADING__ = true;

    const initializeApp = async () => {
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
          // STEP 1: Fetch user profile
          console.log('[INBOX] Step 1/4: Fetching user profile from /api/profile...');
          const userResponse = await api.get('/profile');
          console.log('[INBOX] ✅ Profile fetch SUCCESS:', userResponse.data);
          setUser(userResponse.data);
          localStorage.setItem('user', JSON.stringify(userResponse.data));

          // STEP 2: Check subscription status (NEW - prevents pricing flickering)
          console.log('[INBOX] Step 2/4: Checking subscription status...');
          const subscription = userResponse.data.subscription;
          const isAdmin = userResponse.data.role === 'Admin';

          if (!isAdmin) {
            const hasValid = checkSubscriptionStatus(subscription);
            console.log('[INBOX] Subscription check result:', hasValid, subscription);

            if (!hasValid) {
              console.log('[INBOX] ❌ Invalid subscription - redirecting to pricing');
              window.__NOXTM_AUTH_LOADING__ = false;
              window.location.href = getMainAppUrl('/pricing');
              return;
            }
            console.log('[INBOX] ✅ Subscription is valid');
          } else {
            console.log('[INBOX] ✅ Admin user - skipping subscription check');
          }

          let needsDomain = false;

          // STEP 3: Check domain setup (skip for admins)
          if (!isAdmin) {
            console.log('[INBOX] Step 3/4: Checking domain setup...');
            try {
              const domainResponse = await api.get('/user-domains/count');
              console.log('[INBOX] ✅ User domains count response:', domainResponse.data);
              needsDomain = !domainResponse.data.hasVerifiedDomain;

              if (needsDomain) {
                console.log('[INBOX] ⚠️  No verified domain found');
              } else {
                console.log('[INBOX] ✅ User has verified domain');
              }
            } catch (domainErr) {
              console.error('[INBOX] ❌ Error checking domain setup:', domainErr);
              // On error, assume domain setup needed
              needsDomain = true;
            }
          } else {
            console.log('[INBOX] Step 3/4: Admin user - bypassing domain verification');
          }

          // STEP 4: Decide what to show (don't render yet)
          console.log('[INBOX] Step 4/4: Determining which screen to show...');
          // Never show domain modal for Admins, even if needsDomain is true
          if (needsDomain && !isAdmin) {
            console.log('[INBOX] → Will show domain onboarding modal');
            setShouldShowDomainModal(true);
            setShouldShowInbox(false);
            setHasVerifiedDomain(false);
            setShowOnboardingModal(true);
          } else {
            console.log('[INBOX] → Will show inbox');
            setShouldShowDomainModal(false);
            setShouldShowInbox(true);
            setHasVerifiedDomain(true);
            setShowOnboardingModal(false);
          }

          // STEP 4: Mark initialization complete
          console.log('[INBOX] ✅ All initialization complete - ready to render');
          setInitializationComplete(true);

          // CRITICAL: Only clear loading flag AFTER everything is complete
          window.__NOXTM_AUTH_LOADING__ = false;
          console.log('[INBOX] ✅ Clearing loading flag');

          return; // Success - exit function
        } catch (err) {
          console.error(`[INBOX] ❌ Initialization attempt ${attempt} FAILED:`, err);
          console.error('[INBOX] Error status:', err.response?.status);
          console.error('[INBOX] Error message:', err.response?.data);

          if (attempt < 3) {
            console.log(`[INBOX] Retrying in 1 second (attempt ${attempt + 1}/3)...`);
            await new Promise(resolve => setTimeout(resolve, 1000));
          } else {
            console.log('[INBOX] All retry attempts failed, redirecting to login:', MAIL_LOGIN_URL);
            // Clear loading flag before redirect
            window.__NOXTM_AUTH_LOADING__ = false;
            // No SSO session after all retries, redirect to main app login
            window.location.href = MAIL_LOGIN_URL;
          }
        }
      }
    };

    // Start initialization
    initializeApp().catch((err) => {
      console.error('[INBOX] Fatal error in initializeApp:', err);
      window.__NOXTM_AUTH_LOADING__ = false;
    });
  }, [navigate]);

  const recheckDomainSetup = async () => {
    console.log('[INBOX] Rechecking domain setup after user added domain...');
    try {
      const response = await api.get('/user-domains/count');
      console.log('[INBOX] ✅ User domains count response:', response.data);

      const hasVerified = response.data.hasVerifiedDomain;

      if (hasVerified) {
        console.log('[INBOX] ✅ User now has verified domain - showing inbox');
        setHasVerifiedDomain(true);
        setShowOnboardingModal(false);
        setShouldShowDomainModal(false);
        setShouldShowInbox(true);
      } else {
        console.log('[INBOX] ⚠️  Still no verified domain');
      }
    } catch (err) {
      console.error('[INBOX] ❌ Error rechecking domain setup:', err);
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

  // Show loading screen only during auth and profile initialization
  // Accounts and emails will load progressively after inbox renders
  if (!initializationComplete || !user) {
    return <LoadingScreen />;
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
          <h1>Noxtm Mail</h1>
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
        {activeView === 'personal' && (
          <MainstreamInbox
            user={user}
            onNavigateToDomains={() => setActiveView('domains')}
          />
        )}
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
            recheckDomainSetup();
          }}
          userRole={user?.role}
        />
      )}
    </div>
  );
}

export default Inbox;
