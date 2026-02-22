import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  FiSearch, FiEdit3, FiUser, FiMail, FiPhone, FiMapPin,
  FiCalendar, FiActivity, FiDownload, FiX,
  FiChevronRight, FiBriefcase, FiGlobe, FiFileText,
  FiStar, FiTag, FiPlus, FiCheck, FiTrash2, FiFilter
} from 'react-icons/fi';
import { toast } from 'sonner';
import api from '../config/api';
import './ClientLeads.css';

const STATUS_OPTIONS = ['Cold Lead', 'Warm Lead', 'Qualified (SQL)', 'Active', 'Dead Lead'];
const STATUS_COLORS = {
  'Cold Lead': { bg: '#dbeafe', color: '#1d4ed8' },
  'Warm Lead': { bg: '#fef3c7', color: '#b45309' },
  'Qualified (SQL)': { bg: '#dcfce7', color: '#15803d' },
  'Active': { bg: '#f3e8ff', color: '#7c3aed' },
  'Dead Lead': { bg: '#fee2e2', color: '#dc2626' }
};

const LABEL_COLORS = [
  '#6b7280', '#ef4444', '#f59e0b', '#10b981', '#3b82f6',
  '#8b5cf6', '#ec4899', '#14b8a6', '#f97316', '#6366f1'
];

