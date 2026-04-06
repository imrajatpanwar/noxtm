import React, { useState, useEffect, useCallback, useRef } from 'react';
import api from '../config/api';

const inputStyle = {
  width: '100%',
  padding: '8px 12px',
  borderRadius: '6px',
  border: '1px solid #e5e7eb',
  fontSize: '13px',
  color: '#111827',
  outline: 'none',
  fontFamily: "'Switzer', sans-serif",
  boxSizing: 'border-box',
};

const labelStyle = {
  display: 'block',
  fontSize: '12px',
  fontWeight: 600,
  color: '#374151',
  marginBottom: '4px',
};

const cardStyle = {
  background: '#fff',
  border: '1px solid #e5e7eb',
  borderRadius: '10px',
  padding: '16px',
  marginBottom: '12px',
};

const btnPrimary = {
  padding: '8px 18px',
  borderRadius: '7px',
  border: 'none',
  background: '#111827',
  color: '#fff',
  fontSize: '13px',
  fontWeight: 600,
  cursor: 'pointer',
  fontFamily: "'Switzer', sans-serif",
};

const btnOutline = {
  padding: '6px 14px',
  borderRadius: '6px',
  border: '1px solid #e5e7eb',
  background: '#fff',
  color: '#374151',
  fontSize: '12px',
  fontWeight: 500,
  cursor: 'pointer',
  fontFamily: "'Switzer', sans-serif",
};

const btnDanger = {
  ...btnOutline,
  color: '#ef4444',
  borderColor: '#fecaca',
};

const btnAccent = {
  ...btnOutline,
  color: '#7c3aed',
  borderColor: '#c4b5fd',
};

const QUESTION_TYPES = ['text', 'textarea', 'email', 'phone', 'url', 'number', 'select', 'multiselect'];
const TRIGGERS = ['company-setup', 'signup', 'post-signup', 'on-demand', 'always'];
const TARGETS = ['Company', 'User', 'Workspace', 'Custom'];
const COMPLETE_ACTIONS = ['none', 'createCompany', 'updateCompany', 'updateUser', 'redirect'];

