import React, { useState, useEffect, useCallback } from 'react';
import api from '../config/api';

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
        ],
        showGoogleSignup: true,
        enabledPlans: ['Starter', 'Pro+', 'Advance'],
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchConfig(); }, [fetchConfig]);

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

  const togglePlan = (plan) => {
    setConfig(prev => {
      const current = prev.enabledPlans || [];
      const updated = current.includes(plan) ? current.filter(p => p !== plan) : [...current, plan];
      return { ...prev, enabledPlans: updated };
    });
    setSaved(false);
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

      {/* Tabs */}
      <div style={tabBarStyle}>
        {['settings', 'skills', 'api', 'plans'].map(tab => (
          <button key={tab} style={tabStyle(activeTab === tab)} onClick={() => setActiveTab(tab)}>
            {tab === 'settings' ? 'Settings' : tab === 'skills' ? 'Skills' : tab === 'api' ? 'API & Model' : 'Plans'}
          </button>
        ))}
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

      {/* Plans Tab */}
      {activeTab === 'plans' && (
        <>
          <div style={cardStyle}>
            <h3 style={{ margin: '0 0 8px', fontSize: '15px', fontWeight: 600, color: '#111827' }}>Enabled Plans</h3>
            <p style={{ fontSize: '13px', color: '#6b7280', margin: '0 0 20px' }}>
              Choose which plans Noxtm Bot offers during signup.
            </p>

            {['Starter', 'Pro+', 'Advance'].map(plan => (
              <div key={plan} style={{ ...skillRow, cursor: 'pointer' }} onClick={() => togglePlan(plan)}>
                <button style={toggleStyle((config.enabledPlans || []).includes(plan))} onClick={(e) => { e.stopPropagation(); togglePlan(plan); }}>
                  <span style={toggleDot((config.enabledPlans || []).includes(plan))} />
                </button>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: '#111827' }}>{plan}</div>
                  <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '2px' }}>
                    {plan === 'Starter' && '₹1,699/mo · 5 members · 10 GB'}
                    {plan === 'Pro+' && '₹2,699/mo · 60 members · 50 GB'}
                    {plan === 'Advance' && '₹4,699/mo · Unlimited · 75 GB'}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <button style={btnPrimary} onClick={saveConfig} disabled={saving}>
            {saving ? 'Saving...' : 'Save Plan Settings'}
          </button>
        </>
      )}
    </div>
  );
}

export default NoxtmBotAdmin;
