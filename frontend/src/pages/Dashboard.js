import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Plus, Folder, Users, Calendar } from 'lucide-react';

const Dashboard = () => {
  const { user } = useAuth();

  const stats = [
    {
      title: 'Total Projects',
      value: '12',
      icon: <Folder className="w-6 h-6" />,
      color: 'bg-blue-500',
    },
    {
      title: 'Team Members',
      value: '8',
      icon: <Users className="w-6 h-6" />,
      color: 'bg-green-500',
    },
    {
      title: 'Active Tasks',
      value: '24',
      icon: <Calendar className="w-6 h-6" />,
      color: 'bg-yellow-500',
    },
  ];

  const recentProjects = [
    {
      id: 1,
      name: 'E-commerce Platform',
      status: 'In Progress',
      progress: 75,
      lastUpdated: '2 hours ago',
    },
    {
      id: 2,
      name: 'Mobile App Development',
      status: 'Planning',
      progress: 25,
      lastUpdated: '1 day ago',
    },
    {
      id: 3,
      name: 'Website Redesign',
      status: 'Completed',
      progress: 100,
      lastUpdated: '3 days ago',
    },
  ];

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-primary-600 to-primary-700 rounded-lg p-6 text-white">
        <h1 className="text-2xl font-bold mb-2">
          Welcome back, {user?.name}! 👋
        </h1>
        <p className="text-primary-100">
          Here's what's happening with your projects today.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {stats.map((stat, index) => (
          <div key={index} className="card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
              </div>
              <div className={`p-3 rounded-lg ${stat.color} text-white`}>
                {stat.icon}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="card">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button className="flex items-center justify-center space-x-2 p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-primary-500 hover:bg-primary-50 transition-colors">
            <Plus className="w-5 h-5 text-gray-400" />
            <span className="text-gray-600">Create New Project</span>
          </button>
          <button className="flex items-center justify-center space-x-2 p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-primary-500 hover:bg-primary-50 transition-colors">
            <Users className="w-5 h-5 text-gray-400" />
            <span className="text-gray-600">Invite Team Member</span>
          </button>
          <button className="flex items-center justify-center space-x-2 p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-primary-500 hover:bg-primary-50 transition-colors">
            <Calendar className="w-5 h-5 text-gray-400" />
            <span className="text-gray-600">Schedule Meeting</span>
          </button>
        </div>
      </div>

      {/* Recent Projects */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Recent Projects</h2>
          <button className="text-primary-600 hover:text-primary-700 text-sm font-medium">
            View All
          </button>
        </div>
        <div className="space-y-4">
          {recentProjects.map((project) => (
            <div key={project.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex-1">
                <h3 className="font-medium text-gray-900">{project.name}</h3>
                <p className="text-sm text-gray-500">{project.lastUpdated}</p>
              </div>
              <div className="flex items-center space-x-4">
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900">{project.progress}%</p>
                  <p className="text-xs text-gray-500">{project.status}</p>
                </div>
                <div className="w-16 bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-primary-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${project.progress}%` }}
                  ></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
