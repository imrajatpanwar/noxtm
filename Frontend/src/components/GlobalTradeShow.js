import React, { useState, useEffect, useRef, useMemo } from 'react';
import './GlobalTradeShow.css';
import noTradeShowImage from './image/no-tradeshow.svg';
import uploadIcon from './image/upload_icon.svg';
import defaultAvatar from './image/default-avatar.svg';
import api from '../config/api';
import {
  FiDownload, FiPlus, FiX, FiCalendar, FiMapPin,
  FiSearch, FiInfo, FiUpload, FiTrash2,
  FiLayers, FiClock, FiShield, FiFilter,
  FiChevronDown, FiUsers, FiEdit
} from 'react-icons/fi';

const INDUSTRY_OPTIONS = [
  'Solar-Energy Industry', 'Fashion Industry', 'Rail Industry', 'Education Industry',
  'Technology Industry', 'Cleaning Management Industry', 'Retail Industry', 'Wedding Industry',
  'Travel & Tourism Industry', 'Minerals Industry', 'Future Battery Technology', 'Food Industry',
  'Agriculture Industry', 'Sports Industry', 'Investment Industry', 'Electric Mobility',
  'Oil & Gas Industry', 'Air Travel Industry', 'Global Retail Industry', 'Healthcare Industry',
  'Automotive Industry', 'Electrical Manufacturing', 'Job and Career Industry',
  'Aerospace and Defense Industry', 'Manufacturing Industry', 'Finance Industry',
  'Beauty Industry', 'Battery Technology Industry', 'Autonomous Vehicle Industry', 'Other Industry'
];

const DATE_FILTERS = [
  { label: 'All Dates', value: 'all' },
  { label: 'Upcoming', value: 'upcoming' },
  { label: 'Past', value: 'past' },
  { label: 'This Month', value: 'thisMonth' },
  { label: 'Next 3 Months', value: 'next3' },
  { label: 'Next 6 Months', value: 'next6' }
];