function ClientLeads() {
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');
  const [filterImportant, setFilterImportant] = useState(false);
  const [filterLabelId, setFilterLabelId] = useState('');
  const [showSidePanel, setShowSidePanel] = useState(false);
  const [selectedContact, setSelectedContact] = useState(null);

  // Labels
  const [labels, setLabels] = useState([]);
  const [showLabelManager, setShowLabelManager] = useState(false);
  const [newLabelName, setNewLabelName] = useState('');
  const [newLabelColor, setNewLabelColor] = useState('#6b7280');
  const [editingLabelId, setEditingLabelId] = useState(null);
  const [editLabelName, setEditLabelName] = useState('');
  const [editLabelColor, setEditLabelColor] = useState('');

  // Fetch labels
  const fetchLabels = useCallback(async () => {
    try {
      const res = await api.get('/contact-labels');
      setLabels(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error('Error fetching labels:', err);
    }
  }, []);

  // Fetch contacts from backend
  const fetchContacts = useCallback(async () => {
    try {
      setLoading(true);
      const params = {};
      if (filterStatus !== 'All') params.status = filterStatus;
      if (searchTerm) params.search = searchTerm;
      if (filterImportant) params.important = 'true';
      if (filterLabelId) params.labelId = filterLabelId;

      const response = await api.get('/contacts', { params });
      const data = Array.isArray(response.data) ? response.data : [];
      setContacts(data);
    } catch (error) {
      console.error('Error fetching contacts:', error);
      toast.error('Failed to load contacts');
      setContacts([]);
    } finally {
      setLoading(false);
    }
  }, [filterStatus, searchTerm, filterImportant, filterLabelId]);

  useEffect(() => { fetchLabels(); }, [fetchLabels]);
  useEffect(() => { fetchContacts(); }, [fetchContacts]);

  // Stats
  const stats = {
    total: contacts.length,
    cold: contacts.filter(c => c.status === 'Cold Lead').length,
    warm: contacts.filter(c => c.status === 'Warm Lead').length,
    qualified: contacts.filter(c => c.status === 'Qualified (SQL)').length,
    active: contacts.filter(c => c.status === 'Active').length,
    dead: contacts.filter(c => c.status === 'Dead Lead').length,
    important: contacts.filter(c => c.isImportant).length
  };

  // Toggle important
  const handleToggleImportant = async (contact, e) => {
    if (e) e.stopPropagation();
    try {
      const res = await api.patch(`/contacts/${contact.exhibitorId}/${contact.contactIndex}/important`);
      const newVal = res.data.isImportant;
      setContacts(prev => prev.map(c => c._id === contact._id ? { ...c, isImportant: newVal } : c));
      if (selectedContact?._id === contact._id) setSelectedContact(prev => ({ ...prev, isImportant: newVal }));
      toast.success(newVal ? 'Marked as important' : 'Removed from important');
    } catch (error) {
      console.error('Error toggling important:', error);
      toast.error('Failed to update');
    }
  };

  // Add/remove label on a contact
  const handleContactLabel = async (contact, labelId, action) => {
    try {
      const res = await api.patch(`/contacts/${contact.exhibitorId}/${contact.contactIndex}/labels`, { labelId, action });
      const newLabels = res.data.labels;
      setContacts(prev => prev.map(c => c._id === contact._id ? { ...c, labels: newLabels } : c));
      if (selectedContact?._id === contact._id) setSelectedContact(prev => ({ ...prev, labels: newLabels }));
      toast.success(action === 'add' ? 'Label added' : 'Label removed');
    } catch (error) {
      console.error('Error updating label:', error);
      toast.error('Failed to update label');
    }
  };

  // Update contact status
  const handleStatusChange = async (contact, newStatus) => {
    try {
      const response = await api.patch(
        `/contacts/${contact.exhibitorId}/${contact.contactIndex}/status`,
        { status: newStatus }
      );
      setContacts(contacts.map(c => c._id === contact._id ? { ...c, ...response.data } : c));
      if (selectedContact?._id === contact._id) setSelectedContact({ ...selectedContact, ...response.data });
      toast.success('Status updated');
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Failed to update status');
    }
  };

  // Update contact follow-up
  const handleFollowUpChange = async (contact, followUp) => {
    try {
      const response = await api.patch(
        `/contacts/${contact.exhibitorId}/${contact.contactIndex}/status`,
        { followUp }
      );
      setContacts(contacts.map(c => c._id === contact._id ? { ...c, ...response.data } : c));
      if (selectedContact?._id === contact._id) setSelectedContact({ ...selectedContact, ...response.data });
      toast.success('Follow-up updated');
    } catch (error) {
      console.error('Error updating follow-up:', error);
      toast.error('Failed to update follow-up');
    }
  };

  // Label CRUD
  const handleCreateLabel = async () => {
    if (!newLabelName.trim()) return;
    try {
      const res = await api.post('/contact-labels', { name: newLabelName.trim(), color: newLabelColor });
      setLabels(prev => [...prev, res.data]);
      setNewLabelName('');
      setNewLabelColor('#6b7280');
      toast.success('Label created');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error creating label');
    }
  };

  const handleUpdateLabel = async (id) => {
    if (!editLabelName.trim()) return;
    try {
      const res = await api.put(`/contact-labels/${id}`, { name: editLabelName.trim(), color: editLabelColor });
      setLabels(prev => prev.map(l => l._id === id ? res.data : l));
      setEditingLabelId(null);
      toast.success('Label updated');
      fetchContacts();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error updating label');
    }
  };

  const handleDeleteLabel = async (id) => {
    if (!window.confirm('Delete this label? It will be removed from all contacts.')) return;
    try {
      await api.delete(`/contact-labels/${id}`);
      setLabels(prev => prev.filter(l => l._id !== id));
      if (filterLabelId === id) setFilterLabelId('');
      toast.success('Label deleted');
      fetchContacts();
    } catch (err) {
      toast.error('Error deleting label');
    }
  };

  // CSV Export
  const handleExport = () => {
    const csvContent = [
      ['Contact Name', 'Company', 'Trade Show', 'Email', 'Phone', 'Designation', 'Location', 'Status', 'Follow-Up', 'Important', 'Labels'],
      ...contacts.map(c => [
        c.fullName, c.companyName, c.tradeShowName || '', c.email, c.phone || '',
        c.designation || '', c.location || '', c.status, c.followUp || '',
        c.isImportant ? 'Yes' : 'No',
        (c.labels || []).map(l => l.name).join('; ')
      ])
    ].map(row => row.map(f => `"${(f || '').replace(/"/g, '""')}"`).join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `contacts_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    toast.success('Contacts exported');
  };

  // Open contact detail
  const handleContactClick = (contact) => {
    setSelectedContact(contact);
    setShowSidePanel(true);
  };

  const getStatusStyle = (status) => STATUS_COLORS[status] || { bg: '#f5f5f5', color: '#525252' };

  const activeFiltersCount = (filterStatus !== 'All' ? 1 : 0) + (filterImportant ? 1 : 0) + (filterLabelId ? 1 : 0);

  const clearAllFilters = () => {
    setFilterStatus('All');
    setFilterImportant(false);
    setFilterLabelId('');
  };

  return (
    <div className="cl-container">
      {/* Header */}
      <div className="cl-header">
        <div>
          <h1 className="cl-title">Contacts</h1>
          <p className="cl-subtitle">Exhibitor contacts from your trade shows</p>
        </div>
        <div className="cl-header-actions">
          <button className="cl-btn-outline" onClick={() => setShowLabelManager(!showLabelManager)}>
            <FiTag /> Labels
          </button>
          <button className="cl-btn-outline" onClick={handleExport}>
            <FiDownload /> Export
          </button>
        </div>
      </div>

      {/* Label Manager Panel */}
      {showLabelManager && (
        <div className="cl-label-manager">
          <div className="cl-label-manager-head">
            <h3><FiTag /> Manage Labels</h3>
            <button className="cl-label-close" onClick={() => setShowLabelManager(false)}><FiX size={14} /></button>
          </div>

          {/* Create label */}
          <div className="cl-label-create-row">
            <input
              className="cl-label-input"
              placeholder="New label name..."
              value={newLabelName}
              onChange={e => setNewLabelName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleCreateLabel(); }}
              maxLength={50}
            />
            <div className="cl-label-color-picker">
              {LABEL_COLORS.map(c => (
                <button
                  key={c}
                  className={`cl-color-dot ${newLabelColor === c ? 'active' : ''}`}
                  style={{ background: c }}
                  onClick={() => setNewLabelColor(c)}
                />
              ))}
            </div>
            <button className="cl-btn-primary cl-btn-sm" onClick={handleCreateLabel} disabled={!newLabelName.trim()}>
              <FiPlus /> Create
            </button>
          </div>

          {/* Existing labels */}
          <div className="cl-label-list">
            {labels.length === 0 ? (
              <p className="cl-label-empty">No labels yet. Create one above.</p>
            ) : labels.map(label => (
              <div key={label._id} className="cl-label-item">
                {editingLabelId === label._id ? (
                  <div className="cl-label-edit-row">
                    <input
                      className="cl-label-input"
                      value={editLabelName}
                      onChange={e => setEditLabelName(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') handleUpdateLabel(label._id); }}
                    />
                    <div className="cl-label-color-picker">
                      {LABEL_COLORS.map(c => (
                        <button
                          key={c}
                          className={`cl-color-dot ${editLabelColor === c ? 'active' : ''}`}
                          style={{ background: c }}
                          onClick={() => setEditLabelColor(c)}
                        />
                      ))}
                    </div>
                    <button className="cl-label-action-btn" onClick={() => handleUpdateLabel(label._id)}><FiCheck size={13} /></button>
                    <button className="cl-label-action-btn" onClick={() => setEditingLabelId(null)}><FiX size={13} /></button>
                  </div>
                ) : (
                  <div className="cl-label-display">
                    <span className="cl-label-badge" style={{ background: label.color + '1a', color: label.color, borderColor: label.color + '40' }}>
                      <span className="cl-label-dot" style={{ background: label.color }} />
                      {label.name}
                    </span>
                    <div className="cl-label-actions">
                      <button className="cl-label-action-btn" onClick={() => { setEditingLabelId(label._id); setEditLabelName(label.name); setEditLabelColor(label.color); }}><FiEdit3 size={12} /></button>
                      <button className="cl-label-action-btn cl-label-del" onClick={() => handleDeleteLabel(label._id)}><FiTrash2 size={12} /></button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="cl-stats-grid">
        <div className="cl-stat-card">
          <div className="cl-stat-icon" style={{ background: '#eff6ff' }}>
            <FiUser style={{ color: '#3b82f6' }} />
          </div>
          <div className="cl-stat-info">
            <span className="cl-stat-number">{stats.total}</span>
            <span className="cl-stat-label">Total Contacts</span>
          </div>
        </div>
        <div className="cl-stat-card">
          <div className="cl-stat-icon" style={{ background: '#dbeafe' }}>
            <FiActivity style={{ color: '#1d4ed8' }} />
          </div>
          <div className="cl-stat-info">
            <span className="cl-stat-number">{stats.cold}</span>
            <span className="cl-stat-label">Cold</span>
          </div>
        </div>
        <div className="cl-stat-card">
          <div className="cl-stat-icon" style={{ background: '#fef3c7' }}>
            <FiActivity style={{ color: '#b45309' }} />
          </div>
          <div className="cl-stat-info">
            <span className="cl-stat-number">{stats.warm}</span>
            <span className="cl-stat-label">Warm</span>
          </div>
        </div>
        <div className="cl-stat-card">
          <div className="cl-stat-icon" style={{ background: '#dcfce7' }}>
            <FiChevronRight style={{ color: '#15803d' }} />
          </div>
          <div className="cl-stat-info">
            <span className="cl-stat-number">{stats.qualified}</span>
            <span className="cl-stat-label">Qualified</span>
          </div>
        </div>
        <div className={`cl-stat-card ${filterImportant ? 'cl-stat-active' : ''}`} onClick={() => setFilterImportant(!filterImportant)} style={{ cursor: 'pointer' }}>
          <div className="cl-stat-icon" style={{ background: filterImportant ? '#fef3c7' : '#fffbeb' }}>
            <FiStar style={{ color: '#f59e0b', fill: filterImportant ? '#f59e0b' : 'none' }} />
          </div>
          <div className="cl-stat-info">
            <span className="cl-stat-number">{stats.important}</span>
            <span className="cl-stat-label">Important</span>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="cl-toolbar">
        <div className="cl-toolbar-left">
          <div className="cl-search-box">
            <FiSearch />
            <input
              type="text"
              placeholder="Search contacts..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        <div className="cl-toolbar-right">
          <select className="cl-filter-select" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
            <option value="All">All Statuses</option>
            {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>

          {/* Label filter */}
          <select className="cl-filter-select" value={filterLabelId} onChange={(e) => setFilterLabelId(e.target.value)}>
            <option value="">All Labels</option>
            {labels.map(l => <option key={l._id} value={l._id}>{l.name}</option>)}
          </select>

          {/* Important filter toggle */}
          <button
            className={`cl-btn-outline cl-btn-star ${filterImportant ? 'active' : ''}`}
            onClick={() => setFilterImportant(!filterImportant)}
            title="Filter important"
          >
            <FiStar style={{ fill: filterImportant ? '#f59e0b' : 'none', color: filterImportant ? '#f59e0b' : undefined }} />
          </button>

          {activeFiltersCount > 0 && (
            <button className="cl-clear-filters" onClick={clearAllFilters}>
              <FiX size={12} /> Clear ({activeFiltersCount})
            </button>
          )}

          <span className="cl-result-count">{contacts.length} contact{contacts.length !== 1 ? 's' : ''}</span>
        </div>
      </div>

      {/* Contacts Table */}
      <div className="cl-table-wrapper">
        {loading ? (
          <div className="cl-loading">
            <div className="cl-spinner" />
            <p>Loading contacts...</p>
          </div>
        ) : contacts.length === 0 ? (
          <div className="cl-empty">
            <FiUser size={44} />
            <h3>No Contacts Found</h3>
            <p>{searchTerm || filterStatus !== 'All' || filterImportant || filterLabelId ? 'Try adjusting your filters' : 'Contacts from exhibitors will appear here once you add them via trade shows'}</p>
            {(searchTerm || filterStatus !== 'All' || filterImportant || filterLabelId) && (
              <button className="cl-btn-outline" style={{ marginTop: 10 }} onClick={clearAllFilters}>Clear all filters</button>
            )}
          </div>
        ) : (
          <table className="cl-table">
            <thead>
              <tr>
                <th style={{ width: 40 }}></th>
                <th>Contact</th>
                <th>Company</th>
                <th>Trade Show</th>
                <th>Phone</th>
                <th>Status</th>
                <th>Labels</th>
                <th>Date</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {contacts.map(contact => {
                const style = getStatusStyle(contact.status);
                return (
                  <tr key={contact._id} onClick={() => handleContactClick(contact)}>
                    <td onClick={e => e.stopPropagation()} style={{ textAlign: 'center' }}>
                      <button
                        className={`cl-star-btn ${contact.isImportant ? 'active' : ''}`}
                        onClick={(e) => handleToggleImportant(contact, e)}
                        title={contact.isImportant ? 'Remove from important' : 'Mark as important'}
                      >
                        <FiStar />
                      </button>
                    </td>
                    <td>
                      <div className="cl-lead-cell">
                        <div className="cl-lead-avatar">
                          {(contact.fullName || '?')[0].toUpperCase()}
                        </div>
                        <div className="cl-lead-name-info">
                          <span className="cl-lead-name">{contact.fullName}</span>
                          <span className="cl-lead-email">{contact.email}</span>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className="cl-company-name">{contact.companyName}</span>
                    </td>
                    <td>
                      <span className="cl-company-name" style={{ fontSize: 12, color: '#6b7280' }}>{contact.tradeShowName || '-'}</span>
                    </td>
                    <td>
                      <div className="cl-contact-cell">
                        {contact.phone && <span><FiPhone size={12} /> {contact.phone}</span>}
                        {!contact.phone && '-'}
                      </div>
                    </td>
                    <td>
                      <span className="cl-status-badge" style={{ background: style.bg, color: style.color }}>
                        {contact.status}
                      </span>
                    </td>
                    <td onClick={e => e.stopPropagation()}>
                      <div className="cl-labels-cell">
                        {(contact.labels || []).map(l => (
                          <span key={l._id} className="cl-label-tag" style={{ background: l.color + '1a', color: l.color, borderColor: l.color + '40' }}>
                            {l.name}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td>
                      <span className="cl-date">{contact.createdAt ? new Date(contact.createdAt).toLocaleDateString() : '-'}</span>
                    </td>
                    <td>
                      <div className="cl-row-actions" onClick={e => e.stopPropagation()}>
                        <button className="cl-icon-btn" title="View" onClick={() => handleContactClick(contact)}>
                          <FiEdit3 />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Side Panel */}
      {showSidePanel && selectedContact && (
        <ContactSidePanel
          contact={selectedContact}
          labels={labels}
          onClose={() => { setShowSidePanel(false); setSelectedContact(null); }}
          onStatusChange={handleStatusChange}
          onFollowUpChange={handleFollowUpChange}
          onToggleImportant={handleToggleImportant}
          onLabelChange={handleContactLabel}
        />
      )}
    </div>
  );
}

/* ========== Contact Side Panel ========== */
function ContactSidePanel({ contact, labels, onClose, onStatusChange, onFollowUpChange, onToggleImportant, onLabelChange }) {
  const [followUpInput, setFollowUpInput] = useState(contact.followUp || '');
  const [showLabelDropdown, setShowLabelDropdown] = useState(false);
  const labelDropRef = useRef(null);

  useEffect(() => {
    setFollowUpInput(contact.followUp || '');
  }, [contact]);

  // Close label dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (labelDropRef.current && !labelDropRef.current.contains(e.target)) {
        setShowLabelDropdown(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const daysActive = contact.createdAt ? Math.max(0, Math.floor((new Date() - new Date(contact.createdAt)) / (1000 * 60 * 60 * 24))) : 0;

  const handleFollowUpSave = () => {
    if (followUpInput !== (contact.followUp || '')) {
      onFollowUpChange(contact, followUpInput);
    }
  };

  const contactLabelIds = (contact.labels || []).map(l => l._id);

  return (
    <>
      <div className="noxtm-overlay--panel" onClick={onClose} />
      <div className="cl-side-panel">
        {/* Panel Header */}
        <div className="cl-panel-header">
          <div>
            <h3>Contact Details</h3>
          </div>
          <div className="cl-panel-header-actions">
            <button
              className={`cl-panel-star-btn ${contact.isImportant ? 'active' : ''}`}
              onClick={() => onToggleImportant(contact)}
              title={contact.isImportant ? 'Remove from important' : 'Mark as important'}
            >
              <FiStar />
            </button>
            <button className="cl-panel-close" onClick={onClose}><FiX /></button>
          </div>
        </div>

        {/* Panel Content */}
        <div className="cl-panel-body">
          {/* Profile */}
          <div className="cl-panel-profile">
            <div className="cl-panel-avatar">
              {(contact.fullName || '?')[0].toUpperCase()}
            </div>
            <div className="cl-panel-profile-info">
              <h2>{contact.fullName}</h2>
              <span className="cl-panel-company">{contact.companyName}</span>
              {contact.tradeShowName && (
                <span style={{ fontSize: 12, color: '#6b7280', display: 'block', marginTop: 2 }}>{contact.tradeShowName}</span>
              )}
            </div>
          </div>

          {/* Quick Stats */}
          <div className="cl-panel-stats">
            <div className="cl-panel-stat">
              <FiActivity className="cl-panel-stat-icon" />
              <div>
                <span className="cl-panel-stat-value">{contact.status}</span>
                <span className="cl-panel-stat-label">Status</span>
              </div>
            </div>
            <div className="cl-panel-stat">
              <FiCalendar className="cl-panel-stat-icon" />
              <div>
                <span className="cl-panel-stat-value">{daysActive}d</span>
                <span className="cl-panel-stat-label">Active</span>
              </div>
            </div>
            <div className="cl-panel-stat">
              <FiFileText className="cl-panel-stat-icon" />
              <div>
                <span className="cl-panel-stat-value">{contact.followUp || '-'}</span>
                <span className="cl-panel-stat-label">Follow-Up</span>
              </div>
            </div>
          </div>

          {/* Labels */}
          <div className="cl-panel-section">
            <h4>Labels</h4>
            <div className="cl-panel-labels">
              {(contact.labels || []).map(l => (
                <span key={l._id} className="cl-label-tag cl-label-tag-removable" style={{ background: l.color + '1a', color: l.color, borderColor: l.color + '40' }}>
                  <span className="cl-label-dot" style={{ background: l.color }} />
                  {l.name}
                  <button className="cl-label-remove" onClick={() => onLabelChange(contact, l._id, 'remove')} style={{ color: l.color }}>
                    <FiX size={10} />
                  </button>
                </span>
              ))}
              <div className="cl-label-add-wrap" ref={labelDropRef}>
                <button className="cl-label-add-btn" onClick={() => setShowLabelDropdown(!showLabelDropdown)}>
                  <FiPlus size={12} /> Add Label
                </button>
                {showLabelDropdown && (
                  <div className="cl-label-dropdown">
                    {labels.filter(l => !contactLabelIds.includes(l._id)).length === 0 ? (
                      <div className="cl-label-dropdown-empty">All labels assigned</div>
                    ) : (
                      labels.filter(l => !contactLabelIds.includes(l._id)).map(l => (
                        <button
                          key={l._id}
                          className="cl-label-dropdown-item"
                          onClick={() => { onLabelChange(contact, l._id, 'add'); setShowLabelDropdown(false); }}
                        >
                          <span className="cl-label-dot" style={{ background: l.color }} />
                          {l.name}
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Status */}
          <div className="cl-panel-section">
            <h4>Status</h4>
            <div className="cl-panel-status-row">
              <select
                className="cl-edit-select"
                value={contact.status}
                onChange={e => onStatusChange(contact, e.target.value)}
                style={{ marginBottom: 8 }}
              >
                {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>

          {/* Follow-Up */}
          <div className="cl-panel-section">
            <h4>Follow-Up Note</h4>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                className="cl-edit-input"
                value={followUpInput}
                onChange={e => setFollowUpInput(e.target.value)}
                placeholder="Add follow-up note..."
                onBlur={handleFollowUpSave}
                onKeyDown={e => { if (e.key === 'Enter') handleFollowUpSave(); }}
              />
            </div>
          </div>

          {/* Contact Info */}
          <div className="cl-panel-section">
            <h4>Contact Information</h4>
            <div className="cl-panel-info-grid">
              <div className="cl-panel-info-item">
                <FiMail className="cl-panel-info-icon" />
                <div>
                  <span className="cl-panel-info-label">Email</span>
                  <span className="cl-panel-info-value">{contact.email || '-'}</span>
                </div>
              </div>
              <div className="cl-panel-info-item">
                <FiPhone className="cl-panel-info-icon" />
                <div>
                  <span className="cl-panel-info-label">Phone</span>
                  <span className="cl-panel-info-value">{contact.phone || '-'}</span>
                </div>
              </div>
              <div className="cl-panel-info-item">
                <FiBriefcase className="cl-panel-info-icon" />
                <div>
                  <span className="cl-panel-info-label">Company</span>
                  <span className="cl-panel-info-value">{contact.companyName}</span>
                </div>
              </div>
              <div className="cl-panel-info-item">
                <FiBriefcase className="cl-panel-info-icon" />
                <div>
                  <span className="cl-panel-info-label">Designation</span>
                  <span className="cl-panel-info-value">{contact.designation || '-'}</span>
                </div>
              </div>
              <div className="cl-panel-info-item">
                <FiMapPin className="cl-panel-info-icon" />
                <div>
                  <span className="cl-panel-info-label">Location</span>
                  <span className="cl-panel-info-value">{contact.location || '-'}</span>
                </div>
              </div>
              <div className="cl-panel-info-item">
                <FiCalendar className="cl-panel-info-icon" />
                <div>
                  <span className="cl-panel-info-label">Added</span>
                  <span className="cl-panel-info-value">
                    {contact.createdAt ? new Date(contact.createdAt).toLocaleDateString() : '-'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Social Links */}
          {contact.socialLinks && contact.socialLinks.length > 0 && (
            <div className="cl-panel-section">
              <h4>Social Links</h4>
              <div className="cl-panel-social">
                {contact.socialLinks.map((link, i) => (
                  <a key={i} href={link.startsWith('http') ? link : `https://${link}`} target="_blank" rel="noopener noreferrer" className="cl-social-link">
                    <FiGlobe /> {link.replace(/^https?:\/\//, '').substring(0, 30)}
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Website */}
          {contact.website && (
            <div className="cl-panel-section">
              <h4>Company Website</h4>
              <a
                href={contact.website.startsWith('http') ? contact.website : `https://${contact.website}`}
                target="_blank"
                rel="noopener noreferrer"
                className="cl-social-link"
              >
                <FiGlobe /> {contact.website}
              </a>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

export default ClientLeads;
