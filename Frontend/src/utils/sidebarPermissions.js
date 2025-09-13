import { MODULES } from '../contexts/RoleContext';

// Map sidebar sections to permission modules
export const SIDEBAR_PERMISSIONS = {
  // Dashboard
  'overview': MODULES.DASHBOARD,
  
  // Data Center
  'leads-flow': MODULES.DATA_CENTER,
  'client-leads': MODULES.DATA_CENTER,
  'campaign-metrics': MODULES.DATA_CENTER,
  'conversion-tracking': MODULES.DATA_CENTER,
  
  // Projects
  'our-projects': MODULES.PROJECTS,
  'project-delivered': MODULES.PROJECTS,
  
  // Team Communication
  'message': MODULES.TEAM_COMMUNICATION,
  'team-email': MODULES.TEAM_COMMUNICATION,
  'meeting': MODULES.TEAM_COMMUNICATION,
  
  // Digital Media Management
  'meta-ads': MODULES.DIGITAL_MEDIA,
  'instagram': MODULES.DIGITAL_MEDIA,
  'linkedin': MODULES.DIGITAL_MEDIA,
  'youtube': MODULES.DIGITAL_MEDIA,
  'x-com': MODULES.DIGITAL_MEDIA,
  'reddit': MODULES.DIGITAL_MEDIA,
  
  // Marketing
  'email-marketing': MODULES.MARKETING,
  'campaign-setup': MODULES.MARKETING,
  'email-template': MODULES.MARKETING,
  'email-analytics': MODULES.MARKETING,
  'whatsapp-marketing': MODULES.MARKETING,
  'referral-client': MODULES.MARKETING,
  'case-studies': MODULES.MARKETING,
  'services': MODULES.MARKETING,
  
  // HR Management
  'hr-overview': MODULES.HR_MANAGEMENT,
  'interview-management': MODULES.HR_MANAGEMENT,
  'letter-templates': MODULES.HR_MANAGEMENT,
  'hr-manage': MODULES.HR_MANAGEMENT,
  'employee-details': MODULES.HR_MANAGEMENT,
  'attendance-summary': MODULES.HR_MANAGEMENT,
  'holiday-calendar': MODULES.HR_MANAGEMENT,
  'incentives': MODULES.HR_MANAGEMENT,
  
  // Finance Management
  'billing-payments': MODULES.FINANCE_MANAGEMENT,
  'invoice-generation': MODULES.FINANCE_MANAGEMENT,
  'payment-records': MODULES.FINANCE_MANAGEMENT,
  'expense-management': MODULES.FINANCE_MANAGEMENT,
  
  // SEO Management
  'website-analytics': MODULES.SEO_MANAGEMENT,
  'seo-insights': MODULES.SEO_MANAGEMENT,
  'web-settings': MODULES.SEO_MANAGEMENT,
  'blogs': MODULES.SEO_MANAGEMENT,
  
  // Internal Policies
  'company-policies': MODULES.INTERNAL_POLICIES,
  'company-handbook': MODULES.INTERNAL_POLICIES,
  
  // Settings & Configuration
  'manage-integrations': MODULES.SETTINGS_CONFIG,
  'users-roles': MODULES.SETTINGS_CONFIG,
  'credentials': MODULES.SETTINGS_CONFIG,
  'profile-settings': MODULES.DASHBOARD // Profile settings accessible to all dashboard users
};

// Get the required permission for a sidebar section
export const getRequiredPermission = (section) => {
  return SIDEBAR_PERMISSIONS[section] || null;
};

// Check if user has permission for a sidebar section
export const hasPermissionForSection = (section, userPermissions) => {
  const requiredPermission = getRequiredPermission(section);
  if (!requiredPermission) return false;
  
  return userPermissions[requiredPermission] || false;
};

// Filter sidebar items based on user permissions
export const filterSidebarItems = (items, userPermissions) => {
  return items.filter(item => hasPermissionForSection(item.section, userPermissions));
};

// Check if entire sidebar section should be visible
export const isSidebarSectionVisible = (sectionItems, userPermissions) => {
  return sectionItems.some(item => hasPermissionForSection(item.section, userPermissions));
};

// Map of sidebar section titles to their required modules
export const SIDEBAR_SECTION_MODULES = {
  'DATA CENTER': MODULES.DATA_CENTER,
  'PROJECTS': MODULES.PROJECTS,
  'DIGITAL MEDIA MANAGEMENT': MODULES.DIGITAL_MEDIA,
  'TEAM COMMUNICATION': MODULES.TEAM_COMMUNICATION,
  'MARKETING': MODULES.MARKETING,
  'HR MANAGEMENT': MODULES.HR_MANAGEMENT,
  'FINANCE MANAGEMENT': MODULES.FINANCE_MANAGEMENT,
  'SEO MANAGEMENT': MODULES.SEO_MANAGEMENT,
  'INTERNAL POLICIES': MODULES.INTERNAL_POLICIES,
  'SETTINGS & CONFIGURATION': MODULES.SETTINGS_CONFIG
};

// Check if a sidebar section should be visible
export const isSectionTitleVisible = (sectionTitle, userPermissions) => {
  const requiredModule = SIDEBAR_SECTION_MODULES[sectionTitle];
  if (!requiredModule) return true; // Show sections without specific requirements (like Dashboard)
  
  return userPermissions[requiredModule] || false;
};

const sidebarPermissionsExport = {
  SIDEBAR_PERMISSIONS,
  getRequiredPermission,
  hasPermissionForSection,
  filterSidebarItems,
  isSidebarSectionVisible,
  SIDEBAR_SECTION_MODULES,
  isSectionTitleVisible
};

export default sidebarPermissionsExport;
