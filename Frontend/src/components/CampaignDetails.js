import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import './CampaignDetails.css';

function CampaignDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [campaign, setCampaign] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sendingTest, setSendingTest] = useState(false);
  const [testEmail, setTestEmail] = useState('');
  const [showTestModal, setShowTestModal] = useState(false);

  useEffect(() => {
    fetchCampaignDetails();
  }, [id]);

  const fetchCampaignDetails = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5000/api/campaigns/${id}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch campaign details');
      }

      const result = await response.json();
      setCampaign(result.data);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching campaign:', err);
      setError(err.message);
      setLoading(false);
    }
  };

  const handleSendTest = async () => {
    if (!testEmail) {
      alert('Please enter a test email address');
      return;
    }

    try {
      setSendingTest(true);
      const token = localStorage.getItem('token');

      // Send test email with campaign content
      const response = await fetch(`http://localhost:5000/api/campaigns/${id}/test`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ testEmail })
      });

      if (!response.ok) {
        throw new Error('Failed to send test email');
      }

      alert(`Test email sent to ${testEmail}`);
      setShowTestModal(false);
      setTestEmail('');
    } catch (err) {
      console.error('Error sending test:', err);
      alert('Failed to send test email: ' + err.message);
    } finally {
      setSendingTest(false);
    }
  };

  const handleSendNow = async () => {
    if (!window.confirm('Are you sure you want to send this campaign now?')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5000/api/campaigns/${id}/send`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to send campaign');
      }

      alert('Campaign is being sent!');
      fetchCampaignDetails();
    } catch (err) {
      console.error('Error sending campaign:', err);
      alert('Failed to send campaign: ' + err.message);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusColor = (status) => {
    const colors = {
      draft: '#6B7280',
      scheduled: '#3B82F6',
      sending: '#F59E0B',
      sent: '#10B981',
      failed: '#EF4444',
      paused: '#8B5CF6'
    };
    return colors[status] || '#6B7280';
  };

  const getSuccessRate = () => {
    if (!campaign || campaign.stats.totalRecipients === 0) return 0;
    return ((campaign.stats.sent / campaign.stats.totalRecipients) * 100).toFixed(1);
  };

  if (loading) {
    return (
      <div className="campaign-details-container">
        <div className="loading-state">Loading campaign details...</div>
      </div>
    );
  }

  if (error || !campaign) {
    return (
      <div className="campaign-details-container">
        <div className="error-state">
          <h2>Campaign not found</h2>
          <p>{error || 'The campaign you are looking for does not exist.'}</p>
          <button className="btn-primary" onClick={() => navigate('/campaigns')}>
            Back to Campaigns
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="campaign-details-container">
      {/* Header */}
      <div className="details-header">
        <button className="btn-back" onClick={() => navigate('/campaigns')}>
          ← Back to Campaigns
        </button>
        <div className="header-actions">
          {campaign.status === 'draft' && (
            <>
              <button
                className="btn-test"
                onClick={() => setShowTestModal(true)}
              >
                📧 Send Test
              </button>
              <button
                className="btn-send"
                onClick={handleSendNow}
              >
                Send Now
              </button>
            </>
          )}
        </div>
      </div>

      {/* Campaign Title */}
      <div className="campaign-title-section">
        <h1>{campaign.name}</h1>
        <span
          className="status-badge-large"
          style={{ backgroundColor: getStatusColor(campaign.status) }}
        >
          {campaign.status.toUpperCase()}
        </span>
      </div>

      {campaign.description && (
        <p className="campaign-description-full">{campaign.description}</p>
      )}

      {/* Statistics Cards */}
      <div className="stats-cards-grid">
        <div className="stat-card-large">
          <div className="stat-icon" style={{ backgroundColor: '#3B82F6' }}>👥</div>
          <div className="stat-content">
            <div className="stat-label">Total Recipients</div>
            <div className="stat-value-large">{campaign.stats.totalRecipients}</div>
          </div>
        </div>

        <div className="stat-card-large">
          <div className="stat-icon" style={{ backgroundColor: '#10B981' }}>✅</div>
          <div className="stat-content">
            <div className="stat-label">Successfully Sent</div>
            <div className="stat-value-large">{campaign.stats.sent}</div>
          </div>
        </div>

        <div className="stat-card-large">
          <div className="stat-icon" style={{ backgroundColor: '#F59E0B' }}>⏳</div>
          <div className="stat-content">
            <div className="stat-label">Pending</div>
            <div className="stat-value-large">{campaign.stats.pending}</div>
          </div>
        </div>

        <div className="stat-card-large">
          <div className="stat-icon" style={{ backgroundColor: '#EF4444' }}>❌</div>
          <div className="stat-content">
            <div className="stat-label">Failed</div>
            <div className="stat-value-large">{campaign.stats.failed}</div>
          </div>
        </div>
      </div>

      {/* Success Rate */}
      <div className="success-rate-section">
        <h3>Success Rate</h3>
        <div className="progress-bar">
          <div
            className="progress-fill"
            style={{ width: `${getSuccessRate()}%` }}
          ></div>
        </div>
        <span className="progress-text">{getSuccessRate()}%</span>
      </div>

      {/* Campaign Details Grid */}
      <div className="details-grid">
        {/* Email Details */}
        <div className="detail-section">
          <h3>📧 Email Details</h3>
          <div className="detail-item">
            <span className="detail-label">Subject:</span>
            <span className="detail-value">{campaign.subject}</span>
          </div>
          <div className="detail-item">
            <span className="detail-label">From:</span>
            <span className="detail-value">{campaign.fromName} &lt;{campaign.fromEmail}&gt;</span>
          </div>
          <div className="detail-item">
            <span className="detail-label">Reply-To:</span>
            <span className="detail-value">{campaign.replyTo}</span>
          </div>
        </div>

        {/* Campaign Info */}
        <div className="detail-section">
          <h3>ℹ️ Campaign Info</h3>
          <div className="detail-item">
            <span className="detail-label">Created:</span>
            <span className="detail-value">{formatDate(campaign.createdAt)}</span>
          </div>
          {campaign.sentAt && (
            <div className="detail-item">
              <span className="detail-label">Sent At:</span>
              <span className="detail-value">{formatDate(campaign.sentAt)}</span>
            </div>
          )}
          {campaign.scheduledAt && (
            <div className="detail-item">
              <span className="detail-label">Scheduled For:</span>
              <span className="detail-value">{formatDate(campaign.scheduledAt)}</span>
            </div>
          )}
          <div className="detail-item">
            <span className="detail-label">Created By:</span>
            <span className="detail-value">{campaign.createdBy?.fullName || 'Unknown'}</span>
          </div>
        </div>
      </div>

      {/* Email Content Preview */}
      <div className="content-preview-section">
        <h3>📄 Email Content</h3>
        <div className="content-preview">
          <div className="preview-subject">
            <strong>Subject:</strong> {campaign.subject}
          </div>
          <div className="preview-body" dangerouslySetInnerHTML={{ __html: campaign.body }} />
        </div>
      </div>

      {/* Contact Lists */}
      {campaign.contactLists && campaign.contactLists.length > 0 && (
        <div className="lists-section">
          <h3>📋 Contact Lists Used</h3>
          <div className="lists-chips">
            {campaign.contactLists.map(list => (
              <div key={list._id} className="list-chip">
                {list.name}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recipients Table (if sent or sending) */}
      {campaign.recipients && campaign.recipients.length > 0 && ['sending', 'sent', 'failed'].includes(campaign.status) && (
        <div className="recipients-section">
          <h3>📨 Recipients ({campaign.recipients.length})</h3>
          <div className="recipients-table-container">
            <table className="recipients-table">
              <thead>
                <tr>
                  <th>Email</th>
                  <th>Name</th>
                  <th>Status</th>
                  <th>Sent At</th>
                  <th>Error</th>
                </tr>
              </thead>
              <tbody>
                {campaign.recipients.slice(0, 50).map((recipient, index) => (
                  <tr key={index}>
                    <td className="recipient-email">{recipient.email}</td>
                    <td>{recipient.name || '-'}</td>
                    <td>
                      <span
                        className="recipient-status"
                        style={{
                          backgroundColor:
                            recipient.status === 'sent' ? '#D1FAE5' :
                            recipient.status === 'failed' ? '#FEE2E2' :
                            recipient.status === 'bounced' ? '#FEF3C7' :
                            '#F3F4F6',
                          color:
                            recipient.status === 'sent' ? '#065F46' :
                            recipient.status === 'failed' ? '#991B1B' :
                            recipient.status === 'bounced' ? '#92400E' :
                            '#6B7280'
                        }}
                      >
                        {recipient.status}
                      </span>
                    </td>
                    <td>{recipient.sentAt ? formatDate(recipient.sentAt) : '-'}</td>
                    <td className="recipient-error">{recipient.error || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {campaign.recipients.length > 50 && (
              <p className="table-note">Showing first 50 of {campaign.recipients.length} recipients</p>
            )}
          </div>
        </div>
      )}

      {/* Test Email Modal */}
      {showTestModal && (
        <div className="noxtm-overlay" onClick={() => setShowTestModal(false)}>
          <div className="modal-content-small" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Send Test Email</h2>
              <button className="modal-close" onClick={() => setShowTestModal(false)}>
                &times;
              </button>
            </div>
            <div className="modal-body">
              <p>Send a test email to verify how your campaign looks:</p>
              <div className="form-group">
                <label>Test Email Address</label>
                <input
                  type="email"
                  className="form-input"
                  placeholder="your.email@example.com"
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                />
              </div>
            </div>
            <div className="modal-footer">
              <button
                className="btn-secondary"
                onClick={() => setShowTestModal(false)}
              >
                Cancel
              </button>
              <button
                className="btn-primary"
                onClick={handleSendTest}
                disabled={sendingTest || !testEmail}
              >
                {sendingTest ? 'Sending...' : 'Send Test'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default CampaignDetails;
