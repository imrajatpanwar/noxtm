import React, { useState, useEffect, useRef } from 'react';
import { FiSettings, FiMessageCircle, FiChevronLeft, FiSearch, FiToggleLeft, FiToggleRight, FiSave, FiPlus, FiTrash2, FiDatabase, FiEdit2, FiX, FiImage } from 'react-icons/fi';
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
        toast.success('Settings saved successfully!');
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

  const handleBotProfilePictureChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    // Check file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Image size must be less than 2MB');
      return;
    }
    
    // Check file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select a valid image file');
      return;
    }
    
    const reader = new FileReader();
    reader.onloadend = () => {
      setConfig(prev => ({
        ...prev,
        botProfilePicture: reader.result
      }));
    };
    reader.readAsDataURL(file);
  };

  const removeBotProfilePicture = () => {
    setConfig(prev => ({
      ...prev,
      botProfilePicture: ''
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
          <div className="nca-settings nca-settings-compact">
            <button className="nca-save-settings-btn" onClick={saveConfig} disabled={savingConfig}>
              <FiSave size={16} />
              {savingConfig ? 'Saving...' : 'Save Settings'}
            </button>
            
            {/* LEFT COLUMN: Bot Identity & Behavior */}
            <div className="nca-settings-section">
              <h3>🤖 Bot Identity & Behavior</h3>
              
              {/* Appearance compact */}
              <div className="nca-settings-group">
                <div className="nca-group-label">Appearance</div>
                <div className="nca-compact-row">
                  <input type="text" value={config.botName || ''} onChange={(e) => setConfig({ ...config, botName: e.target.value })} placeholder="Bot Name" />
                  <input type="text" value={config.botTitle || ''} onChange={(e) => setConfig({ ...config, botTitle: e.target.value })} placeholder="Title/Badge" />
                </div>
                {/* Profile Picture Upload */}
                <div className="nca-profile-upload-compact">
                  {config.botProfilePicture ? (
                    <div className="nca-profile-preview-compact">
                      <img src={config.botProfilePicture} alt="Bot profile" />
                      <div className="nca-profile-actions">
                        <label className="nca-profile-change">
                          <FiImage size={14} /> Change
                          <input type="file" accept="image/*" onChange={handleBotProfilePictureChange} style={{ display: 'none' }} />
                        </label>
                        <button type="button" className="nca-profile-remove" onClick={removeBotProfilePicture}>
                          <FiTrash2 size={14} /> Remove
                        </button>
                      </div>
                    </div>
                  ) : (
                    <label className="nca-profile-upload-btn">
                      <FiImage size={16} />
                      <span>Upload Bot Profile Picture</span>
                      <input type="file" accept="image/*" onChange={handleBotProfilePictureChange} style={{ display: 'none' }} />
                    </label>
                  )}
                </div>
              </div>

              {/* Identity & Personality */}
              <div className="nca-settings-group">
                <div className="nca-group-label">Identity</div>
                <textarea value={config.botIdentity || ''} onChange={(e) => setConfig({ ...config, botIdentity: e.target.value })} placeholder="Who is the bot? (e.g., founder, support rep...)" rows={2} />
                <select className="nca-setting-select" value={config.personality || 'professional'} onChange={(e) => setConfig({ ...config, personality: e.target.value })}>
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

              {/* Emotional Tuning */}
              <div className="nca-settings-group">
                <div className="nca-group-label">Emotional Tuning</div>
                <div className="nca-compact-slider">
                  <label>Emotional <span>{config.emotionalScale ?? 5}</span></label>
                  <input type="range" className="nca-slider" min={0} max={10} value={config.emotionalScale ?? 5} onChange={(e) => setConfig({ ...config, emotionalScale: parseInt(e.target.value) })} />
                </div>
                <div className="nca-compact-slider">
                  <label>Humor <span>{config.humorLevel ?? 3}</span></label>
                  <input type="range" className="nca-slider" min={0} max={10} value={config.humorLevel ?? 3} onChange={(e) => setConfig({ ...config, humorLevel: parseInt(e.target.value) })} />
                </div>
                <div className="nca-compact-slider">
                  <label>Empathy <span>{config.empathyLevel ?? 7}</span></label>
                  <input type="range" className="nca-slider" min={0} max={10} value={config.empathyLevel ?? 7} onChange={(e) => setConfig({ ...config, empathyLevel: parseInt(e.target.value) })} />
                </div>
                <div className="nca-compact-slider">
                  <label>Formality <span>{config.formality ?? 5}</span></label>
                  <input type="range" className="nca-slider" min={0} max={10} value={config.formality ?? 5} onChange={(e) => setConfig({ ...config, formality: parseInt(e.target.value) })} />
                </div>
              </div>

              {/* Intelligence */}
              <div className="nca-settings-group">
                <div className="nca-group-label">Intelligence & Behavior</div>
                <div className="nca-compact-slider">
                  <label>Creativity <span>{config.creativityLevel ?? 5}</span></label>
                  <input type="range" className="nca-slider" min={0} max={10} value={config.creativityLevel ?? 5} onChange={(e) => setConfig({ ...config, creativityLevel: parseInt(e.target.value) })} />
                </div>
                <div className="nca-compact-slider">
                  <label>Confidence <span>{config.confidenceLevel ?? 7}</span></label>
                  <input type="range" className="nca-slider" min={0} max={10} value={config.confidenceLevel ?? 7} onChange={(e) => setConfig({ ...config, confidenceLevel: parseInt(e.target.value) })} />
                </div>
                <div className="nca-compact-slider">
                  <label>Proactiveness <span>{config.proactiveness ?? 5}</span></label>
                  <input type="range" className="nca-slider" min={0} max={10} value={config.proactiveness ?? 5} onChange={(e) => setConfig({ ...config, proactiveness: parseInt(e.target.value) })} />
                </div>
              </div>
            </div>

            {/* RIGHT COLUMN: Response Settings & Advanced */}
            <div className="nca-settings-section">
              <h3>⚙️ Response Settings & Advanced</h3>
              
              {/* General */}
              <div className="nca-settings-group">
                <div className="nca-group-label">General</div>
                <div className="nca-compact-row">
                  <div className="nca-toggle-compact">
                    <span>Enabled</span>
                    <button className="nca-toggle" onClick={() => setConfig({ ...config, enabled: !config.enabled })}>
                      {config.enabled ? <FiToggleRight size={24} className="nca-toggle-on" /> : <FiToggleLeft size={24} className="nca-toggle-off" />}
                    </button>
                  </div>
                  <div className="nca-labeled-input">
                    <label>Max messages/day</label>
                    <input type="number" className="nca-setting-number" value={config.maxMessagesPerDay || 100} onChange={(e) => setConfig({ ...config, maxMessagesPerDay: parseInt(e.target.value) || 100 })} min={1} max={1000} />
                  </div>
                </div>
                <div className="nca-labeled-input">
                  <label>Welcome Message</label>
                  <textarea value={config.welcomeMessage || ''} onChange={(e) => setConfig({ ...config, welcomeMessage: e.target.value })} placeholder="Welcome message..." rows={2} />
                </div>
              </div>

              {/* Response Format */}
              <div className="nca-settings-group">
                <div className="nca-group-label">Response Format</div>
                <div className="nca-compact-row">
                  <div className="nca-labeled-input">
                    <label>Max Words</label>
                    <input type="number" className="nca-setting-number" value={config.maxWordCount || 200} onChange={(e) => setConfig({ ...config, maxWordCount: Math.min(2000, Math.max(10, parseInt(e.target.value) || 200)) })} min={10} max={2000} />
                  </div>
                  <div className="nca-labeled-input">
                    <label>Tone</label>
                    <select className="nca-setting-select nca-compact-select" value={config.angerState || 'calm'} onChange={(e) => setConfig({ ...config, angerState: e.target.value })}>
                      <option value="calm">Calm</option>
                      <option value="assertive">Assertive</option>
                      <option value="stern">Stern</option>
                      <option value="angry">Angry</option>
                      <option value="furious">Furious</option>
                    </select>
                  </div>
                  <div className="nca-toggle-compact">
                    <span>Emojis</span>
                    <button className="nca-toggle" onClick={() => setConfig({ ...config, useEmojis: !config.useEmojis })}>
                      {config.useEmojis ? <FiToggleRight size={24} className="nca-toggle-on" /> : <FiToggleLeft size={24} className="nca-toggle-off" />}
                    </button>
                  </div>
                </div>
                <div className="nca-labeled-input">
                  <label>Languages</label>
                  <div className="nca-lang-chips">
                    {['English', 'Hindi', 'Hinglish', 'Spanish', 'French', 'German', 'Portuguese', 'Italian', 'Japanese', 'Chinese', 'Arabic'].map(lang => {
                      const selected = (config.responseLanguage || 'English').split(',').map(l => l.trim()).filter(Boolean);
                      const isActive = selected.includes(lang);
                      return (
                        <button key={lang} type="button" className={`nca-lang-chip ${isActive ? 'active' : ''}`}
                          onClick={() => {
                            let langs = selected.filter(l => l !== lang);
                            if (!isActive) langs.push(lang);
                            if (langs.length === 0) langs = ['English'];
                            setConfig({ ...config, responseLanguage: langs.join(', ') });
                          }}>{lang}</button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Content Control */}
              <div className="nca-settings-group">
                <div className="nca-group-label">Content Control</div>
                <textarea value={config.focusTopics || ''} onChange={(e) => setConfig({ ...config, focusTopics: e.target.value })} placeholder="Focus topics (comma-separated)" rows={2} />
                <textarea value={config.forbiddenTopics || ''} onChange={(e) => setConfig({ ...config, forbiddenTopics: e.target.value })} placeholder="Forbidden topics (comma-separated)" rows={2} />
              </div>

              {/* Advanced */}
              <div className="nca-settings-group">
                <div className="nca-group-label">Advanced Instructions</div>
                <textarea value={config.customInstructions || ''} onChange={(e) => setConfig({ ...config, customInstructions: e.target.value })} placeholder="Custom instructions..." rows={3} />
              </div>

              {/* Default Excuse */}
              <div className="nca-settings-group">
                <div className="nca-group-label">Default Excuse</div>
                <div style={{ fontSize: '11px', color: '#888', marginBottom: '4px' }}>When bot can't answer, it uses this human-like excuse instead of AI refusals</div>
                <textarea value={config.defaultExcuse || ''} onChange={(e) => setConfig({ ...config, defaultExcuse: e.target.value })} placeholder="e.g. Yaar abhi ye mere scope mein nahi hai, kuch aur puch lo!" rows={2} />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default NoxtmChatAdmin;
