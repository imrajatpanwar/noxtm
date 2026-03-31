import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { FiSearch, FiChevronDown, FiChevronRight, FiTrash2, FiGlobe, FiMail, FiPhone, FiMapPin, FiLinkedin, FiUsers, FiX, FiTag, FiPlus, FiEdit2, FiCheck, FiFilter, FiSliders, FiMoreVertical } from 'react-icons/fi';
import LinkedInIcon from './assets/LinkedIn_icon.svg';
import { useRole } from '../contexts/RoleContext';
import api from '../config/api';
import { toast } from 'sonner';
import './CompanyDataList.css';

const AVATAR_COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#0ea5e9', '#10b981', '#14b8a6', '#f97316'];

function getInitials(name) {
  return (name || 'U').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

function getAvatarColor(name) {
  return AVATAR_COLORS[(name || 'U').charCodeAt(0) % AVATAR_COLORS.length];
}

// ---- Permission dropdown (Figma-style "can view ▾") ----
function PermissionSelect({ value, onChange, disabled }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  if (disabled) {
    return <span className="cd-perm-label cd-perm-owner">owner</span>;
  }

  const options = [
    { value: 'view', label: 'can view' },
    { value: 'edit', label: 'can edit' },
    { value: 'remove', label: 'Remove access', danger: true },
  ];

  return (
    <div className="cd-perm-select" ref={ref}>
      <button className="cd-perm-trigger" onClick={() => setOpen(!open)}>
        {value === 'edit' ? 'can edit' : 'can view'}
        <FiChevronDown size={12} />
      </button>
      {open && (
        <div className="cd-perm-dropdown">
          {options.map(opt => (
            <button
              key={opt.value}
              className={`cd-perm-option ${opt.danger ? 'cd-perm-option-danger' : ''} ${opt.value === value ? 'cd-perm-option-active' : ''}`}
              onClick={() => { onChange(opt.value); setOpen(false); }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function CompanyDataList() {
  const { currentUser } = useRole();
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedId, setExpandedId] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [kebabOpenId, setKebabOpenId] = useState(null);
  const kebabRef = useRef(null);

  // Data access
  const [dataAccessPermissions, setDataAccessPermissions] = useState([]);
  const [allMembers, setAllMembers] = useState([]);
  const [showAccessPanel, setShowAccessPanel] = useState(false);
  const accessPanelRef = useRef(null);

  // Labels
  const [labels, setLabels] = useState([]);
  const [labelFilter, setLabelFilter] = useState('');
  const [labelAssignCompany, setLabelAssignCompany] = useState(null);
  const [labelAssignContact, setLabelAssignContact] = useState(null);

  // Filter drawer
  const [showFilterDrawer, setShowFilterDrawer] = useState(false);
  const [filterIndustries, setFilterIndustries] = useState([]);
  const [filterAssignedTo, setFilterAssignedTo] = useState('');
  const [filterContactsMin, setFilterContactsMin] = useState('');
  const [filterHasWebsite, setFilterHasWebsite] = useState(false);
  const [filterDateAdded, setFilterDateAdded] = useState('');
  const [sortOrder, setSortOrder] = useState('az');
  const [openSections, setOpenSections] = useState({ industry: true, assignedTo: false, contacts: false, dateAdded: false, sort: false });

  // Selection
  const [selectedCards, setSelectedCards] = useState(new Set());
  const [showBulkLabelDropdown, setShowBulkLabelDropdown] = useState(false);
  const bulkLabelRef = useRef(null);

  // Edit
  const [editingCompany, setEditingCompany] = useState(null);
  const [editFormData, setEditFormData] = useState({});

  const isOwner = currentUser?.roleInCompany === 'Owner' || currentUser?.role === 'Admin';

  const currentUserPermission = (() => {
    if (isOwner) return 'edit';
    const perm = dataAccessPermissions.find(p => (p.user?._id || p.user) === currentUser?._id);
    return perm?.permission || null;
  })();
  const canEdit = currentUserPermission === 'edit';

  const toggleSection = (key) => setOpenSections(prev => ({ ...prev, [key]: !prev[key] }));

  // Close access panel on outside click
  useEffect(() => {
    const handler = (e) => {
      if (accessPanelRef.current && !accessPanelRef.current.contains(e.target)) {
        setShowAccessPanel(false);
      }
    };
    if (showAccessPanel) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showAccessPanel]);

  // Close kebab menu on click outside
  useEffect(() => {
    const handler = (e) => {
      if (kebabRef.current && !kebabRef.current.contains(e.target)) {
        setKebabOpenId(null);
      }
    };
    if (kebabOpenId) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [kebabOpenId]);

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

  useEffect(() => { fetchCompanies(); }, [fetchCompanies]);

  const fetchLabels = useCallback(async () => {
    try {
      const response = await api.get('/contact-labels');
      setLabels(response.data);
    } catch (error) {
      console.error('Error fetching labels:', error);
    }
  }, []);

  useEffect(() => { fetchLabels(); }, [fetchLabels]);

  const fetchDataAccess = useCallback(async () => {
    try {
      const response = await api.get('/company-data/data-access');
      setDataAccessPermissions(response.data.dataAccessPermissions || []);
      setAllMembers(response.data.members || []);
    } catch (error) {
      console.error('Error fetching data access:', error);
    }
  }, []);

  useEffect(() => { fetchDataAccess(); }, [fetchDataAccess]);

  const handleUpdatePermission = async (userId, permission) => {
    try {
      const response = await api.put(`/company-data/data-access/${userId}`, { permission });
      setDataAccessPermissions(response.data.dataAccessPermissions || []);
      setAllMembers(response.data.members || []);
      toast.success(permission === 'remove' ? 'Access removed' : `Set to ${permission}`);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update permission');
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/company-data/${id}`);
      toast.success('Company deleted');
      setDeleteConfirm(null);
      fetchCompanies();
    } catch (error) { toast.error('Failed to delete company'); }
  };

  const handleStartEdit = (company) => {
    setEditingCompany(company._id);
    setExpandedId(null);
    setEditFormData({
      companyName: company.companyName || '', companyEmail: company.companyEmail || '',
      companyPhone: company.companyPhone || '', website: company.website || '',
      industry: company.industry || '', address: company.address || '', linkedin: company.linkedin || '',
      notes: company.notes || '',
    });
  };

  const handleSaveEdit = async (id) => {
    try {
      await api.put(`/company-data/${id}`, editFormData);
      toast.success('Company updated');
      setEditingCompany(null);
      fetchCompanies();
    } catch (error) { toast.error('Failed to update company'); }
  };

  const handleCancelEdit = () => { setEditingCompany(null); setEditFormData({}); };

  const handleToggleContactLabel = async (companyDataId, contactIndex, labelId, hasLabel) => {
    try {
      await api.patch(`/company-data-contacts/${companyDataId}/${contactIndex}/labels`, {
        labelId, action: hasLabel ? 'remove' : 'add'
      });
      fetchCompanies();
      toast.success(hasLabel ? 'Label removed' : 'Label applied');
    } catch (error) { toast.error('Failed to update label'); }
  };

  const handleBulkAssignLabel = async (labelId) => {
    try {
      const companyIds = Array.from(selectedCards);
      await Promise.all(
        companyIds.map(id => api.patch(`/company-data/${id}/bulk-labels`, { labelId, action: 'add' }))
      );
      toast.success(`Label applied to ${companyIds.length} companies`);
      fetchCompanies();
      setSelectedCards(new Set());
      setShowBulkLabelDropdown(false);
    } catch (error) { toast.error('Failed to apply label'); }
  };

  // Close bulk label dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (bulkLabelRef.current && !bulkLabelRef.current.contains(e.target)) {
        setShowBulkLabelDropdown(false);
      }
    };
    if (showBulkLabelDropdown) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showBulkLabelDropdown]);

  const clearAllFilters = () => {
    setFilterIndustries([]);
    setFilterAssignedTo('');
    setFilterContactsMin('');
    setFilterHasWebsite(false);
    setFilterDateAdded('');
    setSortOrder('az');
    setLabelFilter('');
  };

  // Build avatar list for the stack
  const ownerMember = allMembers.find(m => m.roleInCompany === 'Owner');
  const ownerUser = ownerMember?.user;
  const accessMembers = dataAccessPermissions.filter(p => p.user).map(p => ({
    ...(typeof p.user === 'object' ? p.user : {}),
    _id: p.user?._id || p.user,
    permission: p.permission
  }));

  const avatarList = [];
  if (ownerUser) avatarList.push({ ...ownerUser, permission: 'edit', isOwner: true });
  accessMembers.forEach(m => {
    if (!ownerUser || m._id !== ownerUser._id) avatarList.push(m);
  });

  const MAX_AVATARS = 4;
  const visibleAvatars = avatarList.slice(0, MAX_AVATARS);
  const overflowCount = Math.max(0, avatarList.length - MAX_AVATARS);

  // Build full members list for the access panel
  const membersList = allMembers.map(member => {
    const userId = member.user?._id || member.user;
    const isOwnerMember = member.roleInCompany === 'Owner';
    const perm = dataAccessPermissions.find(p => (p.user?._id || p.user) === userId);
    return {
      userId,
      name: member.user?.fullName || 'User',
      email: member.user?.email || '',
      isOwner: isOwnerMember,
      hasAccess: isOwnerMember || !!perm,
      permission: isOwnerMember ? 'edit' : (perm?.permission || null),
    };
  });

  // Unique industries for filter
  const uniqueIndustries = useMemo(() =>
    [...new Set(companies.map(c => c.industry).filter(Boolean))].sort(),
    [companies]
  );

  // Client-side filtered + sorted companies
  const displayedCompanies = useMemo(() => {
    let result = [...companies];
    if (filterIndustries.length > 0) result = result.filter(c => filterIndustries.includes(c.industry));
    if (filterAssignedTo) result = result.filter(c => (c.createdBy?._id || c.createdBy) === filterAssignedTo);
    if (filterContactsMin !== '') result = result.filter(c => (c.contacts?.length || 0) >= parseInt(filterContactsMin));
    if (filterHasWebsite) result = result.filter(c => !!c.website);
    if (filterDateAdded === 'today') {
      const today = new Date().toDateString();
      result = result.filter(c => c.createdAt && new Date(c.createdAt).toDateString() === today);
    } else if (filterDateAdded === 'week') {
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      result = result.filter(c => c.createdAt && new Date(c.createdAt) >= weekAgo);
    } else if (filterDateAdded === 'month') {
      const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      result = result.filter(c => c.createdAt && new Date(c.createdAt) >= monthAgo);
    }
    result.sort((a, b) => {
      if (sortOrder === 'az') return (a.companyName || '').localeCompare(b.companyName || '');
      if (sortOrder === 'za') return (b.companyName || '').localeCompare(a.companyName || '');
      if (sortOrder === 'newest') return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
      if (sortOrder === 'oldest') return new Date(a.createdAt || 0) - new Date(b.createdAt || 0);
      return 0;
    });
    return result;
  }, [companies, filterIndustries, filterAssignedTo, filterContactsMin, filterHasWebsite, filterDateAdded, sortOrder]);

  const addedTodayCount = useMemo(() =>
    companies.filter(c => c.createdAt && new Date(c.createdAt).toDateString() === new Date().toDateString()).length,
    [companies]
  );

  const activeFilterCount = [
    filterIndustries.length > 0,
    !!filterAssignedTo,
    filterContactsMin !== '',
    filterHasWebsite,
    !!filterDateAdded,
    sortOrder !== 'az',
    !!labelFilter,
  ].filter(Boolean).length;

  const hasActiveFilters = activeFilterCount > 0;

  return (
    <div className="cd-container">
      <div className="cd-header">
        <div>
          <h1 className="cd-title">Company Data</h1>
          <p className="cd-subtitle">Companies and contacts extracted via Chrome Extension</p>
        </div>
        <div className="cd-header-actions">
          <div className="cd-stats-container">
            <div className="cd-stat-item">
              <span className="cd-stat-value">{addedTodayCount}</span>
              <span className="cd-stat-label">Added Today</span>
            </div>
            <div className="cd-stat-divider" />
            <div className="cd-stat-item">
              <span className="cd-stat-value">{companies.length}</span>
              <span className="cd-stat-label">Total Company Data</span>
            </div>
          </div>

          {/* Avatar stack */}
          <div className="cd-avatar-stack-wrap" ref={accessPanelRef}>
            <div className="cd-avatar-stack" onClick={() => isOwner && setShowAccessPanel(!showAccessPanel)}>
              {visibleAvatars.map((m, i) => (
                <div
                  key={m._id}
                  className="cd-stacked-avatar"
                  style={{ zIndex: MAX_AVATARS - i, background: m.profileImage ? 'transparent' : getAvatarColor(m.fullName) }}
                  title={`${m.fullName || 'User'}${m.isOwner ? ' (Owner)' : ` (${m.permission})`}`}
                >
                  {m.profileImage ? (
                    <img src={m.profileImage} alt={m.fullName} className="cd-stacked-avatar-img" />
                  ) : getInitials(m.fullName)}
                </div>
              ))}
              {overflowCount > 0 && (
                <div className="cd-stacked-avatar cd-avatar-overflow" style={{ zIndex: 0 }}>
                  +{overflowCount}
                </div>
              )}
              {isOwner && (
                <button className="cd-avatar-plus" title="Manage data access">
                  <FiPlus size={14} />
                </button>
              )}
            </div>

            {/* Floating access panel */}
            {showAccessPanel && isOwner && (
              <div className="cd-share-panel">
                <div className="cd-share-header">
                  <span className="cd-share-title">Who has access</span>
                  <button className="cd-share-close" onClick={() => setShowAccessPanel(false)}><FiX size={14} /></button>
                </div>
                <div className="cd-share-list">
                  {membersList.map(m => (
                    <div key={m.userId} className="cd-share-row">
                      <div className="cd-share-avatar" style={{ background: getAvatarColor(m.name) }}>
                        {getInitials(m.name)}
                      </div>
                      <div className="cd-share-info">
                        <span className="cd-share-name">
                          {m.name}
                          {m.userId === currentUser?._id && <span className="cd-share-you">(you)</span>}
                        </span>
                        <span className="cd-share-email">{m.email}</span>
                      </div>
                      {m.isOwner ? (
                        <span className="cd-perm-label cd-perm-owner">owner</span>
                      ) : m.hasAccess ? (
                        <PermissionSelect
                          value={m.permission}
                          onChange={(perm) => handleUpdatePermission(m.userId, perm)}
                        />
                      ) : (
                        <button className="cd-share-add-btn" onClick={() => handleUpdatePermission(m.userId, 'view')}>
                          + Add
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Search + stats row */}
      <div className="cd-search-stats-row">
        {selectedCards.size > 0 && (
          <div className="cd-select-all" onClick={(e) => e.stopPropagation()} title="Select all">
            <input
              type="checkbox"
              checked={displayedCompanies.length > 0 && selectedCards.size === displayedCompanies.length}
              onChange={() => {
                if (selectedCards.size === displayedCompanies.length) {
                  setSelectedCards(new Set());
                } else {
                  setSelectedCards(new Set(displayedCompanies.map(c => c._id)));
                }
              }}
            />
          </div>
        )}
        <div className="cd-search-bar">
          <FiSearch className="cd-search-icon" />
          <input type="text" placeholder="Search companies by name or industry..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
        </div>
        <button className="cd-btn-outline cd-filter-trigger" onClick={() => setShowFilterDrawer(true)}>
          <FiSliders size={16} /> Filter
          {activeFilterCount > 0 && <span className="cd-filter-count-badge">{activeFilterCount}</span>}
        </button>
      </div>

      {/* Bulk action bar */}
      {selectedCards.size > 0 && (
        <div className="cd-bulk-action-bar">
          <span className="cd-bulk-count">{selectedCards.size} selected</span>
          <div className="cd-bulk-actions">
            <div className="cd-bulk-label-wrapper" ref={bulkLabelRef}>
              <button className="cd-bulk-btn" onClick={() => setShowBulkLabelDropdown(!showBulkLabelDropdown)}>
                <FiTag size={14} /> Add Label
              </button>
              {showBulkLabelDropdown && (
                <div className="cd-bulk-label-dropdown">
                  {labels.map(l => (
                    <div key={l._id} className="cd-bulk-label-item" onClick={() => handleBulkAssignLabel(l._id)}>
                      <span className="cd-bulk-label-dot" style={{ background: l.color }} />
                      <span>{l.name}</span>
                    </div>
                  ))}
                  {labels.length === 0 && <p className="cd-bulk-label-empty">No labels available. Create labels in Workspace Settings.</p>}
                </div>
              )}
            </div>
            <button className="cd-bulk-btn cd-bulk-btn-ghost" onClick={() => setSelectedCards(new Set())}>
              <FiX size={14} /> Clear
            </button>
          </div>
        </div>
      )}

      {/* Active filters row */}
      {hasActiveFilters && (
        <div className="cd-active-filters">
          <span className="cd-active-filters-label">Active:</span>
          {filterIndustries.map(ind => (
            <span key={ind} className="cd-active-tag">
              {ind}
              <button onClick={() => setFilterIndustries(prev => prev.filter(i => i !== ind))}><FiX size={10} /></button>
            </span>
          ))}
          {filterAssignedTo && (
            <span className="cd-active-tag">
              {allMembers.find(m => m.user?._id === filterAssignedTo)?.user?.fullName || 'User'}
              <button onClick={() => setFilterAssignedTo('')}><FiX size={10} /></button>
            </span>
          )}
          {filterContactsMin && (
            <span className="cd-active-tag">
              {filterContactsMin}+ contacts
              <button onClick={() => setFilterContactsMin('')}><FiX size={10} /></button>
            </span>
          )}
          {filterHasWebsite && (
            <span className="cd-active-tag">
              Has website
              <button onClick={() => setFilterHasWebsite(false)}><FiX size={10} /></button>
            </span>
          )}
          {filterDateAdded && (
            <span className="cd-active-tag">
              {filterDateAdded === 'today' ? 'Today' : filterDateAdded === 'week' ? 'Last 7 days' : 'Last 30 days'}
              <button onClick={() => setFilterDateAdded('')}><FiX size={10} /></button>
            </span>
          )}
          {labelFilter && (
            <span className="cd-active-tag">
              {labels.find(l => l._id === labelFilter)?.name || 'Label'}
              <button onClick={() => setLabelFilter('')}><FiX size={10} /></button>
            </span>
          )}
          {sortOrder !== 'az' && (
            <span className="cd-active-tag">
              Sort: {sortOrder === 'za' ? 'Z→A' : sortOrder === 'newest' ? 'Newest' : 'Oldest'}
              <button onClick={() => setSortOrder('az')}><FiX size={10} /></button>
            </span>
          )}
          <button className="cd-clear-all-btn" onClick={clearAllFilters}>Clear all</button>
          {!loading && companies.length > 0 && displayedCompanies.length !== companies.length && (
            <span className="cd-filter-result-count">Showing {displayedCompanies.length} of {companies.length} companies</span>
          )}
        </div>
      )}

      {/* Company list */}
      {loading ? (
        <div className="cd-loading">
          {[1, 2, 3].map(i => (
            <div key={i} className="cd-skeleton-card">
              <div className="cd-skeleton-line cd-skeleton-title" />
              <div className="cd-skeleton-line cd-skeleton-text" />
            </div>
          ))}
        </div>
      ) : displayedCompanies.length === 0 ? (
        <div className="cd-empty">
          <FiUsers size={48} strokeWidth={1} />
          <h3>{companies.length === 0 ? 'No companies yet' : 'No results match your filters'}</h3>
          <p>{companies.length === 0 ? 'Companies will appear here when added via the Chrome Extension' : 'Try adjusting or clearing your filters'}</p>
          {hasActiveFilters && <button className="cd-btn-outline" onClick={clearAllFilters} style={{ marginTop: 12 }}>Clear filters</button>}
        </div>
      ) : (
        <div className="cd-list">
          {displayedCompanies.map((company) => {
            const isEditing = editingCompany === company._id;
            const linkedinUrl = company.linkedin
              ? (company.linkedin.startsWith('http') ? company.linkedin : `https://${company.linkedin}`)
              : null;
            return (
              <div key={company._id} className={`cd-card${selectedCards.has(company._id) ? ' cd-card-selected' : ''}`}>
                <div className="cd-card-header" onClick={() => !isEditing && setExpandedId(expandedId === company._id ? null : company._id)}>
                  <div className="cd-card-checkbox" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={selectedCards.has(company._id)}
                      onChange={() => {
                        setSelectedCards(prev => {
                          const next = new Set(prev);
                          if (next.has(company._id)) next.delete(company._id);
                          else next.add(company._id);
                          return next;
                        });
                      }}
                    />
                  </div>
                  <div className="cd-card-expand">
                    {expandedId === company._id ? <FiChevronDown size={16} /> : <FiChevronRight size={16} />}
                  </div>
                  <div className="cd-card-info">
                    <h3 className="cd-card-name">{company.companyName}</h3>
                    {(() => {
                      const companyLabelIds = new Set();
                      (company.contacts || []).forEach(c => (c.labels || []).forEach(lid => companyLabelIds.add(lid._id || lid)));
                      const companyLabels = labels.filter(l => companyLabelIds.has(l._id));
                      return companyLabels.length > 0 ? (
                        <div className="cd-card-labels">
                          {companyLabels.map(lbl => (
                            <span key={lbl._id} className="cd-card-label-tag" style={{ background: lbl.color + '18', color: lbl.color, borderColor: lbl.color + '40' }}>
                              {lbl.name}
                            </span>
                          ))}
                        </div>
                      ) : null;
                    })()}
                    <div className="cd-card-meta">
                      {company.industry && <span className="cd-card-industry">{company.industry}</span>}
                      {company.website && <span className="cd-card-website"><FiGlobe size={12} /> {company.website.replace(/^https?:\/\//, '')}</span>}
                      <span className="cd-card-contacts"><FiUsers size={12} /> {company.contacts?.length || 0} contacts</span>
                    </div>
                  </div>

                  {/* Right meta: email, phone, linkedin */}
                  <div className="cd-card-right-meta" onClick={(e) => e.stopPropagation()}>
                    <div className="cd-right-meta-top">
                      {company.companyEmail && (
                        <span className="cd-card-meta-item" title={company.companyEmail}>
                          <FiMail size={13} />
                          <span className="cd-meta-text">{company.companyEmail}</span>
                        </span>
                      )}
                      {company.companyPhone && (
                        <span className="cd-card-meta-item" title={company.companyPhone}>
                          <FiPhone size={13} />
                          <span className="cd-meta-text">{company.companyPhone}</span>
                        </span>
                      )}
                    </div>
                    <div className="cd-right-meta-bottom">
                      {company.address && (
                        <span className="cd-card-meta-item" title={company.address}>
                          <FiMapPin size={13} />
                          <span className="cd-meta-text">{company.address}</span>
                        </span>
                      )}
                      {linkedinUrl && (
                        <a
                          href={linkedinUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="cd-card-linkedin"
                          title={company.linkedin}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <img src={LinkedInIcon} alt="LinkedIn" className="cd-linkedin-svg" />
                        </a>
                      )}
                    </div>
                  </div>

                  {company.createdBy && (
                    <div className="cd-card-avatar" title={company.createdBy.fullName || 'Unknown'}>
                      {company.createdBy.profileImage ? (
                        <img src={company.createdBy.profileImage} alt={company.createdBy.fullName} className="cd-avatar-img" />
                      ) : (
                        <span className="cd-avatar" style={{ background: getAvatarColor(company.createdBy.fullName) }}>
                          {getInitials(company.createdBy.fullName)}
                        </span>
                      )}
                    </div>
                  )}
                  <div className="cd-card-actions" onClick={(e) => e.stopPropagation()}>
                    {(isOwner || canEdit) && (
                      <div className="cd-kebab-wrapper" ref={kebabOpenId === company._id ? kebabRef : null}>
                        <button className="cd-btn-icon" onClick={() => setKebabOpenId(kebabOpenId === company._id ? null : company._id)} title="More options">
                          <FiMoreVertical size={16} />
                        </button>
                        {kebabOpenId === company._id && (
                          <div className="cd-kebab-menu">
                            <button className="cd-kebab-item" onClick={() => { setKebabOpenId(null); handleStartEdit(company); }}>
                              <FiEdit2 size={14} /> Edit
                            </button>
                            <button className="cd-kebab-item cd-kebab-item-danger" onClick={() => { setKebabOpenId(null); setDeleteConfirm(company._id); }}>
                              <FiTrash2 size={14} /> Delete
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {expandedId === company._id && (
                  <div className="cd-card-expanded">
                        {company.contacts && company.contacts.length > 0 ? (
                          <div className="cd-contacts-section">
                            <h4 className="cd-contacts-title">Decision Makers</h4>
                            <div className="cd-contacts-grid">
                              {company.contacts.map((contact, idx) => (
                                <div key={idx} className="cd-contact-card">
                                  <div className="cd-contact-header">
                                    <span className="cd-contact-avatar" style={{ background: getAvatarColor(contact.fullName) }}>
                                      {getInitials(contact.fullName)}
                                    </span>
                                    <div>
                                      <div className="cd-contact-name">{contact.fullName || 'Unnamed'}</div>
                                      {contact.designation && <div className="cd-contact-designation">{contact.designation}</div>}
                                    </div>
                                  </div>
                                  <div className="cd-contact-details">
                                    {contact.email && <span><FiMail size={12} /> {contact.email}</span>}
                                    {contact.phone && <span><FiPhone size={12} /> {contact.phone}</span>}
                                    {contact.socialLinks && contact.socialLinks[0] && (
                                      <a href={contact.socialLinks[0].startsWith('http') ? contact.socialLinks[0] : `https://${contact.socialLinks[0]}`} target="_blank" rel="noopener noreferrer" className="cd-contact-linkedin" title={contact.socialLinks[0]}>
                                        <img src={LinkedInIcon} alt="LinkedIn" className="cd-linkedin-svg-sm" /> LinkedIn
                                      </a>
                                    )}
                                  </div>
                                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 6 }}>
                                    {(contact.labels || []).map(lid => {
                                      const lbl = labels.find(l => l._id === (lid._id || lid));
                                      return lbl ? (
                                        <span key={lbl._id} style={{
                                          display: 'inline-flex', alignItems: 'center', gap: 3, padding: '2px 8px', borderRadius: 12, fontSize: 11, fontWeight: 500,
                                          background: lbl.color + '20', color: lbl.color, border: `1px solid ${lbl.color}40`
                                        }}>
                                          {lbl.name}
                                          {(isOwner || canEdit) && <FiX size={10} style={{ cursor: 'pointer' }} onClick={() => handleToggleContactLabel(company._id, idx, lbl._id, true)} />}
                                        </span>
                                      ) : null;
                                    })}
                                    {(isOwner || canEdit) && (
                                      <div style={{ position: 'relative', display: 'inline-block' }}>
                                        <button className="cd-btn-icon" style={{ width: 22, height: 22, fontSize: 10 }}
                                          onClick={() => {
                                            if (labelAssignCompany === company._id && labelAssignContact === idx) { setLabelAssignCompany(null); setLabelAssignContact(null); }
                                            else { setLabelAssignCompany(company._id); setLabelAssignContact(idx); }
                                          }} title="Add label">
                                          <FiTag size={11} />
                                        </button>
                                        {labelAssignCompany === company._id && labelAssignContact === idx && (
                                          <div style={{ position: 'absolute', top: 26, left: 0, zIndex: 10, background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, boxShadow: '0 4px 12px rgba(0,0,0,0.1)', padding: 6, minWidth: 140 }}>
                                            {labels.map(l => {
                                              const hasIt = (contact.labels || []).some(lid => (lid._id || lid) === l._id);
                                              return (
                                                <div key={l._id} onClick={() => handleToggleContactLabel(company._id, idx, l._id, hasIt)}
                                                  style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 8px', borderRadius: 4, cursor: 'pointer', fontSize: 12, background: hasIt ? l.color + '15' : 'transparent' }}>
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
            );
          })}
        </div>
      )}

      {editingCompany && (
        <div className="cd-edit-modal-overlay" onClick={handleCancelEdit}>
          <div className="cd-edit-modal" onClick={(e) => e.stopPropagation()}>
            <div className="cd-edit-modal-header">
              <h3>Edit Company</h3>
              <button className="cd-btn-icon" onClick={handleCancelEdit}><FiX size={16} /></button>
            </div>
            <div className="cd-edit-modal-body">
              <div className="cd-form-grid">
                <div className="cd-form-group">
                  <label>Company Name</label>
                  <input type="text" value={editFormData.companyName || ''} onChange={e => setEditFormData({ ...editFormData, companyName: e.target.value })} placeholder="Enter company name" />
                </div>
                <div className="cd-form-group">
                  <label>Industry</label>
                  <input type="text" value={editFormData.industry || ''} onChange={e => setEditFormData({ ...editFormData, industry: e.target.value })} placeholder="e.g. Technology, Healthcare" />
                </div>
                <div className="cd-form-group">
                  <label>Email</label>
                  <input type="email" value={editFormData.companyEmail || ''} onChange={e => setEditFormData({ ...editFormData, companyEmail: e.target.value })} placeholder="company@example.com" />
                </div>
                <div className="cd-form-group">
                  <label>Phone</label>
                  <input type="text" value={editFormData.companyPhone || ''} onChange={e => setEditFormData({ ...editFormData, companyPhone: e.target.value })} placeholder="+91 9876543210" />
                </div>
                <div className="cd-form-group">
                  <label>Website</label>
                  <input type="text" value={editFormData.website || ''} onChange={e => setEditFormData({ ...editFormData, website: e.target.value })} placeholder="https://..." />
                </div>
                <div className="cd-form-group">
                  <label>LinkedIn</label>
                  <input type="text" value={editFormData.linkedin || ''} onChange={e => setEditFormData({ ...editFormData, linkedin: e.target.value })} placeholder="https://linkedin.com/..." />
                </div>
                <div className="cd-form-group cd-form-full">
                  <label>Address</label>
                  <input type="text" value={editFormData.address || ''} onChange={e => setEditFormData({ ...editFormData, address: e.target.value })} placeholder="Enter address" />
                </div>
                <div className="cd-form-group cd-form-full">
                  <label>Notes</label>
                  <textarea rows="3" value={editFormData.notes || ''} onChange={e => setEditFormData({ ...editFormData, notes: e.target.value })} placeholder="Add notes..." />
                </div>
              </div>
            </div>
            <div className="cd-edit-modal-footer">
              <button className="cd-btn-ghost" onClick={handleCancelEdit}>Cancel</button>
              <button className="cd-btn-primary" onClick={() => handleSaveEdit(editingCompany)}><FiCheck size={14} /> Save Changes</button>
            </div>
          </div>
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

      {/* ===== Right-side Filter Drawer ===== */}
      {showFilterDrawer && (
        <div className="cd-drawer-overlay" onClick={() => setShowFilterDrawer(false)} />
      )}
      <div className={`cd-filter-drawer${showFilterDrawer ? ' cd-filter-drawer-open' : ''}`}>
        <div className="cd-drawer-header">
          <div className="cd-drawer-title-row">
            <FiSliders size={16} />
            <span className="cd-drawer-title">Filters</span>
            {activeFilterCount > 0 && <span className="cd-filter-count-badge">{activeFilterCount}</span>}
          </div>
          <button className="cd-share-close" onClick={() => setShowFilterDrawer(false)}><FiX size={14} /></button>
        </div>

        <div className="cd-drawer-body">
          {/* Assigned to */}
          <div className="cd-filter-section">
            <button className="cd-filter-section-header" onClick={() => toggleSection('assignedTo')}>
              <span className="cd-filter-section-title">
                Assigned to
                {filterAssignedTo && <span className="cd-filter-badge">1</span>}
              </span>
              <FiChevronDown size={14} className={`cd-section-chevron${openSections.assignedTo ? ' open' : ''}`} />
            </button>
            {openSections.assignedTo && (
              <div className="cd-filter-options">
                {allMembers.map(m => (
                  <label key={m.user?._id} className="cd-filter-checkbox-row">
                    <input type="radio" name="assignedTo" checked={filterAssignedTo === m.user?._id}
                      onChange={() => setFilterAssignedTo(filterAssignedTo === m.user?._id ? '' : m.user?._id)} />
                    <span className="cd-filter-user-row">
                      <span className="cd-filter-avatar" style={{ background: getAvatarColor(m.user?.fullName) }}>
                        {m.user?.profileImage
                          ? <img src={m.user.profileImage} alt={m.user.fullName} className="cd-filter-avatar-img" />
                          : getInitials(m.user?.fullName)}
                      </span>
                      {m.user?.fullName || 'User'}
                    </span>
                  </label>
                ))}
                {allMembers.length === 0 && <p className="cd-filter-empty">No members found</p>}
              </div>
            )}
          </div>

          {/* Industry */}
          <div className="cd-filter-section">
            <button className="cd-filter-section-header" onClick={() => toggleSection('industry')}>
              <span className="cd-filter-section-title">
                Industry
                {filterIndustries.length > 0 && <span className="cd-filter-badge">{filterIndustries.length}</span>}
              </span>
              <FiChevronDown size={14} className={`cd-section-chevron${openSections.industry ? ' open' : ''}`} />
            </button>
            {openSections.industry && (
              <div className="cd-filter-options">
                {uniqueIndustries.length === 0 && <p className="cd-filter-empty">No industries found</p>}
                {uniqueIndustries.map(ind => (
                  <label key={ind} className="cd-filter-checkbox-row">
                    <input type="checkbox" checked={filterIndustries.includes(ind)}
                      onChange={() => setFilterIndustries(prev => prev.includes(ind) ? prev.filter(i => i !== ind) : [...prev, ind])} />
                    <span>{ind}</span>
                    <span className="cd-filter-row-count">{companies.filter(c => c.industry === ind).length}</span>
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Contacts */}
          <div className="cd-filter-section">
            <button className="cd-filter-section-header" onClick={() => toggleSection('contacts')}>
              <span className="cd-filter-section-title">
                Contacts
                {filterContactsMin !== '' && <span className="cd-filter-badge">1</span>}
              </span>
              <FiChevronDown size={14} className={`cd-section-chevron${openSections.contacts ? ' open' : ''}`} />
            </button>
            {openSections.contacts && (
              <div className="cd-filter-options">
                {['1', '2', '3', '5', '10'].map(n => (
                  <label key={n} className="cd-filter-checkbox-row">
                    <input type="radio" name="contacts" checked={filterContactsMin === n}
                      onChange={() => setFilterContactsMin(filterContactsMin === n ? '' : n)} />
                    <span>{n}+ contacts</span>
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Date Added */}
          <div className="cd-filter-section">
            <button className="cd-filter-section-header" onClick={() => toggleSection('dateAdded')}>
              <span className="cd-filter-section-title">
                Date added
                {filterDateAdded && <span className="cd-filter-badge">1</span>}
              </span>
              <FiChevronDown size={14} className={`cd-section-chevron${openSections.dateAdded ? ' open' : ''}`} />
            </button>
            {openSections.dateAdded && (
              <div className="cd-filter-options">
                {[
                  { value: 'today', label: 'Today' },
                  { value: 'week', label: 'Last 7 days' },
                  { value: 'month', label: 'Last 30 days' },
                ].map(opt => (
                  <label key={opt.value} className="cd-filter-checkbox-row">
                    <input type="radio" name="dateAdded" checked={filterDateAdded === opt.value}
                      onChange={() => setFilterDateAdded(filterDateAdded === opt.value ? '' : opt.value)} />
                    <span>{opt.label}</span>
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Has Website */}
          <div className="cd-filter-section">
            <div className="cd-filter-section-header cd-filter-section-header-toggle">
              <span className="cd-filter-section-title">Has website</span>
              <label className="cd-filter-toggle" onClick={e => e.stopPropagation()}>
                <input type="checkbox" checked={filterHasWebsite} onChange={e => setFilterHasWebsite(e.target.checked)} />
                <span className={`cd-toggle-track${filterHasWebsite ? ' active' : ''}`}>
                  <span className="cd-toggle-thumb" />
                </span>
              </label>
            </div>
          </div>

          {/* Sort */}
          <div className="cd-filter-section">
            <button className="cd-filter-section-header" onClick={() => toggleSection('sort')}>
              <span className="cd-filter-section-title">
                Sort
                {sortOrder !== 'az' && <span className="cd-filter-badge">1</span>}
              </span>
              <FiChevronDown size={14} className={`cd-section-chevron${openSections.sort ? ' open' : ''}`} />
            </button>
            {openSections.sort && (
              <div className="cd-filter-options">
                {[
                  { value: 'az', label: 'A → Z' },
                  { value: 'za', label: 'Z → A' },
                  { value: 'newest', label: 'Newest first' },
                  { value: 'oldest', label: 'Oldest first' },
                ].map(opt => (
                  <label key={opt.value} className="cd-filter-checkbox-row">
                    <input type="radio" name="sort" checked={sortOrder === opt.value}
                      onChange={() => setSortOrder(opt.value)} />
                    <span>{opt.label}</span>
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Label filter */}
          {labels.length > 0 && (
            <div className="cd-filter-section">
              <button className="cd-filter-section-header" onClick={() => toggleSection('label')}>
                <span className="cd-filter-section-title">
                  Label
                  {labelFilter && <span className="cd-filter-badge">1</span>}
                </span>
                <FiChevronDown size={14} className={`cd-section-chevron${openSections.label ? ' open' : ''}`} />
              </button>
              {openSections.label && (
                <div className="cd-filter-options">
                  {labels.map(l => (
                    <label key={l._id} className="cd-filter-checkbox-row">
                      <input type="radio" name="label" checked={labelFilter === l._id}
                        onChange={() => setLabelFilter(labelFilter === l._id ? '' : l._id)} />
                      <span className="cd-filter-label-row">
                        <span className="cd-filter-label-dot" style={{ background: l.color }} />
                        {l.name}
                      </span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="cd-drawer-footer">
          <button className="cd-btn-ghost" onClick={clearAllFilters}>Clear All</button>
          <button className="cd-btn-primary" onClick={() => setShowFilterDrawer(false)}>
            Apply{activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}
          </button>
        </div>
      </div>
    </div>
  );
}

export default CompanyDataList;
