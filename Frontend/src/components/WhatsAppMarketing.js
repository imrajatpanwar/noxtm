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
  FiFileText, FiExternalLink, FiPhone, FiEye, FiLayout, FiImage, FiList,
  FiBookmark, FiCalendar, FiXCircle
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
    { label: 'Chatbot', value: dashboard.chatbotEnabled ? 'Active' : 'Off', sub: `${dashboard.chatbotTotalReplies || 0} replies`, icon: FiActivity, color: '#7c3aed' }
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
    setDefaultAccount, qrCode, setQrCode, loading
  } = useWhatsApp();

  const [showLinkModal, setShowLinkModal] = useState(false);
  const [linkName, setLinkName] = useState('');
  const [editingSettings, setEditingSettings] = useState(null);
  const [settingsForm, setSettingsForm] = useState({});

  useEffect(() => { fetchAccounts(); }, [fetchAccounts]);

  // Auto-close QR modal when an account connects
  useEffect(() => {
    if (showLinkModal && accounts.some(a => a.status === 'connected' && !qrCode)) {
      setShowLinkModal(false);
    }
  }, [accounts, qrCode, showLinkModal]);

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
        <div className="wa-modal-overlay" onClick={() => { setShowLinkModal(false); setQrCode(null); }}>
          <div className="wa-modal" onClick={e => e.stopPropagation()}>
            <div className="wa-modal-header">
              <h3>Link WhatsApp Account</h3>
              <button className="wa-modal-close" onClick={() => { setShowLinkModal(false); setQrCode(null); }}><FiX size={16} /></button>
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
  const { accounts, contacts, messages, fetchContacts, fetchMessages, sendMessage, fetchKeypoints, addKeypoint, deleteKeypoint, fetchScheduledMessages, cancelScheduledMessage } = useWhatsApp();
  const [selectedAccount, setSelectedAccount] = useState('');
  const [selectedContact, setSelectedContact] = useState(null);
  const [messageInput, setMessageInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [sending, setSending] = useState(false);
  const [showKeypoints, setShowKeypoints] = useState(false);
  const [keypoints, setKeypoints] = useState([]);
  const [scheduledMsgs, setScheduledMsgs] = useState([]);
  const [keypointInput, setKeypointInput] = useState('');
  const [keypointCategory, setKeypointCategory] = useState('general');
  const [keypointTab, setKeypointTab] = useState('keypoints'); // 'keypoints' | 'scheduled'
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

  // Load keypoints + scheduled msgs when contact or panel changes
  useEffect(() => {
    if (selectedContact && showKeypoints) {
      fetchKeypoints(selectedContact._id).then(res => {
        if (res.success) setKeypoints(res.data);
      });
      fetchScheduledMessages({ contactId: selectedContact._id }).then(res => {
        if (res.success) setScheduledMsgs(res.data);
      });
    }
  }, [selectedContact, showKeypoints, fetchKeypoints, fetchScheduledMessages]);

  const handleAddKeypoint = async () => {
    if (!keypointInput.trim() || !selectedContact) return;
    try {
      const res = await addKeypoint({
        contactId: selectedContact._id,
        accountId: selectedAccount,
        text: keypointInput.trim(),
        category: keypointCategory
      });
      if (res.success) {
        setKeypoints(prev => [res.data, ...prev]);
        setKeypointInput('');
      }
    } catch (e) {
      toast.error('Failed to add keypoint');
    }
  };

  const handleDeleteKeypoint = async (id) => {
    try {
      await deleteKeypoint(id);
      setKeypoints(prev => prev.filter(kp => kp._id !== id));
    } catch (e) {
      toast.error('Failed to delete keypoint');
    }
  };

  const handleCancelScheduled = async (id) => {
    try {
      await cancelScheduledMessage(id);
      setScheduledMsgs(prev => prev.map(m => m._id === id ? { ...m, status: 'cancelled' } : m));
      toast.success('Scheduled message cancelled');
    } catch (e) {
      toast.error('Failed to cancel');
    }
  };

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
              <button className={`wa-keypoints-toggle ${showKeypoints ? 'active' : ''}`}
                onClick={() => setShowKeypoints(!showKeypoints)} title="Keypoints & Scheduled">
                <FiBookmark size={16} />
              </button>
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

            {/* Keypoints Panel */}
            {showKeypoints && (
              <div className="wa-keypoints-panel">
                <div className="wa-keypoints-panel-header">
                  <div className="wa-keypoints-tabs">
                    <button className={keypointTab === 'keypoints' ? 'active' : ''}
                      onClick={() => setKeypointTab('keypoints')}>
                      <FiBookmark size={12} /> Keypoints ({keypoints.length})
                    </button>
                    <button className={keypointTab === 'scheduled' ? 'active' : ''}
                      onClick={() => setKeypointTab('scheduled')}>
                      <FiCalendar size={12} /> Scheduled ({scheduledMsgs.length})
                    </button>
                  </div>
                  <button className="wa-keypoints-close" onClick={() => setShowKeypoints(false)}>
                    <FiX size={14} />
                  </button>
                </div>

                {keypointTab === 'keypoints' && (
                  <div className="wa-keypoints-content">
                    <div className="wa-keypoint-add">
                      <input placeholder="Add keypoint..."
                        value={keypointInput} onChange={e => setKeypointInput(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleAddKeypoint()} />
                      <select value={keypointCategory} onChange={e => setKeypointCategory(e.target.value)}>
                        <option value="general">General</option>
                        <option value="info">Info</option>
                        <option value="interest">Interest</option>
                        <option value="request">Request</option>
                        <option value="issue">Issue</option>
                        <option value="followup">Follow-up</option>
                      </select>
                      <button onClick={handleAddKeypoint} disabled={!keypointInput.trim()}>
                        <FiPlus size={12} />
                      </button>
                    </div>
                    <div className="wa-keypoints-list">
                      {keypoints.length === 0 ? (
                        <div className="wa-empty-sm"><p>No keypoints yet</p></div>
                      ) : (
                        keypoints.map(kp => (
                          <div key={kp._id} className={`wa-keypoint-item ${kp.category}`}>
                            <div className="wa-keypoint-top">
                              <span className={`wa-kp-cat ${kp.category}`}>{kp.category}</span>
                              <span className="wa-kp-source">{kp.source === 'ai' ? '🤖' : '✏️'}</span>
                              <span className="wa-kp-time">{new Date(kp.createdAt).toLocaleDateString()}</span>
                              <button className="wa-kp-del" onClick={() => handleDeleteKeypoint(kp._id)}>
                                <FiX size={10} />
                              </button>
                            </div>
                            <p className="wa-kp-text">{kp.text}</p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}

                {keypointTab === 'scheduled' && (
                  <div className="wa-keypoints-content">
                    <div className="wa-keypoints-list">
                      {scheduledMsgs.length === 0 ? (
                        <div className="wa-empty-sm"><p>No scheduled messages</p></div>
                      ) : (
                        scheduledMsgs.map(msg => (
                          <div key={msg._id} className={`wa-scheduled-item ${msg.status}`}>
                            <div className="wa-scheduled-top">
                              <span className={`wa-sched-status ${msg.status}`}>{msg.status}</span>
                              <span className="wa-sched-time">
                                <FiClock size={10} /> {new Date(msg.scheduledAt).toLocaleString()}
                              </span>
                              {msg.status === 'pending' && (
                                <button className="wa-sched-cancel" onClick={() => handleCancelScheduled(msg._id)}>
                                  <FiXCircle size={12} /> Cancel
                                </button>
                              )}
                            </div>
                            <p className="wa-sched-content">{msg.content}</p>
                            {msg.reason && <p className="wa-sched-reason">{msg.reason}</p>}
                            {msg.status === 'sent' && msg.sentAt && (
                              <p className="wa-sched-sent">Sent: {new Date(msg.sentAt).toLocaleString()}</p>
                            )}
                            {msg.status === 'failed' && msg.error && (
                              <p className="wa-sched-error">Error: {msg.error}</p>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
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
    body: ''
  });

  useEffect(() => { fetchTemplates(); }, [fetchTemplates]);

  const resetForm = () => {
    setForm({
      name: '', category: 'marketing', language: 'en',
      body: ''
    });
    setEditingTemplate(null);
  };

  const handleEdit = (tpl) => {
    setEditingTemplate(tpl._id);
    setForm({
      name: tpl.name,
      category: tpl.category || 'marketing',
      language: tpl.language || 'en',
      body: tpl.body || ''
    });
    setShowModal(true);
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
            <div className="wa-tpl-phone-text">{tpl.body || 'Your message body here...'}</div>
            <div className="wa-tpl-phone-time">{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
          </div>
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
          <p>Create reusable message templates</p>
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
                  </div>
                </div>
                <div className="wa-template-card-body">
                  <p className="wa-template-preview-text">{tpl.body.substring(0, 120)}{tpl.body.length > 120 ? '...' : ''}</p>
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
    randomDelayEnabled: true
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
      setSettings({ delayMin: 10, delayMax: 45, dailyLimit: 100, randomDelayEnabled: true });
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
      const dayLimit = day >= 5 ? Infinity : limit * Math.pow(2, day - 1);
      const batch = Math.min(remaining, dayLimit);
      totalSec += batch * avgDelay;
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
                      <input type="checkbox" checked={settings.randomDelayEnabled}
                        onChange={e => setSettings({ ...settings, randomDelayEnabled: e.target.checked })} />
                      <span>Random delays between messages (anti-ban protection)</span>
                    </label>
                  </div>
                  <div className="wa-settings-info" style={{ position: 'relative' }}>
                    <FiAlertCircle size={12} />
                    <span className="wa-limit-label">Limit: {settings.dailyLimit} Max
                      <span className="wa-limit-tooltip">
                        <strong>Daily Ramp-up Schedule</strong><br />
                        Day 1: {settings.dailyLimit} msgs<br />
                        Day 2: ~{settings.dailyLimit * 2} msgs<br />
                        Day 3: ~{settings.dailyLimit * 4} msgs<br />
                        Day 4: ~{settings.dailyLimit * 8} msgs<br />
                        Day 5: Unlimited
                      </span>
                    </span>
                    • Delay: {settings.delayMin}s–{settings.delayMax}s random
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
                        <span> • Limit: {c.settings?.dailyLimit || 100} Day 1</span>
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
// CHATBOT TAB — AI Bot Settings
// =====================================================
const PROVIDERS = [
  { id: 'openrouter', name: 'OpenRouter', desc: 'Access 100+ models (Gemini, Claude, Llama, etc.)', placeholder: 'sk-or-...' },
  { id: 'openai', name: 'OpenAI', desc: 'GPT-4o, GPT-4, GPT-3.5', placeholder: 'sk-...' },
  { id: 'anthropic', name: 'Anthropic', desc: 'Claude 4, Claude 3.5 Sonnet', placeholder: 'sk-ant-...' },
  { id: 'groq', name: 'Groq', desc: 'Ultra-fast Llama, Mixtral inference', placeholder: 'gsk_...' },
  { id: 'together', name: 'Together AI', desc: 'Open-source models at scale', placeholder: 'tok_...' },
  { id: 'custom', name: 'Custom Endpoint', desc: 'Any OpenAI-compatible API', placeholder: 'your-api-key' }
];

const DEFAULT_MODELS = {
  openrouter: [
    { id: 'deepseek/deepseek-chat-v3-0324:free', label: 'DeepSeek V3.2', free: true },
    { id: 'meta-llama/llama-4-maverick:free', label: 'Meta Llama 4 Maverick', free: true },
    { id: 'meta-llama/llama-4-scout:free', label: 'Meta Llama 4 Scout', free: true },
    { id: 'meta-llama/llama-3.3-70b-instruct:free', label: 'Meta Llama 3.3 70B Instruct', free: true },
    { id: 'deepseek/deepseek-r1-zero:free', label: 'DeepSeek R1 Zero', free: true },
    { id: 'qwen/qwen3-235b-a22b:free', label: 'Qwen3-235B-A22B', free: true },
    { id: 'google/gemini-2.0-flash-001', label: 'Gemini 2.0 Flash' },
    { id: 'anthropic/claude-sonnet-4', label: 'Claude Sonnet 4' },
    { id: 'openai/gpt-4o', label: 'GPT-4o' },
    { id: 'mistralai/mistral-large', label: 'Mistral Large' },
  ],
  openai: [
    { id: 'gpt-4o', label: 'GPT-4o' },
    { id: 'gpt-4o-mini', label: 'GPT-4o Mini' },
    { id: 'gpt-4-turbo', label: 'GPT-4 Turbo' },
    { id: 'gpt-4', label: 'GPT-4' },
    { id: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo' },
    { id: 'o1', label: 'o1' },
    { id: 'o1-mini', label: 'o1 Mini' },
    { id: 'o1-preview', label: 'o1 Preview' },
  ],
  anthropic: [
    { id: 'claude-sonnet-4-20250514', label: 'Claude Sonnet 4' },
    { id: 'claude-opus-4-20250514', label: 'Claude Opus 4' },
    { id: 'claude-3-5-sonnet-20241022', label: 'Claude 3.5 Sonnet' },
    { id: 'claude-3-5-haiku-20241022', label: 'Claude 3.5 Haiku' },
    { id: 'claude-3-opus-20240229', label: 'Claude 3 Opus' },
    { id: 'claude-3-sonnet-20240229', label: 'Claude 3 Sonnet' },
    { id: 'claude-3-haiku-20240307', label: 'Claude 3 Haiku' },
  ],
  groq: [
    { id: 'llama-3.3-70b-versatile', label: 'Llama 3.3 70B' },
    { id: 'llama-3.1-8b-instant', label: 'Llama 3.1 8B Instant' },
    { id: 'mixtral-8x7b-32768', label: 'Mixtral 8x7B' },
  ],
  together: [
    { id: 'meta-llama/Llama-3.3-70B-Instruct-Turbo', label: 'Llama 3.3 70B Turbo' },
    { id: 'mistralai/Mixtral-8x7B-Instruct-v0.1', label: 'Mixtral 8x7B' },
  ],
  custom: []
};

function ChatbotTab() {
  const { chatbot, fetchChatbot, updateChatbot, testChatbot, accounts } = useWhatsApp();

  const [form, setForm] = useState({
    botName: 'botgit',
    botPersonality: 'You are a helpful, professional business assistant. Be concise, friendly, and accurate.',
    enabled: false,
    provider: 'openrouter',
    apiKey: '',
    model: 'deepseek/deepseek-chat-v3-0324:free',
    customEndpoint: '',
    maxTokens: 300,
    temperature: 0.7,
    cooldownMinutes: 1,
    maxSentencesPerMsg: 0,
    accountIds: []
  });

  const [saving, setSaving] = useState(false);
  const [testMsg, setTestMsg] = useState('');
  const [testReply, setTestReply] = useState(null);
  const [testing, setTesting] = useState(false);
  const [dirty, setDirty] = useState(false);

  useEffect(() => { fetchChatbot(); }, [fetchChatbot]);

  useEffect(() => {
    if (chatbot) {
      setForm({
        botName: chatbot.botName || 'botgit',
        botPersonality: chatbot.botPersonality || '',
        enabled: chatbot.enabled || false,
        provider: chatbot.provider || 'openrouter',
        apiKey: chatbot.apiKey || '',
        model: chatbot.model || 'deepseek/deepseek-chat-v3-0324:free',
        customEndpoint: chatbot.customEndpoint || '',
        maxTokens: chatbot.maxTokens || 300,
        temperature: chatbot.temperature || 0.7,
        notesAccess: chatbot.notesAccess || false,
        cooldownMinutes: chatbot.cooldownMinutes ?? 0,
        maxSentencesPerMsg: chatbot.maxSentencesPerMsg ?? 0,
        accountIds: chatbot.accountIds || []
      });
      setDirty(false);
    }
  }, [chatbot]);

  const updateField = (key, val) => {
    setForm(prev => {
      const next = { ...prev, [key]: val };
      // auto-set default model when provider changes
      if (key === 'provider') {
        const models = DEFAULT_MODELS[val] || [];
        next.model = models[0]?.id || models[0] || '';
      }
      return next;
    });
    setDirty(true);
  };

  const handleSave = async () => {
    if (!form.apiKey && form.enabled) {
      toast.error('API key is required to enable the bot');
      return;
    }
    setSaving(true);
    try {
      await updateChatbot(form);
      toast.success('Chatbot settings saved');
      setDirty(false);
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    if (!testMsg.trim()) return;
    setTesting(true);
    setTestReply(null);
    try {
      const res = await testChatbot(testMsg.trim());
      setTestReply(res.data?.reply || res.reply || 'No response');
    } catch (e) {
      setTestReply('Error: ' + (e.response?.data?.message || e.message));
    } finally {
      setTesting(false);
    }
  };

  const selectedProvider = PROVIDERS.find(p => p.id === form.provider) || PROVIDERS[0];
  const modelOptions = DEFAULT_MODELS[form.provider] || [];

  return (
    <div className="wa-chatbot">
      {/* Header with master toggle */}
      <div className="wa-section-header">
        <div>
          <h2>AI Chatbot</h2>
          <p style={{ fontSize: '12px', color: '#888', margin: '2px 0 0' }}>
            Auto-reply to WhatsApp messages using AI
            {chatbot?.totalReplies > 0 && <span> · {chatbot.totalReplies} total replies</span>}
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {dirty && <button className="wa-btn wa-btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save Changes'}
          </button>}
          <div
            className={`wa-toggle-pill ${form.enabled ? 'active' : ''}`}
            onClick={() => updateField('enabled', !form.enabled)}
            style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 14px', borderRadius: '20px', background: form.enabled ? '#25d36618' : '#f5f5f5', border: `1px solid ${form.enabled ? '#25d366' : '#e0e0e0'}` }}
          >
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: form.enabled ? '#25d366' : '#ccc' }} />
            <span style={{ fontSize: '13px', fontWeight: 600, color: form.enabled ? '#25d366' : '#888' }}>
              {form.enabled ? 'Enabled' : 'Disabled'}
            </span>
          </div>
        </div>
      </div>

      <div className="wa-bot-settings">
        {/* Bot Identity Section */}
        <div className="wa-bot-section">
          <div className="wa-bot-section-title"><FiActivity size={14} /> Bot Identity</div>
          <div className="wa-form-row">
            <div className="wa-form-group">
              <label>Bot Name</label>
              <input type="text" value={form.botName} onChange={e => updateField('botName', e.target.value)}
                placeholder="botgit" maxLength={50} />
            </div>
          </div>

          {/* Account Selection */}
          <div className="wa-form-group">
            <label>Accounts</label>
            <div className="wa-account-chips">
              <div
                className={`wa-account-chip ${form.accountIds.length === 0 ? 'selected' : ''}`}
                onClick={() => updateField('accountIds', [])}
              >
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: form.accountIds.length === 0 ? '#25d366' : '#ccc' }} />
                All Accounts
              </div>
              {accounts.filter(a => a.status === 'connected').map(acc => {
                const isSelected = form.accountIds.includes(acc._id);
                return (
                  <div key={acc._id}
                    className={`wa-account-chip ${isSelected ? 'selected' : ''}`}
                    onClick={() => {
                      const current = form.accountIds.length === 0 ? [] : [...form.accountIds];
                      if (isSelected) {
                        const next = current.filter(id => id !== acc._id);
                        updateField('accountIds', next.length === 0 ? [] : next);
                      } else {
                        updateField('accountIds', [...current, acc._id]);
                      }
                    }}
                  >
                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: isSelected ? '#25d366' : '#ccc' }} />
                    {acc.displayName || acc.phoneNumber || acc._id.slice(-6)}
                  </div>
                );
              })}
            </div>
            <span className="wa-help-text">{form.accountIds.length === 0 ? 'Bot replies on all connected accounts' : `Bot replies on ${form.accountIds.length} selected account${form.accountIds.length > 1 ? 's' : ''}`}</span>
          </div>
          <div className="wa-form-group">
            <label>Personality / System Prompt</label>
            <textarea value={form.botPersonality} onChange={e => updateField('botPersonality', e.target.value)}
              placeholder="You are a helpful, professional business assistant..."
              rows={3} maxLength={2000} />
            <span className="wa-char-count">{form.botPersonality.length}/2000</span>
          </div>
        </div>

        {/* Provider Section */}
        <div className="wa-bot-section">
          <div className="wa-bot-section-title"><FiSettings size={14} /> AI Provider</div>
          <div className="wa-provider-grid">
            {PROVIDERS.map(p => (
              <div key={p.id}
                className={`wa-provider-card ${form.provider === p.id ? 'selected' : ''}`}
                onClick={() => updateField('provider', p.id)}>
                <div className="wa-provider-name">{p.name}</div>
                <div className="wa-provider-desc">{p.desc}</div>
              </div>
            ))}
          </div>

          <div className="wa-form-row" style={{ marginTop: '16px' }}>
            <div className="wa-form-group" style={{ flex: 2 }}>
              <label>API Key</label>
              <input type="password" value={form.apiKey} onChange={e => updateField('apiKey', e.target.value)}
                placeholder={selectedProvider.placeholder} />
            </div>
            <div className="wa-form-group" style={{ flex: 1 }}>
              <label>Model</label>
              {modelOptions.length > 0 ? (
                <select value={form.model} onChange={e => updateField('model', e.target.value)}>
                  {modelOptions.map(m => (
                    <option key={m.id} value={m.id}>
                      {m.label}{m.free ? ' ✦ Free' : ''}
                    </option>
                  ))}
                </select>
              ) : (
                <input type="text" value={form.model} onChange={e => updateField('model', e.target.value)}
                  placeholder="model-name" />
              )}
            </div>
          </div>

          {form.provider === 'custom' && (
            <div className="wa-form-group">
              <label>Custom Endpoint URL</label>
              <input type="text" value={form.customEndpoint} onChange={e => updateField('customEndpoint', e.target.value)}
                placeholder="https://your-api.com/v1/chat/completions" />
            </div>
          )}
        </div>

        {/* Knowledge & Settings Section */}
        <div className="wa-bot-section">
          <div className="wa-bot-section-title"><FiFileText size={14} /> Knowledge & Settings</div>

          <div className="wa-bot-toggle-row" style={{ cursor: 'default' }}>
            <div>
              <div style={{ fontWeight: 600, fontSize: '13px' }}>📝 Notes as Knowledge Base</div>
              <div style={{ fontSize: '12px', color: '#888' }}>Assign <strong>botgit</strong> to specific Notes to let the bot use them as context. Go to Notes → Assign to → select botgit.</div>
            </div>
          </div>

          <div className="wa-form-row" style={{ marginTop: '16px' }}>
            <div className="wa-form-group">
              <label>Max Tokens</label>
              <input type="number" value={form.maxTokens} onChange={e => updateField('maxTokens', Math.max(50, Math.min(4000, parseInt(e.target.value) || 300)))}
                min={50} max={4000} />
              <span className="wa-help-text">Response length limit (50-4000)</span>
            </div>
            <div className="wa-form-group">
              <label>Temperature</label>
              <input type="number" value={form.temperature} onChange={e => updateField('temperature', Math.max(0, Math.min(2, parseFloat(e.target.value) || 0.7)))}
                min={0} max={2} step={0.1} />
              <span className="wa-help-text">0 = focused, 2 = creative</span>
            </div>
            <div className="wa-form-group">
              <label>Cooldown (min)</label>
              <input type="number" value={form.cooldownMinutes} onChange={e => updateField('cooldownMinutes', Math.max(0, parseInt(e.target.value) || 0))}
                min={0} />
              <span className="wa-help-text">Wait time per contact</span>
            </div>
            <div className="wa-form-group">
              <label>Max Sentences / Msg</label>
              <input type="number" value={form.maxSentencesPerMsg} onChange={e => updateField('maxSentencesPerMsg', Math.max(0, parseInt(e.target.value) || 0))}
                min={0} />
              <span className="wa-help-text">0 = single msg, or split by sentences</span>
            </div>
          </div>
        </div>

        {/* Test Section */}
        <div className="wa-bot-section">
          <div className="wa-bot-section-title"><FiMessageSquare size={14} /> Test Bot</div>
          <div className="wa-test-chat">
            <div className="wa-test-chat-window">
              {!testReply && !testing && (
                <div className="wa-test-empty">
                  <div style={{ fontSize: '28px', marginBottom: '8px' }}>💬</div>
                  <div style={{ fontWeight: 600, fontSize: '14px', color: '#374151' }}>Test your bot</div>
                  <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '4px' }}>Send a message to see how <strong>{form.botName || 'botgit'}</strong> responds</div>
                </div>
              )}
              {testMsg.trim() && (testing || testReply) && (
                <div className="wa-test-msg wa-test-msg-user">
                  <div className="wa-test-bubble wa-test-bubble-user">{testMsg}</div>
                </div>
              )}
              {testing && (
                <div className="wa-test-msg wa-test-msg-bot">
                  <div className="wa-test-bubble wa-test-bubble-bot">
                    <span className="wa-test-typing">
                      <span className="wa-test-dot" /><span className="wa-test-dot" /><span className="wa-test-dot" />
                    </span>
                  </div>
                </div>
              )}
              {testReply && !testing && (
                <div className="wa-test-msg wa-test-msg-bot">
                  <div className="wa-test-avatar">🤖</div>
                  <div>
                    <div className="wa-test-bot-name">{form.botName || 'botgit'}</div>
                    <div className="wa-test-bubble wa-test-bubble-bot">{testReply}</div>
                  </div>
                </div>
              )}
            </div>
            <div className="wa-test-input-bar">
              <input type="text" value={testMsg} onChange={e => setTestMsg(e.target.value)}
                placeholder={`Message ${form.botName || 'botgit'}...`}
                onKeyDown={e => e.key === 'Enter' && handleTest()}
                disabled={testing} />
              <button className="wa-test-send-btn" onClick={handleTest} disabled={testing || !testMsg.trim()}>
                {testing ? <FiRefreshCw size={16} className="wa-spin" /> : <FiSend size={16} />}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default WhatsAppMarketing;
