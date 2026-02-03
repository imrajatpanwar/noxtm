import React, { useState, useEffect } from 'react';
import api from '../../config/api';
import './Settings.css';

function Settings() {
  const [activeTab, setActiveTab] = useState('workspace');
  const [loading, setLoading] = useState(true);
  const [billingData, setBillingData] = useState(null);
  const [emailUsage, setEmailUsage] = useState(null);
  const [purchaseAmount, setPurchaseAmount] = useState(10000);
  const [purchasing, setPurchasing] = useState(false);
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [saving, setSaving] = useState(false);

  // Workspace state
  const [workspaceData, setWorkspaceData] = useState({
    name: '',
    description: '',
    type: 'Business',
    plan: 'Free',
    storageUsed: 0,
    storageTotal: 10,
    teamMembers: 0
  });
  const [editingWorkspace, setEditingWorkspace] = useState(false);
  const [workspaceForm, setWorkspaceForm] = useState({});

  // Preferences state
  const [preferences, setPreferences] = useState({
    defaultTracking: true,
    emailNotifications: true,
    weeklyReports: false,
    lowCreditAlert: true,
    defaultFromName: '',
    defaultReplyTo: '',
    emailSignature: ''
  });

  // Account state
  const [accountData, setAccountData] = useState({
    name: '',
    email: '',
    company: '',
    timezone: 'UTC'
  });

  // Pricing: $0.10 per 1000 emails (our cost) x3 = $0.30 per 1000 emails (user price)
  const PRICE_PER_1000 = 0.30;

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([
        fetchBillingData(),
        fetchEmailUsage(),
        fetchPreferences(),
        fetchAccountData(),
        fetchWorkspaceData()
      ]);
      setLoading(false);
    };
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchBillingData = async () => {
    try {
      const res = await api.get('/billing/info');
      if (res.data.success) {
        setBillingData(res.data.billing);
      }
    } catch (error) {
      console.error('Error fetching billing:', error);
      setBillingData({
        emailCredits: 0,
        totalPurchased: 0,
        totalUsed: 0,
        lastPurchase: null
      });
    }
  };

  const fetchEmailUsage = async () => {
    try {
      const res = await api.get('/billing/usage');
      if (res.data.success) {
        setEmailUsage(res.data.usage);
      }
    } catch (error) {
      console.error('Error fetching usage:', error);
      setEmailUsage({
        thisMonth: 0,
        lastMonth: 0,
        total: 0
      });
    }
  };

  const fetchPreferences = async () => {
    try {
      const res = await api.get('/users/preferences');
      if (res.data.success && res.data.preferences) {
        setPreferences(prev => ({ ...prev, ...res.data.preferences }));
      }
    } catch (error) {
      console.error('Error fetching preferences:', error);
    }
  };

  const fetchAccountData = async () => {
    try {
      const res = await api.get('/users/me');
      if (res.data.success && res.data.user) {
        const user = res.data.user;
        setAccountData({
          name: user.name || '',
          email: user.email || '',
          company: user.company?.name || '',
          timezone: user.timezone || 'UTC'
        });
      }
    } catch (error) {
      console.error('Error fetching account:', error);
    }
  };

  const fetchWorkspaceData = async () => {
    try {
      const res = await api.get('/users/me');
      if (res.data.success && res.data.user) {
        const user = res.data.user;
        const company = user.company || {};
        setWorkspaceData({
          name: company.name || 'My Workspace',
          description: company.description || 'Primary workspace for team collaboration',
          type: company.type || 'Business',
          plan: company.plan || 'Free',
          storageUsed: company.storageUsed || 0,
          storageTotal: company.storageTotal || 10,
          teamMembers: company.teamMembers || 1
        });
      }
    } catch (error) {
      console.error('Error fetching workspace:', error);
    }
  };

  const handleEditWorkspace = () => {
    setWorkspaceForm({
      name: workspaceData.name,
      description: workspaceData.description,
      type: workspaceData.type
    });
    setEditingWorkspace(true);
  };

  const handleCancelWorkspaceEdit = () => {
    setEditingWorkspace(false);
    setWorkspaceForm({});
  };

  const handleSaveWorkspace = async () => {
    setSaving(true);
    try {
      await api.put('/company/settings', workspaceForm);
      setWorkspaceData(prev => ({ ...prev, ...workspaceForm }));
      setEditingWorkspace(false);
      alert('Workspace updated successfully!');
    } catch (error) {
      console.error('Error saving workspace:', error);
      alert('Failed to update workspace.');
    } finally {
      setSaving(false);
    }
  };

  const handleWorkspaceFormChange = (key, value) => {
    setWorkspaceForm(prev => ({ ...prev, [key]: value }));
  };

  const calculatePrice = (emails) => {
    return ((emails / 1000) * PRICE_PER_1000).toFixed(2);
  };

  const handlePurchase = async () => {
    setPurchasing(true);
    try {
      const res = await api.post('/billing/purchase', {
        emailCredits: purchaseAmount,
        amount: calculatePrice(purchaseAmount)
      });

      if (res.data.success) {
        setBillingData(prev => ({
          ...prev,
          emailCredits: (prev?.emailCredits || 0) + purchaseAmount,
          totalPurchased: (prev?.totalPurchased || 0) + purchaseAmount,
          lastPurchase: new Date().toISOString()
        }));
        setShowPurchaseModal(false);
        alert('Email credits purchased successfully!');
      }
    } catch (error) {
      console.error('Error purchasing:', error);
      alert('Purchase failed. Please try again.');
    } finally {
      setPurchasing(false);
    }
  };

  const handlePreferenceChange = (key, value) => {
    setPreferences(prev => ({ ...prev, [key]: value }));
  };

  const handleAccountChange = (key, value) => {
    setAccountData(prev => ({ ...prev, [key]: value }));
  };

  const savePreferences = async () => {
    setSaving(true);
    try {
      await api.put('/users/preferences', preferences);
      alert('Preferences saved successfully!');
    } catch (error) {
      console.error('Error saving preferences:', error);
      alert('Failed to save preferences.');
    } finally {
      setSaving(false);
    }
  };

  const saveAccountData = async () => {
    setSaving(true);
    try {
      await api.put('/users/me', accountData);
      alert('Account updated successfully!');
    } catch (error) {
      console.error('Error updating account:', error);
      alert('Failed to update account.');
    } finally {
      setSaving(false);
    }
  };

  const emailPackages = [
    { emails: 5000, popular: false },
    { emails: 10000, popular: true },
    { emails: 25000, popular: false },
    { emails: 50000, popular: false },
    { emails: 100000, popular: false },
    { emails: 250000, popular: false }
  ];

  if (loading) {
    return (
      <div className="mail-settings-page">
        <div className="mail-settings-loading">Loading settings...</div>
      </div>
    );
  }

  return (
    <div className="mail-settings-page">
      <div className="mail-settings-header">
        <h2>Settings</h2>
        <p>Manage your account settings and billing</p>
      </div>

      {/* Settings Tabs */}
      <div className="mail-settings-tabs">
        <button
          className={`mail-settings-tab ${activeTab === 'workspace' ? 'active' : ''}`}
          onClick={() => setActiveTab('workspace')}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
            <polyline points="9 22 9 12 15 12 15 22" />
          </svg>
          Workspace
        </button>
        <button
          className={`mail-settings-tab ${activeTab === 'billing' ? 'active' : ''}`}
          onClick={() => setActiveTab('billing')}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
            <line x1="1" y1="10" x2="23" y2="10" />
          </svg>
          Billing & Credits
        </button>
        <button
          className={`mail-settings-tab ${activeTab === 'account' ? 'active' : ''}`}
          onClick={() => setActiveTab('account')}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
          Account
        </button>
        <button
          className={`mail-settings-tab ${activeTab === 'preferences' ? 'active' : ''}`}
          onClick={() => setActiveTab('preferences')}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
          Preferences
        </button>
      </div>

      {/* Workspace Tab - Minimal Design */}
      {activeTab === 'workspace' && (
        <div className="mail-settings-content">
          {/* Minimal Workspace Card */}
          <div className="ws-card">
            <div className="ws-header">
              <h3>Workspace</h3>
              {!editingWorkspace ? (
                <button className="ws-edit-btn" onClick={handleEditWorkspace}>
                  Edit
                </button>
              ) : (
                <div className="ws-actions">
                  <button className="ws-save-btn" onClick={handleSaveWorkspace} disabled={saving}>
                    {saving ? 'Saving...' : 'Save'}
                  </button>
                  <button className="ws-cancel-btn" onClick={handleCancelWorkspaceEdit} disabled={saving}>
                    Cancel
                  </button>
                </div>
              )}
            </div>

            <div className="ws-grid">
              <div className="ws-field">
                <label>Name</label>
                {editingWorkspace ? (
                  <input
                    type="text"
                    value={workspaceForm.name || ''}
                    onChange={(e) => handleWorkspaceFormChange('name', e.target.value)}
                  />
                ) : (
                  <p>{workspaceData.name}</p>
                )}
              </div>

              <div className="ws-field">
                <label>Type</label>
                {editingWorkspace ? (
                  <select
                    value={workspaceForm.type || 'Business'}
                    onChange={(e) => handleWorkspaceFormChange('type', e.target.value)}
                  >
                    <option value="Personal">Personal</option>
                    <option value="Business">Business</option>
                    <option value="Enterprise">Enterprise</option>
                  </select>
                ) : (
                  <p>{workspaceData.type}</p>
                )}
              </div>

              <div className="ws-field ws-full">
                <label>Description</label>
                {editingWorkspace ? (
                  <input
                    type="text"
                    value={workspaceForm.description || ''}
                    onChange={(e) => handleWorkspaceFormChange('description', e.target.value)}
                  />
                ) : (
                  <p>{workspaceData.description || '—'}</p>
                )}
              </div>
            </div>

            <div className="ws-divider"></div>

            <div className="ws-grid">
              <div className="ws-field">
                <label>Plan</label>
                <p className="ws-plan">{workspaceData.plan}</p>
              </div>

              <div className="ws-field">
                <label>Team Members</label>
                <p>{workspaceData.teamMembers}</p>
              </div>

              <div className="ws-field">
                <label>Storage</label>
                <p>{workspaceData.storageUsed}GB / {workspaceData.storageTotal}GB</p>
              </div>

              <div className="ws-field">
                <label>Usage</label>
                <div className="ws-progress">
                  <div
                    className="ws-progress-bar"
                    style={{ width: `${Math.min((workspaceData.storageUsed / workspaceData.storageTotal) * 100, 100)}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Billing Tab */}
      {activeTab === 'billing' && (
        <div className="mail-settings-content">
          {/* Credit Balance Card */}
          <div className="mail-credit-balance-card">
            <div className="mail-balance-header">
              <div className="mail-balance-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
                </svg>
              </div>
              <div className="mail-balance-info">
                <h3>Email Credits</h3>
                <div className="mail-balance-value">
                  {(billingData?.emailCredits || 0).toLocaleString()}
                </div>
                <p className="mail-balance-subtitle">Available credits for sending emails</p>
              </div>
              <button className="mail-buy-credits-btn" onClick={() => setShowPurchaseModal(true)}>
                + Buy Credits
              </button>
            </div>

            <div className="mail-usage-stats">
              <div className="mail-usage-stat">
                <span className="mail-stat-label">This Month</span>
                <span className="mail-stat-value">{(emailUsage?.thisMonth || 0).toLocaleString()}</span>
              </div>
              <div className="mail-usage-stat">
                <span className="mail-stat-label">Last Month</span>
                <span className="mail-stat-value">{(emailUsage?.lastMonth || 0).toLocaleString()}</span>
              </div>
              <div className="mail-usage-stat">
                <span className="mail-stat-label">Total Used</span>
                <span className="mail-stat-value">{(billingData?.totalUsed || 0).toLocaleString()}</span>
              </div>
              <div className="mail-usage-stat">
                <span className="mail-stat-label">Total Purchased</span>
                <span className="mail-stat-value">{(billingData?.totalPurchased || 0).toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Pricing Section */}
          <div className="mail-pricing-section">
            <h3>Email Pricing</h3>
            <p className="mail-pricing-subtitle">Simple, transparent pricing. No monthly fees, pay only for what you use.</p>

            <div className="mail-pricing-highlight">
              <div className="mail-price-badge">
                <span className="mail-price-amount">$0.30</span>
                <span className="mail-price-unit">per 1,000 emails</span>
              </div>
              <ul className="mail-pricing-features">
                <li>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  No monthly subscription
                </li>
                <li>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  Credits never expire
                </li>
                <li>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  Full tracking included
                </li>
                <li>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  Campaign analytics
                </li>
              </ul>
            </div>

            {/* Quick Purchase Packages */}
            <h4>Quick Purchase</h4>
            <div className="mail-email-packages">
              {emailPackages.map(pkg => (
                <div
                  key={pkg.emails}
                  className={`mail-package-card ${pkg.popular ? 'popular' : ''}`}
                  onClick={() => {
                    setPurchaseAmount(pkg.emails);
                    setShowPurchaseModal(true);
                  }}
                >
                  {pkg.popular && <span className="mail-popular-badge">Most Popular</span>}
                  <div className="mail-package-emails">{(pkg.emails).toLocaleString()}</div>
                  <div className="mail-package-label">emails</div>
                  <div className="mail-package-price">${calculatePrice(pkg.emails)}</div>
                  <button className="mail-package-btn">Select</button>
                </div>
              ))}
            </div>
          </div>

          {/* Purchase History */}
          <div className="mail-purchase-history-section">
            <h3>Purchase History</h3>
            {billingData?.lastPurchase ? (
              <div className="mail-history-item">
                <div className="mail-history-date">
                  {new Date(billingData.lastPurchase).toLocaleDateString()}
                </div>
                <div className="mail-history-details">Last purchase</div>
              </div>
            ) : (
              <p className="mail-no-history">No purchase history yet</p>
            )}
          </div>
        </div>
      )}

      {/* Account Tab */}
      {activeTab === 'account' && (
        <div className="mail-settings-content">
          <div className="mail-account-section">
            <h3>Account Information</h3>
            <div className="mail-account-form">
              <div className="mail-form-group">
                <label>Full Name</label>
                <input
                  type="text"
                  placeholder="Your Name"
                  value={accountData.name}
                  onChange={(e) => handleAccountChange('name', e.target.value)}
                />
              </div>
              <div className="mail-form-group">
                <label>Email Address</label>
                <input
                  type="email"
                  placeholder="your@email.com"
                  value={accountData.email}
                  disabled
                />
              </div>
              <div className="mail-form-group">
                <label>Company Name</label>
                <input
                  type="text"
                  placeholder="Your Company"
                  value={accountData.company}
                  onChange={(e) => handleAccountChange('company', e.target.value)}
                />
              </div>
              <div className="mail-form-group">
                <label>Timezone</label>
                <select
                  value={accountData.timezone}
                  onChange={(e) => handleAccountChange('timezone', e.target.value)}
                >
                  <option value="UTC">UTC</option>
                  <option value="America/New_York">Eastern Time (ET)</option>
                  <option value="America/Chicago">Central Time (CT)</option>
                  <option value="America/Denver">Mountain Time (MT)</option>
                  <option value="America/Los_Angeles">Pacific Time (PT)</option>
                  <option value="Europe/London">London (GMT)</option>
                  <option value="Asia/Kolkata">India (IST)</option>
                </select>
              </div>
              <button className="mail-save-btn" onClick={saveAccountData} disabled={saving}>
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>

          <div className="mail-danger-zone">
            <h3>Danger Zone</h3>
            <div className="mail-danger-item">
              <div className="mail-danger-info">
                <h4>Delete Account</h4>
                <p>Once you delete your account, there is no going back. Please be certain.</p>
              </div>
              <button className="mail-delete-btn">Delete Account</button>
            </div>
          </div>
        </div>
      )}

      {/* Preferences Tab */}
      {activeTab === 'preferences' && (
        <div className="mail-settings-content">
          <div className="mail-preferences-section">
            <h3>Email Preferences</h3>

            <div className="mail-preference-item">
              <div className="mail-preference-info">
                <h4>Default Tracking</h4>
                <p>Enable tracking by default for new campaigns</p>
              </div>
              <label className="mail-toggle-switch">
                <input
                  type="checkbox"
                  checked={preferences.defaultTracking}
                  onChange={(e) => handlePreferenceChange('defaultTracking', e.target.checked)}
                />
                <span className="mail-toggle-slider"></span>
              </label>
            </div>

            <div className="mail-preference-item">
              <div className="mail-preference-info">
                <h4>Email Notifications</h4>
                <p>Receive email notifications for campaign completions</p>
              </div>
              <label className="mail-toggle-switch">
                <input
                  type="checkbox"
                  checked={preferences.emailNotifications}
                  onChange={(e) => handlePreferenceChange('emailNotifications', e.target.checked)}
                />
                <span className="mail-toggle-slider"></span>
              </label>
            </div>

            <div className="mail-preference-item">
              <div className="mail-preference-info">
                <h4>Weekly Reports</h4>
                <p>Receive weekly email performance reports</p>
              </div>
              <label className="mail-toggle-switch">
                <input
                  type="checkbox"
                  checked={preferences.weeklyReports}
                  onChange={(e) => handlePreferenceChange('weeklyReports', e.target.checked)}
                />
                <span className="mail-toggle-slider"></span>
              </label>
            </div>

            <div className="mail-preference-item">
              <div className="mail-preference-info">
                <h4>Low Credit Alert</h4>
                <p>Get notified when credits fall below 1,000</p>
              </div>
              <label className="mail-toggle-switch">
                <input
                  type="checkbox"
                  checked={preferences.lowCreditAlert}
                  onChange={(e) => handlePreferenceChange('lowCreditAlert', e.target.checked)}
                />
                <span className="mail-toggle-slider"></span>
              </label>
            </div>
          </div>

          <div className="mail-preferences-section">
            <h3>Campaign Defaults</h3>

            <div className="mail-form-group">
              <label>Default From Name</label>
              <input
                type="text"
                placeholder="Your Name or Company"
                value={preferences.defaultFromName}
                onChange={(e) => handlePreferenceChange('defaultFromName', e.target.value)}
              />
            </div>

            <div className="mail-form-group">
              <label>Default Reply-To Email</label>
              <input
                type="email"
                placeholder="reply@yourdomain.com"
                value={preferences.defaultReplyTo}
                onChange={(e) => handlePreferenceChange('defaultReplyTo', e.target.value)}
              />
            </div>

            <div className="mail-form-group">
              <label>Email Signature</label>
              <textarea
                placeholder="Add your default email signature here..."
                rows={4}
                value={preferences.emailSignature}
                onChange={(e) => handlePreferenceChange('emailSignature', e.target.value)}
              ></textarea>
            </div>

            <button className="mail-save-btn" onClick={savePreferences} disabled={saving}>
              {saving ? 'Saving...' : 'Save Preferences'}
            </button>
          </div>
        </div>
      )}

      {/* Purchase Modal */}
      {showPurchaseModal && (
        <div className="mail-purchase-modal-overlay" onClick={() => setShowPurchaseModal(false)}>
          <div className="mail-purchase-modal" onClick={e => e.stopPropagation()}>
            <div className="mail-modal-header">
              <h3>Purchase Email Credits</h3>
              <button className="mail-close-btn" onClick={() => setShowPurchaseModal(false)}>×</button>
            </div>

            <div className="mail-modal-content">
              <div className="mail-purchase-input-group">
                <label>Number of Emails</label>
                <input
                  type="number"
                  value={purchaseAmount}
                  onChange={(e) => setPurchaseAmount(Math.max(1000, parseInt(e.target.value) || 0))}
                  min="1000"
                  step="1000"
                />
                <span className="mail-input-hint">Minimum 1,000 emails</span>
              </div>

              <div className="mail-price-summary">
                <div className="mail-summary-row">
                  <span>Email Credits</span>
                  <span>{purchaseAmount.toLocaleString()}</span>
                </div>
                <div className="mail-summary-row">
                  <span>Price per 1,000</span>
                  <span>${PRICE_PER_1000.toFixed(2)}</span>
                </div>
                <div className="mail-summary-row mail-total">
                  <span>Total</span>
                  <span>${calculatePrice(purchaseAmount)}</span>
                </div>
              </div>

              <div className="mail-payment-methods">
                <p className="mail-payment-label">Payment Method</p>
                <div className="mail-payment-options">
                  <label className="mail-payment-option">
                    <input type="radio" name="payment" value="card" defaultChecked />
                    <span className="mail-payment-icon">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
                        <line x1="1" y1="10" x2="23" y2="10" />
                      </svg>
                    </span>
                    Credit/Debit Card
                  </label>
                  <label className="mail-payment-option">
                    <input type="radio" name="payment" value="paypal" />
                    <span className="mail-payment-icon">PP</span>
                    PayPal
                  </label>
                </div>
              </div>

              <button
                className="mail-purchase-btn"
                onClick={handlePurchase}
                disabled={purchasing}
              >
                {purchasing ? 'Processing...' : `Pay $${calculatePrice(purchaseAmount)}`}
              </button>

              <p className="mail-secure-note">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
                Secure payment powered by Stripe
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Settings;
