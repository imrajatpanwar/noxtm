import React, { useState, useEffect, useCallback } from 'react';
import {
  FiShield, FiPlus, FiSearch, FiFilter, FiFileText, FiEdit3, FiTrash2,
  FiCheck, FiClock, FiAlertTriangle, FiTag, FiX, FiSave,
  FiChevronDown, FiCalendar, FiUsers, FiCheckCircle,
  FiLock, FiSettings, FiDollarSign, FiMonitor, FiBookOpen
} from 'react-icons/fi';
import api from '../config/api';
import './CompanyPolicies.css';

const CATEGORIES = [
  { key: 'all', label: 'All', icon: FiFileText },
  { key: 'hr', label: 'HR', icon: FiUsers },
  { key: 'security', label: 'Security', icon: FiLock },
  { key: 'operations', label: 'Operations', icon: FiSettings },
  { key: 'compliance', label: 'Compliance', icon: FiShield },
  { key: 'finance', label: 'Finance', icon: FiDollarSign },
  { key: 'it', label: 'IT', icon: FiMonitor },
  { key: 'general', label: 'General', icon: FiBookOpen },
];

const PRIORITY_MAP = {
  low: { label: 'Low', color: '#64748b' },
  medium: { label: 'Medium', color: '#3b82f6' },
  high: { label: 'High', color: '#f59e0b' },
  critical: { label: 'Critical', color: '#ef4444' },
};

const STATUS_MAP = {
  draft: { label: 'Draft', color: '#94a3b8', bg: '#f1f5f9' },
  published: { label: 'Published', color: '#16a34a', bg: '#f0fdf4' },
  archived: { label: 'Archived', color: '#64748b', bg: '#f8fafc' },
};

