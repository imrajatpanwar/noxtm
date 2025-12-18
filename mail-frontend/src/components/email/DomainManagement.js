import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './DomainManagement.css';
import CreateEmailModal from '../CreateEmailModal';

const DomainManagement = () => {
  const [domains, setDomains] = useState([]);
  const [showAddDomain, setShowAddDomain] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDomains();
  }, []);

  const fetchDomains = async () => {
    setLoading(true);
    try {
      const res = await axios.get('/api/email-domains/company');
      setDomains(res.data.domains || []);
    } catch (error) {
      console.error('Error fetching domains:', error);
      alert('Error loading domains: ' + (error.response?.data?.error || error.message));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="domain-management">
      <div className="header">
        <h2>📧 Email Domains</h2>
        <button className="btn-primary" onClick={() => setShowAddDomain(true)}>
          + Add Domain
        </button>
      </div>

      {loading ? (
        <div className="loading">Loading domains...</div>
      ) : domains.length === 0 ? (
        <div className="no-domains">
          <p>No domains configured yet.</p>
          <p>Add your company domain to create team email accounts.</p>
          <button className="btn-primary" onClick={() => setShowAddDomain(true)}>
            Add Your First Domain
          </button>
        </div>
      ) : (
        <div className="domains-grid">
          {domains.map(domain => (
            <DomainCard
              key={domain._id}
              domain={domain}
              onUpdate={fetchDomains}
            />
          ))}
        </div>
      )}

      {showAddDomain && (
        <AddDomainModal
          onClose={() => setShowAddDomain(false)}
          onAdded={fetchDomains}
        />
      )}
    </div>
  );
};

