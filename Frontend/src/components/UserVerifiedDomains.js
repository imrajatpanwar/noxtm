import React, { useState, useEffect } from 'react';
import api from '../config/api';
import { useRole } from '../contexts/RoleContext';
import { FiGlobe, FiPlus, FiRefreshCw, FiSend, FiTrash2, FiCopy, FiCheck, FiAlertCircle, FiClock } from 'react-icons/fi';
import './EmailManagement.css';

function UserVerifiedDomains() {
  const { currentUser } = useRole();
  const [domains, setDomains] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showSendModal, setShowSendModal] = useState(false);
  const [selectedDomain, setSelectedDomain] = useState(null);
  const [toast, setToast] = useState({ show: false, message: '', type: '' });
  
  // Add Domain Modal State
  const [newDomain, setNewDomain] = useState('');
  const [addingDomain, setAddingDomain] = useState(false);
  const [dnsRecords, setDnsRecords] = useState(null);
  
  // Send Email Modal State
  const [emailForm, setEmailForm] = useState({
    to: '',
    subject: '',
    html: '',
    replyTo: ''
  });
  const [sendingEmail, setSendingEmail] = useState(false);
  const [rateLimitInfo, setRateLimitInfo] = useState(null);

  useEffect(() => {
    fetchDomains();
  }, []);

  const fetchDomains = async () => {
    try {
      setLoading(true);
      const response = await api.get('/user-domains');
      setDomains(response.data.domains || []);
      setError('');
    } catch (err) {
      console.error('Error fetching domains:', err);
      setError(err.response?.data?.error || 'Failed to load domains');
    } finally {
      setLoading(false);
    }
  };

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: '' }), 4000);
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text).then(() => {
      showToast('Copied to clipboard!', 'success');
    }).catch(() => {
      showToast('Failed to copy', 'error');
    });
  };

  const handleAddDomain = async () => {
    if (!newDomain.trim()) {
      showToast('Please enter a domain name', 'error');
      return;
    }

    // Basic domain validation
    const domainRegex = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)*$/i;
    if (!domainRegex.test(newDomain.trim())) {
      showToast('Invalid domain format', 'error');
      return;
    }

    try {
      setAddingDomain(true);
      const response = await api.post('/user-domains/add', { 
        domain: newDomain.trim().toLowerCase() 
      });
      
      setDnsRecords(response.data.dnsRecords || []);
      showToast('Domain added! Please configure DNS records.', 'success');
      fetchDomains();
      
      // Keep modal open to show DNS records
      setNewDomain('');
    } catch (err) {
      console.error('Error adding domain:', err);
      showToast(err.response?.data?.error || 'Failed to add domain', 'error');
    } finally {
      setAddingDomain(false);
    }
  };

  const handleCheckStatus = async (domain) => {
    try {
      const response = await api.get(`/user-domains/status/${domain}`);
      showToast(`Status: ${response.data.verificationStatus}`, 'success');
      fetchDomains();
    } catch (err) {
      console.error('Error checking status:', err);
      showToast(err.response?.data?.error || 'Failed to check status', 'error');
    }
  };

  const handleDeleteDomain = async (domain) => {
    if (!window.confirm(`Are you sure you want to delete ${domain}?`)) {
      return;
    }

    try {
      await api.delete(`/user-domains/${domain}`);
      showToast('Domain deleted successfully', 'success');
      fetchDomains();
    } catch (err) {
      console.error('Error deleting domain:', err);
      showToast(err.response?.data?.error || 'Failed to delete domain', 'error');
    }
  };

  const handleOpenSendModal = (domain) => {
    setSelectedDomain(domain);
    setShowSendModal(true);
    setEmailForm({
      to: '',
      subject: '',
      html: '',
      replyTo: ''
    });
  };

  const handleSendEmail = async () => {
    if (!emailForm.to || !emailForm.subject || !emailForm.html) {
      showToast('Please fill in all required fields', 'error');
      return;
    }

    try {
      setSendingEmail(true);
      const response = await api.post('/user-domains/send', {
        domain: selectedDomain.domain,
        to: emailForm.to,
        subject: emailForm.subject,
        html: emailForm.html,
        replyTo: emailForm.replyTo || undefined
      });
      
      if (response.data.rateLimitInfo) {
        setRateLimitInfo(response.data.rateLimitInfo);
      }
      
      showToast('Email sent successfully!', 'success');
      setShowSendModal(false);
      fetchDomains();
    } catch (err) {
      console.error('Error sending email:', err);
      const errorMsg = err.response?.data?.error || 'Failed to send email';
      
      if (err.response?.data?.rateLimitInfo) {
        setRateLimitInfo(err.response.data.rateLimitInfo);
      }
      
      showToast(errorMsg, 'error');
    } finally {
      setSendingEmail(false);
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      'SUCCESS': { color: '#10b981', icon: <FiCheck />, text: 'Verified' },
      'PENDING': { color: '#f59e0b', icon: <FiClock />, text: 'Pending' },
      'FAILED': { color: '#ef4444', icon: <FiAlertCircle />, text: 'Failed' },
      'TEMPORARY_FAILURE': { color: '#f59e0b', icon: <FiAlertCircle />, text: 'Temporary Failure' },
      'NOT_STARTED': { color: '#6b7280', icon: <FiClock />, text: 'Not Started' }
    };
    
    const badge = badges[status] || badges['NOT_STARTED'];
    
    return (
      <span style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        padding: '4px 12px',
        borderRadius: '12px',
        fontSize: '12px',
        fontWeight: '500',
        background: `${badge.color}15`,
        color: badge.color
      }}>
        {badge.icon}
        {badge.text}
      </span>
    );
  };

  const formatDate = (date) => {
    if (!date) return 'Never';
    return new Date(date).toLocaleString();
  };

  const isAdmin = currentUser?.role === 'Admin' || currentUser?.role === 'Business Admin';

  if (loading) {
    return (
      <div className="email-management-page">
        <div className="page-header">
          <h1><FiGlobe /> AWS SES Domains</h1>
        </div>
        <div className="content-card">
          <p>Loading domains...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="email-management-page">
      {/* Toast Notification */}
      {toast.show && (
        <div style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          padding: '12px 20px',
          background: toast.type === 'success' ? '#10b981' : '#ef4444',
          color: 'white',
          borderRadius: '8px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          zIndex: 10000,
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          {toast.type === 'success' ? <FiCheck /> : <FiAlertCircle />}
          {toast.message}
        </div>
      )}

      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1><FiGlobe /> AWS SES Verified Domains</h1>
          <p style={{ margin: '8px 0 0 0', color: '#666', fontSize: '14px' }}>
            Manage your verified domains for sending emails through AWS SES
          </p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button className="btn-secondary" onClick={fetchDomains}>
            <FiRefreshCw /> Refresh
          </button>
          <button className="btn-primary" onClick={() => setShowAddModal(true)}>
            <FiPlus /> Add Domain
          </button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div style={{
          padding: '12px 20px',
          background: '#fef2f2',
          color: '#ef4444',
          borderRadius: '8px',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <FiAlertCircle /> {error}
        </div>
      )}

      {/* Rate Limit Information */}
      <div className="content-card" style={{ marginBottom: '20px', background: 'linear-gradient(135deg, #667eea15 0%, #764ba215 100%)' }}>
        <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <FiActivity /> Rate Limits
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
          <div>
            <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>Global Rate</div>
            <div style={{ fontSize: '20px', fontWeight: '600', color: '#667eea' }}>14 emails/sec</div>
          </div>
          <div>
            <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>Per User Limit</div>
            <div style={{ fontSize: '20px', fontWeight: '600', color: '#667eea' }}>100 emails/hour</div>
          </div>
          <div>
            <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>Per Domain Limit</div>
            <div style={{ fontSize: '20px', fontWeight: '600', color: '#667eea' }}>500 emails/hour</div>
          </div>
          {rateLimitInfo && (
            <div>
              <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>Remaining (This Hour)</div>
              <div style={{ fontSize: '20px', fontWeight: '600', color: '#10b981' }}>
                {rateLimitInfo.userRemaining || 0}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Domains Table */}
      <div className="content-card">
        <div className="card-header">
          <h3>Your Verified Domains ({domains.length})</h3>
        </div>

        {domains.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: '#666' }}>
            <FiGlobe style={{ fontSize: '48px', marginBottom: '16px', opacity: 0.3 }} />
            <p>No domains added yet. Click "Add Domain" to get started.</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #f0f0f0' }}>
                  <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', fontSize: '14px' }}>Domain</th>
                  <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', fontSize: '14px' }}>Status</th>
                  <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', fontSize: '14px' }}>DKIM Status</th>
                  <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', fontSize: '14px' }}>Emails Sent</th>
                  <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', fontSize: '14px' }}>Last Sent</th>
                  <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', fontSize: '14px' }}>Verified At</th>
                  <th style={{ padding: '12px', textAlign: 'right', fontWeight: '600', fontSize: '14px' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {domains.map((domain) => (
                  <tr key={domain._id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                    <td style={{ padding: '12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <FiGlobe style={{ color: '#667eea' }} />
                        <span style={{ fontWeight: '500' }}>{domain.domain}</span>
                      </div>
                    </td>
                    <td style={{ padding: '12px' }}>
                      {getStatusBadge(domain.verificationStatus)}
                    </td>
                    <td style={{ padding: '12px' }}>
                      {getStatusBadge(domain.dkimVerificationStatus)}
                    </td>
                    <td style={{ padding: '12px' }}>
                      {domain.stats?.emailsSent || 0}
                    </td>
                    <td style={{ padding: '12px', fontSize: '13px', color: '#666' }}>
                      {formatDate(domain.stats?.lastEmailSent)}
                    </td>
                    <td style={{ padding: '12px', fontSize: '13px', color: '#666' }}>
                      {formatDate(domain.verifiedAt)}
                    </td>
                    <td style={{ padding: '12px', textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                        <button
                          className="btn-icon"
                          onClick={() => handleCheckStatus(domain.domain)}
                          title="Check Verification Status"
                        >
                          <FiRefreshCw />
                        </button>
                        {domain.verificationStatus === 'SUCCESS' && (
                          <button
                            className="btn-icon"
                            onClick={() => handleOpenSendModal(domain)}
                            title="Send Email"
                          >
                            <FiSend />
                          </button>
                        )}
                        <button
                          className="btn-icon danger"
                          onClick={() => handleDeleteDomain(domain.domain)}
                          title="Delete Domain"
                        >
                          <FiTrash2 />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Domain Modal */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => { setShowAddModal(false); setDnsRecords(null); }}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px' }}>
            <div className="modal-header">
              <h2>Add New Domain</h2>
              <button className="modal-close" onClick={() => { setShowAddModal(false); setDnsRecords(null); }}>×</button>
            </div>
            
            <div className="modal-body">
              {!dnsRecords ? (
                <>
                  <div className="form-group">
                    <label>Domain Name</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="example.com"
                      value={newDomain}
                      onChange={(e) => setNewDomain(e.target.value)}
                      disabled={addingDomain}
                    />
                    <small style={{ color: '#666', fontSize: '12px', marginTop: '4px', display: 'block' }}>
                      Enter your domain without http:// or www (e.g., example.com)
                    </small>
                  </div>

                  <div style={{
                    padding: '12px',
                    background: '#fef3c7',
                    borderRadius: '8px',
                    fontSize: '13px',
                    color: '#92400e',
                    marginTop: '16px'
                  }}>
                    <strong>Note:</strong> After adding your domain, you'll need to configure DNS records to verify ownership.
                  </div>
                </>
              ) : (
                <>
                  <div style={{
                    padding: '12px',
                    background: '#d1fae5',
                    borderRadius: '8px',
                    marginBottom: '16px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    color: '#065f46'
                  }}>
                    <FiCheck /> Domain added successfully! Please configure the following DNS records.
                  </div>

                  <h3 style={{ fontSize: '16px', marginBottom: '12px' }}>DNS Records to Configure</h3>
                  
                  {/* SPF Record */}
                  <div style={{
                    padding: '16px',
                    background: '#f8f9fa',
                    borderRadius: '8px',
                    marginBottom: '16px'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <strong style={{ fontSize: '14px' }}>SPF Record (Recommended)</strong>
                    </div>
                    <div style={{ fontSize: '13px', color: '#666', marginBottom: '8px' }}>
                      Type: <strong>TXT</strong> | Name: <strong>@</strong> or <strong>{newDomain}</strong>
                    </div>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '8px',
                      background: 'white',
                      borderRadius: '4px',
                      border: '1px solid #e0e0e0'
                    }}>
                      <code style={{ flex: 1, fontSize: '12px', wordBreak: 'break-all' }}>
                        v=spf1 mx include:amazonses.com ~all
                      </code>
                      <button
                        className="btn-icon"
                        onClick={() => copyToClipboard('v=spf1 mx include:amazonses.com ~all')}
                      >
                        <FiCopy />
                      </button>
                    </div>
                  </div>

                  {/* DKIM Records */}
                  {dnsRecords.filter(r => r.type === 'CNAME').map((record, index) => (
                    <div key={index} style={{
                      padding: '16px',
                      background: '#f8f9fa',
                      borderRadius: '8px',
                      marginBottom: '12px'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <strong style={{ fontSize: '14px' }}>DKIM Record {index + 1}</strong>
                      </div>
                      <div style={{ fontSize: '13px', color: '#666', marginBottom: '8px' }}>
                        Type: <strong>CNAME</strong>
                      </div>
                      <div style={{ marginBottom: '8px' }}>
                        <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>Name:</div>
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          padding: '8px',
                          background: 'white',
                          borderRadius: '4px',
                          border: '1px solid #e0e0e0'
                        }}>
                          <code style={{ flex: 1, fontSize: '12px', wordBreak: 'break-all' }}>
                            {record.name}
                          </code>
                          <button
                            className="btn-icon"
                            onClick={() => copyToClipboard(record.name)}
                          >
                            <FiCopy />
                          </button>
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>Value:</div>
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          padding: '8px',
                          background: 'white',
                          borderRadius: '4px',
                          border: '1px solid #e0e0e0'
                        }}>
                          <code style={{ flex: 1, fontSize: '12px', wordBreak: 'break-all' }}>
                            {record.value}
                          </code>
                          <button
                            className="btn-icon"
                            onClick={() => copyToClipboard(record.value)}
                          >
                            <FiCopy />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}

                  <div style={{
                    padding: '12px',
                    background: '#dbeafe',
                    borderRadius: '8px',
                    fontSize: '13px',
                    color: '#1e40af',
                    marginTop: '16px'
                  }}>
                    <strong>Next Steps:</strong>
                    <ol style={{ margin: '8px 0 0 0', paddingLeft: '20px' }}>
                      <li>Add these DNS records to your domain provider</li>
                      <li>Wait 5-72 hours for DNS propagation</li>
                      <li>Click "Check Status" to verify records</li>
                    </ol>
                  </div>
                </>
              )}
            </div>

            <div className="modal-footer">
              <button
                className="btn-secondary"
                onClick={() => { setShowAddModal(false); setDnsRecords(null); }}
              >
                {dnsRecords ? 'Close' : 'Cancel'}
              </button>
              {!dnsRecords && (
                <button
                  className="btn-primary"
                  onClick={handleAddDomain}
                  disabled={addingDomain}
                >
                  {addingDomain ? 'Adding...' : 'Add Domain'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Send Email Modal */}
      {showSendModal && selectedDomain && (
        <div className="modal-overlay" onClick={() => setShowSendModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '700px' }}>
            <div className="modal-header">
              <h2>Send Email via {selectedDomain.domain}</h2>
              <button className="modal-close" onClick={() => setShowSendModal(false)}>×</button>
            </div>
            
            <div className="modal-body">
              {/* Rate Limit Warning */}
              {selectedDomain.stats?.emailsSent >= 90 && (
                <div style={{
                  padding: '12px',
                  background: '#fef3c7',
                  borderRadius: '8px',
                  marginBottom: '16px',
                  fontSize: '13px',
                  color: '#92400e'
                }}>
                  <strong>Warning:</strong> You have sent {selectedDomain.stats.emailsSent} emails this hour. 
                  You're approaching the 100 emails/hour limit.
                </div>
              )}

              <div className="form-group">
                <label>To Email Address *</label>
                <input
                  type="email"
                  className="form-input"
                  placeholder="recipient@example.com"
                  value={emailForm.to}
                  onChange={(e) => setEmailForm({ ...emailForm, to: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label>Subject *</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Email subject"
                  value={emailForm.subject}
                  onChange={(e) => setEmailForm({ ...emailForm, subject: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label>Reply-To Email (Optional)</label>
                <input
                  type="email"
                  className="form-input"
                  placeholder="reply@example.com"
                  value={emailForm.replyTo}
                  onChange={(e) => setEmailForm({ ...emailForm, replyTo: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label>Email Body (HTML) *</label>
                <textarea
                  className="form-input"
                  rows="10"
                  placeholder="<html><body><h1>Hello</h1><p>Your email content here...</p></body></html>"
                  value={emailForm.html}
                  onChange={(e) => setEmailForm({ ...emailForm, html: e.target.value })}
                  style={{ fontFamily: 'monospace', fontSize: '13px' }}
                />
              </div>

              <div style={{
                padding: '12px',
                background: '#dbeafe',
                borderRadius: '8px',
                fontSize: '13px',
                color: '#1e40af'
              }}>
                <strong>From Address:</strong> noreply@{selectedDomain.domain}
              </div>
            </div>

            <div className="modal-footer">
              <button
                className="btn-secondary"
                onClick={() => setShowSendModal(false)}
              >
                Cancel
              </button>
              <button
                className="btn-primary"
                onClick={handleSendEmail}
                disabled={sendingEmail}
              >
                <FiSend /> {sendingEmail ? 'Sending...' : 'Send Email'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default UserVerifiedDomains;
