import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../config/api';
import { useRole } from '../contexts/RoleContext';
import Sidebar from './Sidebar';
import Overview from './Overview';
import LeadsFlow from './LeadsFlow';
import ClientLeads from './ClientLeads';
import EmailSetup from './EmailSetup';
import CampaignMetrics from './CampaignMetrics';
import ConversionTracking from './ConversionTracking';
import OurProjects from './OurProjects';
import ProjectDelivered from './ProjectDelivered';
import CaseStudies from './CaseStudies';
import Services from './Services';
import EmailMarketing from './EmailMarketing';
import CampaignSetup from './CampaignSetup';
import EmailTemplate from './EmailTemplate';
import EmailAnalytics from './EmailAnalytics';
import WhatsAppMarketing from './WhatsAppMarketing';
import ReferralClient from './ReferralClient';
import Credentials from './Credentials';
import Messaging from './Messaging';
import TeamEmail from './TeamEmail';
import Meeting from './Meeting';
import HrOverview from './HrOverview';
import InterviewManagement from './InterviewManagement';
import LetterTemplates from './LetterTemplates';
import HrManage from './HrManage';
import EmployeeDetails from './EmployeeDetails';
import AttendanceSummary from './AttendanceSummary';
import HolidayCalendar from './HolidayCalendar';
import Incentives from './Incentives';
import BillingPayments from './BillingPayments';
import InvoiceGeneration from './InvoiceGeneration';
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
import BotgitData from './BotgitData';
import BotgitSettings from './BotgitSettings';
import ProfileSettings from './ProfileSettings';
import NoxtmMailDashboard from './NoxtmMailDashboard';
import EmailAccounts from './EmailAccounts';
import EmailDomains from './EmailDomains';
import EmailTemplates from './EmailTemplates';
import EmailLogViewer from './EmailLogViewer';
import AuditLogs from './AuditLogs';
import './Dashboard.css';

function Dashboard({ user, onLogout }) {
  const navigate = useNavigate();
  const { currentUser } = useRole();
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeSection, setActiveSection] = useState('overview');
  
  const isAdmin = currentUser?.role === 'Admin';

  const fetchDashboardData = useCallback(async () => {
    // Make sure we have the user data and role before proceeding
    if (!currentUser) {
      setError('User data not available');
      setLoading(false);
      return;
    }

    try {
      // Direct API call for dashboard data
      const response = await api.get('/dashboard');
      setDashboardData(response.data);
    } catch (error) {
      // More detailed error message to help with debugging
      let errorMsg = 'Failed to load dashboard data';
      
      if (error.response) {
        // The request was made and the server responded with a status code
        // that falls out of the range of 2xx
        console.error('API Error Status:', error.response.status);
        console.error('API Error Data:', error.response.data);
        
        if (error.response.status === 401) {
          errorMsg += ': Authentication failed. Please log in again.';
          onLogout(); // Logout the user on authentication failure
        } else if (!isAdmin && (error.response.status === 302 || 
                  (error.response.data && error.response.data.redirect === '/pricing'))) {
          // Only redirect non-admin users to pricing page
          navigate('/pricing');
          return; // Exit early since we're redirecting
        } else if (error.response.status >= 500) {
          errorMsg += ': Server error. Please try again later.';
        }
      } else if (error.request) {
        // The request was made but no response was received
        console.error('API Error: No response received');
        errorMsg += ': No response from server. Please check your connection.';
      } else {
        // Something happened in setting up the request that triggered an Error
        console.error('API Error Setup:', error.message);
        errorMsg += `: ${error.message}`;
      }
      
      setError(errorMsg);
      console.error('Dashboard error:', error);
    } finally {
      setLoading(false);
    }
  }, [currentUser, isAdmin, navigate, onLogout]);

  useEffect(() => {
    if (currentUser) {
      fetchDashboardData();
    }
  }, [currentUser, fetchDashboardData]);

  // Listen for navigation to messaging from toast notifications
  useEffect(() => {
    const handleNavigateToMessaging = () => {
      setActiveSection('message');
    };

    window.addEventListener('dashboard:navigateToMessaging', handleNavigateToMessaging);
    return () => window.removeEventListener('dashboard:navigateToMessaging', handleNavigateToMessaging);
  }, []);

  const handleSectionChange = (section) => {
    setActiveSection(section);
  };

  const renderContent = () => {
    switch (activeSection) {
      case 'overview':
        return <Overview user={user} dashboardData={dashboardData} error={error} />;
      case 'leads-flow':
        return <LeadsFlow />;
      case 'client-leads':
        return <ClientLeads />;
      case 'campaign-metrics':
        return <CampaignMetrics />;
      case 'conversion-tracking':
        return <ConversionTracking />;
      case 'our-projects':
        return <OurProjects />;
      case 'project-delivered':
        return <ProjectDelivered />;
      case 'case-studies':
        return <CaseStudies />;
      case 'services':
        return <Services />;
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
      case 'referral-client':
        return <ReferralClient />;
      case 'credentials':
        return <Credentials />;
      // Noxtm Mail - Email Management System
      case 'noxtm-mail-dashboard':
        return <NoxtmMailDashboard />;
      case 'noxtm-mail-accounts':
        return <EmailAccounts />;
      case 'noxtm-mail-domains':
        return <EmailDomains />;
      case 'noxtm-mail-templates':
        return <EmailTemplates />;
      case 'noxtm-mail-logs':
        return <EmailLogViewer />;
      case 'noxtm-mail-audit':
        return <AuditLogs />;
      // Team Communication
      case 'message':
        return <Messaging />;
      case 'team-email':
        return <TeamEmail />;
      case 'meeting':
        return <Meeting />;
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
      case 'billing-payments':
        return <BillingPayments />;
      case 'invoice-generation':
        return <InvoiceGeneration />;
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
      case 'workspace-settings':
        return <WorkspaceSettings user={user} onLogout={onLogout} />;
      case 'botgit-data':
        return <BotgitData />;
      case 'botgit-settings':
        return <BotgitSettings />;
      case 'profile-settings':
        return <ProfileSettings user={user} />;
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
    </div>
  );
}

export default Dashboard;