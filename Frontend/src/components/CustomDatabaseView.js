import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  FiPlus, FiSearch, FiX, FiCheck, FiUsers, FiSettings, FiTrash2,
  FiEdit2, FiChevronDown, FiChevronRight, FiMenu, FiDatabase,
  FiType, FiHash, FiLink, FiCalendar, FiAlignLeft, FiMail, FiPhone,
  FiToggleLeft, FiMoreVertical
} from 'react-icons/fi';
import { toast } from 'sonner';
import api from '../config/api';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import './CustomDatabaseView.css';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
const initials = n => !n ? '?' : n.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
const iconSrc = f => f ? `${API_BASE}/custom-databases/icon/${f}` : null;

// Field types available for the Settings panel
const FIELD_TYPES = [
  { value: 'text',      label: 'Short Text', Icon: FiType },
  { value: 'textarea',  label: 'Long Text',  Icon: FiAlignLeft },
  { value: 'number',    label: 'Number',     Icon: FiHash },
  { value: 'email',     label: 'Email',      Icon: FiMail },
  { value: 'phone',     label: 'Phone',      Icon: FiPhone },
  { value: 'url',       label: 'URL',        Icon: FiLink },
  { value: 'date',      label: 'Date',       Icon: FiCalendar },
  { value: 'boolean',   label: 'Yes / No',   Icon: FiToggleLeft },
];
function typeLabel(v) { return FIELD_TYPES.find(t => t.value === v)?.label || v; }
function typeIcon(v) { const t = FIELD_TYPES.find(x => x.value === v); return t ? <t.Icon size={13} /> : <FiType size={13} />; }

