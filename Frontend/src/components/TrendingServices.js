import React, { useState, useEffect, useRef, useMemo } from 'react';
import './GlobalTradeShow.css';
import noTradeShowImage from './image/no-tradeshow.svg';
import uploadIcon from './image/upload_icon.svg';
import defaultAvatar from './image/default-avatar.svg';
import api from '../config/api';
import {
  FiPlus, FiX, FiMapPin,
  FiSearch, FiInfo, FiTrash2,
  FiLayers, FiShield, FiFilter,
  FiChevronDown, FiUsers, FiEdit
} from 'react-icons/fi';

const INDUSTRY_OPTIONS = [
  'Digital Marketing', 'SEO Services', 'Social Media Marketing', 'Content Marketing',
  'Email Marketing', 'PPC Advertising', 'Web Development', 'App Development',
  'Graphic Design', 'Branding', 'PR & Communications', 'Video Production',
  'Influencer Marketing', 'E-commerce', 'Analytics & Data', 'Marketing Automation',
  'Lead Generation', 'Affiliate Marketing', 'Conversion Optimization', 'UI/UX Design',
  'Cloud Services', 'Cybersecurity', 'AI & Machine Learning', 'SaaS',
  'Consulting', 'Event Marketing', 'Print & Media', 'Other'
];

