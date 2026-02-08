import React, { useState, useEffect, useRef } from 'react';
import './GlobalTradeShow.css';
import noTradeShowImage from './image/no-tradeshow.svg';
import uploadIcon from './image/upload_icon.svg';
import defaultAvatar from './image/default-avatar.svg';
import {
  FiDownload, FiPlus, FiX, FiCalendar, FiMapPin,
  FiSearch, FiInfo, FiChevronRight, FiUpload, FiGrid, FiList, FiTrash2,
  FiLayers, FiClock, FiShield
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

function GlobalTradeShow({ onNavigate }) {
  const [shows, setShows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [viewMode, setViewMode] = useState('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [companyUsers, setCompanyUsers] = useState([]);

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
  const [selLeads, setSelLeads] = useState([]);
  const [ddAccess, setDdAccess] = useState(false);
  const [ddLeads, setDdLeads] = useState(false);
  const [accSearch, setAccSearch] = useState('');
  const [leadSearch, setLeadSearch] = useState('');

  // Industry
  const [indSearch, setIndSearch] = useState('');
  const [ddIndustry, setDdIndustry] = useState(false);
  const indRef = useRef(null);

  // About panel
  const [aboutPanel, setAboutPanel] = useState({ open: false, data: null });
  const [showLeadsData, setShowLeadsData] = useState({ campaigns: [], leads: [], totalLeads: 0, loading: false });

  useEffect(() => { fetchShows(); fetchUsers(); }, []);

  // Fetch leads when about panel opens
  useEffect(() => {
    if (aboutPanel.open && aboutPanel.data?._id) {
      const fetchShowLeads = async () => {
        setShowLeadsData(p => ({ ...p, loading: true }));
        try {
          const t = localStorage.getItem('token');
          const r = await fetch(`/api/lead-campaigns/by-trade-show/${aboutPanel.data._id}`, { headers: { Authorization: `Bearer ${t}` } });
          if (r.ok) {
            const d = await r.json();
            setShowLeadsData({ campaigns: d.campaigns || [], leads: d.leads || [], totalLeads: d.totalLeads || 0, loading: false });
          } else { setShowLeadsData({ campaigns: [], leads: [], totalLeads: 0, loading: false }); }
        } catch (e) { console.error(e); setShowLeadsData({ campaigns: [], leads: [], totalLeads: 0, loading: false }); }
      };
      fetchShowLeads();
    } else { setShowLeadsData({ campaigns: [], leads: [], totalLeads: 0, loading: false }); }
  }, [aboutPanel.open, aboutPanel.data?._id]);

  useEffect(() => {
    const close = (e) => {
      if (!e.target.closest('.gts-dd-wrap')) { setDdAccess(false); setDdLeads(false); setDdIndustry(false); }
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const fetchShows = async () => {
    try {
      setLoading(true);
      const t = localStorage.getItem('token');
      const r = await fetch('/api/trade-shows', { headers: { Authorization: `Bearer ${t}` } });
      if (r.ok) { const d = await r.json(); setShows(d.tradeShows || []); }
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const fetchUsers = async () => {
    try {
      const t = localStorage.getItem('token');
      const r = await fetch('/api/company/members', { headers: { Authorization: `Bearer ${t}` } });
      if (r.ok) {
        const d = await r.json();
        setCompanyUsers((d.members || []).map(u => ({ ...u, name: u.fullName || u.name, profilePicture: u.profileImage || u.profilePicture })));
      }
    } catch (e) { console.error(e); }
  };

  const resetForm = () => {
    setFormData({ shortName: '', fullName: '', showDate: '', location: '', exhibitors: '', attendees: '', industry: '', eacDeadline: '', earlyBirdDeadline: '', showLogo: null, floorPlan: null });
    setLogoPreview(null); setFloorPlanName(''); setErrors({});
    setSelAccess([]); setSelLeads([]);
    setIndSearch(''); setAccSearch(''); setLeadSearch('');
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

  const addUser = (u, t) => {
    if (t === 'access') { if (!selAccess.find(x => x._id === u._id)) setSelAccess(p => [...p, u]); setDdAccess(false); setAccSearch(''); }
    else { if (!selLeads.find(x => x._id === u._id)) setSelLeads(p => [...p, u]); setDdLeads(false); setLeadSearch(''); }
  };
  const rmUser = (id, t) => { t === 'access' ? setSelAccess(p => p.filter(u => u._id !== id)) : setSelLeads(p => p.filter(u => u._id !== id)); };

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
      const t = localStorage.getItem('token');
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
      if (selLeads.length) fd.append('showLeadsAccessPeople', JSON.stringify(selLeads.map(u => u._id)));

      const r = await fetch('/api/trade-shows', { method: 'POST', headers: { Authorization: `Bearer ${t}` }, body: fd });
      const d = await r.json();
      if (r.ok) { await fetchShows(); closeModal(); } else setErrors({ general: d.message || 'Error creating' });
    } catch (_) { setErrors({ general: 'Error creating trade show' }); } finally { setSaving(false); }
  };

  const deleteShow = async (id, e) => {
    e.stopPropagation();
    if (!window.confirm('Delete this trade show and all its exhibitors?')) return;
    try {
      const t = localStorage.getItem('token');
      await fetch(`/api/trade-shows/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${t}` } });
      fetchShows();
    } catch (e) { console.error(e); }
  };

  const filtered = shows.filter(s =>
    s.shortName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.fullName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.location?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.industry?.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
  const filteredLd = companyUsers.filter(u => !selLeads.find(s => s._id === u._id) && (u.name?.toLowerCase().includes(leadSearch.toLowerCase()) || u.email?.toLowerCase().includes(leadSearch.toLowerCase())));

  return (
    <div className="gts">
      {/* Header */}
      <div className="gts-head">
        <div className="gts-head-l">
          <h1>Global Trade Shows</h1>
          <span className="gts-badge">{shows.length}</span>
        </div>
        <div className="gts-head-r">
          <div className="gts-srch">
            <FiSearch size={15} />
            <input placeholder="Search shows..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
          </div>
          <div className="gts-vtog">
            <button className={viewMode === 'grid' ? 'on' : ''} onClick={() => setViewMode('grid')}><FiGrid size={15} /></button>
            <button className={viewMode === 'list' ? 'on' : ''} onClick={() => setViewMode('list')}><FiList size={15} /></button>
          </div>
          <button className="gts-add" onClick={openModal}><FiPlus size={16} /> Add Trade Show</button>
        </div>
      </div>

      {/* Shows */}
      {loading ? (
        <div className="gts-load"><div className="gts-spin" /><p>Loading trade shows...</p></div>
      ) : filtered.length > 0 ? (
        <div className={`gts-grid ${viewMode === 'list' ? 'gts-list-mode' : ''}`}>
          {filtered.map(s => {
            const cd = getDays(s.showDate);
            return (
              <div key={s._id} className="gts-card" onClick={() => onNavigate && onNavigate('exhibitor-list', s)}>
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
                  <div className="gts-card-acts" onClick={e => e.stopPropagation()}>
                    <button onClick={() => setAboutPanel({ open: true, data: s })} title="About"><FiInfo size={14} /></button>
                    <button className="del" onClick={(e) => deleteShow(s._id, e)} title="Delete"><FiTrash2 size={14} /></button>
                  </div>
                </div>

                {s.industry && <span className="gts-tag">{s.industry}</span>}

                <div className="gts-card-meta">
                  <div className="gts-card-row"><FiCalendar size={13} /><span>{fmtDate(s.showDate)}</span>{cd && <span className={`gts-cd ${cd.cls}`}>{cd.text}</span>}</div>
                  <div className="gts-card-row"><FiMapPin size={13} /><span>{s.location}</span></div>
                </div>

                <div className="gts-card-nums">
                  <div><strong>{s.exhibitors || '—'}</strong><span>Exhibitors</span></div>
                  <div><strong>{s.attendees || '—'}</strong><span>Attendees</span></div>
                  {s.floorPlan?.path && (
                    <a href={s.floorPlan.path} download onClick={e => e.stopPropagation()} className="gts-dl"><FiDownload size={13} /> Floor Plan</a>
                  )}
                </div>

                <div className="gts-card-foot">
                  <div className="gts-avs">
                    {(s.showAccessPeople?.slice(0, 3) || []).map((u, i) => (
                      <div key={u._id || i} className="gts-av"><img src={u.profileImage || defaultAvatar} alt="" /></div>
                    ))}
                    {(s.showAccessPeople?.length || 0) > 3 && <div className="gts-av gts-av-more">+{s.showAccessPeople.length - 3}</div>}
                  </div>
                  <FiChevronRight size={16} className="gts-card-arrow" />
                </div>
              </div>
            );
          })}
        </div>
      ) : !showModal && (
        <div className="gts-empty">
          <img src={noTradeShowImage} alt="" />
          <h3>No Trade Shows Yet</h3>
          <p>Create your first trade show to start managing exhibitors and leads.</p>
          <button className="gts-add" onClick={openModal}><FiPlus size={16} /> Create Trade Show</button>
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
                  <div className="gts-r2">
                    <div className="gts-f gts-dd-wrap">
                      <label>Show Access</label>
                      {selAccess.length > 0 && <div className="gts-chips">{selAccess.map(u => (
                        <div key={u._id} className="gts-chip-u"><img src={av(u)} alt="" /><span>{u.name}</span><button type="button" onClick={() => rmUser(u._id, 'access')}><FiX size={11} /></button></div>
                      ))}</div>}
                      <input value={accSearch} onChange={e => setAccSearch(e.target.value)}
                        onFocus={() => { setDdAccess(true); setDdLeads(false); setDdIndustry(false); }} placeholder="Search people..." />
                      {ddAccess && <div className="gts-dd">{filteredAcc.length ? filteredAcc.map(u => (
                        <div key={u._id} className="gts-dd-i gts-dd-u" onClick={() => addUser(u, 'access')}>
                          <img src={av(u)} alt="" /><div><div className="gts-dd-n">{u.name}</div><div className="gts-dd-em">{u.email}</div></div>
                        </div>
                      )) : <div className="gts-dd-e">No users</div>}</div>}
                    </div>
                    <div className="gts-f gts-dd-wrap">
                      <label>Leads Access</label>
                      {selLeads.length > 0 && <div className="gts-chips">{selLeads.map(u => (
                        <div key={u._id} className="gts-chip-u"><img src={av(u)} alt="" /><span>{u.name}</span><button type="button" onClick={() => rmUser(u._id, 'leads')}><FiX size={11} /></button></div>
                      ))}</div>}
                      <input value={leadSearch} onChange={e => setLeadSearch(e.target.value)}
                        onFocus={() => { setDdLeads(true); setDdAccess(false); setDdIndustry(false); }} placeholder="Search people..." />
                      {ddLeads && <div className="gts-dd">{filteredLd.length ? filteredLd.map(u => (
                        <div key={u._id} className="gts-dd-i gts-dd-u" onClick={() => addUser(u, 'leads')}>
                          <img src={av(u)} alt="" /><div><div className="gts-dd-n">{u.name}</div><div className="gts-dd-em">{u.email}</div></div>
                        </div>
                      )) : <div className="gts-dd-e">No users</div>}</div>}
                    </div>
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
                <button onClick={() => setAboutPanel({ open: false, data: null })}><FiX size={18} /></button>
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
                {(sh.showAccessPeople?.length > 0 || sh.showLeadsAccessPeople?.length > 0) && (
                  <div className="gts-ps">
                    <h4>Access</h4>
                    {sh.showAccessPeople?.length > 0 && (
                      <div className="gts-pp"><label>Show Access</label><div className="gts-pp-list">{sh.showAccessPeople.map((u, i) => (
                        <div key={u._id || i} className="gts-pp-item"><img src={u.profileImage || defaultAvatar} alt="" /><span>{u.fullName || u.name || 'User'}</span></div>
                      ))}</div></div>
                    )}
                    {sh.showLeadsAccessPeople?.length > 0 && (
                      <div className="gts-pp"><label>Leads Access</label><div className="gts-pp-list">{sh.showLeadsAccessPeople.map((u, i) => (
                        <div key={u._id || i} className="gts-pp-item"><img src={u.profileImage || defaultAvatar} alt="" /><span>{u.fullName || u.name || 'User'}</span></div>
                      ))}</div></div>
                    )}
                  </div>
                )}
                {/* Linked Leads & Campaigns */}
                <div className="gts-ps">
                  <h4><FiLayers size={14} /> Linked Leads</h4>
                  {showLeadsData.loading ? (
                    <p style={{ color: '#888', fontSize: 13 }}>Loading leads...</p>
                  ) : showLeadsData.campaigns.length > 0 ? (
                    <>
                      <div className="gts-pst" style={{ marginBottom: 12 }}>
                        <div className="gts-pst-box"><strong>{showLeadsData.totalLeads}</strong><span>Total Leads</span></div>
                        <div className="gts-pst-box"><strong>{showLeadsData.campaigns.length}</strong><span>Campaigns</span></div>
                      </div>
                      {showLeadsData.campaigns.map(c => (
                        <div key={c._id} className="gts-lead-camp">
                          <div className="gts-lead-camp-head">
                            <span className="gts-lead-camp-name">{c.name}</span>
                            <span className={`gts-lead-camp-status gts-lcs-${c.status}`}>{c.status}</span>
                          </div>
                          <div className="gts-lead-camp-meta">
                            <span>{c.leads?.length || 0} leads</span>
                            <span>{c.method}</span>
                            <span>{c.priority}</span>
                          </div>
                        </div>
                      ))}
                      {showLeadsData.leads.length > 0 && (
                        <div className="gts-leads-table">
                          <div className="gts-leads-thr">
                            <span>Company</span><span>Contact</span><span>Status</span>
                          </div>
                          {showLeadsData.leads.slice(0, 20).map(l => (
                            <div key={l._id} className="gts-leads-row">
                              <span>{l.companyName || '—'}</span>
                              <span>{l.clientName || '—'}</span>
                              <span className={`gts-ls gts-ls-${(l.status || 'new').toLowerCase()}`}>{l.status || 'new'}</span>
                            </div>
                          ))}
                          {showLeadsData.leads.length > 20 && (
                            <p style={{ color: '#888', fontSize: 12, textAlign: 'center', marginTop: 8 }}>
                              +{showLeadsData.leads.length - 20} more leads
                            </p>
                          )}
                        </div>
                      )}
                    </>
                  ) : (
                    <p style={{ color: '#888', fontSize: 13 }}>No lead campaigns linked to this trade show yet.</p>
                  )}
                </div>
              </div>
            </div>
          </>
        );
      })()}
    </div>
  );
}

export default GlobalTradeShow;