// ── Add / Edit Record modal ───────────────────────────────────────────────────
function RecordModal({ fields, record, onSave, onClose }) {
  const [form, setForm] = useState(() => {
    const init = {};
    fields.forEach(f => { init[f._id] = record?.cells?.[f._id] ?? ''; });
    return init;
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async e => {
    e.preventDefault();
    setSaving(true);
    try { await onSave(form); onClose(); }
    finally { setSaving(false); }
  };

  // Title = value of the first field (the "name" field)
  const titleField = fields[0];

  return (
    <div className="cdb-modal-backdrop" onClick={onClose}>
      <div className="cdb-rec-modal" onClick={e => e.stopPropagation()}>
        <div className="cdb-modal-header">
          <h3>{record ? `Edit record` : 'Add new record'}</h3>
          <button className="cdb-modal-close" onClick={onClose}><FiX /></button>
        </div>
        <form className="cdb-rec-form" onSubmit={handleSubmit}>
          <div className="cdb-rec-fields">
            {fields.map(f => (
              <div key={f._id} className="cdb-rec-field">
                <label className="cdb-rec-label">
                  {f.name}
                  {f.required && <span className="cdb-req">*</span>}
                </label>
                {f.type === 'textarea' ? (
                  <textarea
                    className="cdb-rec-textarea"
                    rows={3}
                    placeholder={f.placeholder || ''}
                    value={form[f._id] || ''}
                    onChange={e => setForm(p => ({ ...p, [f._id]: e.target.value }))}
                    required={f.required}
                  />
                ) : f.type === 'boolean' ? (
                  <div className="cdb-rec-bool-row">
                    {['Yes', 'No'].map(opt => (
                      <button key={opt} type="button"
                        className={`cdb-rec-bool-btn${form[f._id] === opt ? ' active' : ''}`}
                        onClick={() => setForm(p => ({ ...p, [f._id]: opt }))}>
                        {opt}
                      </button>
                    ))}
                  </div>
                ) : (
                  <input
                    className="cdb-rec-input"
                    type={f.type === 'email' ? 'email' : f.type === 'number' ? 'number' : f.type === 'date' ? 'date' : f.type === 'url' ? 'url' : 'text'}
                    placeholder={f.placeholder || ''}
                    value={form[f._id] || ''}
                    onChange={e => setForm(p => ({ ...p, [f._id]: e.target.value }))}
                    required={f.required}
                    autoFocus={f._id === titleField?._id}
                  />
                )}
              </div>
            ))}
          </div>
          <div className="cdb-modal-footer">
            <button type="button" className="cdb-btn-outline" onClick={onClose}>Cancel</button>
            <button type="submit" className="cdb-btn-primary" disabled={saving || !form[titleField?._id]}>
              {saving ? 'Saving…' : record ? 'Save changes' : 'Add record'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Record card (Data Center style) ──────────────────────────────────────────
function RecordCard({ record, fields, onEdit, onDelete }) {
  const [expanded, setExpanded] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef();

  const titleField = fields[0];
  const metaFields = fields.slice(1, 4);   // show up to 3 in the header
  const extraFields = fields.slice(4);      // rest shown when expanded

  const val = fid => record.cells?.[fid] ?? '';

  useEffect(() => {
    if (!menuOpen) return;
    const h = e => { if (!menuRef.current?.contains(e.target)) setMenuOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [menuOpen]);

  return (
    <div className={`cdb-card${expanded ? ' cdb-card-expanded-state' : ''}`}>
      {/* Card header */}
      <div className="cdb-card-header" onClick={() => setExpanded(e => !e)}>
        <div className="cdb-card-expand-icon">
          {expanded ? <FiChevronDown size={15} /> : <FiChevronRight size={15} />}
        </div>
        <div className="cdb-card-info">
          <h3 className="cdb-card-title">{val(titleField?._id) || <span className="cdb-card-untitled">Untitled</span>}</h3>
          <div className="cdb-card-meta">
            {metaFields.map(f => val(f._id) ? (
              <span key={f._id} className="cdb-card-meta-pill">
                {typeIcon(f.type)} {val(f._id)}
              </span>
            ) : null)}
          </div>
        </div>
        <div className="cdb-card-actions" onClick={e => e.stopPropagation()} ref={menuRef}>
          <button className="cdb-card-menu-btn" onClick={() => setMenuOpen(o => !o)}>
            <FiMoreVertical size={15} />
          </button>
          {menuOpen && (
            <div className="cdb-card-menu">
              <button className="cdb-card-menu-item" onClick={() => { setMenuOpen(false); onEdit(record); }}>
                <FiEdit2 size={13} /> Edit
              </button>
              <button className="cdb-card-menu-item cdb-card-menu-danger" onClick={() => { setMenuOpen(false); onDelete(record._id); }}>
                <FiTrash2 size={13} /> Delete
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div className="cdb-card-detail">
          <div className="cdb-card-detail-grid">
            {fields.map(f => {
              const v = val(f._id);
              if (!v) return null;
              return (
                <div key={f._id} className="cdb-card-detail-item">
                  <span className="cdb-card-detail-label">{f.name}</span>
                  <span className="cdb-card-detail-value">
                    {f.type === 'url'
                      ? <a href={v} target="_blank" rel="noopener noreferrer">{v}</a>
                      : f.type === 'boolean'
                      ? <span className={`cdb-bool-badge cdb-bool-${v.toLowerCase()}`}>{v}</span>
                      : v}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Settings Panel ────────────────────────────────────────────────────────────
function SettingsPanel({ dbId, dbName, fields, onChange, onDeleted }) {
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [newType, setNewType] = useState('text');
  const [newRequired, setNewRequired] = useState(false);
  const [newPlaceholder, setNewPlaceholder] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editDraft, setEditDraft] = useState({});
  const [showDeleteDb, setShowDeleteDb] = useState(false);
  const [confirmName, setConfirmName] = useState('');
  const [deleting, setDeleting] = useState(false);

  const addField = async e => {
    e.preventDefault();
    if (!newName.trim()) return;
    try {
      const res = await api.post(`/custom-databases/${dbId}/columns`, {
        name: newName.trim(), type: newType, required: newRequired, placeholder: newPlaceholder.trim(),
      });
      onChange(res.data.columns);
      setNewName(''); setNewType('text'); setNewRequired(false); setNewPlaceholder(''); setAdding(false);
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to add field'); }
  };

  const startEdit = f => { setEditingId(f._id); setEditDraft({ name: f.name, type: f.type, required: !!f.required, placeholder: f.placeholder || '' }); };

  const saveEdit = async fid => {
    try {
      const res = await api.put(`/custom-databases/${dbId}/columns/${fid}`, editDraft);
      onChange(res.data.columns);
      setEditingId(null);
    } catch { toast.error('Failed to update field'); }
  };

  const deleteField = async fid => {
    if (!window.confirm('Delete this field? All data in it will be lost.')) return;
    try {
      const res = await api.delete(`/custom-databases/${dbId}/columns/${fid}`);
      onChange(res.data.columns);
    } catch { toast.error('Failed to delete field'); }
  };

  const handleDeleteDb = async () => {
    if (confirmName.trim() !== dbName.trim()) { toast.error('Name does not match'); return; }
    setDeleting(true);
    try {
      await api.delete(`/custom-databases/${dbId}`);
      toast.success('Database deleted');
      onDeleted?.();
    } catch { toast.error('Failed to delete database'); }
    finally { setDeleting(false); }
  };

  return (
    <div className="cdb-settings">
      <div className="cdb-settings-header">
        <div>
          <h2>Fields</h2>
          <p>Define what information each record stores. The first field is the record's title.</p>
        </div>
        <button className="cdb-add-row-btn" onClick={() => setAdding(true)}><FiPlus size={14} /> Add field</button>
      </div>

      {/* Existing fields */}
      <div className="cdb-field-list">
        {fields.length === 0 && (
          <div className="cdb-settings-empty">
            <FiDatabase size={28} />
            <p>No fields yet. Add your first field to get started.</p>
          </div>
        )}
        {fields.map((f, idx) => (
          <div key={f._id} className="cdb-field-row">
            <div className="cdb-field-drag"><FiMenu size={14} /></div>
            {editingId === f._id ? (
              <div className="cdb-field-edit">
                <input className="cdb-field-edit-input" value={editDraft.name} onChange={e => setEditDraft(p => ({ ...p, name: e.target.value }))} placeholder="Field name" />
                <select className="cdb-field-edit-select" value={editDraft.type} onChange={e => setEditDraft(p => ({ ...p, type: e.target.value }))}>
                  {FIELD_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
                <input className="cdb-field-edit-input cdb-field-placeholder-input" value={editDraft.placeholder} onChange={e => setEditDraft(p => ({ ...p, placeholder: e.target.value }))} placeholder="Placeholder (optional)" />
                <label className="cdb-field-req-check">
                  <input type="checkbox" checked={editDraft.required} onChange={e => setEditDraft(p => ({ ...p, required: e.target.checked }))} /> Required
                </label>
                <button className="cdb-inline-save" onClick={() => saveEdit(f._id)}><FiCheck size={13} /></button>
                <button className="cdb-inline-cancel" onClick={() => setEditingId(null)}><FiX size={13} /></button>
              </div>
            ) : (
              <>
                <div className="cdb-field-icon">{typeIcon(f.type)}</div>
                <div className="cdb-field-info">
                  <span className="cdb-field-name">
                    {f.name}
                    {idx === 0 && <span className="cdb-field-badge">Title</span>}
                    {f.required && <span className="cdb-field-badge cdb-field-badge-req">Required</span>}
                  </span>
                  <span className="cdb-field-type">{typeLabel(f.type)}</span>
                  {f.placeholder && <span className="cdb-field-ph">· "{f.placeholder}"</span>}
                </div>
                <div className="cdb-field-row-actions">
                  <button className="cdb-field-action-btn" onClick={() => startEdit(f)}><FiEdit2 size={13} /></button>
                  <button className="cdb-field-action-btn cdb-field-del-btn" onClick={() => deleteField(f._id)} disabled={idx === 0} title={idx === 0 ? 'Title field cannot be deleted' : 'Delete field'}>
                    <FiTrash2 size={13} />
                  </button>
                </div>
              </>
            )}
          </div>
        ))}
      </div>

      {/* Add field form */}
      {adding && (
        <div className="cdb-modal-backdrop" onClick={() => setAdding(false)}>
          <div className="cdb-rec-modal" onClick={e => e.stopPropagation()}>
            <div className="cdb-modal-header">
              <h3>Add field</h3>
              <button className="cdb-modal-close" onClick={() => setAdding(false)}><FiX /></button>
            </div>
            <form className="cdb-rec-form" onSubmit={addField}>
              <div className="cdb-rec-fields">
                <div className="cdb-rec-field">
                  <label className="cdb-rec-label">Field name <span className="cdb-req">*</span></label>
                  <input autoFocus className="cdb-rec-input" placeholder="e.g. Company Name" value={newName} onChange={e => setNewName(e.target.value)} required />
                </div>
                <div className="cdb-rec-field">
                  <label className="cdb-rec-label">Type</label>
                  <div className="cdb-field-type-grid">
                    {FIELD_TYPES.map(t => (
                      <button key={t.value} type="button"
                        className={`cdb-field-type-tile${newType === t.value ? ' active' : ''}`}
                        onClick={() => setNewType(t.value)}>
                        <t.Icon size={16} />
                        <span>{t.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
                <div className="cdb-rec-field">
                  <label className="cdb-rec-label">Placeholder</label>
                  <input className="cdb-rec-input" placeholder="e.g. Enter company name…" value={newPlaceholder} onChange={e => setNewPlaceholder(e.target.value)} />
                </div>
                <div className="cdb-rec-field cdb-rec-field-inline">
                  <label className="cdb-req-label">
                    <input type="checkbox" checked={newRequired} onChange={e => setNewRequired(e.target.checked)} />
                    Mark as required
                  </label>
                </div>
              </div>
              <div className="cdb-modal-footer">
                <button type="button" className="cdb-btn-outline" onClick={() => setAdding(false)}>Cancel</button>
                <button type="submit" className="cdb-btn-primary" disabled={!newName.trim()}>Add field</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Danger Zone ──────────────────────────────────────────────────────── */}
      <div className="cdb-danger-zone">
        <div className="cdb-danger-header">
          <div>
            <h3>Danger Zone</h3>
            <p>Permanently delete this database and all its records. This cannot be undone.</p>
          </div>
          <button className="cdb-danger-btn" onClick={() => setShowDeleteDb(true)}>
            <FiTrash2 size={13} /> Delete Database
          </button>
        </div>
      </div>

      {/* Delete confirmation modal */}
      {showDeleteDb && (
        <div className="cdb-modal-backdrop" onClick={() => { setShowDeleteDb(false); setConfirmName(''); }}>
          <div className="cdb-rec-modal cdb-delete-modal" onClick={e => e.stopPropagation()}>
            <div className="cdb-modal-header">
              <h3>Delete Database</h3>
              <button className="cdb-modal-close" onClick={() => { setShowDeleteDb(false); setConfirmName(''); }}><FiX /></button>
            </div>
            <div className="cdb-rec-fields">
              <div className="cdb-delete-warning">
                <FiTrash2 size={22} />
                <div>
                  <strong>This will permanently delete:</strong>
                  <ul>
                    <li>The database <em>"{dbName}"</em></li>
                    <li>All {fields.length} field definitions</li>
                    <li>All records stored in it</li>
                    <li>Its entry in the sidebar</li>
                  </ul>
                </div>
              </div>
              <div className="cdb-rec-field">
                <label className="cdb-rec-label">
                  Type <strong>{dbName}</strong> to confirm
                </label>
                <input
                  autoFocus
                  className="cdb-rec-input cdb-delete-confirm-input"
                  placeholder={dbName}
                  value={confirmName}
                  onChange={e => setConfirmName(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && confirmName.trim() === dbName.trim()) handleDeleteDb(); }}
                />
              </div>
            </div>
            <div className="cdb-modal-footer">
              <button className="cdb-btn-outline" onClick={() => { setShowDeleteDb(false); setConfirmName(''); }}>Cancel</button>
              <button
                className="cdb-btn-danger"
                disabled={confirmName.trim() !== dbName.trim() || deleting}
                onClick={handleDeleteDb}
              >
                {deleting ? 'Deleting…' : 'Yes, delete everything'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main view ─────────────────────────────────────────────────────────────────
function CustomDatabaseView({ db, companyUsers, onUpdated, onDeleted }) {
  const [tab, setTab] = useState('records');   // 'records' | 'settings'
  const [rows, setRows] = useState([]);
  const [columns, setColumns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [editRecord, setEditRecord] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      const res = await api.get(`/custom-databases/${db._id}/rows`);
      setRows(res.data.rows || []);
      setColumns(res.data.columns || []);
    } catch { toast.error('Failed to load records'); }
    finally { setLoading(false); }
  }, [db._id]);

  useEffect(() => { setLoading(true); fetchData(); }, [fetchData]);

  // Filter records by search across all fields
  const filtered = rows.filter(r => {
    if (!search) return true;
    return columns.some(c => String(r.cells?.[c._id] || '').toLowerCase().includes(search.toLowerCase()));
  });

  // Add record
  const handleAddRecord = async cells => {
    const res = await api.post(`/custom-databases/${db._id}/rows`, { cells });
    setRows(prev => [...prev, res.data.row]);
    toast.success('Record added');
  };

  // Edit record
  const handleEditRecord = async cells => {
    const res = await api.put(`/custom-databases/${db._id}/rows/${editRecord._id}`, { cells });
    setRows(prev => prev.map(r => r._id === editRecord._id ? res.data.row : r));
    toast.success('Record updated');
  };

  // Delete record
  const handleDelete = async rowId => {
    if (!window.confirm('Delete this record?')) return;
    await api.delete(`/custom-databases/${db._id}/rows/${rowId}`);
    setRows(prev => prev.filter(r => r._id !== rowId));
    toast.success('Record deleted');
  };

  return (
    <div className="cdb-view">
      {/* Header */}
      <div className="cdb-view-header">
        <div className="cdb-view-title">
          {db.icon
            ? <img src={iconSrc(db.icon)} alt={db.name} className="cdb-view-icon" />
            : <div className="cdb-view-icon-placeholder">📋</div>}
          <div>
            <h1>{db.name}</h1>
            <p>{rows.length} {rows.length === 1 ? 'record' : 'records'} · {columns.length} {columns.length === 1 ? 'field' : 'fields'}</p>
          </div>
        </div>
        <div className="cdb-view-actions">
          {tab === 'records' && (
            <button className="cdb-add-row-btn" onClick={() => {
              if (columns.length === 0) { setTab('settings'); toast('Add at least one field first'); return; }
              setShowAdd(true);
            }}>
              <FiPlus size={14} /> Add new
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="cdb-tabs">
        <button className={`cdb-tab${tab === 'records' ? ' active' : ''}`} onClick={() => setTab('records')}>
          <FiDatabase size={13} /> Records
        </button>
        <button className={`cdb-tab${tab === 'settings' ? ' active' : ''}`} onClick={() => setTab('settings')}>
          <FiSettings size={13} /> Settings
        </button>
      </div>

      {/* Records tab */}
      {tab === 'records' && (
        <>
          {/* Search */}
          <div className="cdb-search-bar">
            <FiSearch size={15} className="cdb-search-icon" />
            <input className="cdb-search-input" placeholder="Search records…" value={search} onChange={e => setSearch(e.target.value)} />
            {search && <button className="cdb-search-clear" onClick={() => setSearch('')}><FiX size={13} /></button>}
          </div>

          {/* Records list */}
          <div className="cdb-records-wrap">
            {columns.length === 0 ? (
              <div className="cdb-onboarding">
                <div className="cdb-onboarding-icon">🗂️</div>
                <h3>Set up your fields first</h3>
                <p>Go to <strong>Settings</strong> to define what information you want to track in each record.</p>
                <button className="cdb-btn-primary" onClick={() => setTab('settings')}><FiSettings size={14} /> Go to Settings</button>
              </div>
            ) : loading ? (
              [...Array(4)].map((_, i) => <div key={i} className="cdb-card cdb-card-skeleton"><div className="cdb-skel" style={{ width: `${40 + i * 12}%`, height: 16 }} /><div className="cdb-skel" style={{ width: '60%', height: 12, marginTop: 8 }} /></div>)
            ) : filtered.length === 0 ? (
              <div className="cdb-empty-state">
                <span className="cdb-empty-icon">{search ? '🔍' : '📭'}</span>
                <strong>{search ? 'No records match' : 'No records yet'}</strong>
                {!search && <p>Click "Add new" to create your first record</p>}
              </div>
            ) : (
              filtered.map(row => (
                <RecordCard key={row._id} record={row} fields={columns}
                  onEdit={r => setEditRecord(r)}
                  onDelete={handleDelete} />
              ))
            )}
          </div>
        </>
      )}

      {/* Settings tab */}
      {tab === 'settings' && (
        <div className="cdb-settings-wrap">
          <SettingsPanel dbId={db._id} dbName={db.name} fields={columns} onChange={newCols => setColumns(newCols)} onDeleted={onDeleted} />
        </div>
      )}

      {/* Add record modal */}
      {showAdd && (
        <RecordModal
          fields={columns}
          onSave={handleAddRecord}
          onClose={() => setShowAdd(false)}
        />
      )}

      {/* Edit record modal */}
      {editRecord && (
        <RecordModal
          fields={columns}
          record={editRecord}
          onSave={handleEditRecord}
          onClose={() => setEditRecord(null)}
        />
      )}
    </div>
  );
}

export default CustomDatabaseView;
