import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiMail, FiSend, FiTrash2, FiArchive, FiStar, FiClock, FiUsers, FiSettings, FiLogOut, FiBarChart2, FiUpload } from 'react-icons/fi';
import MainstreamInbox from './MainstreamInbox';
import TeamInbox from './email/TeamInbox';
import AnalyticsDashboard from './email/AnalyticsDashboard';
import SLAMonitor from './email/SLAMonitor';
import TemplateManager from './email/TemplateManager';
import RulesManager from './email/RulesManager';
import DomainManagement from './email/DomainManagement';
import CreateCampaign from './campaign/CreateCampaign';
import ImportMail from './campaign/ImportMail';
import CampaignAnalytics from './campaign/CampaignAnalytics';
import api from '../config/api';
import { MAIL_LOGIN_URL, getMainAppUrl } from '../config/authConfig';
import './Inbox.css';

function Inbox() {
  const [user, setUser] = useState(null);
  const [activeView, setActiveView] = useState('personal'); // personal, team, analytics, sla, templates, rules, domains
  const navigate = useNavigate();

  useEffect(() => {
    // Load user from localStorage or fetch from API (SSO check)
    const loadUser = async () => {
      try {
        // Check SSO cookie via /profile endpoint
        const response = await api.get('/profile');
        setUser(response.data);
        localStorage.setItem('user', JSON.stringify(response.data));
      } catch (err) {
        // No SSO session, redirect to main app login with redirect parameter
        window.location.href = MAIL_LOGIN_URL;
      }
    };

    loadUser();
  }, [navigate]);

  const handleLogout = async () => {
    try {
      await api.post('/logout');
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      navigate('/login');
    }
  };

  if (!user) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="inbox-container">
      {/* Sidebar */}
      <div className="inbox-sidebar">
        <div className="sidebar-header">
          <h1>Mail</h1>
          <div className="user-info">
            <p className="user-name">{user.fullName}</p>
            <p className="user-email">{user.email}</p>
          </div>
        </div>

        <nav className="sidebar-nav">
          <button
            className={`nav-item ${activeView === 'personal' ? 'active' : ''}`}
            onClick={() => setActiveView('personal')}
          >
            <FiMail /> Personal Inbox
          </button>

          <button
            className={`nav-item ${activeView === 'team' ? 'active' : ''}`}
            onClick={() => setActiveView('team')}
          >
            <FiUsers /> Team Inbox
          </button>

          <div className="nav-divider"></div>

          <button
            className={`nav-item ${activeView === 'analytics' ? 'active' : ''}`}
            onClick={() => setActiveView('analytics')}
          >
            <FiBarChart2 /> Analytics
          </button>

          <button
            className={`nav-item ${activeView === 'sla' ? 'active' : ''}`}
            onClick={() => setActiveView('sla')}
          >
            <FiClock /> SLA Monitor
          </button>

          <button
            className={`nav-item ${activeView === 'templates' ? 'active' : ''}`}
            onClick={() => setActiveView('templates')}
          >
            <FiSend /> Templates
          </button>

          <button
            className={`nav-item ${activeView === 'rules' ? 'active' : ''}`}
            onClick={() => setActiveView('rules')}
          >
            <FiSettings /> Assignment Rules
          </button>

          <button
            className={`nav-item ${activeView === 'domains' ? 'active' : ''}`}
            onClick={() => setActiveView('domains')}
          >
            <FiMail /> Domain Management
          </button>

          <div className="nav-divider"></div>

          <button
            className={`nav-item ${activeView === 'create-campaign' ? 'active' : ''}`}
            onClick={() => setActiveView('create-campaign')}
          >
            <FiSend /> Create Campaign Email
          </button>

          <button
            className={`nav-item ${activeView === 'import-mail' ? 'active' : ''}`}
            onClick={() => setActiveView('import-mail')}
          >
            <FiUpload /> Import Mail
          </button>

          <button
            className={`nav-item ${activeView === 'campaign-analytics' ? 'active' : ''}`}
            onClick={() => setActiveView('campaign-analytics')}
          >
            <FiBarChart2 /> Campaign Analytics
          </button>

          <div className="nav-divider"></div>

          <button className="nav-item logout-btn" onClick={handleLogout}>
            <FiLogOut /> Sign Out
          </button>
        </nav>

        <div className="sidebar-footer">
          <a href={getMainAppUrl()} target="_blank" rel="noopener noreferrer">
            Back to Dashboard
          </a>
        </div>
      </div>

      {/* Main Content */}
      <div className="inbox-content">
        {activeView === 'personal' && <MainstreamInbox />}
        {activeView === 'team' && <TeamInbox />}
        {activeView === 'analytics' && <AnalyticsDashboard />}
        {activeView === 'sla' && <SLAMonitor />}
        {activeView === 'templates' && <TemplateManager />}
        {activeView === 'rules' && <RulesManager />}
        {activeView === 'domains' && <DomainManagement />}
        {activeView === 'create-campaign' && <CreateCampaign />}
        {activeView === 'import-mail' && <ImportMail />}
        {activeView === 'campaign-analytics' && <CampaignAnalytics />}
      </div>
    </div>
  );
}

export default Inbox;