function TrendingServices({ onNavigate }) {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [companyUsers, setCompanyUsers] = useState([]);
  const [servicesWithCompanies, setServicesWithCompanies] = useState({});

  // Filters
  const [filterIndustry, setFilterIndustry] = useState('');
  const [filterLocation, setFilterLocation] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [ddFilterIndustry, setDdFilterIndustry] = useState(false);
  const [ddFilterLocation, setDdFilterLocation] = useState(false);

  // Form
  const [formData, setFormData] = useState({
    serviceName: '', fullName: '', location: '',
    industry: '', serviceLogo: null
  });
  const [logoPreview, setLogoPreview] = useState(null);
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

  // Quick Add Company modal
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [quickSaving, setQuickSaving] = useState(false);
  const [quickForm, setQuickForm] = useState({
    categoryId: '', companyName: '', location: '', companyEmail: '', website: '', options: '',
    contacts: [{ fullName: '', designation: '', phone: '', email: '', location: '' }]
  });
  const [quickErrors, setQuickErrors] = useState({});

  useEffect(() => { fetchServices(); fetchUsers(); }, []);

  useEffect(() => {
    const close = (e) => {
      if (!e.target.closest('.gts-dd-wrap')) { setDdAccess(false); setDdIndustry(false); }
      if (!e.target.closest('.gts-fdd-wrap')) { setDdFilterIndustry(false); setDdFilterLocation(false); }
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const fetchServices = async () => {
    try {
      setLoading(true);
      const r = await api.get('/trending-services');
      const trendingServices = r.data.trendingServices || [];
      setServices(trendingServices);

      // Fetch targeted company count for each trending service
      trendingServices.forEach(async (svc) => {
        try {
          const companiesRes = await api.get(`/trending-services/${svc._id}/targeted-companies`);
          const actualCount = companiesRes.data.targetedCompanies?.length || 0;
          setServicesWithCompanies(prev => ({ ...prev, [svc._id]: actualCount }));
        } catch (e) { console.error(`Failed to fetch companies for ${svc._id}`, e); }
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
    setFormData({ serviceName: '', fullName: '', location: '', industry: '', serviceLogo: null });
    setLogoPreview(null); setErrors({});
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
    if (!ok.includes(file.type)) { setErrors(p => ({ ...p, serviceLogo: 'Only JPG, PNG, SVG' })); return; }
    if (file.size > 100 * 1024) { setErrors(p => ({ ...p, serviceLogo: 'Max 100KB' })); return; }
    setErrors(p => ({ ...p, serviceLogo: '' }));
    setFormData(p => ({ ...p, serviceLogo: file }));
    const rd = new FileReader(); rd.onloadend = () => setLogoPreview(rd.result); rd.readAsDataURL(file);
  };

  const addUser = (u) => {
    if (!selAccess.find(x => x._id === u._id)) setSelAccess(p => [...p, u]); setDdAccess(false); setAccSearch('');
  };
  const rmUser = (id) => { setSelAccess(p => p.filter(u => u._id !== id)); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const er = {};
    if (!formData.serviceName.trim()) er.serviceName = 'Required';
    if (!formData.fullName.trim()) er.fullName = 'Required';
    if (!formData.location.trim()) er.location = 'Required';
    if (Object.keys(er).length) { setErrors(er); return; }

    setSaving(true);
    try {
      const fd = new FormData();
      fd.append('serviceName', formData.serviceName); fd.append('fullName', formData.fullName);
      fd.append('location', formData.location);
      if (formData.industry) fd.append('industry', formData.industry);
      if (formData.serviceLogo) fd.append('serviceLogo', formData.serviceLogo);
      if (selAccess.length) fd.append('serviceAccessPeople', JSON.stringify(selAccess.map(u => u._id)));

      await api.post('/trending-services', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      await fetchServices(); closeModal();
    } catch (err) { setErrors({ general: err.response?.data?.message || 'Error creating trending service' }); } finally { setSaving(false); }
  };

  const deleteService = async (id, e) => {
    e.stopPropagation();
    if (!window.confirm('Delete this trending service and all its targeted companies?')) return;
    try {
      await api.delete(`/trending-services/${id}`);
      fetchServices();
    } catch (e) { console.error(e); }
  };

  const filtered = useMemo(() => {
    let result = services.filter(s =>
      s.serviceName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.fullName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.location?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.industry?.toLowerCase().includes(searchQuery.toLowerCase())
    );
    if (filterIndustry) {
      result = result.filter(s => s.industry === filterIndustry);
    }
    if (filterLocation) {
      result = result.filter(s => s.location?.toLowerCase().includes(filterLocation.toLowerCase()));
    }
    return result;
  }, [services, searchQuery, filterIndustry, filterLocation]);

  const activeFilterCount = (filterIndustry ? 1 : 0) + (filterLocation ? 1 : 0);
  const clearFilters = () => { setFilterIndustry(''); setFilterLocation(''); };

  const uniqueLocations = useMemo(() => {
    const locs = [...new Set(services.map(s => s.location).filter(Boolean))];
    return locs.sort();
  }, [services]);

  const uniqueIndustries = useMemo(() => {
    const inds = [...new Set(services.map(s => s.industry).filter(Boolean))];
    return inds.sort();
  }, [services]);

  const av = (u) => u.profilePicture || u.profileImage || defaultAvatar;

  const filteredInd = INDUSTRY_OPTIONS.filter(o => o.toLowerCase().includes(indSearch.toLowerCase()));
  const filteredAcc = companyUsers.filter(u => !selAccess.find(s => s._id === u._id) && (u.name?.toLowerCase().includes(accSearch.toLowerCase()) || u.email?.toLowerCase().includes(accSearch.toLowerCase())));

  // Quick Add Company handlers
  const openQuickAdd = () => {
    setQuickForm({ categoryId: services[0]?._id || '', companyName: '', location: '', companyEmail: '', website: '', options: '', contacts: [{ fullName: '', designation: '', phone: '', email: '', location: '' }] });
    setQuickErrors({});
    setShowQuickAdd(true);
  };

  const handleQuickContact = (idx, field, value) => {
    setQuickForm(p => {
      const c = [...p.contacts]; c[idx] = { ...c[idx], [field]: value }; return { ...p, contacts: c };
    });
  };

  const handleQuickSubmit = async (e) => {
    e.preventDefault();
    const er = {};
    if (!quickForm.categoryId) er.categoryId = 'Select a category';
    if (!quickForm.companyName.trim()) er.companyName = 'Required';
    if (Object.keys(er).length) { setQuickErrors(er); return; }
    setQuickSaving(true);
    try {
      const t = localStorage.getItem('token');
      const body = { ...quickForm, contacts: quickForm.contacts.filter(c => c.fullName.trim() || c.email.trim()) };
      delete body.categoryId;
      const r = await fetch(`/api/trending-services/${quickForm.categoryId}/targeted-companies`, {
        method: 'POST', headers: { Authorization: `Bearer ${t}`, 'Content-Type': 'application/json' }, body: JSON.stringify(body)
      });
      if (r.ok) { setShowQuickAdd(false); fetchServices(); } else { const d = await r.json(); setQuickErrors({ general: d.message || 'Error' }); }
    } catch (_) { setQuickErrors({ general: 'Error saving company' }); } finally { setQuickSaving(false); }
  };

  return (
    <div className="gts">
      {/* Header */}
      <div className="gts-head">
        <div className="gts-head-l">
          <div className="gts-head-icon"><FiLayers size={20} /></div>
          <div>
            <h1>Companies Data</h1>
            <p className="gts-head-sub">{services.length} categor{services.length !== 1 ? 'ies' : 'y'} total{filtered.length !== services.length ? ` · ${filtered.length} shown` : ''}</p>
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
          <button className="gts-add" style={{ background: '#15803d' }} onClick={openQuickAdd}><FiPlus size={16} /> Quick Add Company</button>
          <button className="gts-add" onClick={openModal}><FiPlus size={16} /> Add Category</button>
        </div>
      </div>

      {/* Filter Bar */}
      {showFilters && (
        <div className="gts-filters">
          <div className="gts-filters-row">
            {/* Industry Filter */}
            <div className="gts-fdd-wrap">
              <button className={`gts-fdd-trigger ${filterIndustry ? 'active' : ''}`} onClick={() => { setDdFilterIndustry(!ddFilterIndustry); setDdFilterLocation(false); }}>
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
              <button className={`gts-fdd-trigger ${filterLocation ? 'active' : ''}`} onClick={() => { setDdFilterLocation(!ddFilterLocation); setDdFilterIndustry(false); }}>
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
            </div>
          )}
        </div>
      )}

      {/* Table Header */}
      {!loading && filtered.length > 0 && (
        <div className="gts-table-head">
          <div className="gts-th-name">Company Data Category</div>
          <div className="gts-th-industry">Industry</div>
          <div className="gts-th-date">Location</div>
          <div className="gts-th-stats">Companies</div>
          <div className="gts-th-access">Access</div>
          <div className="gts-th-actions"></div>
        </div>
      )}

      {/* Services List */}
      {loading ? (
        <div className="gts-load"><div className="gts-spin" /><p>Loading companies data...</p></div>
      ) : filtered.length > 0 ? (
        <div className="gts-list">
          {filtered.map(s => (
            <div key={s._id} className="gts-card" onClick={() => onNavigate && onNavigate('targeted-company-list', s)}>
              {/* Service Name */}
              <div className="gts-card-head">
                <div className="gts-card-logo">
                  {s.serviceLogo?.path ? <img src={s.serviceLogo.path} alt="" /> : (
                    <div className="gts-card-logo-ph">{s.serviceName?.substring(0, 3).toUpperCase() || 'TS'}</div>
                  )}
                </div>
                <div className="gts-card-title">
                  <h3>{s.serviceName}</h3>
                  <p>{s.fullName}</p>
                </div>
              </div>

              {/* Industry */}
              <div className="gts-card-industry">
                {s.industry ? <span className="gts-tag">{s.industry}</span> : <span className="gts-tag-empty">—</span>}
              </div>

              {/* Location */}
              <div className="gts-card-meta">
                <div className="gts-card-row"><FiMapPin size={12} /><span>{s.location}</span></div>
              </div>

              {/* Stats */}
              <div className="gts-card-nums">
                <div className="gts-stat">
                  <FiUsers size={12} className="gts-stat-icon" />
                  <div>
                    <strong>{servicesWithCompanies[s._id] !== undefined ? servicesWithCompanies[s._id] : '0'}</strong>
                    <span>Companies</span>
                  </div>
                </div>
              </div>

              {/* Access */}
              <div className="gts-card-foot">
                <div className="gts-avs" title={`${s.serviceAccessPeople?.length || 0} people have access`}>
                  {(s.serviceAccessPeople?.slice(0, 3) || []).map((u, i) => (
                    <div key={u._id || i} className="gts-av"><img src={u.profileImage || defaultAvatar} alt="" /></div>
                  ))}
                  {(s.serviceAccessPeople?.length || 0) > 3 && <div className="gts-av gts-av-more">+{s.serviceAccessPeople.length - 3}</div>}
                  {(s.serviceAccessPeople?.length || 0) === 0 && <span className="gts-no-access">—</span>}
                </div>
              </div>

              {/* Actions */}
              <div className="gts-card-acts" onClick={e => e.stopPropagation()}>
                <button onClick={() => setAboutPanel({ open: true, data: s })} title="About"><FiInfo size={14} /></button>
                <button className="del" onClick={(e) => deleteService(s._id, e)} title="Delete"><FiTrash2 size={14} /></button>
              </div>
            </div>
          ))}
        </div>
      ) : !showModal && (
        <div className="gts-empty">
          <img src={noTradeShowImage} alt="" />
          <h3>{activeFilterCount > 0 || searchQuery ? 'No matching companies data' : 'No Companies Data Yet'}</h3>
          <p>{activeFilterCount > 0 || searchQuery ? 'Try adjusting your filters or search query.' : 'Create your first company data entry to start managing targeted companies.'}</p>
          {activeFilterCount > 0 || searchQuery ? (
            <button className="gts-add" onClick={() => { clearFilters(); setSearchQuery(''); }}><FiX size={16} /> Clear Filters</button>
          ) : (
            <button className="gts-add" onClick={openModal}><FiPlus size={16} /> Create Company Data</button>
          )}
        </div>
      )}

      {/* Create Modal */}
      {showModal && (
        <div className="noxtm-overlay" onClick={closeModal}>
          <div className="gts-modal" onClick={e => e.stopPropagation()}>
            <div className="gts-mh">
              <h2>Create Company Data Category</h2>
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
                    {errors.serviceLogo && <p className="gts-ferr">{errors.serviceLogo}</p>}
                  </div>

                  <div className="gts-form-basic">
                    <div className="gts-f">
                      <label>Category Name <span className="req">*</span></label>
                      <input name="serviceName" value={formData.serviceName} onChange={handleInput} placeholder="e.g. SEO Clients, Web Dev Leads" className={errors.serviceName ? 'err' : ''} />
                      {errors.serviceName && <span className="gts-ferr">{errors.serviceName}</span>}
                    </div>
                    <div className="gts-f">
                      <label>Description <span className="req">*</span></label>
                      <input name="fullName" value={formData.fullName} onChange={handleInput} placeholder="e.g. SEO service clients in US market" className={errors.fullName ? 'err' : ''} />
                      {errors.fullName && <span className="gts-ferr">{errors.fullName}</span>}
                    </div>
                    <div className="gts-f">
                      <label>Location <span className="req">*</span></label>
                      <input name="location" value={formData.location} onChange={handleInput} placeholder="City, Country" className={errors.location ? 'err' : ''} />
                      {errors.location && <span className="gts-ferr">{errors.location}</span>}
                    </div>
                  </div>
                </div>

                {/* Industry */}
                <div className="gts-sec">
                  <h4><FiLayers size={14} /> Industry</h4>
                  <div className="gts-f gts-dd-wrap" ref={indRef}>
                    <input value={indSearch || formData.industry}
                      onChange={e => { setIndSearch(e.target.value); setDdIndustry(true); }}
                      onFocus={() => { setDdIndustry(true); setDdAccess(false); }}
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

                {/* Access */}
                <div className="gts-sec">
                  <h4><FiShield size={14} /> Access Control</h4>
                  <div className="gts-f gts-dd-wrap">
                    <label>Service Access</label>
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
                <button type="submit" className="gts-btn-s" disabled={saving}>{saving ? 'Creating...' : 'Create Category'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* About Panel */}
      {aboutPanel.open && aboutPanel.data && (() => {
        const svc = aboutPanel.data;
        return (
          <>
            <div className="noxtm-overlay--panel" onClick={() => setAboutPanel({ open: false, data: null })} />
            <div className="gts-panel">
              <div className="gts-ph">
                <div className="gts-ph-info">
                  {svc.serviceLogo?.path ? <img src={svc.serviceLogo.path} alt="" className="gts-ph-logo" /> : (
                    <div className="gts-ph-logo-ph">{svc.serviceName?.substring(0, 3).toUpperCase()}</div>
                  )}
                  <div><h2>{svc.serviceName}</h2><p>{svc.fullName}</p></div>
                </div>
                <div className="gts-ph-actions">
                  <button className="gts-ph-edit" onClick={() => { /* TODO: Open edit modal */ }} title="Edit Company Data"><FiEdit size={16} /></button>
                  <button className="gts-ph-delete" onClick={(e) => { setAboutPanel({ open: false, data: null }); deleteService(svc._id, e); }} title="Delete Company Data"><FiTrash2 size={16} /></button>
                  <button className="gts-ph-close" onClick={() => setAboutPanel({ open: false, data: null })} title="Close"><FiX size={18} /></button>
                </div>
              </div>
              <div className="gts-pb">
                <div className="gts-ps">
                  <h4>Category Details</h4>
                  <div className="gts-pg">
                    <div className="gts-pi"><label><FiMapPin size={12} /> Location</label><p>{svc.location || 'N/A'}</p></div>
                    <div className="gts-pi"><label>Industry</label><p>{svc.industry || 'N/A'}</p></div>
                  </div>
                </div>
                <div className="gts-ps">
                  <h4>Statistics</h4>
                  <div className="gts-pst">
                    <div className="gts-pst-box"><strong>{servicesWithCompanies[svc._id] !== undefined ? servicesWithCompanies[svc._id] : '0'}</strong><span>Targeted Companies</span></div>
                  </div>
                </div>
                {(svc.serviceAccessPeople?.length > 0) && (
                  <div className="gts-ps">
                    <h4>Access</h4>
                    {svc.serviceAccessPeople?.length > 0 && (
                      <div className="gts-pp"><label>Service Access</label><div className="gts-pp-list">{svc.serviceAccessPeople.map((u, i) => (
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

      {/* Quick Add Company Modal */}
      {showQuickAdd && (
        <div className="noxtm-overlay" onClick={() => setShowQuickAdd(false)}>
          <div className="exl-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 640 }}>
            <div className="exl-mh">
              <h2>Quick Add Company + Contacts</h2>
              <button onClick={() => setShowQuickAdd(false)}><FiX size={18} /></button>
            </div>
            <form onSubmit={handleQuickSubmit}>
              <div className="exl-mb" style={{ maxHeight: '65vh', overflowY: 'auto' }}>
                {quickErrors.general && <div className="exl-err">{quickErrors.general}</div>}

                <div className="exl-sec">
                  <h4>Category</h4>
                  <div className="exl-f">
                    <label>Select Category <span className="req">*</span></label>
                    <select value={quickForm.categoryId} onChange={e => { setQuickForm(p => ({ ...p, categoryId: e.target.value })); if (quickErrors.categoryId) setQuickErrors(p => ({ ...p, categoryId: '' })); }} style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: quickErrors.categoryId ? '1px solid #ef4444' : '1px solid #e5e5e5', fontSize: 13 }}>
                      {services.length === 0 && <option value="">No categories — create one first</option>}
                      {services.map(s => <option key={s._id} value={s._id}>{s.serviceName} — {s.fullName}</option>)}
                    </select>
                    {quickErrors.categoryId && <span className="exl-ferr">{quickErrors.categoryId}</span>}
                  </div>
                </div>

                <div className="exl-sec">
                  <h4>Company Info</h4>
                  <div className="exl-r2">
                    <div className="exl-f"><label>Company Name <span className="req">*</span></label><input value={quickForm.companyName} onChange={e => { setQuickForm(p => ({ ...p, companyName: e.target.value })); if (quickErrors.companyName) setQuickErrors(p => ({ ...p, companyName: '' })); }} placeholder="Company name" className={quickErrors.companyName ? 'err' : ''} />{quickErrors.companyName && <span className="exl-ferr">{quickErrors.companyName}</span>}</div>
                    <div className="exl-f"><label>Location</label><input value={quickForm.location} onChange={e => setQuickForm(p => ({ ...p, location: e.target.value }))} placeholder="City, Country" /></div>
                  </div>
                  <div className="exl-r2">
                    <div className="exl-f"><label>Email</label><input value={quickForm.companyEmail} onChange={e => setQuickForm(p => ({ ...p, companyEmail: e.target.value }))} placeholder="company@email.com" /></div>
                    <div className="exl-f"><label>Website</label><input value={quickForm.website} onChange={e => setQuickForm(p => ({ ...p, website: e.target.value }))} placeholder="www.company.com" /></div>
                  </div>
                </div>

                <div className="exl-sec">
                  <div className="exl-sec-head">
                    <h4>Contacts</h4>
                    <button type="button" className="exl-add-ct" onClick={() => setQuickForm(p => ({ ...p, contacts: [...p.contacts, { fullName: '', designation: '', phone: '', email: '', location: '' }] }))}><FiPlus size={13} /> Add Contact</button>
                  </div>
                  {quickForm.contacts.map((c, i) => (
                    <div key={i} className="exl-ct-block">
                      <div className="exl-ct-top">
                        <span>Contact {i + 1}</span>
                        {quickForm.contacts.length > 1 && <button type="button" onClick={() => setQuickForm(p => ({ ...p, contacts: p.contacts.filter((_, idx) => idx !== i) }))}><FiX size={13} /></button>}
                      </div>
                      <div className="exl-r2">
                        <div className="exl-f"><label>Full Name</label><input value={c.fullName} onChange={e => handleQuickContact(i, 'fullName', e.target.value)} placeholder="Full name" /></div>
                        <div className="exl-f"><label>Designation</label><input value={c.designation} onChange={e => handleQuickContact(i, 'designation', e.target.value)} placeholder="CEO, CTO..." /></div>
                      </div>
                      <div className="exl-r3" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                        <div className="exl-f"><label>Phone</label><input value={c.phone} onChange={e => handleQuickContact(i, 'phone', e.target.value)} placeholder="+1..." /></div>
                        <div className="exl-f"><label>Email</label><input value={c.email} onChange={e => handleQuickContact(i, 'email', e.target.value)} placeholder="email@co.com" /></div>
                        <div className="exl-f"><label>Location</label><input value={c.location} onChange={e => handleQuickContact(i, 'location', e.target.value)} placeholder="City" /></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="exl-mf">
                <button type="button" className="exl-btn-c" onClick={() => setShowQuickAdd(false)} disabled={quickSaving}>Cancel</button>
                <button type="submit" className="exl-btn-s" disabled={quickSaving || !services.length}>{quickSaving ? 'Saving...' : 'Add Company'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default TrendingServices;
