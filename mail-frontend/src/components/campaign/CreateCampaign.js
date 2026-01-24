import React, { useState, useEffect } from 'react';
import api from '../../config/api';
import './CreateCampaign.css';

function CreateCampaign() {
  const [campaignData, setCampaignData] = useState({
    name: '',
    subject: '',
    fromEmail: '',
    replyTo: '',
    schedule: 'immediate',
    scheduledTime: ''
  });

  const [emailContent, setEmailContent] = useState('');
  const [recipients, setRecipients] = useState([]);
  const [recipientText, setRecipientText] = useState('');
  const [emailAccounts, setEmailAccounts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [templates, setTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState('');

  useEffect(() => {
    fetchEmailAccounts();
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      const response = await api.get('/email-templates');
      setTemplates(response.data.templates || []);
    } catch (err) {
      console.error('Error fetching templates:', err);
    }
  };

  const handleTemplateSelect = (templateId) => {
    setSelectedTemplate(templateId);
    if (!templateId) return;

    const template = templates.find(t => t._id === templateId);
    if (template) {
      setCampaignData(prev => ({
        ...prev,
        subject: template.subject
      }));
      setEmailContent(template.body);
    }
  };

  const fetchEmailAccounts = async () => {
    try {
      const response = await api.get('/email-accounts/by-verified-domain');
      if (response.data.success) {
        setEmailAccounts(response.data.accounts || []);
        if (response.data.accounts.length > 0) {
          setCampaignData(prev => ({ ...prev, fromEmail: response.data.accounts[0].email }));
        }
      }
    } catch (err) {
      console.error('Error fetching email accounts:', err);
    }
  };

  const parseRecipients = () => {
    if (!recipientText.trim()) {
      setError('Please enter at least one email address');
      return;
    }

    // Parse emails from textarea (comma or newline separated)
    const emails = recipientText
      .split(/[\n,]+/)
      .map(email => email.trim())
      .filter(email => email.length > 0)
      .filter(email => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)); // Basic email validation

    if (emails.length === 0) {
      setError('No valid email addresses found');
      return;
    }

    setRecipients(emails);
    setError(null);
  };

  const handleCSVUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target.result;
      const lines = text.split('\n');
      const emails = [];

      lines.forEach(line => {
        const parts = line.split(',');
        parts.forEach(part => {
          const email = part.trim();
          if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            emails.push(email);
          }
        });
      });

      if (emails.length > 0) {
        setRecipients(emails);
        setRecipientText(emails.join('\n'));
        setError(null);
      } else {
        setError('No valid email addresses found in CSV');
      }
    };

    reader.readAsText(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    // Validation
    if (!campaignData.name.trim()) {
      setError('Campaign name is required');
      return;
    }

    if (!campaignData.subject.trim()) {
      setError('Email subject is required');
      return;
    }

    if (!campaignData.fromEmail) {
      setError('Please select a from email address');
      return;
    }

    if (recipients.length === 0) {
      setError('Please add at least one recipient');
      return;
    }

    if (!emailContent.trim()) {
      setError('Email content is required');
      return;
    }

    if (campaignData.schedule === 'scheduled' && !campaignData.scheduledTime) {
      setError('Please select a scheduled time');
      return;
    }

    setLoading(true);

    try {
      const payload = {
        name: campaignData.name,
        subject: campaignData.subject,
        from: campaignData.fromEmail,
        replyTo: campaignData.replyTo || campaignData.fromEmail,
        recipients: recipients,
        content: emailContent,
        schedule: campaignData.schedule,
        scheduledTime: campaignData.schedule === 'scheduled' ? campaignData.scheduledTime : null
      };

      const response = await api.post('/campaigns', payload);

      if (response.data.success) {
        const campaignId = response.data.data._id;

        // If immediate send, trigger the send endpoint
        if (campaignData.schedule === 'immediate') {
          try {
            await api.post(`/campaigns/${campaignId}/send`);
            setSuccess(true);
          } catch (sendErr) {
            console.error('Error sending campaign:', sendErr);
            setError('Campaign created but failed to send. You can send it from the campaigns list.');
          }
        } else {
          setSuccess(true);
        }

        // Reset form
        setCampaignData({
          name: '',
          subject: '',
          fromEmail: emailAccounts[0]?.email || '',
          replyTo: '',
          schedule: 'immediate',
          scheduledTime: ''
        });
        setEmailContent('');
        setRecipients([]);
        setRecipientText('');
        setSelectedTemplate('');

        setTimeout(() => setSuccess(false), 5000);
      }
    } catch (err) {
      console.error('Error creating campaign:', err);
      setError(err.response?.data?.message || 'Failed to create campaign. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const sendTestEmail = async () => {
    if (!campaignData.fromEmail || !emailContent.trim()) {
      alert('Please fill in from email and content first');
      return;
    }

    const testEmail = prompt('Enter email address for test:');
    if (!testEmail) return;

    try {
      await api.post('/campaigns/send-test', {
        from: campaignData.fromEmail,
        to: testEmail,
        subject: campaignData.subject || 'Test Email',
        content: emailContent
      });
      alert('Test email sent successfully!');
    } catch (err) {
      alert('Failed to send test email: ' + (err.response?.data?.message || err.message));
    }
  };

  return (
    <div className="create-campaign-container">
      <div className="campaign-header">
        <h2>📧 Create Email Campaign</h2>
        <p>Send bulk emails to multiple recipients</p>
      </div>

      {error && (
        <div className="alert alert-error">
          ❌ {error}
        </div>
      )}

      {success && (
        <div className="alert alert-success">
          ✅ Campaign created successfully!
        </div>
      )}

      <form onSubmit={handleSubmit} className="campaign-form">
        {/* Campaign Details */}
        <div className="form-section">
          <h3>Campaign Details</h3>

          <div className="form-group">
            <label>Campaign Name *</label>
            <input
              type="text"
              value={campaignData.name}
              onChange={(e) => setCampaignData({ ...campaignData, name: e.target.value })}
              placeholder="e.g., Monthly Newsletter - December 2025"
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label>Use Email Template (optional)</label>
            <select
              value={selectedTemplate}
              onChange={(e) => handleTemplateSelect(e.target.value)}
              disabled={loading}
            >
              <option value="">-- Select a template --</option>
              {templates.map(template => (
                <option key={template._id} value={template._id}>
                  {template.name} ({template.category})
                </option>
              ))}
            </select>
            <small style={{ display: 'block', marginTop: '5px', color: '#666' }}>
              Selecting a template will auto-fill subject and content
            </small>
          </div>

          <div className="form-group">
            <label>Email Subject *</label>
            <input
              type="text"
              value={campaignData.subject}
              onChange={(e) => setCampaignData({ ...campaignData, subject: e.target.value })}
              placeholder="e.g., Check out our latest updates!"
              disabled={loading}
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>From Email *</label>
              <select
                value={campaignData.fromEmail}
                onChange={(e) => setCampaignData({ ...campaignData, fromEmail: e.target.value })}
                disabled={loading}
              >
                <option value="">Select sender email</option>
                {emailAccounts.map(acc => (
                  <option key={acc._id} value={acc.email}>{acc.email}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Reply-To Email (optional)</label>
              <input
                type="email"
                value={campaignData.replyTo}
                onChange={(e) => setCampaignData({ ...campaignData, replyTo: e.target.value })}
                placeholder="Defaults to from email"
                disabled={loading}
              />
            </div>
          </div>
        </div>

        {/* Recipients */}
        <div className="form-section">
          <h3>Recipients ({recipients.length})</h3>

          <div className="form-group">
            <label>Email Addresses (one per line or comma-separated)</label>
            <textarea
              value={recipientText}
              onChange={(e) => setRecipientText(e.target.value)}
              placeholder="user1@example.com&#10;user2@example.com&#10;user3@example.com"
              rows={6}
              disabled={loading}
            />
            <button
              type="button"
              onClick={parseRecipients}
              className="btn-secondary"
              style={{ marginTop: '10px' }}
            >
              Parse Recipients
            </button>
          </div>

          <div className="form-group">
            <label>Or Upload CSV File</label>
            <input
              type="file"
              accept=".csv,.txt"
              onChange={handleCSVUpload}
              disabled={loading}
            />
            <small style={{ display: 'block', marginTop: '5px', color: '#666' }}>
              CSV should contain email addresses (one per line or comma-separated)
            </small>
          </div>

          {recipients.length > 0 && (
            <div className="recipient-count">
              ✅ {recipients.length} valid email address{recipients.length !== 1 ? 'es' : ''} ready to send
            </div>
          )}
        </div>

        {/* Email Content */}
        <div className="form-section">
          <h3>Email Content</h3>

          <div className="form-group">
            <label>Message (HTML supported)</label>
            <textarea
              value={emailContent}
              onChange={(e) => setEmailContent(e.target.value)}
              placeholder="Enter your email message here. You can use HTML for formatting."
              rows={12}
              disabled={loading}
              style={{ fontFamily: 'monospace' }}
            />
            <small style={{ display: 'block', marginTop: '5px', color: '#666' }}>
              Tip: You can use HTML tags like &lt;h1&gt;, &lt;p&gt;, &lt;strong&gt;, &lt;a href=""&gt;, etc.
            </small>
          </div>
        </div>

        {/* Schedule */}
        <div className="form-section">
          <h3>When to Send</h3>

          <div className="form-group">
            <label>
              <input
                type="radio"
                value="immediate"
                checked={campaignData.schedule === 'immediate'}
                onChange={(e) => setCampaignData({ ...campaignData, schedule: e.target.value })}
                disabled={loading}
              />
              <span style={{ marginLeft: '8px' }}>Send immediately</span>
            </label>
          </div>

          <div className="form-group">
            <label>
              <input
                type="radio"
                value="scheduled"
                checked={campaignData.schedule === 'scheduled'}
                onChange={(e) => setCampaignData({ ...campaignData, schedule: e.target.value })}
                disabled={loading}
              />
              <span style={{ marginLeft: '8px' }}>Schedule for later</span>
            </label>
          </div>

          {campaignData.schedule === 'scheduled' && (
            <div className="form-group" style={{ marginLeft: '30px' }}>
              <label>Scheduled Time</label>
              <input
                type="datetime-local"
                value={campaignData.scheduledTime}
                onChange={(e) => setCampaignData({ ...campaignData, scheduledTime: e.target.value })}
                disabled={loading}
              />
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="campaign-actions">
          <button
            type="button"
            onClick={sendTestEmail}
            className="btn-secondary"
            disabled={loading}
          >
            Send Test Email
          </button>
          <button
            type="submit"
            className="btn-primary"
            disabled={loading}
          >
            {loading ? 'Creating Campaign...' : 'Create Campaign'}
          </button>
        </div>
      </form>
    </div>
  );
}

export default CreateCampaign;
