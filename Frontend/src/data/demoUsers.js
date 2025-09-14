// Demo users for testing the role management system
// In a real application, this data would come from your backend API

export const demoUsers = [
  {
    id: '1',
    name: 'John Smith',
    email: 'john.admin@noxtmstudio.com',
    role: 'Admin',
    status: 'Active',
    access: ['Data Cluster', 'Projects', 'Finance', 'Digital Media', 'Marketing'],  },
  {
    id: '2',
    name: 'Sarah Johnson',
    email: 'sarah.pm@noxtmstudio.com',
    role: 'Project Manager',
    status: 'Active',
    access: ['Projects', 'Marketing'],
  },
  {
    id: '3',
    name: 'Mike Chen',
    email: 'mike.data@noxtmstudio.com',
    role: 'Data Analyst',
    status: 'Active',
    access: ['Data Cluster'],
  {
    id: '4',
    name: 'Emily Rodriguez',
    email: 'emily.social@noxtmstudio.com',
    role: 'Social Media Manager',
    status: 'Active',
    access: ['Digital Media', 'Marketing'],
  },
  {
    id: '5',
    name: 'David Wilson',
    email: 'david.hr@noxtmstudio.com',
    role: 'Human Resource',
    status: 'Active',
    access: ['Human Resources'],
  {
    id: '6',
    name: 'Lisa Parker',
    email: 'lisa.design@noxtmstudio.com',
    role: 'Graphic Designer',
    status: 'Active',
    access: ['Projects', 'Digital Media'],
  },
  {
    id: '7',
    name: 'Alex Thompson',
    email: 'alex.dev@noxtmstudio.com',
    role: 'Web Developer',
    status: 'Active',
    access: ['Projects'],
  {
    id: '8',
    name: 'Rachel Kim',
    email: 'rachel.seo@noxtmstudio.com',
    role: 'SEO Manager',
    status: 'Active',
    access: ['Digital Media', 'Marketing'],
  {
    id: '9',
    name: 'Tom Anderson',
    email: 'tom.miner@noxtmstudio.com',
    role: 'Data Miner',
    status: 'Inactive',
    access: ['Data Cluster'],
];

// Function to initialize demo data in localStorage
export const initializeDemoData = () => {
  // Check if demo data already exists
  const existingData = localStorage.getItem('usersData');
  
  if (!existingData) {
    // Initialize with demo data
    localStorage.setItem('usersData', JSON.stringify(demoUsers));
    console.log('Demo users data initialized');
  }
  
  // Set a demo current user (admin for testing)
  const currentUser = localStorage.getItem('user');
  if (!currentUser) {
    localStorage.setItem('user', JSON.stringify({
      id: '1',
      username: 'John Smith',
      email: 'john.admin@noxtmstudio.com',
      role: 'Admin'
    }));
    console.log('Demo current user set');
  }
};

const demoUsersExport = {
  demoUsers,
  initializeDemoData
};

export default demoUsersExport;
