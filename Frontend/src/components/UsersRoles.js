import React, { useState, useEffect, useCallback } from 'react';
import {
  FiUsers, FiBriefcase, FiCreditCard, FiDollarSign, FiActivity,
  FiBarChart2, FiShield
} from 'react-icons/fi';
import { getAdminStats } from '../services/adminApi';
import AdminUserManagement from './admin/AdminUserManagement';
import AdminCompanyManagement from './admin/AdminCompanyManagement';
import AdminPlanManagement from './admin/AdminPlanManagement';
import AdminCreditManagement from './admin/AdminCreditManagement';
import AdminAuditLogComponent from './admin/AdminAuditLog';
import './UsersRoles.css';

function UsersRoles() {
  const [activeTab, setActiveTab] = useState('users');
  const [stats, setStats] = useState(null);
  const [creditCompany, setCreditCompany] = useState(null);

  const fetchStats = useCallback(async () => {
    try {
      const res = await getAdminStats();
      if (res.data.success) setStats(res.data.stats);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  // Navigate to credits tab with a preselected company
  const handleNavigateCredits = (company) => {
    setCreditCompany(company);
    setActiveTab('credits');
  };

  const tabs = [
    { key: 'users', label: 'Users', icon: <FiUsers /> },
    { key: 'companies', label: 'Companies', icon: <FiBriefcase /> },
    { key: 'plans', label: 'Plans & Subscriptions', icon: <FiCreditCard /> },
    { key: 'credits', label: 'Mail Credits', icon: <FiDollarSign /> },
    { key: 'audit', label: 'Audit Log', icon: <FiActivity /> }
  ];

  const formatNumber = (n) => (n || 0).toLocaleString();

  const renderContent = () => {
    switch (activeTab) {
      case 'users':
        return <AdminUserManagement />;
      case 'companies':
        return <AdminCompanyManagement onNavigateCredits={handleNavigateCredits} />;
      case 'plans':
        return <AdminPlanManagement />;
      case 'credits':
        return <AdminCreditManagement preselectedCompany={creditCompany} />;
      case 'audit':
        return <AdminAuditLogComponent />;
      default:
        return <AdminUserManagement />;
    }
  };

  return (
    <div className="admin-panel">
      {/* Header */}
      <div className="admin-header">
        <div className="admin-header-left">
          <FiShield className="admin-header-icon" />
          <div>
            <h2 className="admin-title">Admin Panel</h2>
            <p className="admin-subtitle">Manage users, companies, plans, and credits</p>
          </div>
        </div>
        {stats && (
          <div className="admin-header-stats">
            <div className="admin-header-stat">
              <FiUsers />
              <span>{formatNumber(stats.totalUsers)} Users</span>
            </div>
            <div className="admin-header-stat">
              <FiBriefcase />
              <span>{formatNumber(stats.totalCompanies)} Companies</span>
            </div>
            <div className="admin-header-stat">
              <FiBarChart2 />
              <span>{formatNumber(stats.activeUsers)} Active</span>
            </div>
          </div>
        )}
      </div>

      {/* Tab Navigation */}
      <div className="admin-tabs">
        {tabs.map(tab => (
          <button
            key={tab.key}
            className={`admin-tab ${activeTab === tab.key ? 'admin-tab-active' : ''}`}
            onClick={() => { setActiveTab(tab.key); if (tab.key !== 'credits') setCreditCompany(null); }}
          >
            {tab.icon}
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="admin-content">
        {renderContent()}
      </div>
    </div>
  );
}

export default UsersRoles;
