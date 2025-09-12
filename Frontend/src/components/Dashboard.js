import React, { useState, useEffect } from 'react';
import api from '../config/api';
import Sidebar from './Sidebar';
import Overview from './Overview';
import LeadsFlow from './LeadsFlow';
import ClientLeads from './ClientLeads';
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
import Message from './Message';
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
import ProfileSettings from './ProfileSettings';
import SeoInsights from './SeoInsights';
import './Dashboard.css';

function Dashboard({ user, onLogout }) {
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeSection, setActiveSection] = useState('overview');

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const response = await api.get('/dashboard');
      setDashboardData(response.data);
    } catch (error) {
      setError('Failed to load dashboard data');
      console.error('Dashboard error:', error);
    } finally {
      setLoading(false);
    }
  };

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
      // Team Communication
      case 'message':
        return <Message />;
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
      case 'profile-settings':
        return <ProfileSettings user={user} onLogout={onLogout} />;
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
            <h1>Dashboard</h1>
            <p>Loading...</p>
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
          {renderContent()}
        </div>
      </div>
    </div>
  );
}

export default Dashboard;