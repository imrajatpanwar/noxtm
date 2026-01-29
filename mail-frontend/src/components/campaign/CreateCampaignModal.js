import React, { useState, useEffect } from 'react';
import { FiX, FiList, FiUsers, FiUpload, FiCheck, FiPlus } from 'react-icons/fi';
import api from '../../config/api';
import './CreateCampaignModal.css';

function CreateCampaignModal({ onClose, onSuccess, editCampaign = null }) {
  const isEditMode = !!editCampaign;

  const [campaignData, setCampaignData] = useState({
    name: editCampaign?.name || '',
    subject: editCampaign?.subject || '',
    fromEmail: editCampaign?.fromEmail || editCampaign?.from || '',
    replyTo: editCampaign?.replyTo || '',
    schedule: editCampaign?.scheduledTime ? 'scheduled' : 'immediate',
    scheduledTime: editCampaign?.scheduledTime ? new Date(editCampaign.scheduledTime).toISOString().slice(0, 16) : '',
    trackingEnabled: editCampaign?.trackingEnabled ?? true,
    trackOpens: editCampaign?.trackOpens ?? true,
    trackClicks: editCampaign?.trackClicks ?? true
  });

  const [emailContent, setEmailContent] = useState(editCampaign?.content || editCampaign?.body || '');
  const [recipients, setRecipients] = useState(editCampaign?.recipients || []);
  const [recipientText, setRecipientText] = useState(editCampaign?.recipients?.join('\n') || '');
  const [emailAccounts, setEmailAccounts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [templates, setTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [activeTab, setActiveTab] = useState('details');
  const [mailLists, setMailLists] = useState([]);
  const [selectedMailLists, setSelectedMailLists] = useState([]);
  const [recipientSource, setRecipientSource] = useState('manual'); // manual, maillist

  useEffect(() => {
    fetchEmailAccounts();
    fetchTemplates();
    fetchMailLists();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
        if (response.data.accounts.length > 0 && !campaignData.fromEmail) {
          setCampaignData(prev => ({ ...prev, fromEmail: response.data.accounts[0].email }));
        }
      }
    } catch (err) {
      console.error('Error fetching email accounts:', err);
    }
  };

  const fetchMailLists = async () => {
    try {
      const response = await api.get('/contact-lists');
      if (response.data.success) {
        setMailLists(response.data.data || []);
      }
    } catch (err) {
      console.error('Error fetching mail lists:', err);
    }
  };

  const parseRecipients = () => {
    if (!recipientText.trim()) {
      setError('Please enter at least one email address');
      return;
    }

    const emails = recipientText
      .split(/[\n,]+/)
      .map(email => email.trim())
      .filter(email => email.length > 0)
      .filter(email => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email));

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

  const handleMailListToggle = (listId) => {
    setSelectedMailLists(prev => {
      if (prev.includes(listId)) {
        return prev.filter(id => id !== listId);
      }
      return [...prev, listId];
    });
  };

  const importFromMailLists = async () => {
    if (selectedMailLists.length === 0) {
      setError('Please select at least one mail list');
      return;
    }

    try {
      const allEmails = [];

      for (const listId of selectedMailLists) {
        const response = await api.get(`/contact-lists/${listId}`);
        if (response.data.success) {
          const contacts = response.data.data.contacts || [];
          // Only include valid emails
          contacts.forEach(contact => {
            if (contact.email && contact.status !== 'invalid') {
              allEmails.push(contact.email);
            }
          });
        }
      }

      // Remove duplicates
      const uniqueEmails = [...new Set(allEmails)];

      if (uniqueEmails.length > 0) {
        setRecipients(uniqueEmails);
        setRecipientText(uniqueEmails.join('\n'));
        setError(null);
      } else {
        setError('No valid emails found in selected mail lists');
      }
    } catch (err) {
      console.error('Error importing from mail lists:', err);
      setError('Failed to import from mail lists');
    }
  };

  const getMailListEmailCount = (list) => {
    return list.contacts?.length || list.contactCount || 0;
  };

  const getTotalSelectedEmails = () => {
    return mailLists
      .filter(list => selectedMailLists.includes(list._id))
      .reduce((sum, list) => sum + getMailListEmailCount(list), 0);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

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
        scheduledTime: campaignData.schedule === 'scheduled' ? campaignData.scheduledTime : null,
        trackingEnabled: campaignData.trackingEnabled,
        trackOpens: campaignData.trackOpens,
        trackClicks: campaignData.trackClicks
      };

      let response;
      if (isEditMode) {
        response = await api.put(`/campaigns/${editCampaign._id}`, payload);
      } else {
        response = await api.post('/campaigns', payload);
      }

      if (response.data.success) {
        const campaignId = response.data.data._id;

        if (campaignData.schedule === 'immediate' && !isEditMode) {
          try {
            await api.post(`/campaigns/${campaignId}/send`);
          } catch (sendErr) {
            console.error('Error sending campaign:', sendErr);
          }
        }

        onSuccess();
      }
    } catch (err) {
      console.error('Error saving campaign:', err);
      setError(err.response?.data?.message || `Failed to ${isEditMode ? 'update' : 'create'} campaign. Please try again.`);
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
    <div className="campaign-modal-overlay" onClick={onClose}>
      <div className="campaign-modal" onClick={(e) => e.stopPropagation()}>
        <div className="campaign-modal-header">
          <h2>{isEditMode ? 'Edit Campaign' : 'Create Email Campaign'}</h2>
          <button className="modal-close-btn" onClick={onClose}>
            <FiX size={20} />
          </button>
        </div>

        {error && (
          <div className="modal-error">
            {error}
          </div>
        )}

        <div className="campaign-modal-tabs">
          <button
            className={`tab-btn ${activeTab === 'details' ? 'active' : ''}`}
            onClick={() => setActiveTab('details')}
          >
            Campaign Details
          </button>
          <button
            className={`tab-btn ${activeTab === 'recipients' ? 'active' : ''}`}
            onClick={() => setActiveTab('recipients')}
          >
            Recipients ({recipients.length})
          </button>
          <button
            className={`tab-btn ${activeTab === 'content' ? 'active' : ''}`}
            onClick={() => setActiveTab('content')}
          >
            Email Content
          </button>
          <button
            className={`tab-btn ${activeTab === 'schedule' ? 'active' : ''}`}
            onClick={() => setActiveTab('schedule')}
          >
            Schedule
          </button>
        </div>

        <form onSubmit={handleSubmit} className="campaign-modal-form">
          {/* Campaign Details Tab */}
          {activeTab === 'details' && (
            <div className="form-tab-content">
              <div className="form-group">
                <label>Campaign Name *</label>
                <input
                  type="text"
                  value={campaignData.name}
                  onChange={(e) => setCampaignData({ ...campaignData, name: e.target.value })}
                  placeholder="e.g., January Testing & Marketing 2026"
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
          )}

          {/* Recipients Tab */}
          {activeTab === 'recipients' && (
            <div className="form-tab-content">
              {/* Recipient Source Toggle */}
              <div className="recipient-source-toggle">
                <button
                  type="button"
                  className={`source-btn ${recipientSource === 'maillist' ? 'active' : ''}`}
                  onClick={() => setRecipientSource('maillist')}
                >
                  <FiList /> From Mail Lists
                </button>
                <button
                  type="button"
                  className={`source-btn ${recipientSource === 'manual' ? 'active' : ''}`}
                  onClick={() => setRecipientSource('manual')}
                >
                  <FiUsers /> Manual Entry
                </button>
              </div>

              {/* Mail Lists Selection */}
              {recipientSource === 'maillist' && (
                <div className="maillist-section">
                  <label className="section-label">Select Mail Lists</label>
                  {mailLists.length === 0 ? (
                    <div className="no-maillists">
                      <FiList size={24} />
                      <p>No mail lists available. Create mail lists first to use them here.</p>
                    </div>
                  ) : (
                    <>
                      <div className="maillist-grid">
                        {mailLists.map(list => (
                          <div
                            key={list._id}
                            className={`maillist-card ${selectedMailLists.includes(list._id) ? 'selected' : ''}`}
                            onClick={() => handleMailListToggle(list._id)}
                          >
                            <div className="maillist-checkbox">
                              {selectedMailLists.includes(list._id) ? <FiCheck /> : null}
                            </div>
                            <div className="maillist-info">
                              <span className="maillist-name">{list.name}</span>
                              <span className="maillist-count">
                                {getMailListEmailCount(list).toLocaleString()} email{getMailListEmailCount(list) !== 1 ? 's' : ''}
                              </span>
                            </div>
                            {list.validated && (
                              <span className="maillist-badge validated">✓ Validated</span>
                            )}
                          </div>
                        ))}
                      </div>

                      {selectedMailLists.length > 0 && (
                        <div className="maillist-summary">
                          <span>{selectedMailLists.length} list{selectedMailLists.length !== 1 ? 's' : ''} selected • {getTotalSelectedEmails().toLocaleString()} total emails</span>
                          <button
                            type="button"
                            className="btn-import"
                            onClick={importFromMailLists}
                            disabled={loading}
                          >
                            Import Recipients
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}

              {/* Manual Entry */}
              {recipientSource === 'manual' && (
                <div className="manual-entry-section">
                  <div className="form-group">
                    <label>Email Addresses</label>
                    <p className="field-hint">Enter one email per line or comma-separated</p>
                    <textarea
                      value={recipientText}
                      onChange={(e) => setRecipientText(e.target.value)}
                      placeholder="john@example.com&#10;jane@company.com&#10;team@startup.io"
                      rows={4}
                      disabled={loading}
                      className="recipient-textarea"
                    />
                    <button
                      type="button"
                      onClick={parseRecipients}
                      className="btn-parse"
                      disabled={loading || !recipientText.trim()}
                    >
                      <FiCheck /> Parse & Validate
                    </button>
                  </div>

                  <div className="upload-section">
                    <label>Or Upload File</label>
                    <div className="file-upload-wrapper">
                      <input
                        type="file"
                        accept=".csv,.txt"
                        onChange={handleCSVUpload}
                        disabled={loading}
                        id="csv-upload"
                      />
                      <label htmlFor="csv-upload" className="file-upload-btn">
                        <FiUpload /> Upload CSV/TXT
                      </label>
                    </div>
                  </div>
                </div>
              )}

              {/* Recipients Summary */}
              {recipients.length > 0 && (
                <div className="recipient-summary">
                  <div className="summary-icon">✅</div>
                  <div className="summary-content">
                    <strong>{recipients.length.toLocaleString()}</strong> valid email{recipients.length !== 1 ? 's' : ''} ready to send
                  </div>
                  <button
                    type="button"
                    className="btn-clear-recipients"
                    onClick={() => {
                      setRecipients([]);
                      setRecipientText('');
                      setSelectedMailLists([]);
                    }}
                  >
                    Clear All
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Content Tab */}
          {activeTab === 'content' && (
            <div className="form-tab-content">
              <div className="form-group">
                <label>Message (HTML supported)</label>
                <textarea
                  value={emailContent}
                  onChange={(e) => setEmailContent(e.target.value)}
                  placeholder="Enter your email message here. You can use HTML for formatting."
                  rows={14}
                  disabled={loading}
                  style={{ fontFamily: 'monospace' }}
                />
              </div>
              <button
                type="button"
                onClick={sendTestEmail}
                className="btn-secondary"
              >
                Send Test Email
              </button>
            </div>
          )}

          {/* Schedule Tab */}
          {activeTab === 'schedule' && (
            <div className="form-tab-content">
              {/* Send Option Selection */}
              <div className="schedule-options">
                <div className="form-group">
                  <label className="radio-label schedule-radio">
                    <input
                      type="radio"
                      value="immediate"
                      checked={campaignData.schedule === 'immediate'}
                      onChange={(e) => setCampaignData({ ...campaignData, schedule: e.target.value })}
                      disabled={loading}
                    />
                    <span className="radio-dot"></span>
                    <div className="radio-content">
                      <span className="radio-title">Send immediately</span>
                      <span className="radio-desc">Campaign will be sent right after creation</span>
                    </div>
                  </label>
                </div>

                <div className="form-group">
                  <label className="radio-label schedule-radio">
                    <input
                      type="radio"
                      value="scheduled"
                      checked={campaignData.schedule === 'scheduled'}
                      onChange={(e) => {
                        // Auto-select Mon-Fri and set start date when switching to scheduled
                        setCampaignData({
                          ...campaignData,
                          schedule: e.target.value,
                          workingDays: campaignData.workingDays || [1, 2, 3, 4, 5],
                          timeSlots: campaignData.timeSlots || [{ start: '09:00', end: '12:00' }],
                          startDate: campaignData.startDate || new Date().toISOString().split('T')[0]
                        });
                      }}
                      disabled={loading}
                    />
                    <span className="radio-dot"></span>
                    <div className="radio-content">
                      <span className="radio-title">Schedule for later</span>
                      <span className="radio-desc">Set specific days and times for sending</span>
                    </div>
                  </label>
                </div>
              </div>

              {/* Calendar Schedule UI */}
              {campaignData.schedule === 'scheduled' && (
                <div className="schedule-config">
                  {/* Month/Year Selector with Navigation */}
                  <div className="calendar-nav">
                    <div className="month-selector">
                      <select
                        value={campaignData.selectedMonth || new Date().getMonth()}
                        onChange={(e) => setCampaignData({ ...campaignData, selectedMonth: parseInt(e.target.value) })}
                        className="month-dropdown"
                      >
                        {['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'].map((month, idx) => (
                          <option key={month} value={idx}>{month} {campaignData.selectedYear || new Date().getFullYear()}</option>
                        ))}
                      </select>
                    </div>
                    <div className="nav-arrows">
                      <button
                        type="button"
                        className="nav-btn"
                        onClick={() => {
                          const currentDate = new Date(campaignData.selectedYear || new Date().getFullYear(), campaignData.selectedMonth || new Date().getMonth(), campaignData.selectedDay || 1);
                          currentDate.setDate(currentDate.getDate() - 7);
                          setCampaignData({
                            ...campaignData,
                            selectedYear: currentDate.getFullYear(),
                            selectedMonth: currentDate.getMonth(),
                            selectedDay: currentDate.getDate()
                          });
                        }}
                      >
                        ‹
                      </button>
                      <button
                        type="button"
                        className="nav-btn"
                        onClick={() => {
                          const currentDate = new Date(campaignData.selectedYear || new Date().getFullYear(), campaignData.selectedMonth || new Date().getMonth(), campaignData.selectedDay || 1);
                          currentDate.setDate(currentDate.getDate() + 7);
                          setCampaignData({
                            ...campaignData,
                            selectedYear: currentDate.getFullYear(),
                            selectedMonth: currentDate.getMonth(),
                            selectedDay: currentDate.getDate()
                          });
                        }}
                      >
                        ›
                      </button>
                    </div>
                  </div>

                  {/* Week View - Day Boxes */}
                  <div className="week-view">
                    {(() => {
                      const baseDate = new Date(
                        campaignData.selectedYear || new Date().getFullYear(),
                        campaignData.selectedMonth || new Date().getMonth(),
                        campaignData.selectedDay || new Date().getDate()
                      );
                      // Get start of week (Monday)
                      const dayOfWeek = baseDate.getDay();
                      const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
                      const monday = new Date(baseDate);
                      monday.setDate(baseDate.getDate() + diff);

                      return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((dayName, index) => {
                        const date = new Date(monday);
                        // Adjust for Sunday being before Monday
                        date.setDate(monday.getDate() + (index === 0 ? -1 : index - 1));
                        const isSelected = campaignData.selectedDay === date.getDate() &&
                          campaignData.selectedMonth === date.getMonth() &&
                          campaignData.selectedYear === date.getFullYear();
                        const isToday = date.toDateString() === new Date().toDateString();

                        return (
                          <button
                            key={dayName}
                            type="button"
                            className={`day-box ${isSelected ? 'selected' : ''} ${isToday ? 'today' : ''}`}
                            onClick={() => setCampaignData({
                              ...campaignData,
                              selectedDay: date.getDate(),
                              selectedMonth: date.getMonth(),
                              selectedYear: date.getFullYear()
                            })}
                          >
                            <span className="day-name">{dayName}</span>
                            <span className="day-number">{date.getDate().toString().padStart(2, '0')}</span>
                          </button>
                        );
                      });
                    })()}
                  </div>

                  {/* Timezone */}
                  <div className="timezone-row">
                    <select className="timezone-dropdown">
                      <option>IST (GMT +5:30)</option>
                      <option>UTC (GMT +0)</option>
                      <option>EST (GMT -5)</option>
                      <option>PST (GMT -8)</option>
                    </select>
                  </div>

                  {/* Time Slot Pills - 4 suggested times + custom */}
                  <div className="time-slot-pills">
                    {['9:00 AM', '12:00 PM', '3:00 PM', '6:00 PM'].map((time) => (
                      <button
                        key={time}
                        type="button"
                        className={`time-pill ${campaignData.selectedTime === time ? 'selected' : ''}`}
                        onClick={() => {
                          setCampaignData({ ...campaignData, selectedTime: time, customTime: '' });
                          // Also update scheduledTime for backend compatibility
                          const selectedDate = new Date(
                            campaignData.selectedYear || new Date().getFullYear(),
                            campaignData.selectedMonth || new Date().getMonth(),
                            campaignData.selectedDay || new Date().getDate()
                          );
                          const [hourMin, period] = time.split(' ');
                          let [hours, minutes] = hourMin.split(':').map(Number);
                          if (period === 'PM' && hours !== 12) hours += 12;
                          if (period === 'AM' && hours === 12) hours = 0;
                          selectedDate.setHours(hours, minutes || 0);
                          setCampaignData(prev => ({
                            ...prev,
                            selectedTime: time,
                            customTime: '',
                            scheduledTime: selectedDate.toISOString().slice(0, 16)
                          }));
                        }}
                      >
                        {time}
                      </button>
                    ))}

                    {/* Custom Time Input */}
                    <div className="custom-time-wrapper">
                      <input
                        type="time"
                        className={`custom-time-input ${campaignData.customTime ? 'has-value' : ''}`}
                        value={campaignData.customTime || ''}
                        onChange={(e) => {
                          const timeValue = e.target.value;
                          if (timeValue) {
                            const [hours, minutes] = timeValue.split(':').map(Number);
                            const period = hours >= 12 ? 'PM' : 'AM';
                            const displayHours = hours % 12 || 12;
                            const displayTime = `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;

                            const selectedDate = new Date(
                              campaignData.selectedYear || new Date().getFullYear(),
                              campaignData.selectedMonth || new Date().getMonth(),
                              campaignData.selectedDay || new Date().getDate()
                            );
                            selectedDate.setHours(hours, minutes);

                            setCampaignData(prev => ({
                              ...prev,
                              customTime: timeValue,
                              selectedTime: displayTime,
                              scheduledTime: selectedDate.toISOString().slice(0, 16)
                            }));
                          }
                        }}
                      />
                      <span className="custom-time-label">
                        <FiPlus size={12} /> Custom
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Tracking Options */}
              <div className="tracking-options">
                <h4>Email Tracking</h4>
                <div className="tracking-toggle">
                  <label className="toggle-label">
                    <input
                      type="checkbox"
                      checked={campaignData.trackingEnabled}
                      onChange={(e) => setCampaignData({
                        ...campaignData,
                        trackingEnabled: e.target.checked,
                        trackOpens: e.target.checked,
                        trackClicks: e.target.checked
                      })}
                      disabled={loading}
                    />
                    <span className="toggle-switch"></span>
                    <span>Enable Email Tracking</span>
                  </label>
                  <p className="tracking-hint">Track when recipients open emails and click links</p>
                </div>

                {campaignData.trackingEnabled && (
                  <div className="tracking-sub-options">
                    <label className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={campaignData.trackOpens}
                        onChange={(e) => setCampaignData({ ...campaignData, trackOpens: e.target.checked })}
                        disabled={loading}
                      />
                      <span>Track email opens (invisible pixel)</span>
                    </label>
                    <label className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={campaignData.trackClicks}
                        onChange={(e) => setCampaignData({ ...campaignData, trackClicks: e.target.checked })}
                        disabled={loading}
                      />
                      <span>Track link clicks</span>
                    </label>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="campaign-modal-actions">
            <button
              type="button"
              onClick={onClose}
              className="btn-cancel"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={loading}
            >
              {loading ? (isEditMode ? 'Saving...' : 'Creating...') : (isEditMode ? 'Save Changes' : 'Create Campaign')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default CreateCampaignModal;
