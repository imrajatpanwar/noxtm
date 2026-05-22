import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../config/api';
import { useRole } from '../contexts/RoleContext';
import { updateCurrentPage } from '../utils/fingerprint';
import { Skeleton } from './ui/skeleton';
import Sidebar from './Sidebar';
import Overview from './Overview';
import TaskManager from './TaskManager';
import LeadsFlow from './LeadsFlow';
import EmailSetup from './EmailSetup';
import ProjectManagement from './ProjectManagement';
import ProjectDelivered from './ProjectDelivered';
import Notes from './Notes';

import EmailMarketing from './EmailMarketing';
import CampaignSetup from './CampaignSetup';
import EmailTemplate from './EmailTemplate';
import EmailAnalytics from './EmailAnalytics';
import WhatsAppMarketing from './WhatsAppMarketing';
import Credentials from './Credentials';
import Messaging from './Messaging';
import HrOverview from './HrOverview';
import InterviewManagement from './InterviewManagement';
import LetterTemplates from './LetterTemplates';
import EmployeeDetails from './EmployeeDetails';
import HolidayCalendar from './HolidayCalendar';
import Incentives from './Incentives';
import BillingPayments from './BillingPayments';
import PaymentRecords from './PaymentRecords';
import ExpenseManagement from './ExpenseManagement';
import CompanyPolicies from './CompanyPolicies';
import CompanyHandbook from './CompanyHandbook';
import Products from './Products';
import ManageIntegrations from './ManageIntegrations';
import UsersRoles from './UsersRoles';
import WorkspaceSettings from './WorkspaceSettings';
import GlobalTradeShow from './GlobalTradeShow';
import TrendingServices from './TrendingServices';
import TargetedCompanyList from './TargetedCompanyList';
import DataCenter from './DataCenter';
import ClientManagement from './ClientManagement';
import InvoiceManagement from './InvoiceManagement';
import MailPoller from './MailPoller';
import LinkedInManager from './LinkedInManager';
import SocialMediaCalendar from './SocialMediaCalendar';
import SocialMediaCredentials from './SocialMediaCredentials';
import VisitorAnalytics from './VisitorAnalytics';
import NoxtmBotAdmin from './NoxtmBotAdmin';
import NoxtmAssistant from './NoxtmAssistant';
import GoogleDriveManager from './GoogleDriveManager';
import SocialMediaUploads from './SocialMediaUploads';
import CustomDatabaseView from './CustomDatabaseView';
import CoreDataCenter from './CoreDataCenter';
import splitViewIcon from '../assets/split_view.svg';
import { SidebarProvider, SidebarInset } from './ui/sidebar';
import './Dashboard.css';

const ASSISTANT_MIN_WIDTH = 280;
const ASSISTANT_MAX_WIDTH = 720;
const ASSISTANT_DEFAULT_WIDTH = 340;