const DomainCard = ({ domain, onUpdate }) => {
  const [verifying, setVerifying] = useState(false);
  const [showDNS, setShowDNS] = useState(false);
  const [domainAccounts, setDomainAccounts] = useState([]);
  const [loadingAccounts, setLoadingAccounts] = useState(false);
  const [showAccounts, setShowAccounts] = useState(false);
  const [showCreateEmailModal, setShowCreateEmailModal] = useState(false);

  useEffect(() => {
    if (domain && domain.domain) {
      fetchDomainAccounts();
    }
  }, [domain]);

  const fetchDomainAccounts = async () => {
    setLoadingAccounts(true);
    try {
      const response = await axios.get(`/api/email-accounts/by-domain/${domain.domain}`);
      if (response.data.success) {
        setDomainAccounts(response.data.accounts || []);
      }
    } catch (error) {
      console.error('Error fetching domain accounts:', error);
    } finally {
      setLoadingAccounts(false);
    }
  };

  const verifyDomain = async () => {
    setVerifying(true);
    try {
      const response = await axios.post(`/api/email-domains/${domain._id}/verify-dns`);
      alert(response.data.message || '✅ Domain verified successfully!');
      onUpdate();
    } catch (error) {
      alert('❌ Verification failed: ' + (error.response?.data?.error || error.message));
    } finally {
      setVerifying(false);
    }
  };

  const getStatusBadge = () => {
    if (domain.verified) {
      return { className: 'verified', text: '✓ Fully Verified' };
    } else if (domain.dnsVerified) {
      return { className: 'aws-pending', text: '⏳ Waiting for AWS SES' };
    } else {
      return { className: 'pending', text: '⚠ Pending Verification' };
    }
  };

  const getStatusMessage = () => {
    if (domain.verified) {
      return 'Your domain is fully verified and ready for email!';
    } else if (domain.dnsVerified) {
      return 'DNS records verified! AWS SES DKIM verification is in progress (usually within 24-72 hours). You can start using the mail app.';
    } else {
      return 'Please configure DNS records to verify your domain.';
    }
  };

  const statusBadge = getStatusBadge();
  const percentageUsed = domain.totalQuota > 0
    ? (domain.usedStorage / domain.totalQuota) * 100
    : 0;

  return (
    <div className={`domain-card ${statusBadge.className}`}>
      <div className="domain-header">
        <h3>{domain.domain}</h3>
        <span className={`status-badge ${statusBadge.className}`}>
          {statusBadge.text}
        </span>
      </div>

      <p className="status-message">{getStatusMessage()}</p>

      {/* AWS SES Progress Details */}
      {domain.dnsVerified && !domain.verified && domain.awsSes && (
        <div style={{
          backgroundColor: '#fff3cd',
          border: '1px solid #ffc107',
          borderRadius: '5px',
          padding: '12px',
          marginBottom: '15px',
          fontSize: '13px'
        }}>
          <h4 style={{ margin: '0 0 8px 0', fontSize: '14px', fontWeight: '600', color: '#856404' }}>
            ⏳ AWS SES Verification in Progress
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
            <div>
              <strong>Status:</strong> {domain.awsSes.verificationStatus || 'Pending'}
            </div>
            {domain.awsSes.registeredAt && (
              <div>
                <strong>Requested:</strong> {new Date(domain.awsSes.registeredAt).toLocaleString()}
              </div>
            )}
            {domain.awsSes.dkimTokens && domain.awsSes.dkimTokens.length > 0 && (
              <div>
                <strong>DKIM Records:</strong> {domain.awsSes.dkimTokens.length} CNAME records configured
              </div>
            )}
            <div style={{ marginTop: '5px', fontSize: '12px', color: '#856404' }}>
              📌 Verification typically completes within 24-72 hours. DNS records propagation may take time.
            </div>
          </div>
        </div>
      )}

      <div className="domain-stats">
        <div className="stat">
          <span className="label">Accounts</span>
          <span className="value">
            {domain.accountCount || 0} / {domain.maxAccounts || 100}
          </span>
        </div>

        <div className="stat">
          <span className="label">Storage</span>
          <span className="value">
            {Math.round(domain.usedStorage || 0)} / {domain.totalQuota || 10240} MB
          </span>
        </div>
      </div>

      <div className="quota-bar">
        <div
          className="quota-used"
          style={{
            width: `${Math.min(percentageUsed, 100)}%`,
            backgroundColor: percentageUsed > 80 ? '#e74c3c' : '#3498db'
          }}
        />
      </div>
      <span className="quota-percentage">{Math.round(percentageUsed)}% used</span>

      {/* Email Accounts Section */}
      <div className="domain-accounts-section" style={{ marginTop: '20px', borderTop: '1px solid #e0e0e0', paddingTop: '15px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
          <h4 style={{ margin: 0, fontSize: '14px', fontWeight: '600' }}>
            Email Accounts ({domainAccounts.length})
          </h4>
          <button
            onClick={() => setShowAccounts(!showAccounts)}
            style={{
              background: 'none',
              border: 'none',
              color: '#007bff',
              cursor: 'pointer',
              fontSize: '12px',
              textDecoration: 'underline'
            }}
          >
            {showAccounts ? 'Hide' : 'Show'}
          </button>
        </div>

        {showAccounts && (
          loadingAccounts ? (
            <p style={{ fontSize: '12px', color: '#666' }}>Loading accounts...</p>
          ) : domainAccounts.length === 0 ? (
            <p style={{ fontSize: '12px', color: '#999', fontStyle: 'italic' }}>
              No email accounts created yet on this domain.
            </p>
          ) : (
            <div className="accounts-list" style={{ maxHeight: '200px', overflowY: 'auto' }}>
              {domainAccounts.map(account => (
                <div
                  key={account._id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '8px 10px',
                    backgroundColor: '#f8f9fa',
                    borderRadius: '5px',
                    marginBottom: '8px',
                    fontSize: '13px'
                  }}
                >
                  <div>
                    <strong style={{ color: '#333' }}>{account.email}</strong>
                    <span style={{ marginLeft: '10px', fontSize: '11px', color: '#666', backgroundColor: '#e9ecef', padding: '2px 6px', borderRadius: '3px' }}>
                      {account.accountType || 'hosted'}
                    </span>
                  </div>
                  <span style={{ fontSize: '11px', color: '#999' }}>
                    {new Date(account.createdAt).toLocaleDateString()}
                  </span>
                </div>
              ))}
            </div>
          )
        )}
      </div>

      <div className="domain-actions">
        {/* Create Email Button - always visible for verified domains */}
        {(domain.verified || domain.dnsVerified) && (
          <button
            className="btn-primary"
            onClick={() => setShowCreateEmailModal(true)}
            style={{ marginRight: '10px' }}
          >
            + Create Email
          </button>
        )}

        {!domain.verified && !domain.dnsVerified && (
          <>
            <button
              className="btn-secondary"
              onClick={() => setShowDNS(!showDNS)}
            >
              {showDNS ? 'Hide DNS Setup' : 'Show DNS Setup'}
            </button>
            <button
              className="btn-primary"
              onClick={verifyDomain}
              disabled={verifying}
            >
              {verifying ? 'Verifying...' : 'Verify DNS'}
            </button>
          </>
        )}

        {domain.dnsVerified && !domain.verified && (
          <button
            className="btn-secondary"
            onClick={verifyDomain}
            disabled={verifying}
          >
            {verifying ? 'Checking...' : 'Check AWS SES Status'}
          </button>
        )}

        {domain.verified && (
          <button className="btn-secondary" onClick={() => setShowDNS(!showDNS)}>
            {showDNS ? 'Hide DNS Setup' : 'View DNS Setup'}
          </button>
        )}
      </div>

      {showDNS && (
        <DNSInstructions domain={domain} />
      )}

      {/* Create Email Modal */}
      {showCreateEmailModal && (
        <CreateEmailModal
          isOpen={showCreateEmailModal}
          onClose={() => setShowCreateEmailModal(false)}
          onSuccess={() => {
            setShowCreateEmailModal(false);
            fetchDomainAccounts(); // Refresh accounts list
            onUpdate(); // Refresh domain data
          }}
        />
      )}
    </div>
  );
};

const DNSInstructions = ({ domain }) => {
  const [copied, setCopied] = useState('');

  const copyToClipboard = (text, label) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(''), 2000);
  };

  return (
    <div className="dns-instructions">
      <h4>DNS Configuration Required</h4>
      <p>Add these records to your domain's DNS settings:</p>

      <div className="dns-record">
        <strong>1. MX Record:</strong>
        <code onClick={() => copyToClipboard(`${domain.domain} MX 10 mail.noxtm.com`, 'MX')}>
          {domain.domain} MX 10 mail.noxtm.com
          {copied === 'MX' && <span className="copied">✓ Copied</span>}
        </code>
      </div>

      <div className="dns-record">
        <strong>2. A Record:</strong>
        <code onClick={() => copyToClipboard(`mail.${domain.domain} A 185.137.122.61`, 'A')}>
          mail.{domain.domain} A 185.137.122.61
          {copied === 'A' && <span className="copied">✓ Copied</span>}
        </code>
      </div>

      {domain.dnsRecords?.spf?.record && (
        <div className="dns-record">
          <strong>3. SPF (TXT):</strong>
          <code onClick={() => copyToClipboard(`${domain.domain} TXT "${domain.dnsRecords.spf.record}"`, 'SPF')}>
            {domain.domain} TXT "{domain.dnsRecords.spf.record}"
            {copied === 'SPF' && <span className="copied">✓ Copied</span>}
          </code>
        </div>
      )}

      {domain.dnsRecords?.dkim?.record && (
        <div className="dns-record">
          <strong>4. DKIM (TXT):</strong>
          <code
            className="long-record"
            onClick={() => copyToClipboard(
              `${domain.dnsRecords.dkim.selector}._domainkey.${domain.domain} TXT "${domain.dnsRecords.dkim.record}"`,
              'DKIM'
            )}
          >
            {domain.dnsRecords.dkim.selector}._domainkey.{domain.domain} TXT "{domain.dnsRecords.dkim.record.substring(0, 50)}..."
            {copied === 'DKIM' && <span className="copied">✓ Copied</span>}
          </code>
        </div>
      )}

      {domain.dnsRecords?.dmarc?.record && (
        <div className="dns-record">
          <strong>5. DMARC (TXT):</strong>
          <code onClick={() => copyToClipboard(`_dmarc.${domain.domain} TXT "${domain.dnsRecords.dmarc.record}"`, 'DMARC')}>
            _dmarc.{domain.domain} TXT "{domain.dnsRecords.dmarc.record}"
            {copied === 'DMARC' && <span className="copied">✓ Copied</span>}
          </code>
        </div>
      )}

      {domain.verificationToken && (
        <div className="dns-record">
          <strong>6. Verification (TXT):</strong>
          <code onClick={() => copyToClipboard(`${domain.domain} TXT "noxtm-verify=${domain.verificationToken}"`, 'Verify')}>
            {domain.domain} TXT "noxtm-verify={domain.verificationToken}"
            {copied === 'Verify' && <span className="copied">✓ Copied</span>}
          </code>
        </div>
      )}

      <p className="dns-help">
        💡 Click on any record to copy it to clipboard
      </p>
    </div>
  );
};

