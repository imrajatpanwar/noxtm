import React, { useState, useEffect } from 'react';
import api from '../config/api';
import { FiMail, FiSend, FiInbox, FiAlertTriangle, FiUsers, FiGlobe, FiFileText, FiActivity } from 'react-icons/fi';
import './NoxtmMailDashboard.css';

function NoxtmMailDashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const fetchDashboardStats = async () => {
    try {
      setLoading(true);

      // Fetch multiple stats in parallel
      const [domainsRes, accountsRes, logsRes, templatesRes] = await Promise.all([
        api.get('/email-domains'),
        api.get('/email-accounts'),
        api.get('/email-logs/stats/summary?period=7d'),
        api.get('/email-templates')
      ]);

      setStats({
        domains: domainsRes.data.pagination?.total || 0,
        accounts: accountsRes.data.pagination?.total || 0,
        emailLogs: logsRes.data.data || {},
        templates: templatesRes.data.pagination?.total || 0
      });

      setError('');
    } catch (err) {
      console.error('Error fetching dashboard stats:', err);
      setError('Failed to load dashboard statistics');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="noxtm-mail-dashboard">
        <h1>Noxtm Mail Dashboard</h1>
        <div className="loading-message">Loading statistics...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="noxtm-mail-dashboard">
        <h1>Noxtm Mail Dashboard</h1>
        <div className="error-message">
          <FiAlertTriangle /> {error}
        </div>
      </div>
    );
  }

  const emailStats = stats?.emailLogs || {};

  return (
    <div className="noxtm-mail-dashboard">
      <div className="dashboard-header">
        <h1><FiMail /> Noxtm Mail Dashboard</h1>
        <p>Complete email management system with accounts, domains, and logging</p>
      </div>

      {/* Stats Cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon domains">
            <FiGlobe />
          </div>
          <div className="stat-content">
            <h3>{stats.domains}</h3>
            <p>Email Domains</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon accounts">
            <FiUsers />
          </div>
          <div className="stat-content">
            <h3>{stats.accounts}</h3>
            <p>Email Accounts</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon templates">
            <FiFileText />
          </div>
          <div className="stat-content">
            <h3>{stats.templates}</h3>
            <p>Email Templates</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon sent">
            <FiSend />
          </div>
          <div className="stat-content">
            <h3>{emailStats.sent || 0}</h3>
            <p>Emails Sent (7d)</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon received">
            <FiInbox />
          </div>
          <div className="stat-content">
            <h3>{emailStats.received || 0}</h3>
            <p>Emails Received (7d)</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon spam">
            <FiAlertTriangle />
          </div>
          <div className="stat-content">
            <h3>{emailStats.spam || 0}</h3>
            <p>Spam Blocked (7d)</p>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="quick-stats">
        <div className="quick-stat-card">
          <h3><FiActivity /> Email Performance</h3>
          <div className="stat-row">
            <span>Delivery Rate:</span>
            <span className="stat-value success">{emailStats.rates?.success || 0}%</span>
          </div>
          <div className="stat-row">
            <span>Bounce Rate:</span>
            <span className="stat-value warning">{emailStats.rates?.bounce || 0}%</span>
          </div>
          <div className="stat-row">
            <span>Spam Rate:</span>
            <span className="stat-value danger">{emailStats.rates?.spam || 0}%</span>
          </div>
        </div>

        <div className="quick-stat-card">
          <h3><FiMail /> Email Status</h3>
          <div className="stat-row">
            <span>Delivered:</span>
            <span className="stat-value">{emailStats.delivered || 0}</span>
          </div>
          <div className="stat-row">
            <span>Bounced:</span>
            <span className="stat-value">{emailStats.bounced || 0}</span>
          </div>
          <div className="stat-row">
            <span>Failed:</span>
            <span className="stat-value">{emailStats.failed || 0}</span>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="quick-actions">
        <h3>Quick Actions</h3>
        <div className="action-buttons">
          <button className="action-btn primary">
            <FiUsers /> Manage Email Accounts
          </button>
          <button className="action-btn secondary">
            <FiGlobe /> Configure Domains
          </button>
          <button className="action-btn secondary">
            <FiFileText /> Email Templates
          </button>
          <button className="action-btn secondary">
            <FiActivity /> View Email Logs
          </button>
        </div>
      </div>

      {/* Setup Guide */}
      <div className="setup-guide">
        <h3>Getting Started</h3>
        <div className="setup-steps">
          <div className="setup-step">
            <div className="step-number">1</div>
            <div className="step-content">
              <h4>Add Email Domain</h4>
              <p>Configure your domain with DNS records</p>
            </div>
          </div>
          <div className="setup-step">
            <div className="step-number">2</div>
            <div className="step-content">
              <h4>Create Email Accounts</h4>
              <p>Set up email accounts for your team</p>
            </div>
          </div>
          <div className="setup-step">
            <div className="step-number">3</div>
            <div className="step-content">
              <h4>Configure Templates</h4>
              <p>Create email templates for automation</p>
            </div>
          </div>
          <div className="setup-step">
            <div className="step-number">4</div>
            <div className="step-content">
              <h4>Monitor & Track</h4>
              <p>View logs and audit trails</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default NoxtmMailDashboard;
