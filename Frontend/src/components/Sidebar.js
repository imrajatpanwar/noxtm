import React, { useState, useMemo, useEffect } from 'react';
import { FiSearch, FiGrid, FiTrendingUp, FiUsers, FiBarChart2, FiTarget, FiFolder, FiPackage, FiFileText, FiSettings, FiMail, FiChevronDown, FiChevronRight, FiMessageCircle, FiUserPlus, FiUser, FiUserCheck, FiDollarSign, FiShield, FiVideo, FiCamera, FiLinkedin, FiYoutube, FiTwitter, FiMessageSquare, FiGlobe, FiActivity } from 'react-icons/fi';
import { useRole } from '../contexts/RoleContext';
import './Sidebar.css';

function Sidebar({ activeSection, onSectionChange }) {
  const { hasPermission, MODULES, permissionUpdateTrigger } = useRole();
  const [emailMarketingExpanded, setEmailMarketingExpanded] = useState(false);
  const [hrManagementExpanded, setHrManagementExpanded] = useState(false);
  const [hrManagementSubExpanded, setHrManagementSubExpanded] = useState(false);
  const [employeesExpanded, setEmployeesExpanded] = useState(false);
  const [financeManagementExpanded, setFinanceManagementExpanded] = useState(false);
  const [internalPoliciesExpanded, setInternalPoliciesExpanded] = useState(false);
  const [settingsConfigExpanded, setSettingsConfigExpanded] = useState(false);
  const [leadManagementExpanded, setLeadManagementExpanded] = useState(false);
  const [leadMetricsExpanded, setLeadMetricsExpanded] = useState(false);
  const [socialMediaExpanded, setSocialMediaExpanded] = useState(false);
  const [seoManagementExpanded, setSeoManagementExpanded] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Memoized permission checking to prevent unnecessary re-renders and glitches
  const sectionPermissions = useMemo(() => ({
    'Dashboard': hasPermission(MODULES.DASHBOARD),
    'Data Center': hasPermission(MODULES.DATA_CENTER),
    'Projects': hasPermission(MODULES.PROJECTS),
    'Team Communication': hasPermission(MODULES.TEAM_COMMUNICATION),
    'Digital Media Management': hasPermission(MODULES.DIGITAL_MEDIA),
    'Marketing': hasPermission(MODULES.MARKETING),
    'HR Management': hasPermission(MODULES.HR_MANAGEMENT),
    'Finance Management': hasPermission(MODULES.FINANCE_MANAGEMENT),
    'SEO Management': hasPermission(MODULES.SEO_MANAGEMENT),
    'Internal Policies': hasPermission(MODULES.INTERNAL_POLICIES),
    'Settings & Configuration': hasPermission(MODULES.SETTINGS_CONFIG),
    'Profile Settings': true, // Profile settings should be accessible to all users
  }), [hasPermission, MODULES]); // Remove permissionUpdateTrigger as hasPermission already handles updates

  // Permission checking function using memoized values
  const hasPermissionForSection = (section) => {
    return sectionPermissions[section] !== undefined ? sectionPermissions[section] : true;
  };

  // Force re-render when permissions change to prevent glitches
  useEffect(() => {
    // This effect will trigger when permissionUpdateTrigger changes
    // causing the component to re-render with updated permissions
  }, [permissionUpdateTrigger]);

  const toggleEmailMarketing = () => {
    setEmailMarketingExpanded(!emailMarketingExpanded);
  };

  const toggleHrManagement = () => {
    setHrManagementExpanded(!hrManagementExpanded);
  };

  const toggleHrManagementSub = () => {
    setHrManagementSubExpanded(!hrManagementSubExpanded);
  };

  const toggleEmployees = () => {
    setEmployeesExpanded(!employeesExpanded);
  };

  const toggleFinanceManagement = () => {
    setFinanceManagementExpanded(!financeManagementExpanded);
  };

  const toggleInternalPolicies = () => {
    setInternalPoliciesExpanded(!internalPoliciesExpanded);
  };

  const toggleSettingsConfig = () => {
    setSettingsConfigExpanded(!settingsConfigExpanded);
  };

  const toggleLeadManagement = () => {
    setLeadManagementExpanded(!leadManagementExpanded);
  };

  const toggleLeadMetrics = () => {
    setLeadMetricsExpanded(!leadMetricsExpanded);
  };

  const toggleSocialMedia = () => {
    setSocialMediaExpanded(!socialMediaExpanded);
  };

  const toggleSeoManagement = () => {
    setSeoManagementExpanded(!seoManagementExpanded);
  };

  // All sidebar items for search functionality
  const allSidebarItems = [
    // Dashboard
    { name: 'Overview', section: 'overview', category: 'Dashboard' },
    
    // Lead Management
    { name: 'Leads Flow', section: 'leads-flow', category: 'Lead Management' },
    { name: 'Client Leads', section: 'client-leads', category: 'Lead Management' },
    { name: 'Lead Metrics', section: 'lead-metrics', category: 'Lead Management' },
    { name: 'Campaign Metrics', section: 'campaign-metrics', category: 'Lead Management' },
    { name: 'Conversion Tracking', section: 'conversion-tracking', category: 'Lead Management' },
    
    // Digital Media Management
    { name: 'Meta Ads', section: 'meta-ads', category: 'Digital Media Management' },
    { name: 'Instagram', section: 'instagram', category: 'Digital Media Management' },
    { name: 'LinkedIn', section: 'linkedin', category: 'Digital Media Management' },
    { name: 'YouTube', section: 'youtube', category: 'Digital Media Management' },
    { name: 'X.com', section: 'x-com', category: 'Digital Media Management' },
    { name: 'Reddit', section: 'reddit', category: 'Digital Media Management' },
    
    // Projects
    { name: 'Client / Projects', section: 'our-projects', category: 'Projects' },
    { name: 'Project Delivered', section: 'project-delivered', category: 'Projects' },
    
    // Team Communication
    { name: 'Message', section: 'message', category: 'Team Communication' },
    { name: 'E-mail', section: 'team-email', category: 'Team Communication' },
    { name: 'Meeting', section: 'meeting', category: 'Team Communication' },
    { name: 'Services', section: 'services', category: 'Team Communication' },
    
    // Marketing
    { name: 'Case Studies', section: 'case-studies', category: 'Marketing' },
    { name: 'Email Marketing', section: 'email-marketing', category: 'Marketing' },
    { name: 'Campaign Setup', section: 'campaign-setup', category: 'Marketing' },
    { name: 'Create Email Template', section: 'email-template', category: 'Marketing' },
    { name: 'Analytics & Reporting', section: 'email-analytics', category: 'Marketing' },
    { name: 'WhatsApp Marketing', section: 'whatsapp-marketing', category: 'Marketing' },
    { name: 'Referral Client', section: 'referral-client', category: 'Marketing' },
    
    // HR Management
    { name: 'HR Management', section: 'hr-management-sub', category: 'HR Management' },
    { name: 'HR Overview', section: 'hr-overview', category: 'HR Management' },
    { name: 'Interview Management', section: 'interview-management', category: 'HR Management' },
    { name: 'Letter Templates', section: 'letter-templates', category: 'HR Management' },
    { name: 'HR Manage', section: 'hr-manage', category: 'HR Management' },
    { name: 'Employees', section: 'employees', category: 'HR Management' },
    { name: 'Employee Details', section: 'employee-details', category: 'HR Management' },
    { name: 'Attendance Summary', section: 'attendance-summary', category: 'HR Management' },
    { name: 'Holiday Calendar', section: 'holiday-calendar', category: 'HR Management' },
    { name: 'Incentives', section: 'incentives', category: 'HR Management' },
    
    // Finance Management
    { name: 'Billing & Payments', section: 'billing-payments', category: 'Finance Management' },
    { name: 'Invoice Generation', section: 'invoice-generation', category: 'Finance Management' },
    { name: 'Payment Records', section: 'payment-records', category: 'Finance Management' },
    { name: 'Expense Management', section: 'expense-management', category: 'Finance Management' },
    
    // Internal Policies
    { name: 'Company Policies', section: 'company-policies', category: 'Internal Policies' },
    { name: 'Company Handbook', section: 'company-handbook', category: 'Internal Policies' },
    
    // SEO Management
    { name: 'Website Analytics', section: 'website-analytics', category: 'SEO Management' },
    { name: 'SEO Insights', section: 'seo-insights', category: 'SEO Management' },
    { name: 'Web Settings', section: 'web-settings', category: 'SEO Management' },
    { name: 'Website Blogs', section: 'blogs', category: 'SEO Management' },
    
    // Settings & Configuration
    { name: 'Manage Integrations', section: 'manage-integrations', category: 'Settings & Configuration' },
    { name: 'Users & Roles', section: 'users-roles', category: 'Settings & Configuration' },
    { name: 'Credentials', section: 'credentials', category: 'Settings & Configuration' },
    
    // Profile Settings (Separate Section)
    { name: 'Profile Settings', section: 'profile-settings', category: 'Profile Settings' },
  ];

  // Filter items based on search query and permissions
  const filteredItems = searchQuery.trim() === "" ? [] : allSidebarItems.filter(item => {
    if (!hasPermissionForSection(item.category)) {
      return false;
    }
    return item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
           item.category.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
  };

  const handleSearchItemClick = (section) => {
    onSectionChange(section);
    setSearchQuery(''); // Clear search after selection
  };

  return (
    <div className="dashboard-sidebar">
      {/* Search */}
      <div className="sidebar-search">
        <FiSearch className="search-icon" />
        <input 
          type="text" 
          placeholder="Search" 
          className="search-input"
          value={searchQuery}
          onChange={handleSearchChange}
        />
      </div>

      {/* Search Results */}
      {searchQuery.trim() !== '' && (
        <div className="search-results">
          {filteredItems.length > 0 ? (
            <>
              <div className="search-results-header">
                Search Results ({filteredItems.length})
              </div>
              {filteredItems.map((item, index) => (
                <div 
                  key={index}
                  className={`search-result-item ${activeSection === item.section ? 'active' : ''}`}
                  onClick={() => handleSearchItemClick(item.section)}
                >
                  <div className="search-result-name">{item.name}</div>
                  <div className="search-result-category">{item.category}</div>
                </div>
              ))}
            </>
          ) : (
            <div className="no-search-results">
              No results found for "{searchQuery}"
            </div>
          )}
        </div>
      )}

      {/* Always show regular menu, hide it when search has results */}
      {(!searchQuery.trim() || !filteredItems.length) && (
        <>
          {/* Dashboard Section */}
          {hasPermissionForSection('Dashboard') && (
            <div className="sidebar-section">
              <h4 className="sidebar-section-title">DASHBOARD</h4>
              <div 
                className={`sidebar-item ${activeSection === 'overview' ? 'active' : ''}`}
                onClick={() => onSectionChange('overview')}
              >
                <FiGrid className="sidebar-icon" />
                <span>Overview</span>
              </div>
            </div>
          )}
          
          {/* Data Center Section */}
          {hasPermissionForSection('Data Center') && (
            <div className="sidebar-section">
              <h4 className="sidebar-section-title">DATA CENTER</h4>
              <div className="sidebar-item-container">
                <div 
                  className={`sidebar-item ${activeSection === 'lead-management' ? 'active' : ''}`}
                  onClick={toggleLeadManagement}
                >
                  <FiTarget className="sidebar-icon" />
                  <span>Lead Management</span>
                  {leadManagementExpanded ? 
                    <FiChevronDown className="sidebar-chevron" /> : 
                    <FiChevronRight className="sidebar-chevron" />
                  }
                </div>
                
                {leadManagementExpanded && (
                  <div className="sidebar-submenu">
                    <div 
                      className={`sidebar-item sidebar-subitem ${activeSection === 'leads-flow' ? 'active' : ''}`}
                      onClick={() => onSectionChange('leads-flow')}
                    >
                      <FiTrendingUp className="sidebar-icon" />
                      <span>Leads Flow</span>
                    </div>
                    <div 
                      className={`sidebar-item sidebar-subitem ${activeSection === 'client-leads' ? 'active' : ''}`}
                      onClick={() => onSectionChange('client-leads')}
                    >
                      <FiUsers className="sidebar-icon" />
                      <span>Client Leads</span>
                    </div>
                  </div>
                )}
              </div>
              
              {/* Lead Metrics as separate section */}
              <div className="sidebar-item-container">
                <div 
                  className={`sidebar-item ${activeSection === 'lead-metrics' ? 'active' : ''}`}
                  onClick={toggleLeadMetrics}
                >
                  <FiBarChart2 className="sidebar-icon" />
                  <span>Lead Metrics</span>
                  {leadMetricsExpanded ? 
                    <FiChevronDown className="sidebar-chevron" /> : 
                    <FiChevronRight className="sidebar-chevron" />
                  }
                </div>
                
                {leadMetricsExpanded && (
                  <div className="sidebar-submenu">
                    <div 
                      className={`sidebar-item sidebar-subitem ${activeSection === 'campaign-metrics' ? 'active' : ''}`}
                      onClick={() => onSectionChange('campaign-metrics')}
                    >
                      <span>Campaign Metrics</span>
                    </div>
                    <div 
                      className={`sidebar-item sidebar-subitem ${activeSection === 'conversion-tracking' ? 'active' : ''}`}
                      onClick={() => onSectionChange('conversion-tracking')}
                    >
                      <span>Conversion Tracking</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
          
          {/* Projects Section */}
          {hasPermissionForSection('Projects') && (
            <div className="sidebar-section">
              <h4 className="sidebar-section-title">PROJECTS</h4>
              <div 
                className={`sidebar-item ${activeSection === 'our-projects' ? 'active' : ''}`}
                onClick={() => onSectionChange('our-projects')}
              >
                <FiFolder className="sidebar-icon" />
                <span>Client / Projects</span>
              </div>
              <div 
                className={`sidebar-item ${activeSection === 'project-delivered' ? 'active' : ''}`}
                onClick={() => onSectionChange('project-delivered')}
              >
                <FiPackage className="sidebar-icon" />
                <span>Project Delivered</span>
              </div>
            </div>
          )}

          {/* Team Communication Section */}
          {hasPermissionForSection('Team Communication') && (
            <div className="sidebar-section">
              <h4 className="sidebar-section-title">TEAM COMMUNICATION</h4>
              <div 
                className={`sidebar-item ${activeSection === 'message' ? 'active' : ''}`}
                onClick={() => onSectionChange('message')}
              >
                <FiMessageCircle className="sidebar-icon" />
                <span>Message</span>
              </div>
              <div 
                className={`sidebar-item ${activeSection === 'team-email' ? 'active' : ''}`}
                onClick={() => onSectionChange('team-email')}
              >
                <FiMail className="sidebar-icon" />
                <span>E-mail</span>
              </div>
              <div 
                className={`sidebar-item ${activeSection === 'meeting' ? 'active' : ''}`}
                onClick={() => onSectionChange('meeting')}
              >
                <FiVideo className="sidebar-icon" />
                <span>Meeting</span>
              </div>
              <div 
                className={`sidebar-item ${activeSection === 'services' ? 'active' : ''}`}
                onClick={() => onSectionChange('services')}
              >
                <FiSettings className="sidebar-icon" />
                <span>Services</span>
              </div>
            </div>
          )}

          {/* Digital Media Management Section */}
          {hasPermissionForSection('Digital Media Management') && (
            <div className="sidebar-section">
              <h4 className="sidebar-section-title">DIGITAL MEDIA MANAGEMENT</h4>
              <div className="sidebar-item-container">
                <div 
                  className={`sidebar-item ${activeSection === 'social-media' ? 'active' : ''}`}
                  onClick={toggleSocialMedia}
                >
                  <FiGlobe className="sidebar-icon" />
                  <span>Social Media</span>
                  {socialMediaExpanded ? 
                    <FiChevronDown className="sidebar-chevron" /> : 
                    <FiChevronRight className="sidebar-chevron" />
                  }
                </div>
                
                {socialMediaExpanded && (
                  <div className="sidebar-submenu">
                    <div 
                      className={`sidebar-item sidebar-subitem ${activeSection === 'meta-ads' ? 'active' : ''}`}
                      onClick={() => onSectionChange('meta-ads')}
                    >
                      <FiTarget className="sidebar-icon" />
                      <span>Meta Ads</span>
                    </div>
                    <div 
                      className={`sidebar-item sidebar-subitem ${activeSection === 'instagram' ? 'active' : ''}`}
                      onClick={() => onSectionChange('instagram')}
                    >
                      <FiCamera className="sidebar-icon" />
                      <span>Instagram</span>
                    </div>
                    <div 
                      className={`sidebar-item sidebar-subitem ${activeSection === 'linkedin' ? 'active' : ''}`}
                      onClick={() => onSectionChange('linkedin')}
                    >
                      <FiLinkedin className="sidebar-icon" />
                      <span>LinkedIn</span>
                    </div>
                    <div 
                      className={`sidebar-item sidebar-subitem ${activeSection === 'youtube' ? 'active' : ''}`}
                      onClick={() => onSectionChange('youtube')}
                    >
                      <FiYoutube className="sidebar-icon" />
                      <span>YouTube</span>
                    </div>
                    <div 
                      className={`sidebar-item sidebar-subitem ${activeSection === 'x-com' ? 'active' : ''}`}
                      onClick={() => onSectionChange('x-com')}
                    >
                      <FiTwitter className="sidebar-icon" />
                      <span>X.com</span>
                    </div>
                    <div 
                      className={`sidebar-item sidebar-subitem ${activeSection === 'reddit' ? 'active' : ''}`}
                      onClick={() => onSectionChange('reddit')}
                    >
                      <FiMessageSquare className="sidebar-icon" />
                      <span>Reddit</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Marketing Section */}
          {hasPermissionForSection('Marketing') && (
            <div className="sidebar-section">
              <h4 className="sidebar-section-title">MARKETING</h4>
              
              {/* Email Marketing with Submenu */}
              <div className="sidebar-item-container">
                <div 
                  className={`sidebar-item ${activeSection === 'email-marketing' ? 'active' : ''}`}
                  onClick={toggleEmailMarketing}
                >
                  <FiMail className="sidebar-icon" />
                  <span>Email Marketing</span>
                  {emailMarketingExpanded ? 
                    <FiChevronDown className="sidebar-chevron" /> : 
                    <FiChevronRight className="sidebar-chevron" />
                  }
                </div>
                
                {emailMarketingExpanded && (
                  <div className="sidebar-submenu">
                    <div 
                      className={`sidebar-item sidebar-subitem ${activeSection === 'campaign-setup' ? 'active' : ''}`}
                      onClick={() => onSectionChange('campaign-setup')}
                    >
                      <span>Campaign Setup</span>
                    </div>
                    <div 
                      className={`sidebar-item sidebar-subitem ${activeSection === 'email-template' ? 'active' : ''}`}
                      onClick={() => onSectionChange('email-template')}
                    >
                      <span>Create Email Template</span>
                    </div>
                    <div 
                      className={`sidebar-item sidebar-subitem ${activeSection === 'email-analytics' ? 'active' : ''}`}
                      onClick={() => onSectionChange('email-analytics')}
                    >
                      <span>Analytics & Reporting</span>
                    </div>
                  </div>
                )}
              </div>

              <div 
                className={`sidebar-item ${activeSection === 'whatsapp-marketing' ? 'active' : ''}`}
                onClick={() => onSectionChange('whatsapp-marketing')}
              >
                <FiMessageCircle className="sidebar-icon" />
                <span>WhatsApp Marketing</span>
              </div>
              
              <div 
                className={`sidebar-item ${activeSection === 'referral-client' ? 'active' : ''}`}
                onClick={() => onSectionChange('referral-client')}
              >
                <FiUserPlus className="sidebar-icon" />
                <span>Referral Client</span>
              </div>
              
              <div 
                className={`sidebar-item ${activeSection === 'case-studies' ? 'active' : ''}`}
                onClick={() => onSectionChange('case-studies')}
              >
                <FiFileText className="sidebar-icon" />
                <span>Case Studies</span>
              </div>
            </div>
          )}

          {/* HR Management Section */}
          {hasPermissionForSection('HR Management') && (
            <div className="sidebar-section">
              <h4 className="sidebar-section-title">HR MANAGEMENT</h4>
              
              <div className="sidebar-item-container">
                <div 
                  className={`sidebar-item ${activeSection === 'hr-management' ? 'active' : ''}`}
                  onClick={toggleHrManagement}
                >
                  <FiUserCheck className="sidebar-icon" />
                  <span>HR Management</span>
                  {hrManagementExpanded ? 
                    <FiChevronDown className="sidebar-chevron" /> : 
                    <FiChevronRight className="sidebar-chevron" />
                  }
                </div>
                
                {hrManagementExpanded && (
                  <div className="sidebar-submenu">
                    {/* HR Management Expandable Submenu */}
                    <div className="sidebar-item-container">
                      <div 
                        className={`sidebar-item sidebar-subitem ${activeSection === 'hr-management-sub' ? 'active' : ''}`}
                        onClick={toggleHrManagementSub}
                      >
                        <FiUserCheck className="sidebar-icon" />
                        <span>HR Management</span>
                        {hrManagementSubExpanded ? 
                          <FiChevronDown className="sidebar-chevron" /> : 
                          <FiChevronRight className="sidebar-chevron" />
                        }
                      </div>
                      
                      {hrManagementSubExpanded && (
                        <div className="sidebar-sub-submenu">
                          <div 
                            className={`sidebar-item sidebar-sub-subitem ${activeSection === 'hr-overview' ? 'active' : ''}`}
                            onClick={() => onSectionChange('hr-overview')}
                          >
                            <span>HR Overview</span>
                          </div>
                          <div 
                            className={`sidebar-item sidebar-sub-subitem ${activeSection === 'interview-management' ? 'active' : ''}`}
                            onClick={() => onSectionChange('interview-management')}
                          >
                            <span>Interview Management</span>
                          </div>
                          <div 
                            className={`sidebar-item sidebar-sub-subitem ${activeSection === 'letter-templates' ? 'active' : ''}`}
                            onClick={() => onSectionChange('letter-templates')}
                          >
                            <span>Letter Templates</span>
                          </div>
                          <div 
                            className={`sidebar-item sidebar-sub-subitem ${activeSection === 'hr-manage' ? 'active' : ''}`}
                            onClick={() => onSectionChange('hr-manage')}
                          >
                            <span>HR Manage</span>
                          </div>
                        </div>
                      )}
                    </div>
                    
                    {/* Employees Expandable Submenu */}
                    <div className="sidebar-item-container">
                      <div 
                        className={`sidebar-item sidebar-subitem ${activeSection === 'employees' ? 'active' : ''}`}
                        onClick={toggleEmployees}
                      >
                        <FiUser className="sidebar-icon" />
                        <span>Employees</span>
                        {employeesExpanded ? 
                          <FiChevronDown className="sidebar-chevron" /> : 
                          <FiChevronRight className="sidebar-chevron" />
                        }
                      </div>
                      
                      {employeesExpanded && (
                        <div className="sidebar-sub-submenu">
                          <div 
                            className={`sidebar-item sidebar-sub-subitem ${activeSection === 'employee-details' ? 'active' : ''}`}
                            onClick={() => onSectionChange('employee-details')}
                          >
                            <span>Employee Details</span>
                          </div>
                          <div 
                            className={`sidebar-item sidebar-sub-subitem ${activeSection === 'attendance-summary' ? 'active' : ''}`}
                            onClick={() => onSectionChange('attendance-summary')}
                          >
                            <span>Attendance Summary</span>
                          </div>
                          <div 
                            className={`sidebar-item sidebar-sub-subitem ${activeSection === 'holiday-calendar' ? 'active' : ''}`}
                            onClick={() => onSectionChange('holiday-calendar')}
                          >
                            <span>Holiday Calendar</span>
                          </div>
                          <div 
                            className={`sidebar-item sidebar-sub-subitem ${activeSection === 'incentives' ? 'active' : ''}`}
                            onClick={() => onSectionChange('incentives')}
                          >
                            <span>Incentives</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Finance Management Section */}
          {hasPermissionForSection('Finance Management') && (
            <div className="sidebar-section">
              <h4 className="sidebar-section-title">FINANCE MANAGEMENT</h4>
              
              <div className="sidebar-item-container">
                <div 
                  className={`sidebar-item ${activeSection === 'finance-management' ? 'active' : ''}`}
                  onClick={toggleFinanceManagement}
                >
                  <FiDollarSign className="sidebar-icon" />
                  <span>Finance Management</span>
                  {financeManagementExpanded ? 
                    <FiChevronDown className="sidebar-chevron" /> : 
                    <FiChevronRight className="sidebar-chevron" />
                  }
                </div>
                
                {financeManagementExpanded && (
                  <div className="sidebar-submenu">
                    <div 
                      className={`sidebar-item sidebar-subitem ${activeSection === 'billing-payments' ? 'active' : ''}`}
                      onClick={() => onSectionChange('billing-payments')}
                    >
                      <span>Billing & Payments</span>
                    </div>
                    <div 
                      className={`sidebar-item sidebar-subitem ${activeSection === 'invoice-generation' ? 'active' : ''}`}
                      onClick={() => onSectionChange('invoice-generation')}
                    >
                      <span>Invoice Generation</span>
                    </div>
                    <div 
                      className={`sidebar-item sidebar-subitem ${activeSection === 'payment-records' ? 'active' : ''}`}
                      onClick={() => onSectionChange('payment-records')}
                    >
                      <span>Payment Records</span>
                    </div>
                    <div 
                      className={`sidebar-item sidebar-subitem ${activeSection === 'expense-management' ? 'active' : ''}`}
                      onClick={() => onSectionChange('expense-management')}
                    >
                      <span>Expense Management</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* SEO Management Section */}
          {hasPermissionForSection('SEO Management') && (
            <div className="sidebar-section">
              <h4 className="sidebar-section-title">SEO MANAGEMENT</h4>
              
              <div className="sidebar-item-container">
                <div 
                  className={`sidebar-item ${activeSection === 'seo-management' ? 'active' : ''}`}
                  onClick={toggleSeoManagement}
                >
                  <FiActivity className="sidebar-icon" />
                  <span>SEO Management</span>
                  {seoManagementExpanded ? 
                    <FiChevronDown className="sidebar-chevron" /> : 
                    <FiChevronRight className="sidebar-chevron" />
                  }
                </div>
                
                {seoManagementExpanded && (
                  <div className="sidebar-submenu">
                    <div 
                      className={`sidebar-item sidebar-subitem ${activeSection === 'website-analytics' ? 'active' : ''}`}
                      onClick={() => onSectionChange('website-analytics')}
                    >
                      <span>Website Analytics</span>
                    </div>
                    <div 
                      className={`sidebar-item sidebar-subitem ${activeSection === 'seo-insights' ? 'active' : ''}`}
                      onClick={() => onSectionChange('seo-insights')}
                    >
                      <span>SEO Insights</span>
                    </div>
                    <div 
                      className={`sidebar-item sidebar-subitem ${activeSection === 'web-settings' ? 'active' : ''}`}
                      onClick={() => onSectionChange('web-settings')}
                    >
                      <span>Web Settings</span>
                    </div>
                    <div 
                      className={`sidebar-item sidebar-subitem ${activeSection === 'blogs' ? 'active' : ''}`}
                      onClick={() => onSectionChange('blogs')}
                    >
                      <span>Website Blogs</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Internal Policies Section */}
          {hasPermissionForSection('Internal Policies') && (
            <div className="sidebar-section">
              <h4 className="sidebar-section-title">INTERNAL POLICIES</h4>
              
              <div className="sidebar-item-container">
                <div 
                  className={`sidebar-item ${activeSection === 'internal-policies' ? 'active' : ''}`}
                  onClick={toggleInternalPolicies}
                >
                  <FiShield className="sidebar-icon" />
                  <span>Internal Policies</span>
                  {internalPoliciesExpanded ? 
                    <FiChevronDown className="sidebar-chevron" /> : 
                    <FiChevronRight className="sidebar-chevron" />
                  }
                </div>
                
                {internalPoliciesExpanded && (
                  <div className="sidebar-submenu">
                    <div 
                      className={`sidebar-item sidebar-subitem ${activeSection === 'company-policies' ? 'active' : ''}`}
                      onClick={() => onSectionChange('company-policies')}
                    >
                      <span>Company Policies</span>
                    </div>
                    <div 
                      className={`sidebar-item sidebar-subitem ${activeSection === 'company-handbook' ? 'active' : ''}`}
                      onClick={() => onSectionChange('company-handbook')}
                    >
                      <span>Company Handbook</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Settings & Configuration Section */}
          {hasPermissionForSection('Settings & Configuration') && (
            <div className="sidebar-section">
              <h4 className="sidebar-section-title">SETTINGS & CONFIGURATION</h4>
              
              <div className="sidebar-item-container">
                <div 
                  className={`sidebar-item ${activeSection === 'settings-configuration' ? 'active' : ''}`}
                  onClick={toggleSettingsConfig}
                >
                  <FiSettings className="sidebar-icon" />
                  <span>Settings & Configuration</span>
                  {settingsConfigExpanded ? 
                    <FiChevronDown className="sidebar-chevron" /> : 
                    <FiChevronRight className="sidebar-chevron" />
                  }
                </div>
                
                {settingsConfigExpanded && (
                  <div className="sidebar-submenu">
                    <div 
                      className={`sidebar-item sidebar-subitem ${activeSection === 'manage-integrations' ? 'active' : ''}`}
                      onClick={() => onSectionChange('manage-integrations')}
                    >
                      <span>Manage Integrations</span>
                    </div>
                    <div 
                      className={`sidebar-item sidebar-subitem ${activeSection === 'users-roles' ? 'active' : ''}`}
                      onClick={() => onSectionChange('users-roles')}
                    >
                      <span>Users & Roles</span>
                    </div>
                    <div 
                      className={`sidebar-item sidebar-subitem ${activeSection === 'credentials' ? 'active' : ''}`}
                      onClick={() => onSectionChange('credentials')}
                    >
                      <span>Credentials</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Profile Settings Section */}
          <div className="sidebar-section">
            <h4 className="sidebar-section-title">PROFILE</h4>
            <div 
              className={`sidebar-item ${activeSection === 'profile-settings' ? 'active' : ''}`}
              onClick={() => onSectionChange('profile-settings')}
            >
              <FiUser className="sidebar-icon" />
              <span>Profile Settings</span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default Sidebar;
