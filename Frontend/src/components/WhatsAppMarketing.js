import React, { useState, useEffect, useContext, useRef, useCallback } from 'react';
import api from '../config/api';
import { MessagingContext } from '../contexts/MessagingContext';
import { WhatsAppProvider, useWhatsApp } from '../contexts/WhatsAppContext';
import { QRCodeSVG } from 'qrcode.react';
import { toast } from 'sonner';
import { Skeleton } from './ui/skeleton';
import { confirm } from './ui/alert-dialog';
import {
  FiMessageSquare, FiUsers, FiSmartphone, FiZap, FiSend, FiSearch, FiPlus, FiSettings,
  FiTrash2, FiRefreshCw, FiWifi, FiWifiOff, FiStar, FiX, FiClock, FiEdit2,
  FiPlay, FiPause, FiCheck, FiCheckCircle, FiAlertCircle, FiTrendingUp,
  FiBarChart2, FiFile, FiTag, FiHash, FiActivity,
  FiFileText, FiExternalLink, FiPhone, FiEye, FiLayout, FiImage, FiList,
  FiBookmark, FiCalendar, FiXCircle, FiPaperclip
} from 'react-icons/fi';
import { ToggleGroup, ToggleGroupItem } from './ui/toggle-group';
import { Badge } from './ui/badge';
import './WhatsAppMarketing.css';

const isDev = process.env.NODE_ENV === 'development';
const BACKEND_ORIGIN = process.env.REACT_APP_API_URL || (isDev ? 'http://localhost:5001' : '');

