import React, { useState, useEffect, useCallback } from 'react';
import {
  FiSearch, FiEdit3, FiUser, FiMail, FiPhone, FiMapPin,
  FiCalendar, FiActivity, FiDownload, FiX,
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
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');
  const [showSidePanel, setShowSidePanel] = useState(false);
  const [selectedContact, setSelectedContact] = useState(null);

  // Fetch contacts from backend (exhibitor contacts)
  const fetchContacts = useCallback(async () => {
    try {
      setLoading(true);
      const params = {};
      if (filterStatus !== 'All') params.status = filterStatus;
      if (searchTerm) params.search = searchTerm;

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
  }, [filterStatus, searchTerm]);

  useEffect(() => {
    fetchContacts();
  }, [fetchContacts]);

  // Stats
  const stats = {
    total: contacts.length,
    cold: contacts.filter(c => c.status === 'Cold Lead').length,
    warm: contacts.filter(c => c.status === 'Warm Lead').length,
    qualified: contacts.filter(c => c.status === 'Qualified (SQL)').length,
    active: contacts.filter(c => c.status === 'Active').length,
    dead: contacts.filter(c => c.status === 'Dead Lead').length
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

  // CSV Export
  const handleExport = () => {
    const csvContent = [
      ['Contact Name', 'Company', 'Trade Show', 'Email', 'Phone', 'Designation', 'Location', 'Status', 'Follow-Up'],
      ...contacts.map(c => [
        c.fullName, c.companyName, c.tradeShowName || '', c.email, c.phone || '',
        c.designation || '', c.location || '', c.status, c.followUp || ''
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

  return (
    <div className="cl-container">
      {/* Header */}
      <div className="cl-header">
        <div>
          <h1 className="cl-title">Contacts</h1>
          <p className="cl-subtitle">Exhibitor contacts from your trade shows</p>
        </div>
        <div className="cl-header-actions">
          <button className="cl-btn-outline" onClick={handleExport}>
            <FiDownload /> Export
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
            <p>{searchTerm || filterStatus !== 'All' ? 'Try adjusting your filters' : 'Contacts from exhibitors will appear here once you add them via trade shows'}</p>
          </div>
        ) : (
          <table className="cl-table">
            <thead>
              <tr>
                <th>Contact</th>
                <th>Company</th>
                <th>Trade Show</th>
                <th>Phone</th>
                <th>Designation</th>
                <th>Status</th>
                <th>Follow-Up</th>
                <th>Date</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {contacts.map(contact => {
                const style = getStatusStyle(contact.status);
                return (
                  <tr key={contact._id} onClick={() => handleContactClick(contact)}>
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
                      <span style={{ fontSize: 13 }}>{contact.designation || '-'}</span>
                    </td>
                    <td>
                      <span className="cl-status-badge" style={{ background: style.bg, color: style.color }}>
                        {contact.status}
                      </span>
                    </td>
                    <td>
                      <span className="cl-followup">{contact.followUp || '-'}</span>
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
          onClose={() => { setShowSidePanel(false); setSelectedContact(null); }}
          onStatusChange={handleStatusChange}
          onFollowUpChange={handleFollowUpChange}
        />
      )}
    </div>
  );
}

/* ========== Contact Side Panel ========== */
function ContactSidePanel({ contact, onClose, onStatusChange, onFollowUpChange }) {
  const [followUpInput, setFollowUpInput] = useState(contact.followUp || '');

  useEffect(() => {
    setFollowUpInput(contact.followUp || '');
  }, [contact]);

  const statusStyle = STATUS_COLORS[contact.status] || { bg: '#f5f5f5', color: '#525252' };
  const daysActive = contact.createdAt ? Math.max(0, Math.floor((new Date() - new Date(contact.createdAt)) / (1000 * 60 * 60 * 24))) : 0;

  const handleFollowUpSave = () => {
    if (followUpInput !== (contact.followUp || '')) {
      onFollowUpChange(contact, followUpInput);
    }
  };

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
