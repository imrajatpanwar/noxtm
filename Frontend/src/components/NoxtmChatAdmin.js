import React, { useState, useEffect, useRef } from 'react';
import { FiSettings, FiMessageCircle, FiChevronLeft, FiSearch, FiToggleLeft, FiToggleRight, FiSave, FiPlus, FiTrash2, FiDatabase, FiEdit2, FiX, FiImage, FiUser } from 'react-icons/fi';
import api from '../config/api';
import { toast } from 'sonner';
import './NoxtmChatAdmin.css';

function NoxtmChatAdmin() {
  const [activeTab, setActiveTab] = useState('conversations');
  const [conversations, setConversations] = useState([]);
  const [selectedConv, setSelectedConv] = useState(null);
  const [selectedMessages, setSelectedMessages] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [stats, setStats] = useState(null);
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [savingConfig, setSavingConfig] = useState(false);

  // Memory state
  const [coreMemory, setCoreMemory] = useState({ name: '', role: '', communicationStyle: '', expertiseAreas: '', preferences: '', commonPhrases: '', workContext: '', goals: '', additionalNotes: '' });
  const [editingCore, setEditingCore] = useState(false);
  const [coreMemoryDraft, setCoreMemoryDraft] = useState(null);
  const [contextMemories, setContextMemories] = useState([]);
  const [learnedMemories, setLearnedMemories] = useState([]);
  const [savingMemory, setSavingMemory] = useState(false);
  const [editingContext, setEditingContext] = useState(null); // null or context obj
  const [showAddContext, setShowAddContext] = useState(false);
  const [newContext, setNewContext] = useState({ label: '', background: '', preferredStyle: '', commonTopics: '', tone: '', notes: '' });
  const [newLearned, setNewLearned] = useState('');
  const [newLearnedCategory, setNewLearnedCategory] = useState('other');

  const messagesEndRef = useRef(null);

  useEffect(() => {
    loadData();
    loadMemoryData();
  }, []);

  useEffect(() => {
    if (selectedConv) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [selectedMessages]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [convRes, statsRes, configRes] = await Promise.all([
        api.get('/noxtm-chat/admin/conversations'),
        api.get('/noxtm-chat/admin/stats'),
        api.get('/noxtm-chat/config')
      ]);
      if (convRes.data.success) setConversations(convRes.data.conversations);
      if (statsRes.data.success) setStats(statsRes.data.stats);
      if (configRes.data.success) setConfig(configRes.data.config);
    } catch (err) {
      console.error('Failed to load admin data:', err);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const loadUserMessages = async (userId) => {
    try {
      const res = await api.get(`/noxtm-chat/admin/messages/${userId}`);
      if (res.data.success) {
        setSelectedMessages(res.data.messages);
        setSelectedUser(res.data.user);
        setSelectedConv(userId);
      }
    } catch (err) {
      toast.error('Failed to load messages');
    }
  };

  const saveConfig = async () => {
    setSavingConfig(true);
    try {
      const res = await api.put('/noxtm-chat/config', config);
      if (res.data.success) {
        setConfig(res.data.config);
        toast.success('Settings saved');
      }
    } catch (err) {
      const errorMsg = err.response?.data?.message || 'Failed to save settings';
      console.error('Config save error:', err.response?.data || err.message);
      toast.error(errorMsg);
    } finally {
      setSavingConfig(false);
    }
  };

  // === Memory Functions ===
  const loadMemoryData = async () => {
    try {
      const [coreRes, ctxRes, learnedRes] = await Promise.all([
        api.get('/noxtm-memory/core'),
        api.get('/noxtm-memory/contexts'),
        api.get('/noxtm-memory/learned')
      ]);
      if (coreRes.data.success) setCoreMemory(coreRes.data.memory);
      if (ctxRes.data.success) setContextMemories(ctxRes.data.contexts);
      if (learnedRes.data.success) setLearnedMemories(learnedRes.data.memories);
    } catch (err) {
      console.error('Failed to load memory:', err);
    }
  };

  const saveCoreMemory = async () => {
    setSavingMemory(true);
    try {
      const dataToSave = coreMemoryDraft || coreMemory;
      const res = await api.put('/noxtm-memory/core', dataToSave);
      if (res.data.success) {
        setCoreMemory(res.data.memory);
        setCoreMemoryDraft(null);
        setEditingCore(false);
        toast.success('Core memory saved');
      }
    } catch (err) {
      toast.error('Failed to save core memory');
    } finally {
      setSavingMemory(false);
    }
  };

  const startEditingCore = () => {
    setCoreMemoryDraft({ ...coreMemory });
    setEditingCore(true);
  };

  const cancelEditingCore = () => {
    setCoreMemoryDraft(null);
    setEditingCore(false);
  };

  const handleProfilePictureChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    // Check file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      alert('Image size must be less than 2MB');
      return;
    }
    
    // Check file type
    if (!file.type.startsWith('image/')) {
      alert('Please select a valid image file');
      return;
    }
    
    const reader = new FileReader();
    reader.onloadend = () => {
      setCoreMemoryDraft(prev => ({
        ...prev,
        profilePicture: reader.result
      }));
    };
    reader.readAsDataURL(file);
  };

  const removeProfilePicture = () => {
    setCoreMemoryDraft(prev => ({
      ...prev,
      profilePicture: ''
    }));
  };

  const addContextMemory = async () => {
    if (!newContext.label.trim()) { toast.error('Label is required'); return; }
    try {
      const res = await api.post('/noxtm-memory/contexts', newContext);
      if (res.data.success) {
        setContextMemories(prev => [...prev, res.data.context]);
        setNewContext({ label: '', background: '', preferredStyle: '', commonTopics: '', tone: '', notes: '' });
        setShowAddContext(false);
        toast.success('Context added');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add context');
    }
  };

  const updateContextMemory = async () => {
    if (!editingContext) return;
    try {
      const res = await api.put(`/noxtm-memory/contexts/${editingContext._id}`, editingContext);
      if (res.data.success) {
        setContextMemories(prev => prev.map(c => c._id === editingContext._id ? res.data.context : c));
        setEditingContext(null);
        toast.success('Context updated');
      }
    } catch (err) {
      toast.error('Failed to update context');
    }
  };

  const deleteContextMemory = async (id) => {
    try {
      await api.delete(`/noxtm-memory/contexts/${id}`);
      setContextMemories(prev => prev.filter(c => c._id !== id));
      toast.success('Context deleted');
    } catch (err) {
      toast.error('Failed to delete context');
    }
  };

  const addLearnedMemory = async () => {
    if (!newLearned.trim()) return;
    try {
      const res = await api.post('/noxtm-memory/learned', { content: newLearned, category: newLearnedCategory });
      if (res.data.success) {
        setLearnedMemories(prev => [res.data.memory, ...prev]);
        setNewLearned('');
        toast.success('Memory added');
      }
    } catch (err) {
      toast.error('Failed to add memory');
    }
  };

  const deleteLearnedMemory = async (id) => {
    try {
      await api.delete(`/noxtm-memory/learned/${id}`);
      setLearnedMemories(prev => prev.filter(m => m._id !== id));
    } catch (err) {
      toast.error('Failed to remove memory');
    }
  };

  const filteredConversations = conversations.filter(c =>
    !searchQuery || c.fullName?.toLowerCase().includes(searchQuery.toLowerCase()) || c.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getInitials = (name) => {
    if (!name) return '?';
    return name.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase();
  };

  const formatDate = (date) => {
    if (!date) return '';
    const d = new Date(date);
    const now = new Date();
    const diff = now - d;
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const formatTime = (date) => {
    if (!date) return '';
    return new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="nca-container">
      {/* Header */}
      <div className="nca-header">
        <div className="nca-header-left">
          <div className="nca-header-icon">N</div>
          <div>
            <h2>Noxtm Chat</h2>
            <p>AI Assistant Management</p>
          </div>
        </div>
      </div>

      {/* Stats Bar */}
      {stats && (
        <div className="nca-stats">
          <div className="nca-stat">
            <span className="nca-stat-value">{stats.totalUsers}</span>
            <span className="nca-stat-label">Users</span>
          </div>
          <div className="nca-stat">
            <span className="nca-stat-value">{stats.totalMessages}</span>
            <span className="nca-stat-label">Messages</span>
          </div>
          <div className="nca-stat">
            <span className="nca-stat-value">{stats.todayMessages}</span>
            <span className="nca-stat-label">Today</span>
          </div>
          <div className="nca-stat">
            <span className="nca-stat-value">{stats.weekMessages}</span>
            <span className="nca-stat-label">This Week</span>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="nca-tabs">
        <button
          className={`nca-tab ${activeTab === 'conversations' ? 'active' : ''}`}
          onClick={() => { setActiveTab('conversations'); setSelectedConv(null); }}
        >
          <FiMessageCircle size={14} />
          Conversations
        </button>
        <button
          className={`nca-tab ${activeTab === 'memory' ? 'active' : ''}`}
          onClick={() => setActiveTab('memory')}
        >
          <FiDatabase size={14} />
          Memory
        </button>
        <button
          className={`nca-tab ${activeTab === 'settings' ? 'active' : ''}`}
          onClick={() => setActiveTab('settings')}
        >
          <FiSettings size={14} />
          Settings
        </button>
      </div>

      {/* Content */}
      <div className="nca-content">
        {/* === Conversations Tab === */}
        {activeTab === 'conversations' && (
          <div className="nca-conversations-layout">
            {/* Conversation List */}
            <div className={`nca-conv-list ${selectedConv ? 'nca-conv-list-hidden-mobile' : ''}`}>
              <div className="nca-conv-search">
                <FiSearch size={14} />
                <input
                  type="text"
                  placeholder="Search users..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              {loading ? (
                <div className="nca-loading">Loading conversations...</div>
              ) : filteredConversations.length === 0 ? (
                <div className="nca-empty">
                  <FiMessageCircle size={24} />
                  <p>No conversations yet</p>
                </div>
              ) : (
                <div className="nca-conv-items">
                  {filteredConversations.map(conv => (
                    <div
                      key={conv.userId}
                      className={`nca-conv-item ${selectedConv === conv.userId?.toString() ? 'active' : ''}`}
                      onClick={() => loadUserMessages(conv.userId)}
                    >
                      <div className="nca-conv-avatar">
                        {conv.profileImage ? (
                          <img src={conv.profileImage} alt="" />
                        ) : (
                          getInitials(conv.fullName)
                        )}
                      </div>
                      <div className="nca-conv-info">
                        <div className="nca-conv-name">
                          {conv.fullName || 'Unknown'}
                          <span className="nca-conv-role">{conv.role}</span>
                        </div>
                        <div className="nca-conv-preview">
                          {conv.lastRole === 'assistant' ? 'Navraj: ' : ''}
                          {conv.lastMessage?.substring(0, 40)}
                        </div>
                      </div>
                      <div className="nca-conv-meta">
                        <span className="nca-conv-time">{formatDate(conv.lastMessageAt)}</span>
                        <span className="nca-conv-count">{conv.messageCount}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Message View */}
            <div className={`nca-message-view ${!selectedConv ? 'nca-message-view-empty' : ''}`}>
              {!selectedConv ? (
                <div className="nca-message-placeholder">
                  <FiMessageCircle size={32} />
                  <p>Select a conversation to view messages</p>
                </div>
              ) : (
                <>
                  <div className="nca-message-header">
                    <button className="nca-back-btn" onClick={() => setSelectedConv(null)}>
                      <FiChevronLeft size={18} />
                    </button>
                    <div className="nca-message-header-avatar">
                      {selectedUser?.profileImage ? (
                        <img src={selectedUser.profileImage} alt="" />
                      ) : (
                        getInitials(selectedUser?.fullName)
                      )}
                    </div>
                    <div>
                      <div className="nca-message-header-name">{selectedUser?.fullName || 'Unknown'}</div>
                      <div className="nca-message-header-email">{selectedUser?.email}</div>
                    </div>
                  </div>

                  <div className="nca-messages-scroll">
                    {selectedMessages.map(msg => (
                      <div key={msg._id} className={`nca-msg ${msg.role}`}>
                        <div className="nca-msg-sender">
                          {msg.role === 'user' ? selectedUser?.fullName : 'Navraj Panwar'}
                        </div>
                        <div className="nca-msg-bubble">{msg.content}</div>
                        <div className="nca-msg-time">{formatTime(msg.createdAt)}</div>
                      </div>
                    ))}
                    <div ref={messagesEndRef} />
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* === Memory Tab === */}
        {activeTab === 'memory' && (
          <div className="nca-settings nca-memory-tab">
            {/* Core Memory */}
            <div className="nca-settings-section">
              <div className="nca-section-header-row">
                <div>
                  <h3>Core Memory — About You</h3>
                  <p className="nca-section-desc">Tell Noxtm about yourself so it can personalize responses to your style.</p>
                </div>
                {!editingCore && (
                  <button className="nca-edit-btn" onClick={startEditingCore}>
                    <FiEdit2 size={13} />
                    Edit
                  </button>
                )}
              </div>

              {/* === Read-Only View === */}
              {!editingCore && coreMemory && (
                <div className="nca-core-view">
                  {(() => {
                    const fields = [
                      { label: 'Name', value: coreMemory.name },
                      { label: 'Role / Profession', value: coreMemory.role },
                      { label: 'Communication Style', value: coreMemory.communicationStyle },
                      { label: 'Expertise Areas', value: coreMemory.expertiseAreas },
                      { label: 'Preferences', value: coreMemory.preferences },
                      { label: 'Common Phrases', value: coreMemory.commonPhrases },
                      { label: 'Work Context', value: coreMemory.workContext },
                      { label: 'Goals', value: coreMemory.goals },
                      { label: 'Additional Notes', value: coreMemory.additionalNotes },
                    ];
                    const filled = fields.filter(f => f.value?.trim());
                    const hasProfilePicture = coreMemory.profilePicture?.trim();
                    
                    if (filled.length === 0 && !hasProfilePicture) {
                      return (
                        <div className="nca-core-empty">
                          <p>No profile information yet. Click <strong>Edit</strong> to add your details.</p>
                        </div>
                      );
                    }
                    
                    return (
                      <>
                        {hasProfilePicture && (
                          <div className="nca-core-row nca-core-row--picture">
                            <span className="nca-core-label">Profile Picture</span>
                            <img src={coreMemory.profilePicture} alt="Profile" className="nca-profile-preview" />
                          </div>
                        )}
                        {filled.map(f => (
                          <div key={f.label} className="nca-core-row">
                            <span className="nca-core-label">{f.label}</span>
                            <span className="nca-core-value">{f.value}</span>
                          </div>
                        ))}
                      </>
                    );
                  })()}
                </div>
              )}

              {/* === Edit Mode === */}
              {editingCore && coreMemoryDraft && (
                <>
                  <div className="nca-memory-fields">
                    {/* Profile Picture Upload */}
                    <div className="nca-mem-field nca-mem-field--picture">
                      <label>Profile Picture</label>
                      {coreMemoryDraft.profilePicture ? (
                        <div className="nca-picture-upload">
                          <img src={coreMemoryDraft.profilePicture} alt="Profile preview" className="nca-picture-preview" />
                          <div className="nca-picture-actions">
                            <label className="nca-picture-change">
                              <FiEdit2 size={14} />
                              Change Image
                              <input type="file" accept="image/*" onChange={handleProfilePictureChange} style={{ display: 'none' }} />
                            </label>
                            <button type="button" className="nca-picture-remove" onClick={removeProfilePicture}>
                              Remove
                            </button>
                          </div>
                        </div>
                      ) : (
                        <label className="nca-picture-upload-btn">
                          <FiImage size={24} />
                          <span>Click to upload profile picture</span>
                          <span className="nca-picture-hint">JPG, PNG or GIF (max 2MB)</span>
                          <input type="file" accept="image/*" onChange={handleProfilePictureChange} style={{ display: 'none' }} />
                        </label>
                      )}
                    </div>
                    
                    <div className="nca-mem-field">
                      <label>Name</label>
                      <input type="text" value={coreMemoryDraft.name || ''} onChange={e => setCoreMemoryDraft({ ...coreMemoryDraft, name: e.target.value })} placeholder="Your name" />
                    </div>
                    <div className="nca-mem-field">
                      <label>Role / Profession</label>
                      <input type="text" value={coreMemoryDraft.role || ''} onChange={e => setCoreMemoryDraft({ ...coreMemoryDraft, role: e.target.value })} placeholder="e.g., Software Engineer, Marketing Manager" />
                    </div>
                    <div className="nca-mem-field">
                      <label>Communication Style</label>
                      <input type="text" value={coreMemoryDraft.communicationStyle || ''} onChange={e => setCoreMemoryDraft({ ...coreMemoryDraft, communicationStyle: e.target.value })} placeholder="e.g., casual, formal, humorous, direct" />
                    </div>
                    <div className="nca-mem-field">
                      <label>Expertise Areas</label>
                      <textarea value={coreMemoryDraft.expertiseAreas || ''} onChange={e => setCoreMemoryDraft({ ...coreMemoryDraft, expertiseAreas: e.target.value })} placeholder="Your skills and knowledge domains" rows={2} />
                    </div>
                    <div className="nca-mem-field">
                      <label>Preferences</label>
                      <textarea value={coreMemoryDraft.preferences || ''} onChange={e => setCoreMemoryDraft({ ...coreMemoryDraft, preferences: e.target.value })} placeholder="Your likes, dislikes, values" rows={2} />
                    </div>
                    <div className="nca-mem-field">
                      <label>Common Phrases</label>
                      <input type="text" value={coreMemoryDraft.commonPhrases || ''} onChange={e => setCoreMemoryDraft({ ...coreMemoryDraft, commonPhrases: e.target.value })} placeholder="Expressions you use frequently" />
                    </div>
                    <div className="nca-mem-field">
                      <label>Work Context</label>
                      <textarea value={coreMemoryDraft.workContext || ''} onChange={e => setCoreMemoryDraft({ ...coreMemoryDraft, workContext: e.target.value })} placeholder="Technologies, tools, projects you work on" rows={2} />
                    </div>
                    <div className="nca-mem-field">
                      <label>Goals</label>
                      <textarea value={coreMemoryDraft.goals || ''} onChange={e => setCoreMemoryDraft({ ...coreMemoryDraft, goals: e.target.value })} placeholder="What you're working toward" rows={2} />
                    </div>
                    <div className="nca-mem-field">
                      <label>Additional Notes</label>
                      <textarea value={coreMemoryDraft.additionalNotes || ''} onChange={e => setCoreMemoryDraft({ ...coreMemoryDraft, additionalNotes: e.target.value })} placeholder="Anything else Noxtm should know about you" rows={2} />
                    </div>
                  </div>

                  <div className="nca-settings-actions nca-edit-actions">
                    <button className="nca-cancel-btn" onClick={cancelEditingCore}>Cancel</button>
                    <button className="nca-save-btn" onClick={saveCoreMemory} disabled={savingMemory}>
                      <FiSave size={14} />
                      {savingMemory ? 'Saving...' : 'Save'}
                    </button>
                  </div>
                </>
              )}
            </div>

            {/* Context Memories */}
            <div className="nca-settings-section">
              <div className="nca-section-header-row">
                <div>
                  <h3>Context Modes</h3>
                  <p className="nca-section-desc">Define different communication contexts. Say "Mode: [name]" in chat to activate.</p>
                </div>
                <button className="nca-add-btn" onClick={() => setShowAddContext(true)}>
                  <FiPlus size={14} />
                  Add
                </button>
              </div>

              {/* Add / Edit Context Form */}
              {(showAddContext || editingContext) && (
                <div className="nca-context-form">
                  <div className="nca-context-form-header">
                    <span>{editingContext ? 'Edit Context' : 'New Context Mode'}</span>
                    <button onClick={() => { setShowAddContext(false); setEditingContext(null); }}><FiX size={14} /></button>
                  </div>
                  <div className="nca-mem-field">
                    <label>Label *</label>
                    <input
                      type="text"
                      value={editingContext ? editingContext.label : newContext.label}
                      onChange={e => editingContext ? setEditingContext({ ...editingContext, label: e.target.value }) : setNewContext({ ...newContext, label: e.target.value })}
                      placeholder='e.g., "Technical Colleagues", "Clients"'
                    />
                  </div>
                  <div className="nca-mem-field">
                    <label>Background</label>
                    <input
                      type="text"
                      value={editingContext ? editingContext.background : newContext.background}
                      onChange={e => editingContext ? setEditingContext({ ...editingContext, background: e.target.value }) : setNewContext({ ...newContext, background: e.target.value })}
                      placeholder="Their technical level or background"
                    />
                  </div>
                  <div className="nca-mem-field">
                    <label>Preferred Style</label>
                    <input
                      type="text"
                      value={editingContext ? editingContext.preferredStyle : newContext.preferredStyle}
                      onChange={e => editingContext ? setEditingContext({ ...editingContext, preferredStyle: e.target.value }) : setNewContext({ ...newContext, preferredStyle: e.target.value })}
                      placeholder="How to communicate with them"
                    />
                  </div>
                  <div className="nca-mem-field">
                    <label>Common Topics</label>
                    <input
                      type="text"
                      value={editingContext ? editingContext.commonTopics : newContext.commonTopics}
                      onChange={e => editingContext ? setEditingContext({ ...editingContext, commonTopics: e.target.value }) : setNewContext({ ...newContext, commonTopics: e.target.value })}
                      placeholder="What they usually need help with"
                    />
                  </div>
                  <div className="nca-mem-field">
                    <label>Tone</label>
                    <input
                      type="text"
                      value={editingContext ? editingContext.tone : newContext.tone}
                      onChange={e => editingContext ? setEditingContext({ ...editingContext, tone: e.target.value }) : setNewContext({ ...newContext, tone: e.target.value })}
                      placeholder="Professional, casual, encouraging..."
                    />
                  </div>
                  <div className="nca-mem-field">
                    <label>Notes</label>
                    <textarea
                      value={editingContext ? editingContext.notes : newContext.notes}
                      onChange={e => editingContext ? setEditingContext({ ...editingContext, notes: e.target.value }) : setNewContext({ ...newContext, notes: e.target.value })}
                      placeholder="Additional instructions for this mode"
                      rows={2}
                    />
                  </div>
                  <div className="nca-context-form-actions">
                    <button className="nca-save-btn" onClick={editingContext ? updateContextMemory : addContextMemory}>
                      <FiSave size={14} />
                      {editingContext ? 'Update' : 'Add Context'}
                    </button>
                  </div>
                </div>
              )}

              {/* Context List */}
              {contextMemories.length === 0 && !showAddContext ? (
                <div className="nca-empty-small">No context modes yet. Add one to customize how Noxtm responds for different audiences.</div>
              ) : (
                <div className="nca-context-list">
                  {contextMemories.map(ctx => (
                    <div key={ctx._id} className="nca-context-card">
                      <div className="nca-context-card-header">
                        <span className="nca-context-label">{ctx.label}</span>
                        <div className="nca-context-actions">
                          <button onClick={() => { setEditingContext({ ...ctx }); setShowAddContext(false); }} title="Edit"><FiEdit2 size={13} /></button>
                          <button onClick={() => deleteContextMemory(ctx._id)} title="Delete"><FiTrash2 size={13} /></button>
                        </div>
                      </div>
                      <div className="nca-context-details">
                        {ctx.tone && <span>Tone: {ctx.tone}</span>}
                        {ctx.preferredStyle && <span>Style: {ctx.preferredStyle}</span>}
                        {ctx.commonTopics && <span>Topics: {ctx.commonTopics}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Learned Memories */}
            <div className="nca-settings-section">
              <h3>Learned Memories</h3>
              <p className="nca-section-desc">Facts and preferences Noxtm has learned from your conversations, or that you've added manually.</p>

              <div className="nca-learned-add">
                <input
                  type="text"
                  value={newLearned}
                  onChange={e => setNewLearned(e.target.value)}
                  placeholder="Add a fact or preference..."
                  onKeyDown={e => e.key === 'Enter' && addLearnedMemory()}
                />
                <select value={newLearnedCategory} onChange={e => setNewLearnedCategory(e.target.value)}>
                  <option value="preference">Preference</option>
                  <option value="fact">Fact</option>
                  <option value="style">Style</option>
                  <option value="correction">Correction</option>
                  <option value="other">Other</option>
                </select>
                <button className="nca-add-btn" onClick={addLearnedMemory}><FiPlus size={14} /></button>
              </div>

              {learnedMemories.length === 0 ? (
                <div className="nca-empty-small">No learned memories yet. They'll appear here as you chat with Noxtm.</div>
              ) : (
                <div className="nca-learned-list">
                  {learnedMemories.map(mem => (
                    <div key={mem._id} className="nca-learned-item">
                      <span className={`nca-learned-cat nca-cat-${mem.category}`}>{mem.category}</span>
                      <span className="nca-learned-content">{mem.content}</span>
                      <span className="nca-learned-source">{mem.source === 'conversation' ? 'Auto' : 'Manual'}</span>
                      <button className="nca-learned-del" onClick={() => deleteLearnedMemory(mem._id)}><FiTrash2 size={12} /></button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* === Settings Tab === */}
        {activeTab === 'settings' && config && (
          <div className="nca-settings">
            {/* === Bot Appearance === */}
            <div className="nca-settings-section">
              <h3>Bot Appearance</h3>
              <p className="nca-section-desc">Customize how the AI bot appears to users in the chat widget.</p>

              {/* Profile Image */}
              <div className="nca-setting-row nca-setting-row-col">
                <span className="nca-setting-label">Profile Image</span>
                {config.botProfilePicture ? (
                  <div className="nca-bot-picture-row">
                    <img src={config.botProfilePicture} alt="Bot" className="nca-bot-picture-preview" />
                    <div className="nca-bot-picture-actions">
                      <label className="nca-bot-picture-change">
                        <FiImage size={14} />
                        Change
                        <input type="file" accept="image/*" onChange={(e) => {
                          const file = e.target.files[0];
                          if (!file) return;
                          if (file.size > 2 * 1024 * 1024) { toast.error('Image must be under 2MB'); return; }
                          if (!file.type.startsWith('image/')) { toast.error('Please select an image file'); return; }
                          const reader = new FileReader();
                          reader.onloadend = () => setConfig({ ...config, botProfilePicture: reader.result });
                          reader.readAsDataURL(file);
                        }} style={{ display: 'none' }} />
                      </label>
                      <button className="nca-bot-picture-remove" onClick={() => setConfig({ ...config, botProfilePicture: '' })}>
                        <FiTrash2 size={14} />
                        Remove
                      </button>
                    </div>
                  </div>
                ) : (
                  <label className="nca-bot-picture-upload">
                    <FiUser size={28} />
                    <span>Upload Profile Image</span>
                    <span className="nca-bot-picture-hint">JPG, PNG or GIF — max 2MB</span>
                    <input type="file" accept="image/*" onChange={(e) => {
                      const file = e.target.files[0];
                      if (!file) return;
                      if (file.size > 2 * 1024 * 1024) { toast.error('Image must be under 2MB'); return; }
                      if (!file.type.startsWith('image/')) { toast.error('Please select an image file'); return; }
                      const reader = new FileReader();
                      reader.onloadend = () => setConfig({ ...config, botProfilePicture: reader.result });
                      reader.readAsDataURL(file);
                    }} style={{ display: 'none' }} />
                  </label>
                )}
              </div>

              {/* Bot Name */}
              <div className="nca-setting-row nca-setting-row-col">
                <span className="nca-setting-label">Bot Display Name</span>
                <input
                  type="text"
                  value={config.botName || ''}
                  onChange={(e) => setConfig({ ...config, botName: e.target.value })}
                  placeholder="e.g., Navraj Panwar"
                />
              </div>

              {/* Bot Title */}
              <div className="nca-setting-row nca-setting-row-col">
                <span className="nca-setting-label">Bot Title / Badge</span>
                <input
                  type="text"
                  value={config.botTitle || ''}
                  onChange={(e) => setConfig({ ...config, botTitle: e.target.value })}
                  placeholder="e.g., Founder, Support, Assistant"
                />
              </div>

              {/* Verified Badge */}
              <div className="nca-setting-row">
                <div className="nca-setting-info">
                  <span className="nca-setting-label">Show Verified Badge</span>
                  <span className="nca-setting-desc">Display a blue verified checkmark next to the bot name</span>
                </div>
                {config && (
                  <button
                    className="nca-toggle"
                    onClick={() => setConfig({ ...config, showVerifiedBadge: !(config.showVerifiedBadge !== false) })}
                  >
                    {(config.showVerifiedBadge !== false) ? <FiToggleRight size={28} className="nca-toggle-on" /> : <FiToggleLeft size={28} className="nca-toggle-off" />}
                  </button>
                )}
              </div>

              {/* Live Preview */}
              <div className="nca-setting-row nca-setting-row-col">
                <span className="nca-setting-label">Preview</span>
                <div className="nca-bot-preview">
                  <div className="nca-bot-preview-avatar">
                    {config.botProfilePicture
                      ? <img src={config.botProfilePicture} alt="Preview" />
                      : <span>{(config.botName || 'NP').split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase()}</span>
                    }
                  </div>
                  <div className="nca-bot-preview-info">
                    <div className="nca-bot-preview-name">
                      {config.botName || 'Navraj Panwar'}
                      {(config.showVerifiedBadge !== false) && (
                        <svg className="nca-bot-preview-verified" viewBox="0 0 22 22" width="14" height="14"><path d="M20.396 11c-.018-.646-.215-1.275-.57-1.816-.354-.54-.852-.972-1.438-1.246.223-.607.27-1.264.14-1.897-.131-.634-.437-1.218-.882-1.687-.47-.445-1.053-.75-1.687-.882-.633-.13-1.29-.083-1.897.14-.273-.587-.704-1.086-1.245-1.44S11.647 1.62 11 1.604c-.646.017-1.273.213-1.813.568s-.969.855-1.24 1.44c-.608-.223-1.267-.272-1.902-.14-.635.13-1.22.436-1.69.882-.445.47-.749 1.055-.878 1.69-.13.633-.08 1.29.144 1.896-.587.274-1.087.705-1.443 1.245-.356.54-.555 1.17-.574 1.817.02.647.218 1.276.574 1.817.356.54.856.972 1.443 1.245-.224.606-.274 1.263-.144 1.896.13.636.433 1.221.878 1.69.47.446 1.055.752 1.69.883.635.13 1.294.083 1.902-.141.27.587.7 1.086 1.24 1.44s1.167.551 1.813.568c.647-.017 1.277-.213 1.817-.567s.972-.854 1.245-1.44c.604.223 1.261.272 1.894.141.636-.131 1.22-.437 1.69-.883.445-.47.75-1.055.88-1.69.131-.633.084-1.29-.139-1.896.586-.274 1.084-.705 1.438-1.246.355-.54.552-1.17.57-1.817zM9.662 14.85l-3.429-3.428 1.293-1.302 2.072 2.072 4.4-4.794 1.347 1.246z" fill="#1d9bf0"/></svg>
                      )}
                      {(config.botTitle || 'Founder') && (
                        <span className="nca-bot-preview-badge">{config.botTitle || 'Founder'}</span>
                      )}
                    </div>
                    <div className="nca-bot-preview-subtitle">Ask me anything about your workspace</div>
                  </div>
                </div>
              </div>
            </div>

            {/* === General Settings === */}
            <div className="nca-settings-section">
              <h3>General</h3>

              <div className="nca-setting-row">
                <div className="nca-setting-info">
                  <span className="nca-setting-label">Enable Noxtm Chat</span>
                  <span className="nca-setting-desc">Allow users to chat with Noxtm AI assistant</span>
                </div>
                <button
                  className="nca-toggle"
                  onClick={() => setConfig({ ...config, enabled: !config.enabled })}
                >
                  {config.enabled ? <FiToggleRight size={28} className="nca-toggle-on" /> : <FiToggleLeft size={28} className="nca-toggle-off" />}
                </button>
              </div>

              <div className="nca-setting-row nca-setting-row-col">
                <span className="nca-setting-label">Welcome Message</span>
                <textarea
                  value={config.welcomeMessage || ''}
                  onChange={(e) => setConfig({ ...config, welcomeMessage: e.target.value })}
                  placeholder="Enter welcome message..."
                  rows={3}
                />
              </div>

              <div className="nca-setting-row">
                <div className="nca-setting-info">
                  <span className="nca-setting-label">Max Messages Per Day</span>
                  <span className="nca-setting-desc">Per-user daily limit</span>
                </div>
                <input
                  type="number"
                  className="nca-setting-number"
                  value={config.maxMessagesPerDay || 100}
                  onChange={(e) => setConfig({ ...config, maxMessagesPerDay: parseInt(e.target.value) || 100 })}
                  min={1}
                  max={1000}
                />
              </div>
            </div>

            {/* === Identity & Personality === */}
            <div className="nca-settings-section">
              <h3>Identity & Personality</h3>
              <p className="nca-section-desc">Define who the bot is and how it behaves in conversations.</p>

              <div className="nca-setting-row nca-setting-row-col">
                <span className="nca-setting-label">Bot Identity</span>
                <span className="nca-setting-desc">Full identity description the bot uses internally (overrides name/title for self-awareness)</span>
                <textarea
                  value={config.botIdentity || ''}
                  onChange={(e) => setConfig({ ...config, botIdentity: e.target.value })}
                  placeholder="e.g., You are Navraj Panwar, the founder and CEO of Noxtm. You speak with authority and deep product knowledge..."
                  rows={3}
                />
              </div>

              <div className="nca-setting-row nca-setting-row-col">
                <span className="nca-setting-label">Personality Type</span>
                <select
                  className="nca-setting-select"
                  value={config.personality || 'professional'}
                  onChange={(e) => setConfig({ ...config, personality: e.target.value })}
                >
                  <option value="professional">Professional</option>
                  <option value="friendly">Friendly</option>
                  <option value="casual">Casual</option>
                  <option value="formal">Formal</option>
                  <option value="witty">Witty</option>
                  <option value="empathetic">Empathetic</option>
                  <option value="motivational">Motivational</option>
                  <option value="strict">Strict</option>
                </select>
              </div>

              <div className="nca-setting-row nca-setting-row-col">
                <span className="nca-setting-label">Anger State</span>
                <span className="nca-setting-desc">Controls assertiveness and directness in responses</span>
                <select
                  className="nca-setting-select"
                  value={config.angerState || 'calm'}
                  onChange={(e) => setConfig({ ...config, angerState: e.target.value })}
                >
                  <option value="calm">Calm — Relaxed and patient</option>
                  <option value="assertive">Assertive — Direct and confident</option>
                  <option value="stern">Stern — Serious and firm</option>
                  <option value="angry">Angry — Frustrated and sharp</option>
                  <option value="furious">Furious — Intense and aggressive</option>
                </select>
              </div>
            </div>

            {/* === Emotional Controls === */}
            <div className="nca-settings-section">
              <h3>Emotional Controls</h3>
              <p className="nca-section-desc">Fine-tune the bot's emotional expression levels.</p>

              {/* Emotional Scale */}
              <div className="nca-setting-row nca-setting-row-col">
                <div className="nca-slider-header">
                  <span className="nca-setting-label">Emotional Scale</span>
                  <span className="nca-slider-value">{config.emotionalScale ?? 5}/10</span>
                </div>
                <span className="nca-setting-desc">How emotionally expressive the bot is (0 = robotic, 10 = very emotional)</span>
                <input
                  type="range"
                  className="nca-slider"
                  min={0} max={10} step={1}
                  value={config.emotionalScale ?? 5}
                  onChange={(e) => setConfig({ ...config, emotionalScale: parseInt(e.target.value) })}
                />
                <div className="nca-slider-labels"><span>Robotic</span><span>Balanced</span><span>Emotional</span></div>
              </div>

              {/* Humor Level */}
              <div className="nca-setting-row nca-setting-row-col">
                <div className="nca-slider-header">
                  <span className="nca-setting-label">Humor Level</span>
                  <span className="nca-slider-value">{config.humorLevel ?? 3}/10</span>
                </div>
                <span className="nca-setting-desc">How much humor/wit to incorporate into responses</span>
                <input
                  type="range"
                  className="nca-slider"
                  min={0} max={10} step={1}
                  value={config.humorLevel ?? 3}
                  onChange={(e) => setConfig({ ...config, humorLevel: parseInt(e.target.value) })}
                />
                <div className="nca-slider-labels"><span>None</span><span>Moderate</span><span>Very Witty</span></div>
              </div>

              {/* Empathy Level */}
              <div className="nca-setting-row nca-setting-row-col">
                <div className="nca-slider-header">
                  <span className="nca-setting-label">Empathy Level</span>
                  <span className="nca-slider-value">{config.empathyLevel ?? 7}/10</span>
                </div>
                <span className="nca-setting-desc">How empathetic and understanding the bot sounds</span>
                <input
                  type="range"
                  className="nca-slider"
                  min={0} max={10} step={1}
                  value={config.empathyLevel ?? 7}
                  onChange={(e) => setConfig({ ...config, empathyLevel: parseInt(e.target.value) })}
                />
                <div className="nca-slider-labels"><span>Detached</span><span>Balanced</span><span>Very Caring</span></div>
              </div>

              {/* Formality */}
              <div className="nca-setting-row nca-setting-row-col">
                <div className="nca-slider-header">
                  <span className="nca-setting-label">Formality</span>
                  <span className="nca-slider-value">{config.formality ?? 5}/10</span>
                </div>
                <span className="nca-setting-desc">How formal the language is (0 = slang, 10 = highly formal)</span>
                <input
                  type="range"
                  className="nca-slider"
                  min={0} max={10} step={1}
                  value={config.formality ?? 5}
                  onChange={(e) => setConfig({ ...config, formality: parseInt(e.target.value) })}
                />
                <div className="nca-slider-labels"><span>Casual</span><span>Neutral</span><span>Formal</span></div>
              </div>
            </div>

            {/* === Response Format === */}
            <div className="nca-settings-section">
              <h3>Response Format</h3>
              <p className="nca-section-desc">Control the length, language, and style of responses.</p>

              <div className="nca-setting-row">
                <div className="nca-setting-info">
                  <span className="nca-setting-label">Max Word Count</span>
                  <span className="nca-setting-desc">Maximum words per response (10–2000)</span>
                </div>
                <input
                  type="number"
                  className="nca-setting-number"
                  value={config.maxWordCount || 200}
                  onChange={(e) => setConfig({ ...config, maxWordCount: Math.min(2000, Math.max(10, parseInt(e.target.value) || 200)) })}
                  min={10}
                  max={2000}
                />
              </div>

              <div className="nca-setting-row nca-setting-row-col">
                <span className="nca-setting-label">Response Language</span>
                <input
                  type="text"
                  value={config.responseLanguage || 'English'}
                  onChange={(e) => setConfig({ ...config, responseLanguage: e.target.value })}
                  placeholder="e.g., English, Spanish, Hindi"
                />
              </div>

              <div className="nca-setting-row">
                <div className="nca-setting-info">
                  <span className="nca-setting-label">Use Emojis</span>
                  <span className="nca-setting-desc">Allow the bot to use emojis in responses</span>
                </div>
                <button
                  className="nca-toggle"
                  onClick={() => setConfig({ ...config, useEmojis: !config.useEmojis })}
                >
                  {config.useEmojis ? <FiToggleRight size={28} className="nca-toggle-on" /> : <FiToggleLeft size={28} className="nca-toggle-off" />}
                </button>
              </div>
            </div>

            {/* === Behavior & Intelligence === */}
            <div className="nca-settings-section">
              <h3>Behavior & Intelligence</h3>
              <p className="nca-section-desc">Adjust how creative, confident, and proactive the bot behaves.</p>

              {/* Creativity Level */}
              <div className="nca-setting-row nca-setting-row-col">
                <div className="nca-slider-header">
                  <span className="nca-setting-label">Creativity</span>
                  <span className="nca-slider-value">{config.creativityLevel ?? 5}/10</span>
                </div>
                <span className="nca-setting-desc">How creative and original the responses are (0 = factual, 10 = very creative)</span>
                <input
                  type="range"
                  className="nca-slider"
                  min={0} max={10} step={1}
                  value={config.creativityLevel ?? 5}
                  onChange={(e) => setConfig({ ...config, creativityLevel: parseInt(e.target.value) })}
                />
                <div className="nca-slider-labels"><span>Factual</span><span>Balanced</span><span>Creative</span></div>
              </div>

              {/* Confidence Level */}
              <div className="nca-setting-row nca-setting-row-col">
                <div className="nca-slider-header">
                  <span className="nca-setting-label">Confidence</span>
                  <span className="nca-slider-value">{config.confidenceLevel ?? 7}/10</span>
                </div>
                <span className="nca-setting-desc">How confident and decisive responses sound (0 = hesitant, 10 = absolute)</span>
                <input
                  type="range"
                  className="nca-slider"
                  min={0} max={10} step={1}
                  value={config.confidenceLevel ?? 7}
                  onChange={(e) => setConfig({ ...config, confidenceLevel: parseInt(e.target.value) })}
                />
                <div className="nca-slider-labels"><span>Hesitant</span><span>Balanced</span><span>Absolute</span></div>
              </div>

              {/* Proactiveness */}
              <div className="nca-setting-row nca-setting-row-col">
                <div className="nca-slider-header">
                  <span className="nca-setting-label">Proactiveness</span>
                  <span className="nca-slider-value">{config.proactiveness ?? 5}/10</span>
                </div>
                <span className="nca-setting-desc">How much the bot offers extra suggestions and follow-ups</span>
                <input
                  type="range"
                  className="nca-slider"
                  min={0} max={10} step={1}
                  value={config.proactiveness ?? 5}
                  onChange={(e) => setConfig({ ...config, proactiveness: parseInt(e.target.value) })}
                />
                <div className="nca-slider-labels"><span>Minimal</span><span>Moderate</span><span>Proactive</span></div>
              </div>
            </div>

            {/* === Content Control === */}
            <div className="nca-settings-section">
              <h3>Content Control</h3>
              <p className="nca-section-desc">Define topics the bot should focus on or avoid.</p>

              <div className="nca-setting-row nca-setting-row-col">
                <span className="nca-setting-label">Focus Topics</span>
                <span className="nca-setting-desc">Topics the bot should prioritize and discuss (comma-separated)</span>
                <textarea
                  value={config.focusTopics || ''}
                  onChange={(e) => setConfig({ ...config, focusTopics: e.target.value })}
                  placeholder="e.g., CRM features, sales, productivity, product updates"
                  rows={2}
                />
              </div>

              <div className="nca-setting-row nca-setting-row-col">
                <span className="nca-setting-label">Forbidden Topics</span>
                <span className="nca-setting-desc">Topics the bot must never discuss (comma-separated)</span>
                <textarea
                  value={config.forbiddenTopics || ''}
                  onChange={(e) => setConfig({ ...config, forbiddenTopics: e.target.value })}
                  placeholder="e.g., competitor pricing, internal financials, politics"
                  rows={2}
                />
              </div>
            </div>

            {/* === Custom Instructions === */}
            <div className="nca-settings-section">
              <h3>Advanced</h3>
              <p className="nca-section-desc">Add custom prompt instructions and overrides for full control.</p>

              <div className="nca-setting-row nca-setting-row-col">
                <span className="nca-setting-label">Custom Instructions</span>
                <span className="nca-setting-desc">Free-form instructions appended to the bot's system prompt</span>
                <textarea
                  value={config.customInstructions || ''}
                  onChange={(e) => setConfig({ ...config, customInstructions: e.target.value })}
                  placeholder="e.g., Always end with a question. Never use exclamation marks. Mention our new product launch when relevant..."
                  rows={4}
                />
              </div>

              <div className="nca-setting-row nca-setting-row-col">
                <span className="nca-setting-label">System Prompt Override (Optional)</span>
                <span className="nca-setting-desc">Fully replaces the auto-generated prompt — use only if you know what you're doing</span>
                <textarea
                  value={config.systemPromptOverride || ''}
                  onChange={(e) => setConfig({ ...config, systemPromptOverride: e.target.value })}
                  placeholder="Full custom system prompt..."
                  rows={4}
                />
              </div>
            </div>

            <div className="nca-settings-actions">
              <button className="nca-save-btn" onClick={saveConfig} disabled={savingConfig}>
                <FiSave size={14} />
                {savingConfig ? 'Saving...' : 'Save Settings'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default NoxtmChatAdmin;