/** Prefix relative /uploads/... paths with backend origin so media loads correctly */
function resolveMediaUrl(url) {
  if (!url) return url;
  if (url.startsWith('/uploads/')) return `${BACKEND_ORIGIN}${url}`;
  return url;
}

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
    <div className={`whwa-container${activeTab === 'chats' ? ' whwa-container--chats' : ''}`}>
      <div className="whwa-header">
        <div className="whwa-header-left">
          <div className="whwa-header-icon">
            <FiMessageSquare size={20} />
          </div>
          <div>
            <h1 className="whwa-header-title">WhatsApp</h1>
            <p className="whwa-header-sub">Manage accounts, chats, campaigns &amp; automation</p>
          </div>
        </div>
        <div className="whwa-tabs">
          {tabs.map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                className={`whwa-tab ${activeTab === tab.id ? 'active' : ''}`}
                onClick={() => setActiveTab(tab.id)}
              >
                <Icon size={14} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="whwa-content">
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

  if (!dashboard) return <div className="whwa-loading" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}><Skeleton className="tw-h-8 tw-w-48" /><Skeleton className="tw-h-4 tw-w-full" /><Skeleton className="tw-h-4 tw-w-full" /><Skeleton className="tw-h-4 tw-w-3/4" /></div>;

  const stats = [
    { label: 'Connected', value: dashboard.accounts?.filter(a => a.status === 'connected').length || 0, sub: `of ${dashboard.accounts?.length || 0} accounts`, icon: FiWifi, color: '#25d366' },
    { label: 'Total Contacts', value: dashboard.totalContacts || 0, icon: FiUsers, color: '#1a1a1a' },
    { label: 'Messages Today', value: dashboard.messagesToday || 0, icon: FiSend, color: '#2563eb' },
    { label: 'Active Campaigns', value: dashboard.activeCampaigns || 0, icon: FiZap, color: '#d97706' },
    { label: 'Chatbot', value: dashboard.chatbotEnabled ? 'Active' : 'Off', sub: `${dashboard.chatbotTotalReplies || 0} replies`, icon: FiActivity, color: '#7c3aed' }
  ];

  return (
    <div className="whwa-dashboard">
      <div className="whwa-stats-grid">
        {stats.map((s, i) => {
          const Icon = s.icon;
          return (
            <div key={i} className="whwa-stat-card">
              <div className="whwa-stat-icon" style={{ background: s.color + '12', color: s.color }}>
                <Icon size={18} />
              </div>
              <div className="whwa-stat-info">
                <span className="whwa-stat-label">{s.label}</span>
                <span className="whwa-stat-value">{s.value}</span>
                {s.sub && <span className="whwa-stat-sub">{s.sub}</span>}
              </div>
            </div>
          );
        })}
      </div>

      {dashboard.accounts && dashboard.accounts.length > 0 && (
        <div className="whwa-section">
          <div className="whwa-section-title">
            <FiSmartphone size={15} />
            <span>Account Status</span>
          </div>
          <div className="whwa-account-list">
            {dashboard.accounts.map(acc => (
              <div key={acc._id} className="whwa-account-row">
                <div className="whwa-account-avatar">
                  {acc.profilePicture ? (
                    <img src={acc.profilePicture} alt="" />
                  ) : (
                    <div className="whwa-avatar-placeholder"><FiSmartphone size={16} /></div>
                  )}
                  <span className={`whwa-online-dot ${acc.status === 'connected' ? 'online' : ''}`} />
                </div>
                <div className="whwa-account-info">
                  <div className="whwa-account-name">{acc.displayName || acc.phoneNumber}</div>
                  <div className="whwa-account-phone">{acc.phoneNumber || 'Not connected'}</div>
                </div>
                <div className={`whwa-status-badge ${acc.status}`}>{acc.status}</div>
                <div className="whwa-account-msgs">
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
    setDefaultAccount, qrCode, setQrCode, linkingAccountId, setLinkingAccountId, loading,
    fetchTeamMembers, assignAccountUsers
  } = useWhatsApp();

  const [showLinkModal, setShowLinkModal] = useState(false);
  const [linkName, setLinkName] = useState('');
  const [editingSettings, setEditingSettings] = useState(null);
  const [settingsForm, setSettingsForm] = useState({});
  const [assigningAccount, setAssigningAccount] = useState(null);
  const [teamMembers, setTeamMembers] = useState([]);
  const [selectedAssignees, setSelectedAssignees] = useState([]);

  useEffect(() => { fetchAccounts(); }, [fetchAccounts]);

  // Auto-close QR modal when the specific account being linked connects
  useEffect(() => {
    if (showLinkModal && linkingAccountId) {
      const linkedAccount = accounts.find(a => a._id === linkingAccountId);
      if (linkedAccount && linkedAccount.status === 'connected') {
        setShowLinkModal(false);
        setQrCode(null);
        setLinkingAccountId(null);
      }
    }
  }, [accounts, showLinkModal, linkingAccountId, setQrCode, setLinkingAccountId]);

  const handleLink = async () => {
    try {
      setShowLinkModal(true);
      toast.info('Scan the QR code with your WhatsApp');
      await linkAccount(linkName || 'My WhatsApp');
      setLinkName('');
    } catch (e) {
      toast.error('Failed to link: ' + (e.response?.data?.message || e.message));
    }
  };

  const handleRemove = async (id) => {
    if (await confirm('Remove this account? All messages and data will be deleted.')) {
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

  const handleOpenAssign = async (acc) => {
    setAssigningAccount(acc._id);
    setSelectedAssignees((acc.assignedUsers || []).map(u => typeof u === 'object' ? u._id : u));
    try {
      const res = await fetchTeamMembers();
      if (res.success) setTeamMembers(res.data);
    } catch (e) { console.error(e); }
  };

  const handleToggleAssignee = (userId) => {
    setSelectedAssignees(prev =>
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    );
  };

  const handleSaveAssign = async () => {
    if (!assigningAccount) return;
    try {
      await assignAccountUsers(assigningAccount, selectedAssignees);
      setAssigningAccount(null);
      toast.success('Users assigned');
    } catch (e) { toast.error(e.message); }
  };

  return (
    <div className="whwa-accounts">
      <div className="whwa-section-header">
        <h2>WhatsApp Accounts</h2>
        <button className="whwa-btn whwa-btn-primary" onClick={handleLink} disabled={loading}>
          <FiPlus size={14} /> Link New Account
        </button>
      </div>

      {/* QR Code Modal */}
      {(showLinkModal || qrCode) && (
        <div className="whwa-modal-overlay" onClick={() => { setShowLinkModal(false); setQrCode(null); }}>
          <div className="whwa-modal" onClick={e => e.stopPropagation()}>
            <div className="whwa-modal-header">
              <h3>Link WhatsApp Account</h3>
              <button className="whwa-modal-close" onClick={() => { setShowLinkModal(false); setQrCode(null); }}><FiX size={16} /></button>
            </div>
            <div className="whwa-modal-body whwa-qr-container">
              {qrCode ? (
                <>
                  <div className="whwa-qr-box">
                    <QRCodeSVG value={qrCode} size={220} level="M" bgColor="#ffffff" fgColor="#1a1a1a" />
                  </div>
                  <p className="whwa-qr-hint">Scan with WhatsApp on your phone</p>
                  <div className="whwa-qr-steps">
                    <div className="whwa-qr-step"><span className="whwa-step-num">1</span>Open WhatsApp</div>
                    <div className="whwa-qr-step"><span className="whwa-step-num">2</span>Tap Settings &rarr; Linked Devices</div>
                    <div className="whwa-qr-step"><span className="whwa-step-num">3</span>Tap Link a Device</div>
                    <div className="whwa-qr-step"><span className="whwa-step-num">4</span>Point camera at this QR code</div>
                  </div>
                </>
              ) : (
                <div className="whwa-loading" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}><Skeleton className="tw-h-8 tw-w-48" /><Skeleton className="tw-h-4 tw-w-full" /><Skeleton className="tw-h-4 tw-w-3/4" /></div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {editingSettings && (
        <div className="whwa-modal-overlay" onClick={() => setEditingSettings(null)}>
          <div className="whwa-modal" onClick={e => e.stopPropagation()}>
            <div className="whwa-modal-header">
              <h3><FiSettings size={16} /> Account Settings</h3>
              <button className="whwa-modal-close" onClick={() => setEditingSettings(null)}><FiX size={16} /></button>
            </div>
            <div className="whwa-modal-body">
              <div className="whwa-form-group">
                <label>Daily Message Limit</label>
                <input type="number" value={settingsForm.dailyLimit || 500}
                  onChange={e => setSettingsForm({ ...settingsForm, dailyLimit: parseInt(e.target.value) })} />
              </div>
              <div className="whwa-form-row">
                <div className="whwa-form-group">
                  <label>Min Delay (sec)</label>
                  <input type="number" value={settingsForm.delayMin || 3}
                    onChange={e => setSettingsForm({ ...settingsForm, delayMin: parseInt(e.target.value) })} />
                </div>
                <div className="whwa-form-group">
                  <label>Max Delay (sec)</label>
                  <input type="number" value={settingsForm.delayMax || 8}
                    onChange={e => setSettingsForm({ ...settingsForm, delayMax: parseInt(e.target.value) })} />
                </div>
              </div>
              <div className="whwa-form-row">
                <div className="whwa-form-group">
                  <label>Send Hours Start</label>
                  <input type="number" min="0" max="23" value={settingsForm.sendHoursStart || 8}
                    onChange={e => setSettingsForm({ ...settingsForm, sendHoursStart: parseInt(e.target.value) })} />
                </div>
                <div className="whwa-form-group">
                  <label>Send Hours End</label>
                  <input type="number" min="0" max="24" value={settingsForm.sendHoursEnd || 22}
                    onChange={e => setSettingsForm({ ...settingsForm, sendHoursEnd: parseInt(e.target.value) })} />
                </div>
              </div>
              <div className="whwa-form-group">
                <label className="whwa-checkbox-label">
                  <input type="checkbox" checked={settingsForm.typingSimulation !== false}
                    onChange={e => setSettingsForm({ ...settingsForm, typingSimulation: e.target.checked })} />
                  Typing Simulation (anti-ban)
                </label>
              </div>
              <div className="whwa-form-actions">
                <button className="whwa-btn" onClick={() => setEditingSettings(null)}>Cancel</button>
                <button className="whwa-btn whwa-btn-primary" onClick={handleSaveSettings}>Save Settings</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Assign Users Modal */}
      {assigningAccount && (
        <div className="whwa-modal-overlay" onClick={() => setAssigningAccount(null)}>
          <div className="whwa-modal" onClick={e => e.stopPropagation()}>
            <div className="whwa-modal-header">
              <h3><FiUsers size={16} /> Assign Users</h3>
              <button className="whwa-modal-close" onClick={() => setAssigningAccount(null)}><FiX size={16} /></button>
            </div>
            <div className="whwa-modal-body">
              <p style={{ fontSize: '13px', color: '#666', marginBottom: '12px' }}>
                Only assigned users will see this account. Leave empty to allow all users.
              </p>
              <div className="whwa-assign-list">
                {teamMembers.map(member => (
                  <label key={member._id} className="whwa-assign-item">
                    <input
                      type="checkbox"
                      checked={selectedAssignees.includes(member._id)}
                      onChange={() => handleToggleAssignee(member._id)}
                    />
                    <div className="whwa-assign-info">
                      <span className="whwa-assign-name">{member.fullName || member.email}</span>
                      <span className="whwa-assign-email">{member.email}</span>
                    </div>
                    <span className="whwa-assign-role">{member.role}</span>
                  </label>
                ))}
                {teamMembers.length === 0 && (
                  <div className="whwa-empty-sm"><p>No team members found</p></div>
                )}
              </div>
              <div className="whwa-form-actions">
                <button className="whwa-btn" onClick={() => setAssigningAccount(null)}>Cancel</button>
                <button className="whwa-btn whwa-btn-primary" onClick={handleSaveAssign}>Save</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Account Cards */}
      <div className="whwa-account-cards">
        {accounts.length === 0 ? (
          <div className="whwa-empty">
            <FiSmartphone size={40} />
            <h3>No accounts linked yet</h3>
            <p>Click "Link New Account" to connect your WhatsApp</p>
          </div>
        ) : (
          accounts.map(acc => (
            <div key={acc._id} className={`whwa-account-card ${acc.status}`}>
              <div className="whwa-account-card-header">
                <div className="whwa-account-avatar-lg">
                  {acc.profilePicture ? (
                    <img src={acc.profilePicture} alt="" />
                  ) : (
                    <div className="whwa-avatar-placeholder-lg"><FiSmartphone size={20} /></div>
                  )}
                  <span className={`whwa-online-dot-lg ${acc.status === 'connected' ? 'online' : ''}`} />
                </div>
                <div className="whwa-account-card-info">
                  <h4>{acc.displayName || 'WhatsApp'}</h4>
                  <span className="whwa-phone">{acc.phoneNumber || 'Connecting...'}</span>
                  <div className={`whwa-status-badge ${acc.status}`}>
                    {acc.status === 'connected' ? <FiWifi size={10} /> : <FiWifiOff size={10} />}
                    {acc.status}
                  </div>
                </div>
                {acc.isDefault && <span className="whwa-default-badge"><FiStar size={10} /> Default</span>}
              </div>

              <div className="whwa-account-card-body">
                <div className="whwa-usage-bar">
                  <div className="whwa-usage-label">
                    <span>Daily Usage</span>
                    <span>{acc.dailyMessageCount || 0} / {acc.settings?.dailyLimit || 500}</span>
                  </div>
                  <div className="whwa-progress-track">
                    <div className="whwa-progress-fill" style={{
                      width: `${Math.min(((acc.dailyMessageCount || 0) / (acc.settings?.dailyLimit || 500)) * 100, 100)}%`
                    }} />
                  </div>
                </div>
              </div>

              <div className="whwa-account-card-actions">
                {acc.status === 'connected' && (
                  <>
                    <button className="whwa-btn whwa-btn-sm" onClick={() => disconnectAccount(acc._id)}>
                      <FiWifiOff size={12} /> Disconnect
                    </button>
                    {!acc.isDefault && (
                      <button className="whwa-btn whwa-btn-sm" onClick={() => setDefaultAccount(acc._id)}>
                        <FiStar size={12} /> Set Default
                      </button>
                    )}
                  </>
                )}
                {(acc.status === 'disconnected' || acc.status === 'connecting') && (
                  <button className="whwa-btn whwa-btn-sm whwa-btn-primary" onClick={() => reconnectAccount(acc._id)}>
                    <FiRefreshCw size={12} /> Reconnect
                  </button>
                )}
                <button className="whwa-btn whwa-btn-sm" onClick={() => {
                  setEditingSettings(acc._id);
                  setSettingsForm(acc.settings || {});
                }}>
                  <FiSettings size={12} />
                </button>
                <button className="whwa-btn whwa-btn-sm" onClick={() => handleOpenAssign(acc)}>
                  <FiUsers size={12} /> Assign
                </button>
                <button className="whwa-btn whwa-btn-sm whwa-btn-danger" onClick={() => handleRemove(acc._id)}>
                  <FiTrash2 size={12} />
                </button>
              </div>
              {acc.assignedUsers && acc.assignedUsers.length > 0 && (
                <div className="whwa-assigned-users">
                  <span className="whwa-assigned-label">Assigned:</span>
                  {acc.assignedUsers.map(u => (
                    <span key={typeof u === 'object' ? u._id : u} className="whwa-assigned-tag">
                      {typeof u === 'object' ? (u.fullName || u.email) : u}
                    </span>
                  ))}
                </div>
              )}
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
// Parse WhatsApp-style formatting: *bold*, _italic_, ~strike~, ```mono```
function parseWAFormat(text) {
  if (!text) return null;
  const parts = [];
  // Split by formatting markers
  const regex = /(\*[^*]+\*|_[^_]+_|~[^~]+~|```[^`]+```)/g;
  let last = 0, m;
  while ((m = regex.exec(text)) !== null) {
    if (m.index > last) parts.push({ t: 'plain', v: text.slice(last, m.index) });
    const raw = m[0];
    if (raw.startsWith('*')) parts.push({ t: 'bold', v: raw.slice(1, -1) });
    else if (raw.startsWith('_')) parts.push({ t: 'italic', v: raw.slice(1, -1) });
    else if (raw.startsWith('~')) parts.push({ t: 'strike', v: raw.slice(1, -1) });
    else if (raw.startsWith('```')) parts.push({ t: 'mono', v: raw.slice(3, -3) });
    last = m.index + raw.length;
  }
  if (last < text.length) parts.push({ t: 'plain', v: text.slice(last) });
  return parts.map((p, i) => {
    if (p.t === 'bold') return <strong key={i}>{p.v}</strong>;
    if (p.t === 'italic') return <em key={i}>{p.v}</em>;
    if (p.t === 'strike') return <s key={i}>{p.v}</s>;
    if (p.t === 'mono') return <code key={i} style={{ fontSize: 12, background: 'rgba(0,0,0,0.06)', padding: '1px 4px', borderRadius: 3 }}>{p.v}</code>;
    return <span key={i}>{p.v}</span>;
  });
}

function ChatsTab() {
  const { accounts, contacts, messages, fetchContacts, fetchMessages, sendMessage, fetchKeypoints, addKeypoint, deleteKeypoint, fetchScheduledMessages, cancelScheduledMessage, addScheduledMessage, botTyping } = useWhatsApp();
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
  const [keypointTab, setKeypointTab] = useState('keypoints');
  const [schedInput, setSchedInput] = useState('');
  const [schedDate, setSchedDate] = useState('');
  const [schedReason, setSchedReason] = useState('');
  const [contactLead, setContactLead] = useState(null);
  const [leadsMap, setLeadsMap] = useState({}); // phone → { status }
  const [lightboxImg, setLightboxImg] = useState(null); // for image preview
  const [mediaAttachment, setMediaAttachment] = useState(null); // { file, preview, type, name }
  const messagesAreaRef = useRef(null);
  const textareaRef = useRef(null);
  const mediaInputRef = useRef(null);
  const prevContactIdRef = useRef(null);
  const prevMsgCountRef = useRef(0);

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
      // Fetch all leads for this account to show status dots on contact list
      api.get('/whatsapp-leads').then(res => {
        const map = {};
        (res.data.leads || []).forEach(l => { if (l.phone) map[l.phone] = l; });
        setLeadsMap(map);
      }).catch(() => {});
    }
  }, [selectedAccount, searchQuery, fetchContacts]);

  useEffect(() => {
    if (selectedContact) fetchMessages(selectedContact._id);
  }, [selectedContact, fetchMessages]);

  // Fetch WhatsAppLead status for selected contact
  useEffect(() => {
    if (!selectedContact?.phoneNumber) { setContactLead(null); return; }
    const cleanPhone = selectedContact.phoneNumber.replace(/[^0-9]/g, '');
    const cached = leadsMap[cleanPhone];
    if (cached) { setContactLead(cached); return; }
    api.get('/whatsapp-leads/by-phone', { params: { phone: selectedContact.phoneNumber } })
      .then(res => setContactLead(res.data.lead || null))
      .catch(() => setContactLead(null));
  }, [selectedContact]); // eslint-disable-line

  const handleLeadStatusChange = useCallback(async (newStatus) => {
    if (!selectedContact?.phoneNumber) return;
    try {
      const res = await api.put('/whatsapp-leads/by-phone/status', {
        phone: selectedContact.phoneNumber,
        status: newStatus
      });
      const updated = res.data.lead || { ...contactLead, status: newStatus };
      setContactLead(updated);
      // Update leadsMap too so contact list dot updates
      const cleanPhone = selectedContact.phoneNumber.replace(/[^0-9]/g, '');
      setLeadsMap(prev => ({ ...prev, [cleanPhone]: updated }));
      toast.success(`Lead marked as ${newStatus}`);
    } catch {
      toast.error('Failed to update lead status');
    }
  }, [selectedContact, contactLead]);

  // Scroll: instant when switching contact, smooth only when a NEW message is added.
  // Uses scrollTop on container to avoid scrollIntoView shifting parent containers.
  useEffect(() => {
    const container = messagesAreaRef.current;
    if (!container) return;
    const isSwitching = prevContactIdRef.current !== selectedContact?._id;
    prevContactIdRef.current = selectedContact?._id;
    const contactMessages = selectedContact ? (messages[selectedContact._id] || []) : [];
    const currentCount = contactMessages.length;
    const countChanged = currentCount !== prevMsgCountRef.current;
    prevMsgCountRef.current = currentCount;
    if (isSwitching || countChanged) {
      if (isSwitching) {
        container.scrollTop = container.scrollHeight;
      } else {
        container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
      }
    }
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

  const handleAddScheduled = async () => {
    if (!schedInput.trim() || !schedDate || !selectedContact || !selectedAccount) return;
    try {
      const res = await addScheduledMessage({
        contactId: selectedContact._id,
        accountId: selectedAccount,
        jid: selectedContact.whatsappId,
        content: schedInput.trim(),
        scheduledAt: schedDate,
        reason: schedReason.trim() || undefined
      });
      if (res.success) {
        setScheduledMsgs(prev => [res.data, ...prev]);
        setSchedInput('');
        setSchedDate('');
        setSchedReason('');
        toast.success('Message scheduled');
      }
    } catch (e) {
      toast.error('Failed to schedule message');
    }
  };

  const handleSend = async () => {
    if ((!messageInput.trim() && !mediaAttachment) || !selectedContact || !selectedAccount || sending) return;
    setSending(true);
    try {
      if (mediaAttachment) {
        // Upload media first
        const fd = new FormData();
        fd.append('media', mediaAttachment.file);
        const uploadRes = await api.post('/whatsapp/messages/upload-media', fd, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        const { url, type, mimetype, filename } = uploadRes.data;
        await sendMessage(selectedAccount, selectedContact._id, selectedContact.whatsappId, messageInput.trim() || '', {
          type,
          mediaUrl: url,
          mediaType: mimetype,
          mediaFilename: filename
        });
        removeMediaAttachment();
      } else {
        await sendMessage(selectedAccount, selectedContact._id, selectedContact.whatsappId, messageInput.trim());
      }
      setMessageInput('');
      textareaRef.current?.focus();
    } catch (e) {
      toast.error('Send failed: ' + (e.response?.data?.message || e.message));
    } finally { setSending(false); }
  };

  const handleMediaAttach = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    let type = 'document';
    if (file.type.startsWith('image/')) type = 'image';
    else if (file.type.startsWith('video/')) type = 'video';
    else if (file.type.startsWith('audio/')) type = 'audio';
    const preview = type === 'image' ? URL.createObjectURL(file) : null;
    setMediaAttachment({ file, preview, type, name: file.name });
  };

  const removeMediaAttachment = () => {
    if (mediaAttachment?.preview) URL.revokeObjectURL(mediaAttachment.preview);
    setMediaAttachment(null);
    if (mediaInputRef.current) mediaInputRef.current.value = '';
  };

  // Wrap selected text with format markers
  const applyFormat = (marker) => {
    const ta = textareaRef.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const selected = messageInput.slice(start, end);
    const before = messageInput.slice(0, start);
    const after = messageInput.slice(end);
    const newText = selected
      ? `${before}${marker}${selected}${marker}${after}`
      : `${before}${marker}${marker}${after}`;
    setMessageInput(newText);
    setTimeout(() => {
      ta.focus();
      const pos = selected ? start + marker.length + selected.length + marker.length : start + marker.length;
      ta.setSelectionRange(pos, pos);
    }, 0);
  };

  const contactMessages = selectedContact ? (messages[selectedContact._id] || []) : [];
  const hasSearchQuery = !!searchQuery.trim();

  const getInitials = (name) => name ? name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : '?';

  const leadStatusColor = { active: '#22c55e', dead: '#ef4444', followup: '#f59e0b', converted: '#6366f1', new: '#6b7280' };

  const getContactLead = (contact) => {
    const clean = (contact.phoneNumber || '').replace(/[^0-9]/g, '');
    return leadsMap[clean] || null;
  };

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
    <div className="whwa-chats">
      {/* Left Panel — Contact List */}
      <div className="whwa-chat-sidebar">
        <div className="whwa-chat-sidebar-header">
          <select className="whwa-select" value={selectedAccount}
            onChange={e => { setSelectedAccount(e.target.value); setSelectedContact(null); }}>
            <option value="">Select Account</option>
            {connectedAccounts.map(a => (
              <option key={a._id} value={a._id}>{a.displayName || a.phoneNumber}</option>
            ))}
          </select>
          <div className="whwa-search-wrap">
            <FiSearch size={14} />
            <input className="whwa-search-input" placeholder="Search contacts..."
              value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
          </div>
        </div>
        <div className="whwa-contact-list">
          {contacts.length === 0 ? (
            <div className="whwa-empty-sm">
              <FiUsers size={24} />
              <p>{hasSearchQuery ? 'No contacts found' : 'No contacts yet'}</p>
            </div>
          ) : (
            contacts.map(contact => {
              const cLead = getContactLead(contact);
              return (
                <div key={contact._id}
                  className={`whwa-contact-item ${selectedContact?._id === contact._id ? 'active' : ''}`}
                  onClick={() => setSelectedContact(contact)}>
                  <div className="whwa-contact-avatar" style={{ position: 'relative' }}>
                    {contact.profilePicture ? (
                      <img src={contact.profilePicture} alt="" />
                    ) : (
                      <div className="whwa-avatar-sm">{getInitials(contact.pushName || contact.phoneNumber)}</div>
                    )}
                    {cLead && (
                      <span className="whwa-contact-lead-dot" style={{ background: leadStatusColor[cLead.status] || '#6b7280' }} title={cLead.status} />
                    )}
                  </div>
                  <div className="whwa-contact-details">
                    <div className="whwa-contact-top">
                      <span className="whwa-contact-name">{contact.pushName || contact.phoneNumber}</span>
                      <span className="whwa-contact-time">{formatTime(contact.lastMessageAt)}</span>
                    </div>
                    <div className="whwa-contact-bottom">
                      <span className="whwa-contact-preview">
                        {contact.lastMessageDirection === 'outbound' && <FiCheck size={10} className="whwa-sent-check" />}
                        {contact.lastMessagePreview || 'No messages yet'}
                      </span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        {cLead && (
                          <Badge variant={
                            cLead.status === 'active' ? 'success' :
                            cLead.status === 'converted' ? 'blue' :
                            cLead.status === 'dead' ? 'outline' :
                            'secondary'
                          } style={{ fontSize: 9, padding: '1px 6px', lineHeight: '1.4' }}>
                            {cLead.status === 'followup' ? 'Follow-up' : cLead.status?.charAt(0).toUpperCase() + cLead.status?.slice(1)}
                          </Badge>
                        )}
                        {contact.unreadCount > 0 && <span className="whwa-unread-badge">{contact.unreadCount}</span>}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Right Panel — Messages */}
      <div className="whwa-chat-main">
        {selectedContact ? (
          <>
            <div className="whwa-chat-header">
              <div className="whwa-chat-header-avatar">
                {selectedContact.profilePicture ? (
                  <img src={selectedContact.profilePicture} alt="" />
                ) : (
                  <div className="whwa-avatar-sm">{getInitials(selectedContact.pushName || selectedContact.phoneNumber)}</div>
                )}
              </div>
              <div className="whwa-chat-header-info">
                <h3>{selectedContact.pushName || selectedContact.phoneNumber}</h3>
                {botTyping[selectedContact._id] ? (
                  <span className="whwa-bot-typing-indicator">
                    <span className="whwa-typing-dots"><span></span><span></span><span></span></span>
                    Bot is typing...
                  </span>
                ) : (
                  <span className="whwa-chat-phone">{selectedContact.phoneNumber}</span>
                )}
              </div>
              {selectedContact.tags?.length > 0 && (
                <div className="whwa-chat-tags">
                  {selectedContact.tags.map(tag => (
                    <span key={tag} className="whwa-tag"><FiTag size={9} /> {tag}</span>
                  ))}
                </div>
              )}
              <button className={`whwa-keypoints-toggle ${showKeypoints ? 'active' : ''}`}
                onClick={() => setShowKeypoints(!showKeypoints)} title="Keypoints & Scheduled">
                <FiBookmark size={16} />
              </button>
            </div>

            {/* Lead status bar — only shown if this contact is a campaign lead */}
            {contactLead && (
              <div className="whwa-lead-status-bar">
                <span className="whwa-lead-status-label">Lead:</span>
                {['active', 'dead', 'followup', 'converted'].map(s => (
                  <button
                    key={s}
                    className={`whwa-lead-status-btn ${contactLead.status === s ? 'active' : ''} whwa-lead-${s}`}
                    onClick={() => handleLeadStatusChange(s)}
                  >
                    {s === 'followup' ? 'Follow-up' : s.charAt(0).toUpperCase() + s.slice(1)}
                  </button>
                ))}
              </div>
            )}

            <div className="whwa-messages-area" ref={messagesAreaRef}>
              {contactMessages.length === 0 && (
                <div className="whwa-no-messages"><p>No messages yet. Start the conversation!</p></div>
              )}
              {contactMessages.map((msg, i) => (
                <div key={msg._id || i} className={`whwa-message ${msg.direction}`}>
                  <div className="whwa-message-bubble">
                    {msg.type === 'sticker' && msg.mediaUrl && (
                      <div className="whwa-message-sticker">
                        <img src={resolveMediaUrl(msg.mediaUrl)} alt="sticker" />
                      </div>
                    )}
                    {msg.type !== 'text' && msg.type !== 'sticker' && msg.mediaUrl && (
                      <div className="whwa-message-media">
                        {msg.type === 'image' && (
                          <img src={resolveMediaUrl(msg.mediaUrl)} alt="" className="whwa-media-img"
                            onClick={() => setLightboxImg(resolveMediaUrl(msg.mediaUrl))} />
                        )}
                        {msg.type === 'video' && <video src={resolveMediaUrl(msg.mediaUrl)} controls className="whwa-media-video" />}
                        {msg.type === 'audio' && <audio src={resolveMediaUrl(msg.mediaUrl)} controls className="whwa-media-audio" />}
                        {msg.type === 'document' && (
                          <a href={resolveMediaUrl(msg.mediaUrl)} target="_blank" rel="noopener noreferrer" className="whwa-doc-link">
                            <FiFile size={14} /> {msg.mediaFilename || 'Document'}
                          </a>
                        )}
                      </div>
                    )}
                    {msg.content && <div className="whwa-message-text">{parseWAFormat(msg.content)}</div>}
                    <div className="whwa-message-meta">
                      <span className="whwa-message-time">
                        {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      {msg.direction === 'outbound' && (
                        <span className={`whwa-message-status ${msg.status}`}>
                          {msg.status === 'read' ? <><FiCheck size={10} /><FiCheck size={10} /></> :
                            msg.status === 'delivered' ? <><FiCheck size={10} /><FiCheck size={10} /></> :
                              msg.status === 'sent' ? <FiCheck size={10} /> : <FiClock size={10} />}
                        </span>
                      )}
                      {msg.isAutomated && <span className="whwa-auto-badge"><FiActivity size={9} /></span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="whwa-chat-input-wrap">
              <input type="file" ref={mediaInputRef} style={{ display: 'none' }}
                accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.zip,.rar,.txt"
                onChange={handleMediaAttach} />
              {mediaAttachment && (
                <div className="whwa-media-preview-bar">
                  {mediaAttachment.preview ? (
                    <img src={mediaAttachment.preview} alt="" className="whwa-media-preview-thumb" />
                  ) : (
                    <div className="whwa-media-preview-file"><FiFile size={16} /></div>
                  )}
                  <span className="whwa-media-preview-name">{mediaAttachment.name}</span>
                  <button className="whwa-media-preview-remove" onClick={removeMediaAttachment}><FiX size={14} /></button>
                </div>
              )}
              <div className="whwa-format-toolbar">
                <ToggleGroup type="multiple" className="whwa-format-group">
                  <ToggleGroupItem value="bold" className="whwa-fmt-btn" onClick={() => applyFormat('*')} title="Bold (*text*)">
                    <strong>B</strong>
                  </ToggleGroupItem>
                  <ToggleGroupItem value="italic" className="whwa-fmt-btn" onClick={() => applyFormat('_')} title="Italic (_text_)">
                    <em>I</em>
                  </ToggleGroupItem>
                  <ToggleGroupItem value="strike" className="whwa-fmt-btn" onClick={() => applyFormat('~')} title="Strikethrough (~text~)">
                    <s>S</s>
                  </ToggleGroupItem>
                  <ToggleGroupItem value="mono" className="whwa-fmt-btn" onClick={() => applyFormat('```')} title="Monospace (```text```)">
                    <code style={{ fontSize: 11 }}>{'<>'}</code>
                  </ToggleGroupItem>
                </ToggleGroup>
              </div>
              <div className="whwa-chat-input">
                <button className="whwa-attach-btn" onClick={() => mediaInputRef.current?.click()} title="Attach media">
                  <FiPaperclip size={16} />
                </button>
                <textarea
                  ref={textareaRef}
                  className="whwa-message-input whwa-message-textarea"
                  placeholder="Type a message... (Shift+Enter for new line)"
                  value={messageInput}
                  onChange={e => setMessageInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSend())}
                  disabled={sending}
                  rows={1}
                />
                <button className="whwa-send-btn" onClick={handleSend}
                  disabled={(!messageInput.trim() && !mediaAttachment) || sending}>
                  <FiSend size={16} />
                </button>
              </div>
            </div>

            {/* Keypoints Panel */}
            {showKeypoints && (
              <div className="whwa-keypoints-panel">
                <div className="whwa-keypoints-panel-header">
                  <div className="whwa-keypoints-tabs">
                    <button className={keypointTab === 'keypoints' ? 'active' : ''}
                      onClick={() => setKeypointTab('keypoints')}>
                      <FiBookmark size={12} /> Keypoints ({keypoints.length})
                    </button>
                    <button className={keypointTab === 'scheduled' ? 'active' : ''}
                      onClick={() => setKeypointTab('scheduled')}>
                      <FiCalendar size={12} /> Scheduled ({scheduledMsgs.length})
                    </button>
                  </div>
                  <button className="whwa-keypoints-close" onClick={() => setShowKeypoints(false)}>
                    <FiX size={14} />
                  </button>
                </div>

                {keypointTab === 'keypoints' && (
                  <div className="whwa-keypoints-content">
                    <div className="whwa-keypoint-add">
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
                    <div className="whwa-keypoints-list">
                      {keypoints.length === 0 ? (
                        <div className="whwa-empty-sm"><p>No keypoints yet</p></div>
                      ) : (
                        keypoints.map(kp => (
                          <div key={kp._id} className={`whwa-keypoint-item ${kp.category}`}>
                            <div className="whwa-keypoint-top">
                              <span className={`whwa-kp-cat ${kp.category}`}>{kp.category}</span>
                              <span className="whwa-kp-source">{kp.source === 'ai' ? '🤖' : '✏️'}</span>
                              <span className="whwa-kp-time">{new Date(kp.createdAt).toLocaleDateString()}</span>
                              <button className="whwa-kp-del" onClick={() => handleDeleteKeypoint(kp._id)}>
                                <FiX size={10} />
                              </button>
                            </div>
                            <p className="whwa-kp-text">{kp.text}</p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}

                {keypointTab === 'scheduled' && (
                  <div className="whwa-keypoints-content">
                    <div className="whwa-sched-add">
                      <input placeholder="Message content..."
                        value={schedInput} onChange={e => setSchedInput(e.target.value)} />
                      <input type="datetime-local" value={schedDate}
                        onChange={e => setSchedDate(e.target.value)}
                        min={new Date().toISOString().slice(0, 16)} />
                      <input placeholder="Reason (optional)"
                        value={schedReason} onChange={e => setSchedReason(e.target.value)} />
                      <button onClick={handleAddScheduled}
                        disabled={!schedInput.trim() || !schedDate}>
                        <FiPlus size={12} /> Schedule
                      </button>
                    </div>
                    <div className="whwa-keypoints-list">
                      {scheduledMsgs.length === 0 ? (
                        <div className="whwa-empty-sm"><p>No scheduled messages</p></div>
                      ) : (
                        scheduledMsgs.map(msg => (
                          <div key={msg._id} className={`whwa-scheduled-item ${msg.status}`}>
                            <div className="whwa-scheduled-top">
                              <span className={`whwa-sched-status ${msg.status}`}>{msg.status}</span>
                              <span className="whwa-sched-time">
                                <FiClock size={10} /> {new Date(msg.scheduledAt).toLocaleString()}
                              </span>
                              {msg.status === 'pending' && (
                                <button className="whwa-sched-cancel" onClick={() => handleCancelScheduled(msg._id)}>
                                  <FiXCircle size={12} /> Cancel
                                </button>
                              )}
                            </div>
                            <p className="whwa-sched-content">{msg.content}</p>
                            {msg.reason && <p className="whwa-sched-reason">{msg.reason}</p>}
                            {msg.status === 'sent' && msg.sentAt && (
                              <p className="whwa-sched-sent">Sent: {new Date(msg.sentAt).toLocaleString()}</p>
                            )}
                            {msg.status === 'failed' && msg.error && (
                              <p className="whwa-sched-error">Error: {msg.error}</p>
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
          <div className="whwa-no-chat">
            <div className="whwa-no-chat-graphic">
              <FiMessageSquare size={48} />
            </div>
            <h3>Select a contact</h3>
            <p>Choose a conversation from the left panel to start chatting</p>
          </div>
        )}
      </div>

      {/* Image lightbox */}
      {lightboxImg && (
        <div className="whwa-lightbox" onClick={() => setLightboxImg(null)}>
          <button className="whwa-lightbox-close" onClick={() => setLightboxImg(null)}><FiX size={20} /></button>
          <img src={lightboxImg} alt="media" onClick={e => e.stopPropagation()} />
        </div>
      )}
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
  const [imageUploading, setImageUploading] = useState(false);
  const headerImageRef = useRef(null);
  const [form, setForm] = useState({
    name: '', category: 'marketing', language: 'en',
    body: '', headerImage: ''
  });

  useEffect(() => { fetchTemplates(); }, [fetchTemplates]);

  const resetForm = () => {
    setForm({
      name: '', category: 'marketing', language: 'en',
      body: '', headerImage: ''
    });
    setEditingTemplate(null);
  };

  const handleHeaderImageUpload = async (file) => {
    if (!file) return;
    setImageUploading(true);
    try {
      const fd = new FormData();
      fd.append('image', file);
      const res = await api.post('/whatsapp/templates/upload-image', fd, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      if (res.data.success) {
        setForm(prev => ({ ...prev, headerImage: res.data.url }));
        toast.success('Image uploaded');
      }
    } catch (e) {
      toast.error('Image upload failed');
    } finally {
      setImageUploading(false);
    }
  };

  const handleEdit = (tpl) => {
    setEditingTemplate(tpl._id);
    setForm({
      name: tpl.name,
      category: tpl.category || 'marketing',
      language: tpl.language || 'en',
      body: tpl.body || '',
      headerImage: tpl.headerImage || ''
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

  const apiBase = process.env.REACT_APP_API_URL || '';

  const handleDelete = async (id) => {
    if (await confirm('Delete this template?')) {
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
    <div className="whwa-tpl-phone-preview">
      <div className="whwa-tpl-phone-frame">
        <div className="whwa-tpl-phone-notch"></div>
        <div className="whwa-tpl-phone-header">
          <div className="whwa-tpl-phone-avatar">W</div>
          <span>WhatsApp</span>
        </div>
        <div className="whwa-tpl-phone-body">
          <div className="whwa-tpl-phone-bubble">
            {tpl.headerImage && (
              <div className="whwa-tpl-phone-img-wrap">
                <img
                  src={tpl.headerImage.startsWith('http') ? tpl.headerImage : `${apiBase}${tpl.headerImage}`}
                  alt="Header"
                  className="whwa-tpl-phone-img"
                />
              </div>
            )}
            <div className="whwa-tpl-phone-text">{tpl.body || 'Your message body here...'}</div>
            <div className="whwa-tpl-phone-time">{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="whwa-templates">
      <div className="whwa-section-header">
        <h2>Message Templates</h2>
        <button className="whwa-btn whwa-btn-primary" onClick={() => { resetForm(); setShowModal(true); }}>
          <FiPlus size={14} /> New Template
        </button>
      </div>

      {/* Create / Edit Modal */}
      {showModal && (
        <div className="whwa-modal-overlay" onClick={() => { setShowModal(false); resetForm(); }}>
          <div className="whwa-modal whwa-modal-xl" onClick={e => e.stopPropagation()}>
            <div className="whwa-modal-header">
              <h3><FiFileText size={16} /> {editingTemplate ? 'Edit Template' : 'Create Template'}</h3>
              <button className="whwa-modal-close" onClick={() => { setShowModal(false); resetForm(); }}><FiX size={16} /></button>
            </div>
            <div className="whwa-modal-body whwa-tpl-modal-split">
              {/* Left: Form */}
              <div className="whwa-tpl-form-side">
                <div className="whwa-form-row">
                  <div className="whwa-form-group">
                    <label>Template Name *</label>
                    <input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                      placeholder="e.g. Welcome Message" />
                  </div>
                  <div className="whwa-form-group">
                    <label>Category</label>
                    <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
                      <option value="marketing">Marketing</option>
                      <option value="utility">Utility</option>
                      <option value="transactional">Transactional</option>
                    </select>
                  </div>
                </div>

                <div className="whwa-form-group">
                  <label><FiImage size={12} style={{ marginRight: 4 }} />Header Image <span className="whwa-hint">Optional · max 5MB</span></label>
                  <input
                    ref={headerImageRef}
                    type="file"
                    accept="image/*"
                    style={{ display: 'none' }}
                    onChange={e => { if (e.target.files[0]) handleHeaderImageUpload(e.target.files[0]); e.target.value = ''; }}
                  />
                  {form.headerImage ? (
                    <div className="whwa-tpl-img-preview">
                      <img src={form.headerImage.startsWith('http') ? form.headerImage : `${apiBase}${form.headerImage}`} alt="Header" />
                      <button type="button" className="whwa-tpl-img-remove" onClick={() => setForm(prev => ({ ...prev, headerImage: '' }))}><FiX size={12} /></button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      className="whwa-tpl-img-upload-btn"
                      onClick={() => headerImageRef.current?.click()}
                      disabled={imageUploading}
                    >
                      <FiImage size={14} /> {imageUploading ? 'Uploading…' : 'Upload image'}
                    </button>
                  )}
                </div>

                <div className="whwa-form-group">
                  <label>Body * <span className="whwa-hint">Use {'{{name}}'}, {'{{1}}'} for variables</span></label>
                  <textarea value={form.body} onChange={e => setForm({ ...form, body: e.target.value })}
                    placeholder={'Hi {{name}}, thanks for your interest in {{product}}!'} rows={4} />
                  <div className="whwa-tpl-var-chips">
                    {['name', 'phone', 'company'].map(v => (
                      <button key={v} type="button" className="whwa-tpl-var-chip"
                        onClick={() => setForm({ ...form, body: form.body + `{{${v}}}` })}>
                        {`{{${v}}}`}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="whwa-form-actions">
                  <button className="whwa-btn" onClick={() => { setShowModal(false); resetForm(); }}>Cancel</button>
                  <button className="whwa-btn whwa-btn-primary" onClick={handleSubmit}>
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
        <div className="whwa-modal-overlay" onClick={() => setShowPreview(null)}>
          <div className="whwa-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 380 }}>
            <div className="whwa-modal-header">
              <h3><FiEye size={16} /> Preview: {showPreview.name}</h3>
              <button className="whwa-modal-close" onClick={() => setShowPreview(null)}><FiX size={16} /></button>
            </div>
            <div className="whwa-modal-body" style={{ padding: 0 }}>
              <PhonePreview tpl={showPreview} />
            </div>
          </div>
        </div>
      )}

      {/* Templates List */}
      {templates.length === 0 ? (
        <div className="whwa-empty">
          <FiFileText size={40} />
          <h3>No templates yet</h3>
          <p>Create reusable message templates</p>
        </div>
      ) : (
        <div className="whwa-template-list">
          {templates.map(tpl => {
            const catStyle = getCategoryStyle(tpl.category);
            return (
              <div key={tpl._id} className="whwa-template-card">
                <div className="whwa-template-card-header">
                  <div className="whwa-template-card-title">
                    <h4>{tpl.name}</h4>
                    <span className="whwa-template-category" style={{ background: catStyle.bg, color: catStyle.color }}>
                      {tpl.category}
                    </span>
                  </div>
                  <div className="whwa-template-card-meta">
                    <span><FiClock size={10} /> {new Date(tpl.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
                <div className="whwa-template-card-body">
                  <p className="whwa-template-preview-text">{tpl.body.substring(0, 120)}{tpl.body.length > 120 ? '...' : ''}</p>
                </div>
                <div className="whwa-template-card-actions">
                  <button className="whwa-btn whwa-btn-sm" onClick={() => setShowPreview(tpl)}>
                    <FiEye size={12} /> Preview
                  </button>
                  <button className="whwa-btn whwa-btn-sm" onClick={() => handleEdit(tpl)}>
                    <FiEdit2 size={12} /> Edit
                  </button>
                  <button className="whwa-btn whwa-btn-sm whwa-btn-danger" onClick={() => handleDelete(tpl._id)}>
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
    if (await confirm('Delete this phone list?')) {
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
    if (await confirm('Delete this campaign?')) {
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
    <div className="whwa-campaigns">
      <div className="whwa-section-header">
        <h2>Campaigns</h2>
        <button className="whwa-btn whwa-btn-primary" onClick={() => setShowCreateModal(true)}>
          <FiPlus size={14} /> New Campaign
        </button>
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="whwa-modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="whwa-modal whwa-modal-lg" onClick={e => e.stopPropagation()}>
            <div className="whwa-modal-header">
              <h3><FiZap size={16} /> Create Campaign</h3>
              <button className="whwa-modal-close" onClick={() => setShowCreateModal(false)}><FiX size={16} /></button>
            </div>
            <div className="whwa-modal-body">
              <div className="whwa-form-group">
                <label>Campaign Name *</label>
                <input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Product Launch" />
              </div>
              <div className="whwa-form-group">
                <label>WhatsApp Account *</label>
                <select value={form.accountId} onChange={e => setForm({ ...form, accountId: e.target.value })}>
                  <option value="">Select account</option>
                  {connectedAccounts.map(a => (
                    <option key={a._id} value={a._id}>{a.displayName || a.phoneNumber}</option>
                  ))}
                </select>
              </div>

              {/* Template Selection */}
              <div className="whwa-form-group">
                <label><FiFileText size={12} /> Use Template <span className="whwa-hint">Optional — auto-fills message</span></label>
                <select value={form.templateId} onChange={e => handleTemplateSelect(e.target.value)}>
                  <option value="">Write custom message</option>
                  {templates.filter(t => t.isActive !== false).map(t => (
                    <option key={t._id} value={t._id}>{t.name} ({t.category})</option>
                  ))}
                </select>
              </div>



              <div className="whwa-form-group">
                <label>Message * <span className="whwa-hint">Use {'{{name}}'} for personalization</span></label>
                <textarea value={form.message} onChange={e => setForm({ ...form, message: e.target.value })}
                  placeholder="Hi {{name}}, check out our new..." rows={5} />
                <div className="whwa-char-count">{form.message.length} characters</div>
              </div>
              <div className="whwa-form-row">
                <div className="whwa-form-group">
                  <label><FiTag size={12} /> Target Tags <span className="whwa-hint">Comma-separated</span></label>
                  <input type="text" value={form.targetTags} onChange={e => setForm({ ...form, targetTags: e.target.value })}
                    placeholder="e.g. customer, vip" />
                </div>
                <div className="whwa-form-group">
                  <label><FiClock size={12} /> Schedule (optional)</label>
                  <input type="datetime-local" value={form.scheduledAt}
                    onChange={e => setForm({ ...form, scheduledAt: e.target.value })} />
                </div>
              </div>
              {/* Phone List selector */}
              <div className="whwa-form-group">
                <label><FiList size={12} /> Phone List <span className="whwa-hint">Select a saved list or labeled company contacts</span></label>
                <select value={form.phoneListId} onChange={e => setForm({ ...form, phoneListId: e.target.value })}>
                  <option value="">No phone list</option>
                  {phoneLists.filter(l => !l.isLabelList && l.isActive !== false).length > 0 && (
                    <optgroup label="Manual Phone Lists">
                      {phoneLists.filter(l => !l.isLabelList && l.isActive !== false).map(l => (
                        <option key={l._id} value={l._id}>{l.name} ({l.phones?.length || 0} numbers)</option>
                      ))}
                    </optgroup>
                  )}
                  {phoneLists.filter(l => l.isLabelList).length > 0 && (
                    <optgroup label="Company Data Labels">
                      {phoneLists.filter(l => l.isLabelList).map(l => (
                        <option key={l._id} value={l._id}>{l.name} ({l.phoneCount || l.phones?.length || 0} contacts)</option>
                      ))}
                    </optgroup>
                  )}
                </select>
              </div>

              {/* Selected phone list preview */}
              {form.phoneListId && (() => {
                const selectedList = phoneLists.find(l => l._id === form.phoneListId);
                return selectedList ? (
                  <div className="whwa-campaign-tpl-preview">
                    <div className="whwa-campaign-tpl-preview-label">
                      {selectedList.isLabelList ? <FiTag size={12} /> : <FiList size={12} />}
                      {' '}{selectedList.name} — {selectedList.phones.length} {selectedList.isLabelList ? 'contacts' : 'numbers'}
                      {selectedList.isLabelList && <span className="whwa-hint" style={{ marginLeft: 6 }}>from labeled company data</span>}
                    </div>
                    <div className="whwa-pl-preview-phones">
                      {selectedList.phones.slice(0, 5).map((p, i) => (
                        <span key={i} className="whwa-template-btn-pill">
                          <FiPhone size={10} /> {p.name ? `${p.name} (${p.phone})` : p.phone}
                          {p.companyName && <span style={{ fontSize: 10, opacity: 0.7 }}> • {p.companyName}</span>}
                        </span>
                      ))}
                      {selectedList.phones.length > 5 && (
                        <span className="whwa-template-btn-pill">+{selectedList.phones.length - 5} more</span>
                      )}
                    </div>
                  </div>
                ) : null;
              })()}

              <div className="whwa-form-group">
                <label>Additional Phone Numbers <span className="whwa-hint">Optional • comma or new line separated</span></label>
                <textarea
                  value={form.manualPhones}
                  onChange={e => setForm({ ...form, manualPhones: e.target.value })}
                  placeholder="e.g. 919876543210, +1 415 555 0101"
                  rows={2}
                />
              </div>

              {/* Sending Settings */}
              <div className="whwa-settings-toggle" onClick={() => setShowSettings(!showSettings)}>
                <FiSettings size={13} /> Sending Settings
                <span className="whwa-settings-arrow">{showSettings ? '▾' : '▸'}</span>
              </div>
              {showSettings && (
                <div className="whwa-settings-panel">
                  <div className="whwa-settings-row">
                    <div className="whwa-form-group">
                      <label>Delay Min (sec)</label>
                      <input type="number" min={1} max={120} value={settings.delayMin}
                        onChange={e => setSettings({ ...settings, delayMin: +e.target.value })} />
                    </div>
                    <div className="whwa-form-group">
                      <label>Delay Max (sec)</label>
                      <input type="number" min={1} max={120} value={settings.delayMax}
                        onChange={e => setSettings({ ...settings, delayMax: +e.target.value })} />
                    </div>
                    <div className="whwa-form-group">
                      <label>Daily Limit (Day 1)</label>
                      <input type="number" min={1} max={5000} value={settings.dailyLimit}
                        onChange={e => setSettings({ ...settings, dailyLimit: +e.target.value })} />
                    </div>
                  </div>

                  <div className="whwa-settings-checks">
                    <label className="whwa-checkbox-label">
                      <input type="checkbox" checked={settings.randomDelayEnabled}
                        onChange={e => setSettings({ ...settings, randomDelayEnabled: e.target.checked })} />
                      <span>Random delays between messages (anti-ban protection)</span>
                    </label>
                  </div>
                  <div className="whwa-settings-info" style={{ position: 'relative' }}>
                    <FiAlertCircle size={12} />
                    <span className="whwa-limit-label">Limit: {settings.dailyLimit} Max
                      <span className="whwa-limit-tooltip">
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

              <div className="whwa-form-actions">
                <button className="whwa-btn" onClick={() => setShowCreateModal(false)}>Cancel</button>
                <button className="whwa-btn whwa-btn-primary" onClick={handleCreate}>
                  <FiZap size={14} /> Create Campaign
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Sub-tabs: Campaigns vs Phone Lists */}
      <div className="whwa-campaign-subtabs">
        <button className={`whwa-campaign-subtab ${campaignSubTab === 'campaigns' ? 'active' : ''}`}
          onClick={() => setCampaignSubTab('campaigns')}>
          <FiZap size={12} /> Campaigns ({campaigns.length})
        </button>
        <button className={`whwa-campaign-subtab ${campaignSubTab === 'phoneLists' ? 'active' : ''}`}
          onClick={() => setCampaignSubTab('phoneLists')}>
          <FiList size={12} /> Phone Lists ({phoneLists.length})
        </button>
      </div>

      {/* Campaign List or Phone Lists based on sub-tab */}
      {campaignSubTab === 'campaigns' && (
        <>
          {campaigns.length === 0 ? (
            <div className="whwa-empty">
              <FiZap size={40} />
              <h3>No campaigns yet</h3>
              <p>Create a campaign to send bulk messages to your contacts</p>
            </div>
          ) : (
            <div className="whwa-campaign-list">
              {campaigns.map(c => {
                const progress = campaignProgress[c._id];
                const style = getStatusStyle(c.status);
                const StatusIcon = style.icon;
                return (
                  <div key={c._id} className="whwa-campaign-card">
                    <div className="whwa-campaign-header">
                      <div className="whwa-campaign-title">
                        <h4>{c.name}</h4>
                        <span className="whwa-campaign-date">
                          <FiClock size={11} /> {new Date(c.createdAt).toLocaleDateString()}
                          {c.accountId?.displayName && ` • ${c.accountId.displayName}`}
                        </span>
                      </div>
                      <span className="whwa-campaign-status" style={{ background: style.bg, color: style.color }}>
                        <StatusIcon size={11} /> {c.status}
                      </span>
                    </div>

                    <div className="whwa-campaign-stats">
                      <div className="whwa-campaign-stat"><span className="whwa-stat-num">{c.stats?.total || 0}</span><span className="whwa-stat-lbl">Total</span></div>
                      <div className="whwa-campaign-stat"><span className="whwa-stat-num">{c.stats?.sent || 0}</span><span className="whwa-stat-lbl">Sent</span></div>
                      <div className="whwa-campaign-stat"><span className="whwa-stat-num">{c.stats?.delivered || 0}</span><span className="whwa-stat-lbl">Delivered</span></div>
                      <div className="whwa-campaign-stat"><span className="whwa-stat-num">{c.stats?.failed || 0}</span><span className="whwa-stat-lbl">Failed</span></div>
                    </div>

                    {/* Estimated time for draft/scheduled campaigns */}
                    {(c.status === 'draft' || c.status === 'scheduled') && (
                      <div className="whwa-campaign-estimate">
                        <FiClock size={11} /> Est. time: {calcEstimateForCampaign(c)}
                        <span> • Limit: {c.settings?.dailyLimit || 100} Day 1</span>
                      </div>
                    )}

                    {/* Live progress for sending campaigns */}
                    {progress && progress.status === 'sending' && (
                      <>
                        <div className="whwa-progress-bar">
                          <div className="whwa-progress-fill" style={{ width: `${progress.progress || 0}%` }} />
                          <span className="whwa-progress-text">{progress.progress || 0}%</span>
                        </div>
                        <div className="whwa-campaign-live">
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
                      <div className="whwa-campaign-paused-reason">
                        <FiAlertCircle size={11} />
                        {progress.reason === 'daily_limit_reached' && ` Daily limit reached (${progress.dailySentCount}/${progress.dailyLimitToday}). Resumes tomorrow.`}
                        {progress.reason === 'outside_send_hours' && ' Paused — outside active send hours.'}
                        {progress.reason === 'too_many_failures' && ' Paused — too many consecutive failures.'}
                      </div>
                    )}

                    <div className="whwa-campaign-actions">
                      {(c.status === 'draft' || c.status === 'scheduled') && (
                        <>
                          <button className="whwa-btn whwa-btn-sm whwa-btn-primary" onClick={async () => { try { await startCampaign(c._id); toast.success('Campaign started'); } catch (e) { toast.error(e.message); } }}>
                            <FiPlay size={12} /> Start
                          </button>
                          <button className="whwa-btn whwa-btn-sm whwa-btn-danger" onClick={() => handleDelete(c._id)}>
                            <FiTrash2 size={12} />
                          </button>
                        </>
                      )}
                      {c.status === 'sending' && (
                        <button className="whwa-btn whwa-btn-sm" onClick={async () => { try { await pauseCampaign(c._id); toast.info('Campaign paused'); } catch (e) { toast.error(e.message); } }}>
                          <FiPause size={12} /> Pause
                        </button>
                      )}
                      {c.status === 'paused' && (
                        <>
                          <button className="whwa-btn whwa-btn-sm whwa-btn-primary" onClick={async () => { try { await resumeCampaign(c._id); toast.success('Campaign resumed'); } catch (e) { toast.error(e.message); } }}>
                            <FiPlay size={12} /> Resume
                          </button>
                          <button className="whwa-btn whwa-btn-sm whwa-btn-danger" onClick={() => handleDelete(c._id)}>
                            <FiTrash2 size={12} />
                          </button>
                        </>
                      )}
                      {(c.status === 'completed' || c.status === 'failed') && (
                        <button className="whwa-btn whwa-btn-sm whwa-btn-danger" onClick={() => handleDelete(c._id)}>
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
          <div className="whwa-section-header" style={{ marginTop: 8 }}>
            <h2 style={{ fontSize: 14 }}>Phone Lists</h2>
            <button className="whwa-btn whwa-btn-primary" onClick={() => { resetPlForm(); setShowPhoneListModal(true); }}>
              <FiPlus size={14} /> New List
            </button>
          </div>

          {/* Phone List Create/Edit Modal */}
          {showPhoneListModal && (
            <div className="whwa-modal-overlay" onClick={() => { setShowPhoneListModal(false); resetPlForm(); }}>
              <div className="whwa-modal" onClick={e => e.stopPropagation()}>
                <div className="whwa-modal-header">
                  <h3><FiList size={16} /> {editingPhoneList ? 'Edit Phone List' : 'Create Phone List'}</h3>
                  <button className="whwa-modal-close" onClick={() => { setShowPhoneListModal(false); resetPlForm(); }}><FiX size={16} /></button>
                </div>
                <div className="whwa-modal-body">
                  <div className="whwa-form-group">
                    <label>List Name *</label>
                    <input type="text" value={plForm.name} onChange={e => setPlForm({ ...plForm, name: e.target.value })}
                      placeholder="e.g. VIP Customers" />
                  </div>
                  <div className="whwa-form-group">
                    <label>Description <span className="whwa-hint">Optional</span></label>
                    <input type="text" value={plForm.description} onChange={e => setPlForm({ ...plForm, description: e.target.value })}
                      placeholder="e.g. High-value customers for promotions" />
                  </div>
                  <div className="whwa-form-group">
                    <label>Phone Numbers * <span className="whwa-hint">One per line. Use name:phone format for names (e.g. John:919876543210)</span></label>
                    <textarea
                      value={plForm.phonesRaw}
                      onChange={e => setPlForm({ ...plForm, phonesRaw: e.target.value })}
                      placeholder={"919876543210\nJohn:+1 415 555 0101\n+44 20 7946 0958"}
                      rows={8}
                    />
                    <div className="whwa-char-count">{parsePhones(plForm.phonesRaw).length} phone numbers detected</div>
                  </div>
                  <div className="whwa-form-actions">
                    <button className="whwa-btn" onClick={() => { setShowPhoneListModal(false); resetPlForm(); }}>Cancel</button>
                    <button className="whwa-btn whwa-btn-primary" onClick={handlePhoneListSubmit}>
                      {editingPhoneList ? 'Update List' : 'Create List'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Label-based Phone Lists from Company Data */}
          {phoneLists.filter(pl => pl.isLabelList).length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <h3 style={{ fontSize: 13, color: '#6b7280', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                <FiTag size={13} /> Company Data Labels
              </h3>
              <div className="whwa-pl-list">
                {phoneLists.filter(pl => pl.isLabelList).map(pl => (
                  <div key={pl._id} className="whwa-pl-card" style={{ borderLeft: `3px solid ${pl.color || '#6b7280'}` }}>
                    <div className="whwa-pl-card-header">
                      <div>
                        <h4 style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ width: 10, height: 10, borderRadius: '50%', background: pl.color || '#6b7280' }} />
                          {pl.name}
                        </h4>
                        <p className="whwa-pl-desc">{pl.description}</p>
                      </div>
                      <span className="whwa-pl-count">
                        <FiPhone size={11} /> {pl.phoneCount || pl.phones?.length || 0} contacts
                      </span>
                    </div>
                    <div className="whwa-pl-card-phones">
                      {(pl.phones || []).slice(0, 6).map((p, i) => (
                        <span key={i} className="whwa-pl-phone-chip">
                          {p.name ? `${p.name} (${p.phone})` : p.phone}
                          {p.companyName && <span style={{ fontSize: 10, opacity: 0.6 }}> • {p.companyName}</span>}
                        </span>
                      ))}
                      {pl.phones?.length > 6 && <span className="whwa-pl-phone-chip whwa-pl-more">+{pl.phones.length - 6} more</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Manual Phone Lists */}
          {phoneLists.filter(pl => !pl.isLabelList).length === 0 && phoneLists.filter(pl => pl.isLabelList).length === 0 ? (
            <div className="whwa-empty">
              <FiList size={40} />
              <h3>No phone lists yet</h3>
              <p>Create reusable phone number lists or label company contacts to generate lists automatically</p>
            </div>
          ) : (
            <div className="whwa-pl-list">
              {phoneLists.filter(pl => !pl.isLabelList).map(pl => (
                <div key={pl._id} className="whwa-pl-card">
                  <div className="whwa-pl-card-header">
                    <div>
                      <h4>{pl.name}</h4>
                      {pl.description && <p className="whwa-pl-desc">{pl.description}</p>}
                    </div>
                    <span className="whwa-pl-count">
                      <FiPhone size={11} /> {pl.phones?.length || 0} numbers
                    </span>
                  </div>
                  <div className="whwa-pl-card-phones">
                    {(pl.phones || []).slice(0, 6).map((p, i) => (
                      <span key={i} className="whwa-pl-phone-chip">
                        {p.name ? `${p.name} (${p.phone})` : p.phone}
                      </span>
                    ))}
                    {pl.phones?.length > 6 && <span className="whwa-pl-phone-chip whwa-pl-more">+{pl.phones.length - 6} more</span>}
                  </div>
                  <div className="whwa-pl-card-actions">
                    <button className="whwa-btn whwa-btn-sm" onClick={() => handleEditPhoneList(pl)}>
                      <FiEdit2 size={12} /> Edit
                    </button>
                    <button className="whwa-btn whwa-btn-sm whwa-btn-danger" onClick={() => handleDeletePhoneList(pl._id)}>
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

function ChatbotTab() {
  const { chatbot, fetchChatbot, updateChatbot, testChatbot, accounts } = useWhatsApp();

  const [form, setForm] = useState({
    botName: 'botgit',
    botPersonality: 'You are a helpful, professional business assistant. Be concise, friendly, and accurate.',
    enabled: false,
    maxTokens: 100,
    temperature: 2,
    cooldownMinutes: 0,
    maxSentencesPerMsg: 2,
    maxMsgsPerReply: 7,
    msgDelaySec: 0,
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
        maxTokens: chatbot.maxTokens || 300,
        temperature: chatbot.temperature || 0.7,
        notesAccess: chatbot.notesAccess || false,
        cooldownMinutes: chatbot.cooldownMinutes ?? 0,
        maxSentencesPerMsg: chatbot.maxSentencesPerMsg ?? 0,
        maxMsgsPerReply: chatbot.maxMsgsPerReply ?? 1,
        msgDelaySec: chatbot.msgDelaySec ?? 3,
        accountIds: chatbot.accountIds || []
      });
      setDirty(false);
    }
  }, [chatbot]);

  const updateField = (key, val) => {
    setForm(prev => ({ ...prev, [key]: val }));
    setDirty(true);
  };

  const handleSave = async () => {
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

  return (
    <div className="whwa-chatbot">
      {/* Header with master toggle */}
      <div className="whwa-section-header">
        <div>
          <h2>AI Chatbot</h2>
          <p style={{ fontSize: '12px', color: '#888', margin: '2px 0 0' }}>
            Auto-reply to WhatsApp messages using AI
            {chatbot?.totalReplies > 0 && <span> · {chatbot.totalReplies} total replies</span>}
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {dirty && <button className="whwa-btn whwa-btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save Changes'}
          </button>}
          <div
            className={`whwa-toggle-pill ${form.enabled ? 'active' : ''}`}
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

      <div className="whwa-bot-settings">
        {/* Bot Identity Section */}
        <div className="whwa-bot-section">
          <div className="whwa-bot-section-title"><FiActivity size={14} /> Bot Identity</div>
          <div className="whwa-form-row">
            <div className="whwa-form-group">
              <label>Bot Name</label>
              <input type="text" value={form.botName} onChange={e => updateField('botName', e.target.value)}
                placeholder="botgit" maxLength={50} />
            </div>
          </div>

          {/* Account Selection */}
          <div className="whwa-form-group">
            <label>Accounts</label>
            <div className="whwa-account-chips">
              <div
                className={`whwa-account-chip ${form.accountIds.length === 0 ? 'selected' : ''}`}
                onClick={() => updateField('accountIds', [])}
              >
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: form.accountIds.length === 0 ? '#25d366' : '#ccc' }} />
                All Accounts
              </div>
              {accounts.filter(a => a.status === 'connected').map(acc => {
                const isSelected = form.accountIds.includes(acc._id);
                return (
                  <div key={acc._id}
                    className={`whwa-account-chip ${isSelected ? 'selected' : ''}`}
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
            <span className="whwa-help-text">{form.accountIds.length === 0 ? 'Bot replies on all connected accounts' : `Bot replies on ${form.accountIds.length} selected account${form.accountIds.length > 1 ? 's' : ''}`}</span>
          </div>
          <div className="whwa-form-group">
            <label>Personality / System Prompt</label>
            <textarea value={form.botPersonality} onChange={e => updateField('botPersonality', e.target.value)}
              placeholder="You are a helpful, professional business assistant..."
              rows={3} maxLength={2000} />
            <span className="whwa-char-count">{form.botPersonality.length}/2000</span>
          </div>
        </div>

        {/* AI Provider Notice */}
        <div className="whwa-bot-section">
          <div className="whwa-bot-section-title"><FiSettings size={14} /> AI Provider</div>
          <div style={{ padding: '16px', background: '#f5f3ff', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', color: '#6366f1' }}>
            <FiAlertCircle size={16} />
            <span>AI Provider is configured in <strong>Workspace Settings → General</strong>. The same provider & model is used for WhatsApp Bot, AI Commenter, and all AI features.</span>
          </div>
        </div>

        {/* Knowledge & Settings Section */}
        <div className="whwa-bot-section">
          <div className="whwa-bot-section-title"><FiFileText size={14} /> Knowledge & Settings</div>

          <div className="whwa-bot-toggle-row" style={{ cursor: 'default' }}>
            <div>
              <div style={{ fontWeight: 600, fontSize: '13px' }}>📝 Notes as Knowledge Base</div>
              <div style={{ fontSize: '12px', color: '#888' }}>Assign <strong>botgit</strong> to specific Notes to let the bot use them as context. Go to Notes → Assign to → select botgit.</div>
            </div>
          </div>

          <div className="whwa-form-row" style={{ marginTop: '16px' }}>
            <div className="whwa-form-group">
              <label>Max Tokens</label>
              <input type="number" value={form.maxTokens} onChange={e => updateField('maxTokens', Math.max(50, Math.min(4000, parseInt(e.target.value) || 300)))}
                min={50} max={4000} />
              <span className="whwa-help-text">Max reply length (100=short, 300=medium)</span>
            </div>
            <div className="whwa-form-group">
              <label>Temperature</label>
              <input type="number" value={form.temperature} onChange={e => updateField('temperature', Math.max(0, Math.min(2, parseFloat(e.target.value) || 0.7)))}
                min={0} max={2} step={0.1} />
              <span className="whwa-help-text">0 = focused, 2 = creative</span>
            </div>
            <div className="whwa-form-group">
              <label>Cooldown (min)</label>
              <input type="number" value={form.cooldownMinutes} onChange={e => updateField('cooldownMinutes', Math.max(0, parseInt(e.target.value) || 0))}
                min={0} />
              <span className="whwa-help-text">Wait time per contact</span>
            </div>
            <div className="whwa-form-group">
              <label>Max Sentences / Msg</label>
              <input type="number" value={form.maxSentencesPerMsg} onChange={e => updateField('maxSentencesPerMsg', Math.max(0, parseInt(e.target.value) || 0))}
                min={0} />
              <span className="whwa-help-text">0 = single msg, or split by sentences</span>
            </div>
          </div>

          <div className="whwa-form-row" style={{ marginTop: '12px' }}>
            <div className="whwa-form-group">
              <label>Max Msgs / Reply</label>
              <input type="number" value={form.maxMsgsPerReply} onChange={e => updateField('maxMsgsPerReply', Math.max(0, Math.min(10, parseInt(e.target.value) || 0)))}
                min={0} max={10} />
              <span className="whwa-help-text">Cap split messages (0 = unlimited, 1 = single)</span>
            </div>
            <div className="whwa-form-group">
              <label>Reply Delay (sec)</label>
              <input type="number" value={form.msgDelaySec} onChange={e => updateField('msgDelaySec', Math.max(0, Math.min(30, parseInt(e.target.value) || 0)))}
                min={0} max={30} />
              <span className="whwa-help-text">Pause between split messages</span>
            </div>
          </div>
        </div>

        {/* Test Section */}
        <div className="whwa-bot-section">
          <div className="whwa-bot-section-title"><FiMessageSquare size={14} /> Test Bot</div>
          <div className="whwa-test-chat">
            <div className="whwa-test-chat-window">
              {!testReply && !testing && (
                <div className="whwa-test-empty">
                  <div style={{ fontSize: '28px', marginBottom: '8px' }}>💬</div>
                  <div style={{ fontWeight: 600, fontSize: '14px', color: '#374151' }}>Test your bot</div>
                  <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '4px' }}>Send a message to see how <strong>{form.botName || 'botgit'}</strong> responds</div>
                </div>
              )}
              {testMsg.trim() && (testing || testReply) && (
                <div className="whwa-test-msg whwa-test-msg-user">
                  <div className="whwa-test-bubble whwa-test-bubble-user">{testMsg}</div>
                </div>
              )}
              {testing && (
                <div className="whwa-test-msg whwa-test-msg-bot">
                  <div className="whwa-test-bubble whwa-test-bubble-bot">
                    <span className="whwa-test-typing">
                      <span className="whwa-test-dot" /><span className="whwa-test-dot" /><span className="whwa-test-dot" />
                    </span>
                  </div>
                </div>
              )}
              {testReply && !testing && (
                <div className="whwa-test-msg whwa-test-msg-bot">
                  <div className="whwa-test-avatar">🤖</div>
                  <div>
                    <div className="whwa-test-bot-name">{form.botName || 'botgit'}</div>
                    <div className="whwa-test-bubble whwa-test-bubble-bot">{testReply}</div>
                  </div>
                </div>
              )}
            </div>
            <div className="whwa-test-input-bar">
              <input type="text" value={testMsg} onChange={e => setTestMsg(e.target.value)}
                placeholder={`Message ${form.botName || 'botgit'}...`}
                onKeyDown={e => e.key === 'Enter' && handleTest()}
                disabled={testing} />
              <button className="whwa-test-send-btn" onClick={handleTest} disabled={testing || !testMsg.trim()}>
                {testing ? <FiRefreshCw size={16} className="whwa-spin" /> : <FiSend size={16} />}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default WhatsAppMarketing;
