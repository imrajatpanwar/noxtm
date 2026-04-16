import React, { useState, useEffect, useCallback } from 'react';
import api from '../config/api';
import NoxtmSkillsEditor from './NoxtmSkillsEditor';
import NoxtmSkillAnalytics from './NoxtmSkillAnalytics';
import { confirm } from './ui/alert-dialog';

const containerStyle = {
  padding: '28px 32px',
  maxWidth: '900px',
  fontFamily: "'Switzer', -apple-system, BlinkMacSystemFont, sans-serif",
};

const headerStyle = {
  marginBottom: '24px',
};

const titleStyle = {
  fontSize: '22px',
  fontWeight: 700,
  color: '#111827',
  letterSpacing: '-0.02em',
  margin: 0,
};

const subtitleStyle = {
  fontSize: '14px',
  color: '#6b7280',
  margin: '4px 0 0',
};

const tabBarStyle = {
  display: 'flex',
  gap: '2px',
  background: '#f4f4f5',
  borderRadius: '10px',
  padding: '4px',
  marginBottom: '24px',
  width: 'fit-content',
};

const tabStyle = (active) => ({
  padding: '8px 20px',
  borderRadius: '8px',
  border: 'none',
  background: active ? '#fff' : 'transparent',
  color: active ? '#111827' : '#6b7280',
  fontWeight: active ? 600 : 500,
  fontSize: '14px',
  cursor: 'pointer',
  transition: 'all 0.2s',
  boxShadow: active ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
  fontFamily: "'Switzer', sans-serif",
});

const cardStyle = {
  background: '#fff',
  border: '1px solid #e5e7eb',
  borderRadius: '12px',
  padding: '24px',
  marginBottom: '16px',
};

const labelStyle = {
  display: 'block',
  fontSize: '13px',
  fontWeight: 600,
  color: '#374151',
  marginBottom: '6px',
};

const inputStyle = {
  width: '100%',
  padding: '10px 14px',
  borderRadius: '8px',
  border: '1px solid #e5e7eb',
  fontSize: '14px',
  color: '#111827',
  outline: 'none',
  transition: 'border-color 0.2s',
  fontFamily: "'Switzer', sans-serif",
  boxSizing: 'border-box',
};

const textareaStyle = {
  ...inputStyle,
  minHeight: '80px',
  resize: 'vertical',
};

const selectStyle = {
  ...inputStyle,
  appearance: 'none',
  backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'12\' height=\'12\' fill=\'%236b7280\' viewBox=\'0 0 16 16\'%3E%3Cpath d=\'M8 11L3 6h10z\'/%3E%3C/svg%3E")',
  backgroundRepeat: 'no-repeat',
  backgroundPosition: 'right 12px center',
  paddingRight: '36px',
};

const fieldGroup = {
  marginBottom: '18px',
};

const btnPrimary = {
  padding: '10px 24px',
  borderRadius: '8px',
  border: 'none',
  background: '#111827',
  color: '#fff',
  fontSize: '14px',
  fontWeight: 600,
  cursor: 'pointer',
  transition: 'all 0.2s',
  fontFamily: "'Switzer', sans-serif",
};

const btnOutline = {
  padding: '8px 16px',
  borderRadius: '8px',
  border: '1px solid #e5e7eb',
  background: '#fff',
  color: '#374151',
  fontSize: '13px',
  fontWeight: 500,
  cursor: 'pointer',
  transition: 'all 0.2s',
  fontFamily: "'Switzer', sans-serif",
};

const btnDanger = {
  ...btnOutline,
  color: '#ef4444',
  borderColor: '#fecaca',
};

const skillRow = {
  display: 'flex',
  alignItems: 'center',
  gap: '12px',
  padding: '12px 16px',
  borderRadius: '10px',
  border: '1px solid #e5e7eb',
  background: '#fafafa',
  marginBottom: '8px',
};

const toggleStyle = (on) => ({
  width: '40px',
  height: '22px',
  borderRadius: '11px',
  background: on ? '#111827' : '#d4d4d8',
  border: 'none',
  cursor: 'pointer',
  position: 'relative',
  transition: 'background 0.2s',
  flexShrink: 0,
});

const toggleDot = (on) => ({
  position: 'absolute',
  top: '3px',
  left: on ? '20px' : '3px',
  width: '16px',
  height: '16px',
  borderRadius: '50%',
  background: '#fff',
  transition: 'left 0.2s',
});

const statusBadge = (saved) => ({
  display: 'inline-flex',
  alignItems: 'center',
  gap: '4px',
  padding: '4px 12px',
  borderRadius: '6px',
  fontSize: '12px',
  fontWeight: 500,
  background: saved ? '#f0fdf4' : '#fef3c7',
  color: saved ? '#16a34a' : '#d97706',
  marginLeft: '12px',
  transition: 'all 0.3s',
});

const AI_MODELS = [
  { value: 'claude-haiku-4-5-20251001', label: 'Claude Haiku 4.5 (Fast, Default)', tier: 'fast' },
  { value: 'claude-3-5-haiku-20241022', label: 'Claude 3.5 Haiku (Legacy Fast)', tier: 'fast' },
  { value: 'claude-sonnet-4-6', label: 'Claude Sonnet 4.6 (Balanced)', tier: 'balanced' },
  { value: 'claude-3-5-sonnet-20241022', label: 'Claude 3.5 Sonnet (Legacy Balanced)', tier: 'balanced' },
  { value: 'claude-opus-4-6', label: 'Claude Opus 4.6 (Most Capable)', tier: 'premium' },
];

