// Department permission defaults for employee invitations
export const DEPARTMENT_DEFAULTS = {
  'Management Team': {
    dashboard: true,
    dataCenter: true,
    projects: true,
    teamCommunication: true,
    digitalMediaManagement: true,
    marketing: true,
    hrManagement: true,
    financeManagement: true,
    seoManagement: true,
    internalPolicies: true,
    settingsConfiguration: true
  },
  'Digital Team': {
    dashboard: true,
    dataCenter: false,
    projects: true,
    teamCommunication: true,
    digitalMediaManagement: true,
    marketing: false,
    hrManagement: false,
    financeManagement: false,
    seoManagement: true,
    internalPolicies: false,
    settingsConfiguration: false
  },
  'SEO Team': {
    dashboard: true,
    dataCenter: false,
    projects: false,
    teamCommunication: true,
    digitalMediaManagement: true,
    marketing: true,
    hrManagement: false,
    financeManagement: false,
    seoManagement: true,
    internalPolicies: false,
    settingsConfiguration: false
  },
  'Graphic Design Team': {
    dashboard: true,
    dataCenter: false,
    projects: true,
    teamCommunication: true,
    digitalMediaManagement: true,
    marketing: false,
    hrManagement: false,
    financeManagement: false,
    seoManagement: false,
    internalPolicies: false,
    settingsConfiguration: false
  },
  'Marketing Team': {
    dashboard: true,
    dataCenter: false,
    projects: false,
    teamCommunication: true,
    digitalMediaManagement: true,
    marketing: true,
    hrManagement: false,
    financeManagement: false,
    seoManagement: true,
    internalPolicies: false,
    settingsConfiguration: false
  },
  'Sales Team': {
    dashboard: true,
    dataCenter: false,
    projects: false,
    teamCommunication: true,
    digitalMediaManagement: false,
    marketing: true,
    hrManagement: false,
    financeManagement: true,
    seoManagement: false,
    internalPolicies: false,
    settingsConfiguration: false
  },
  'Development Team': {
    dashboard: true,
    dataCenter: true,
    projects: true,
    teamCommunication: true,
    digitalMediaManagement: false,
    marketing: false,
    hrManagement: false,
    financeManagement: false,
    seoManagement: false,
    internalPolicies: false,
    settingsConfiguration: false
  },
  'HR Team': {
    dashboard: true,
    dataCenter: false,
    projects: false,
    teamCommunication: true,
    digitalMediaManagement: false,
    marketing: false,
    hrManagement: true,
    financeManagement: false,
    seoManagement: false,
    internalPolicies: true,
    settingsConfiguration: false
  },
  'Finance Team': {
    dashboard: true,
    dataCenter: false,
    projects: false,
    teamCommunication: true,
    digitalMediaManagement: false,
    marketing: false,
    hrManagement: false,
    financeManagement: true,
    seoManagement: false,
    internalPolicies: false,
    settingsConfiguration: false
  },
  'Support Team': {
    dashboard: true,
    dataCenter: false,
    projects: true,
    teamCommunication: true,
    digitalMediaManagement: false,
    marketing: false,
    hrManagement: false,
    financeManagement: false,
    seoManagement: false,
    internalPolicies: false,
    settingsConfiguration: false
  },
  'Operations Team': {
    dashboard: true,
    dataCenter: true,
    projects: true,
    teamCommunication: true,
    digitalMediaManagement: false,
    marketing: false,
    hrManagement: false,
    financeManagement: false,
    seoManagement: false,
    internalPolicies: true,
    settingsConfiguration: false
  }
};

export const DEPARTMENTS = [
  'Management Team',
  'Digital Team',
  'SEO Team',
  'Graphic Design Team',
  'Marketing Team',
  'Sales Team',
  'Development Team',
  'HR Team',
  'Finance Team',
  'Support Team',
  'Operations Team'
];

export const PERMISSION_LABELS = {
  dashboard: 'Dashboard',
  dataCenter: 'Data Center',
  projects: 'Projects',
  teamCommunication: 'Team Communication',
  digitalMediaManagement: 'Digital Media Management',
  marketing: 'Marketing',
  hrManagement: 'HR Management',
  financeManagement: 'Finance Management',
  seoManagement: 'SEO Management',
  internalPolicies: 'Internal Policies',
  settingsConfiguration: 'Settings & Configuration'
};