function GlobalTradeShow({ onNavigate }) {
  const [shows, setShows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [companyUsers, setCompanyUsers] = useState([]);
  const [showsWithExhibitors, setShowsWithExhibitors] = useState({});

  // Filters
  const [filterIndustry, setFilterIndustry] = useState('');
  const [filterLocation, setFilterLocation] = useState('');
  const [filterDate, setFilterDate] = useState('all');
  const [showFilters, setShowFilters] = useState(false);
  const [ddFilterIndustry, setDdFilterIndustry] = useState(false);
  const [ddFilterDate, setDdFilterDate] = useState(false);
  const [ddFilterLocation, setDdFilterLocation] = useState(false);

  // Form
  const [formData, setFormData] = useState({
    shortName: '', fullName: '', showDate: '', location: '',
    exhibitors: '', attendees: '', industry: '',
    eacDeadline: '', earlyBirdDeadline: '', showLogo: null, floorPlan: null
  });
  const [logoPreview, setLogoPreview] = useState(null);
  const [floorPlanName, setFloorPlanName] = useState('');
  const [errors, setErrors] = useState({});
  const [isDragging, setIsDragging] = useState(false);

  // Access people
  const [selAccess, setSelAccess] = useState([]);
  const [ddAccess, setDdAccess] = useState(false);
  const [accSearch, setAccSearch] = useState('');

  // Industry
  const [indSearch, setIndSearch] = useState('');
  const [ddIndustry, setDdIndustry] = useState(false);
  const indRef = useRef(null);

  // About panel
  const [aboutPanel, setAboutPanel] = useState({ open: false, data: null });

  useEffect(() => { fetchShows(); fetchUsers(); }, []);

  useEffect(() => {
    const close = (e) => {
      if (!e.target.closest('.gts-dd-wrap')) { setDdAccess(false); setDdIndustry(false); }
      if (!e.target.closest('.gts-fdd-wrap')) { setDdFilterIndustry(false); setDdFilterDate(false); setDdFilterLocation(false); }
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const fetchShows = async () => {
    try {
      setLoading(true);
      const r = await api.get('/trade-shows');
      const tradeShows = r.data.tradeShows || [];
      setShows(tradeShows);
      
      // Fetch exhibitor count for each trade show
      tradeShows.forEach(async (show) => {
        try {
          const exhibitorsRes = await api.get(`/contact-lists/import/trade-shows/${show._id}/exhibitors`);
          const actualCount = exhibitorsRes.data.exhibitors?.length || 0;
          setShowsWithExhibitors(prev => ({ ...prev, [show._id]: actualCount }));
        } catch (e) { console.error(`Failed to fetch exhibitors for ${show._id}`, e); }
      });
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const fetchUsers = async () => {
    try {
      const r = await api.get('/company/members');
      const d = r.data;
      setCompanyUsers((d.members || []).map(u => ({ ...u, name: u.fullName || u.name, profilePicture: u.profileImage || u.profilePicture })));
    } catch (e) { console.error(e); }
  };

  const resetForm = () => {
    setFormData({ shortName: '', fullName: '', showDate: '', location: '', exhibitors: '', attendees: '', industry: '', eacDeadline: '', earlyBirdDeadline: '', showLogo: null, floorPlan: null });
    setLogoPreview(null); setFloorPlanName(''); setErrors({});
    setSelAccess([]);
    setIndSearch(''); setAccSearch('');
  };

  const openModal = () => { resetForm(); setShowModal(true); };
  const closeModal = () => { setShowModal(false); resetForm(); };

  const handleInput = (e) => {
    const { name, value } = e.target;
    setFormData(p => ({ ...p, [name]: value }));
    if (errors[name]) setErrors(p => ({ ...p, [name]: '' }));
  };

  const handleLogo = (file) => {
    if (!file) return;
    const ok = ['image/jpeg', 'image/jpg', 'image/png', 'image/svg+xml'];
    if (!ok.includes(file.type)) { setErrors(p => ({ ...p, showLogo: 'Only JPG, PNG, SVG' })); return; }
    if (file.size > 100 * 1024) { setErrors(p => ({ ...p, showLogo: 'Max 100KB' })); return; }
    setErrors(p => ({ ...p, showLogo: '' }));
    setFormData(p => ({ ...p, showLogo: file }));
    const rd = new FileReader(); rd.onloadend = () => setLogoPreview(rd.result); rd.readAsDataURL(file);
  };

  const handleFloorPlan = (e) => {
    const file = e.target.files[0]; if (!file) return;
    const ok = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
    if (!ok.includes(file.type)) { setErrors(p => ({ ...p, floorPlan: 'Only PDF, JPG, PNG' })); return; }
    if (file.size > 10 * 1024 * 1024) { setErrors(p => ({ ...p, floorPlan: 'Max 10MB' })); return; }
    setErrors(p => ({ ...p, floorPlan: '' }));
    setFormData(p => ({ ...p, floorPlan: file })); setFloorPlanName(file.name);
  };

  const addUser = (u) => {
    if (!selAccess.find(x => x._id === u._id)) setSelAccess(p => [...p, u]); setDdAccess(false); setAccSearch('');
  };
  const rmUser = (id) => { setSelAccess(p => p.filter(u => u._id !== id)); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const er = {};
    if (!formData.shortName.trim()) er.shortName = 'Required';
    if (!formData.fullName.trim()) er.fullName = 'Required';
    if (!formData.showDate) er.showDate = 'Required';
    if (!formData.location.trim()) er.location = 'Required';
    if (Object.keys(er).length) { setErrors(er); return; }

    setSaving(true);
    try {
      const fd = new FormData();
      fd.append('shortName', formData.shortName); fd.append('fullName', formData.fullName);
      fd.append('showDate', formData.showDate); fd.append('location', formData.location);
      if (formData.exhibitors) fd.append('exhibitors', formData.exhibitors);
      if (formData.attendees) fd.append('attendees', formData.attendees);
      if (formData.industry) fd.append('industry', formData.industry);
      if (formData.eacDeadline) fd.append('eacDeadline', formData.eacDeadline);
      if (formData.earlyBirdDeadline) fd.append('earlyBirdDeadline', formData.earlyBirdDeadline);
      if (formData.showLogo) fd.append('showLogo', formData.showLogo);
      if (formData.floorPlan) fd.append('floorPlan', formData.floorPlan);
      if (selAccess.length) fd.append('showAccessPeople', JSON.stringify(selAccess.map(u => u._id)));

      const r = await api.post('/trade-shows', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      await fetchShows(); closeModal();
    } catch (err) { setErrors({ general: err.response?.data?.message || 'Error creating trade show' }); } finally { setSaving(false); }
  };

  const deleteShow = async (id, e) => {
    e.stopPropagation();
    if (!window.confirm('Delete this trade show and all its exhibitors?')) return;
    try {
      await api.delete(`/trade-shows/${id}`);
      fetchShows();
    } catch (e) { console.error(e); }
  };

  const filtered = useMemo(() => {
    let result = shows.filter(s =>
      s.shortName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.fullName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.location?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.industry?.toLowerCase().includes(searchQuery.toLowerCase())
    );
    // Industry filter
    if (filterIndustry) {
      result = result.filter(s => s.industry === filterIndustry);
    }
    // Location filter
    if (filterLocation) {
      result = result.filter(s => s.location?.toLowerCase().includes(filterLocation.toLowerCase()));
    }
    // Date filter
    if (filterDate !== 'all') {
      const now = new Date();
      result = result.filter(s => {
        if (!s.showDate) return false;
        const d = new Date(s.showDate);
        switch (filterDate) {
          case 'upcoming': return d >= now;
          case 'past': return d < now;
          case 'thisMonth': return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
          case 'next3': { const limit = new Date(); limit.setMonth(limit.getMonth() + 3); return d >= now && d <= limit; }
          case 'next6': { const limit = new Date(); limit.setMonth(limit.getMonth() + 6); return d >= now && d <= limit; }
          default: return true;
        }
      });
    }
    return result;
  }, [shows, searchQuery, filterIndustry, filterLocation, filterDate]);

  const activeFilterCount = (filterIndustry ? 1 : 0) + (filterLocation ? 1 : 0) + (filterDate !== 'all' ? 1 : 0);
  const clearFilters = () => { setFilterIndustry(''); setFilterLocation(''); setFilterDate('all'); };

  // Unique locations from shows
  const uniqueLocations = useMemo(() => {
    const locs = [...new Set(shows.map(s => s.location).filter(Boolean))];
    return locs.sort();
  }, [shows]);

  // Unique industries from shows
  const uniqueIndustries = useMemo(() => {
    const inds = [...new Set(shows.map(s => s.industry).filter(Boolean))];
    return inds.sort();
  }, [shows]);

  const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A';
  const getDays = (d) => {
    if (!d) return null;
    const diff = Math.ceil((new Date(d) - new Date()) / 86400000);
    if (diff < 0) return { text: 'Passed', cls: 'past' };
    if (diff <= 7) return { text: `${diff}d`, cls: 'urgent' };
    if (diff <= 30) return { text: `${diff}d`, cls: 'soon' };
    return { text: `${diff}d`, cls: 'ok' };
  };
  const av = (u) => u.profilePicture || u.profileImage || defaultAvatar;

  const filteredInd = INDUSTRY_OPTIONS.filter(o => o.toLowerCase().includes(indSearch.toLowerCase()));
  const filteredAcc = companyUsers.filter(u => !selAccess.find(s => s._id === u._id) && (u.name?.toLowerCase().includes(accSearch.toLowerCase()) || u.email?.toLowerCase().includes(accSearch.toLowerCase())));

  return (
    <div className="gts">
      {/* Header */}
      <div className="gts-head">
        <div className="gts-head-l">
          <div className="gts-head-icon"><FiLayers size={20} /></div>
          <div>
            <h1>Global Trade Shows</h1>
            <p className="gts-head-sub">{shows.length} trade show{shows.length !== 1 ? 's' : ''} total{filtered.length !== shows.length ? ` · ${filtered.length} shown` : ''}</p>
          </div>
        </div>
        <div className="gts-head-r">
          <div className="gts-srch">
            <FiSearch size={15} />
            <input placeholder="Search by name, location, industry..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
            {searchQuery && <button className="gts-srch-clear" onClick={() => setSearchQuery('')}><FiX size={14} /></button>}
          </div>
          <button className={`gts-filter-btn ${showFilters ? 'active' : ''} ${activeFilterCount > 0 ? 'has-filters' : ''}`} onClick={() => setShowFilters(!showFilters)}>
            <FiFilter size={14} />
            <span>Filters</span>
            {activeFilterCount > 0 && <span className="gts-filter-count">{activeFilterCount}</span>}
          </button>
          <button className="gts-add" onClick={openModal}><FiPlus size={16} /> Add Trade Show</button>
        </div>
      </div>

      {/* Filter Bar */}
      {showFilters && (
        <div className="gts-filters">
          <div className="gts-filters-row">
            {/* Industry Filter */}
            <div className="gts-fdd-wrap">
              <button className={`gts-fdd-trigger ${filterIndustry ? 'active' : ''}`} onClick={() => { setDdFilterIndustry(!ddFilterIndustry); setDdFilterDate(false); setDdFilterLocation(false); }}>
                <FiLayers size={13} />
                <span>{filterIndustry || 'All Industries'}</span>
                <FiChevronDown size={13} className={ddFilterIndustry ? 'rotated' : ''} />
              </button>
              {ddFilterIndustry && (
                <div className="gts-fdd">
                  <div className="gts-fdd-item" onClick={() => { setFilterIndustry(''); setDdFilterIndustry(false); }}>
                    <span>All Industries</span>
                    {!filterIndustry && <span className="gts-fdd-check">✓</span>}
                  </div>
                  {uniqueIndustries.map(ind => (
                    <div key={ind} className={`gts-fdd-item ${filterIndustry === ind ? 'selected' : ''}`} onClick={() => { setFilterIndustry(ind); setDdFilterIndustry(false); }}>
                      <span>{ind}</span>
                      {filterIndustry === ind && <span className="gts-fdd-check">✓</span>}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Location Filter */}
            <div className="gts-fdd-wrap">
              <button className={`gts-fdd-trigger ${filterLocation ? 'active' : ''}`} onClick={() => { setDdFilterLocation(!ddFilterLocation); setDdFilterIndustry(false); setDdFilterDate(false); }}>
                <FiMapPin size={13} />
                <span>{filterLocation || 'All Locations'}</span>
                <FiChevronDown size={13} className={ddFilterLocation ? 'rotated' : ''} />
              </button>
              {ddFilterLocation && (
                <div className="gts-fdd">
                  <div className="gts-fdd-item" onClick={() => { setFilterLocation(''); setDdFilterLocation(false); }}>
                    <span>All Locations</span>
                    {!filterLocation && <span className="gts-fdd-check">✓</span>}
                  </div>
                  {uniqueLocations.map(loc => (
                    <div key={loc} className={`gts-fdd-item ${filterLocation === loc ? 'selected' : ''}`} onClick={() => { setFilterLocation(loc); setDdFilterLocation(false); }}>
                      <span>{loc}</span>
                      {filterLocation === loc && <span className="gts-fdd-check">✓</span>}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Date Filter */}
            <div className="gts-fdd-wrap">
              <button className={`gts-fdd-trigger ${filterDate !== 'all' ? 'active' : ''}`} onClick={() => { setDdFilterDate(!ddFilterDate); setDdFilterIndustry(false); setDdFilterLocation(false); }}>
                <FiCalendar size={13} />
                <span>{DATE_FILTERS.find(d => d.value === filterDate)?.label || 'All Dates'}</span>
                <FiChevronDown size={13} className={ddFilterDate ? 'rotated' : ''} />
              </button>
              {ddFilterDate && (
                <div className="gts-fdd">
                  {DATE_FILTERS.map(df => (
                    <div key={df.value} className={`gts-fdd-item ${filterDate === df.value ? 'selected' : ''}`} onClick={() => { setFilterDate(df.value); setDdFilterDate(false); }}>
                      <span>{df.label}</span>
                      {filterDate === df.value && <span className="gts-fdd-check">✓</span>}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {activeFilterCount > 0 && (
              <button className="gts-clear-filters" onClick={clearFilters}>
                <FiX size={13} /> Clear all
              </button>
            )}
          </div>

          {/* Active filter tags */}
          {activeFilterCount > 0 && (
            <div className="gts-filter-tags">
              {filterIndustry && (
                <span className="gts-filter-tag">
                  <FiLayers size={11} /> {filterIndustry}
                  <button onClick={() => setFilterIndustry('')}><FiX size={11} /></button>
                </span>
              )}
              {filterLocation && (
                <span className="gts-filter-tag">
                  <FiMapPin size={11} /> {filterLocation}
                  <button onClick={() => setFilterLocation('')}><FiX size={11} /></button>
                </span>
              )}
              {filterDate !== 'all' && (
                <span className="gts-filter-tag">
                  <FiCalendar size={11} /> {DATE_FILTERS.find(d => d.value === filterDate)?.label}
                  <button onClick={() => setFilterDate('all')}><FiX size={11} /></button>
                </span>
              )}
            </div>
          )}
        </div>
      )}

      {/* Table Header */}
      {!loading && filtered.length > 0 && (
        <div className="gts-table-head">
          <div className="gts-th-name">Trade Show</div>
          <div className="gts-th-industry">Industry</div>
          <div className="gts-th-date">Date & Location</div>
          <div className="gts-th-stats">Statistics</div>
          <div className="gts-th-access">Access</div>
          <div className="gts-th-actions"></div>
        </div>
      )}

      {/* Shows List */}
      {loading ? (
        <div className="gts-load"><div className="gts-spin" /><p>Loading trade shows...</p></div>
      ) : filtered.length > 0 ? (
        <div className="gts-list">
          {filtered.map(s => {
            const cd = getDays(s.showDate);
            return (
              <div key={s._id} className="gts-card" onClick={() => onNavigate && onNavigate('exhibitor-list', s)}>
                {/* Trade Show Name */}
                <div className="gts-card-head">
                  <div className="gts-card-logo">
                    {s.showLogo?.path ? <img src={s.showLogo.path} alt="" /> : (
                      <div className="gts-card-logo-ph">{s.shortName?.substring(0, 3).toUpperCase() || 'TS'}</div>
                    )}
                  </div>
                  <div className="gts-card-title">
                    <h3>{s.shortName}</h3>
                    <p>{s.fullName}</p>
                  </div>
                </div>

                {/* Industry */}
                <div className="gts-card-industry">
                  {s.industry ? <span className="gts-tag">{s.industry}</span> : <span className="gts-tag-empty">—</span>}
                </div>

                {/* Date & Location */}
                <div className="gts-card-meta">
                  <div className="gts-card-row"><FiCalendar size={12} /><span>{fmtDate(s.showDate)}</span>{cd && <span className={`gts-cd ${cd.cls}`}>{cd.text}</span>}</div>
                  <div className="gts-card-row"><FiMapPin size={12} /><span>{s.location}</span></div>
                </div>

                {/* Stats */}
                <div className="gts-card-nums">
                  <div className="gts-stat">
                    <FiUsers size={12} className="gts-stat-icon" />
                    <div>
                      <strong>{showsWithExhibitors[s._id] !== undefined ? `${showsWithExhibitors[s._id]}/${s.exhibitors || '0'}` : (s.exhibitors || '0')}</strong>
                      <span>Exhibitors</span>
                    </div>
                  </div>
                  <div className="gts-stat">
                    <FiUsers size={12} className="gts-stat-icon" />
                    <div>
                      <strong>{s.attendees || '0'}</strong>
                      <span>Attendees</span>
                    </div>
                  </div>
                </div>

                {/* Access */}
                <div className="gts-card-foot">
                  <div className="gts-avs" title={`${s.showAccessPeople?.length || 0} people have access`}>
                    {(s.showAccessPeople?.slice(0, 3) || []).map((u, i) => (
                      <div key={u._id || i} className="gts-av"><img src={u.profileImage || defaultAvatar} alt="" /></div>
                    ))}
                    {(s.showAccessPeople?.length || 0) > 3 && <div className="gts-av gts-av-more">+{s.showAccessPeople.length - 3}</div>}
                    {(s.showAccessPeople?.length || 0) === 0 && <span className="gts-no-access">—</span>}
                  </div>
                </div>

                {/* Actions */}
                <div className="gts-card-acts" onClick={e => e.stopPropagation()}>
                  <button onClick={() => setAboutPanel({ open: true, data: s })} title="About"><FiInfo size={14} /></button>
                  {s.floorPlan?.path && (
                    <a href={s.floorPlan.path} download onClick={e => e.stopPropagation()} className="gts-act-dl" title="Floor Plan"><FiDownload size={14} /></a>
                  )}
                  <button className="del" onClick={(e) => deleteShow(s._id, e)} title="Delete"><FiTrash2 size={14} /></button>
                </div>
              </div>
            );
          })}
        </div>
      ) : !showModal && (
        <div className="gts-empty">
          <img src={noTradeShowImage} alt="" />
          <h3>{activeFilterCount > 0 || searchQuery ? 'No matching trade shows' : 'No Trade Shows Yet'}</h3>
          <p>{activeFilterCount > 0 || searchQuery ? 'Try adjusting your filters or search query.' : 'Create your first trade show to start managing exhibitors.'}</p>
          {activeFilterCount > 0 || searchQuery ? (
            <button className="gts-add" onClick={() => { clearFilters(); setSearchQuery(''); }}><FiX size={16} /> Clear Filters</button>
          ) : (
            <button className="gts-add" onClick={openModal}><FiPlus size={16} /> Create Trade Show</button>
          )}
        </div>
      )}

      {/* Create Modal */}
      {showModal && (
        <div className="noxtm-overlay" onClick={closeModal}>
          <div className="gts-modal" onClick={e => e.stopPropagation()}>
            <div className="gts-mh">
              <h2>Create Trade Show</h2>
              <button onClick={closeModal}><FiX size={18} /></button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="gts-mb">
                {errors.general && <div className="gts-err">{errors.general}</div>}

                {/* Top: Logo + Basic */}
                <div className="gts-form-top">
                  <div>
                    <div className={`gts-logo-up ${isDragging ? 'drag' : ''}`}
                      onClick={() => document.getElementById('gts-logo-in').click()}
                      onDragEnter={e => { e.preventDefault(); setIsDragging(true); }}
                      onDragOver={e => e.preventDefault()}
                      onDragLeave={e => { e.preventDefault(); setIsDragging(false); }}
                      onDrop={e => { e.preventDefault(); setIsDragging(false); handleLogo(e.dataTransfer.files[0]); }}
                    >
                      {logoPreview ? <img src={logoPreview} alt="" className="gts-logo-prev" /> : (
                        <><img src={uploadIcon} alt="" className="gts-up-ico" /><span className="gts-up-t">Drop logo</span><span className="gts-up-h">JPG, PNG, SVG · 100KB</span></>
                      )}
                      <input id="gts-logo-in" type="file" accept="image/jpeg,image/jpg,image/png,image/svg+xml" onChange={e => handleLogo(e.target.files[0])} hidden />
                    </div>
                    {errors.showLogo && <p className="gts-ferr">{errors.showLogo}</p>}
                  </div>

                  <div className="gts-form-basic">
                    <div className="gts-f">
                      <label>Short Name <span className="req">*</span></label>
                      <input name="shortName" value={formData.shortName} onChange={handleInput} placeholder="e.g. CES 2026" className={errors.shortName ? 'err' : ''} />
                      {errors.shortName && <span className="gts-ferr">{errors.shortName}</span>}
                    </div>
                    <div className="gts-f">
                      <label>Full Name <span className="req">*</span></label>
                      <input name="fullName" value={formData.fullName} onChange={handleInput} placeholder="e.g. Consumer Electronics Show" className={errors.fullName ? 'err' : ''} />
                      {errors.fullName && <span className="gts-ferr">{errors.fullName}</span>}
                    </div>
                    <div className="gts-r2">
                      <div className="gts-f">
                        <label>Date <span className="req">*</span></label>
                        <input type="date" name="showDate" value={formData.showDate} onChange={handleInput} className={errors.showDate ? 'err' : ''} />
                        {errors.showDate && <span className="gts-ferr">{errors.showDate}</span>}
                      </div>
                      <div className="gts-f">
                        <label>Location <span className="req">*</span></label>
                        <input name="location" value={formData.location} onChange={handleInput} placeholder="City, Country" className={errors.location ? 'err' : ''} />
                        {errors.location && <span className="gts-ferr">{errors.location}</span>}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Details */}
                <div className="gts-sec">
                  <h4><FiLayers size={14} /> Show Details</h4>
                  <div className="gts-r3">
                    <div className="gts-f"><label>Exhibitors</label><input name="exhibitors" value={formData.exhibitors} onChange={handleInput} placeholder="e.g. 1400" /></div>
                    <div className="gts-f"><label>Attendees</label><input name="attendees" value={formData.attendees} onChange={handleInput} placeholder="e.g. 142,000" /></div>
                    <div className="gts-f">
                      <label>Floor Plan</label>
                      <button type="button" className="gts-file-btn" onClick={() => document.getElementById('gts-fp-in').click()}>
                        <FiUpload size={14} /> {floorPlanName || 'Choose File'}
                      </button>
                      <input id="gts-fp-in" type="file" accept="application/pdf,image/jpeg,image/jpg,image/png" onChange={handleFloorPlan} hidden />
                      {errors.floorPlan && <span className="gts-ferr">{errors.floorPlan}</span>}
                    </div>
                  </div>
                </div>

                {/* Deadlines + Industry */}
                <div className="gts-sec">
                  <h4><FiClock size={14} /> Deadlines & Industry</h4>
                  <div className="gts-r3">
                    <div className="gts-f"><label>EAC Deadline</label><input type="date" name="eacDeadline" value={formData.eacDeadline} onChange={handleInput} /></div>
                    <div className="gts-f"><label>Early-Bird Deadline</label><input type="date" name="earlyBirdDeadline" value={formData.earlyBirdDeadline} onChange={handleInput} /></div>
                    <div className="gts-f gts-dd-wrap" ref={indRef}>
                      <label>Industry</label>
                      <input value={indSearch || formData.industry}
                        onChange={e => { setIndSearch(e.target.value); setDdIndustry(true); }}
                        onFocus={() => { setDdIndustry(true); setDdAccess(false); setDdLeads(false); }}
                        placeholder="Search industry..." />
                      {ddIndustry && (
                        <div className="gts-dd">
                          {filteredInd.length ? filteredInd.map((o, i) => (
                            <div key={i} className="gts-dd-i" onClick={() => { setFormData(p => ({ ...p, industry: o })); setIndSearch(''); setDdIndustry(false); }}>{o}</div>
                          )) : <div className="gts-dd-e">No matches</div>}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Access */}
                <div className="gts-sec">
                  <h4><FiShield size={14} /> Access Control</h4>
                  <div className="gts-f gts-dd-wrap">
                    <label>Show Access</label>
                    {selAccess.length > 0 && <div className="gts-chips">{selAccess.map(u => (
                      <div key={u._id} className="gts-chip-u"><img src={av(u)} alt="" /><span>{u.name}</span><button type="button" onClick={() => rmUser(u._id)}><FiX size={11} /></button></div>
                    ))}</div>}
                    <input value={accSearch} onChange={e => setAccSearch(e.target.value)}
                      onFocus={() => { setDdAccess(true); setDdIndustry(false); }} placeholder="Search people..." />
                    {ddAccess && <div className="gts-dd">{filteredAcc.length ? filteredAcc.map(u => (
                      <div key={u._id} className="gts-dd-i gts-dd-u" onClick={() => addUser(u)}>
                        <img src={av(u)} alt="" /><div><div className="gts-dd-n">{u.name}</div><div className="gts-dd-em">{u.email}</div></div>
                      </div>
                    )) : <div className="gts-dd-e">No users</div>}</div>}
                  </div>
                </div>
              </div>

              <div className="gts-mf">
                <button type="button" className="gts-btn-c" onClick={closeModal} disabled={saving}>Cancel</button>
                <button type="submit" className="gts-btn-s" disabled={saving}>{saving ? 'Creating...' : 'Create Trade Show'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* About Panel */}
      {aboutPanel.open && aboutPanel.data && (() => {
        const sh = aboutPanel.data;
        return (
          <>
            <div className="noxtm-overlay--panel" onClick={() => setAboutPanel({ open: false, data: null })} />
            <div className="gts-panel">
              <div className="gts-ph">
                <div className="gts-ph-info">
                  {sh.showLogo?.path ? <img src={sh.showLogo.path} alt="" className="gts-ph-logo" /> : (
                    <div className="gts-ph-logo-ph">{sh.shortName?.substring(0, 3).toUpperCase()}</div>
                  )}
                  <div><h2>{sh.shortName}</h2><p>{sh.fullName}</p></div>
                </div>
                <div className="gts-ph-actions">
                  <button className="gts-ph-edit" onClick={() => { /* TODO: Open edit modal */ }} title="Edit Trade Show"><FiEdit size={16} /></button>
                  <button className="gts-ph-delete" onClick={(e) => { setAboutPanel({ open: false, data: null }); deleteShow(sh._id, e); }} title="Delete Trade Show"><FiTrash2 size={16} /></button>
                  <button className="gts-ph-close" onClick={() => setAboutPanel({ open: false, data: null })} title="Close"><FiX size={18} /></button>
                </div>
              </div>
              <div className="gts-pb">
                <div className="gts-ps">
                  <h4>Event Details</h4>
                  <div className="gts-pg">
                    <div className="gts-pi"><label><FiCalendar size={12} /> Date</label><p>{fmtDate(sh.showDate)}</p></div>
                    <div className="gts-pi"><label><FiMapPin size={12} /> Location</label><p>{sh.location || 'N/A'}</p></div>
                    <div className="gts-pi"><label>Industry</label><p>{sh.industry || 'N/A'}</p></div>
                  </div>
                </div>
                <div className="gts-ps">
                  <h4>Statistics</h4>
                  <div className="gts-pst">
                    <div className="gts-pst-box"><strong>{sh.exhibitors || '—'}</strong><span>Exhibitors</span></div>
                    <div className="gts-pst-box"><strong>{sh.attendees || '—'}</strong><span>Attendees</span></div>
                  </div>
                </div>
                {(sh.eacDeadline || sh.earlyBirdDeadline) && (
                  <div className="gts-ps">
                    <h4>Key Deadlines</h4>
                    <div className="gts-pg">
                      {sh.eacDeadline && <div className="gts-pi"><label>EAC Registration</label><p>{fmtDate(sh.eacDeadline)}</p></div>}
                      {sh.earlyBirdDeadline && <div className="gts-pi"><label>Early-Bird</label><p>{fmtDate(sh.earlyBirdDeadline)}</p></div>}
                    </div>
                  </div>
                )}
                {sh.floorPlan?.path && (
                  <div className="gts-ps">
                    <h4>Floor Plan</h4>
                    <a href={sh.floorPlan.path} download className="gts-pdl"><FiDownload size={15} /> Download Floor Plan</a>
                  </div>
                )}
                {(sh.showAccessPeople?.length > 0) && (
                  <div className="gts-ps">
                    <h4>Access</h4>
                    {sh.showAccessPeople?.length > 0 && (
                      <div className="gts-pp"><label>Show Access</label><div className="gts-pp-list">{sh.showAccessPeople.map((u, i) => (
                        <div key={u._id || i} className="gts-pp-item"><img src={u.profileImage || defaultAvatar} alt="" /><span>{u.fullName || u.name || 'User'}</span></div>
                      ))}</div></div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </>
        );
      })()}
    </div>
  );
}

export default GlobalTradeShow;