function Dashboard({ user, onLogout }) {
  const navigate = useNavigate();
  const { currentUser } = useRole();
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [assistantWidth, setAssistantWidth] = useState(() => {
    const saved = parseInt(localStorage.getItem('noxtm-assistant-width'), 10);
    return Number.isFinite(saved) && saved >= ASSISTANT_MIN_WIDTH && saved <= ASSISTANT_MAX_WIDTH
      ? saved
      : ASSISTANT_DEFAULT_WIDTH;
  });
  const [isResizingAssistant, setIsResizingAssistant] = useState(false);
  const [isAssistantCollapsed, setIsAssistantCollapsed] = useState(() => {
    return localStorage.getItem('noxtm-assistant-collapsed') === 'true';
  });

  const toggleAssistant = () => {
    setIsAssistantCollapsed(prev => {
      const next = !prev;
      localStorage.setItem('noxtm-assistant-collapsed', String(next));
      return next;
    });
  };

  useEffect(() => {
    if (!isResizingAssistant) return undefined;
    const handleMove = (e) => {
      const next = Math.min(
        ASSISTANT_MAX_WIDTH,
        Math.max(ASSISTANT_MIN_WIDTH, window.innerWidth - e.clientX)
      );
      setAssistantWidth(next);
    };
    const handleUp = () => {
      setIsResizingAssistant(false);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
    };
  }, [isResizingAssistant]);

  useEffect(() => {
    localStorage.setItem('noxtm-assistant-width', String(assistantWidth));
  }, [assistantWidth]);
  const [error, setError] = useState('');
  const [activeSection, setActiveSection] = useState('overview');
  const [selectedTrendingService, setSelectedTrendingService] = useState(null);
  const [profileIncomplete, setProfileIncomplete] = useState(false);
  const [policyPending, setPolicyPending] = useState(false);
  const [customDbs, setCustomDbs] = useState([]);
  const [companyUsers, setCompanyUsers] = useState([]);

  const isAdmin = currentUser?.role === 'Admin';

  const fetchDashboardData = useCallback(async () => {
    // Make sure we have the user data and role before proceeding
    if (!currentUser) {
      setError('User data not available');
      setLoading(false);
      return;
    }

    console.log('[DASHBOARD] Fetching dashboard data for user:', currentUser.email);
    console.log('[DASHBOARD] User subscription:', {
      plan: currentUser.subscription?.plan,
      status: currentUser.subscription?.status,
      endDate: currentUser.subscription?.endDate
    });
    console.log('[DASHBOARD] User permissions:', currentUser.permissions);

    try {
      // Direct API call for dashboard data
      const response = await api.get('/dashboard');
      console.log('[DASHBOARD] Dashboard data loaded successfully');
      setDashboardData(response.data);
    } catch (error) {
      // More detailed error message to help with debugging
      let errorMsg = 'Failed to load dashboard data';

      if (error.response) {
        // The request was made and the server responded with a status code
        // that falls out of the range of 2xx
        const status = error.response.status;
        const data = error.response.data;

        console.error('[DASHBOARD] API Error Status:', status);
        console.error('[DASHBOARD] API Error Data:', data);
        console.error('[DASHBOARD] User subscription:', currentUser?.subscription);

        if (status === 401) {
          errorMsg += ': Authentication failed. Please log in again.';
          onLogout(); // Logout the user on authentication failure
        } else if (!isAdmin && (status === 302 || data?.redirect === '/pricing')) {
          // Only redirect non-admin users to pricing page
          console.error('[DASHBOARD] Subscription required - redirecting to pricing');
          console.error('[DASHBOARD] User details:', {
            email: currentUser?.email,
            plan: currentUser?.subscription?.plan,
            status: currentUser?.subscription?.status,
            endDate: currentUser?.subscription?.endDate
          });
          navigate('/pricing');
          return; // Exit early since we're redirecting
        } else if (status >= 500) {
          errorMsg += ': Server error. Please try again later.';
        } else {
          errorMsg += `: ${data?.message || 'Unknown error'}`;
        }
      } else if (error.request) {
        // The request was made but no response was received
        console.error('[DASHBOARD] API Error: No response received');
        errorMsg += ': No response from server. Please check your connection.';
      } else {
        // Something happened in setting up the request that triggered an Error
        console.error('[DASHBOARD] API Error Setup:', error.message);
        errorMsg += `: ${error.message}`;
      }

      setError(errorMsg);
      console.error('[DASHBOARD] Dashboard error:', error);
    } finally {
      setLoading(false);
    }
  }, [currentUser, isAdmin, navigate, onLogout]);

  useEffect(() => {
    if (currentUser) {
      // Check if user has a valid subscription (active or trial)
      const hasValidPlan = currentUser.subscription?.status === 'active' ||
        currentUser.subscription?.status === 'trial';
      const isAdminUser = currentUser.role === 'Admin';
      const isCompanyMember = Boolean(currentUser.companyId);

      // Allow access for: Admin, Active subscription, or Company member
      if (!isAdminUser && !hasValidPlan && !isCompanyMember) {
        // Redirect to pricing if no valid plan and not a company member
        navigate('/pricing');
        return;
      }

      fetchDashboardData();
    }
  }, [currentUser, fetchDashboardData, navigate]);

  // Global auto-refresh — fires every 30 seconds so visible sections stay live
  useEffect(() => {
    const tick = () => window.dispatchEvent(new CustomEvent('dashboard:refresh'));
    const id = setInterval(tick, 30_000);
    return () => clearInterval(id);
  }, []);

  // Fetch custom databases + company users for CustomDatabaseView
  useEffect(() => {
    if (!currentUser) return;
    api.get('/custom-databases').then(res => setCustomDbs(res.data.databases || [])).catch(() => {});
    api.get('/company/members').then(res => setCompanyUsers(res.data.members || [])).catch(() => {
      // fallback — some installs use /users endpoint
      api.get('/users').then(r => setCompanyUsers(r.data || [])).catch(() => {});
    });
  }, [currentUser]);

  // Listen for navigation to messaging from toast notifications
  useEffect(() => {
    const handleNavigateToMessaging = () => {
      setActiveSection('message');
    };

    window.addEventListener('dashboard:navigateToMessaging', handleNavigateToMessaging);
    return () => window.removeEventListener('dashboard:navigateToMessaging', handleNavigateToMessaging);
  }, []);

  // Listen for notification click navigation
  useEffect(() => {
    const handleNavigateSection = (e) => {
      if (e.detail?.section) setActiveSection(e.detail.section);
    };
    window.addEventListener('navigate:section', handleNavigateSection);
    return () => window.removeEventListener('navigate:section', handleNavigateSection);
  }, []);

  // Check if profile emergency contact is missing
  useEffect(() => {
    api.get('/profile').then(res => {
      const d = res.data;
      const missing = !d?.emergencyContact?.name?.trim() || !d?.emergencyContact?.phone?.trim();
      setProfileIncomplete(missing);
    }).catch(() => {});
  }, []);

  // Check if company policy exists and user hasn't accepted it
  useEffect(() => {
    if (!currentUser?.companyId) return;
    const isOwner = currentUser?.roleInCompany === 'Owner' || currentUser?.role === 'Admin';
    if (isOwner) return; // owners don't need to accept
    api.get('/company-policies').then(res => {
      if (res.data.success && res.data.policy && !res.data.policy.isAcknowledged) {
        setPolicyPending(true);
      } else {
        setPolicyPending(false);
      }
    }).catch(() => {});
  }, [currentUser]);

  // Listen for navigation to settings from header profile dropdown
  useEffect(() => {
    const handleNavigateToSettings = () => {
      setActiveSection('workspace-settings');
    };

    window.addEventListener('dashboard:navigateToSettings', handleNavigateToSettings);
    return () => window.removeEventListener('dashboard:navigateToSettings', handleNavigateToSettings);
  }, []);

  // Heartbeat for automated attendance tracking (every 5 minutes)
  useEffect(() => {
    // Auto clock-in when user opens dashboard
    const autoClockIn = async () => {
      try {
        await api.post('/attendance/clock-in');
      } catch (err) {
        console.debug('[ATTENDANCE] Auto clock-in:', err.response?.data?.message || err.message);
      }
    };

    const sendHeartbeat = async () => {
      try {
        await api.post('/attendance/heartbeat');
      } catch (err) {
        console.debug('[HEARTBEAT] Failed:', err.message);
      }
    };

    autoClockIn();
    sendHeartbeat();
    const interval = setInterval(sendHeartbeat, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const handleSectionChange = (section) => {
    // Re-check policy acceptance when navigating away from policies page
    if (activeSection === 'company-policies' && section !== 'company-policies' && currentUser?.companyId) {
      const isOwner = currentUser?.roleInCompany === 'Owner' || currentUser?.role === 'Admin';
      if (!isOwner) {
        api.get('/company-policies').then(res => {
          if (res.data.success && res.data.policy && !res.data.policy.isAcknowledged) {
            setPolicyPending(true);
          } else {
            setPolicyPending(false);
          }
        }).catch(() => {});
      }
    }
    setActiveSection(section);
    // Update visitor tracking with dashboard sub-section
    const pageName = 'Dashboard / ' + section.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    window.__currentDashboardPage = pageName;
    updateCurrentPage(pageName);
  };

  const handleNavigate = (section, data) => {
    setActiveSection(section);
    if (section === 'targeted-company-list' && data) {
      setSelectedTrendingService(data);
    }
  };

  const renderContent = () => {
    switch (activeSection) {
      case 'overview':
        return <Overview user={user} dashboardData={dashboardData} error={error} onNavigate={handleSectionChange} />;
      case 'task-manager':
        return <TaskManager />;
      case 'leads-flow':
        return <LeadsFlow />;
      case 'client-management':
        return <ClientManagement />;
      case 'leads-metrics':
        return <div />;
      case 'company-data':
        return <DataCenter />;
      case 'global-trade-show':
        return <GlobalTradeShow />;
      case 'trending-services':
        return <TrendingServices onNavigate={handleNavigate} />;
      case 'targeted-company-list':
        return <TargetedCompanyList trendingService={selectedTrendingService} onNavigate={handleNavigate} />;
      case 'our-projects':
        return <ProjectManagement />;
      case 'project-delivered':
        return <ProjectDelivered />;
      case 'notes':
        return <Notes />;
      case 'email-marketing':
        return <EmailMarketing />;
      case 'email-setup':
        return <EmailSetup />;
      case 'campaign-setup':
        return <CampaignSetup />;
      case 'email-template':
        return <EmailTemplate />;
      case 'email-analytics':
        return <EmailAnalytics />;
      case 'whatsapp-marketing':
        return <WhatsAppMarketing />;
      case 'credentials':
        return <Credentials />;
      case 'message':
        return <Messaging />;
      // HR Management
      case 'hr-overview':
        return <HrOverview />;
      case 'interview-management':
        return <InterviewManagement />;
      case 'letter-templates':
        return <LetterTemplates />;
      case 'employee-details':
      case 'attendance-summary':
        return <EmployeeDetails />;
      case 'holiday-calendar':
        return <HolidayCalendar />;
      case 'incentives':
        return <Incentives />;
      // Finance Management
      case 'invoice-management':
        return <InvoiceManagement />;
      case 'billing-payments':
        return <BillingPayments />;
      case 'payment-records':
        return <PaymentRecords />;
      case 'expense-management':
        return <ExpenseManagement />;
      // Internal Policies
      case 'company-policies':
        return <CompanyPolicies />;
      case 'company-handbook':
        return <CompanyHandbook />;
      // Products
      case 'products':
        return <Products />;
      // Settings & Configuration
      case 'manage-integrations':
        return <ManageIntegrations />;
      case 'users-roles':
        return <UsersRoles />;
      case 'content-calendar':
        return <SocialMediaCalendar />;
      case 'sm-credentials':
        return <SocialMediaCredentials />;
      case 'linkedin':
        return <LinkedInManager />;
      case 'workspace-settings':
        return <WorkspaceSettings user={user} onLogout={onLogout} />;
      case 'visitor-analytics':
        return <VisitorAnalytics />;
      case 'noxtm-bot-admin':
        return <NoxtmBotAdmin />;
      case 'drive-assets':
        return <GoogleDriveManager />;
      case 'core-data-center':
        return <CoreDataCenter />;
      default: {
        // Handle dynamic custom-db-:id sections
        if (activeSection.startsWith('custom-db-')) {
          const dbId = activeSection.replace('custom-db-', '');
          const db = customDbs.find(d => d._id === dbId);
          if (db) {
            return (
              <CustomDatabaseView
                db={db}
                companyUsers={companyUsers}
                onUpdated={() => {
                  api.get('/custom-databases').then(res => setCustomDbs(res.data.databases || [])).catch(() => {});
                }}
                onDeleted={() => {
                  setCustomDbs(prev => prev.filter(d => d._id !== dbId));
                  setActiveSection('company-data');
                }}
              />
            );
          }
        }
        return (
          <div className="dashboard-card">
            <h3>Section Not Found</h3>
            <p>The requested section could not be found.</p>
          </div>
        );
      }
    }
  };

  if (loading) {
    return (
      <SidebarProvider>
        <div className="dashboard-container">
          <Sidebar activeSection={activeSection} onSectionChange={handleSectionChange} />
          <SidebarInset>
            <div className="dashboard-content">
              <div className="dashboard-content-wrapper" style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '24px' }}>
                <Skeleton className="tw-h-8 tw-w-48" />
                <Skeleton className="tw-h-4 tw-w-full" />
                <Skeleton className="tw-h-4 tw-w-full" />
                <Skeleton className="tw-h-4 tw-w-3/4" />
              </div>
            </div>
          </SidebarInset>
        </div>
      </SidebarProvider>
    );
  }

  return (
    <SidebarProvider>
      <div className="dashboard-container">
        <Sidebar activeSection={activeSection} onSectionChange={handleSectionChange} />

        {/* Main Content — SidebarInset is a flex-1 <main> that auto-fills
            the space freed when the sidebar collapses. Inside it, a horizontal
            flex row places the section content on the left and the always-on
            <NoxtmAssistant /> panel on the right, so the assistant renders on
            every section (not just Overview). */}
        <SidebarInset>
          <div className="dashboard-inset-row" style={{ display: 'flex', flexDirection: 'row', flex: 1, minHeight: 0, height: '100%', width: '100%' }}>
            <div className="dashboard-content" style={{ flex: 1, minWidth: 0, overflowY: 'auto', overflowX: 'hidden', height: '100%', scrollbarWidth: 'none' }}>
              {profileIncomplete && (
                <div className="dash-profile-banner">
                  <span className="dash-banner-icon">⚠️</span>
                  <span className="dash-banner-text">Your profile is incomplete. Complete it now to unlock all features and get the best experience.</span>
                  <button className="dash-banner-btn" onClick={() => { setActiveSection('workspace-settings'); setProfileIncomplete(false); }}>
                    Complete Now →
                  </button>
                </div>
              )}
              {policyPending && (
                <div className="dash-profile-banner dash-policy-banner">
                  <span className="dash-banner-icon">📋</span>
                  <span className="dash-banner-text">Your company has a policy that requires your acceptance. Please review and accept it.</span>
                  <button className="dash-banner-btn" onClick={() => setActiveSection('company-policies')}>
                    Review Policy →
                  </button>
                </div>
              )}
              {(activeSection === 'message' || activeSection === 'whatsapp-marketing') ? (
                renderContent()
              ) : (
                <div className="dashboard-content-wrapper">
                  {renderContent()}
                </div>
              )}
            </div>
            {/* Noxtm Assistant — collapsible like sidebar, always has toggle tab */}
            <div style={{ display: 'flex', height: '100%', flexShrink: 0, position: 'relative' }}>
              {/* Toggle tab — only shown when assistant is collapsed */}
              {isAssistantCollapsed && (
                <button
                  onClick={toggleAssistant}
                  title="Open Noxtm Assistant"
                  className="assistant-toggle-tab"
                >
                  <img src={splitViewIcon} alt="Open assistant" className="assistant-toggle-icon" />
                </button>
              )}

              {/* Sliding panel */}
              <aside
                className="dashboard-assistant-pane"
                style={{
                  width: isAssistantCollapsed ? 0 : assistantWidth,
                  overflow: 'hidden',
                  height: '100%',
                  position: 'relative',
                  transition: isResizingAssistant ? 'none' : 'width 0.28s cubic-bezier(0.16,1,0.3,1)',
                }}
              >
                {/* Resize handle */}
                {!isAssistantCollapsed && (
                  <div
                    role="separator"
                    aria-orientation="vertical"
                    onMouseDown={(e) => { e.preventDefault(); setIsResizingAssistant(true); }}
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: 4,
                      height: '100%',
                      cursor: 'col-resize',
                      zIndex: 10,
                      background: isResizingAssistant ? 'rgba(59,130,246,0.35)' : 'transparent',
                      transition: 'background 120ms ease',
                    }}
                    onMouseEnter={(e) => { if (!isResizingAssistant) e.currentTarget.style.background = 'rgba(59,130,246,0.18)'; }}
                    onMouseLeave={(e) => { if (!isResizingAssistant) e.currentTarget.style.background = 'transparent'; }}
                  />
                )}
                <NoxtmAssistant onCollapse={toggleAssistant} activeSection={activeSection} />
              </aside>
            </div>
          </div>
        </SidebarInset>

        {/* Mail Poller - silent background component for email notifications */}
        <MailPoller />
      </div>
    </SidebarProvider>
  );
}

export default Dashboard;
