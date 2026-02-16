import React, { useState, useEffect, useContext, useRef } from 'react';
import { MessagingContext } from '../contexts/MessagingContext';
import { WhatsAppProvider, useWhatsApp } from '../contexts/WhatsAppContext';
import { QRCodeSVG } from 'qrcode.react';
import { toast } from 'sonner';
import {
  FiMessageSquare, FiUsers, FiSmartphone, FiZap, FiSend, FiSearch, FiPlus, FiSettings,
  FiTrash2, FiRefreshCw, FiWifi, FiWifiOff, FiStar, FiX, FiClock, FiEdit2,
  FiPlay, FiPause, FiCheck, FiCheckCircle, FiAlertCircle, FiTrendingUp,
  FiBarChart2, FiFile, FiTag, FiHash, FiActivity,
  FiFileText, FiExternalLink, FiPhone, FiEye, FiLayout, FiImage, FiList
} from 'react-icons/fi';
import './WhatsAppMarketing.css';

// =====================================================
// MAIN WRAPPER
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
// INNER COMPONENT
// =====================================================
function WhatsAppMarketingInner() {
  const [activeTab, setActiveTab] = useState('dashboard');

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: FiBarChart2 },
    { id: 'accounts', label: 'Accounts', icon: FiSmartphone },
    { id: 'chats', label: 'Chats', icon: FiMessageSquare },
    { id: 'templates', label: 'Templates', icon: FiFileText },
    { id: 'campaigns', label: 'Campaigns', icon: FiZap },
    { id: 'chatbot', label: 'Chatbot', icon: FiActivity }
  ];

  return (
    <div className="wa-container">
      <div className="wa-header">
        <div className="wa-header-left">
          <div className="wa-header-icon">
            <FiMessageSquare size={20} />
          </div>
          <div>
            <h1 className="wa-header-title">WhatsApp</h1>
            <p className="wa-header-sub">Manage accounts, chats, campaigns &amp; automation</p>
          </div>
        </div>
        <div className="wa-tabs">
          {tabs.map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                className={`wa-tab ${activeTab === tab.id ? 'active' : ''}`}
                onClick={() => setActiveTab(tab.id)}
              >
                <Icon size={14} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="wa-content">
        {activeTab === 'dashboard' && <DashboardTab />}
        {activeTab === 'accounts' && <AccountsTab />}
        {activeTab === 'chats' && <ChatsTab />}
        {activeTab === 'templates' && <TemplatesTab />}
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

  useEffect(() => { fetchDashboard(); }, [fetchDashboard]);

  if (!dashboard) return <div className="wa-loading"><div className="wa-spinner" /><span>Loading dashboard...</span></div>;

  const stats = [
    { label: 'Connected', value: dashboard.accounts?.filter(a => a.status === 'connected').length || 0, sub: `of ${dashboard.accounts?.length || 0} accounts`, icon: FiWifi, color: '#25d366' },
    { label: 'Total Contacts', value: dashboard.totalContacts || 0, icon: FiUsers, color: '#1a1a1a' },
    { label: 'Messages Today', value: dashboard.messagesToday || 0, icon: FiSend, color: '#2563eb' },
    { label: 'Active Campaigns', value: dashboard.activeCampaigns || 0, icon: FiZap, color: '#d97706' },
    { label: 'Chatbot Rules', value: dashboard.activeRules || 0, icon: FiActivity, color: '#7c3aed' }
  ];

  return (
    <div className="wa-dashboard">
      <div className="wa-stats-grid">
        {stats.map((s, i) => {
          const Icon = s.icon;
          return (
            <div key={i} className="wa-stat-card">
              <div className="wa-stat-icon" style={{ background: s.color + '12', color: s.color }}>
                <Icon size={18} />
              </div>
              <div className="wa-stat-info">
                <span className="wa-stat-label">{s.label}</span>
                <span className="wa-stat-value">{s.value}</span>
                {s.sub && <span className="wa-stat-sub">{s.sub}</span>}
              </div>
            </div>
          );
        })}
      </div>

      {dashboard.accounts && dashboard.accounts.length > 0 && (
        <div className="wa-section">
          <div className="wa-section-title">
            <FiSmartphone size={15} />
            <span>Account Status</span>
          </div>
          <div className="wa-account-list">
            {dashboard.accounts.map(acc => (
              <div key={acc._id} className="wa-account-row">
                <div className="wa-account-avatar">
                  {acc.profilePicture ? (
                    <img src={acc.profilePicture} alt="" />
                  ) : (
                    <div className="wa-avatar-placeholder"><FiSmartphone size={16} /></div>
                  )}
                  <span className={`wa-online-dot ${acc.status === 'connected' ? 'online' : ''}`} />
                </div>
                <div className="wa-account-info">
                  <div className="wa-account-name">{acc.displayName || acc.phoneNumber}</div>
                  <div className="wa-account-phone">{acc.phoneNumber || 'Not connected'}</div>
                </div>
                <div className={`wa-status-badge ${acc.status}`}>{acc.status}</div>
                <div className="wa-account-msgs">
                  <FiTrendingUp size={12} />
                  <span>{acc.dailyMessageCount || 0} today</span>
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
    setDefaultAccount, qrCode, loading
  } = useWhatsApp();

  const [showLinkModal, setShowLinkModal] = useState(false);
  const [linkName, setLinkName] = useState('');
  const [editingSettings, setEditingSettings] = useState(null);
  const [settingsForm, setSettingsForm] = useState({});

  useEffect(() => { fetchAccounts(); }, [fetchAccounts]);

  const handleLink = async () => {
    try {
      await linkAccount(linkName || 'My WhatsApp');
      setShowLinkModal(true);
      setLinkName('');
      toast.info('Scan the QR code with your WhatsApp');
    } catch (e) {
      toast.error('Failed to link: ' + (e.response?.data?.message || e.message));
    }
  };

  const handleRemove = async (id) => {
    if (window.confirm('Remove this account? All messages and data will be deleted.')) {
      try { await removeAccount(id); toast.success('Account removed'); } catch (e) { toast.error(e.message); }
    }
  };

  const handleSaveSettings = async () => {
    if (!editingSettings) return;
    try {
      await updateAccountSettings(editingSettings, settingsForm);
      setEditingSettings(null);
      toast.success('Settings saved');
    } catch (e) { toast.error(e.message); }
  };

  return (
    <div className="wa-accounts">
      <div className="wa-section-header">
        <h2>WhatsApp Accounts</h2>
        <button className="wa-btn wa-btn-primary" onClick={handleLink} disabled={loading}>
          <FiPlus size={14} /> Link New Account
        </button>
      </div>

      {/* QR Code Modal */}
      {(showLinkModal || qrCode) && (
        <div className="wa-modal-overlay" onClick={() => setShowLinkModal(false)}>
          <div className="wa-modal" onClick={e => e.stopPropagation()}>
            <div className="wa-modal-header">
              <h3>Link WhatsApp Account</h3>
              <button className="wa-modal-close" onClick={() => setShowLinkModal(false)}><FiX size={16} /></button>
            </div>
            <div className="wa-modal-body wa-qr-container">
              {qrCode ? (
                <>
                  <div className="wa-qr-box">
                    <QRCodeSVG value={qrCode} size={220} level="M" bgColor="#ffffff" fgColor="#1a1a1a" />
                  </div>
                  <p className="wa-qr-hint">Scan with WhatsApp on your phone</p>
                  <div className="wa-qr-steps">
                    <div className="wa-qr-step"><span className="wa-step-num">1</span>Open WhatsApp</div>
                    <div className="wa-qr-step"><span className="wa-step-num">2</span>Tap Settings &rarr; Linked Devices</div>
                    <div className="wa-qr-step"><span className="wa-step-num">3</span>Tap Link a Device</div>
                    <div className="wa-qr-step"><span className="wa-step-num">4</span>Point camera at this QR code</div>
                  </div>
                </>
              ) : (
                <div className="wa-loading"><div className="wa-spinner" /><p>Generating QR code...</p></div>
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
              <h3><FiSettings size={16} /> Account Settings</h3>
              <button className="wa-modal-close" onClick={() => setEditingSettings(null)}><FiX size={16} /></button>
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
                <button className="wa-btn" onClick={() => setEditingSettings(null)}>Cancel</button>
                <button className="wa-btn wa-btn-primary" onClick={handleSaveSettings}>Save Settings</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Account Cards */}
      <div className="wa-account-cards">
        {accounts.length === 0 ? (
          <div className="wa-empty">
            <FiSmartphone size={40} />
            <h3>No accounts linked yet</h3>
            <p>Click "Link New Account" to connect your WhatsApp</p>
          </div>
        ) : (
          accounts.map(acc => (
            <div key={acc._id} className={`wa-account-card ${acc.status}`}>
              <div className="wa-account-card-header">
                <div className="wa-account-avatar-lg">
                  {acc.profilePicture ? (
                    <img src={acc.profilePicture} alt="" />
                  ) : (
                    <div className="wa-avatar-placeholder-lg"><FiSmartphone size={20} /></div>
                  )}
                  <span className={`wa-online-dot-lg ${acc.status === 'connected' ? 'online' : ''}`} />
                </div>
                <div className="wa-account-card-info">
                  <h4>{acc.displayName || 'WhatsApp'}</h4>
                  <span className="wa-phone">{acc.phoneNumber || 'Connecting...'}</span>
                  <div className={`wa-status-badge ${acc.status}`}>
                    {acc.status === 'connected' ? <FiWifi size={10} /> : <FiWifiOff size={10} />}
                    {acc.status}
                  </div>
                </div>
                {acc.isDefault && <span className="wa-default-badge"><FiStar size={10} /> Default</span>}
              </div>

              <div className="wa-account-card-body">
                <div className="wa-usage-bar">
                  <div className="wa-usage-label">
                    <span>Daily Usage</span>
                    <span>{acc.dailyMessageCount || 0} / {acc.settings?.dailyLimit || 500}</span>
                  </div>
                  <div className="wa-progress-track">
                    <div className="wa-progress-fill" style={{
                      width: `${Math.min(((acc.dailyMessageCount || 0) / (acc.settings?.dailyLimit || 500)) * 100, 100)}%`
                    }} />
                  </div>
                </div>
              </div>

              <div className="wa-account-card-actions">
                {acc.status === 'connected' && (
                  <>
                    <button className="wa-btn wa-btn-sm" onClick={() => disconnectAccount(acc._id)}>
                      <FiWifiOff size={12} /> Disconnect
                    </button>
                    {!acc.isDefault && (
                      <button className="wa-btn wa-btn-sm" onClick={() => setDefaultAccount(acc._id)}>
                        <FiStar size={12} /> Set Default
                      </button>
                    )}
                  </>
                )}
                {(acc.status === 'disconnected' || acc.status === 'connecting') && (
                  <button className="wa-btn wa-btn-sm wa-btn-primary" onClick={() => reconnectAccount(acc._id)}>
                    <FiRefreshCw size={12} /> Reconnect
                  </button>
                )}
                <button className="wa-btn wa-btn-sm" onClick={() => {
                  setEditingSettings(acc._id);
                  setSettingsForm(acc.settings || {});
                }}>
                  <FiSettings size={12} />
                </button>
                <button className="wa-btn wa-btn-sm wa-btn-danger" onClick={() => handleRemove(acc._id)}>
                  <FiTrash2 size={12} />
                </button>
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
    if (selectedContact) fetchMessages(selectedContact._id);
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
      toast.error('Send failed: ' + (e.response?.data?.message || e.message));
    } finally { setSending(false); }
  };

  const contactMessages = selectedContact ? (messages[selectedContact._id] || []) : [];
  const hasSearchQuery = !!searchQuery.trim();

  const getInitials = (name) => name ? name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : '?';

  const formatTime = (ts) => {
    if (!ts) return '';
    const d = new Date(ts);
    const now = new Date();
    const diff = now - d;
    if (diff < 86400000 && d.getDate() === now.getDate()) {
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    if (diff < 604800000) {
      return d.toLocaleDateString([], { weekday: 'short' });
    }
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  return (
    <div className="wa-chats">
      {/* Left Panel — Contact List */}
      <div className="wa-chat-sidebar">
        <div className="wa-chat-sidebar-header">
          <select className="wa-select" value={selectedAccount}
            onChange={e => { setSelectedAccount(e.target.value); setSelectedContact(null); }}>
            <option value="">Select Account</option>
            {connectedAccounts.map(a => (
              <option key={a._id} value={a._id}>{a.displayName || a.phoneNumber}</option>
            ))}
          </select>
          <div className="wa-search-wrap">
            <FiSearch size={14} />
            <input className="wa-search-input" placeholder="Search contacts..."
              value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
          </div>
        </div>
        <div className="wa-contact-list">
          {contacts.length === 0 ? (
            <div className="wa-empty-sm">
              <FiUsers size={24} />
              <p>{hasSearchQuery ? 'No contacts found' : 'No contacts yet'}</p>
            </div>
          ) : (
            contacts.map(contact => (
              <div key={contact._id}
                className={`wa-contact-item ${selectedContact?._id === contact._id ? 'active' : ''}`}
                onClick={() => setSelectedContact(contact)}>
                <div className="wa-contact-avatar">
                  {contact.profilePicture ? (
                    <img src={contact.profilePicture} alt="" />
                  ) : (
                    <div className="wa-avatar-sm">{getInitials(contact.pushName || contact.phoneNumber)}</div>
                  )}
                </div>
                <div className="wa-contact-details">
                  <div className="wa-contact-top">
                    <span className="wa-contact-name">{contact.pushName || contact.phoneNumber}</span>
                    <span className="wa-contact-time">{formatTime(contact.lastMessageAt)}</span>
                  </div>
                  <div className="wa-contact-bottom">
                    <span className="wa-contact-preview">
                      {contact.lastMessageDirection === 'outbound' && <FiCheck size={10} className="wa-sent-check" />}
                      {contact.lastMessagePreview || 'No messages yet'}
                    </span>
                    {contact.unreadCount > 0 && <span className="wa-unread-badge">{contact.unreadCount}</span>}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Right Panel — Messages */}
      <div className="wa-chat-main">
        {selectedContact ? (
          <>
            <div className="wa-chat-header">
              <div className="wa-chat-header-avatar">
                {selectedContact.profilePicture ? (
                  <img src={selectedContact.profilePicture} alt="" />
                ) : (
                  <div className="wa-avatar-sm">{getInitials(selectedContact.pushName || selectedContact.phoneNumber)}</div>
                )}
              </div>
              <div className="wa-chat-header-info">
                <h3>{selectedContact.pushName || selectedContact.phoneNumber}</h3>
                <span className="wa-chat-phone">{selectedContact.phoneNumber}</span>
              </div>
              {selectedContact.tags?.length > 0 && (
                <div className="wa-chat-tags">
                  {selectedContact.tags.map(tag => (
                    <span key={tag} className="wa-tag"><FiTag size={9} /> {tag}</span>
                  ))}
                </div>
              )}
            </div>

            <div className="wa-messages-area">
              {contactMessages.length === 0 && (
                <div className="wa-no-messages"><p>No messages yet. Start the conversation!</p></div>
              )}
              {contactMessages.map((msg, i) => (
                <div key={msg._id || i} className={`wa-message ${msg.direction}`}>
                  <div className="wa-message-bubble">
                    {msg.type !== 'text' && msg.mediaUrl && (
                      <div className="wa-message-media">
                        {msg.type === 'image' && <img src={msg.mediaUrl} alt="" />}
                        {msg.type === 'video' && <video src={msg.mediaUrl} controls />}
                        {msg.type === 'audio' && <audio src={msg.mediaUrl} controls />}
                        {msg.type === 'document' && (
                          <a href={msg.mediaUrl} target="_blank" rel="noopener noreferrer" className="wa-doc-link">
                            <FiFile size={14} /> {msg.mediaFilename || 'Document'}
                          </a>
                        )}
                      </div>
                    )}
                    {msg.content && <div className="wa-message-text">{msg.content}</div>}
                    <div className="wa-message-meta">
                      <span className="wa-message-time">
                        {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      {msg.direction === 'outbound' && (
                        <span className={`wa-message-status ${msg.status}`}>
                          {msg.status === 'read' ? <><FiCheck size={10} /><FiCheck size={10} /></> :
                            msg.status === 'delivered' ? <><FiCheck size={10} /><FiCheck size={10} /></> :
                              msg.status === 'sent' ? <FiCheck size={10} /> : <FiClock size={10} />}
                        </span>
                      )}
                      {msg.isAutomated && <span className="wa-auto-badge"><FiActivity size={9} /></span>}
                    </div>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            <div className="wa-chat-input">
              <input className="wa-message-input" placeholder="Type a message..."
                value={messageInput} onChange={e => setMessageInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
                disabled={sending} />
              <button className="wa-send-btn" onClick={handleSend}
                disabled={!messageInput.trim() || sending}>
                <FiSend size={16} />
              </button>
            </div>
          </>
        ) : (
          <div className="wa-no-chat">
            <div className="wa-no-chat-graphic">
              <FiMessageSquare size={48} />
            </div>
            <h3>Select a contact</h3>
            <p>Choose a conversation from the left panel to start chatting</p>
          </div>
        )}
      </div>
    </div>
  );
}

// =====================================================
// TEMPLATES TAB
// =====================================================
function TemplatesTab() {
  const { templates, fetchTemplates, createTemplate, updateTemplate, deleteTemplate } = useWhatsApp();

  const [showModal, setShowModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [showPreview, setShowPreview] = useState(null);
  const [form, setForm] = useState({
    name: '', category: 'marketing', language: 'en',
    headerType: 'none', headerContent: '',
    body: '', footerText: '',
    buttons: []
  });

  useEffect(() => { fetchTemplates(); }, [fetchTemplates]);

  const resetForm = () => {
    setForm({
      name: '', category: 'marketing', language: 'en',
      headerType: 'none', headerContent: '',
      body: '', footerText: '',
      buttons: []
    });
    setEditingTemplate(null);
  };

  const handleEdit = (tpl) => {
    setEditingTemplate(tpl._id);
    setForm({
      name: tpl.name,
      category: tpl.category || 'marketing',
      language: tpl.language || 'en',
      headerType: tpl.headerType || 'none',
      headerContent: tpl.headerContent || '',
      body: tpl.body || '',
      footerText: tpl.footerText || '',
      buttons: tpl.buttons || []
    });
    setShowModal(true);
  };

  const addButton = () => {
    if (form.buttons.length >= 3) return;
    setForm({
      ...form,
      buttons: [...form.buttons, { type: 'quick_reply', text: '', actionType: '', actionValue: '' }]
    });
  };

  const updateButton = (idx, field, value) => {
    const updated = [...form.buttons];
    updated[idx] = { ...updated[idx], [field]: value };
    if (field === 'type' && value === 'quick_reply') {
      updated[idx].actionType = '';
      updated[idx].actionValue = '';
    }
    setForm({ ...form, buttons: updated });
  };

  const removeButton = (idx) => {
    setForm({ ...form, buttons: form.buttons.filter((_, i) => i !== idx) });
  };

  const extractVariables = (text) => {
    const matches = text.match(/\{\{([^}]+)\}\}/g) || [];
    return [...new Set(matches.map(m => m.replace(/[{}]/g, '').trim()))];
  };

  const handleSubmit = async () => {
    if (!form.name || !form.body) {
      toast.error('Template name and body are required');
      return;
    }
    try {
      const variables = extractVariables(form.body);
      const data = { ...form, variables };
      if (editingTemplate) {
        await updateTemplate(editingTemplate, data);
        toast.success('Template updated');
      } else {
        await createTemplate(data);
        toast.success('Template created');
      }
      setShowModal(false);
      resetForm();
    } catch (e) {
      toast.error(e.response?.data?.message || e.message);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Delete this template?')) {
      try { await deleteTemplate(id); toast.success('Template deleted'); } catch (e) { toast.error(e.message); }
    }
  };

  const getCategoryStyle = (cat) => {
    const map = {
      marketing: { bg: '#ede9fe', color: '#7c3aed' },
      utility: { bg: '#dbeafe', color: '#2563eb' },
      transactional: { bg: '#d1fae5', color: '#059669' }
    };
    return map[cat] || map.marketing;
  };

  // Live phone preview component
  const PhonePreview = ({ tpl }) => (
    <div className="wa-tpl-phone-preview">
      <div className="wa-tpl-phone-frame">
        <div className="wa-tpl-phone-notch"></div>
        <div className="wa-tpl-phone-header">
          <div className="wa-tpl-phone-avatar">W</div>
          <span>WhatsApp</span>
        </div>
        <div className="wa-tpl-phone-body">
          <div className="wa-tpl-phone-bubble">
            {tpl.headerType === 'text' && tpl.headerContent && (
              <div className="wa-tpl-phone-header-text">{tpl.headerContent}</div>
            )}
            {tpl.headerType === 'image' && (
              <div className="wa-tpl-phone-media"><FiImage size={24} /><span>Image</span></div>
            )}
            {tpl.headerType === 'video' && (
              <div className="wa-tpl-phone-media"><FiPlay size={24} /><span>Video</span></div>
            )}
            {tpl.headerType === 'document' && (
              <div className="wa-tpl-phone-media"><FiFile size={24} /><span>Document</span></div>
            )}
            <div className="wa-tpl-phone-text">{tpl.body || 'Your message body here...'}</div>
            {tpl.footerText && <div className="wa-tpl-phone-footer">{tpl.footerText}</div>}
            <div className="wa-tpl-phone-time">{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
          </div>
          {tpl.buttons && tpl.buttons.length > 0 && (
            <div className="wa-tpl-phone-buttons">
              {tpl.buttons.map((btn, i) => (
                <div key={i} className="wa-tpl-phone-btn">
                  {btn.type === 'call_to_action' && btn.actionType === 'url' && <FiExternalLink size={12} />}
                  {btn.type === 'call_to_action' && btn.actionType === 'phone' && <FiPhone size={12} />}
                  {btn.type === 'quick_reply' && <FiMessageSquare size={12} />}
                  {btn.text || 'Button'}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="wa-templates">
      <div className="wa-section-header">
        <h2>Message Templates</h2>
        <button className="wa-btn wa-btn-primary" onClick={() => { resetForm(); setShowModal(true); }}>
          <FiPlus size={14} /> New Template
        </button>
      </div>

      {/* Create / Edit Modal */}
      {showModal && (
        <div className="wa-modal-overlay" onClick={() => { setShowModal(false); resetForm(); }}>
          <div className="wa-modal wa-modal-xl" onClick={e => e.stopPropagation()}>
            <div className="wa-modal-header">
              <h3><FiFileText size={16} /> {editingTemplate ? 'Edit Template' : 'Create Template'}</h3>
              <button className="wa-modal-close" onClick={() => { setShowModal(false); resetForm(); }}><FiX size={16} /></button>
            </div>
            <div className="wa-modal-body wa-tpl-modal-split">
              {/* Left: Form */}
              <div className="wa-tpl-form-side">
                <div className="wa-form-row">
                  <div className="wa-form-group">
                    <label>Template Name *</label>
                    <input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                      placeholder="e.g. Welcome Message" />
                  </div>
                  <div className="wa-form-group">
                    <label>Category</label>
                    <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
                      <option value="marketing">Marketing</option>
                      <option value="utility">Utility</option>
                      <option value="transactional">Transactional</option>
                    </select>
                  </div>
                </div>

                <div className="wa-form-group">
                  <label><FiLayout size={12} /> Header Type</label>
                  <select value={form.headerType} onChange={e => setForm({ ...form, headerType: e.target.value })}>
                    <option value="none">None</option>
                    <option value="text">Text</option>
                    <option value="image">Image</option>
                    <option value="video">Video</option>
                    <option value="document">Document</option>
                  </select>
                </div>
                {form.headerType !== 'none' && (
                  <div className="wa-form-group">
                    <label>{form.headerType === 'text' ? 'Header Text' : 'Media URL'}</label>
                    <input type="text" value={form.headerContent}
                      onChange={e => setForm({ ...form, headerContent: e.target.value })}
                      placeholder={form.headerType === 'text' ? 'Header text...' : 'https://...'} />
                  </div>
                )}

                <div className="wa-form-group">
                  <label>Body * <span className="wa-hint">Use {'{{name}}'}, {'{{1}}'} for variables</span></label>
                  <textarea value={form.body} onChange={e => setForm({ ...form, body: e.target.value })}
                    placeholder={'Hi {{name}}, thanks for your interest in {{product}}!'} rows={4} />
                  <div className="wa-tpl-var-chips">
                    {['name', 'phone', 'company'].map(v => (
                      <button key={v} type="button" className="wa-tpl-var-chip"
                        onClick={() => setForm({ ...form, body: form.body + `{{${v}}}` })}>
                        {`{{${v}}}`}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="wa-form-group">
                  <label>Footer <span className="wa-hint">Optional, max 60 chars</span></label>
                  <input type="text" value={form.footerText}
                    onChange={e => setForm({ ...form, footerText: e.target.value.slice(0, 60) })}
                    placeholder="Powered by YourBrand" />
                </div>

                {/* Interactive Buttons Builder */}
                <div className="wa-form-divider">Interactive Buttons (max 3)</div>
                <div className="wa-tpl-buttons-builder">
                  {form.buttons.map((btn, idx) => (
                    <div key={idx} className="wa-tpl-btn-row">
                      <div className="wa-tpl-btn-fields">
                        <select value={btn.type} onChange={e => updateButton(idx, 'type', e.target.value)}>
                          <option value="quick_reply">Quick Reply</option>
                          <option value="call_to_action">Call to Action</option>
                        </select>
                        <input type="text" value={btn.text}
                          onChange={e => updateButton(idx, 'text', e.target.value.slice(0, 25))}
                          placeholder="Button text" />
                        {btn.type === 'call_to_action' && (
                          <>
                            <select value={btn.actionType || ''} onChange={e => updateButton(idx, 'actionType', e.target.value)}>
                              <option value="">Action...</option>
                              <option value="url">Open URL</option>
                              <option value="phone">Call Phone</option>
                            </select>
                            <input type="text" value={btn.actionValue || ''}
                              onChange={e => updateButton(idx, 'actionValue', e.target.value)}
                              placeholder={btn.actionType === 'phone' ? '+1234567890' : 'https://...'} />
                          </>
                        )}
                      </div>
                      <button className="wa-btn wa-btn-sm wa-btn-danger" onClick={() => removeButton(idx)}>
                        <FiTrash2 size={12} />
                      </button>
                    </div>
                  ))}
                  {form.buttons.length < 3 && (
                    <button className="wa-btn wa-btn-sm" onClick={addButton}>
                      <FiPlus size={12} /> Add Button
                    </button>
                  )}
                </div>

                <div className="wa-form-actions">
                  <button className="wa-btn" onClick={() => { setShowModal(false); resetForm(); }}>Cancel</button>
                  <button className="wa-btn wa-btn-primary" onClick={handleSubmit}>
                    {editingTemplate ? 'Update Template' : 'Create Template'}
                  </button>
                </div>
              </div>

              {/* Right: Live Preview */}
              <PhonePreview tpl={form} />
            </div>
          </div>
        </div>
      )}

      {/* Preview Overlay */}
      {showPreview && (
        <div className="wa-modal-overlay" onClick={() => setShowPreview(null)}>
          <div className="wa-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 380 }}>
            <div className="wa-modal-header">
              <h3><FiEye size={16} /> Preview: {showPreview.name}</h3>
              <button className="wa-modal-close" onClick={() => setShowPreview(null)}><FiX size={16} /></button>
            </div>
            <div className="wa-modal-body" style={{ padding: 0 }}>
              <PhonePreview tpl={showPreview} />
            </div>
          </div>
        </div>
      )}

      {/* Templates List */}
      {templates.length === 0 ? (
        <div className="wa-empty">
          <FiFileText size={40} />
          <h3>No templates yet</h3>
          <p>Create reusable message templates with interactive buttons</p>
        </div>
      ) : (
        <div className="wa-template-list">
          {templates.map(tpl => {
            const catStyle = getCategoryStyle(tpl.category);
            return (
              <div key={tpl._id} className="wa-template-card">
                <div className="wa-template-card-header">
                  <div className="wa-template-card-title">
                    <h4>{tpl.name}</h4>
                    <span className="wa-template-category" style={{ background: catStyle.bg, color: catStyle.color }}>
                      {tpl.category}
                    </span>
                  </div>
                  <div className="wa-template-card-meta">
                    <span><FiClock size={10} /> {new Date(tpl.createdAt).toLocaleDateString()}</span>
                    {tpl.buttons?.length > 0 && (
                      <span className="wa-template-btn-count">
                        <FiLayout size={10} /> {tpl.buttons.length} button{tpl.buttons.length !== 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                </div>
                <div className="wa-template-card-body">
                  <p className="wa-template-preview-text">{tpl.body.substring(0, 120)}{tpl.body.length > 120 ? '...' : ''}</p>
                  {tpl.buttons?.length > 0 && (
                    <div className="wa-template-btn-pills">
                      {tpl.buttons.map((btn, i) => (
                        <span key={i} className="wa-template-btn-pill">
                          {btn.type === 'quick_reply' ? <FiMessageSquare size={10} /> : <FiExternalLink size={10} />}
                          {btn.text}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="wa-template-card-actions">
                  <button className="wa-btn wa-btn-sm" onClick={() => setShowPreview(tpl)}>
                    <FiEye size={12} /> Preview
                  </button>
                  <button className="wa-btn wa-btn-sm" onClick={() => handleEdit(tpl)}>
                    <FiEdit2 size={12} /> Edit
                  </button>
                  <button className="wa-btn wa-btn-sm wa-btn-danger" onClick={() => handleDelete(tpl._id)}>
                    <FiTrash2 size={12} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// =====================================================
// CAMPAIGNS TAB
// =====================================================
function CampaignsTab() {
  const {
    accounts, campaigns, templates, phoneLists,
    fetchCampaigns, fetchTemplates, fetchPhoneLists,
    createCampaign, startCampaign, pauseCampaign, resumeCampaign, deleteCampaign,
    createPhoneList, updatePhoneList, deletePhoneList,
    campaignProgress
  } = useWhatsApp();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [form, setForm] = useState({
    name: '', message: '', accountId: '', targetTags: '', manualPhones: '', scheduledAt: '', templateId: '', phoneListId: ''
  });
  const [settings, setSettings] = useState({
    delayMin: 10, delayMax: 45, dailyLimit: 100,
    rampUpEnabled: true, rampUpPercent: 15, randomDelayEnabled: true
  });
  const [showSettings, setShowSettings] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [campaignSubTab, setCampaignSubTab] = useState('campaigns'); // 'campaigns' | 'phoneLists'

  // Phone list management state
  const [showPhoneListModal, setShowPhoneListModal] = useState(false);
  const [editingPhoneList, setEditingPhoneList] = useState(null);
  const [plForm, setPlForm] = useState({ name: '', description: '', phonesRaw: '' });

  const connectedAccounts = accounts.filter(a => a.status === 'connected');

  useEffect(() => { fetchCampaigns(); }, [fetchCampaigns]);
  useEffect(() => { fetchTemplates(); }, [fetchTemplates]);
  useEffect(() => { fetchPhoneLists(); }, [fetchPhoneLists]);

  // Template selection
  const handleTemplateSelect = (templateId) => {
    if (!templateId) {
      setSelectedTemplate(null);
      setForm(prev => ({ ...prev, templateId: '', message: '' }));
      return;
    }
    const tpl = templates.find(t => t._id === templateId);
    if (tpl) {
      setSelectedTemplate(tpl);
      setForm(prev => ({ ...prev, templateId: tpl._id, message: tpl.body }));
    }
  };

  // Campaign create
  const handleCreate = async () => {
    if (!form.name || !form.message || !form.accountId) {
      toast.error('Please fill in name, account, and message');
      return;
    }
    try {
      const tags = form.targetTags ? form.targetTags.split(',').map(t => t.trim()).filter(Boolean) : [];
      await createCampaign({
        accountId: form.accountId,
        name: form.name,
        message: form.message,
        targetTags: tags,
        manualPhones: form.manualPhones || undefined,
        scheduledAt: form.scheduledAt || undefined,
        templateId: form.templateId || undefined,
        phoneListId: form.phoneListId || undefined,
        settings
      });
      setShowCreateModal(false);
      setForm({ name: '', message: '', accountId: '', targetTags: '', manualPhones: '', scheduledAt: '', templateId: '', phoneListId: '' });
      setSettings({ delayMin: 10, delayMax: 45, dailyLimit: 100, rampUpEnabled: true, rampUpPercent: 15, randomDelayEnabled: true });
      setShowSettings(false);
      setSelectedTemplate(null);
      toast.success('Campaign created');
    } catch (e) {
      toast.error(e.response?.data?.message || e.message);
    }
  };

  // Phone List helpers
  const parsePhones = (raw) => {
    return raw.split(/[\n,;]+/)
      .map(line => {
        const trimmed = line.trim();
        if (!trimmed) return null;
        // Support "name:phone" or just "phone"
        const parts = trimmed.split(':');
        if (parts.length >= 2) {
          return { name: parts[0].trim(), phone: parts.slice(1).join(':').trim() };
        }
        return { phone: trimmed, name: '' };
      })
      .filter(Boolean);
  };

  const phonesToRaw = (phones) => {
    return phones.map(p => p.name ? `${p.name}:${p.phone}` : p.phone).join('\n');
  };

  const resetPlForm = () => {
    setPlForm({ name: '', description: '', phonesRaw: '' });
    setEditingPhoneList(null);
  };

  const handleEditPhoneList = (pl) => {
    setEditingPhoneList(pl._id);
    setPlForm({
      name: pl.name,
      description: pl.description || '',
      phonesRaw: phonesToRaw(pl.phones || [])
    });
    setShowPhoneListModal(true);
  };

  const handlePhoneListSubmit = async () => {
    const phones = parsePhones(plForm.phonesRaw);
    if (!plForm.name || phones.length === 0) {
      toast.error('Name and at least one phone number required');
      return;
    }
    try {
      if (editingPhoneList) {
        await updatePhoneList(editingPhoneList, { name: plForm.name, description: plForm.description, phones });
        toast.success('Phone list updated');
      } else {
        await createPhoneList({ name: plForm.name, description: plForm.description, phones });
        toast.success('Phone list created');
      }
      setShowPhoneListModal(false);
      resetPlForm();
    } catch (e) {
      toast.error(e.response?.data?.message || e.message);
    }
  };

  const handleDeletePhoneList = async (id) => {
    if (window.confirm('Delete this phone list?')) {
      try { await deletePhoneList(id); toast.success('Phone list deleted'); } catch (e) { toast.error(e.message); }
    }
  };

  const getStatusStyle = (status) => {
    const map = {
      draft: { bg: '#f5f5f5', color: '#6b7280', icon: FiEdit2 },
      scheduled: { bg: '#fef3c7', color: '#d97706', icon: FiClock },
      sending: { bg: '#dcfce7', color: '#16a34a', icon: FiSend },
      paused: { bg: '#fef3c7', color: '#d97706', icon: FiPause },
      completed: { bg: '#f0fdf4', color: '#16a34a', icon: FiCheckCircle },
      failed: { bg: '#fef2f2', color: '#dc2626', icon: FiAlertCircle }
    };
    return map[status] || map.draft;
  };

  const handleDelete = async (id) => {
    if (window.confirm('Delete this campaign?')) {
      try { await deleteCampaign(id); toast.success('Campaign deleted'); } catch (e) { toast.error(e.message); }
    }
  };

  // Format seconds to human-readable duration
  const formatDuration = (seconds) => {
    if (!seconds || seconds <= 0) return '—';
    const d = Math.floor(seconds / 86400);
    const h = Math.floor((seconds % 86400) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (d > 0) return `~${d}d ${h}h`;
    if (h > 0) return `~${h}h ${m}m`;
    return `~${m}m`;
  };

  // Calculate estimated time for a campaign (before it starts)
  const calcEstimateForCampaign = (c) => {
    const s = c.settings || settings;
    const total = c.stats?.pending || c.stats?.total || c.recipients?.length || 0;
    if (total <= 0) return '—';
    const avgDelay = ((s.delayMin || 10) + (s.delayMax || 45)) / 2;
    const limit = s.dailyLimit || 100;
    if (total <= limit) return formatDuration(total * avgDelay);
    let remaining = total, totalSec = 0, day = 1;
    while (remaining > 0 && day < 100) {
      const dayLimit = s.rampUpEnabled !== false ? Math.floor(limit * Math.pow(1 + (s.rampUpPercent || 15) / 100, day - 1)) : limit;
      const batch = Math.min(remaining, dayLimit);
      totalSec += batch * avgDelay;
      if (remaining > batch) totalSec += (24 - ((s.sendHoursEnd || 22) - (s.sendHoursStart || 8))) * 3600;
      remaining -= batch; day++;
    }
    return formatDuration(totalSec);
  };

  return (
    <div className="wa-campaigns">
      <div className="wa-section-header">
        <h2>Campaigns</h2>
        <button className="wa-btn wa-btn-primary" onClick={() => setShowCreateModal(true)}>
          <FiPlus size={14} /> New Campaign
        </button>
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="wa-modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="wa-modal wa-modal-lg" onClick={e => e.stopPropagation()}>
            <div className="wa-modal-header">
              <h3><FiZap size={16} /> Create Campaign</h3>
              <button className="wa-modal-close" onClick={() => setShowCreateModal(false)}><FiX size={16} /></button>
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

              {/* Template Selection */}
              <div className="wa-form-group">
                <label><FiFileText size={12} /> Use Template <span className="wa-hint">Optional — auto-fills message</span></label>
                <select value={form.templateId} onChange={e => handleTemplateSelect(e.target.value)}>
                  <option value="">Write custom message</option>
                  {templates.filter(t => t.isActive !== false).map(t => (
                    <option key={t._id} value={t._id}>{t.name} ({t.category})</option>
                  ))}
                </select>
              </div>

              {/* Template button preview */}
              {selectedTemplate && selectedTemplate.buttons?.length > 0 && (
                <div className="wa-campaign-tpl-preview">
                  <div className="wa-campaign-tpl-preview-label">
                    <FiLayout size={12} /> Template buttons attached:
                  </div>
                  <div className="wa-template-btn-pills">
                    {selectedTemplate.buttons.map((btn, i) => (
                      <span key={i} className="wa-template-btn-pill">
                        {btn.type === 'quick_reply' ? <FiMessageSquare size={10} /> : <FiExternalLink size={10} />}
                        {btn.text}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="wa-form-group">
                <label>Message * <span className="wa-hint">Use {'{{name}}'} for personalization</span></label>
                <textarea value={form.message} onChange={e => setForm({ ...form, message: e.target.value })}
                  placeholder="Hi {{name}}, check out our new..." rows={5} />
                <div className="wa-char-count">{form.message.length} characters</div>
              </div>
              <div className="wa-form-row">
                <div className="wa-form-group">
                  <label><FiTag size={12} /> Target Tags <span className="wa-hint">Comma-separated</span></label>
                  <input type="text" value={form.targetTags} onChange={e => setForm({ ...form, targetTags: e.target.value })}
                    placeholder="e.g. customer, vip" />
                </div>
                <div className="wa-form-group">
                  <label><FiClock size={12} /> Schedule (optional)</label>
                  <input type="datetime-local" value={form.scheduledAt}
                    onChange={e => setForm({ ...form, scheduledAt: e.target.value })} />
                </div>
              </div>
              {/* Phone List selector */}
              <div className="wa-form-group">
                <label><FiList size={12} /> Phone List <span className="wa-hint">Select a saved list of phone numbers</span></label>
                <select value={form.phoneListId} onChange={e => setForm({ ...form, phoneListId: e.target.value })}>
                  <option value="">No phone list</option>
                  {phoneLists.filter(l => l.isActive !== false).map(l => (
                    <option key={l._id} value={l._id}>{l.name} ({l.phones?.length || 0} numbers)</option>
                  ))}
                </select>
              </div>

              {/* Selected phone list preview */}
              {form.phoneListId && (() => {
                const selectedList = phoneLists.find(l => l._id === form.phoneListId);
                return selectedList ? (
                  <div className="wa-campaign-tpl-preview">
                    <div className="wa-campaign-tpl-preview-label">
                      <FiList size={12} /> {selectedList.name} — {selectedList.phones.length} numbers
                    </div>
                    <div className="wa-pl-preview-phones">
                      {selectedList.phones.slice(0, 5).map((p, i) => (
                        <span key={i} className="wa-template-btn-pill">
                          <FiPhone size={10} /> {p.name ? `${p.name} (${p.phone})` : p.phone}
                        </span>
                      ))}
                      {selectedList.phones.length > 5 && (
                        <span className="wa-template-btn-pill">+{selectedList.phones.length - 5} more</span>
                      )}
                    </div>
                  </div>
                ) : null;
              })()}

              <div className="wa-form-group">
                <label>Additional Phone Numbers <span className="wa-hint">Optional • comma or new line separated</span></label>
                <textarea
                  value={form.manualPhones}
                  onChange={e => setForm({ ...form, manualPhones: e.target.value })}
                  placeholder="e.g. 919876543210, +1 415 555 0101"
                  rows={2}
                />
              </div>

              {/* Sending Settings */}
              <div className="wa-settings-toggle" onClick={() => setShowSettings(!showSettings)}>
                <FiSettings size={13} /> Sending Settings
                <span className="wa-settings-arrow">{showSettings ? '▾' : '▸'}</span>
              </div>
              {showSettings && (
                <div className="wa-settings-panel">
                  <div className="wa-settings-row">
                    <div className="wa-form-group">
                      <label>Delay Min (sec)</label>
                      <input type="number" min={1} max={120} value={settings.delayMin}
                        onChange={e => setSettings({ ...settings, delayMin: +e.target.value })} />
                    </div>
                    <div className="wa-form-group">
                      <label>Delay Max (sec)</label>
                      <input type="number" min={1} max={120} value={settings.delayMax}
                        onChange={e => setSettings({ ...settings, delayMax: +e.target.value })} />
                    </div>
                    <div className="wa-form-group">
                      <label>Daily Limit (Day 1)</label>
                      <input type="number" min={1} max={5000} value={settings.dailyLimit}
                        onChange={e => setSettings({ ...settings, dailyLimit: +e.target.value })} />
                    </div>
                  </div>

                  <div className="wa-settings-checks">
                    <label className="wa-checkbox-label">
                      <input type="checkbox" checked={settings.rampUpEnabled}
                        onChange={e => setSettings({ ...settings, rampUpEnabled: e.target.checked })} />
                      <span>Ramp-up sending — start slow, increase daily by</span>
                      <input type="number" min={5} max={50} value={settings.rampUpPercent}
                        onChange={e => setSettings({ ...settings, rampUpPercent: +e.target.value })}
                        style={{ width: 50, marginLeft: 4 }} disabled={!settings.rampUpEnabled} />
                      <span>%</span>
                    </label>
                    <label className="wa-checkbox-label">
                      <input type="checkbox" checked={settings.randomDelayEnabled}
                        onChange={e => setSettings({ ...settings, randomDelayEnabled: e.target.checked })} />
                      <span>Random delays between messages (anti-ban protection)</span>
                    </label>
                  </div>
                  <div className="wa-settings-info">
                    <FiAlertCircle size={12} />
                    Day 1: {settings.dailyLimit} msgs • Day 2: ~{Math.floor(settings.dailyLimit * (1 + settings.rampUpPercent / 100))} msgs •
                    Delay: {settings.delayMin}s–{settings.delayMax}s random
                  </div>
                </div>
              )}

              <div className="wa-form-actions">
                <button className="wa-btn" onClick={() => setShowCreateModal(false)}>Cancel</button>
                <button className="wa-btn wa-btn-primary" onClick={handleCreate}>
                  <FiZap size={14} /> Create Campaign
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Sub-tabs: Campaigns vs Phone Lists */}
      <div className="wa-campaign-subtabs">
        <button className={`wa-campaign-subtab ${campaignSubTab === 'campaigns' ? 'active' : ''}`}
          onClick={() => setCampaignSubTab('campaigns')}>
          <FiZap size={12} /> Campaigns ({campaigns.length})
        </button>
        <button className={`wa-campaign-subtab ${campaignSubTab === 'phoneLists' ? 'active' : ''}`}
          onClick={() => setCampaignSubTab('phoneLists')}>
          <FiList size={12} /> Phone Lists ({phoneLists.length})
        </button>
      </div>

      {/* Campaign List or Phone Lists based on sub-tab */}
      {campaignSubTab === 'campaigns' && (
        <>
          {campaigns.length === 0 ? (
            <div className="wa-empty">
              <FiZap size={40} />
              <h3>No campaigns yet</h3>
              <p>Create a campaign to send bulk messages to your contacts</p>
            </div>
          ) : (
            <div className="wa-campaign-list">
              {campaigns.map(c => {
                const progress = campaignProgress[c._id];
                const style = getStatusStyle(c.status);
                const StatusIcon = style.icon;
                return (
                  <div key={c._id} className="wa-campaign-card">
                    <div className="wa-campaign-header">
                      <div className="wa-campaign-title">
                        <h4>{c.name}</h4>
                        <span className="wa-campaign-date">
                          <FiClock size={11} /> {new Date(c.createdAt).toLocaleDateString()}
                          {c.accountId?.displayName && ` • ${c.accountId.displayName}`}
                        </span>
                      </div>
                      <span className="wa-campaign-status" style={{ background: style.bg, color: style.color }}>
                        <StatusIcon size={11} /> {c.status}
                      </span>
                    </div>

                    <div className="wa-campaign-stats">
                      <div className="wa-campaign-stat"><span className="wa-stat-num">{c.stats?.total || 0}</span><span className="wa-stat-lbl">Total</span></div>
                      <div className="wa-campaign-stat"><span className="wa-stat-num">{c.stats?.sent || 0}</span><span className="wa-stat-lbl">Sent</span></div>
                      <div className="wa-campaign-stat"><span className="wa-stat-num">{c.stats?.delivered || 0}</span><span className="wa-stat-lbl">Delivered</span></div>
                      <div className="wa-campaign-stat"><span className="wa-stat-num">{c.stats?.failed || 0}</span><span className="wa-stat-lbl">Failed</span></div>
                    </div>

                    {/* Estimated time for draft/scheduled campaigns */}
                    {(c.status === 'draft' || c.status === 'scheduled') && (
                      <div className="wa-campaign-estimate">
                        <FiClock size={11} /> Est. time: {calcEstimateForCampaign(c)}
                        {c.settings?.rampUpEnabled !== false && (
                          <span> • <FiTrendingUp size={11} /> Ramp-up: Day 1 = {c.settings?.dailyLimit || 100} msgs</span>
                        )}
                      </div>
                    )}

                    {/* Live progress for sending campaigns */}
                    {progress && progress.status === 'sending' && (
                      <>
                        <div className="wa-progress-bar">
                          <div className="wa-progress-fill" style={{ width: `${progress.progress || 0}%` }} />
                          <span className="wa-progress-text">{progress.progress || 0}%</span>
                        </div>
                        <div className="wa-campaign-live">
                          <span><FiActivity size={11} /> Day {progress.dayNumber || 1}</span>
                          <span>{progress.dailySentCount || 0}/{progress.dailyLimitToday || '—'} today</span>
                          {progress.estimatedTimeRemaining > 0 && (
                            <span><FiClock size={11} /> ETA: {formatDuration(progress.estimatedTimeRemaining)}</span>
                          )}
                        </div>
                      </>
                    )}

                    {/* Paused reason */}
                    {progress && progress.status === 'paused' && progress.reason && (
                      <div className="wa-campaign-paused-reason">
                        <FiAlertCircle size={11} />
                        {progress.reason === 'daily_limit_reached' && ` Daily limit reached (${progress.dailySentCount}/${progress.dailyLimitToday}). Resumes tomorrow.`}
                        {progress.reason === 'outside_send_hours' && ' Paused — outside active send hours.'}
                        {progress.reason === 'too_many_failures' && ' Paused — too many consecutive failures.'}
                      </div>
                    )}

                    <div className="wa-campaign-actions">
                      {(c.status === 'draft' || c.status === 'scheduled') && (
                        <>
                          <button className="wa-btn wa-btn-sm wa-btn-primary" onClick={async () => { try { await startCampaign(c._id); toast.success('Campaign started'); } catch (e) { toast.error(e.message); } }}>
                            <FiPlay size={12} /> Start
                          </button>
                          <button className="wa-btn wa-btn-sm wa-btn-danger" onClick={() => handleDelete(c._id)}>
                            <FiTrash2 size={12} />
                          </button>
                        </>
                      )}
                      {c.status === 'sending' && (
                        <button className="wa-btn wa-btn-sm" onClick={async () => { try { await pauseCampaign(c._id); toast.info('Campaign paused'); } catch (e) { toast.error(e.message); } }}>
                          <FiPause size={12} /> Pause
                        </button>
                      )}
                      {c.status === 'paused' && (
                        <>
                          <button className="wa-btn wa-btn-sm wa-btn-primary" onClick={async () => { try { await resumeCampaign(c._id); toast.success('Campaign resumed'); } catch (e) { toast.error(e.message); } }}>
                            <FiPlay size={12} /> Resume
                          </button>
                          <button className="wa-btn wa-btn-sm wa-btn-danger" onClick={() => handleDelete(c._id)}>
                            <FiTrash2 size={12} />
                          </button>
                        </>
                      )}
                      {(c.status === 'completed' || c.status === 'failed') && (
                        <button className="wa-btn wa-btn-sm wa-btn-danger" onClick={() => handleDelete(c._id)}>
                          <FiTrash2 size={12} /> Delete
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Phone Lists Sub-Tab */}
      {campaignSubTab === 'phoneLists' && (
        <>
          <div className="wa-section-header" style={{ marginTop: 8 }}>
            <h2 style={{ fontSize: 14 }}>Phone Lists</h2>
            <button className="wa-btn wa-btn-primary" onClick={() => { resetPlForm(); setShowPhoneListModal(true); }}>
              <FiPlus size={14} /> New List
            </button>
          </div>

          {/* Phone List Create/Edit Modal */}
          {showPhoneListModal && (
            <div className="wa-modal-overlay" onClick={() => { setShowPhoneListModal(false); resetPlForm(); }}>
              <div className="wa-modal" onClick={e => e.stopPropagation()}>
                <div className="wa-modal-header">
                  <h3><FiList size={16} /> {editingPhoneList ? 'Edit Phone List' : 'Create Phone List'}</h3>
                  <button className="wa-modal-close" onClick={() => { setShowPhoneListModal(false); resetPlForm(); }}><FiX size={16} /></button>
                </div>
                <div className="wa-modal-body">
                  <div className="wa-form-group">
                    <label>List Name *</label>
                    <input type="text" value={plForm.name} onChange={e => setPlForm({ ...plForm, name: e.target.value })}
                      placeholder="e.g. VIP Customers" />
                  </div>
                  <div className="wa-form-group">
                    <label>Description <span className="wa-hint">Optional</span></label>
                    <input type="text" value={plForm.description} onChange={e => setPlForm({ ...plForm, description: e.target.value })}
                      placeholder="e.g. High-value customers for promotions" />
                  </div>
                  <div className="wa-form-group">
                    <label>Phone Numbers * <span className="wa-hint">One per line. Use name:phone format for names (e.g. John:919876543210)</span></label>
                    <textarea
                      value={plForm.phonesRaw}
                      onChange={e => setPlForm({ ...plForm, phonesRaw: e.target.value })}
                      placeholder={"919876543210\nJohn:+1 415 555 0101\n+44 20 7946 0958"}
                      rows={8}
                    />
                    <div className="wa-char-count">{parsePhones(plForm.phonesRaw).length} phone numbers detected</div>
                  </div>
                  <div className="wa-form-actions">
                    <button className="wa-btn" onClick={() => { setShowPhoneListModal(false); resetPlForm(); }}>Cancel</button>
                    <button className="wa-btn wa-btn-primary" onClick={handlePhoneListSubmit}>
                      {editingPhoneList ? 'Update List' : 'Create List'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {phoneLists.length === 0 ? (
            <div className="wa-empty">
              <FiList size={40} />
              <h3>No phone lists yet</h3>
              <p>Create reusable phone number lists for your campaigns</p>
            </div>
          ) : (
            <div className="wa-pl-list">
              {phoneLists.map(pl => (
                <div key={pl._id} className="wa-pl-card">
                  <div className="wa-pl-card-header">
                    <div>
                      <h4>{pl.name}</h4>
                      {pl.description && <p className="wa-pl-desc">{pl.description}</p>}
                    </div>
                    <span className="wa-pl-count">
                      <FiPhone size={11} /> {pl.phones?.length || 0} numbers
                    </span>
                  </div>
                  <div className="wa-pl-card-phones">
                    {(pl.phones || []).slice(0, 6).map((p, i) => (
                      <span key={i} className="wa-pl-phone-chip">
                        {p.name ? `${p.name} (${p.phone})` : p.phone}
                      </span>
                    ))}
                    {pl.phones?.length > 6 && <span className="wa-pl-phone-chip wa-pl-more">+{pl.phones.length - 6} more</span>}
                  </div>
                  <div className="wa-pl-card-actions">
                    <button className="wa-btn wa-btn-sm" onClick={() => handleEditPhoneList(pl)}>
                      <FiEdit2 size={12} /> Edit
                    </button>
                    <button className="wa-btn wa-btn-sm wa-btn-danger" onClick={() => handleDeletePhoneList(pl._id)}>
                      <FiTrash2 size={12} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
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

  const [showModal, setShowModal] = useState(false);
  const [editingRule, setEditingRule] = useState(null);
  const [form, setForm] = useState({
    name: '', accountId: '', triggerType: 'keyword', triggerValue: '',
    responseType: 'text', responseContent: '', aiPrompt: '',
    priority: 100, cooldownMinutes: 5, isActive: true
  });

  useEffect(() => { fetchChatbotRules(); }, [fetchChatbotRules]);

  const resetForm = () => setForm({
    name: '', accountId: '', triggerType: 'keyword', triggerValue: '',
    responseType: 'text', responseContent: '', aiPrompt: '',
    priority: 100, cooldownMinutes: 5, isActive: true
  });

  const handleSubmit = async () => {
    if (!form.name || !form.triggerType || !form.responseType) {
      toast.error('Name, trigger type, and response type are required');
      return;
    }
    try {
      const data = { ...form, accountId: form.accountId || undefined };
      if (editingRule) {
        await updateChatbotRule(editingRule, data);
        toast.success('Rule updated');
      } else {
        await createChatbotRule(data);
        toast.success('Rule created');
      }
      setShowModal(false);
      setEditingRule(null);
      resetForm();
    } catch (e) {
      toast.error(e.response?.data?.message || e.message);
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
    setShowModal(true);
  };

  const handleDelete = async (ruleId) => {
    if (window.confirm('Delete this chatbot rule?')) {
      try { await deleteChatbotRule(ruleId); toast.success('Rule deleted'); } catch (e) { toast.error(e.message); }
    }
  };

  const toggleActive = async (rule) => {
    try { await updateChatbotRule(rule._id, { isActive: !rule.isActive }); } catch (e) { toast.error(e.message); }
  };

  const getTriggerIcon = (type) => {
    const map = { keyword: FiHash, contains: FiSearch, regex: FiEdit2, any: FiMessageSquare };
    return map[type] || FiHash;
  };

  return (
    <div className="wa-chatbot">
      <div className="wa-section-header">
        <h2>Chatbot Rules</h2>
        <button className="wa-btn wa-btn-primary" onClick={() => {
          setEditingRule(null);
          resetForm();
          setShowModal(true);
        }}>
          <FiPlus size={14} /> New Rule
        </button>
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="wa-modal-overlay" onClick={() => { setShowModal(false); setEditingRule(null); resetForm(); }}>
          <div className="wa-modal wa-modal-lg" onClick={e => e.stopPropagation()}>
            <div className="wa-modal-header">
              <h3><FiActivity size={16} /> {editingRule ? 'Edit Rule' : 'Create Rule'}</h3>
              <button className="wa-modal-close" onClick={() => { setShowModal(false); setEditingRule(null); resetForm(); }}>
                <FiX size={16} />
              </button>
            </div>
            <div className="wa-modal-body">
              <div className="wa-form-row">
                <div className="wa-form-group">
                  <label>Rule Name *</label>
                  <input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                    placeholder="e.g. Welcome Message" />
                </div>
                <div className="wa-form-group">
                  <label>Account (optional)</label>
                  <select value={form.accountId} onChange={e => setForm({ ...form, accountId: e.target.value })}>
                    <option value="">All Accounts</option>
                    {accounts.map(a => (
                      <option key={a._id} value={a._id}>{a.displayName || a.phoneNumber}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="wa-form-divider">Trigger</div>
              <div className="wa-form-row">
                <div className="wa-form-group">
                  <label>Trigger Type *</label>
                  <select value={form.triggerType} onChange={e => setForm({ ...form, triggerType: e.target.value })}>
                    <option value="keyword">Exact Keyword</option>
                    <option value="contains">Contains</option>
                    <option value="regex">Regex Pattern</option>
                    <option value="any">Any Message</option>
                  </select>
                </div>
                {form.triggerType !== 'any' && (
                  <div className="wa-form-group">
                    <label>Trigger Value</label>
                    <input type="text" value={form.triggerValue}
                      onChange={e => setForm({ ...form, triggerValue: e.target.value })}
                      placeholder={form.triggerType === 'keyword' ? 'hello' : form.triggerType === 'contains' ? 'pricing' : '/^hi|hello$/i'} />
                  </div>
                )}
              </div>

              <div className="wa-form-divider">Response</div>
              <div className="wa-form-group">
                <label>Response Type *</label>
                <select value={form.responseType} onChange={e => setForm({ ...form, responseType: e.target.value })}>
                  <option value="text">Text Message</option>
                  <option value="template">Template</option>
                  <option value="ai">AI-Generated</option>
                </select>
              </div>

              {(form.responseType === 'text' || form.responseType === 'template') && (
                <div className="wa-form-group">
                  <label>Response Content *</label>
                  <textarea value={form.responseContent}
                    onChange={e => setForm({ ...form, responseContent: e.target.value })}
                    placeholder="Hello! Thanks for reaching out..." rows={4} />
                </div>
              )}

              {form.responseType === 'ai' && (
                <div className="wa-form-group">
                  <label>AI Prompt</label>
                  <textarea value={form.aiPrompt}
                    onChange={e => setForm({ ...form, aiPrompt: e.target.value })}
                    placeholder="You are a helpful customer support agent for our company..." rows={4} />
                </div>
              )}

              <div className="wa-form-divider">Settings</div>
              <div className="wa-form-row">
                <div className="wa-form-group">
                  <label>Priority (lower = higher)</label>
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
                  Rule is active
                </label>
              </div>

              <div className="wa-form-actions">
                <button className="wa-btn" onClick={() => { setShowModal(false); setEditingRule(null); resetForm(); }}>Cancel</button>
                <button className="wa-btn wa-btn-primary" onClick={handleSubmit}>
                  {editingRule ? 'Update Rule' : 'Create Rule'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Rules List */}
      {chatbotRules.length === 0 ? (
        <div className="wa-empty">
          <FiActivity size={40} />
          <h3>No chatbot rules yet</h3>
          <p>Create rules to automatically respond to incoming WhatsApp messages</p>
        </div>
      ) : (
        <div className="wa-rules-list">
          {chatbotRules.map(rule => {
            const TriggerIcon = getTriggerIcon(rule.triggerType);
            return (
              <div key={rule._id} className={`wa-rule-card ${!rule.isActive ? 'inactive' : ''}`}>
                <div className="wa-rule-header">
                  <div className="wa-rule-title">
                    <h4>{rule.name}</h4>
                    <div className="wa-rule-meta">
                      <span className="wa-rule-type"><TriggerIcon size={10} /> {rule.triggerType}</span>
                      {rule.triggerValue && <span className="wa-rule-value">{rule.triggerValue}</span>}
                      <span className="wa-rule-priority">P{rule.priority}</span>
                    </div>
                  </div>
                  <div className="wa-rule-controls">
                    <button className={`wa-toggle ${rule.isActive ? 'active' : ''}`}
                      onClick={() => toggleActive(rule)}>
                      <span className="wa-toggle-knob" />
                    </button>
                    <button className="wa-btn wa-btn-sm" onClick={() => handleEdit(rule)}><FiEdit2 size={12} /></button>
                    <button className="wa-btn wa-btn-sm wa-btn-danger" onClick={() => handleDelete(rule._id)}><FiTrash2 size={12} /></button>
                  </div>
                </div>
                <div className="wa-rule-body">
                  <div className="wa-rule-response">
                    <span className="wa-response-type">{rule.responseType}</span>
                    <p>{rule.responseType === 'ai' ? (rule.aiPrompt || '').substring(0, 100) : (rule.responseContent || '').substring(0, 100)}
                      {((rule.responseContent || rule.aiPrompt || '').length > 100) && '...'}
                    </p>
                  </div>
                  {rule.cooldownMinutes > 0 && (
                    <span className="wa-cooldown"><FiClock size={10} /> {rule.cooldownMinutes}min cooldown</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default WhatsAppMarketing;