function NoxtmSkillsEditor() {
  const [skills, setSkills] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [filterTrigger, setFilterTrigger] = useState('');
  const [view, setView] = useState('list'); // list | edit | marketplace | variants
  const [marketplace, setMarketplace] = useState([]);
  const [marketplaceLoading, setMarketplaceLoading] = useState(false);
  const [marketplaceSearch, setMarketplaceSearch] = useState('');
  const [variants, setVariants] = useState([]);
  const [variantForm, setVariantForm] = useState({ variantName: '', trafficPercent: 50 });
  const fileInputRef = useRef(null);

  const fetchSkills = useCallback(async () => {
    setLoading(true);
    try {
      const q = filterTrigger ? `?trigger=${filterTrigger}` : '';
      const res = await api.get(`/noxtm-skills${q}`);
      if (res.data.success) setSkills(res.data.skills || []);
    } catch (e) {
      console.error('[SkillsEditor] fetch error:', e);
      setSkills([]);
    } finally {
      setLoading(false);
    }
  }, [filterTrigger]);

  useEffect(() => { fetchSkills(); }, [fetchSkills]);

  const loadSkill = async (id) => {
    try {
      const res = await api.get(`/noxtm-skills/${id}`);
      if (res.data.success) {
        setSelected(res.data.skill);
        setView('edit');
      }
    } catch (e) {
      alert('Could not load skill');
    }
  };

  const saveSkill = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      if (selected._id) {
        const res = await api.put(`/noxtm-skills/${selected._id}`, selected);
        if (res.data.success) {
          setSelected(res.data.skill);
          await fetchSkills();
          alert('Saved');
        }
      } else {
        const res = await api.post('/noxtm-skills', selected);
        if (res.data.success) {
          setSelected(res.data.skill);
          await fetchSkills();
          alert('Created');
        }
      }
    } catch (e) {
      alert(e.response?.data?.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const forkSkill = async (id) => {
    try {
      const res = await api.post(`/noxtm-skills/${id}/fork`);
      if (res.data.success) {
        await fetchSkills();
        setSelected(res.data.skill);
        setView('edit');
        alert('Forked. Now you can customize it.');
      }
    } catch (e) {
      alert(e.response?.data?.message || 'Fork failed');
    }
  };

  const deleteSkill = async (id) => {
    if (!window.confirm('Delete this skill?')) return;
    try {
      const res = await api.delete(`/noxtm-skills/${id}`);
      if (res.data.success) {
        await fetchSkills();
        if (selected?._id === id) {
          setSelected(null);
          setView('list');
        }
      }
    } catch (e) {
      alert(e.response?.data?.message || 'Delete failed');
    }
  };

  const newSkill = () => {
    setSelected({
      slug: '',
      name: '',
      description: '',
      enabled: true,
      isBuiltIn: false,
      trigger: 'on-demand',
      priority: 100,
      targetModel: 'Company',
      systemPrompt: '',
      questions: [],
      onComplete: { action: 'none', redirect: '', message: '' },
    });
    setView('edit');
  };

  // Export
  const exportSkill = async (id) => {
    try {
      const res = await api.get(`/noxtm-skills/${id}/export`);
      if (res.data.success) {
        const blob = new Blob([JSON.stringify(res.data.template, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `skill-${res.data.template.slug || 'export'}.json`;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (e) {
      alert('Export failed');
    }
  };

  // Import
  const handleImportFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      const template = parsed.template || parsed;
      const res = await api.post('/noxtm-skills/import', { template });
      if (res.data.success) {
        await fetchSkills();
        setSelected(res.data.skill);
        setView('edit');
        alert('Imported successfully');
      }
    } catch (e) {
      alert(e.response?.data?.message || 'Import failed. Check JSON format.');
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Marketplace
  const fetchMarketplace = async (search = '') => {
    setMarketplaceLoading(true);
    try {
      const q = search ? `?search=${encodeURIComponent(search)}` : '';
      const res = await api.get(`/noxtm-skills/marketplace/browse${q}`);
      if (res.data.success) setMarketplace(res.data.skills || []);
    } catch (e) {
      setMarketplace([]);
    } finally {
      setMarketplaceLoading(false);
    }
  };

  const installMarketplaceSkill = async (id) => {
    try {
      const res = await api.post(`/noxtm-skills/marketplace/install/${id}`);
      if (res.data.success) {
        await fetchSkills();
        alert('Installed!');
      }
    } catch (e) {
      alert(e.response?.data?.message || 'Install failed');
    }
  };

  // Variants
  const fetchVariants = async (id) => {
    try {
      const res = await api.get(`/noxtm-skills/${id}/variants`);
      if (res.data.success) setVariants(res.data.variants || []);
    } catch (e) {
      setVariants([]);
    }
  };

  const createVariant = async (baseId) => {
    try {
      const res = await api.post(`/noxtm-skills/${baseId}/variant`, variantForm);
      if (res.data.success) {
        await fetchVariants(baseId);
        await fetchSkills();
        setVariantForm({ variantName: '', trafficPercent: 50 });
        alert(`Variant created. Base now gets ${res.data.baseTrafficPercent}% traffic.`);
      }
    } catch (e) {
      alert(e.response?.data?.message || 'Create variant failed');
    }
  };

  const updateField = (f, v) => setSelected(prev => ({ ...prev, [f]: v }));

  const updateQuestion = (idx, field, value) => {
    setSelected(prev => ({
      ...prev,
      questions: prev.questions.map((q, i) => i === idx ? { ...q, [field]: value } : q),
    }));
  };

  const addQuestion = () => {
    setSelected(prev => ({
      ...prev,
      questions: [...(prev.questions || []), {
        id: 'q_' + Date.now(),
        prompt: '',
        fieldPath: '',
        type: 'text',
        required: true,
        skippable: false,
        options: [],
        placeholder: '',
        validator: '',
        extractionHint: '',
        retryPrompt: '',
        condition: '',
        uiAction: '',
      }],
    }));
  };

  const removeQuestion = (idx) => {
    setSelected(prev => ({ ...prev, questions: prev.questions.filter((_, i) => i !== idx) }));
  };

  const moveQuestion = (idx, dir) => {
    const target = idx + dir;
    if (target < 0 || target >= selected.questions.length) return;
    const next = [...selected.questions];
    [next[idx], next[target]] = [next[target], next[idx]];
    setSelected(prev => ({ ...prev, questions: next }));
  };

  if (loading) return <div style={{ padding: '20px', color: '#6b7280' }}>Loading skills...</div>;

  // ===== MARKETPLACE VIEW =====
  if (view === 'marketplace') {
    return (
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
          <button style={btnOutline} onClick={() => setView('list')}>← Back</button>
          <input
            style={{ ...inputStyle, flex: 1 }}
            placeholder="Search marketplace..."
            value={marketplaceSearch}
            onChange={e => setMarketplaceSearch(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && fetchMarketplace(marketplaceSearch)}
          />
          <button style={btnPrimary} onClick={() => fetchMarketplace(marketplaceSearch)}>Search</button>
        </div>

        {marketplaceLoading && <div style={{ padding: '20px', color: '#6b7280', textAlign: 'center' }}>Loading...</div>}

        {!marketplaceLoading && marketplace.length === 0 && (
          <div style={{ padding: '24px', color: '#9ca3af', textAlign: 'center', background: '#f9fafb', borderRadius: '10px' }}>
            No published skills found. Admins can publish global skills to the marketplace.
          </div>
        )}

        {marketplace.map(s => (
          <div key={s._id} style={cardStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <strong style={{ fontSize: '14px', color: '#111827' }}>{s.name}</strong>
                  <span style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '4px', background: '#dcfce7', color: '#166534' }}>{s.trigger}</span>
                </div>
                <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>{s.description}</div>
                <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '4px', display: 'flex', gap: '12px' }}>
                  <span>by {s.author}</span>
                  <span>{s.questionCount} questions</span>
                  <span>{s.downloads || 0} installs</span>
                  {s.tags?.length > 0 && <span>{s.tags.join(', ')}</span>}
                </div>
              </div>
              <button style={btnPrimary} onClick={() => installMarketplaceSkill(s._id)}>Install</button>
            </div>
          </div>
        ))}
      </div>
    );
  }

  // ===== VARIANTS VIEW =====
  if (view === 'variants' && selected) {
    return (
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
          <button style={btnOutline} onClick={() => { setView('edit'); setVariants([]); }}>← Back to Editor</button>
          <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 600 }}>A/B Variants — {selected.name}</h4>
        </div>

        {/* Create new variant */}
        <div style={cardStyle}>
          <h4 style={{ margin: '0 0 12px', fontSize: '13px', fontWeight: 600 }}>Create New Variant</h4>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr auto', gap: '10px', alignItems: 'end' }}>
            <div>
              <label style={labelStyle}>Variant Name</label>
              <input
                style={inputStyle}
                value={variantForm.variantName}
                onChange={e => setVariantForm(prev => ({ ...prev, variantName: e.target.value }))}
                placeholder="e.g. Shorter Flow"
              />
            </div>
            <div>
              <label style={labelStyle}>Traffic %</label>
              <input
                type="number"
                style={inputStyle}
                value={variantForm.trafficPercent}
                onChange={e => setVariantForm(prev => ({ ...prev, trafficPercent: parseInt(e.target.value) || 0 }))}
                min="1"
                max="99"
              />
            </div>
            <button
              style={btnPrimary}
              onClick={() => createVariant(selected._id)}
              disabled={!variantForm.variantName}
            >
              Create
            </button>
          </div>
          <p style={{ fontSize: '11px', color: '#9ca3af', margin: '8px 0 0' }}>
            Creates a copy of the base skill. Edit the variant to change questions/prompt. Users are assigned deterministically by ID.
          </p>
        </div>

        {/* Variant comparison table */}
        {variants.length > 0 && (
          <div style={cardStyle}>
            <h4 style={{ margin: '0 0 12px', fontSize: '13px', fontWeight: 600 }}>Traffic Split & Performance</h4>
            <table style={{ width: '100%', fontSize: '12px', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
                  <th style={{ padding: '8px 6px', textAlign: 'left', color: '#6b7280' }}>Variant</th>
                  <th style={{ padding: '8px 6px', textAlign: 'center', color: '#6b7280' }}>Traffic</th>
                  <th style={{ padding: '8px 6px', textAlign: 'center', color: '#6b7280' }}>Sessions</th>
                  <th style={{ padding: '8px 6px', textAlign: 'center', color: '#6b7280' }}>Completion</th>
                  <th style={{ padding: '8px 6px', textAlign: 'center', color: '#6b7280' }}>Avg Conf.</th>
                  <th style={{ padding: '8px 6px', textAlign: 'center', color: '#6b7280' }}>Avg Turns</th>
                  <th style={{ padding: '8px 6px', textAlign: 'center', color: '#6b7280' }}>Status</th>
                  <th style={{ padding: '8px 6px', textAlign: 'center', color: '#6b7280' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {variants.map(v => (
                  <tr key={v._id} style={{ borderBottom: '1px solid #f3f4f6', background: v.isBase ? '#f9fafb' : 'transparent' }}>
                    <td style={{ padding: '6px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <strong style={{ fontSize: '12px' }}>{v.variantName}</strong>
                        {v.isBase && <span style={{ fontSize: '9px', padding: '1px 6px', borderRadius: '3px', background: '#e0e7ff', color: '#4338ca' }}>Control</span>}
                      </div>
                    </td>
                    <td style={{ padding: '6px', textAlign: 'center' }}>
                      <span style={{ fontWeight: 600 }}>{v.trafficPercent}%</span>
                    </td>
                    <td style={{ padding: '6px', textAlign: 'center' }}>{v.analytics?.totalSessions || 0}</td>
                    <td style={{ padding: '6px', textAlign: 'center' }}>
                      {v.analytics ? <span style={{ fontWeight: 600 }}>{v.analytics.completionRate}%</span> : '-'}
                    </td>
                    <td style={{ padding: '6px', textAlign: 'center' }}>
                      {v.analytics?.avgConfidence ? `${Math.round(v.analytics.avgConfidence * 100)}%` : '-'}
                    </td>
                    <td style={{ padding: '6px', textAlign: 'center' }}>
                      {v.analytics?.avgTurns ? v.analytics.avgTurns.toFixed(1) : '-'}
                    </td>
                    <td style={{ padding: '6px', textAlign: 'center' }}>
                      <span style={{
                        fontSize: '10px', padding: '2px 8px', borderRadius: '4px',
                        background: v.enabled ? '#dcfce7' : '#fee2e2',
                        color: v.enabled ? '#166534' : '#991b1b',
                      }}>
                        {v.enabled ? 'Active' : 'Off'}
                      </span>
                    </td>
                    <td style={{ padding: '6px', textAlign: 'center' }}>
                      {!v.isBase && (
                        <div style={{ display: 'flex', gap: '4px', justifyContent: 'center' }}>
                          <button style={{ ...btnOutline, fontSize: '10px', padding: '2px 8px' }} onClick={() => loadSkill(v._id)}>Edit</button>
                          <button style={{ ...btnDanger, fontSize: '10px', padding: '2px 8px' }} onClick={() => deleteSkill(v._id)}>Del</button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Traffic bar */}
            <div style={{ display: 'flex', height: '20px', borderRadius: '6px', overflow: 'hidden', marginTop: '12px' }}>
              {variants.map((v, i) => {
                const colors = ['#6366f1', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6', '#ec4899'];
                return (
                  <div
                    key={v._id}
                    style={{
                      width: `${v.trafficPercent}%`,
                      background: colors[i % colors.length],
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '9px', color: '#fff', fontWeight: 600,
                      transition: 'width 0.3s ease',
                    }}
                    title={`${v.variantName}: ${v.trafficPercent}%`}
                  >
                    {v.trafficPercent >= 10 ? `${v.variantName} ${v.trafficPercent}%` : ''}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {variants.length === 0 && (
          <div style={{ padding: '24px', color: '#9ca3af', textAlign: 'center', background: '#f9fafb', borderRadius: '10px' }}>
            No variants yet. Create one above to start A/B testing.
          </div>
        )}
      </div>
    );
  }

  // ===== LIST VIEW =====
  if (view === 'list') {
    return (
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px', flexWrap: 'wrap' }}>
          <select
            value={filterTrigger}
            onChange={e => setFilterTrigger(e.target.value)}
            style={{ ...inputStyle, width: '160px' }}
          >
            <option value="">All triggers</option>
            {TRIGGERS.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <button style={btnPrimary} onClick={newSkill}>+ New Skill</button>
          <button style={btnOutline} onClick={() => fileInputRef.current?.click()}>Import JSON</button>
          <button style={btnAccent} onClick={() => { setView('marketplace'); fetchMarketplace(); }}>Marketplace</button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            style={{ display: 'none' }}
            onChange={handleImportFile}
          />
        </div>

        {skills.length === 0 ? (
          <div style={{ padding: '24px', color: '#9ca3af', textAlign: 'center', background: '#f9fafb', borderRadius: '10px' }}>
            No skills yet. Click "New Skill" to create one, or run the seed script to create defaults.
          </div>
        ) : (
          skills.map(s => (
            <div key={s._id} style={cardStyle}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <strong style={{ fontSize: '14px', color: '#111827' }}>{s.name}</strong>
                    <span style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '4px', background: '#f3f4f6', color: '#6b7280' }}>
                      {s.slug}
                    </span>
                    {s.isBuiltIn && <span style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '4px', background: '#e0e7ff', color: '#4338ca' }}>Built-in</span>}
                    {!s.companyId && <span style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '4px', background: '#fef3c7', color: '#92400e' }}>Global</span>}
                    <span style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '4px', background: '#dcfce7', color: '#166534' }}>{s.trigger}</span>
                  </div>
                  <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>{s.description}</div>
                  <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '2px' }}>
                    {s.questions?.length || 0} questions · v{s.version || 1}
                    {s.tags?.length > 0 && <> · {s.tags.join(', ')}</>}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  <button style={btnOutline} onClick={() => loadSkill(s._id)}>Edit</button>
                  <button style={btnOutline} onClick={() => exportSkill(s._id)}>Export</button>
                  {!s.variantOf && (
                    <button style={btnAccent} onClick={() => { setSelected(s); fetchVariants(s._id); setView('variants'); }}>A/B</button>
                  )}
                  {!s.companyId && <button style={btnOutline} onClick={() => forkSkill(s._id)}>Fork</button>}
                  {!s.isBuiltIn && <button style={btnDanger} onClick={() => deleteSkill(s._id)}>Delete</button>}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    );
  }

  // ===== EDIT VIEW =====
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <button style={btnOutline} onClick={() => { setSelected(null); setView('list'); }}>← Back to list</button>
        <div style={{ display: 'flex', gap: '8px' }}>
          {selected._id && (
            <>
              <button style={btnOutline} onClick={() => exportSkill(selected._id)}>Export</button>
              {!selected.variantOf && (
                <button style={btnAccent} onClick={() => { fetchVariants(selected._id); setView('variants'); }}>A/B Variants</button>
              )}
            </>
          )}
          <button style={btnPrimary} onClick={saveSkill} disabled={saving}>
            {saving ? 'Saving...' : selected._id ? 'Save' : 'Create'}
          </button>
        </div>
      </div>

      {selected.variantOf && (
        <div style={{ ...cardStyle, background: '#f3e8ff', border: '1px solid #c4b5fd' }}>
          <div style={{ fontSize: '13px', color: '#7c3aed', fontWeight: 600 }}>
            This is an A/B variant: "{selected.variantName || 'Unnamed'}"
          </div>
          <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
            Traffic: {selected.trafficPercent}% · Edit questions/prompt to differ from the control.
          </div>
        </div>
      )}

      <div style={cardStyle}>
        <h4 style={{ margin: '0 0 12px', fontSize: '14px', fontWeight: 600 }}>Basic Info</h4>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
          <div>
            <label style={labelStyle}>Name</label>
            <input style={inputStyle} value={selected.name || ''} onChange={e => updateField('name', e.target.value)} />
          </div>
          <div>
            <label style={labelStyle}>Slug (unique)</label>
            <input style={inputStyle} value={selected.slug || ''} onChange={e => updateField('slug', e.target.value)} disabled={selected.isBuiltIn} />
          </div>
        </div>
        <div style={{ marginBottom: '12px' }}>
          <label style={labelStyle}>Description</label>
          <input style={inputStyle} value={selected.description || ''} onChange={e => updateField('description', e.target.value)} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
          <div>
            <label style={labelStyle}>Trigger</label>
            <select style={inputStyle} value={selected.trigger} onChange={e => updateField('trigger', e.target.value)}>
              {TRIGGERS.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Target Model</label>
            <select style={inputStyle} value={selected.targetModel} onChange={e => updateField('targetModel', e.target.value)}>
              {TARGETS.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Priority</label>
            <input type="number" style={inputStyle} value={selected.priority || 100} onChange={e => updateField('priority', parseInt(e.target.value) || 100)} />
          </div>
        </div>
        <div style={{ marginTop: '12px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <input type="checkbox" checked={selected.enabled} onChange={e => updateField('enabled', e.target.checked)} />
            <label style={{ fontSize: '13px', color: '#374151' }}>Enabled</label>
          </div>
          {selected.variantOf && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <label style={{ fontSize: '12px', color: '#6b7280' }}>Traffic %:</label>
              <input
                type="number"
                style={{ ...inputStyle, width: '70px' }}
                value={selected.trafficPercent || 0}
                onChange={e => updateField('trafficPercent', parseInt(e.target.value) || 0)}
                min="0"
                max="100"
              />
            </div>
          )}
        </div>
      </div>

      <div style={cardStyle}>
        <h4 style={{ margin: '0 0 12px', fontSize: '14px', fontWeight: 600 }}>System Prompt</h4>
        <textarea
          style={{ ...inputStyle, minHeight: '100px', fontFamily: 'monospace', fontSize: '12px' }}
          value={selected.systemPrompt || ''}
          onChange={e => updateField('systemPrompt', e.target.value)}
          placeholder="You are Noxtm Bot. You are helping the user with..."
        />
      </div>

      <div style={cardStyle}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
          <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 600 }}>Questions ({selected.questions?.length || 0})</h4>
          <button style={btnOutline} onClick={addQuestion}>+ Add Question</button>
        </div>

        {(selected.questions || []).map((q, i) => (
          <div key={i} style={{ padding: '12px', borderRadius: '8px', background: '#fafafa', border: '1px solid #e5e7eb', marginBottom: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <strong style={{ fontSize: '12px', color: '#374151' }}>#{i + 1} · {q.fieldPath || '(no field)'}</strong>
              <div style={{ display: 'flex', gap: '4px' }}>
                <button style={btnOutline} onClick={() => moveQuestion(i, -1)} disabled={i === 0}>↑</button>
                <button style={btnOutline} onClick={() => moveQuestion(i, 1)} disabled={i === selected.questions.length - 1}>↓</button>
                <button style={btnDanger} onClick={() => removeQuestion(i)}>×</button>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '8px' }}>
              <div>
                <label style={labelStyle}>ID</label>
                <input style={inputStyle} value={q.id || ''} onChange={e => updateQuestion(i, 'id', e.target.value)} />
              </div>
              <div>
                <label style={labelStyle}>Field Path</label>
                <input style={inputStyle} value={q.fieldPath || ''} onChange={e => updateQuestion(i, 'fieldPath', e.target.value)} placeholder="companyName" />
              </div>
            </div>
            <div style={{ marginBottom: '8px' }}>
              <label style={labelStyle}>Prompt</label>
              <input style={inputStyle} value={q.prompt || ''} onChange={e => updateQuestion(i, 'prompt', e.target.value)} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '8px', marginBottom: '8px' }}>
              <div>
                <label style={labelStyle}>Type</label>
                <select style={inputStyle} value={q.type || 'text'} onChange={e => updateQuestion(i, 'type', e.target.value)}>
                  {QUESTION_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Required</label>
                <select style={inputStyle} value={q.required ? 'yes' : 'no'} onChange={e => updateQuestion(i, 'required', e.target.value === 'yes')}>
                  <option value="yes">Yes</option>
                  <option value="no">No</option>
                </select>
              </div>
              <div>
                <label style={labelStyle}>Skippable</label>
                <select style={inputStyle} value={q.skippable ? 'yes' : 'no'} onChange={e => updateQuestion(i, 'skippable', e.target.value === 'yes')}>
                  <option value="no">No</option>
                  <option value="yes">Yes</option>
                </select>
              </div>
              <div>
                <label style={labelStyle}>Validator</label>
                <input style={inputStyle} value={q.validator || ''} onChange={e => updateQuestion(i, 'validator', e.target.value)} placeholder="minLength:3" />
              </div>
            </div>
            {(q.type === 'select' || q.type === 'multiselect') && (
              <div style={{ marginBottom: '8px' }}>
                <label style={labelStyle}>Options (comma separated)</label>
                <input
                  style={inputStyle}
                  value={(q.options || []).join(', ')}
                  onChange={e => updateQuestion(i, 'options', e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
                />
              </div>
            )}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <div>
                <label style={labelStyle}>Placeholder</label>
                <input style={inputStyle} value={q.placeholder || ''} onChange={e => updateQuestion(i, 'placeholder', e.target.value)} />
              </div>
              <div>
                <label style={labelStyle}>Retry Prompt</label>
                <input style={inputStyle} value={q.retryPrompt || ''} onChange={e => updateQuestion(i, 'retryPrompt', e.target.value)} />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '8px' }}>
              <div>
                <label style={labelStyle}>Extraction Hint</label>
                <input style={inputStyle} value={q.extractionHint || ''} onChange={e => updateQuestion(i, 'extractionHint', e.target.value)} />
              </div>
              <div>
                <label style={labelStyle}>Condition (field:value)</label>
                <input style={inputStyle} value={q.condition || ''} onChange={e => updateQuestion(i, 'condition', e.target.value)} placeholder="hasWebsite:yes" />
              </div>
            </div>
          </div>
        ))}

        {(!selected.questions || selected.questions.length === 0) && (
          <div style={{ padding: '20px', textAlign: 'center', color: '#9ca3af', fontSize: '13px' }}>
            No questions yet. Add one above.
          </div>
        )}
      </div>

      <div style={cardStyle}>
        <h4 style={{ margin: '0 0 12px', fontSize: '14px', fontWeight: 600 }}>On Complete</h4>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
          <div>
            <label style={labelStyle}>Action</label>
            <select
              style={inputStyle}
              value={selected.onComplete?.action || 'none'}
              onChange={e => updateField('onComplete', { ...(selected.onComplete || {}), action: e.target.value })}
            >
              {COMPLETE_ACTIONS.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Redirect URL</label>
            <input
              style={inputStyle}
              value={selected.onComplete?.redirect || ''}
              onChange={e => updateField('onComplete', { ...(selected.onComplete || {}), redirect: e.target.value })}
              placeholder="/pricing"
            />
          </div>
        </div>
        <div>
          <label style={labelStyle}>Completion Message</label>
          <input
            style={inputStyle}
            value={selected.onComplete?.message || ''}
            onChange={e => updateField('onComplete', { ...(selected.onComplete || {}), message: e.target.value })}
            placeholder="All set! Moving to the next step."
          />
        </div>
      </div>
    </div>
  );
}

export default NoxtmSkillsEditor;
