import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiClock, FiActivity } from 'react-icons/fi';
import api from '../config/api';
import { useRole } from '../contexts/RoleContext';
import Sidebar from './Sidebar';
import Overview from './Overview';
import TaskManager from './TaskManager';
import LeadsFlow from './LeadsFlow';
import ClientLeads from './ClientLeads';
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
import ExhibitorsList from './ExhibitorsList';
import LeadsMetrics from './LeadsMetrics';
import ClientManagement from './ClientManagement';
import InvoiceManagement from './InvoiceManagement';
import ChatWidget from './ChatWidget';
import NoxtmChatAdmin from './NoxtmChatAdmin';
import MailPoller from './MailPoller';
import LinkedInManager from './LinkedInManager';
import SocialMediaCalendar from './SocialMediaCalendar';
import './Dashboard.css';

function Dashboard({ user, onLogout }) {
  const navigate = useNavigate();
  const { currentUser } = useRole();
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeSection, setActiveSection] = useState('overview');
  const [selectedTradeShow, setSelectedTradeShow] = useState(null);

  // Attendance timer state
  const [attClockedIn, setAttClockedIn] = useState(false);
  const [attSessionStart, setAttSessionStart] = useState(null);
  const [attElapsed, setAttElapsed] = useState(0);
  const [attTotalMin, setAttTotalMin] = useState(0);
  const [attWorkingHours, setAttWorkingHours] = useState(8);
  const [attTimerExpanded, setAttTimerExpanded] = useState(false);
  const attTimerRef = useRef(null);

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

  // Listen for navigation to messaging from toast notifications
  useEffect(() => {
    const handleNavigateToMessaging = () => {
      setActiveSection('message');
    };

    window.addEventListener('dashboard:navigateToMessaging', handleNavigateToMessaging);
    return () => window.removeEventListener('dashboard:navigateToMessaging', handleNavigateToMessaging);
  }, []);

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
        const res = await api.post('/attendance/clock-in');
        if (res.data.success) {
          setAttClockedIn(true);
          setAttSessionStart(new Date(res.data.activeSessionStart));
        }
      } catch (err) {
        // Already clocked in - fetch today to get session info
        console.debug('[ATTENDANCE] Auto clock-in:', err.response?.data?.message || err.message);
      }
    };

    // Fetch today's attendance to sync state
    const fetchToday = async () => {
      try {
        const res = await api.get('/attendance/today');
        if (res.data.success) {
          setAttClockedIn(!!res.data.isClockedIn);
          setAttSessionStart(res.data.activeSessionStart ? new Date(res.data.activeSessionStart) : null);
          setAttTotalMin(res.data.attendance?.totalMinutes || 0);
          setAttWorkingHours(res.data.workingHoursPerDay || 8);
        }
      } catch (e) { /* silent */ }
    };

    const sendHeartbeat = async () => {
      try {
        await api.post('/attendance/heartbeat');
      } catch (err) {
        console.debug('[HEARTBEAT] Failed:', err.message);
      }
    };

    // Auto clock-in on dashboard mount, fetch state, then start heartbeat
    autoClockIn().then(fetchToday);
    sendHeartbeat();

    // Set up interval for subsequent heartbeats
    const interval = setInterval(sendHeartbeat, 5 * 60 * 1000); // 5 minutes

    // Refresh attendance stats every 5 min too
    const attInterval = setInterval(fetchToday, 5 * 60 * 1000);

    return () => { clearInterval(interval); clearInterval(attInterval); };
  }, []);

  // Live timer tick
  useEffect(() => {
    if (attClockedIn && attSessionStart) {
      const tick = () => {
        setAttElapsed(Math.floor((new Date() - new Date(attSessionStart)) / 1000));
      };
      tick();
      attTimerRef.current = setInterval(tick, 1000);
      return () => clearInterval(attTimerRef.current);
    } else {
      setAttElapsed(0);
      if (attTimerRef.current) clearInterval(attTimerRef.current);
    }
  }, [attClockedIn, attSessionStart]);

  // Format seconds to HH:MM:SS
  const fmtTime = (sec) => {
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const attProgressPct = Math.min(100, Math.round(((attTotalMin * 60 + attElapsed) / (attWorkingHours * 3600)) * 100));
  const attRemainSec = Math.max(0, attWorkingHours * 3600 - Math.floor(attTotalMin * 60) - attElapsed);
  const attIsOvertime = (attTotalMin * 60 + attElapsed) >= (attWorkingHours * 3600);

  const handleSectionChange = (section) => {
    setActiveSection(section);
  };

  const handleNavigate = (section, data) => {
    setActiveSection(section);
    if (data) {
      setSelectedTradeShow(data);
    }
  };

  const renderContent = () => {
    switch (activeSection) {
      case 'overview':
        return <Overview user={user} dashboardData={dashboardData} error={error} />;
      case 'task-manager':
        return <TaskManager />;
      case 'leads-flow':
        return <LeadsFlow />;
      case 'client-management':
        return <ClientManagement />;
      case 'client-leads':
        return <ClientLeads />;
      case 'leads-metrics':
        return <LeadsMetrics />;
      case 'global-trade-show':
        return <GlobalTradeShow onNavigate={handleNavigate} />;
      case 'exhibitor-list':
        return <ExhibitorsList tradeShow={selectedTradeShow} onNavigate={handleNavigate} />;
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
      case 'linkedin':
        return <LinkedInManager />;
      case 'noxtm-chat':
        return <NoxtmChatAdmin />;
      case 'workspace-settings':
        return <WorkspaceSettings user={user} onLogout={onLogout} />;
      default:
        return (
          <div className="dashboard-card">
            <h3>Section Not Found</h3>
            <p>The requested section could not be found.</p>
          </div>
        );
    }
  };

  if (loading) {
    return (
      <div className="dashboard-container">
        <Sidebar activeSection={activeSection} onSectionChange={handleSectionChange} />
        <div className="dashboard-main">
          <div className="dashboard-content">
            <div className="dashboard-content-wrapper">
              <h1>Dashboard</h1>
              <p>Loading...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <Sidebar activeSection={activeSection} onSectionChange={handleSectionChange} />

      {/* Main Content */}
      <div className="dashboard-main">
        <div className="dashboard-content">
          {activeSection === 'message' ? (
            renderContent()
          ) : (
            <div className="dashboard-content-wrapper">
              {renderContent()}
            </div>
          )}
        </div>
      </div>

      {/* Mail Poller - silent background component for email notifications */}
      <MailPoller />

      {/* Chat Widget - hide when Messages section is open */}
      {activeSection !== 'message' && (
        <ChatWidget onNavigateToMessages={() => setActiveSection('message')} />
      )}

      {/* Floating Attendance Timer */}
      {attClockedIn && (
        <div className={`att-float-timer ${attTimerExpanded ? 'expanded' : ''} ${attIsOvertime ? 'overtime' : ''}`} onClick={() => setAttTimerExpanded(!attTimerExpanded)}>
          <div className="att-float-compact">
            <span className="att-float-pulse" />
            <FiClock size={14} />
            <span className="att-float-time">{fmtTime(attRemainSec)}</span>
            <span className="att-float-hint">{attIsOvertime ? 'OT' : 'left'}</span>
          </div>
          {attTimerExpanded && (
            <div className="att-float-details">
              <div className="att-float-row">
                <span className="att-float-label">Worked</span>
                <span className="att-float-val">{((attTotalMin + attElapsed / 60) / 60).toFixed(1)}h / {attWorkingHours}h</span>
              </div>
              <div className="att-float-progress-track">
                <div className={`att-float-progress-fill ${attIsOvertime ? 'complete' : ''}`} style={{ width: `${attProgressPct}%` }} />
              </div>
              <div className="att-float-row">
                <span className="att-float-label"><FiActivity size={11} /> {attIsOvertime ? 'Overtime' : 'Tracking'}</span>
                <span className="att-float-val att-float-active">Active</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default Dashboard;