function NoxtmBotAdmin() {
  const [activeTab, setActiveTab] = useState('settings');
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [newSkillName, setNewSkillName] = useState('');
  const [newSkillDesc, setNewSkillDesc] = useState('');

  // Memory state
  const [defaultMemories, setDefaultMemories] = useState([]);
  const [userMemoryGroups, setUserMemoryGroups] = useState([]);
  const [memoriesLoading, setMemoriesLoading] = useState(false);
  const [usersLoading, setUsersLoading] = useState(false);
  const [resettingUserId, setResettingUserId] = useState(null);
  const [newMemoryContent, setNewMemoryContent] = useState('');
  const [newMemoryCategory, setNewMemoryCategory] = useState('instruction');
  const [editingMemoryId, setEditingMemoryId] = useState(null);
  const [editingContent, setEditingContent] = useState('');
  const [editingCategory, setEditingCategory] = useState('instruction');
  const [expandedUsers, setExpandedUsers] = useState(() => new Set());
  const [userMemorySearch, setUserMemorySearch] = useState('');

  const toggleExpandedUser = (userId) => {
    setExpandedUsers(prev => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  };

  const fetchConfig = useCallback(async () => {
    try {
      const res = await api.get('/noxtm-bot/config');
      if (res.data.success) {
        setConfig(res.data.config);
      }
    } catch (err) {
      console.error('[NoxtmBotAdmin] Error fetching config:', err);
      // Set defaults
      setConfig({
        enabled: true,
        botGreeting: "Hey! I'm Noxtm Bot, your setup assistant. Ready to get your workspace rolling?",
        personality: 'friendly',
        maxWordCount: 80,
        responseLanguage: 'English',
        customInstructions: '',
        aiModel: 'claude-haiku-4-5-20251001',
        apiKeySource: 'platform',
        customApiKey: '',
        skills: [
          { name: 'Signup & Onboarding', description: 'Guide users through account creation, email verification, plan selection, and company setup', enabled: true, isBuiltIn: true },
          { name: 'API Management', description: 'Help users understand and manage API keys, usage, and integrations', enabled: true, isBuiltIn: true },
          { name: 'Chat Assistant', description: 'Professional conversational assistant for workspace support and general queries. No emojis, formal tone, direct answers.', enabled: true, isBuiltIn: true },
        ],
        showGoogleSignup: true,
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchConfig(); }, [fetchConfig]);

  // Fetch memories when memories or users tab is activated
  useEffect(() => {
    if (activeTab === 'memories') {
      fetchDefaultMemories();
      fetchUserMemories();
    }
    if (activeTab === 'users') {
      setUsersLoading(true);
      fetchUserMemories().finally(() => setUsersLoading(false));
    }
  }, [activeTab]);

  const fetchDefaultMemories = async () => {
    setMemoriesLoading(true);
    try {
      const res = await api.get('/noxtm-bot/memories/default');
      if (res.data.success) setDefaultMemories(res.data.memories || []);
    } catch (err) {
      console.error('[NoxtmBotAdmin] Default memories fetch error:', err);
    } finally {
      setMemoriesLoading(false);
    }
  };

  const fetchUserMemories = async () => {
    try {
      const res = await api.get('/noxtm-bot/memories/users');
      if (res.data.success) {
        // Normalize backend response to a single internal shape. Tolerates:
        //   { userGroups: [{userId,userName,userEmail,memories}] }  (legacy)
        //   { userGroups: [{ user: {_id,name,email,avatar}, memories }] }  (new)
        //   { users: [...] } or a plain array at res.data
        const raw = res.data.userGroups
          || res.data.users
          || (Array.isArray(res.data) ? res.data : [])
          || [];
        const normalized = raw.map(g => {
          const user = g.user || {};
          return {
            userId: g.userId || user._id || user.id || '',
            userName: g.userName || user.name || user.fullName || 'Unknown user',
            userEmail: g.userEmail || user.email || '',
            userAvatar: g.userAvatar || user.avatar || '',
            memories: Array.isArray(g.memories) ? g.memories : [],
          };
        });
        setUserMemoryGroups(normalized);
      }
    } catch (err) {
      console.error('[NoxtmBotAdmin] User memories fetch error:', err);
    }
  };

  const saveConfig = async () => {
    setSaving(true);
    try {
      const res = await api.put('/noxtm-bot/config', config);
      if (res.data.success) {
        setConfig(res.data.config);
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      }
    } catch (err) {
      console.error('[NoxtmBotAdmin] Save error:', err);
      alert('Failed to save settings. Make sure you are the workspace owner.');
    } finally {
      setSaving(false);
    }
  };

  const updateField = (field, value) => {
    setConfig(prev => ({ ...prev, [field]: value }));
    setSaved(false);
  };

  const addSkill = () => {
    if (!newSkillName.trim()) return;
    const skill = { name: newSkillName.trim(), description: newSkillDesc.trim(), enabled: true, isBuiltIn: false };
    setConfig(prev => ({ ...prev, skills: [...(prev.skills || []), skill] }));
    setNewSkillName('');
    setNewSkillDesc('');
    setSaved(false);
  };

  const removeSkill = (index) => {
    const skill = config.skills[index];
    if (skill.isBuiltIn) {
      alert('Built-in skills cannot be removed. You can disable them instead.');
      return;
    }
    setConfig(prev => ({
      ...prev,
      skills: prev.skills.filter((_, i) => i !== index)
    }));
    setSaved(false);
  };

  const toggleSkill = (index) => {
    setConfig(prev => ({
      ...prev,
      skills: prev.skills.map((s, i) => i === index ? { ...s, enabled: !s.enabled } : s)
    }));
    setSaved(false);
  };

  // === Memory CRUD functions ===
  const addDefaultMemory = async () => {
    if (!newMemoryContent.trim()) return;
    try {
      const res = await api.post('/noxtm-bot/memories/default', {
        content: newMemoryContent.trim(),
        category: newMemoryCategory,
      });
      if (res.data.success) {
        setDefaultMemories(prev => [res.data.memory, ...prev]);
        setNewMemoryContent('');
        setNewMemoryCategory('instruction');
      }
    } catch (err) {
      console.error('[NoxtmBotAdmin] Add memory error:', err);
      alert(err.response?.data?.message || 'Failed to add memory');
    }
  };

  const updateDefaultMemory = async (id) => {
    if (!editingContent.trim()) return;
    try {
      const res = await api.put(`/noxtm-bot/memories/default/${id}`, {
        content: editingContent.trim(),
        category: editingCategory,
      });
      if (res.data.success) {
        setDefaultMemories(prev => prev.map(m => m._id === id ? res.data.memory : m));
        setEditingMemoryId(null);
        setEditingContent('');
      }
    } catch (err) {
      console.error('[NoxtmBotAdmin] Update memory error:', err);
      alert(err.response?.data?.message || 'Failed to update memory');
    }
  };

  const deleteDefaultMemory = async (id) => {
    if (!await confirm('Delete this memory?')) return;
    try {
      const res = await api.delete(`/noxtm-bot/memories/default/${id}`);
      if (res.data.success) {
        setDefaultMemories(prev => prev.filter(m => m._id !== id));
      }
    } catch (err) {
      console.error('[NoxtmBotAdmin] Delete memory error:', err);
    }
  };

  const deleteUserMemory = async (memoryId, userId) => {
    if (!await confirm('Delete this user memory?')) return;
    try {
      const res = await api.delete(`/noxtm-bot/memories/users/${memoryId}`);
      if (res.data.success) {
        setUserMemoryGroups(prev => prev
          .map(g => (
            g.userId === userId
              ? { ...g, memories: g.memories.filter(m => m._id !== memoryId) }
              : g
          ))
          .filter(g => g.memories.length > 0));
      }
    } catch (err) {
      console.error('[NoxtmBotAdmin] Delete user memory error:', err);
      alert(err.response?.data?.message || 'Failed to delete memory');
    }
  };

  const resetUserMemories = async (userId, userName) => {
    if (!await confirm(`Reset all memories for ${userName}? This cannot be undone.`)) return;
    setResettingUserId(userId);
    try {
      const res = await api.delete(`/noxtm-bot/memories/users/reset/${userId}`);
      if (res.data.success) {
        setUserMemoryGroups(prev =>
          prev.map(g => g.userId === userId ? { ...g, memories: [] } : g)
        );
      }
    } catch (err) {
      console.error('[NoxtmBotAdmin] Reset user memories error:', err);
      alert(err.response?.data?.message || 'Failed to reset memories');
    } finally {
      setResettingUserId(null);
    }
  };

  if (loading) {
    return (
      <div style={containerStyle}>
        <div style={{ textAlign: 'center', padding: '60px 0', color: '#6b7280' }}>
          Loading Noxtm Bot configuration...
        </div>
      </div>
    );
  }

  if (!config) return null;

  return (
    <div style={containerStyle}>
      {/* Header */}
      <div style={headerStyle}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <h2 style={titleStyle}>Noxtm Bot Setup</h2>
          {saved && <span style={statusBadge(true)}>Saved</span>}
          {saving && <span style={statusBadge(false)}>Saving...</span>}
        </div>
        <p style={subtitleStyle}>Configure your AI assistant's behavior, skills, API, and model</p>
      </div>

      {/* Tabs — first five are the primary group, the rest are secondary */}
      <div style={tabBarStyle}>
        {['settings', 'skills', 'memories', 'advanced', 'users', 'analytics', 'api'].map((tab, idx) => {
          const label = tab === 'settings' ? 'Settings'
            : tab === 'skills' ? 'Skills'
            : tab === 'memories' ? 'Memories'
            : tab === 'advanced' ? 'Advanced Skills'
            : tab === 'users' ? 'Users'
            : tab === 'analytics' ? 'Analytics'
            : 'API & Model';
          return (
            <React.Fragment key={tab}>
              {/* Visual divider between primary (first five) and secondary tabs */}
              {idx === 5 && (
                <span
                  aria-hidden="true"
                  style={{
                    width: '1px',
                    alignSelf: 'stretch',
                    background: '#d4d4d8',
                    margin: '4px 6px',
                  }}
                />
              )}
              <button style={tabStyle(activeTab === tab)} onClick={() => setActiveTab(tab)}>
                {label}
              </button>
            </React.Fragment>
          );
        })}
      </div>

      {/* Settings Tab */}
      {activeTab === 'settings' && (
        <>
          <div style={cardStyle}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: '#111827' }}>Noxtm Bot Enabled</h3>
                <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#6b7280' }}>Turn AI assistant on/off</p>
              </div>
              <button style={toggleStyle(config.enabled)} onClick={() => updateField('enabled', !config.enabled)}>
                <span style={toggleDot(config.enabled)} />
              </button>
            </div>

            <div style={fieldGroup}>
              <label style={labelStyle}>Bot Greeting</label>
              <textarea
                style={textareaStyle}
                value={config.botGreeting || ''}
                onChange={e => updateField('botGreeting', e.target.value)}
                placeholder="Enter the greeting message..."
              />
            </div>

            {/* Bot Identity Section */}
            <div style={{ padding: '16px', borderRadius: '10px', background: '#f9fafb', border: '1px solid #e5e7eb', marginBottom: '16px' }}>
              <h4 style={{ margin: '0 0 4px', fontSize: '13px', fontWeight: 600, color: '#111827' }}>Bot Identity</h4>
              <p style={{ margin: '0 0 14px', fontSize: '12px', color: '#9ca3af' }}>This is how the bot introduces itself when users ask "who are you?"</p>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
                <div style={fieldGroup}>
                  <label style={labelStyle}>Bot Name</label>
                  <input
                    style={inputStyle}
                    value={config.botName || ''}
                    onChange={e => updateField('botName', e.target.value)}
                    placeholder="e.g., Noxtm Bot"
                  />
                </div>
                <div style={fieldGroup}>
                  <label style={labelStyle}>Bot Title</label>
                  <input
                    style={inputStyle}
                    value={config.botTitle || ''}
                    onChange={e => updateField('botTitle', e.target.value)}
                    placeholder="e.g., AI Assistant"
                  />
                </div>
              </div>

              <div style={fieldGroup}>
                <label style={labelStyle}>Bot Identity Description</label>
                <textarea
                  style={{ ...textareaStyle, minHeight: '60px' }}
                  value={config.botIdentity || ''}
                  onChange={e => updateField('botIdentity', e.target.value)}
                  placeholder="e.g., I am Noxtm Bot, the AI assistant for your workspace. I help manage tasks, campaigns, and team communication."
                />
                <span style={{ fontSize: '11px', color: '#9ca3af', marginTop: '4px', display: 'block' }}>
                  This text is injected into the bot's system prompt. Leave blank to use default.
                </span>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div style={fieldGroup}>
                <label style={labelStyle}>Personality</label>
                <select style={selectStyle} value={config.personality || 'friendly'} onChange={e => updateField('personality', e.target.value)}>
                  <option value="friendly">Friendly</option>
                  <option value="professional">Professional</option>
                  <option value="casual">Casual</option>
                  <option value="formal">Formal</option>
                </select>
              </div>

              <div style={fieldGroup}>
                <label style={labelStyle}>Response Language</label>
                <input
                  style={inputStyle}
                  value={config.responseLanguage || 'English'}
                  onChange={e => updateField('responseLanguage', e.target.value)}
                />
              </div>
            </div>

            <div style={fieldGroup}>
              <label style={labelStyle}>Max Word Count</label>
              <input
                type="number"
                style={{ ...inputStyle, width: '120px' }}
                value={config.maxWordCount || 80}
                onChange={e => updateField('maxWordCount', parseInt(e.target.value) || 80)}
                min={20}
                max={200}
              />
            </div>

            <div style={fieldGroup}>
              <label style={labelStyle}>Custom Instructions</label>
              <textarea
                style={textareaStyle}
                value={config.customInstructions || ''}
                onChange={e => updateField('customInstructions', e.target.value)}
                placeholder="Any additional instructions for the bot's behavior..."
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: '#111827' }}>Show Google Signup</h4>
                <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#6b7280' }}>Allow Google OAuth during signup</p>
              </div>
              <button style={toggleStyle(config.showGoogleSignup)} onClick={() => updateField('showGoogleSignup', !config.showGoogleSignup)}>
                <span style={toggleDot(config.showGoogleSignup)} />
              </button>
            </div>
          </div>

          <button style={btnPrimary} onClick={saveConfig} disabled={saving}>
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </>
      )}

      {/* Skills Tab */}
      {activeTab === 'skills' && (
        <>
          <div style={cardStyle}>
            <h3 style={{ margin: '0 0 16px', fontSize: '15px', fontWeight: 600, color: '#111827' }}>
              Skills ({(config.skills || []).length})
            </h3>
            <p style={{ fontSize: '13px', color: '#6b7280', margin: '0 0 16px' }}>
              Skills define what Noxtm Bot can help users with. Built-in skills handle core flows like signup and API management. Add custom skills for additional capabilities.
            </p>

            {(config.skills || []).map((skill, i) => (
              <div key={i} style={skillRow}>
                <button style={toggleStyle(skill.enabled)} onClick={() => toggleSkill(i)}>
                  <span style={toggleDot(skill.enabled)} />
                </button>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: '#111827', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {skill.name}
                    {skill.isBuiltIn && (
                      <span style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '4px', background: '#e0e7ff', color: '#4338ca', fontWeight: 500 }}>
                        Built-in
                      </span>
                    )}
                  </div>
                  {skill.description && <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '2px' }}>{skill.description}</div>}
                </div>
                {!skill.isBuiltIn && (
                  <button style={btnDanger} onClick={() => removeSkill(i)}>Remove</button>
                )}
              </div>
            ))}

            {(config.skills || []).length === 0 && (
              <div style={{ textAlign: 'center', padding: '24px', color: '#9ca3af', fontSize: '13px' }}>
                No skills added yet. Add your first skill below.
              </div>
            )}

            {/* Add skill form */}
            <div style={{ marginTop: '16px', padding: '16px', borderRadius: '10px', background: '#f9fafb', border: '1px solid #e5e7eb' }}>
              <div style={fieldGroup}>
                <label style={labelStyle}>Skill Name</label>
                <input
                  style={inputStyle}
                  value={newSkillName}
                  onChange={e => setNewSkillName(e.target.value)}
                  placeholder="e.g., Product Demo Scheduling"
                />
              </div>
              <div style={fieldGroup}>
                <label style={labelStyle}>Description (optional)</label>
                <input
                  style={inputStyle}
                  value={newSkillDesc}
                  onChange={e => setNewSkillDesc(e.target.value)}
                  placeholder="What this skill helps with..."
                />
              </div>
              <button style={btnOutline} onClick={addSkill} disabled={!newSkillName.trim()}>
                + Add Skill
              </button>
            </div>
          </div>

          <button style={btnPrimary} onClick={saveConfig} disabled={saving}>
            {saving ? 'Saving...' : 'Save Skills'}
          </button>
        </>
      )}

      {/* Advanced Skills Tab — full skill + question editor */}
      {activeTab === 'advanced' && (
        <div style={cardStyle}>
          <h3 style={{ margin: '0 0 8px', fontSize: '15px', fontWeight: 600, color: '#111827' }}>Advanced Skills</h3>
          <p style={{ fontSize: '13px', color: '#6b7280', margin: '0 0 20px' }}>
            Full skill editor with questions, field mappings, validators, and completion actions. These skills power chat-based flows like the company setup assistant.
          </p>
          <NoxtmSkillsEditor />
        </div>
      )}

      {/* Users Tab */}
      {activeTab === 'users' && (
        <div style={cardStyle}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
            <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: '#111827' }}>Bot Users</h3>
            <span style={{ fontSize: '12px', color: '#9ca3af' }}>{userMemoryGroups.length} user{userMemoryGroups.length !== 1 ? 's' : ''}</span>
          </div>
          <p style={{ fontSize: '13px', color: '#6b7280', margin: '0 0 16px' }}>
            All workspace users and their bot memories. Use Reset to clear a user's learned memories.
          </p>

          {/* Search */}
          <div style={{ marginBottom: '14px' }}>
            <input
              style={{ ...inputStyle, width: '260px' }}
              placeholder="Search users..."
              value={userMemorySearch}
              onChange={e => setUserMemorySearch(e.target.value)}
            />
          </div>

          {usersLoading ? (
            <div style={{ textAlign: 'center', padding: '32px', color: '#9ca3af', fontSize: '13px' }}>Loading users...</div>
          ) : (() => {
            const filtered = userMemoryGroups.filter(g => {
              if (!userMemorySearch.trim()) return true;
              const s = userMemorySearch.toLowerCase();
              return (g.userName || '').toLowerCase().includes(s) || (g.userEmail || '').toLowerCase().includes(s);
            });

            if (filtered.length === 0) {
              return (
                <div style={{ textAlign: 'center', padding: '32px', color: '#9ca3af', fontSize: '13px', borderRadius: '10px', border: '1px dashed #e5e7eb' }}>
                  {userMemoryGroups.length === 0 ? 'No users have interacted with the bot yet.' : 'No users match your search.'}
                </div>
              );
            }

            return filtered.map(group => {
              const isOpen = expandedUsers.has(group.userId);
              const isResetting = resettingUserId === group.userId;
              return (
                <div key={group.userId || group.userEmail} style={{ borderRadius: '10px', border: '1px solid #e5e7eb', marginBottom: '8px', overflow: 'hidden' }}>
                  {/* User header */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', background: isOpen ? '#f9fafb' : '#fff' }}>
                    {/* Avatar */}
                    {group.userAvatar ? (
                      <img
                        src={group.userAvatar}
                        alt={group.userName}
                        style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
                      />
                    ) : (
                      <div style={{
                        width: '36px', height: '36px', borderRadius: '50%', background: '#111827', color: '#fff',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px',
                        fontWeight: 700, flexShrink: 0,
                      }}>
                        {group.userName?.charAt(0)?.toUpperCase() || 'U'}
                      </div>
                    )}
                    {/* Name + email */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '14px', fontWeight: 600, color: '#111827' }}>{group.userName}</div>
                      <div style={{ fontSize: '12px', color: '#9ca3af', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{group.userEmail}</div>
                    </div>
                    {/* Memory count badge */}
                    <span style={{
                      fontSize: '11px', padding: '3px 10px', borderRadius: '12px',
                      background: group.memories.length > 0 ? '#f0fdf4' : '#f3f4f6',
                      color: group.memories.length > 0 ? '#16a34a' : '#9ca3af',
                      fontWeight: 600, flexShrink: 0,
                    }}>
                      {group.memories.length} {group.memories.length === 1 ? 'memory' : 'memories'}
                    </span>
                    {/* Reset button */}
                    <button
                      style={{
                        ...btnDanger,
                        padding: '5px 12px',
                        fontSize: '12px',
                        opacity: group.memories.length === 0 ? 0.4 : 1,
                        cursor: group.memories.length === 0 ? 'default' : 'pointer',
                        flexShrink: 0,
                      }}
                      disabled={group.memories.length === 0 || isResetting}
                      onClick={() => resetUserMemories(group.userId, group.userName)}
                    >
                      {isResetting ? 'Resetting...' : 'Reset'}
                    </button>
                    {/* Expand toggle */}
                    <button
                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', flexShrink: 0 }}
                      onClick={() => toggleExpandedUser(group.userId)}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                        style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.2s', display: 'block' }}>
                        <polyline points="6 9 12 15 18 9" />
                      </svg>
                    </button>
                  </div>

                  {/* Expanded memories */}
                  {isOpen && (
                    <div style={{ padding: '4px 16px 12px', background: '#fafafa', borderTop: '1px solid #f3f4f6' }}>
                      {group.memories.length === 0 ? (
                        <div style={{ padding: '16px 0', fontSize: '13px', color: '#9ca3af', textAlign: 'center' }}>No memories for this user.</div>
                      ) : (
                        group.memories.map(mem => (
                          <div key={mem._id} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', padding: '10px 0', borderBottom: '1px solid #f3f4f6' }}>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontSize: '13px', color: '#374151', lineHeight: '1.5' }}>{mem.content}</div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                                <span style={{
                                  fontSize: '10px', padding: '1px 8px', borderRadius: '4px', fontWeight: 600,
                                  background: '#f3f4f6', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.4px',
                                }}>{mem.category}</span>
                                <span style={{ fontSize: '10px', color: '#d1d5db' }}>{mem.source === 'conversation' ? 'Auto' : 'Manual'}</span>
                                <span style={{ fontSize: '10px', color: '#d1d5db' }}>{new Date(mem.createdAt).toLocaleDateString()}</span>
                              </div>
                            </div>
                            <button
                              style={{ ...btnDanger, padding: '4px 10px', fontSize: '11px', flexShrink: 0 }}
                              onClick={() => deleteUserMemory(mem._id, group.userId)}
                            >Delete</button>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              );
            });
          })()}
        </div>
      )}

      {/* Analytics Tab */}
      {activeTab === 'analytics' && (
        <div style={cardStyle}>
          <h3 style={{ margin: '0 0 8px', fontSize: '15px', fontWeight: 600, color: '#111827' }}>Skill Analytics</h3>
          <p style={{ fontSize: '13px', color: '#6b7280', margin: '0 0 20px' }}>
            Confidence scoring, extraction methods, completion rates, and per-session audit trails.
          </p>
          <NoxtmSkillAnalytics />
        </div>
      )}

      {/* API & Model Tab */}
      {activeTab === 'api' && (
        <>
          <div style={cardStyle}>
            <h3 style={{ margin: '0 0 8px', fontSize: '15px', fontWeight: 600, color: '#111827' }}>AI Model</h3>
            <p style={{ fontSize: '13px', color: '#6b7280', margin: '0 0 20px' }}>
              Choose which Claude model powers Noxtm Bot. Faster models are cheaper, more capable models give better responses.
            </p>

            <div style={fieldGroup}>
              <label style={labelStyle}>Model</label>
              <select
                style={selectStyle}
                value={config.aiModel || 'claude-haiku-4-5-20251001'}
                onChange={e => updateField('aiModel', e.target.value)}
              >
                {AI_MODELS.map(m => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
            </div>

            {/* Model tier info */}
            {(() => {
              const selected = AI_MODELS.find(m => m.value === (config.aiModel || 'claude-haiku-4-5-20251001'));
              const tierColors = { fast: '#16a34a', balanced: '#d97706', premium: '#7c3aed' };
              const tierLabels = { fast: 'Fast & Efficient', balanced: 'Balanced', premium: 'Premium' };
              return selected ? (
                <div style={{ padding: '12px 16px', borderRadius: '8px', background: '#f9fafb', border: '1px solid #e5e7eb', marginBottom: '18px' }}>
                  <span style={{ fontSize: '12px', fontWeight: 600, color: tierColors[selected.tier] || '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    {tierLabels[selected.tier]}
                  </span>
                  <p style={{ fontSize: '13px', color: '#6b7280', margin: '4px 0 0' }}>
                    {selected.tier === 'fast' && 'Best for quick signup flows. Low cost, fast responses.'}
                    {selected.tier === 'balanced' && 'Better conversation quality. Good for complex onboarding.'}
                    {selected.tier === 'premium' && 'Highest quality responses. Best for critical interactions. Higher cost.'}
                  </p>
                </div>
              ) : null;
            })()}
          </div>

          <div style={cardStyle}>
            <h3 style={{ margin: '0 0 8px', fontSize: '15px', fontWeight: 600, color: '#111827' }}>API Key</h3>
            <p style={{ fontSize: '13px', color: '#6b7280', margin: '0 0 20px' }}>
              Use the platform's shared API key or provide your own Anthropic API key for dedicated usage.
            </p>

            <div style={fieldGroup}>
              <label style={labelStyle}>API Key Source</label>
              <div style={{ display: 'flex', gap: '12px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '14px', color: '#374151' }}>
                  <input
                    type="radio"
                    name="apiKeySource"
                    checked={config.apiKeySource === 'platform'}
                    onChange={() => updateField('apiKeySource', 'platform')}
                  />
                  Platform Key (shared)
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '14px', color: '#374151' }}>
                  <input
                    type="radio"
                    name="apiKeySource"
                    checked={config.apiKeySource === 'custom'}
                    onChange={() => updateField('apiKeySource', 'custom')}
                  />
                  Custom API Key
                </label>
              </div>
            </div>

            {config.apiKeySource === 'custom' && (
              <div style={fieldGroup}>
                <label style={labelStyle}>Anthropic API Key</label>
                <input
                  type="password"
                  style={inputStyle}
                  value={config.customApiKey || ''}
                  onChange={e => updateField('customApiKey', e.target.value)}
                  placeholder="sk-ant-..."
                />
                <p style={{ fontSize: '11px', color: '#9ca3af', marginTop: '4px' }}>
                  Your API key is encrypted and never exposed in full. Get one from console.anthropic.com.
                </p>
                {config.hasCustomApiKey && (
                  <p style={{ fontSize: '12px', color: '#16a34a', marginTop: '4px' }}>
                    A custom API key is configured.
                  </p>
                )}
              </div>
            )}
          </div>

          <button style={btnPrimary} onClick={saveConfig} disabled={saving}>
            {saving ? 'Saving...' : 'Save API Settings'}
          </button>
        </>
      )}

      {/* Memories Tab */}
      {activeTab === 'memories' && (
        <>
          {/* Inline help note explaining the two memory types */}
          <div style={{
            padding: '12px 16px',
            borderRadius: '10px',
            background: '#f9fafb',
            border: '1px solid #e5e7eb',
            marginBottom: '16px',
            fontSize: '12px',
            color: '#6b7280',
            lineHeight: '1.6',
          }}>
            <div><strong style={{ color: '#111827' }}>Default Memories</strong> — instructions ALL users' bots will follow.</div>
            <div><strong style={{ color: '#111827' }}>User Memories</strong> — auto-learned per-user context (admins see all users).</div>
          </div>

          {/* Default Memories Section */}
          <div style={cardStyle}>
            <h3 style={{ margin: '0 0 4px', fontSize: '15px', fontWeight: 600, color: '#111827' }}>Admin Default Memories</h3>
            <p style={{ fontSize: '13px', color: '#6b7280', margin: '0 0 18px' }}>
              Global instructions the bot must follow for all users. These act as permanent bot rules.
            </p>

            {memoriesLoading ? (
              <div style={{ textAlign: 'center', padding: '24px', color: '#9ca3af', fontSize: '13px' }}>Loading...</div>
            ) : (
              <>
                {defaultMemories.map(mem => (
                  <div key={mem._id} style={{ padding: '14px 16px', borderRadius: '10px', border: '1px solid #e5e7eb', background: '#fafafa', marginBottom: '8px' }}>
                    {editingMemoryId === mem._id ? (
                      /* Edit Mode */
                      <div>
                        <textarea
                          style={{ ...textareaStyle, marginBottom: '8px' }}
                          value={editingContent}
                          onChange={e => setEditingContent(e.target.value)}
                          autoFocus
                        />
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                          <select
                            style={{ ...selectStyle, width: '160px' }}
                            value={editingCategory}
                            onChange={e => setEditingCategory(e.target.value)}
                          >
                            <option value="instruction">Instruction</option>
                            <option value="rule">Rule</option>
                            <option value="personality">Personality</option>
                            <option value="knowledge">Knowledge</option>
                            <option value="other">Other</option>
                          </select>
                          <button
                            style={{ ...btnPrimary, padding: '7px 16px', fontSize: '13px' }}
                            onClick={() => updateDefaultMemory(mem._id)}
                          >Save</button>
                          <button
                            style={{ ...btnOutline, padding: '7px 16px' }}
                            onClick={() => setEditingMemoryId(null)}
                          >Cancel</button>
                        </div>
                      </div>
                    ) : (
                      /* View Mode */
                      <div>
                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: '14px', color: '#111827', lineHeight: '1.5', whiteSpace: 'pre-wrap' }}>{mem.content}</div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px' }}>
                              <span style={{
                                fontSize: '10px', padding: '2px 10px', borderRadius: '4px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px',
                                background: mem.category === 'instruction' ? '#dbeafe' : mem.category === 'rule' ? '#fef3c7' : mem.category === 'personality' ? '#ede9fe' : mem.category === 'knowledge' ? '#d1fae5' : '#f3f4f6',
                                color: mem.category === 'instruction' ? '#1e40af' : mem.category === 'rule' ? '#92400e' : mem.category === 'personality' ? '#5b21b6' : mem.category === 'knowledge' ? '#065f46' : '#4b5563',
                              }}>{mem.category}</span>
                              {mem.createdBy && (
                                <span style={{ fontSize: '11px', color: '#9ca3af' }}>by {mem.createdBy.fullName}</span>
                              )}
                              <span style={{ fontSize: '11px', color: '#d1d5db' }}>{new Date(mem.createdAt).toLocaleDateString()}</span>
                            </div>
                          </div>
                          <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                            <button
                              style={{ ...btnOutline, padding: '5px 12px', fontSize: '12px' }}
                              onClick={() => { setEditingMemoryId(mem._id); setEditingContent(mem.content); setEditingCategory(mem.category); }}
                            >Edit</button>
                            <button
                              style={{ ...btnDanger, padding: '5px 12px', fontSize: '12px' }}
                              onClick={() => deleteDefaultMemory(mem._id)}
                            >Delete</button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}

                {defaultMemories.length === 0 && (
                  <div style={{ textAlign: 'center', padding: '24px', color: '#9ca3af', fontSize: '13px', borderRadius: '10px', border: '1px dashed #e5e7eb' }}>
                    No default memories yet. Add an instruction below for the bot to follow.
                  </div>
                )}

                {/* Add form */}
                <div style={{ marginTop: '16px', padding: '16px', borderRadius: '10px', background: '#f9fafb', border: '1px solid #e5e7eb' }}>
                  <div style={fieldGroup}>
                    <label style={labelStyle}>Memory / Instruction</label>
                    <textarea
                      style={textareaStyle}
                      value={newMemoryContent}
                      onChange={e => setNewMemoryContent(e.target.value)}
                      placeholder="e.g., Always greet users in Hindi first, then switch to English if they reply in English"
                    />
                  </div>
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <select
                      style={{ ...selectStyle, width: '160px' }}
                      value={newMemoryCategory}
                      onChange={e => setNewMemoryCategory(e.target.value)}
                    >
                      <option value="instruction">Instruction</option>
                      <option value="rule">Rule</option>
                      <option value="personality">Personality</option>
                      <option value="knowledge">Knowledge</option>
                      <option value="other">Other</option>
                    </select>
                    <button style={btnOutline} onClick={addDefaultMemory} disabled={!newMemoryContent.trim()}>
                      + Add Memory
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* User Memories Section */}
          <div style={{ ...cardStyle, marginTop: '16px' }}>
            <h3 style={{ margin: '0 0 4px', fontSize: '15px', fontWeight: 600, color: '#111827' }}>User Memories</h3>
            <p style={{ fontSize: '13px', color: '#6b7280', margin: '0 0 14px' }}>
              Auto-learned memories from individual user conversations. Grouped by user.
            </p>

            {/* Search */}
            <div style={{ marginBottom: '14px' }}>
              <input
                style={{ ...inputStyle, width: '260px' }}
                placeholder="Search users..."
                value={userMemorySearch}
                onChange={e => setUserMemorySearch(e.target.value)}
              />
            </div>

            {(() => {
              const filtered = userMemoryGroups.filter(g => {
                if (!userMemorySearch.trim()) return true;
                const s = userMemorySearch.toLowerCase();
                const name = (g.userName || '').toLowerCase();
                const email = (g.userEmail || '').toLowerCase();
                // Also match if the search term appears in any memory content
                const contentMatch = (g.memories || []).some(m =>
                  (m.content || '').toLowerCase().includes(s)
                );
                return name.includes(s) || email.includes(s) || contentMatch;
              });

              if (filtered.length === 0) {
                return (
                  <div style={{ textAlign: 'center', padding: '24px', color: '#9ca3af', fontSize: '13px', borderRadius: '10px', border: '1px dashed #e5e7eb' }}>
                    {userMemoryGroups.length === 0 ? 'No user memories yet. They are auto-learned from conversations.' : 'No users match your search.'}
                  </div>
                );
              }

              return filtered.map(group => {
                const isOpen = expandedUsers.has(group.userId);
                return (
                  <div key={group.userId || group.userEmail} style={{ borderRadius: '10px', border: '1px solid #e5e7eb', marginBottom: '8px', overflow: 'hidden' }}>
                    {/* User header (accordion) */}
                    <button
                      style={{
                        width: '100%', display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px',
                        background: isOpen ? '#f9fafb' : '#fff', border: 'none', cursor: 'pointer',
                        textAlign: 'left', fontFamily: "'Switzer', sans-serif", transition: 'background 0.15s',
                      }}
                      onClick={() => toggleExpandedUser(group.userId)}
                    >
                      {/* Avatar */}
                      {group.userAvatar ? (
                        <img
                          src={group.userAvatar}
                          alt={group.userName}
                          style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
                        />
                      ) : (
                        <div style={{
                          width: '32px', height: '32px', borderRadius: '50%', background: '#111827', color: '#fff',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px',
                          fontWeight: 700, flexShrink: 0,
                        }}>
                          {group.userName?.charAt(0)?.toUpperCase() || 'U'}
                        </div>
                      )}
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '14px', fontWeight: 600, color: '#111827' }}>{group.userName}</div>
                        <div style={{ fontSize: '12px', color: '#9ca3af' }}>{group.userEmail}</div>
                      </div>
                      <span style={{
                        fontSize: '11px', padding: '3px 10px', borderRadius: '12px', background: '#f3f4f6',
                        color: '#6b7280', fontWeight: 600,
                      }}>
                        {group.memories.length} {group.memories.length === 1 ? 'memory' : 'memories'}
                      </span>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.2s' }}>
                        <polyline points="6 9 12 15 18 9" />
                      </svg>
                    </button>

                    {/* Expanded memories */}
                    {isOpen && (
                      <div style={{ padding: '4px 16px 12px', background: '#fafafa' }}>
                        {group.memories.map(mem => (
                          <div key={mem._id} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', padding: '10px 0', borderBottom: '1px solid #f3f4f6' }}>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontSize: '13px', color: '#374151', lineHeight: '1.5' }}>{mem.content}</div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                                <span style={{
                                  fontSize: '10px', padding: '1px 8px', borderRadius: '4px', fontWeight: 600,
                                  background: '#f3f4f6', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.4px',
                                }}>{mem.category}</span>
                                <span style={{ fontSize: '10px', color: '#d1d5db' }}>{mem.source === 'conversation' ? 'Auto' : 'Manual'}</span>
                                <span style={{ fontSize: '10px', color: '#d1d5db' }}>{new Date(mem.createdAt).toLocaleDateString()}</span>
                              </div>
                            </div>
                            <button
                              style={{ ...btnDanger, padding: '4px 10px', fontSize: '11px', flexShrink: 0 }}
                              onClick={() => deleteUserMemory(mem._id, group.userId)}
                            >Delete</button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              });
            })()}
          </div>
        </>
      )}
    </div>
  );
}

export default NoxtmBotAdmin;
