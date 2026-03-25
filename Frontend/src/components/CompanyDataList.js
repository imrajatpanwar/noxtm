import React, { useState, useEffect, useCallback } from 'react';
import { FiSearch, FiChevronDown, FiChevronRight, FiTrash2, FiGlobe, FiMail, FiPhone, FiMapPin, FiLinkedin, FiUsers, FiSettings, FiX, FiTag, FiPlus, FiEdit2 } from 'react-icons/fi';
import { useRole } from '../contexts/RoleContext';
import api from '../config/api';
import { toast } from 'sonner';
import './CompanyDataList.css';

function CompanyDataList() {
  const { currentUser } = useRole();
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedId, setExpandedId] = useState(null);
  const [showAccessSettings, setShowAccessSettings] = useState(false);
  const [accessPeople, setAccessPeople] = useState([]);
  const [allMembers, setAllMembers] = useState([]);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  // Label management state (Owner only)
  const [showLabelManager, setShowLabelManager] = useState(false);
  const [labels, setLabels] = useState([]);
  const [newLabelName, setNewLabelName] = useState('');
  const [newLabelColor, setNewLabelColor] = useState('#6b7280');
  const [editingLabel, setEditingLabel] = useState(null);
  const [editLabelName, setEditLabelName] = useState('');
  const [editLabelColor, setEditLabelColor] = useState('#6b7280');
  const [labelFilter, setLabelFilter] = useState('');

  // Label assignment state
  const [labelAssignCompany, setLabelAssignCompany] = useState(null);
  const [labelAssignContact, setLabelAssignContact] = useState(null);

  const isOwner = currentUser?.roleInCompany === 'Owner' || currentUser?.role === 'Admin';

  const labelColors = ['#6b7280', '#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899', '#06b6d4'];

  const fetchCompanies = useCallback(async () => {
    try {
      setLoading(true);
      const params = {};
      if (searchQuery) params.search = searchQuery;
      if (labelFilter) params.labelId = labelFilter;
      const response = await api.get('/company-data', { params });
      setCompanies(response.data);
    } catch (error) {
      console.error('Error fetching companies:', error);
      toast.error('Failed to load companies');
    } finally {
      setLoading(false);
    }
  }, [searchQuery, labelFilter]);

  useEffect(() => {
    fetchCompanies();
  }, [fetchCompanies]);

  const fetchLabels = useCallback(async () => {
    try {
      const response = await api.get('/contact-labels');
      setLabels(response.data);
    } catch (error) {
      console.error('Error fetching labels:', error);
    }
  }, []);

  useEffect(() => {
    fetchLabels();
  }, [fetchLabels]);

  const fetchAccessSettings = async () => {
    try {
      const response = await api.get('/company-data/access-settings');
      setAccessPeople(response.data.extensionAccessPeople || []);
      setAllMembers(response.data.members || []);
    } catch (error) {
      console.error('Error fetching access settings:', error);
    }
  };

  const toggleAccessPerson = async (userId) => {
    const current = accessPeople.map(p => p._id || p);
    let updated;
    if (current.includes(userId)) {
      updated = current.filter(id => id !== userId);
    } else {
      updated = [...current, userId];
    }
    try {
      const response = await api.put('/company-data/access-settings', {
        extensionAccessPeople: updated
      });
      setAccessPeople(response.data.extensionAccessPeople || []);
      toast.success('Access settings updated');
    } catch (error) {
      toast.error('Failed to update access settings');
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/company-data/${id}`);
      toast.success('Company deleted');
      setDeleteConfirm(null);
      fetchCompanies();
    } catch (error) {
      toast.error('Failed to delete company');
    }
  };

  // Label CRUD (Owner only)
  const handleCreateLabel = async () => {
    if (!newLabelName.trim()) return;
    try {
      const res = await api.post('/contact-labels', { name: newLabelName.trim(), color: newLabelColor });
      setLabels(prev => [...prev, res.data]);
      setNewLabelName('');
      setNewLabelColor('#6b7280');
      toast.success('Label created');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to create label');
    }
  };

  const handleUpdateLabel = async (id) => {
    if (!editLabelName.trim()) return;
    try {
      const res = await api.put(`/contact-labels/${id}`, { name: editLabelName.trim(), color: editLabelColor });
      setLabels(prev => prev.map(l => l._id === id ? res.data : l));
      setEditingLabel(null);
      toast.success('Label updated');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update label');
    }
  };

  const handleDeleteLabel = async (id) => {
    try {
      await api.delete(`/contact-labels/${id}`);
      setLabels(prev => prev.filter(l => l._id !== id));
      toast.success('Label deleted');
    } catch (error) {
      toast.error('Failed to delete label');
    }
  };

  // Assign/remove label on a contact
  const handleToggleContactLabel = async (companyDataId, contactIndex, labelId, hasLabel) => {
    try {
      await api.patch(`/company-data-contacts/${companyDataId}/${contactIndex}/labels`, {
        labelId,
        action: hasLabel ? 'remove' : 'add'
      });
      fetchCompanies();
      toast.success(hasLabel ? 'Label removed' : 'Label applied');
    } catch (error) {
      toast.error('Failed to update label');
    }
  };

  return (
    <div className="cd-container">
      <div className="cd-header">
        <div>
          <h1 className="cd-title">Company Data</h1>
          <p className="cd-subtitle">Companies and contacts extracted via Chrome Extension</p>
        </div>
        <div className="cd-header-actions">
          {isOwner && (
            <>
              <button
                className="cd-btn-outline"
                onClick={() => { setShowLabelManager(!showLabelManager); }}
              >
                <FiTag size={16} /> Manage Labels
              </button>
              <button
                className="cd-btn-outline"
                onClick={() => { setShowAccessSettings(!showAccessSettings); if (!showAccessSettings) fetchAccessSettings(); }}
              >
                <FiSettings size={16} /> Extension Access
              </button>
            </>
          )}
        </div>
      </div>

      {/* Label Manager Panel (Owner only) */}
      {showLabelManager && isOwner && (
        <div className="cd-access-panel">
          <h3 className="cd-access-title">
            <FiTag size={16} /> Label Management
          </h3>
          <p className="cd-access-subtitle">Create labels to categorize company contacts. Labeled contacts appear as Phone Lists in WhatsApp Campaigns.</p>

          <div className="cd-label-create" style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 12 }}>
            <input
              type="text"
              value={newLabelName}
              onChange={e => setNewLabelName(e.target.value)}
              placeholder="New label name..."
              style={{ flex: 1, padding: '6px 10px', border: '1px solid #e5e7eb', borderRadius: 6, fontSize: 13 }}
              onKeyDown={e => e.key === 'Enter' && handleCreateLabel()}
            />
            <div style={{ display: 'flex', gap: 4 }}>
              {labelColors.map(c => (
                <button
                  key={c}
                  onClick={() => setNewLabelColor(c)}
                  style={{
                    width: 20, height: 20, borderRadius: '50%', background: c,
                    border: newLabelColor === c ? '2px solid #1a1a1a' : '2px solid transparent',
                    cursor: 'pointer'
                  }}
                />
              ))}
            </div>
            <button className="cd-btn-primary" onClick={handleCreateLabel} style={{ padding: '6px 12px', fontSize: 13 }}>
              <FiPlus size={14} /> Add
            </button>
          </div>

          <div className="cd-access-list">
            {labels.map(label => (
              <div key={label._id} className="cd-access-item" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0' }}>
                <span style={{ width: 12, height: 12, borderRadius: '50%', background: label.color, flexShrink: 0 }} />
                {editingLabel === label._id ? (
                  <>
                    <input
                      type="text"
                      value={editLabelName}
                      onChange={e => setEditLabelName(e.target.value)}
                      style={{ flex: 1, padding: '4px 8px', border: '1px solid #e5e7eb', borderRadius: 4, fontSize: 13 }}
                      onKeyDown={e => e.key === 'Enter' && handleUpdateLabel(label._id)}
                    />
                    <div style={{ display: 'flex', gap: 3 }}>
                      {labelColors.map(c => (
                        <button
                          key={c}
                          onClick={() => setEditLabelColor(c)}
                          style={{
                            width: 16, height: 16, borderRadius: '50%', background: c,
                            border: editLabelColor === c ? '2px solid #1a1a1a' : '2px solid transparent',
                            cursor: 'pointer'
                          }}
                        />
                      ))}
                    </div>
                    <button className="cd-btn-outline" onClick={() => handleUpdateLabel(label._id)} style={{ padding: '3px 8px', fontSize: 12 }}>Save</button>
                    <button className="cd-btn-ghost" onClick={() => setEditingLabel(null)} style={{ padding: '3px 8px', fontSize: 12 }}>Cancel</button>
                  </>
                ) : (
                  <>
                    <span style={{ flex: 1, fontSize: 13, fontWeight: 500 }}>{label.name}</span>
                    <button className="cd-btn-icon" onClick={() => { setEditingLabel(label._id); setEditLabelName(label.name); setEditLabelColor(label.color); }} title="Edit">
                      <FiEdit2 size={13} />
                    </button>
                    <button className="cd-btn-icon cd-btn-danger" onClick={() => handleDeleteLabel(label._id)} title="Delete">
                      <FiTrash2 size={13} />
                    </button>
                  </>
                )}
              </div>
            ))}
            {labels.length === 0 && <p style={{ fontSize: 13, color: '#9ca3af', padding: '8px 0' }}>No labels yet. Create one above.</p>}
          </div>
        </div>
      )}

      {showAccessSettings && isOwner && (
        <div className="cd-access-panel">
          <h3 className="cd-access-title">
            <FiUsers size={16} /> Chrome Extension Access
          </h3>
          <p className="cd-access-subtitle">Only selected members can add data via the Chrome Extension</p>
          <div className="cd-access-list">
            {allMembers.map((member) => {
              const userId = member.user?._id || member.user;
              const isChecked = accessPeople.some(p => (p._id || p) === userId);
              const isOwnerMember = member.roleInCompany === 'Owner';
              return (
                <label key={userId} className="cd-access-item">
                  <input
                    type="checkbox"
                    checked={isOwnerMember || isChecked}
                    disabled={isOwnerMember}
                    onChange={() => !isOwnerMember && toggleAccessPerson(userId)}
                  />
                  <span className="cd-access-name">
                    {member.user?.fullName || 'User'}
                    {isOwnerMember && <span className="cd-access-badge">Owner</span>}
                  </span>
                  <span className="cd-access-email">{member.user?.email || ''}</span>
                </label>
              );
            })}
          </div>
        </div>
      )}

      {/* Filter bar with label filter */}
      <div className="cd-search-bar" style={{ display: 'flex', gap: 8 }}>
        <div style={{ flex: 1, position: 'relative' }}>
          <FiSearch className="cd-search-icon" />
          <input
            type="text"
            placeholder="Search companies by name or industry..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        {labels.length > 0 && (
          <select
            value={labelFilter}
            onChange={e => setLabelFilter(e.target.value)}
            style={{ padding: '8px 12px', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 13, background: '#fff', minWidth: 150 }}
          >
            <option value="">All Labels</option>
            {labels.map(l => (
              <option key={l._id} value={l._id}>{l.name}</option>
            ))}
          </select>
        )}
      </div>

      {loading ? (
        <div className="cd-loading">
          {[1, 2, 3].map(i => (
            <div key={i} className="cd-skeleton-card">
              <div className="cd-skeleton-line cd-skeleton-title" />
              <div className="cd-skeleton-line cd-skeleton-text" />
            </div>
          ))}
        </div>
      ) : companies.length === 0 ? (
        <div className="cd-empty">
          <FiUsers size={48} strokeWidth={1} />
          <h3>No companies yet</h3>
          <p>Companies will appear here when added via the Chrome Extension</p>
        </div>
      ) : (
        <div className="cd-list">
          {companies.map((company) => (
            <div key={company._id} className="cd-card">
              <div
                className="cd-card-header"
                onClick={() => setExpandedId(expandedId === company._id ? null : company._id)}
              >
                <div className="cd-card-expand">
                  {expandedId === company._id ? <FiChevronDown size={16} /> : <FiChevronRight size={16} />}
                </div>
                <div className="cd-card-info">
                  <h3 className="cd-card-name">{company.companyName}</h3>
                  <div className="cd-card-meta">
                    {company.industry && <span className="cd-card-industry">{company.industry}</span>}
                    {company.website && (
                      <span className="cd-card-website">
                        <FiGlobe size={12} /> {company.website.replace(/^https?:\/\//, '')}
                      </span>
                    )}
                    <span className="cd-card-contacts">
                      <FiUsers size={12} /> {company.contacts?.length || 0} contacts
                    </span>
                  </div>
                </div>
                {company.createdBy && (
                  <div className="cd-card-avatar" title={company.createdBy.fullName || 'Unknown'}>
                    {(() => {
                      const name = company.createdBy.fullName || 'U';
                      const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
                      const colors = ['#667eea', '#764ba2', '#f093fb', '#f5576c', '#4facfe', '#43e97b', '#38f9d7', '#fa709a'];
                      const bgColor = colors[name.charCodeAt(0) % colors.length];
                      return (
                        <span className="cd-avatar" style={{ background: bgColor }}>
                          {initials}
                        </span>
                      );
                    })()}
                  </div>
                )}
                <div className="cd-card-actions" onClick={(e) => e.stopPropagation()}>
                  {isOwner && (
                    <button className="cd-btn-icon cd-btn-danger" onClick={() => setDeleteConfirm(company._id)} title="Delete">
                      <FiTrash2 size={14} />
                    </button>
                  )}
                </div>
              </div>

              {expandedId === company._id && (
                <div className="cd-card-expanded">
                  <div className="cd-company-details">
                    {company.companyEmail && (
                      <span className="cd-detail"><FiMail size={13} /> {company.companyEmail}</span>
                    )}
                    {company.companyPhone && (
                      <span className="cd-detail"><FiPhone size={13} /> {company.companyPhone}</span>
                    )}
                    {company.address && (
                      <span className="cd-detail"><FiMapPin size={13} /> {company.address}</span>
                    )}
                    {company.linkedin && (
                      <span className="cd-detail"><FiLinkedin size={13} /> {company.linkedin}</span>
                    )}
                  </div>

                  {company.contacts && company.contacts.length > 0 ? (
                    <div className="cd-contacts-section">
                      <h4 className="cd-contacts-title">Decision Makers</h4>
                      <div className="cd-contacts-grid">
                        {company.contacts.map((contact, idx) => (
                          <div key={idx} className="cd-contact-card">
                            <div className="cd-contact-header">
                              <span className="cd-contact-avatar" style={{
                                background: ['#667eea', '#764ba2', '#f093fb', '#f5576c', '#4facfe', '#43e97b', '#38f9d7', '#fa709a'][(contact.fullName || 'U').charCodeAt(0) % 8]
                              }}>
                                {(contact.fullName || 'U').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                              </span>
                              <div>
                                <div className="cd-contact-name">{contact.fullName || 'Unnamed'}</div>
                                {contact.designation && (
                                  <div className="cd-contact-designation">{contact.designation}</div>
                                )}
                              </div>
                            </div>
                            <div className="cd-contact-details">
                              {contact.email && <span><FiMail size={12} /> {contact.email}</span>}
                              {contact.phone && <span><FiPhone size={12} /> {contact.phone}</span>}
                              {contact.socialLinks && contact.socialLinks[0] && (
                                <span><FiLinkedin size={12} /> LinkedIn</span>
                              )}
                            </div>
                            {/* Contact labels */}
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 6 }}>
                              {(contact.labels || []).map(lid => {
                                const lbl = labels.find(l => l._id === (lid._id || lid));
                                return lbl ? (
                                  <span key={lbl._id} style={{
                                    display: 'inline-flex', alignItems: 'center', gap: 3,
                                    padding: '2px 8px', borderRadius: 12, fontSize: 11, fontWeight: 500,
                                    background: lbl.color + '20', color: lbl.color, border: `1px solid ${lbl.color}40`
                                  }}>
                                    {lbl.name}
                                    {isOwner && (
                                      <FiX size={10} style={{ cursor: 'pointer' }}
                                        onClick={() => handleToggleContactLabel(company._id, idx, lbl._id, true)} />
                                    )}
                                  </span>
                                ) : null;
                              })}
                              {isOwner && (
                                <div style={{ position: 'relative', display: 'inline-block' }}>
                                  <button
                                    className="cd-btn-icon"
                                    style={{ width: 22, height: 22, fontSize: 10 }}
                                    onClick={() => {
                                      if (labelAssignCompany === company._id && labelAssignContact === idx) {
                                        setLabelAssignCompany(null);
                                        setLabelAssignContact(null);
                                      } else {
                                        setLabelAssignCompany(company._id);
                                        setLabelAssignContact(idx);
                                      }
                                    }}
                                    title="Add label"
                                  >
                                    <FiTag size={11} />
                                  </button>
                                  {labelAssignCompany === company._id && labelAssignContact === idx && (
                                    <div style={{
                                      position: 'absolute', top: 26, left: 0, zIndex: 10,
                                      background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8,
                                      boxShadow: '0 4px 12px rgba(0,0,0,0.1)', padding: 6, minWidth: 140
                                    }}>
                                      {labels.map(l => {
                                        const hasIt = (contact.labels || []).some(lid => (lid._id || lid) === l._id);
                                        return (
                                          <div
                                            key={l._id}
                                            onClick={() => handleToggleContactLabel(company._id, idx, l._id, hasIt)}
                                            style={{
                                              display: 'flex', alignItems: 'center', gap: 6, padding: '4px 8px',
                                              borderRadius: 4, cursor: 'pointer', fontSize: 12,
                                              background: hasIt ? l.color + '15' : 'transparent'
                                            }}
                                          >
                                            <span style={{ width: 10, height: 10, borderRadius: '50%', background: l.color }} />
                                            {l.name}
                                            {hasIt && <FiX size={10} style={{ marginLeft: 'auto' }} />}
                                          </div>
                                        );
                                      })}
                                      {labels.length === 0 && <p style={{ fontSize: 11, color: '#9ca3af', padding: 4 }}>No labels. Create one first.</p>}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <p className="cd-no-contacts">No decision makers added</p>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {deleteConfirm && (
        <div className="cd-modal-overlay" onClick={() => setDeleteConfirm(null)}>
          <div className="cd-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Delete Company</h3>
            <p>Are you sure you want to delete this company? This action cannot be undone.</p>
            <div className="cd-modal-actions">
              <button className="cd-btn-ghost" onClick={() => setDeleteConfirm(null)}>Cancel</button>
              <button className="cd-btn-danger-solid" onClick={() => handleDelete(deleteConfirm)}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default CompanyDataList;
