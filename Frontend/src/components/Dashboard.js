import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
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
import HrManage from './HrManage';
import EmployeeDetails from './EmployeeDetails';
import AttendanceSummary from './AttendanceSummary';
import HolidayCalendar from './HolidayCalendar';
import Incentives from './Incentives';
import BillingPayments from './BillingPayments';
import PaymentRecords from './PaymentRecords';
import ExpenseManagement from './ExpenseManagement';
import CompanyPolicies from './CompanyPolicies';
import CompanyHandbook from './CompanyHandbook';
import ManageIntegrations from './ManageIntegrations';
import WebSettings from './WebSettings';
import Blogs from './Blogs';
import UsersRoles from './UsersRoles';
import WebsiteAnalytics from './WebsiteAnalytics';
import SeoInsights from './SeoInsights';
import WorkspaceSettings from './WorkspaceSettings';
import GlobalTradeShow from './GlobalTradeShow';
import ExhibitorsList from './ExhibitorsList';
import LeadsMetrics from './LeadsMetrics';
import ClientManagement from './ClientManagement';
import InvoiceManagement from './InvoiceManagement';
import ChatWidget from './ChatWidget';
import NoxtmChatAdmin from './NoxtmChatAdmin';
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
      case 'hr-manage':
        return <HrManage />;
      case 'employee-details':
        return <EmployeeDetails />;
      case 'attendance-summary':
        return <AttendanceSummary />;
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
      // Settings & Configuration
      case 'manage-integrations':
        return <ManageIntegrations />;
      case 'web-settings':
        return <WebSettings />;
      case 'blogs':
        return <Blogs />;
      case 'users-roles':
        return <UsersRoles />;
      case 'website-analytics':
        return <WebsiteAnalytics />;
      case 'seo-insights':
        return <SeoInsights />;
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

      {/* Chat Widget - hide when Messages section is open */}
      {activeSection !== 'message' && (
        <ChatWidget onNavigateToMessages={() => setActiveSection('message')} />
      )}
    </div>
  );
}

export default Dashboard;