function CompanyPolicies() {
  const [policies, setPolicies] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [activeStatus, setActiveStatus] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState(null);
  const [viewingPolicy, setViewingPolicy] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    title: '', description: '', category: 'general', content: '',
    status: 'draft', version: '1.0', effectiveDate: '', reviewDate: '',
    priority: 'medium', tags: '', requiresAcknowledgment: false
  });

  const fetchPolicies = useCallback(async () => {
    try {
      const params = {};
      if (activeCategory !== 'all') params.category = activeCategory;
      if (activeStatus !== 'all') params.status = activeStatus;
      if (search) params.search = search;
      const res = await api.get('/company-policies', { params });
      if (res.data.success) setPolicies(res.data.policies);
    } catch (err) {
      console.error('Error fetching policies:', err);
    } finally {
      setLoading(false);
    }
  }, [activeCategory, activeStatus, search]);

  const fetchStats = useCallback(async () => {
    try {
      const res = await api.get('/company-policies/stats');
      if (res.data.success) setStats(res.data.stats);
    } catch (err) {
      console.error('Error fetching stats:', err);
    }
  }, []);

  useEffect(() => {
    fetchPolicies();
    fetchStats();
  }, [fetchPolicies, fetchStats]);

  const openCreate = () => {
    setEditingPolicy(null);
    setForm({ title: '', description: '', category: 'general', content: '', status: 'draft', version: '1.0', effectiveDate: '', reviewDate: '', priority: 'medium', tags: '', requiresAcknowledgment: false });
    setShowModal(true);
  };

  const openEdit = (p) => {
    setEditingPolicy(p);
    setForm({
      title: p.title, description: p.description || '', category: p.category,
      content: p.content || '', status: p.status, version: p.version || '1.0',
      effectiveDate: p.effectiveDate ? p.effectiveDate.split('T')[0] : '',
      reviewDate: p.reviewDate ? p.reviewDate.split('T')[0] : '',
      priority: p.priority || 'medium', tags: (p.tags || []).join(', '),
      requiresAcknowledgment: p.requiresAcknowledgment || false
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.title.trim()) return;
    setSaving(true);
    try {
      const payload = {
        ...form,
        tags: form.tags ? form.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
        effectiveDate: form.effectiveDate || null,
        reviewDate: form.reviewDate || null,
      };
      if (editingPolicy) {
        await api.put(`/company-policies/${editingPolicy._id}`, payload);
      } else {
        await api.post('/company-policies', payload);
      }
      setShowModal(false);
      fetchPolicies();
      fetchStats();
    } catch (err) {
      console.error('Error saving policy:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this policy?')) return;
    try {
      await api.delete(`/company-policies/${id}`);
      fetchPolicies();
      fetchStats();
      if (viewingPolicy?._id === id) setViewingPolicy(null);
    } catch (err) {
      console.error('Error deleting:', err);
    }
  };

  const handleAcknowledge = async (id) => {
    try {
      await api.post(`/company-policies/${id}/acknowledge`);
      fetchPolicies();
      fetchStats();
      if (viewingPolicy?._id === id) {
        setViewingPolicy(prev => ({ ...prev, isAcknowledged: true }));
      }
    } catch (err) {
      console.error('Error acknowledging:', err);
    }
  };

  const openView = async (id) => {
    try {
      const res = await api.get(`/company-policies/${id}`);
      if (res.data.success) setViewingPolicy(res.data.policy);
    } catch (err) {
      console.error('Error fetching policy:', err);
    }
  };

  const getCatIcon = (key) => {
    const cat = CATEGORIES.find(c => c.key === key);
    return cat ? cat.icon : FiFileText;
  };

  const fmtDate = (d) => {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  /* ============ VIEW: Single Policy Detail ============ */
  if (viewingPolicy) {
    const CatIcon = getCatIcon(viewingPolicy.category);
    const stInfo = STATUS_MAP[viewingPolicy.status] || STATUS_MAP.draft;
    const prInfo = PRIORITY_MAP[viewingPolicy.priority] || PRIORITY_MAP.medium;

    return (
      <div className="cp-wrap">
        <button className="cp-back-btn" onClick={() => setViewingPolicy(null)}>
          <FiChevronDown className="cp-back-chevron" /> Back to Policies
        </button>

        <div className="cp-view-card">
          <div className="cp-view-top">
            <div className="cp-view-icon" style={{ background: stInfo.bg }}>
              <CatIcon size={24} style={{ color: stInfo.color }} />
            </div>
            <div className="cp-view-title-block">
              <h1>{viewingPolicy.title}</h1>
              {viewingPolicy.description && <p>{viewingPolicy.description}</p>}
            </div>
            <div className="cp-view-top-btns">
              <button className="cp-icon-btn" onClick={() => openEdit(viewingPolicy)}><FiEdit3 size={15} /></button>
              <button className="cp-icon-btn danger" onClick={() => handleDelete(viewingPolicy._id)}><FiTrash2 size={15} /></button>
            </div>
          </div>

          <div className="cp-view-badges">
            <span className="cp-badge" style={{ background: stInfo.bg, color: stInfo.color }}>{stInfo.label}</span>
            <span className="cp-badge priority" style={{ color: prInfo.color }}>{prInfo.label} Priority</span>
            <span className="cp-meta-chip"><FiTag size={11} /> {viewingPolicy.category}</span>
            <span className="cp-meta-chip"><FiClock size={11} /> v{viewingPolicy.version}</span>
            {viewingPolicy.effectiveDate && <span className="cp-meta-chip"><FiCalendar size={11} /> Effective: {fmtDate(viewingPolicy.effectiveDate)}</span>}
            {viewingPolicy.reviewDate && <span className="cp-meta-chip"><FiAlertTriangle size={11} /> Review: {fmtDate(viewingPolicy.reviewDate)}</span>}
          </div>

          <div className="cp-view-content-body">
            {viewingPolicy.content ? (
              <div className="cp-rich-content" dangerouslySetInnerHTML={{ __html: viewingPolicy.content.replace(/\n/g, '<br/>') }} />
            ) : (
              <p className="cp-no-content">No content has been added to this policy yet.</p>
            )}
          </div>

          <div className="cp-view-bottom">
            <div className="cp-view-bottom-left">
              {viewingPolicy.createdBy && (
                <span className="cp-author">Created by <strong>{viewingPolicy.createdBy.fullName}</strong> · {fmtDate(viewingPolicy.createdAt)}</span>
              )}
              {viewingPolicy.tags?.length > 0 && (
                <div className="cp-tags-row">
                  {viewingPolicy.tags.map((t, i) => <span key={i} className="cp-tag-chip">{t}</span>)}
                </div>
              )}
            </div>
            <div className="cp-view-bottom-right">
              {viewingPolicy.requiresAcknowledgment && !viewingPolicy.isAcknowledged && (
                <button className="cp-ack-btn" onClick={() => handleAcknowledge(viewingPolicy._id)}>
                  <FiCheckCircle size={15} /> Acknowledge Policy
                </button>
              )}
              {viewingPolicy.isAcknowledged && (
                <span className="cp-ack-done"><FiCheckCircle size={14} /> Acknowledged</span>
              )}
              {viewingPolicy.acknowledgments?.length > 0 && (
                <span className="cp-ack-count"><FiUsers size={12} /> {viewingPolicy.acknowledgments.length} acknowledged</span>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ============ LIST VIEW ============ */
  return (
    <div className="cp-wrap">
      {/* Header */}
      <div className="cp-header">
        <div className="cp-header-left">
          <div className="cp-header-icon"><FiShield size={22} /></div>
          <div>
            <h1>Company Policies</h1>
            <p>Manage organizational policies, procedures, and compliance documents</p>
          </div>
        </div>
        <button className="cp-btn-primary" onClick={openCreate}>
          <FiPlus size={16} /> New Policy
        </button>
      </div>

      {/* Stats */}
      {stats && (
        <div className="cp-stats">
          <div className="cp-stat">
            <div className="cp-stat-ic blue"><FiFileText size={18} /></div>
            <div className="cp-stat-body">
              <span className="cp-stat-n">{stats.total}</span>
              <span className="cp-stat-l">Total Policies</span>
            </div>
          </div>
          <div className="cp-stat">
            <div className="cp-stat-ic green"><FiCheck size={18} /></div>
            <div className="cp-stat-body">
              <span className="cp-stat-n">{stats.published}</span>
              <span className="cp-stat-l">Published</span>
            </div>
          </div>
          <div className="cp-stat">
            <div className="cp-stat-ic amber"><FiEdit3 size={18} /></div>
            <div className="cp-stat-body">
              <span className="cp-stat-n">{stats.drafts}</span>
              <span className="cp-stat-l">Drafts</span>
            </div>
          </div>
          <div className="cp-stat">
            <div className="cp-stat-ic red"><FiAlertTriangle size={18} /></div>
            <div className="cp-stat-body">
              <span className="cp-stat-n">{stats.pendingAck}</span>
              <span className="cp-stat-l">Pending Ack</span>
            </div>
          </div>
          <div className="cp-stat">
            <div className="cp-stat-ic purple"><FiClock size={18} /></div>
            <div className="cp-stat-body">
              <span className="cp-stat-n">{stats.needingReview}</span>
              <span className="cp-stat-l">Review Due</span>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="cp-filters">
        <div className="cp-search">
          <FiSearch size={15} />
          <input type="text" placeholder="Search policies..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="cp-pills">
          {CATEGORIES.map(c => (
            <button key={c.key} className={`cp-pill ${activeCategory === c.key ? 'active' : ''}`} onClick={() => setActiveCategory(c.key)}>
              <c.icon size={13} /> {c.label}
            </button>
          ))}
        </div>
        <div className="cp-select-wrap">
          <FiFilter size={14} />
          <select value={activeStatus} onChange={e => setActiveStatus(e.target.value)}>
            <option value="all">All Status</option>
            <option value="draft">Draft</option>
            <option value="published">Published</option>
            <option value="archived">Archived</option>
          </select>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="cp-empty"><p>Loading policies...</p></div>
      ) : policies.length === 0 ? (
        <div className="cp-empty">
          <div className="cp-empty-ic"><FiShield size={44} /></div>
          <h3>No Policies Found</h3>
          <p>Create your first company policy to get started.</p>
          <button className="cp-btn-primary" onClick={openCreate}><FiPlus size={16} /> Create Policy</button>
        </div>
      ) : (
        <div className="cp-grid">
          {policies.map(p => {
            const CIcon = getCatIcon(p.category);
            const si = STATUS_MAP[p.status] || STATUS_MAP.draft;
            const pi = PRIORITY_MAP[p.priority] || PRIORITY_MAP.medium;
            return (
              <div key={p._id} className="cp-card" onClick={() => openView(p._id)}>
                <div className="cp-card-top">
                  <div className="cp-card-icon"><CIcon size={18} /></div>
                  <div className="cp-card-dots">
                    <span className="cp-dot" style={{ background: si.color }} title={si.label} />
                    <span className="cp-dot" style={{ background: pi.color }} title={pi.label} />
                  </div>
                </div>
                <h3>{p.title}</h3>
                {p.description && <p className="cp-card-desc">{p.description}</p>}
                <div className="cp-card-meta">
                  <span className="cp-card-cat">{p.category}</span>
                  <span className="cp-card-ver">v{p.version}</span>
                  {p.requiresAcknowledgment && (
                    <span className={`cp-card-ack ${p.isAcknowledged ? 'done' : ''}`}>
                      <FiCheckCircle size={11} /> {p.isAcknowledged ? 'Acked' : 'Ack needed'}
                    </span>
                  )}
                </div>
                <div className="cp-card-foot">
                  <span>{fmtDate(p.createdAt)}</span>
                  <div className="cp-card-btns" onClick={e => e.stopPropagation()}>
                    <button onClick={() => openEdit(p)}><FiEdit3 size={13} /></button>
                    <button className="danger" onClick={() => handleDelete(p._id)}><FiTrash2 size={13} /></button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="cp-overlay" onClick={() => setShowModal(false)}>
          <div className="cp-modal" onClick={e => e.stopPropagation()}>
            <div className="cp-modal-head">
              <h2>{editingPolicy ? 'Edit Policy' : 'New Policy'}</h2>
              <button onClick={() => setShowModal(false)}><FiX size={18} /></button>
            </div>
            <div className="cp-modal-body">
              <div className="cp-form-row">
                <div className="cp-fg full">
                  <label>Title *</label>
                  <input type="text" value={form.title} onChange={e => setForm({...form, title: e.target.value})} placeholder="Policy title" />
                </div>
              </div>
              <div className="cp-form-row">
                <div className="cp-fg full">
                  <label>Description</label>
                  <input type="text" value={form.description} onChange={e => setForm({...form, description: e.target.value})} placeholder="Brief description" />
                </div>
              </div>
              <div className="cp-form-row tri">
                <div className="cp-fg">
                  <label>Category</label>
                  <select value={form.category} onChange={e => setForm({...form, category: e.target.value})}>
                    {CATEGORIES.filter(c => c.key !== 'all').map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
                  </select>
                </div>
                <div className="cp-fg">
                  <label>Priority</label>
                  <select value={form.priority} onChange={e => setForm({...form, priority: e.target.value})}>
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>
                <div className="cp-fg">
                  <label>Status</label>
                  <select value={form.status} onChange={e => setForm({...form, status: e.target.value})}>
                    <option value="draft">Draft</option>
                    <option value="published">Published</option>
                    <option value="archived">Archived</option>
                  </select>
                </div>
              </div>
              <div className="cp-form-row tri">
                <div className="cp-fg">
                  <label>Version</label>
                  <input type="text" value={form.version} onChange={e => setForm({...form, version: e.target.value})} placeholder="1.0" />
                </div>
                <div className="cp-fg">
                  <label>Effective Date</label>
                  <input type="date" value={form.effectiveDate} onChange={e => setForm({...form, effectiveDate: e.target.value})} />
                </div>
                <div className="cp-fg">
                  <label>Review Date</label>
                  <input type="date" value={form.reviewDate} onChange={e => setForm({...form, reviewDate: e.target.value})} />
                </div>
              </div>
              <div className="cp-form-row">
                <div className="cp-fg full">
                  <label>Content</label>
                  <textarea rows={10} value={form.content} onChange={e => setForm({...form, content: e.target.value})} placeholder="Write the policy content here..." />
                </div>
              </div>
              <div className="cp-form-row">
                <div className="cp-fg full">
                  <label>Tags (comma separated)</label>
                  <input type="text" value={form.tags} onChange={e => setForm({...form, tags: e.target.value})} placeholder="e.g. leave, remote, hybrid" />
                </div>
              </div>
              <div className="cp-form-row">
                <label className="cp-check">
                  <input type="checkbox" checked={form.requiresAcknowledgment} onChange={e => setForm({...form, requiresAcknowledgment: e.target.checked})} />
                  <span>Require employee acknowledgment</span>
                </label>
              </div>
            </div>
            <div className="cp-modal-foot">
              <button className="cp-btn-sec" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="cp-btn-primary" onClick={handleSave} disabled={saving || !form.title.trim()}>
                <FiSave size={15} /> {saving ? 'Saving...' : editingPolicy ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default CompanyPolicies;
