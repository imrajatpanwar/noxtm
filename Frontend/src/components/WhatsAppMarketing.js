import React, { useState, useEffect, useContext, useRef, useCallback } from 'react';
import { MessagingContext } from '../contexts/MessagingContext';
import { WhatsAppProvider, useWhatsApp } from '../contexts/WhatsAppContext';
import { QRCodeSVG } from 'qrcode.react';
import './WhatsAppMarketing.css';

// =====================================================
// MAIN WRAPPER - Provides WhatsApp context with socket
// =====================================================
function WhatsAppMarketing() {
  const { socket } = useContext(MessagingContext);

  return (
    <WhatsAppProvider socket={socket}>
      <WhatsAppMarketingInner />
    </WhatsAppProvider>
  );
}

// =====================================================
// INNER COMPONENT - Has access to WhatsApp context
// =====================================================
function WhatsAppMarketingInner() {
  const [activeTab, setActiveTab] = useState('dashboard');

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: '📊' },
    { id: 'accounts', label: 'Accounts', icon: '📱' },
    { id: 'chats', label: 'Chats', icon: '💬' },
    { id: 'campaigns', label: 'Campaigns', icon: '📢' },
    { id: 'chatbot', label: 'Chatbot', icon: '🤖' }
  ];

  return (
    <div className="wa-container">
      <div className="wa-header">
        <h1>WhatsApp Marketing</h1>
        <div className="wa-tabs">
          {tabs.map(tab => (
            <button
              key={tab.id}
              className={`wa-tab ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              <span className="wa-tab-icon">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="wa-content">
        {activeTab === 'dashboard' && <DashboardTab />}
        {activeTab === 'accounts' && <AccountsTab />}
        {activeTab === 'chats' && <ChatsTab />}
        {activeTab === 'campaigns' && <CampaignsTab />}
        {activeTab === 'chatbot' && <ChatbotTab />}
      </div>
    </div>
  );
}

// =====================================================
// DASHBOARD TAB
// =====================================================
function DashboardTab() {
  const { dashboard, fetchDashboard } = useWhatsApp();

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  if (!dashboard) {
    return <div className="wa-loading">Loading dashboard...</div>;
  }

  return (
    <div className="wa-dashboard">
      <div className="wa-stats-grid">
        <div className="wa-stat-card">
          <div className="wa-stat-label">Connected Accounts</div>
          <div className="wa-stat-value">{dashboard.accounts?.filter(a => a.status === 'connected').length || 0}</div>
          <div className="wa-stat-sub">of {dashboard.accounts?.length || 0} total</div>
        </div>
        <div className="wa-stat-card">
          <div className="wa-stat-label">Total Contacts</div>
          <div className="wa-stat-value">{dashboard.totalContacts || 0}</div>
        </div>
        <div className="wa-stat-card">
          <div className="wa-stat-label">Messages Today</div>
          <div className="wa-stat-value">{dashboard.messagesToday || 0}</div>
        </div>
        <div className="wa-stat-card">
          <div className="wa-stat-label">Active Campaigns</div>
          <div className="wa-stat-value">{dashboard.activeCampaigns || 0}</div>
        </div>
        <div className="wa-stat-card">
          <div className="wa-stat-label">Active Rules</div>
          <div className="wa-stat-value">{dashboard.activeRules || 0}</div>
        </div>
      </div>

      {dashboard.accounts && dashboard.accounts.length > 0 && (
        <div className="wa-section">
          <h3>Account Status</h3>
          <div className="wa-account-list">
            {dashboard.accounts.map(acc => (
              <div key={acc._id} className="wa-account-row">
                <div className="wa-account-avatar">
                  {acc.profilePicture ? (
                    <img src={acc.profilePicture} alt="" />
                  ) : (
                    <div className="wa-avatar-placeholder">📱</div>
                  )}
                </div>
                <div className="wa-account-info">
                  <div className="wa-account-name">{acc.displayName || acc.phoneNumber}</div>
                  <div className="wa-account-phone">{acc.phoneNumber || 'Not connected'}</div>
                </div>
                <div className={`wa-status-badge ${acc.status}`}>
                  {acc.status}
                </div>
                <div className="wa-account-msgs">
                  {acc.dailyMessageCount || 0} msgs today
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// =====================================================
// ACCOUNTS TAB
// =====================================================
function AccountsTab() {
  const {
    accounts, fetchAccounts, linkAccount, reconnectAccount,
    disconnectAccount, removeAccount, updateAccountSettings,
    setDefaultAccount, qrCode, linkingAccountId, loading
  } = useWhatsApp();

  const [showLinkModal, setShowLinkModal] = useState(false);
  const [linkName, setLinkName] = useState('');
  const [editingSettings, setEditingSettings] = useState(null);
  const [settingsForm, setSettingsForm] = useState({});

  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  const handleLink = async () => {
    try {
      await linkAccount(linkName || 'My WhatsApp');
      setShowLinkModal(true);
      setLinkName('');
    } catch (e) {
      alert('Failed to link account: ' + (e.response?.data?.message || e.message));
    }
  };

  const handleRemove = async (id) => {
    if (window.confirm('Remove this account? All messages and data will be deleted.')) {
      try {
        await removeAccount(id);
      } catch (e) {
        alert('Failed: ' + e.message);
      }
    }
  };

  const handleSaveSettings = async () => {
    if (!editingSettings) return;
    try {
      await updateAccountSettings(editingSettings, settingsForm);
      setEditingSettings(null);
    } catch (e) {
      alert('Failed: ' + e.message);
    }
  };

  return (
    <div className="wa-accounts">
      <div className="wa-section-header">
        <h2>WhatsApp Accounts</h2>
        <button className="wa-btn wa-btn-primary" onClick={handleLink} disabled={loading}>
          + Link New Account
        </button>
      </div>

      {/* QR Code Modal */}
      {(showLinkModal || qrCode) && (
        <div className="wa-modal-overlay" onClick={() => { setShowLinkModal(false); }}>
          <div className="wa-modal" onClick={e => e.stopPropagation()}>
            <div className="wa-modal-header">
              <h3>Link WhatsApp Account</h3>
              <button className="wa-modal-close" onClick={() => setShowLinkModal(false)}>×</button>
            </div>
            <div className="wa-modal-body wa-qr-container">
              {qrCode ? (
                <>
                  <QRCodeSVG value={qrCode} size={256} level="M" />
                  <p className="wa-qr-hint">Scan this QR code with WhatsApp on your phone</p>
                  <p className="wa-qr-steps">
                    1. Open WhatsApp on your phone<br />
                    2. Tap <strong>Menu</strong> or <strong>Settings</strong><br />
                    3. Tap <strong>Linked Devices</strong><br />
                    4. Tap <strong>Link a Device</strong><br />
                    5. Point your phone camera at this QR code
                  </p>
                </>
              ) : (
                <div className="wa-loading">
                  <div className="wa-spinner"></div>
                  <p>Generating QR code...</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {editingSettings && (
        <div className="wa-modal-overlay" onClick={() => setEditingSettings(null)}>
          <div className="wa-modal" onClick={e => e.stopPropagation()}>
            <div className="wa-modal-header">
              <h3>Account Settings</h3>
              <button className="wa-modal-close" onClick={() => setEditingSettings(null)}>×</button>
            </div>
            <div className="wa-modal-body">
              <div className="wa-form-group">
                <label>Daily Message Limit</label>
                <input type="number" value={settingsForm.dailyLimit || 500}
                  onChange={e => setSettingsForm({ ...settingsForm, dailyLimit: parseInt(e.target.value) })} />
              </div>
              <div className="wa-form-row">
                <div className="wa-form-group">
                  <label>Min Delay (sec)</label>
                  <input type="number" value={settingsForm.delayMin || 3}
                    onChange={e => setSettingsForm({ ...settingsForm, delayMin: parseInt(e.target.value) })} />
                </div>
                <div className="wa-form-group">
                  <label>Max Delay (sec)</label>
                  <input type="number" value={settingsForm.delayMax || 8}
                    onChange={e => setSettingsForm({ ...settingsForm, delayMax: parseInt(e.target.value) })} />
                </div>
              </div>
              <div className="wa-form-row">
                <div className="wa-form-group">
                  <label>Send Hours Start</label>
                  <input type="number" min="0" max="23" value={settingsForm.sendHoursStart || 8}
                    onChange={e => setSettingsForm({ ...settingsForm, sendHoursStart: parseInt(e.target.value) })} />
                </div>
                <div className="wa-form-group">
                  <label>Send Hours End</label>
                  <input type="number" min="0" max="24" value={settingsForm.sendHoursEnd || 22}
                    onChange={e => setSettingsForm({ ...settingsForm, sendHoursEnd: parseInt(e.target.value) })} />
                </div>
              </div>
              <div className="wa-form-group">
                <label className="wa-checkbox-label">
                  <input type="checkbox" checked={settingsForm.typingSimulation !== false}
                    onChange={e => setSettingsForm({ ...settingsForm, typingSimulation: e.target.checked })} />
                  Typing Simulation (anti-ban)
                </label>
              </div>
              <div className="wa-form-actions">
                <button className="wa-btn wa-btn-secondary" onClick={() => setEditingSettings(null)}>Cancel</button>
                <button className="wa-btn wa-btn-primary" onClick={handleSaveSettings}>Save</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Account Cards */}
      <div className="wa-account-cards">
        {accounts.length === 0 ? (
          <div className="wa-empty">
            <p>No WhatsApp accounts linked yet</p>
            <p style={{ color: '#888', fontSize: '0.85rem' }}>Click "Link New Account" to get started</p>
          </div>
        ) : (
          accounts.map(acc => (
            <div key={acc._id} className="wa-account-card">
              <div className="wa-account-card-header">
                <div className="wa-account-avatar-lg">
                  {acc.profilePicture ? (
                    <img src={acc.profilePicture} alt="" />
                  ) : (
                    <div className="wa-avatar-placeholder-lg">📱</div>
                  )}
                </div>
                <div>
                  <h4>{acc.displayName || 'WhatsApp'}</h4>
                  <span className="wa-phone">{acc.phoneNumber || 'Connecting...'}</span>
                </div>
                <div className={`wa-status-badge ${acc.status}`}>
                  {acc.status}
                </div>
              </div>

              <div className="wa-account-card-body">
                <div className="wa-account-stat">
                  <span>Today:</span> {acc.dailyMessageCount || 0} / {acc.settings?.dailyLimit || 500}
                </div>
                {acc.isDefault && <span className="wa-default-badge">Default</span>}
              </div>

              <div className="wa-account-card-actions">
                {acc.status === 'connected' && (
                  <>
                    <button className="wa-btn wa-btn-sm" onClick={() => disconnectAccount(acc._id)}>Disconnect</button>
                    {!acc.isDefault && (
                      <button className="wa-btn wa-btn-sm" onClick={() => setDefaultAccount(acc._id)}>Set Default</button>
                    )}
                  </>
                )}
                {(acc.status === 'disconnected' || acc.status === 'connecting') && (
                  <button className="wa-btn wa-btn-sm wa-btn-primary" onClick={() => reconnectAccount(acc._id)}>Reconnect</button>
                )}
                <button className="wa-btn wa-btn-sm" onClick={() => {
                  setEditingSettings(acc._id);
                  setSettingsForm(acc.settings || {});
                }}>Settings</button>
                <button className="wa-btn wa-btn-sm wa-btn-danger" onClick={() => handleRemove(acc._id)}>Remove</button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// =====================================================
// CHATS TAB
// =====================================================
function ChatsTab() {
  const { accounts, contacts, messages, fetchContacts, fetchMessages, sendMessage } = useWhatsApp();
  const [selectedAccount, setSelectedAccount] = useState('');
  const [selectedContact, setSelectedContact] = useState(null);
  const [messageInput, setMessageInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef(null);

  const connectedAccounts = accounts.filter(a => a.status === 'connected');

  useEffect(() => {
    if (connectedAccounts.length > 0 && !selectedAccount) {
      const def = connectedAccounts.find(a => a.isDefault) || connectedAccounts[0];
      setSelectedAccount(def._id);
    }
  }, [connectedAccounts, selectedAccount]);

  useEffect(() => {
    if (selectedAccount) {
      fetchContacts({ accountId: selectedAccount, search: searchQuery || undefined });
    }
  }, [selectedAccount, searchQuery, fetchContacts]);

  useEffect(() => {
    if (selectedContact) {
      fetchMessages(selectedContact._id);
    }
  }, [selectedContact, fetchMessages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, selectedContact]);

  const handleSend = async () => {
    if (!messageInput.trim() || !selectedContact || !selectedAccount || sending) return;
    setSending(true);
    try {
      await sendMessage(selectedAccount, selectedContact._id, selectedContact.whatsappId, messageInput.trim());
      setMessageInput('');
    } catch (e) {
      alert('Send failed: ' + e.message);
    } finally {
      setSending(false);
    }
  };

  const contactMessages = selectedContact ? (messages[selectedContact._id] || []) : [];

  return (
    <div className="wa-chats">
      {/* Left Panel - Contact List */}
      <div className="wa-chat-sidebar">
        <div className="wa-chat-sidebar-header">
          <select
            className="wa-select"
            value={selectedAccount}
            onChange={e => { setSelectedAccount(e.target.value); setSelectedContact(null); }}
          >
            <option value="">Select Account</option>
            {connectedAccounts.map(a => (
              <option key={a._id} value={a._id}>{a.displayName || a.phoneNumber}</option>
            ))}
          </select>
          <input
            className="wa-search-input"
            placeholder="Search contacts..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="wa-contact-list">
          {contacts.length === 0 ? (
            <div className="wa-empty-sm">No contacts yet</div>
          ) : (
            contacts.map(contact => (
              <div
                key={contact._id}
                className={`wa-contact-item ${selectedContact?._id === contact._id ? 'active' : ''}`}
                onClick={() => setSelectedContact(contact)}
              >
                <div className="wa-contact-avatar">
                  {contact.profilePicture ? (
                    <img src={contact.profilePicture} alt="" />
                  ) : (
                    <div className="wa-avatar-sm">{(contact.pushName || contact.phoneNumber || '?')[0]}</div>
                  )}
                </div>
                <div className="wa-contact-details">
                  <div className="wa-contact-name">{contact.pushName || contact.phoneNumber}</div>
                  <div className="wa-contact-preview">
                    {contact.lastMessageDirection === 'outbound' && <span style={{color:'#25d366'}}>✓ </span>}
                    {contact.lastMessagePreview || 'No messages yet'}
                  </div>
                </div>
                {contact.unreadCount > 0 && (
                  <div className="wa-unread-badge">{contact.unreadCount}</div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Right Panel - Messages */}
      <div className="wa-chat-main">
        {selectedContact ? (
          <>
            <div className="wa-chat-header">
              <div className="wa-chat-header-info">
                <h3>{selectedContact.pushName || selectedContact.phoneNumber}</h3>
                <span className="wa-chat-phone">{selectedContact.phoneNumber}</span>
              </div>
              {selectedContact.tags?.length > 0 && (
                <div className="wa-chat-tags">
                  {selectedContact.tags.map(tag => (
                    <span key={tag} className="wa-tag">{tag}</span>
                  ))}
                </div>
              )}
            </div>

            <div className="wa-messages-area">
              {contactMessages.map((msg, i) => (
                <div key={msg._id || i} className={`wa-message ${msg.direction}`}>
                  <div className="wa-message-bubble">
                    {msg.type !== 'text' && msg.mediaUrl && (
                      <div className="wa-message-media">
                        {msg.type === 'image' && <img src={msg.mediaUrl} alt="" />}
                        {msg.type === 'video' && <video src={msg.mediaUrl} controls />}
                        {msg.type === 'audio' && <audio src={msg.mediaUrl} controls />}
                        {msg.type === 'document' && <a href={msg.mediaUrl} target="_blank" rel="noopener noreferrer">📄 {msg.mediaFilename || 'Document'}</a>}
                      </div>
                    )}
                    {msg.content && <div className="wa-message-text">{msg.content}</div>}
                    <div className="wa-message-meta">
                      <span className="wa-message-time">
                        {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      {msg.direction === 'outbound' && (
                        <span className="wa-message-status">
                          {msg.status === 'read' ? '✓✓' : msg.status === 'delivered' ? '✓✓' : msg.status === 'sent' ? '✓' : '⏳'}
                        </span>
                      )}
                      {msg.isAutomated && <span className="wa-auto-badge">🤖</span>}
                    </div>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            <div className="wa-chat-input">
              <input
                className="wa-message-input"
                placeholder="Type a message..."
                value={messageInput}
                onChange={e => setMessageInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
                disabled={sending}
              />
              <button
                className="wa-send-btn"
                onClick={handleSend}
                disabled={!messageInput.trim() || sending}
              >
                {sending ? '...' : '➤'}
              </button>
            </div>
          </>
        ) : (
          <div className="wa-no-chat">
            <div className="wa-no-chat-icon">💬</div>
            <p>Select a contact to start chatting</p>
          </div>
        )}
      </div>
    </div>
  );
}

// =====================================================
// CAMPAIGNS TAB
// =====================================================
function CampaignsTab() {
  const {
    accounts, campaigns, fetchCampaigns, createCampaign,
    startCampaign, pauseCampaign, resumeCampaign, deleteCampaign,
    campaignProgress
  } = useWhatsApp();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [form, setForm] = useState({
    name: '', message: '', accountId: '', targetTags: '', scheduledAt: ''
  });

  const connectedAccounts = accounts.filter(a => a.status === 'connected');

  useEffect(() => {
    fetchCampaigns();
  }, [fetchCampaigns]);

  const handleCreate = async () => {
    if (!form.name || !form.message || !form.accountId) {
      alert('Please fill in name, account, and message');
      return;
    }
    try {
      const tags = form.targetTags ? form.targetTags.split(',').map(t => t.trim()).filter(Boolean) : [];
      await createCampaign({
        accountId: form.accountId,
        name: form.name,
        message: form.message,
        targetTags: tags,
        scheduledAt: form.scheduledAt || undefined
      });
      setShowCreateModal(false);
      setForm({ name: '', message: '', accountId: '', targetTags: '', scheduledAt: '' });
    } catch (e) {
      alert('Failed: ' + (e.response?.data?.message || e.message));
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      draft: '#888', scheduled: '#f0ad4e', sending: '#25d366',
      paused: '#f0ad4e', completed: '#5cb85c', failed: '#d9534f'
    };
    return colors[status] || '#888';
  };

  return (
    <div className="wa-campaigns">
      <div className="wa-section-header">
        <h2>Campaigns</h2>
        <button className="wa-btn wa-btn-primary" onClick={() => setShowCreateModal(true)}>
          + New Campaign
        </button>
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="wa-modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="wa-modal wa-modal-lg" onClick={e => e.stopPropagation()}>
            <div className="wa-modal-header">
              <h3>Create Campaign</h3>
              <button className="wa-modal-close" onClick={() => setShowCreateModal(false)}>×</button>
            </div>
            <div className="wa-modal-body">
              <div className="wa-form-group">
                <label>Campaign Name *</label>
                <input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Product Launch" />
              </div>
              <div className="wa-form-group">
                <label>WhatsApp Account *</label>
                <select value={form.accountId} onChange={e => setForm({ ...form, accountId: e.target.value })}>
                  <option value="">Select account</option>
                  {connectedAccounts.map(a => (
                    <option key={a._id} value={a._id}>{a.displayName || a.phoneNumber}</option>
                  ))}
                </select>
              </div>
              <div className="wa-form-group">
                <label>Message * <span className="wa-hint">Use {'{{name}}'} for personalization</span></label>
                <textarea value={form.message} onChange={e => setForm({ ...form, message: e.target.value })}
                  placeholder="Hi {{name}}, check out our new..." rows={5} />
              </div>
              <div className="wa-form-group">
                <label>Target Tags <span className="wa-hint">Comma-separated contact tags</span></label>
                <input type="text" value={form.targetTags} onChange={e => setForm({ ...form, targetTags: e.target.value })}
                  placeholder="e.g. customer, vip" />
              </div>
              <div className="wa-form-group">
                <label>Schedule (optional)</label>
                <input type="datetime-local" value={form.scheduledAt}
                  onChange={e => setForm({ ...form, scheduledAt: e.target.value })} />
              </div>
              <div className="wa-form-actions">
                <button className="wa-btn wa-btn-secondary" onClick={() => setShowCreateModal(false)}>Cancel</button>
                <button className="wa-btn wa-btn-primary" onClick={handleCreate}>Create Campaign</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Campaign List */}
      <div className="wa-campaign-list">
        {campaigns.length === 0 ? (
          <div className="wa-empty">
            <p>No campaigns yet</p>
            <p style={{ color: '#888', fontSize: '0.85rem' }}>Create a campaign to send bulk messages to your contacts</p>
          </div>
        ) : (
          campaigns.map(c => {
            const progress = campaignProgress[c._id];
            return (
              <div key={c._id} className="wa-campaign-card">
                <div className="wa-campaign-header">
                  <h4>{c.name}</h4>
                  <span className="wa-status-badge" style={{ background: getStatusColor(c.status) }}>
                    {c.status}
                  </span>
                </div>

                <div className="wa-campaign-stats">
                  <div className="wa-campaign-stat">
                    <span className="wa-stat-num">{c.stats?.total || 0}</span>
                    <span className="wa-stat-lbl">Total</span>
                  </div>
                  <div className="wa-campaign-stat">
                    <span className="wa-stat-num">{c.stats?.sent || 0}</span>
                    <span className="wa-stat-lbl">Sent</span>
                  </div>
                  <div className="wa-campaign-stat">
                    <span className="wa-stat-num">{c.stats?.delivered || 0}</span>
                    <span className="wa-stat-lbl">Delivered</span>
                  </div>
                  <div className="wa-campaign-stat">
                    <span className="wa-stat-num">{c.stats?.failed || 0}</span>
                    <span className="wa-stat-lbl">Failed</span>
                  </div>
                </div>

                {progress && progress.status === 'sending' && (
                  <div className="wa-progress-bar">
                    <div className="wa-progress-fill" style={{ width: `${progress.progress || 0}%` }} />
                    <span className="wa-progress-text">{progress.progress || 0}%</span>
                  </div>
                )}

                <div className="wa-campaign-actions">
                  {c.status === 'draft' || c.status === 'scheduled' ? (
                    <>
                      <button className="wa-btn wa-btn-sm wa-btn-primary" onClick={() => startCampaign(c._id)}>Start</button>
                      <button className="wa-btn wa-btn-sm wa-btn-danger" onClick={() => deleteCampaign(c._id)}>Delete</button>
                    </>
                  ) : c.status === 'sending' ? (
                    <button className="wa-btn wa-btn-sm" onClick={() => pauseCampaign(c._id)}>Pause</button>
                  ) : c.status === 'paused' ? (
                    <>
                      <button className="wa-btn wa-btn-sm wa-btn-primary" onClick={() => resumeCampaign(c._id)}>Resume</button>
                      <button className="wa-btn wa-btn-sm wa-btn-danger" onClick={() => deleteCampaign(c._id)}>Delete</button>
                    </>
                  ) : (
                    <button className="wa-btn wa-btn-sm wa-btn-danger" onClick={() => deleteCampaign(c._id)}>Delete</button>
                  )}
                </div>

                <div className="wa-campaign-meta">
                  Created {new Date(c.createdAt).toLocaleDateString()}
                  {c.accountId?.displayName && ` • ${c.accountId.displayName}`}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

// =====================================================
// CHATBOT TAB
// =====================================================
function ChatbotTab() {
  const {
    chatbotRules, fetchChatbotRules, createChatbotRule,
    updateChatbotRule, deleteChatbotRule, accounts
  } = useWhatsApp();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingRule, setEditingRule] = useState(null);
  const [form, setForm] = useState({
    name: '', accountId: '', triggerType: 'keyword', triggerValue: '',
    responseType: 'text', responseContent: '', aiPrompt: '',
    priority: 100, cooldownMinutes: 5, isActive: true
  });

  useEffect(() => {
    fetchChatbotRules();
  }, [fetchChatbotRules]);

  const resetForm = () => {
    setForm({
      name: '', accountId: '', triggerType: 'keyword', triggerValue: '',
      responseType: 'text', responseContent: '', aiPrompt: '',
      priority: 100, cooldownMinutes: 5, isActive: true
    });
  };

  const handleCreate = async () => {
    if (!form.name || !form.triggerType || !form.responseType) {
      alert('Name, trigger type, and response type are required');
      return;
    }
    try {
      await createChatbotRule({
        ...form,
        accountId: form.accountId || undefined
      });
      setShowCreateModal(false);
      resetForm();
    } catch (e) {
      alert('Failed: ' + (e.response?.data?.message || e.message));
    }
  };

  const handleUpdate = async () => {
    if (!editingRule) return;
    try {
      await updateChatbotRule(editingRule, {
        ...form,
        accountId: form.accountId || null
      });
      setEditingRule(null);
      resetForm();
      setShowCreateModal(false);
    } catch (e) {
      alert('Failed: ' + (e.response?.data?.message || e.message));
    }
  };

  const handleEdit = (rule) => {
    setEditingRule(rule._id);
    setForm({
      name: rule.name,
      accountId: rule.accountId || '',
      triggerType: rule.triggerType,
      triggerValue: rule.triggerValue || '',
      responseType: rule.responseType,
      responseContent: rule.responseContent || '',
      aiPrompt: rule.aiPrompt || '',
      priority: rule.priority || 100,
      cooldownMinutes: rule.cooldownMinutes || 5,
      isActive: rule.isActive !== false
    });
    setShowCreateModal(true);
  };

  const handleDelete = async (ruleId) => {
    if (window.confirm('Delete this chatbot rule?')) {
      try {
        await deleteChatbotRule(ruleId);
      } catch (e) {
        alert('Failed: ' + e.message);
      }
    }
  };

  const toggleActive = async (rule) => {
    try {
      await updateChatbotRule(rule._id, { isActive: !rule.isActive });
    } catch (e) {
      alert('Failed: ' + e.message);
    }
  };

  const triggerTypeLabels = {
    keyword: 'Exact Keyword',
    contains: 'Contains',
    'starts-with': 'Starts With',
    regex: 'Regex',
    'ai-fallback': 'AI Fallback'
  };

  return (
    <div className="wa-chatbot">
      <div className="wa-section-header">
        <h2>Chatbot Rules</h2>
        <button className="wa-btn wa-btn-primary" onClick={() => { resetForm(); setEditingRule(null); setShowCreateModal(true); }}>
          + Add Rule
        </button>
      </div>

      <p className="wa-chatbot-info">
        Rules are evaluated by priority (lower number = higher priority). If no rule matches, the AI fallback rule is used.
      </p>

      {/* Create/Edit Modal */}
      {showCreateModal && (
        <div className="wa-modal-overlay" onClick={() => { setShowCreateModal(false); setEditingRule(null); }}>
          <div className="wa-modal wa-modal-lg" onClick={e => e.stopPropagation()}>
            <div className="wa-modal-header">
              <h3>{editingRule ? 'Edit Rule' : 'Create Rule'}</h3>
              <button className="wa-modal-close" onClick={() => { setShowCreateModal(false); setEditingRule(null); }}>×</button>
            </div>
            <div className="wa-modal-body">
              <div className="wa-form-group">
                <label>Rule Name *</label>
                <input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Welcome Greeting" />
              </div>

              <div className="wa-form-group">
                <label>Account <span className="wa-hint">(Leave empty for all accounts)</span></label>
                <select value={form.accountId} onChange={e => setForm({ ...form, accountId: e.target.value })}>
                  <option value="">All Accounts</option>
                  {accounts.map(a => (
                    <option key={a._id} value={a._id}>{a.displayName || a.phoneNumber}</option>
                  ))}
                </select>
              </div>

              <div className="wa-form-row">
                <div className="wa-form-group">
                  <label>Trigger Type *</label>
                  <select value={form.triggerType} onChange={e => setForm({ ...form, triggerType: e.target.value })}>
                    <option value="keyword">Exact Keyword</option>
                    <option value="contains">Contains</option>
                    <option value="starts-with">Starts With</option>
                    <option value="regex">Regex</option>
                    <option value="ai-fallback">AI Fallback</option>
                  </select>
                </div>
                {form.triggerType !== 'ai-fallback' && (
                  <div className="wa-form-group">
                    <label>Trigger Value *</label>
                    <input type="text" value={form.triggerValue}
                      onChange={e => setForm({ ...form, triggerValue: e.target.value })}
                      placeholder={form.triggerType === 'regex' ? 'e.g. ^(hi|hello)$' : 'e.g. hello'} />
                  </div>
                )}
              </div>

              <div className="wa-form-group">
                <label>Response Type *</label>
                <select value={form.responseType} onChange={e => setForm({ ...form, responseType: e.target.value })}>
                  <option value="text">Text</option>
                  <option value="image">Image</option>
                  <option value="document">Document</option>
                  <option value="ai">AI Generated</option>
                </select>
              </div>

              {form.responseType === 'ai' || form.triggerType === 'ai-fallback' ? (
                <div className="wa-form-group">
                  <label>AI System Prompt</label>
                  <textarea value={form.aiPrompt} onChange={e => setForm({ ...form, aiPrompt: e.target.value })}
                    placeholder="You are a helpful business assistant for our company..."
                    rows={4} />
                </div>
              ) : (
                <div className="wa-form-group">
                  <label>Response Content <span className="wa-hint">Use {'{{name}}'} for contact name</span></label>
                  <textarea value={form.responseContent}
                    onChange={e => setForm({ ...form, responseContent: e.target.value })}
                    placeholder="Hi {{name}}! Thanks for reaching out..."
                    rows={4} />
                </div>
              )}

              <div className="wa-form-row">
                <div className="wa-form-group">
                  <label>Priority <span className="wa-hint">(lower = higher)</span></label>
                  <input type="number" value={form.priority}
                    onChange={e => setForm({ ...form, priority: parseInt(e.target.value) })} />
                </div>
                <div className="wa-form-group">
                  <label>Cooldown (minutes)</label>
                  <input type="number" value={form.cooldownMinutes}
                    onChange={e => setForm({ ...form, cooldownMinutes: parseInt(e.target.value) })} />
                </div>
              </div>

              <div className="wa-form-group">
                <label className="wa-checkbox-label">
                  <input type="checkbox" checked={form.isActive}
                    onChange={e => setForm({ ...form, isActive: e.target.checked })} />
                  Active
                </label>
              </div>

              <div className="wa-form-actions">
                <button className="wa-btn wa-btn-secondary" onClick={() => { setShowCreateModal(false); setEditingRule(null); }}>Cancel</button>
                <button className="wa-btn wa-btn-primary" onClick={editingRule ? handleUpdate : handleCreate}>
                  {editingRule ? 'Update' : 'Create'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Rules List */}
      <div className="wa-rules-list">
        {chatbotRules.length === 0 ? (
          <div className="wa-empty">
            <p>No chatbot rules yet</p>
            <p style={{ color: '#888', fontSize: '0.85rem' }}>Add rules to automate responses to incoming messages</p>
          </div>
        ) : (
          chatbotRules.map(rule => (
            <div key={rule._id} className={`wa-rule-card ${!rule.isActive ? 'inactive' : ''}`}>
              <div className="wa-rule-header">
                <div className="wa-rule-name">
                  <span className="wa-rule-priority">#{rule.priority}</span>
                  {rule.name}
                </div>
                <div className="wa-rule-actions">
                  <button
                    className={`wa-btn wa-btn-xs ${rule.isActive ? 'wa-btn-active' : 'wa-btn-inactive'}`}
                    onClick={() => toggleActive(rule)}
                  >
                    {rule.isActive ? 'ON' : 'OFF'}
                  </button>
                  <button className="wa-btn wa-btn-xs" onClick={() => handleEdit(rule)}>Edit</button>
                  <button className="wa-btn wa-btn-xs wa-btn-danger" onClick={() => handleDelete(rule._id)}>Delete</button>
                </div>
              </div>
              <div className="wa-rule-body">
                <div className="wa-rule-trigger">
                  <span className="wa-rule-type">{triggerTypeLabels[rule.triggerType] || rule.triggerType}</span>
                  {rule.triggerValue && <span className="wa-rule-value">"{rule.triggerValue}"</span>}
                </div>
                <div className="wa-rule-response">
                  → {rule.responseType === 'ai' ? 'AI Response' : (rule.responseContent || '').substring(0, 80)}
                  {(rule.responseContent || '').length > 80 ? '...' : ''}
                </div>
                <div className="wa-rule-stats">
                  Triggered: {rule.stats?.triggered || 0} | Responded: {rule.stats?.responded || 0}
                  | Cooldown: {rule.cooldownMinutes}min
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default WhatsAppMarketing;
