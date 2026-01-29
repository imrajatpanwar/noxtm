import React, { useState, useEffect, useCallback } from 'react';
import api from '../../config/api';
import './DomainManagement.css';

const DomainManagement = () => {
  const [domains, setDomains] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchDomainData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch from email accounts endpoint which returns verified domains
      const res = await api.get('/email-accounts/by-verified-domain');
      
      if (res.data.success) {
        const verifiedDomains = res.data.verifiedDomains || [];
        const emailAccounts = res.data.accounts || [];
        
        // Build domain info from verified domains and accounts
        const domainInfoMap = {};
        
        verifiedDomains.forEach(domain => {
          domainInfoMap[domain] = {
            domain,
            accounts: [],
            totalEmails: 0,
            verified: true
          };
        });
        
        emailAccounts.forEach(account => {
          const domain = account.domain?.toLowerCase();
          if (domain && domainInfoMap[domain]) {
            domainInfoMap[domain].accounts.push(account);
          }
        });
        
        setDomains(Object.values(domainInfoMap));
        setAccounts(emailAccounts);
      }
    } catch (err) {
      console.error('Error fetching domain data:', err);
      setError('Failed to load domain information');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDomainData();
  }, [fetchDomainData]);

  if (loading) {
    return (
      <div className="dm-container">
        <div className="dm-loading">
          <div className="dm-spinner"></div>
          <p>Loading domain information...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dm-container">
        <div className="dm-error">
          <p>{error}</p>
          <button className="dm-btn-retry" onClick={fetchDomainData}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="dm-container">
      <div className="dm-header">
        <h2>Domain Information</h2>
        <p>View your email domain and account details</p>
      </div>

      {/* Stats Overview */}
      <div className="dm-stats-row">
        <div className="dm-stat-item">
          <span className="dm-stat-value">{domains.length}</span>
          <span className="dm-stat-label">Total Domains</span>
        </div>
        <div className="dm-stat-item">
          <span className="dm-stat-value">{domains.filter(d => d.verified).length}</span>
          <span className="dm-stat-label">Verified</span>
        </div>
        <div className="dm-stat-item">
          <span className="dm-stat-value">{accounts.length}</span>
          <span className="dm-stat-label">Email Accounts</span>
        </div>
      </div>

      {domains.length === 0 ? (
        <div className="dm-empty">
          <div className="dm-empty-icon">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="12" cy="12" r="10"/>
              <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
            </svg>
          </div>
          <h3>No Domain Found</h3>
          <p>No verified domain is associated with your account. Please contact your administrator.</p>
        </div>
      ) : (
        <div className="dm-domains-list">
          {domains.map((domainInfo, index) => (
            <DomainCard key={index} domainInfo={domainInfo} />
          ))}
        </div>
      )}
    </div>
  );
};

const DomainCard = ({ domainInfo }) => {
  const [expanded, setExpanded] = useState(true);

  return (
    <div className={`dm-domain-card ${expanded ? 'expanded' : ''}`}>
      <div className="dm-card-header" onClick={() => setExpanded(!expanded)}>
        <div className="dm-card-info">
          <h3 className="dm-domain-name">{domainInfo.domain}</h3>
          <div className="dm-domain-meta">
            <span className={`dm-status ${domainInfo.verified ? 'verified' : 'pending'}`}>
              {domainInfo.verified ? 'Verified' : 'Pending'}
            </span>
            <span className="dm-meta-divider">|</span>
            <span className="dm-accounts-count">{domainInfo.accounts.length} account(s)</span>
          </div>
        </div>
        <button className="dm-expand-btn">
          <svg 
            width="20" 
            height="20" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2"
            style={{ transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}
          >
            <polyline points="6 9 12 15 18 9"/>
          </svg>
        </button>
      </div>

      {expanded && (
        <div className="dm-card-body">
          {/* Domain Details */}
          <div className="dm-details-section">
            <h4>Domain Details</h4>
            <div className="dm-details-grid">
              <div className="dm-detail-row">
                <span className="dm-detail-label">Domain</span>
                <span className="dm-detail-value">{domainInfo.domain}</span>
              </div>
              <div className="dm-detail-row">
                <span className="dm-detail-label">Status</span>
                <span className={`dm-detail-value ${domainInfo.verified ? 'text-success' : 'text-warning'}`}>
                  {domainInfo.verified ? 'Active & Verified' : 'Pending Verification'}
                </span>
              </div>
              <div className="dm-detail-row">
                <span className="dm-detail-label">Email Accounts</span>
                <span className="dm-detail-value">{domainInfo.accounts.length}</span>
              </div>
            </div>
          </div>

          {/* Email Accounts */}
          {domainInfo.accounts.length > 0 && (
            <div className="dm-accounts-section">
              <h4>Email Accounts</h4>
              <div className="dm-accounts-list">
                {domainInfo.accounts.map(account => (
                  <div key={account._id} className="dm-account-item">
                    <div className="dm-account-avatar">
                      {account.email?.charAt(0).toUpperCase() || 'E'}
                    </div>
                    <div className="dm-account-details">
                      <span className="dm-account-email">{account.email}</span>
                      <span className="dm-account-type">{account.accountType || 'hosted'}</span>
                    </div>
                    <span className={`dm-account-status ${account.enabled ? 'active' : 'inactive'}`}>
                      {account.enabled ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* DNS Information */}
          <div className="dm-dns-section">
            <h4>DNS Configuration</h4>
            <p className="dm-dns-note">
              Your domain is configured to use our mail servers. DNS records are managed by your system administrator.
            </p>
            <div className="dm-dns-records">
              <div className="dm-dns-record">
                <span className="dm-record-type">MX</span>
                <span className="dm-record-value">mail.noxtm.com (Priority 10)</span>
              </div>
              <div className="dm-dns-record">
                <span className="dm-record-type">A</span>
                <span className="dm-record-value">mail.{domainInfo.domain} - 185.137.122.61</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DomainManagement;
