import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiMail, FiSend, FiSettings, FiBarChart2, FiList, FiFileText, FiGlobe } from 'react-icons/fi';
import MainstreamInbox from './MainstreamInbox';
import TemplateManager from './email/TemplateManager';
import DomainManagement from './email/DomainManagement';
import CampaignList from './campaign/CampaignList';
import MailLists from './campaign/MailLists';
import CampaignAnalytics from './campaign/CampaignAnalytics';
// Settings is now unified inside MainstreamInbox's MailSettings component
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
      return false;
    }
  }

  return true;
}

function Inbox() {
  const [user, setUser] = useState(null);
  const [activeView, setActiveView] = useState('personal'); // personal, analytics, templates, domains
  const [showDomainWizard, setShowDomainWizard] = useState(false);
  const [showOnboardingModal, setShowOnboardingModal] = useState(false);

  // NEW: Consolidated initialization state
  const [initializationComplete, setInitializationComplete] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {

    // Set loading flag to prevent API interceptor from redirecting during auth
    // This flag will stay true until ALL initialization is complete
    window.__NOXTM_AUTH_LOADING__ = true;

    const initializeApp = async () => {
      // Verify token exists (should be set by ProtectedRoute)
      const token = localStorage.getItem('token');

      if (!token) {
        window.__NOXTM_AUTH_LOADING__ = false;
        window.location.href = MAIL_LOGIN_URL;
        return;
      }

      // Retry logic - try up to 3 times with 1 second delay
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          // STEP 1: Fetch user profile
          const userResponse = await api.get('/profile');
          setUser(userResponse.data);
          localStorage.setItem('user', JSON.stringify(userResponse.data));

          // STEP 2: Check subscription status (NEW - prevents pricing flickering)
          const subscription = userResponse.data.subscription;
          const isAdmin = userResponse.data.role === 'Admin';
          const hasCompany = !!userResponse.data.companyId;

          if (!isAdmin) {
            // Employees with a company use the owner's subscription - allow them in
            if (hasCompany) {
            } else {
              const hasValid = checkSubscriptionStatus(subscription);

              if (!hasValid) {
                window.__NOXTM_AUTH_LOADING__ = false;
                window.location.href = getMainAppUrl('/pricing');
                return;
              }
            }
          } else {
          }

          let needsDomain = false;
          const isOwner = userResponse.data.roleInCompany === 'Owner';
          const isMember = hasCompany && !isOwner;

          // STEP 3: Check domain setup
          // Domain check applies to: owners (with or without company) and standalone users
          // Skip for: company members (owner handles domain) and system admins
          if (!isAdmin && !isMember) {
            try {
              const domainResponse = await api.get('/user-domains/count');
              needsDomain = !domainResponse.data.hasVerifiedDomain;

              if (needsDomain) {
              } else {
              }
            } catch (domainErr) {
              // On error, assume domain setup needed
              needsDomain = true;
            }
          } else if (isMember) {
          } else {
          }

          // STEP 4: Decide what to show (don't render yet)
          // Show domain modal for owners/standalone users who need domain setup
          // Never show for admins or company members
          if (needsDomain && !isAdmin && !isMember) {
            setShowOnboardingModal(true);
          } else {
            setShowOnboardingModal(false);
          }

          // STEP 4: Mark initialization complete
          setInitializationComplete(true);

          // CRITICAL: Only clear loading flag AFTER everything is complete
          window.__NOXTM_AUTH_LOADING__ = false;

          return; // Success - exit function
        } catch (err) {

          if (attempt < 3) {
            await new Promise(resolve => setTimeout(resolve, 1000));
          } else {
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
      window.__NOXTM_AUTH_LOADING__ = false;
    });
  }, [navigate]);

  const recheckDomainSetup = async () => {
    try {
      const response = await api.get('/user-domains/count');

      const hasVerified = response.data.hasVerifiedDomain;

      if (hasVerified) {
        setShowOnboardingModal(false);
      } else {
      }
    } catch (err) {
    }
  };

  const handleWizardComplete = (domain) => {
    setShowDomainWizard(false);
    setActiveView('domains'); // Show domain management after setup
  };

  const handleSkipWizard = () => {
    // Only admins can skip
    if (user?.role === 'Admin') {
      setShowDomainWizard(false);
    }
  };

  const handleLogout = async () => {
    try {
      await api.post('/logout');
    } catch (err) {
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
          <img src={require('./images/mail_logo.svg').default} alt="Noxtm Mail" />
        </div>

        <nav className="sidebar-nav">
          <button
            className={`nav-item ${activeView === 'personal' ? 'active' : ''}`}
            onClick={() => setActiveView('personal')}
          >
            <FiMail /> Personal Inbox
          </button>

          <button
            className={`nav-item ${activeView === 'domains' ? 'active' : ''}`}
            onClick={() => setActiveView('domains')}
          >
            <FiGlobe /> Domain Management
          </button>

          <div className="nav-section-label">Email Marketing</div>

          <button
            className={`nav-item ${activeView === 'create-campaign' ? 'active' : ''}`}
            onClick={() => setActiveView('create-campaign')}
          >
            <FiSend /> Email Campaign
          </button>

          <button
            className={`nav-item ${activeView === 'campaign-analytics' ? 'active' : ''}`}
            onClick={() => setActiveView('campaign-analytics')}
          >
            <FiBarChart2 /> Analytics
          </button>

          <button
            className={`nav-item ${activeView === 'mail-lists' ? 'active' : ''}`}
            onClick={() => setActiveView('mail-lists')}
          >
            <FiList /> Mail Lists
          </button>

          <button
            className={`nav-item ${activeView === 'templates' ? 'active' : ''}`}
            onClick={() => setActiveView('templates')}
          >
            <FiFileText /> Templates
          </button>



          <button
            className={`nav-item ${activeView === 'settings' ? 'active' : ''}`}
            onClick={() => {
              setActiveView('settings');
            }}
          >
            <FiSettings /> Settings
          </button>
        </nav>
      </div>

      {/* Main Content */}
      <div className="mail-inbox-content">
        {(activeView === 'personal' || activeView === 'settings') && (
          <MainstreamInbox
            user={user}
            onNavigateToDomains={() => setActiveView('domains')}
            onLogout={handleLogout}
            initialTab={activeView === 'settings' ? 'settings' : undefined}
          />
        )}
        {activeView === 'templates' && <TemplateManager />}
        {activeView === 'domains' && <DomainManagement />}
        {activeView === 'create-campaign' && <CampaignList />}
        {activeView === 'campaign-analytics' && <CampaignAnalytics />}
        {activeView === 'mail-lists' && <MailLists />}
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
