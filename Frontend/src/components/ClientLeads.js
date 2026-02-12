import React, { useState, useEffect, useCallback } from 'react';
import {
  FiSearch, FiEdit3, FiUser, FiPlus, FiMail, FiPhone, FiMapPin,
  FiCalendar, FiActivity, FiDownload, FiUpload, FiX, FiTrash2,
  FiChevronRight, FiBriefcase, FiGlobe, FiFileText
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

function ClientLeads() {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');
  const [showAddForm, setShowAddForm] = useState(false);
  const [showSidePanel, setShowSidePanel] = useState(false);
  const [selectedLead, setSelectedLead] = useState(null);

  const [newLead, setNewLead] = useState({
    companyName: '',
    clientName: '',
    email: '',
    phone: '',
    designation: '',
    location: '',
    requirements: ''
  });

  // Fetch leads from backend
  const fetchLeads = useCallback(async () => {
    try {
      setLoading(true);
      const params = {};
      if (filterStatus !== 'All') params.status = filterStatus;
      if (searchTerm) params.search = searchTerm;

      const response = await api.get('/leads', { params });
      // Backend returns array directly
      const data = Array.isArray(response.data) ? response.data : (response.data?.leads || response.data || []);
      setLeads(data);
    } catch (error) {
      console.error('Error fetching leads:', error);
      toast.error('Failed to load leads');
      setLeads([]);
    } finally {
      setLoading(false);
    }
  }, [filterStatus, searchTerm]);

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  // Stats
  const stats = {
    total: leads.length,
    cold: leads.filter(l => l.status === 'Cold Lead').length,
    warm: leads.filter(l => l.status === 'Warm Lead').length,
    qualified: leads.filter(l => l.status === 'Qualified (SQL)').length,
    active: leads.filter(l => l.status === 'Active').length,
    dead: leads.filter(l => l.status === 'Dead Lead').length
  };

  // Add lead
  const handleAddLead = async (e) => {
    e.preventDefault();
    if (!newLead.companyName || !newLead.clientName || !newLead.email) return;
    try {
      const response = await api.post('/leads', {
        ...newLead,
        status: 'Cold Lead'
      });
      setLeads([response.data, ...leads]);
      setNewLead({ companyName: '', clientName: '', email: '', phone: '', designation: '', location: '', requirements: '' });
      setShowAddForm(false);
      toast.success('Lead added successfully!');
    } catch (error) {
      console.error('Error adding lead:', error);
      toast.error(error.response?.data?.message || 'Failed to add lead');
    }
  };

  // Update lead status
  const handleStatusChange = async (leadId, newStatus) => {
    try {
      const response = await api.patch(`/leads/${leadId}/status`, { status: newStatus });
      setLeads(leads.map(l => l._id === leadId ? response.data : l));
      if (selectedLead?._id === leadId) setSelectedLead(response.data);
      toast.success('Status updated');
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Failed to update status');
    }
  };

  // Delete lead
  const handleDeleteLead = async (leadId) => {
    if (!window.confirm('Delete this lead? This cannot be undone.')) return;
    try {
      await api.delete(`/leads/${leadId}`);
      setLeads(leads.filter(l => l._id !== leadId));
      if (selectedLead?._id === leadId) {
        setShowSidePanel(false);
        setSelectedLead(null);
      }
      toast.success('Lead deleted');
    } catch (error) {
      console.error('Error deleting lead:', error);
      toast.error('Failed to delete lead');
    }
  };

  // Update lead (full)
  const handleUpdateLead = async (leadId, data) => {
    try {
      const response = await api.put(`/leads/${leadId}`, data);
      setLeads(leads.map(l => l._id === leadId ? response.data : l));
      setSelectedLead(response.data);
      toast.success('Lead updated');
    } catch (error) {
      console.error('Error updating lead:', error);
      toast.error('Failed to update lead');
    }
  };

  // CSV Export
  const handleExport = () => {
    const csvContent = [
      ['Company Name', 'Client Name', 'Email', 'Phone', 'Designation', 'Location', 'Status', 'Requirements'],
      ...leads.map(l => [
        l.companyName, l.clientName, l.email, l.phone || '', l.designation || '',
        l.location || '', l.status, l.requirements || ''
      ])
    ].map(row => row.map(f => `"${(f || '').replace(/"/g, '""')}"`).join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `leads_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    toast.success('Leads exported');
  };

  // CSV Import
  const handleImport = (event) => {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const lines = e.target.result.split('\n');
        const headers = lines[0].split(',').map(h => h.replace(/"/g, '').trim().toLowerCase());
        let imported = 0;

        for (const line of lines.slice(1)) {
          if (!line.trim()) continue;
          const values = line.split(',').map(v => v.replace(/"/g, '').trim());
          const row = {};
          headers.forEach((h, i) => { row[h] = values[i] || ''; });

          const leadData = {
            companyName: row['company name'] || row['companyname'] || row['company'] || '',
            clientName: row['client name'] || row['clientname'] || row['name'] || '',
            email: row['email'] || '',
            phone: row['phone'] || '',
            designation: row['designation'] || '',
            location: row['location'] || '',
            requirements: row['requirements'] || row['notes'] || '',
            status: 'Cold Lead'
          };

          if (leadData.companyName && leadData.clientName && leadData.email) {
            try {
              await api.post('/leads', leadData);
              imported++;
            } catch (err) {
              console.error('Failed to import row:', err);
            }
          }
        }

        toast.success(`${imported} leads imported`);
        fetchLeads();
      } catch (error) {
        toast.error('Error importing CSV');
        console.error('Import error:', error);
      }
    };
    reader.readAsText(file);
    event.target.value = '';
  };

  // Open lead detail
  const handleLeadClick = (lead) => {
    setSelectedLead(lead);
    setShowSidePanel(true);
  };

  const getStatusStyle = (status) => STATUS_COLORS[status] || { bg: '#f5f5f5', color: '#525252' };

  return (
    <div className="cl-container">
      {/* Header */}
      <div className="cl-header">
        <div>
          <h1 className="cl-title">Client Leads</h1>
          <p className="cl-subtitle">Track, manage and convert your leads pipeline</p>
        </div>
        <div className="cl-header-actions">
          <button className="cl-btn-outline" onClick={handleExport}>
            <FiDownload /> Export
          </button>
          <label className="cl-btn-outline cl-import-label">
            <FiUpload /> Import
            <input type="file" accept=".csv" onChange={handleImport} hidden />
          </label>
          <button className="cl-btn-primary" onClick={() => setShowAddForm(true)}>
            <FiPlus /> Add Lead
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="cl-stats-grid">
        <div className="cl-stat-card">
          <div className="cl-stat-icon" style={{ background: '#eff6ff' }}>
            <FiUser style={{ color: '#3b82f6' }} />
          </div>
          <div className="cl-stat-info">
            <span className="cl-stat-number">{stats.total}</span>
            <span className="cl-stat-label">Total Leads</span>
          </div>
        </div>
        <div className="cl-stat-card">
          <div className="cl-stat-icon" style={{ background: '#dbeafe' }}>
            <FiActivity style={{ color: '#1d4ed8' }} />
          </div>
          <div className="cl-stat-info">
            <span className="cl-stat-number">{stats.cold}</span>
            <span className="cl-stat-label">Cold Leads</span>
          </div>
        </div>
        <div className="cl-stat-card">
          <div className="cl-stat-icon" style={{ background: '#fef3c7' }}>
            <FiActivity style={{ color: '#b45309' }} />
          </div>
          <div className="cl-stat-info">
            <span className="cl-stat-number">{stats.warm}</span>
            <span className="cl-stat-label">Warm Leads</span>
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
        <div className="cl-stat-card">
          <div className="cl-stat-icon" style={{ background: '#f3e8ff' }}>
            <FiBriefcase style={{ color: '#7c3aed' }} />
          </div>
          <div className="cl-stat-info">
            <span className="cl-stat-number">{stats.active}</span>
            <span className="cl-stat-label">Active</span>
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
              placeholder="Search leads..."
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
          <span className="cl-result-count">{leads.length} lead{leads.length !== 1 ? 's' : ''}</span>
        </div>
      </div>

      {/* Add Lead Form */}
      {showAddForm && (
        <div className="noxtm-overlay" onClick={() => setShowAddForm(false)}>
          <div className="cl-modal" onClick={e => e.stopPropagation()}>
            <div className="cl-modal-header">
              <h2>Add New Lead</h2>
              <button className="cl-modal-close" onClick={() => setShowAddForm(false)}><FiX /></button>
            </div>
            <form onSubmit={handleAddLead} className="cl-modal-form">
              <div className="cl-form-row">
                <div className="cl-form-group">
                  <label>Company Name <span className="cl-req">*</span></label>
                  <input type="text" required placeholder="e.g. Acme Corp" value={newLead.companyName}
                    onChange={e => setNewLead({ ...newLead, companyName: e.target.value })} />
                </div>
                <div className="cl-form-group">
                  <label>Client Name <span className="cl-req">*</span></label>
                  <input type="text" required placeholder="e.g. John Smith" value={newLead.clientName}
                    onChange={e => setNewLead({ ...newLead, clientName: e.target.value })} />
                </div>
              </div>
              <div className="cl-form-row">
                <div className="cl-form-group">
                  <label>Email <span className="cl-req">*</span></label>
                  <input type="email" required placeholder="john@acme.com" value={newLead.email}
                    onChange={e => setNewLead({ ...newLead, email: e.target.value })} />
                </div>
                <div className="cl-form-group">
                  <label>Phone</label>
                  <input type="tel" placeholder="+1-555-0123" value={newLead.phone}
                    onChange={e => setNewLead({ ...newLead, phone: e.target.value })} />
                </div>
              </div>
              <div className="cl-form-row">
                <div className="cl-form-group">
                  <label>Designation</label>
                  <input type="text" placeholder="e.g. CTO" value={newLead.designation}
                    onChange={e => setNewLead({ ...newLead, designation: e.target.value })} />
                </div>
                <div className="cl-form-group">
                  <label>Location</label>
                  <input type="text" placeholder="e.g. New York" value={newLead.location}
                    onChange={e => setNewLead({ ...newLead, location: e.target.value })} />
                </div>
              </div>
              <div className="cl-form-group">
                <label>Requirements</label>
                <textarea rows="3" placeholder="Describe what the lead needs..."
                  value={newLead.requirements}
                  onChange={e => setNewLead({ ...newLead, requirements: e.target.value })} />
              </div>
              <div className="cl-modal-actions">
                <button type="button" className="cl-btn-cancel" onClick={() => setShowAddForm(false)}>Cancel</button>
                <button type="submit" className="cl-btn-submit">Add Lead</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Leads Table */}
      <div className="cl-table-wrapper">
        {loading ? (
          <div className="cl-loading">
            <div className="cl-spinner" />
            <p>Loading leads...</p>
          </div>
        ) : leads.length === 0 ? (
          <div className="cl-empty">
            <FiUser size={44} />
            <h3>No Leads Found</h3>
            <p>{searchTerm || filterStatus !== 'All' ? 'Try adjusting your filters' : 'Add your first lead to get started'}</p>
          </div>
        ) : (
          <table className="cl-table">
            <thead>
              <tr>
                <th>Lead</th>
                <th>Company</th>
                <th>Contact</th>
                <th>Status</th>
                <th>Lead By</th>
                <th>Follow-Up</th>
                <th>Date</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {leads.map(lead => {
                const style = getStatusStyle(lead.status);
                return (
                  <tr key={lead._id} onClick={() => handleLeadClick(lead)}>
                    <td>
                      <div className="cl-lead-cell">
                        <div className="cl-lead-avatar">
                          {(lead.clientName || '?')[0].toUpperCase()}
                        </div>
                        <div className="cl-lead-name-info">
                          <span className="cl-lead-name">{lead.clientName}</span>
                          <span className="cl-lead-email">{lead.email}</span>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className="cl-company-name">{lead.companyName}</span>
                    </td>
                    <td>
                      <div className="cl-contact-cell">
                        {lead.phone && <span><FiPhone size={12} /> {lead.phone}</span>}
                        {lead.location && <span><FiMapPin size={12} /> {lead.location}</span>}
                      </div>
                    </td>
                    <td>
                      <span className="cl-status-badge" style={{ background: style.bg, color: style.color }}>
                        {lead.status}
                      </span>
                    </td>
                    <td>
                      <div className="cl-leadby-cell">
                        {lead.addedBy ? (
                          <>
                            {(lead.addedBy.profileImage || lead.addedBy.profilePicture || lead.addedBy.avatar) ? (
                              <img
                                src={lead.addedBy.profileImage || lead.addedBy.profilePicture || lead.addedBy.avatar}
                                alt=""
                                className="cl-leadby-avatar"
                                title={lead.addedBy.fullName || lead.addedBy.name || lead.addedBy.username || lead.addedBy.email?.split('@')[0] || 'Unknown'}
                              />
                            ) : (
                              <div className="cl-leadby-avatar-placeholder" title={lead.addedBy.fullName || lead.addedBy.name || lead.addedBy.username || lead.addedBy.email?.split('@')[0] || 'Unknown'}>
                                {(lead.addedBy.fullName || lead.addedBy.name || lead.addedBy.username || lead.addedBy.email || '?')[0].toUpperCase()}
                              </div>
                            )}
                          </>
                        ) : (
                          <span className="cl-leadby-name">—</span>
                        )}
                      </div>
                    </td>
                    <td>
                      <span className="cl-followup">{lead.followUp || '—'}</span>
                    </td>
                    <td>
                      <span className="cl-date">{lead.createdAt ? new Date(lead.createdAt).toLocaleDateString() : '—'}</span>
                    </td>
                    <td>
                      <div className="cl-row-actions" onClick={e => e.stopPropagation()}>
                        <button className="cl-icon-btn" title="Edit" onClick={() => handleLeadClick(lead)}>
                          <FiEdit3 />
                        </button>
                        <button className="cl-icon-btn cl-icon-btn-danger" title="Delete" onClick={() => handleDeleteLead(lead._id)}>
                          <FiTrash2 />
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
      {showSidePanel && selectedLead && (
        <LeadSidePanel
          lead={selectedLead}
          onClose={() => { setShowSidePanel(false); setSelectedLead(null); }}
          onStatusChange={handleStatusChange}
          onDelete={handleDeleteLead}
          onUpdate={handleUpdateLead}
        />
      )}
    </div>
  );
}

/* ========== Lead Side Panel ========== */
function LeadSidePanel({ lead, onClose, onStatusChange, onDelete, onUpdate }) {
  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState({
    companyName: lead.companyName || '',
    clientName: lead.clientName || '',
    email: lead.email || '',
    phone: lead.phone || '',
    designation: lead.designation || '',
    location: lead.location || '',
    requirements: lead.requirements || '',
    status: lead.status || 'Cold Lead'
  });

  // Sync when lead prop changes
  useEffect(() => {
    setForm({
      companyName: lead.companyName || '',
      clientName: lead.clientName || '',
      email: lead.email || '',
      phone: lead.phone || '',
      designation: lead.designation || '',
      location: lead.location || '',
      requirements: lead.requirements || '',
      status: lead.status || 'Cold Lead'
    });
    setIsEditing(false);
  }, [lead]);

  const handleSave = () => {
    onUpdate(lead._id, form);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setForm({
      companyName: lead.companyName || '',
      clientName: lead.clientName || '',
      email: lead.email || '',
      phone: lead.phone || '',
      designation: lead.designation || '',
      location: lead.location || '',
      requirements: lead.requirements || '',
      status: lead.status || 'Cold Lead'
    });
    setIsEditing(false);
  };

  const statusStyle = STATUS_COLORS[lead.status] || { bg: '#f5f5f5', color: '#525252' };
  const daysActive = lead.createdAt ? Math.max(0, Math.floor((new Date() - new Date(lead.createdAt)) / (1000 * 60 * 60 * 24))) : 0;

  return (
    <>
      <div className="noxtm-overlay--panel" onClick={onClose} />
      <div className="cl-side-panel">
        {/* Panel Header */}
        <div className="cl-panel-header">
          <div>
            <h3>{isEditing ? 'Edit Lead' : 'Lead Details'}</h3>
          </div>
          <div className="cl-panel-header-actions">
            {!isEditing && (
              <button className="cl-icon-btn" onClick={() => setIsEditing(true)} title="Edit"><FiEdit3 /></button>
            )}
            <button className="cl-panel-close" onClick={onClose}><FiX /></button>
          </div>
        </div>

        {/* Panel Content */}
        <div className="cl-panel-body">
          {/* Profile */}
          <div className="cl-panel-profile">
            <div className="cl-panel-avatar">
              {(lead.clientName || '?')[0].toUpperCase()}
            </div>
            <div className="cl-panel-profile-info">
              {isEditing ? (
                <input className="cl-edit-input cl-edit-name" value={form.clientName}
                  onChange={e => setForm({ ...form, clientName: e.target.value })} />
              ) : (
                <h2>{lead.clientName}</h2>
              )}
              <span className="cl-panel-company">{lead.companyName}</span>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="cl-panel-stats">
            <div className="cl-panel-stat">
              <FiActivity className="cl-panel-stat-icon" />
              <div>
                <span className="cl-panel-stat-value">{lead.status}</span>
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
                <span className="cl-panel-stat-value">{lead.followUp || '—'}</span>
                <span className="cl-panel-stat-label">Follow-Up</span>
              </div>
            </div>
          </div>

          {/* Status */}
          <div className="cl-panel-section">
            <h4>Status</h4>
            {isEditing ? (
              <select className="cl-edit-select" value={form.status}
                onChange={e => setForm({ ...form, status: e.target.value })}>
                {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            ) : (
              <div className="cl-panel-status-row">
                <span className="cl-status-badge" style={{ background: statusStyle.bg, color: statusStyle.color }}>
                  {lead.status}
                </span>
                {lead.convertedToClient && (
                  <span className="cl-converted-tag">Converted to Client</span>
                )}
              </div>
            )}
          </div>

          {/* Contact Info */}
          <div className="cl-panel-section">
            <h4>Contact Information</h4>
            <div className="cl-panel-info-grid">
              <div className="cl-panel-info-item">
                <FiMail className="cl-panel-info-icon" />
                <div>
                  <span className="cl-panel-info-label">Email</span>
                  {isEditing ? (
                    <input className="cl-edit-input" value={form.email}
                      onChange={e => setForm({ ...form, email: e.target.value })} />
                  ) : (
                    <span className="cl-panel-info-value">{lead.email}</span>
                  )}
                </div>
              </div>
              <div className="cl-panel-info-item">
                <FiPhone className="cl-panel-info-icon" />
                <div>
                  <span className="cl-panel-info-label">Phone</span>
                  {isEditing ? (
                    <input className="cl-edit-input" value={form.phone}
                      onChange={e => setForm({ ...form, phone: e.target.value })} />
                  ) : (
                    <span className="cl-panel-info-value">{lead.phone || '—'}</span>
                  )}
                </div>
              </div>
              <div className="cl-panel-info-item">
                <FiBriefcase className="cl-panel-info-icon" />
                <div>
                  <span className="cl-panel-info-label">Company</span>
                  {isEditing ? (
                    <input className="cl-edit-input" value={form.companyName}
                      onChange={e => setForm({ ...form, companyName: e.target.value })} />
                  ) : (
                    <span className="cl-panel-info-value">{lead.companyName}</span>
                  )}
                </div>
              </div>
              <div className="cl-panel-info-item">
                <FiBriefcase className="cl-panel-info-icon" />
                <div>
                  <span className="cl-panel-info-label">Designation</span>
                  {isEditing ? (
                    <input className="cl-edit-input" value={form.designation}
                      onChange={e => setForm({ ...form, designation: e.target.value })} />
                  ) : (
                    <span className="cl-panel-info-value">{lead.designation || '—'}</span>
                  )}
                </div>
              </div>
              <div className="cl-panel-info-item">
                <FiMapPin className="cl-panel-info-icon" />
                <div>
                  <span className="cl-panel-info-label">Location</span>
                  {isEditing ? (
                    <input className="cl-edit-input" value={form.location}
                      onChange={e => setForm({ ...form, location: e.target.value })} />
                  ) : (
                    <span className="cl-panel-info-value">{lead.location || '—'}</span>
                  )}
                </div>
              </div>
              <div className="cl-panel-info-item">
                <FiCalendar className="cl-panel-info-icon" />
                <div>
                  <span className="cl-panel-info-label">Created</span>
                  <span className="cl-panel-info-value">
                    {lead.createdAt ? new Date(lead.createdAt).toLocaleDateString() : '—'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Social Links */}
          {lead.social && Object.values(lead.social).some(Boolean) && (
            <div className="cl-panel-section">
              <h4>Social Links</h4>
              <div className="cl-panel-social">
                {lead.social.linkedin && (
                  <a href={lead.social.linkedin} target="_blank" rel="noopener noreferrer" className="cl-social-link">
                    <FiGlobe /> LinkedIn
                  </a>
                )}
                {lead.social.twitter && (
                  <a href={lead.social.twitter} target="_blank" rel="noopener noreferrer" className="cl-social-link">
                    <FiGlobe /> Twitter
                  </a>
                )}
                {lead.social.website && (
                  <a href={lead.social.website} target="_blank" rel="noopener noreferrer" className="cl-social-link">
                    <FiGlobe /> Website
                  </a>
                )}
              </div>
            </div>
          )}

          {/* Requirements */}
          <div className="cl-panel-section">
            <h4>Requirements</h4>
            {isEditing ? (
              <textarea className="cl-edit-textarea" rows="4" value={form.requirements}
                onChange={e => setForm({ ...form, requirements: e.target.value })} />
            ) : (
              <p className="cl-panel-requirements">{lead.requirements || 'No requirements specified'}</p>
            )}
          </div>

          {/* Actions */}
          <div className="cl-panel-actions">
            {isEditing ? (
              <>
                <button className="cl-btn-submit" onClick={handleSave}>Save Changes</button>
                <button className="cl-btn-cancel" onClick={handleCancel}>Cancel</button>
              </>
            ) : (
              <>
                {lead.status !== 'Qualified (SQL)' && (
                  <button className="cl-btn-convert" onClick={() => onStatusChange(lead._id, 'Qualified (SQL)')}>
                    Convert to Client
                  </button>
                )}
                <button className="cl-btn-delete" onClick={() => onDelete(lead._id)}>
                  <FiTrash2 /> Delete Lead
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

export default ClientLeads;
