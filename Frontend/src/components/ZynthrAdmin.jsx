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

function ZynthrAdmin() {
  const [activeTab, setActiveTab] = useState('settings');
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [newSkillName, setNewSkillName] = useState('');
  const [newSkillDesc, setNewSkillDesc] = useState('');

  const fetchConfig = useCallback(async () => {
    try {
      const res = await api.get('/zynthr/config');
      if (res.data.success) {
        setConfig(res.data.config);
      }
    } catch (err) {
      console.error('[ZynthrAdmin] Error fetching config:', err);
      // Set defaults
      setConfig({
        enabled: true,
        botGreeting: "Hey! I'm Zynthr, your setup assistant at Noxtm. Ready to get your workspace rolling? 🚀",
        personality: 'friendly',
        maxWordCount: 80,
        responseLanguage: 'English',
        customInstructions: '',
        skills: [],
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
      const res = await api.put('/zynthr/config', config);
      if (res.data.success) {
        setConfig(res.data.config);
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      }
    } catch (err) {
      console.error('[ZynthrAdmin] Save error:', err);
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
    const skill = { name: newSkillName.trim(), description: newSkillDesc.trim(), enabled: true };
    setConfig(prev => ({ ...prev, skills: [...(prev.skills || []), skill] }));
    setNewSkillName('');
    setNewSkillDesc('');
    setSaved(false);
  };

  const removeSkill = (index) => {
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
          Loading Zynthr configuration...
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
          <h2 style={titleStyle}>Zynthr AI Setup</h2>
          {saved && <span style={statusBadge(true)}>✓ Saved</span>}
          {saving && <span style={statusBadge(false)}>Saving...</span>}
        </div>
        <p style={subtitleStyle}>Configure your AI onboarding assistant's behavior and skills</p>
      </div>

      {/* Tabs */}
      <div style={tabBarStyle}>
        {['settings', 'skills', 'plans'].map(tab => (
          <button key={tab} style={tabStyle(activeTab === tab)} onClick={() => setActiveTab(tab)}>
            {tab === 'settings' ? '⚙️ Settings' : tab === 'skills' ? '🧠 Skills' : '📦 Plans'}
          </button>
        ))}
      </div>

      {/* Settings Tab */}
      {activeTab === 'settings' && (
        <>
          <div style={cardStyle}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: '#111827' }}>Zynthr Enabled</h3>
                <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#6b7280' }}>Turn AI signup assistant on/off</p>
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
                placeholder="Any additional instructions for Zynthr's behavior..."
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
              Skills define what Zynthr can help users with during onboarding. Add custom conversation topics.
            </p>

            {(config.skills || []).map((skill, i) => (
              <div key={i} style={skillRow}>
                <button style={toggleStyle(skill.enabled)} onClick={() => toggleSkill(i)}>
                  <span style={toggleDot(skill.enabled)} />
                </button>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: '#111827' }}>{skill.name}</div>
                  {skill.description && <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '2px' }}>{skill.description}</div>}
                </div>
                <button style={btnDanger} onClick={() => removeSkill(i)}>Remove</button>
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

      {/* Plans Tab */}
      {activeTab === 'plans' && (
        <>
          <div style={cardStyle}>
            <h3 style={{ margin: '0 0 8px', fontSize: '15px', fontWeight: 600, color: '#111827' }}>Enabled Plans</h3>
            <p style={{ fontSize: '13px', color: '#6b7280', margin: '0 0 20px' }}>
              Choose which plans Zynthr offers during signup.
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

export default ZynthrAdmin;