const AddDomainModal = ({ onClose, onAdded }) => {
  const [domain, setDomain] = useState('');
  const [quotaMB, setQuotaMB] = useState(10240);
  const [maxAccounts, setMaxAccounts] = useState(50);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await axios.post('/api/email-domains/', {
        domain: domain.toLowerCase().trim(),
        companyQuota: {
          totalQuotaMB: quotaMB,
          maxAccounts
        }
      });

      alert('✅ Domain added successfully! Please configure DNS records.');
      onAdded();
      onClose();

    } catch (error) {
      alert('❌ Error: ' + (error.response?.data?.error || error.message));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Add Email Domain</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Domain Name *</label>
            <input
              type="text"
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              placeholder="mycompany.com"
              pattern="[a-z0-9.-]+"
              required
            />
            <small>Enter your company domain (without www or http)</small>
          </div>

          <div className="form-group">
            <label>Total Quota (MB)</label>
            <input
              type="number"
              value={quotaMB}
              onChange={(e) => setQuotaMB(parseInt(e.target.value))}
              min="1024"
              step="1024"
            />
            <small>{(quotaMB / 1024).toFixed(1)} GB total storage for all accounts</small>
          </div>

          <div className="form-group">
            <label>Max Accounts</label>
            <input
              type="number"
              value={maxAccounts}
              onChange={(e) => setMaxAccounts(parseInt(e.target.value))}
              min="1"
              max="1000"
            />
            <small>Maximum number of email accounts for this domain</small>
          </div>

          <div className="modal-actions">
            <button type="button" onClick={onClose} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Adding...' : 'Add Domain'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default DomainManagement;
