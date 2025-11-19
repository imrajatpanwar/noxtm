import React, { useState, useMemo, useEffect, useContext } from 'react';
import { FiSearch, FiGrid, FiTrendingUp, FiUsers, FiBarChart2, FiTarget, FiFolder, FiPackage, FiFileText, FiSettings, FiMail, FiChevronDown, FiChevronRight, FiMessageCircle, FiUserPlus, FiUser, FiUserCheck, FiDollarSign, FiShield, FiVideo, FiCamera, FiLinkedin, FiYoutube, FiTwitter, FiMessageSquare, FiGlobe, FiActivity, FiDatabase, FiSliders } from 'react-icons/fi';
import { useRole } from '../contexts/RoleContext';
import { MessagingContext } from '../contexts/MessagingContext';
import { useModules } from '../contexts/ModuleContext';
import './Sidebar.css';
import api from '../config/api';

function Sidebar({ activeSection, onSectionChange }) {
  const { hasPermission, MODULES, permissionUpdateTrigger } = useRole();
  const { socket } = useContext(MessagingContext);
  const { isModuleInstalled } = useModules();
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
  const [messageUnreadCount, setMessageUnreadCount] = useState(0);

  // Get current user from RoleContext (always up-to-date)
  const { currentUser: contextCurrentUser } = useRole();
  const [subscription, setSubscription] = useState(null);

  // Use context's currentUser as the source of truth
  const currentUser = contextCurrentUser;

  useEffect(() => {
    // Fetch subscription status
    const fetchSubscription = async () => {
      try {
        const response = await fetch('/api/subscription/status', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });
        const data = await response.json();
        if (data.subscription) {
          setSubscription(data.subscription);
        }
      } catch (error) {
        console.error('Error fetching subscription:', error);
      }
    };

    if (currentUser && localStorage.getItem('token')) {
      fetchSubscription();
    }
  }, [currentUser]);

  // Fetch total unread count from conversations API
  const fetchTotalUnreadCount = async () => {
    try {
      const response = await api.get('/messaging/conversations');
      const conversations = response.data.conversations || [];
      const totalUnread = conversations.reduce((sum, conv) => sum + (conv.unreadCount || 0), 0);
      setMessageUnreadCount(totalUnread);
    } catch (error) {
      console.error('Error fetching unread count:', error);
    }
  };

  // Initial fetch and periodic refresh
  useEffect(() => {
    if (currentUser) {
      fetchTotalUnreadCount();
    }
  }, [currentUser]);

  // Listen for socket events to update unread count in real-time
  useEffect(() => {
    if (!socket) return;

    const handleUnreadCountUpdate = (data) => {
      console.log('📊 Sidebar received unread-count-update:', data);
      // Always update unread count when backend sends update
      fetchTotalUnreadCount();
    };

    const handleNewMessage = (data) => {
      console.log('📩 Sidebar received new-message:', data);
      // Instantly update unread count when new message arrives
      // This works even if user is not on Message page
      const currentUserId = currentUser?._id || currentUser?.id;
      const isOwnMessage = data.message?.sender?._id === currentUserId;

      // Only increment if it's not the current user's own message
      if (!isOwnMessage) {
        // Increment badge count immediately for instant feedback
        setMessageUnreadCount(prev => prev + 1);

        // Then fetch accurate count from backend
        setTimeout(() => {
          fetchTotalUnreadCount();
        }, 100);
      }
    };

    socket.on('unread-count-update', handleUnreadCountUpdate);
    socket.on('new-message', handleNewMessage);

    return () => {
      socket.off('unread-count-update', handleUnreadCountUpdate);
      socket.off('new-message', handleNewMessage);
    };
  }, [socket, currentUser]);

  // Reset unread count when user opens the Message section
  useEffect(() => {
    if (activeSection === 'message') {
      // Give it a small delay to let the Messaging component mark messages as read
      const timer = setTimeout(() => {
        fetchTotalUnreadCount();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [activeSection]);

  // Listen for instant updates when conversations are marked as read
  useEffect(() => {
    const handleMarkedAsRead = () => {
      // Instantly refresh unread count when a conversation is marked as read
      fetchTotalUnreadCount();
    };

    window.addEventListener('conversation:markedAsRead', handleMarkedAsRead);

    return () => {
      window.removeEventListener('conversation:markedAsRead', handleMarkedAsRead);
    };
  }, []);

  // Check if current user has SOLOHQ role
  const isSOLOHQUser = currentUser?.role === 'SOLOHQ';

  // Check if NOXTM MAIL should be hidden (for active Noxtm subscription users)
  const shouldHideNoxtmMail = subscription?.plan === 'Noxtm' && subscription?.status === 'active';

  // Check if user has findr subscription access
  const hasfindrSubscription = useMemo(() => {
    const userSubscription = currentUser?.subscription?.plan;
    const subscriptionStatus = currentUser?.subscription?.status;
    
    // findr is available for these subscription plans
    const findrEnabledPlans = ['findr', 'Enterprise', 'Noxtm'];
    
    return subscriptionStatus === 'active' && findrEnabledPlans.includes(userSubscription);
  }, [currentUser?.subscription]);

  // Memoized permission checking to prevent unnecessary re-renders and glitches
  const sectionPermissions = useMemo(() => {
    // For Admin users, grant access to all sections (super-admin)
    if (currentUser?.role === 'Admin') {
      return {
        'Dashboard': true,
        'Data Center': true,
        'Projects': true,
        'Team Communication': true,
        'Digital Media Management': true,
        'Marketing': true,
        'HR Management': true,
        'Finance Management': true,
        'SEO Management': true,
        'Internal Policies': true,
        'Settings & Configuration': true,
        'Workspace Settings': true,
        'findr': hasfindrSubscription, // Require subscription even for Admin
        'Profile': true
      };
    }
    
    // For Business Admin users, grant access to all sections except Settings & Configuration
    if (currentUser?.role === 'Business Admin') {
      return {
        'Dashboard': true,
        'Data Center': true,
        'Projects': true,
        'Team Communication': true,
        'Digital Media Management': true,
        'Marketing': true,
        'HR Management': true,
        'Finance Management': true,
        'SEO Management': true,
        'Internal Policies': true,
        'Settings & Configuration': false,
        'Workspace Settings': true,
        'findr': hasfindrSubscription, // Require subscription
        'Profile': true
      };
    }
    
    // For SOLOHQ users, override permissions with specific allowed sections
    if (isSOLOHQUser) {
      return {
        'Dashboard': false,
        'Data Center': false,
        'Projects': true,
        'Team Communication': true,
        'Digital Media Management': false,
        'Marketing': false,
        'HR Management': false,
        'Finance Management': true,
        'SEO Management': false,
        'Internal Policies': false,
        'Settings & Configuration': false,
        'Workspace Settings': false,
        'findr': false, // SOLOHQ users don't get findr (free plan)
        'Profile': true
      };
    }
    
    // For Team Member users, use backend permissions (controlled by Business Admin)
    if (currentUser?.role === 'Team Member') {
      return {
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
        'Workspace Settings': false, // Team Members don't get workspace settings
        'findr': hasPermission(MODULES.PROJECTS) && hasfindrSubscription, // Require both permission and subscription
        'Profile': true // Profile is available to all users
      };
    }
    
    // For other specific role users, use existing permission system
    return {
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
      'Workspace Settings': true, // Workspace settings should be accessible to specific roles
      'findr': hasfindrSubscription, // findr requires active subscription
      'Profile': true // Profile is available to all users
    };
  }, [hasPermission, MODULES, isSOLOHQUser, currentUser?.role, hasfindrSubscription]); // Add hasfindrSubscription dependency

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
    { name: 'Global Trade Shows', section: 'global-trade-show', category: 'Data Center' },
    { name: 'findr', section: 'findr', category: 'Data Center' },
    
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

    // Noxtm Mail
    { name: 'Mainstream', section: 'noxtm-mail-mainstream', category: 'Marketing' },
    { name: 'Sent Mails', section: 'noxtm-mail-sent', category: 'Marketing' },
    { name: 'Spam Mails', section: 'noxtm-mail-spam', category: 'Marketing' },
    { name: 'Trash Mails', section: 'noxtm-mail-trash', category: 'Marketing' },
    { name: 'Set-up Template', section: 'noxtm-mail-templates', category: 'Marketing' },
    { name: 'Set-up Campaign', section: 'noxtm-mail-campaign', category: 'Marketing' },
    { name: 'Mail Dashboard', section: 'noxtm-mail-dashboard', category: 'Marketing' },
    { name: 'Email Accounts', section: 'noxtm-mail-accounts', category: 'Marketing' },
    { name: 'Domains', section: 'noxtm-mail-domains', category: 'Marketing' },
    { name: 'Email Logs', section: 'noxtm-mail-logs', category: 'Marketing' },
    { name: 'Audit Trail', section: 'noxtm-mail-audit', category: 'Marketing' },
    { name: 'AWS SES Domains', section: 'aws-ses-domains', category: 'Marketing' },

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
    
    // findr
    { name: 'Scraped Data', section: 'findr-data', category: 'findr' },
    { name: 'findr Settings', section: 'findr-settings', category: 'findr' },
    
    // Profile
    { name: 'Profile Settings', section: 'profile-settings', category: 'Profile' },
    
    // Workspace Settings (Separate Section)
    { name: 'Workspace Settings', section: 'workspace-settings', category: 'Workspace Settings' },
  ];

  // Filter items based on search query and permissions
  const filteredItems = searchQuery.trim() === "" ? [] : allSidebarItems.filter(item => {
    if (!hasPermissionForSection(item.category)) {
      return false;
    }
    // Hide NOXTM MAIL items for active Noxtm subscribers
    if (shouldHideNoxtmMail && ['Mail Dashboard', 'Email Accounts', 'Domains', 'Set-up Template', 'Email Logs', 'Audit Trail', 'Mainstream', 'Sent Mails', 'Spam Mails', 'Trash Mails', 'Set-up Campaign'].includes(item.name)) {
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
              <h4 className="Dash-noxtm-sidebar-section-title">DASHBOARD</h4>
              <div 
                className={`Dash-noxtm-sidebar-item ${activeSection === 'overview' ? 'active' : ''}`}
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
              <h4 className="Dash-noxtm-sidebar-section-title">DATA CENTER</h4>
              
              {/* Global Trade Show Section - Only show if ExhibitOS module is installed */}
              {isModuleInstalled('ExhibitOS') && (
                <div className="sidebar-item-container">
                  <div
                    className={`Dash-noxtm-sidebar-item ${activeSection === 'global-trade-show' ? 'active' : ''}`}
                    onClick={() => onSectionChange('global-trade-show')}
                  >
                    <FiGlobe className="sidebar-icon" />
                    <span>Global Trade Shows</span>
                  </div>
                </div>
              )}

              {/* findr Section - Only show if ExhibitOS module is installed */}
              {isModuleInstalled('ExhibitOS') && (
                <div className="sidebar-item-container">
                  <div
                    className={`Dash-noxtm-sidebar-item ${activeSection === 'findr' ? 'active' : ''}`}
                    onClick={() => onSectionChange('findr')}
                  >
                    <FiDatabase className="sidebar-icon" />
                    <span>findr</span>
                  </div>
                </div>
              )}

              <div className="sidebar-item-container">
                <div 
                  className={`Dash-noxtm-sidebar-item ${activeSection === 'lead-management' ? 'active' : ''}`}
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
                      className={`Dash-noxtm-sidebar-item sidebar-subitem ${activeSection === 'leads-flow' ? 'active' : ''}`}
                      onClick={() => onSectionChange('leads-flow')}
                    >
                      <FiTrendingUp className="sidebar-icon" />
                      <span>Leads Flow</span>
                    </div>
                    <div 
                      className={`Dash-noxtm-sidebar-item sidebar-subitem ${activeSection === 'client-leads' ? 'active' : ''}`}
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
                  className={`Dash-noxtm-sidebar-item ${activeSection === 'lead-metrics' ? 'active' : ''}`}
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
                      className={`Dash-noxtm-sidebar-item sidebar-subitem ${activeSection === 'campaign-metrics' ? 'active' : ''}`}
                      onClick={() => onSectionChange('campaign-metrics')}
                    >
                      <span>Campaign Metrics</span>
                    </div>
                    <div 
                      className={`Dash-noxtm-sidebar-item sidebar-subitem ${activeSection === 'conversion-tracking' ? 'active' : ''}`}
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
              <h4 className="Dash-noxtm-sidebar-section-title">PROJECTS</h4>
              <div 
                className={`Dash-noxtm-sidebar-item ${activeSection === 'our-projects' ? 'active' : ''}`}
                onClick={() => onSectionChange('our-projects')}
              >
                <FiFolder className="sidebar-icon" />
                <span>Client / Projects</span>
              </div>
              <div 
                className={`Dash-noxtm-sidebar-item ${activeSection === 'project-delivered' ? 'active' : ''}`}
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
              <h4 className="Dash-noxtm-sidebar-section-title">TEAM COMMUNICATION</h4>
              {!isSOLOHQUser && (
                <>
                  <div
                    className={`Dash-noxtm-sidebar-item ${activeSection === 'message' ? 'active' : ''}`}
                    onClick={() => {
                      onSectionChange('message');
                    }}
                  >
                    <FiMessageCircle className="sidebar-icon" />
                    <span>Message</span>
                    {messageUnreadCount > 0 && (
                      <span className="sidebar-message-badge">{messageUnreadCount > 99 ? '99+' : messageUnreadCount}</span>
                    )}
                  </div>
                </>
              )}
              <div 
                className={`Dash-noxtm-sidebar-item ${activeSection === 'team-email' ? 'active' : ''}`}
                onClick={() => onSectionChange('team-email')}
              >
                <FiMail className="sidebar-icon" />
                <span>E-mail</span>
              </div>
              {!isSOLOHQUser && (
                <>
                  <div 
                    className={`Dash-noxtm-sidebar-item ${activeSection === 'meeting' ? 'active' : ''}`}
                    onClick={() => onSectionChange('meeting')}
                  >
                    <FiVideo className="sidebar-icon" />
                    <span>Meeting</span>
                  </div>
                  <div 
                    className={`Dash-noxtm-sidebar-item ${activeSection === 'services' ? 'active' : ''}`}
                    onClick={() => onSectionChange('services')}
                  >
                    <FiSettings className="sidebar-icon" />
                    <span>Services</span>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Digital Media Management Section */}
          {hasPermissionForSection('Digital Media Management') && (
            <div className="sidebar-section">
              <h4 className="Dash-noxtm-sidebar-section-title">DIGITAL MEDIA MANAGEMENT</h4>
              <div className="sidebar-item-container">
                <div 
                  className={`Dash-noxtm-sidebar-item ${activeSection === 'social-media' ? 'active' : ''}`}
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
                      className={`Dash-noxtm-sidebar-item sidebar-subitem ${activeSection === 'meta-ads' ? 'active' : ''}`}
                      onClick={() => onSectionChange('meta-ads')}
                    >
                      <FiTarget className="sidebar-icon" />
                      <span>Meta Ads</span>
                    </div>
                    <div 
                      className={`Dash-noxtm-sidebar-item sidebar-subitem ${activeSection === 'instagram' ? 'active' : ''}`}
                      onClick={() => onSectionChange('instagram')}
                    >
                      <FiCamera className="sidebar-icon" />
                      <span>Instagram</span>
                    </div>
                    <div 
                      className={`Dash-noxtm-sidebar-item sidebar-subitem ${activeSection === 'linkedin' ? 'active' : ''}`}
                      onClick={() => onSectionChange('linkedin')}
                    >
                      <FiLinkedin className="sidebar-icon" />
                      <span>LinkedIn</span>
                    </div>
                    <div 
                      className={`Dash-noxtm-sidebar-item sidebar-subitem ${activeSection === 'youtube' ? 'active' : ''}`}
                      onClick={() => onSectionChange('youtube')}
                    >
                      <FiYoutube className="sidebar-icon" />
                      <span>YouTube</span>
                    </div>
                    <div 
                      className={`Dash-noxtm-sidebar-item sidebar-subitem ${activeSection === 'x-com' ? 'active' : ''}`}
                      onClick={() => onSectionChange('x-com')}
                    >
                      <FiTwitter className="sidebar-icon" />
                      <span>X.com</span>
                    </div>
                    <div 
                      className={`Dash-noxtm-sidebar-item sidebar-subitem ${activeSection === 'reddit' ? 'active' : ''}`}
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
              <h4 className="Dash-noxtm-sidebar-section-title">MARKETING</h4>
              
              {/* Email Marketing with Submenu */}
              <div className="sidebar-item-container">
                <div 
                  className={`Dash-noxtm-sidebar-item ${activeSection === 'email-marketing' ? 'active' : ''}`}
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
                      className={`Dash-noxtm-sidebar-item sidebar-subitem ${activeSection === 'email-setup' ? 'active' : ''}`}
                      onClick={() => onSectionChange('email-setup')}
                    >
                      <span>Email Setup</span>
                    </div>
                    <div 
                      className={`Dash-noxtm-sidebar-item sidebar-subitem ${activeSection === 'campaign-setup' ? 'active' : ''}`}
                      onClick={() => onSectionChange('campaign-setup')}
                    >
                      <span>Campaign Setup</span>
                    </div>
                    <div 
                      className={`Dash-noxtm-sidebar-item sidebar-subitem ${activeSection === 'email-template' ? 'active' : ''}`}
                      onClick={() => onSectionChange('email-template')}
                    >
                      <span>Create Email Template</span>
                    </div>
                    <div 
                      className={`Dash-noxtm-sidebar-item sidebar-subitem ${activeSection === 'email-analytics' ? 'active' : ''}`}
                      onClick={() => onSectionChange('email-analytics')}
                    >
                      <span>Analytics & Reporting</span>
                    </div>
                  </div>
                )}
              </div>

              <div 
                className={`Dash-noxtm-sidebar-item ${activeSection === 'whatsapp-marketing' ? 'active' : ''}`}
                onClick={() => onSectionChange('whatsapp-marketing')}
              >
                <FiMessageCircle className="sidebar-icon" />
                <span>WhatsApp Marketing</span>
              </div>
              
              <div 
                className={`Dash-noxtm-sidebar-item ${activeSection === 'referral-client' ? 'active' : ''}`}
                onClick={() => onSectionChange('referral-client')}
              >
                <FiUserPlus className="sidebar-icon" />
                <span>Referral Client</span>
              </div>
              
              <div 
                className={`Dash-noxtm-sidebar-item ${activeSection === 'case-studies' ? 'active' : ''}`}
                onClick={() => onSectionChange('case-studies')}
              >
                <FiFileText className="sidebar-icon" />
                <span>Case Studies</span>
              </div>
            </div>
          )}

          {/* Noxtm Mail Section - Hidden for active Noxtm subscribers */}
          {hasPermissionForSection('Marketing') && !shouldHideNoxtmMail && (
            <div className="sidebar-section">
              <h4 className="Dash-noxtm-sidebar-section-title">Noxtm Mail</h4>
              <div
                className={`Dash-noxtm-sidebar-item ${activeSection === 'noxtm-mail-mainstream' ? 'active' : ''}`}
                onClick={() => onSectionChange('noxtm-mail-mainstream')}
              >
                <FiMail className="sidebar-icon" />
                <span>Mainstream</span>
                <span className="sidebar-message-badge">1</span>
              </div>
              <div
                className={`Dash-noxtm-sidebar-item ${activeSection === 'noxtm-mail-sent' ? 'active' : ''}`}
                onClick={() => onSectionChange('noxtm-mail-sent')}
              >
                <FiMail className="sidebar-icon" />
                <span>Sent Mails</span>
              </div>
              <div
                className={`Dash-noxtm-sidebar-item ${activeSection === 'noxtm-mail-spam' ? 'active' : ''}`}
                onClick={() => onSectionChange('noxtm-mail-spam')}
              >
                <FiShield className="sidebar-icon" />
                <span>Spam Mails</span>
              </div>
              <div
                className={`Dash-noxtm-sidebar-item ${activeSection === 'noxtm-mail-trash' ? 'active' : ''}`}
                onClick={() => onSectionChange('noxtm-mail-trash')}
              >
                <FiFileText className="sidebar-icon" />
                <span>Trash Mails</span>
              </div>
              <div
                className={`Dash-noxtm-sidebar-item ${activeSection === 'noxtm-mail-templates' ? 'active' : ''}`}
                onClick={() => onSectionChange('noxtm-mail-templates')}
              >
                <FiFileText className="sidebar-icon" />
                <span>Set-up Template</span>
              </div>
              <div
                className={`Dash-noxtm-sidebar-item ${activeSection === 'noxtm-mail-campaign' ? 'active' : ''}`}
                onClick={() => onSectionChange('noxtm-mail-campaign')}
              >
                <FiTarget className="sidebar-icon" />
                <span>Set-up Campaign</span>
              </div>
              <div
                className={`Dash-noxtm-sidebar-item ${activeSection === 'noxtm-mail-dashboard' ? 'active' : ''}`}
                onClick={() => onSectionChange('noxtm-mail-dashboard')}
              >
                <FiGrid className="sidebar-icon" />
                <span>Dashboard</span>
              </div>
              <div
                className={`Dash-noxtm-sidebar-item ${activeSection === 'noxtm-mail-accounts' ? 'active' : ''}`}
                onClick={() => onSectionChange('noxtm-mail-accounts')}
              >
                <FiUsers className="sidebar-icon" />
                <span>Email Accounts</span>
              </div>
              <div
                className={`Dash-noxtm-sidebar-item ${activeSection === 'noxtm-mail-domains' ? 'active' : ''}`}
                onClick={() => onSectionChange('noxtm-mail-domains')}
              >
                <FiGlobe className="sidebar-icon" />
                <span>Domains</span>
              </div>
              <div
                className={`Dash-noxtm-sidebar-item ${activeSection === 'noxtm-mail-logs' ? 'active' : ''}`}
                onClick={() => onSectionChange('noxtm-mail-logs')}
              >
                <FiActivity className="sidebar-icon" />
                <span>Email Logs</span>
              </div>
              <div
                className={`Dash-noxtm-sidebar-item ${activeSection === 'noxtm-mail-audit' ? 'active' : ''}`}
                onClick={() => onSectionChange('noxtm-mail-audit')}
              >
                <FiShield className="sidebar-icon" />
                <span>Audit Trail</span>
              </div>
              <div
                className={`Dash-noxtm-sidebar-item ${activeSection === 'aws-ses-domains' ? 'active' : ''}`}
                onClick={() => onSectionChange('aws-ses-domains')}
              >
                <FiGlobe className="sidebar-icon" />
                <span>AWS SES Domains</span>
              </div>
            </div>
          )}

          {/* HR Management Section */}
          {hasPermissionForSection('HR Management') && (
            <div className="sidebar-section">
              <h4 className="Dash-noxtm-sidebar-section-title">HR MANAGEMENT</h4>
              
              <div className="sidebar-item-container">
                <div 
                  className={`Dash-noxtm-sidebar-item ${activeSection === 'hr-management' ? 'active' : ''}`}
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
                        className={`Dash-noxtm-sidebar-item sidebar-subitem ${activeSection === 'hr-management-sub' ? 'active' : ''}`}
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
                            className={`Dash-noxtm-sidebar-item sidebar-sub-subitem ${activeSection === 'hr-overview' ? 'active' : ''}`}
                            onClick={() => onSectionChange('hr-overview')}
                          >
                            <span>HR Overview</span>
                          </div>
                          <div 
                            className={`Dash-noxtm-sidebar-item sidebar-sub-subitem ${activeSection === 'interview-management' ? 'active' : ''}`}
                            onClick={() => onSectionChange('interview-management')}
                          >
                            <span>Interview Management</span>
                          </div>
                          <div 
                            className={`Dash-noxtm-sidebar-item sidebar-sub-subitem ${activeSection === 'letter-templates' ? 'active' : ''}`}
                            onClick={() => onSectionChange('letter-templates')}
                          >
                            <span>Letter Templates</span>
                          </div>
                          <div 
                            className={`Dash-noxtm-sidebar-item sidebar-sub-subitem ${activeSection === 'hr-manage' ? 'active' : ''}`}
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
                        className={`Dash-noxtm-sidebar-item sidebar-subitem ${activeSection === 'employees' ? 'active' : ''}`}
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
                            className={`Dash-noxtm-sidebar-item sidebar-sub-subitem ${activeSection === 'employee-details' ? 'active' : ''}`}
                            onClick={() => onSectionChange('employee-details')}
                          >
                            <span>Employee Details</span>
                          </div>
                          <div 
                            className={`Dash-noxtm-sidebar-item sidebar-sub-subitem ${activeSection === 'attendance-summary' ? 'active' : ''}`}
                            onClick={() => onSectionChange('attendance-summary')}
                          >
                            <span>Attendance Summary</span>
                          </div>
                          <div 
                            className={`Dash-noxtm-sidebar-item sidebar-sub-subitem ${activeSection === 'holiday-calendar' ? 'active' : ''}`}
                            onClick={() => onSectionChange('holiday-calendar')}
                          >
                            <span>Holiday Calendar</span>
                          </div>
                          <div 
                            className={`Dash-noxtm-sidebar-item sidebar-sub-subitem ${activeSection === 'incentives' ? 'active' : ''}`}
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
              <h4 className="Dash-noxtm-sidebar-section-title">FINANCE MANAGEMENT</h4>
              
              {isSOLOHQUser ? (
                // SOLOHQ users see only specific items directly (no expandable menu)
                <>
                  <div 
                    className={`Dash-noxtm-sidebar-item ${activeSection === 'billing-payments' ? 'active' : ''}`}
                    onClick={() => onSectionChange('billing-payments')}
                  >
                    <FiDollarSign className="sidebar-icon" />
                    <span>Billing & Payments</span>
                  </div>
                  <div 
                    className={`Dash-noxtm-sidebar-item ${activeSection === 'invoice-generation' ? 'active' : ''}`}
                    onClick={() => onSectionChange('invoice-generation')}
                  >
                    <FiFileText className="sidebar-icon" />
                    <span>Invoice Generation</span>
                  </div>
                </>
              ) : (
                // Other users see the full expandable menu
                <div className="sidebar-item-container">
                  <div 
                    className={`Dash-noxtm-sidebar-item ${activeSection === 'finance-management' ? 'active' : ''}`}
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
                        className={`Dash-noxtm-sidebar-item sidebar-subitem ${activeSection === 'billing-payments' ? 'active' : ''}`}
                        onClick={() => onSectionChange('billing-payments')}
                      >
                        <span>Billing & Payments</span>
                      </div>
                      <div 
                        className={`Dash-noxtm-sidebar-item sidebar-subitem ${activeSection === 'invoice-generation' ? 'active' : ''}`}
                        onClick={() => onSectionChange('invoice-generation')}
                      >
                        <span>Invoice Generation</span>
                      </div>
                      <div 
                        className={`Dash-noxtm-sidebar-item sidebar-subitem ${activeSection === 'payment-records' ? 'active' : ''}`}
                        onClick={() => onSectionChange('payment-records')}
                      >
                        <span>Payment Records</span>
                      </div>
                      <div 
                        className={`Dash-noxtm-sidebar-item sidebar-subitem ${activeSection === 'expense-management' ? 'active' : ''}`}
                        onClick={() => onSectionChange('expense-management')}
                      >
                        <span>Expense Management</span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* SEO Management Section */}
          {hasPermissionForSection('SEO Management') && (
            <div className="sidebar-section">
              <h4 className="Dash-noxtm-sidebar-section-title">SEO MANAGEMENT</h4>
              
              <div className="sidebar-item-container">
                <div 
                  className={`Dash-noxtm-sidebar-item ${activeSection === 'seo-management' ? 'active' : ''}`}
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
                      className={`Dash-noxtm-sidebar-item sidebar-subitem ${activeSection === 'website-analytics' ? 'active' : ''}`}
                      onClick={() => onSectionChange('website-analytics')}
                    >
                      <span>Website Analytics</span>
                    </div>
                    <div 
                      className={`Dash-noxtm-sidebar-item sidebar-subitem ${activeSection === 'seo-insights' ? 'active' : ''}`}
                      onClick={() => onSectionChange('seo-insights')}
                    >
                      <span>SEO Insights</span>
                    </div>
                    <div 
                      className={`Dash-noxtm-sidebar-item sidebar-subitem ${activeSection === 'web-settings' ? 'active' : ''}`}
                      onClick={() => onSectionChange('web-settings')}
                    >
                      <span>Web Settings</span>
                    </div>
                    <div 
                      className={`Dash-noxtm-sidebar-item sidebar-subitem ${activeSection === 'blogs' ? 'active' : ''}`}
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
              <h4 className="Dash-noxtm-sidebar-section-title">INTERNAL POLICIES</h4>
              
              <div className="sidebar-item-container">
                <div 
                  className={`Dash-noxtm-sidebar-item ${activeSection === 'internal-policies' ? 'active' : ''}`}
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
                      className={`Dash-noxtm-sidebar-item sidebar-subitem ${activeSection === 'company-policies' ? 'active' : ''}`}
                      onClick={() => onSectionChange('company-policies')}
                    >
                      <span>Company Policies</span>
                    </div>
                    <div 
                      className={`Dash-noxtm-sidebar-item sidebar-subitem ${activeSection === 'company-handbook' ? 'active' : ''}`}
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
              <h4 className="Dash-noxtm-sidebar-section-title">SETTINGS & CONFIGURATION</h4>
              
              <div className="sidebar-item-container">
                <div 
                  className={`Dash-noxtm-sidebar-item ${activeSection === 'settings-configuration' ? 'active' : ''}`}
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
                      className={`Dash-noxtm-sidebar-item sidebar-subitem ${activeSection === 'manage-integrations' ? 'active' : ''}`}
                      onClick={() => onSectionChange('manage-integrations')}
                    >
                      <span>Manage Integrations</span>
                    </div>
                    <div 
                      className={`Dash-noxtm-sidebar-item sidebar-subitem ${activeSection === 'users-roles' ? 'active' : ''}`}
                      onClick={() => onSectionChange('users-roles')}
                    >
                      <span>Users & Roles</span>
                    </div>
                    <div 
                      className={`Dash-noxtm-sidebar-item sidebar-subitem ${activeSection === 'credentials' ? 'active' : ''}`}
                      onClick={() => onSectionChange('credentials')}
                    >
                      <span>Credentials</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* findr Section */}
          {hasPermissionForSection('findr') && isModuleInstalled('findr') && (
            <div className="sidebar-section">
              <h4 className="Dash-noxtm-sidebar-section-title">findr</h4>
              <div
                className={`Dash-noxtm-sidebar-item ${activeSection === 'findr-data' ? 'active' : ''}`}
                onClick={() => onSectionChange('findr-data')}
              >
                <FiDatabase className="sidebar-icon" />
                <span>Scraped Data</span>
              </div>
              <div
                className={`Dash-noxtm-sidebar-item ${activeSection === 'findr-settings' ? 'active' : ''}`}
                onClick={() => onSectionChange('findr-settings')}
              >
                <FiSliders className="sidebar-icon" />
                <span>findr Settings</span>
              </div>
            </div>
          )}

          {/* Profile Section */}
          {hasPermissionForSection('Profile') && (
            <div className="sidebar-section">
              <h4 className="Dash-noxtm-sidebar-section-title">PROFILE</h4>
              <div 
                className={`Dash-noxtm-sidebar-item ${activeSection === 'profile-settings' ? 'active' : ''}`}
                onClick={() => onSectionChange('profile-settings')}
              >
                <FiUser className="sidebar-icon" />
                <span>Profile Settings</span>
              </div>
            </div>
          )}

          {/* Workspace Settings Section - Hidden for SOLOHQ */}
          {hasPermissionForSection('Workspace Settings') && (
            <div className="sidebar-section">
              <h4 className="Dash-noxtm-sidebar-section-title">WORKSPACE</h4>
              <div 
                className={`Dash-noxtm-sidebar-item ${activeSection === 'workspace-settings' ? 'active' : ''}`}
                onClick={() => onSectionChange('workspace-settings')}
              >
                <FiSettings className="sidebar-icon" />
                <span>Workspace Settings</span>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default Sidebar;
