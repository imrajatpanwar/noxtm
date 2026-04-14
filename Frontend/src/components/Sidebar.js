import React, { useState, useMemo, useEffect, useContext } from 'react';
import {
  FiGrid, FiTrendingUp, FiUsers, FiTarget, FiFolder, FiPackage,
  FiFileText, FiSettings, FiMail, FiChevronDown, FiChevronRight,
  FiMessageCircle, FiUserCheck, FiDollarSign, FiShield, FiLinkedin, FiGlobe, FiKey, FiUploadCloud
} from 'react-icons/fi';
import splitViewIcon from '../assets/split_view.svg';
import { useRole } from '../contexts/RoleContext';
import { MessagingContext } from '../contexts/MessagingContext';
import { useModules } from '../contexts/ModuleContext';
import {
  Sidebar as UISidebar,
  SidebarHeader,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarTrigger,
  useSidebar,
} from './ui/sidebar';
import './Sidebar.css';
import api from '../config/api';

function Sidebar({ activeSection, onSectionChange }) {
  const { hasPermission, MODULES, permissionUpdateTrigger } = useRole();
  const { socket } = useContext(MessagingContext);
  // Module installation context retained for future per-module gating
  useModules();
  const { state: sidebarState } = useSidebar();
  const isCollapsed = sidebarState === 'collapsed';

  const [hrManagementExpanded, setHrManagementExpanded] = useState(false);
  const [financeManagementExpanded, setFinanceManagementExpanded] = useState(false);
  const [internalPoliciesExpanded, setInternalPoliciesExpanded] = useState(false);
  const [settingsConfigExpanded, setSettingsConfigExpanded] = useState(false);
  const [leadManagementExpanded, setLeadManagementExpanded] = useState(false);
  const [socialMediaExpanded, setSocialMediaExpanded] = useState(false);
  const [businessName, setBusinessName] = useState('');
  const [messageUnreadCount, setMessageUnreadCount] = useState(0);

  // Get current user from RoleContext (always up-to-date)
  const { currentUser: contextCurrentUser } = useRole();

  // Use context's currentUser as the source of truth
  const currentUser = contextCurrentUser;

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

  // Fetch business name from company details
  useEffect(() => {
    const fetchBusinessName = async () => {
      try {
        const response = await api.get('/company/details');
        if (response.data?.success && response.data?.company?.companyName) {
          setBusinessName(response.data.company.companyName);
        }
      } catch (error) {
        // ignore — user may not have a company yet
      }
    };
    if (currentUser) {
      fetchTotalUnreadCount();
      fetchBusinessName();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser]);

  // Listen for socket events to update unread count in real-time
  useEffect(() => {
    if (!socket) return;

    const handleUnreadCountUpdate = (data) => {
      console.log('📊 Sidebar received unread-count-update:', data);
      fetchTotalUnreadCount();
    };

    const handleNewMessage = (data) => {
      console.log('📩 Sidebar received new-message:', data);
      const currentUserId = currentUser?._id || currentUser?.id;
      const isOwnMessage = data.message?.sender?._id === currentUserId;

      if (!isOwnMessage) {
        setMessageUnreadCount(prev => prev + 1);
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
      const timer = setTimeout(() => {
        fetchTotalUnreadCount();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [activeSection]);

  // Listen for instant updates when conversations are marked as read
  useEffect(() => {
    const handleMarkedAsRead = () => {
      fetchTotalUnreadCount();
    };

    window.addEventListener('conversation:markedAsRead', handleMarkedAsRead);

    return () => {
      window.removeEventListener('conversation:markedAsRead', handleMarkedAsRead);
    };
  }, []);

  // Check if current user has SOLOHQ role
  const isSOLOHQUser = currentUser?.role === 'SOLOHQ';

  // Check if current user is a company Owner
  const isCompanyOwner = currentUser?.roleInCompany === 'Owner';

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
        'Internal Policies': true,
        'Settings & Configuration': true,
        'Workspace Settings': true,
        'Profile': true
      };
    }

    // For Company Owners, grant access to all sections except Settings & Configuration (Admin-only)
    if (isCompanyOwner) {
      return {
        'Dashboard': true,
        'Data Center': true,
        'Projects': true,
        'Team Communication': true,
        'Digital Media Management': true,
        'Marketing': true,
        'HR Management': true,
        'Finance Management': true,
        'Internal Policies': true,
        'Settings & Configuration': false,
        'Workspace Settings': true,
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
        'Internal Policies': true,
        'Settings & Configuration': false,
        'Workspace Settings': true,
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
        'Internal Policies': false,
        'Settings & Configuration': false,
        'Workspace Settings': false,
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
        'Internal Policies': hasPermission(MODULES.INTERNAL_POLICIES),
        'Settings & Configuration': false,
        'Workspace Settings': false,
        'Profile': true
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
      'Internal Policies': hasPermission(MODULES.INTERNAL_POLICIES),
      'Settings & Configuration': false,
      'Workspace Settings': true,
      'Profile': true
    };
  }, [hasPermission, MODULES, isSOLOHQUser, isCompanyOwner, currentUser?.role]);

  // Permission checking function using memoized values
  const hasPermissionForSection = (section) => {
    return sectionPermissions[section] !== undefined ? sectionPermissions[section] : true;
  };

  // Force re-render when permissions change to prevent glitches
  useEffect(() => {
    // This effect will trigger when permissionUpdateTrigger changes
  }, [permissionUpdateTrigger]);

  const toggleHrManagement = () => setHrManagementExpanded(!hrManagementExpanded);
  const toggleFinanceManagement = () => setFinanceManagementExpanded(!financeManagementExpanded);
  const toggleInternalPolicies = () => setInternalPoliciesExpanded(!internalPoliciesExpanded);
  const toggleSettingsConfig = () => setSettingsConfigExpanded(!settingsConfigExpanded);
  const toggleLeadManagement = () => setLeadManagementExpanded(!leadManagementExpanded);
  const toggleSocialMedia = () => setSocialMediaExpanded(!socialMediaExpanded);





  return (
    <UISidebar collapsible="icon">
      <SidebarHeader>
        <div className="sidebar-header-row">
          {!isCollapsed ? (
            <div className="sidebar-business-name">
              <span className="sidebar-business-name-text">
                {businessName || currentUser?.companyName || 'Workspace'}
              </span>
            </div>
          ) : (
            <div className="sidebar-business-name-collapsed" />
          )}
          <SidebarTrigger>
            <img
              src={splitViewIcon}
              alt="Toggle sidebar"
              className="sidebar-split-view-icon"
            />
          </SidebarTrigger>
        </div>
      </SidebarHeader>

      <SidebarContent>
        {/* Regular menu */}
        {(
          <>
            {/* Dashboard Section */}
            {hasPermissionForSection('Dashboard') && (
              <SidebarGroup>
                <SidebarGroupLabel>DASHBOARD</SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu>
                    <SidebarMenuItem>
                      <SidebarMenuButton
                        isActive={activeSection === 'overview'}
                        tooltip="Overview"
                        onClick={() => onSectionChange('overview')}
                      >
                        <FiGrid className="sidebar-icon" />
                        <span>Overview</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                      <SidebarMenuButton
                        isActive={activeSection === 'task-manager'}
                        tooltip="Task Manager"
                        onClick={() => onSectionChange('task-manager')}
                      >
                        <FiTarget className="sidebar-icon" />
                        <span>Task Manager</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                      <SidebarMenuButton
                        isActive={activeSection === 'notes'}
                        tooltip="Notes"
                        onClick={() => onSectionChange('notes')}
                      >
                        <FiFileText className="sidebar-icon" />
                        <span>Notes</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            )}

            {/* Data Center Section */}
            {hasPermissionForSection('Data Center') && (
              <SidebarGroup>
                <SidebarGroupLabel>DATA CENTER</SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu>
                    <SidebarMenuItem>
                      <SidebarMenuButton
                        isActive={activeSection === 'company-data'}
                        tooltip="Company Data"
                        onClick={() => onSectionChange('company-data')}
                      >
                        <FiPackage className="sidebar-icon" />
                        <span>Company Data</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>

                    {/* Lead Management (expandable) */}
                    <SidebarMenuItem>
                      <SidebarMenuButton
                        isActive={activeSection === 'lead-management'}
                        tooltip="Lead Management"
                        onClick={toggleLeadManagement}
                      >
                        <FiTarget className="sidebar-icon" />
                        <span>Lead Management</span>
                        {leadManagementExpanded ?
                          <FiChevronDown className="sidebar-chevron" /> :
                          <FiChevronRight className="sidebar-chevron" />
                        }
                      </SidebarMenuButton>

                      {leadManagementExpanded && !isCollapsed && (
                        <div className="sidebar-submenu">
                          <SidebarMenuButton
                            isActive={activeSection === 'leads-flow'}
                            className="sidebar-subitem"
                            onClick={() => onSectionChange('leads-flow')}
                          >
                            <FiTrendingUp className="sidebar-icon" />
                            <span>Leads Flow</span>
                          </SidebarMenuButton>
                          <SidebarMenuButton
                            isActive={activeSection === 'leads-metrics'}
                            className="sidebar-subitem"
                            onClick={() => onSectionChange('leads-metrics')}
                          >
                            <FiFolder className="sidebar-icon" />
                            <span>Leads Metrics</span>
                          </SidebarMenuButton>
                        </div>
                      )}
                    </SidebarMenuItem>

                    {/* Contacts */}
                    <SidebarMenuItem>
                      <SidebarMenuButton
                        isActive={activeSection === 'client-leads'}
                        tooltip="Contacts"
                        onClick={() => onSectionChange('client-leads')}
                      >
                        <FiUserCheck className="sidebar-icon" />
                        <span>Contacts</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>

                    {/* Client Management */}
                    <SidebarMenuItem>
                      <SidebarMenuButton
                        isActive={activeSection === 'client-management'}
                        tooltip="Client Management"
                        onClick={() => onSectionChange('client-management')}
                      >
                        <FiUsers className="sidebar-icon" />
                        <span>Client Management</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            )}

            {/* Projects Section */}
            {hasPermissionForSection('Projects') && (
              <SidebarGroup>
                <SidebarGroupLabel>PROJECTS</SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu>
                    <SidebarMenuItem>
                      <SidebarMenuButton
                        isActive={activeSection === 'our-projects'}
                        tooltip="Client / Projects"
                        onClick={() => onSectionChange('our-projects')}
                      >
                        <FiFolder className="sidebar-icon" />
                        <span>Client / Projects</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                      <SidebarMenuButton
                        isActive={activeSection === 'products'}
                        tooltip="Products"
                        onClick={() => onSectionChange('products')}
                      >
                        <FiPackage className="sidebar-icon" />
                        <span>Products</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            )}

            {/* Team Communication Section */}
            {hasPermissionForSection('Team Communication') && (
              <SidebarGroup>
                <SidebarGroupLabel>TEAM COMMUNICATION</SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {!isSOLOHQUser && (
                      <SidebarMenuItem>
                        <SidebarMenuButton
                          isActive={activeSection === 'message'}
                          tooltip="Message"
                          onClick={() => onSectionChange('message')}
                        >
                          <FiMessageCircle className="sidebar-icon" />
                          <span>Message</span>
                          {messageUnreadCount > 0 && (
                            <span className="sidebar-message-badge">
                              {messageUnreadCount > 99 ? '99+' : messageUnreadCount}
                            </span>
                          )}
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    )}

                    {/* Open Mail App */}
                    <SidebarMenuItem>
                      <SidebarMenuButton
                        tooltip="Open Mail App"
                        onClick={() => {
                          const token = localStorage.getItem('token');
                          if (!token) {
                            alert('Authentication token not found. Please refresh the page and try again.');
                            return;
                          }
                          const mailBaseUrl = process.env.REACT_APP_MAIL_URL || 'https://mail.noxtm.com';
                          const mailUrl = `${mailBaseUrl}?auth_token=${encodeURIComponent(token)}`;
                          console.log('[MAIL] Opening mail app in same tab');
                          console.log('[MAIL] Token being passed:', token.substring(0, 20) + '...');
                          window.location.href = mailUrl;
                        }}
                      >
                        <FiMail className="sidebar-icon" />
                        <span>Open Mail App</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            )}

            {/* Digital Media Management Section */}
            {hasPermissionForSection('Digital Media Management') && (
              <SidebarGroup>
                <SidebarGroupLabel>DIGITAL MEDIA MANAGEMENT</SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu>
                    <SidebarMenuItem>
                      <SidebarMenuButton
                        isActive={activeSection === 'social-media'}
                        tooltip="Social Media"
                        onClick={toggleSocialMedia}
                      >
                        <FiGlobe className="sidebar-icon" />
                        <span>Social Media</span>
                        {socialMediaExpanded ?
                          <FiChevronDown className="sidebar-chevron" /> :
                          <FiChevronRight className="sidebar-chevron" />
                        }
                      </SidebarMenuButton>

                      {socialMediaExpanded && !isCollapsed && (
                        <div className="sidebar-submenu">
                          <SidebarMenuButton
                            isActive={activeSection === 'content-calendar'}
                            className="sidebar-subitem"
                            onClick={() => onSectionChange('content-calendar')}
                          >
                            <FiGrid className="sidebar-icon" />
                            <span>Content Calendar</span>
                          </SidebarMenuButton>
                          <SidebarMenuButton
                            isActive={activeSection === 'linkedin'}
                            className="sidebar-subitem"
                            onClick={() => onSectionChange('linkedin')}
                          >
                            <FiLinkedin className="sidebar-icon" />
                            <span>LinkedIn</span>
                          </SidebarMenuButton>
                          <SidebarMenuButton
                            isActive={activeSection === 'sm-credentials'}
                            className="sidebar-subitem"
                            onClick={() => onSectionChange('sm-credentials')}
                          >
                            <FiKey className="sidebar-icon" />
                            <span>Credentials</span>
                          </SidebarMenuButton>
                        </div>
                      )}
                    </SidebarMenuItem>

                    {/* Upload Files — Google Drive */}
                    <SidebarMenuItem>
                      <SidebarMenuButton
                        isActive={activeSection === 'drive-assets'}
                        tooltip="Upload Files"
                        onClick={() => onSectionChange('drive-assets')}
                      >
                        <FiUploadCloud className="sidebar-icon" />
                        <span>Upload Files</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            )}

            {/* Marketing Section */}
            {hasPermissionForSection('Marketing') && (
              <SidebarGroup>
                <SidebarGroupLabel>MARKETING</SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu>
                    <SidebarMenuItem>
                      <SidebarMenuButton
                        isActive={activeSection === 'whatsapp-marketing'}
                        tooltip="Whatsapp"
                        onClick={() => onSectionChange('whatsapp-marketing')}
                      >
                        <FiMessageCircle className="sidebar-icon" />
                        <span>Whatsapp</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            )}

            {/* HR Management Section */}
            {hasPermissionForSection('HR Management') && (
              <SidebarGroup>
                <SidebarGroupLabel>HR MANAGEMENT</SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu>
                    <SidebarMenuItem>
                      <SidebarMenuButton
                        isActive={activeSection === 'hr-management'}
                        tooltip="HR Management"
                        onClick={toggleHrManagement}
                      >
                        <FiUserCheck className="sidebar-icon" />
                        <span>HR Management</span>
                        {hrManagementExpanded ?
                          <FiChevronDown className="sidebar-chevron" /> :
                          <FiChevronRight className="sidebar-chevron" />
                        }
                      </SidebarMenuButton>

                      {hrManagementExpanded && !isCollapsed && (
                        <div className="sidebar-submenu">
                          <SidebarMenuButton
                            isActive={activeSection === 'hr-overview'}
                            className="sidebar-subitem"
                            onClick={() => onSectionChange('hr-overview')}
                          >
                            <span>HR Overview</span>
                          </SidebarMenuButton>
                          <SidebarMenuButton
                            isActive={activeSection === 'interview-management'}
                            className="sidebar-subitem"
                            onClick={() => onSectionChange('interview-management')}
                          >
                            <span>Interview Management</span>
                          </SidebarMenuButton>
                          <SidebarMenuButton
                            isActive={activeSection === 'letter-templates'}
                            className="sidebar-subitem"
                            onClick={() => onSectionChange('letter-templates')}
                          >
                            <span>Letter Templates</span>
                          </SidebarMenuButton>
                          <SidebarMenuButton
                            isActive={activeSection === 'employee-details'}
                            className="sidebar-subitem"
                            onClick={() => onSectionChange('employee-details')}
                          >
                            <span>Employee Details</span>
                          </SidebarMenuButton>
                          <SidebarMenuButton
                            isActive={activeSection === 'holiday-calendar'}
                            className="sidebar-subitem"
                            onClick={() => onSectionChange('holiday-calendar')}
                          >
                            <span>Holiday Calendar</span>
                          </SidebarMenuButton>
                          <SidebarMenuButton
                            isActive={activeSection === 'incentives'}
                            className="sidebar-subitem"
                            onClick={() => onSectionChange('incentives')}
                          >
                            <span>Incentives</span>
                          </SidebarMenuButton>
                        </div>
                      )}
                    </SidebarMenuItem>
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            )}

            {/* Finance Management Section */}
            {hasPermissionForSection('Finance Management') && (
              <SidebarGroup>
                <SidebarGroupLabel>FINANCE MANAGEMENT</SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {isSOLOHQUser ? (
                      <>
                        <SidebarMenuItem>
                          <SidebarMenuButton
                            isActive={activeSection === 'invoice-management'}
                            tooltip="Invoice Management"
                            onClick={() => onSectionChange('invoice-management')}
                          >
                            <FiFileText className="sidebar-icon" />
                            <span>Invoice Management</span>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                        <SidebarMenuItem>
                          <SidebarMenuButton
                            isActive={activeSection === 'billing-payments'}
                            tooltip="Billing & Payments"
                            onClick={() => onSectionChange('billing-payments')}
                          >
                            <FiDollarSign className="sidebar-icon" />
                            <span>Billing & Payments</span>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      </>
                    ) : (
                      <SidebarMenuItem>
                        <SidebarMenuButton
                          isActive={activeSection === 'finance-management'}
                          tooltip="Finance Management"
                          onClick={toggleFinanceManagement}
                        >
                          <FiDollarSign className="sidebar-icon" />
                          <span>Finance Management</span>
                          {financeManagementExpanded ?
                            <FiChevronDown className="sidebar-chevron" /> :
                            <FiChevronRight className="sidebar-chevron" />
                          }
                        </SidebarMenuButton>

                        {financeManagementExpanded && !isCollapsed && (
                          <div className="sidebar-submenu">
                            <SidebarMenuButton
                              isActive={activeSection === 'invoice-management'}
                              className="sidebar-subitem"
                              onClick={() => onSectionChange('invoice-management')}
                            >
                              <span>Invoice Management</span>
                            </SidebarMenuButton>
                            <SidebarMenuButton
                              isActive={activeSection === 'billing-payments'}
                              className="sidebar-subitem"
                              onClick={() => onSectionChange('billing-payments')}
                            >
                              <span>Billing & Payments</span>
                            </SidebarMenuButton>
                            <SidebarMenuButton
                              isActive={activeSection === 'payment-records'}
                              className="sidebar-subitem"
                              onClick={() => onSectionChange('payment-records')}
                            >
                              <span>Payment Records</span>
                            </SidebarMenuButton>
                            <SidebarMenuButton
                              isActive={activeSection === 'expense-management'}
                              className="sidebar-subitem"
                              onClick={() => onSectionChange('expense-management')}
                            >
                              <span>Expense Management</span>
                            </SidebarMenuButton>
                          </div>
                        )}
                      </SidebarMenuItem>
                    )}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            )}

            {/* Internal Policies Section */}
            {hasPermissionForSection('Internal Policies') && (
              <SidebarGroup>
                <SidebarGroupLabel>INTERNAL POLICIES</SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu>
                    <SidebarMenuItem>
                      <SidebarMenuButton
                        isActive={activeSection === 'internal-policies'}
                        tooltip="Internal Policies"
                        onClick={toggleInternalPolicies}
                      >
                        <FiShield className="sidebar-icon" />
                        <span>Internal Policies</span>
                        {internalPoliciesExpanded ?
                          <FiChevronDown className="sidebar-chevron" /> :
                          <FiChevronRight className="sidebar-chevron" />
                        }
                      </SidebarMenuButton>

                      {internalPoliciesExpanded && !isCollapsed && (
                        <div className="sidebar-submenu">
                          <SidebarMenuButton
                            isActive={activeSection === 'company-policies'}
                            className="sidebar-subitem"
                            onClick={() => onSectionChange('company-policies')}
                          >
                            <span>Company Policies</span>
                          </SidebarMenuButton>
                          <SidebarMenuButton
                            isActive={activeSection === 'company-handbook'}
                            className="sidebar-subitem"
                            onClick={() => onSectionChange('company-handbook')}
                          >
                            <span>Company Handbook</span>
                          </SidebarMenuButton>
                        </div>
                      )}
                    </SidebarMenuItem>
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            )}

            {/* Settings & Configuration Section */}
            {hasPermissionForSection('Settings & Configuration') && (
              <SidebarGroup>
                <SidebarGroupLabel>SETTINGS & CONFIGURATION</SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu>
                    <SidebarMenuItem>
                      <SidebarMenuButton
                        isActive={activeSection === 'settings-configuration'}
                        tooltip="Settings & Configuration"
                        onClick={toggleSettingsConfig}
                      >
                        <FiSettings className="sidebar-icon" />
                        <span>Settings & Configuration</span>
                        {settingsConfigExpanded ?
                          <FiChevronDown className="sidebar-chevron" /> :
                          <FiChevronRight className="sidebar-chevron" />
                        }
                      </SidebarMenuButton>

                      {settingsConfigExpanded && !isCollapsed && (
                        <div className="sidebar-submenu">
                          {currentUser?.role === 'Admin' && (
                            <SidebarMenuButton
                              isActive={activeSection === 'noxtm-bot-admin'}
                              className="sidebar-subitem"
                              onClick={() => onSectionChange('noxtm-bot-admin')}
                            >
                              <span>Noxtm Bot Management</span>
                            </SidebarMenuButton>
                          )}
                          <SidebarMenuButton
                            isActive={activeSection === 'manage-integrations'}
                            className="sidebar-subitem"
                            onClick={() => onSectionChange('manage-integrations')}
                          >
                            <span>Manage Integrations</span>
                          </SidebarMenuButton>
                          <SidebarMenuButton
                            isActive={activeSection === 'users-roles'}
                            className="sidebar-subitem"
                            onClick={() => onSectionChange('users-roles')}
                          >
                            <span>Users & Roles</span>
                          </SidebarMenuButton>
                          <SidebarMenuButton
                            isActive={activeSection === 'credentials'}
                            className="sidebar-subitem"
                            onClick={() => onSectionChange('credentials')}
                          >
                            <span>Credentials</span>
                          </SidebarMenuButton>
                          <SidebarMenuButton
                            isActive={activeSection === 'visitor-analytics'}
                            className="sidebar-subitem"
                            onClick={() => onSectionChange('visitor-analytics')}
                          >
                            <span>Visitor Analytics</span>
                          </SidebarMenuButton>
                        </div>
                      )}
                    </SidebarMenuItem>
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            )}

            {/* Workspace Settings Section */}
            {hasPermissionForSection('Workspace Settings') && (
              <SidebarGroup>
                <SidebarGroupLabel>WORKSPACE</SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu>
                    <SidebarMenuItem>
                      <SidebarMenuButton
                        isActive={activeSection === 'workspace-settings'}
                        tooltip="Workspace Settings"
                        onClick={() => onSectionChange('workspace-settings')}
                      >
                        <FiSettings className="sidebar-icon" />
                        <span>Workspace Settings</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            )}
          </>
        )}
      </SidebarContent>
    </UISidebar>
  );
}

export default Sidebar;
