// v6 — action bar above card, detail panel on row click, no emojis
import React, { useState, useEffect, useCallback, useRef } from 'react';
import api from '../config/api';

const API_CDC = 'http://localhost:5001/api/core-data';
const PAGE_SIZE = 15;

const TABS = [
  { key: 'leads',    label: 'All Leads' },
  { key: 'contacts', label: 'Contacts' },
  { key: 'history',  label: 'History' },
];

const TYPE_META = {
  leads:    { color: '#374151', bg: '#F3F4F6', border: '#E5E7EB' },
  contacts: { color: '#16A34A', bg: '#F0FDF4', border: '#BBF7D0' },
  custom:   { color: '#7C3AED', bg: '#F5F3FF', border: '#DDD6FE' },
};
const meta = (t) => TYPE_META[t] || { color: '#6B7280', bg: '#F9FAFB', border: '#E5E7EB' };

const LEAD_COLS = [
  { key: 'fullName',       label: 'Name' },
  { key: 'email',          label: 'Email' },
  { key: 'phone',          label: 'Phone' },
  { key: 'currentCompany', label: 'Company' },
  { key: 'location',       label: 'Location' },
  { key: 'headline',       label: 'Headline' },
];

const CONTACT_COLS = [
  { key: 'name',    label: 'Name' },
  { key: 'email',   label: 'Email' },
  { key: 'phone',   label: 'Phone' },
  { key: 'company', label: 'Company' },
  { key: 'role',    label: 'Role' },
];

const SKIP_DISPLAY = new Set(['_id','__v','profilePictureUrl','scrapeStatus','scrapeError']);
const SKIP_DETECT  = new Set([...SKIP_DISPLAY, 'linkedinId','publicIdentifier','linkedinUrl','connectedAt','enrichedAt','createdAt','updatedAt','connectionDegree','enrichmentStatus']);

const AVATAR_COLORS = ['#111827','#374151','#1d4ed8','#7c3aed','#059669','#b45309'];
const avatarColor = (s='') => AVATAR_COLORS[(s.charCodeAt(0)||0) % AVATAR_COLORS.length];
const getName = (r) => r.fullName || r.name || (r.firstName ? `${r.firstName} ${r.lastName||''}`.trim() : '') || '';

function formatDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric' });
}

function Pill({ type }) {
  const m = meta(type);
  return <span style={{ background:m.bg, color:m.color, border:`1px solid ${m.border}`, borderRadius:5, padding:'2px 9px', fontSize:11, fontWeight:600 }}>{type}</span>;
}

function StatCard({ label, value, accent }) {
  return (
    <div style={{ background:'#fff', border:'1px solid #F0F0F0', borderRadius:12, padding:'18px 22px', boxShadow:'0 1px 3px rgba(0,0,0,0.04)' }}>
      <div style={{ fontSize:28, fontWeight:700, color:accent||'#111', lineHeight:1 }}>{value}</div>
      <div style={{ fontSize:12, color:'#9CA3AF', marginTop:6, fontWeight:500 }}>{label}</div>
    </div>
  );
}

function AvatarCircle({ name='', src, size=28 }) {
  const initial = name[0]?.toUpperCase()||'?';
  if (src) return <img src={src} alt={name} style={{ width:size, height:size, borderRadius:'50%', objectFit:'cover', flexShrink:0 }} />;
  return (
    <div style={{ width:size, height:size, borderRadius:'50%', background:avatarColor(name), color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', fontSize:size*0.42, fontWeight:700, flexShrink:0 }}>
      {initial}
    </div>
  );
}

/* ── Detail side panel ── */
function DetailPanel({ lead, onClose, onShare }) {
  const name = getName(lead);

  // Build display fields — all non-skip keys that have values
  const allFields = Object.entries(lead)
    .filter(([k, v]) => !SKIP_DISPLAY.has(k) && v != null && v !== '' && typeof v !== 'object')
    .map(([k, v]) => ({ key: k, label: k.replace(/([A-Z])/g, ' $1').trim(), value: String(v) }));

  // Priority fields first
  const PRIORITY = ['fullName','firstName','lastName','email','phone','currentCompany','location','headline','connectionDegree','enrichmentStatus','linkedinUrl','publicIdentifier'];
  const priority = PRIORITY.filter(k => lead[k]).map(k => ({ key:k, label: k.replace(/([A-Z])/g,' $1').trim(), value: String(lead[k]) }));
  const rest = allFields.filter(f => !PRIORITY.includes(f.key));
  const fields = [...priority, ...rest];

  return (
    <>
      <div onClick={onClose} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.08)', zIndex:40 }} />
      <div style={{ position:'fixed', top:0, right:0, bottom:0, width:420, background:'#fff', zIndex:50, boxShadow:'-4px 0 24px rgba(0,0,0,0.08)', display:'flex', flexDirection:'column', fontFamily:'Inter,-apple-system,sans-serif' }}>

        {/* Header */}
        <div style={{ padding:'20px 24px', borderBottom:'1px solid #F0F0F0' }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
            <div style={{ display:'flex', alignItems:'center', gap:12 }}>
              <AvatarCircle name={name} size={42} />
              <div>
                <div style={{ fontWeight:700, fontSize:16, color:'#111' }}>{name||'—'}</div>
                <div style={{ fontSize:12, color:'#9CA3AF', marginTop:2 }}>{lead.currentCompany||lead.headline||lead.company||'—'}</div>
              </div>
            </div>
            <button onClick={onClose} style={{ background:'none', border:'none', color:'#9CA3AF', cursor:'pointer', fontSize:20, padding:4 }}>×</button>
          </div>
          <div style={{ marginTop:14, display:'flex', gap:8 }}>
            <button onClick={() => { onShare([lead]); onClose(); }} style={{ flex:1, padding:'8px 0', borderRadius:8, border:'none', background:'#111', color:'#fff', fontSize:13, fontWeight:600, cursor:'pointer' }}>
              Share to Sales Pipeline
            </button>
          </div>
        </div>

        {/* All fields */}
        <div style={{ flex:1, overflowY:'auto', padding:'20px 24px' }}>
          <div style={{ fontSize:10, fontWeight:600, color:'#9CA3AF', letterSpacing:'0.07em', textTransform:'uppercase', marginBottom:14 }}>Lead Details</div>
          {fields.map(f => (
            <div key={f.key} style={{ display:'flex', justifyContent:'space-between', marginBottom:10, gap:12, alignItems:'flex-start' }}>
              <span style={{ fontSize:12, color:'#9CA3AF', minWidth:110, flexShrink:0, textTransform:'capitalize' }}>{f.label}</span>
              <span style={{
                fontSize:12, color: f.key==='phone' ? '#2563eb' : '#111',
                fontWeight: f.key==='phone'||f.key==='email' ? 600 : 400,
                fontFamily: f.key==='phone'||f.key==='email' ? 'monospace' : 'inherit',
                textAlign:'right', wordBreak:'break-all',
              }}>
                {f.key==='linkedinUrl'
                  ? <a href={f.value} target="_blank" rel="noreferrer" style={{ color:'#2563eb', textDecoration:'none' }}>View Profile</a>
                  : f.value}
              </span>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

/* ── Leads table — multi-select checkboxes ── */
function LeadsTable({ rows, colDefs, search, onSelectionChange, onDetail }) {
  const [visible, setVisible]   = useState(PAGE_SIZE);
  const [selected, setSelected] = useState(new Set()); // Set of row indices within visibleRows
  const loaderRef = useRef(null);

  useEffect(() => { setVisible(PAGE_SIZE); setSelected(new Set()); }, [rows, search]);

  // Notify parent of selected leads
  useEffect(() => {
    const filtered = search ? rows.filter(r => JSON.stringify(r).toLowerCase().includes(search.toLowerCase())) : rows;
    const leads = Array.from(selected).map(i => filtered[i]).filter(Boolean);
    onSelectionChange(leads);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected]);

  const filtered = search
    ? rows.filter(r => JSON.stringify(r).toLowerCase().includes(search.toLowerCase()))
    : rows;

  useEffect(() => {
    const el = loaderRef.current;
    if (!el) return;

    // Find nearest scrollable ancestor (layout divs often use overflow:auto)
    const getScrollParent = (node) => {
      while (node && node !== document.body) {
        const { overflow, overflowY } = window.getComputedStyle(node);
        if (/auto|scroll/.test(overflow + overflowY)) return node;
        node = node.parentElement;
      }
      return null; // falls back to viewport
    };
    const scrollParent = getScrollParent(el.parentElement);

    const obs = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting) setVisible(v => Math.min(v + PAGE_SIZE, filtered.length));
    }, { root: scrollParent, threshold: 0.1, rootMargin: '100px' });
    obs.observe(el);
    return () => obs.disconnect();
  }, [filtered.length]);

  if (!rows || rows.length === 0) {
    return (
      <div style={{ textAlign:'center', padding:'60px 24px', color:'#9CA3AF' }}>
        <div style={{ width:48, height:48, borderRadius:12, background:'#F3F4F6', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 14px' }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="1.5"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
        </div>
        <div style={{ fontSize:14, fontWeight:600, color:'#374151' }}>No records</div>
        <div style={{ fontSize:12, marginTop:4 }}>Send data from Orion — Leads — Send to Core Data</div>
      </div>
    );
  }

  // Only show column if ≥5% of rows have data (avoids mostly-empty "—" columns)
  const minFill = Math.max(1, Math.floor(rows.length * 0.05));
  const activeCols = colDefs.filter(c => rows.filter(r => r[c.key] != null && r[c.key] !== '').length >= minFill);
  const cols = activeCols.length > 0 ? activeCols
    : Object.keys(rows[0]||{}).filter(k=>!SKIP_DETECT.has(k)).slice(0,6).map(k=>({key:k,label:k}));

  const visibleRows = filtered.slice(0, visible);
  const hasMore = visible < filtered.length;
  const allChecked = visibleRows.length > 0 && visibleRows.every((_, i) => selected.has(i));
  const someChecked = !allChecked && visibleRows.some((_, i) => selected.has(i));

  const toggleRow = (i, e) => {
    e.stopPropagation();
    setSelected(prev => {
      const next = new Set(prev);
      next.has(i) ? next.delete(i) : next.add(i);
      return next;
    });
  };

  const toggleAll = () => {
    if (allChecked) {
      setSelected(new Set());
    } else {
      setSelected(new Set(visibleRows.map((_, i) => i)));
    }
  };

  return (
    <div>
      {search && filtered.length !== rows.length && (
        <div style={{ padding:'8px 20px', fontSize:12, color:'#9CA3AF', borderBottom:'1px solid #F5F5F5' }}>
          {filtered.length} of {rows.length} records
        </div>
      )}
      <div style={{ overflowX:'auto' }}>
        <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
          <thead>
            <tr style={{ background:'#FAFAFA' }}>
              <th style={{ padding:'10px 16px', width:44, borderBottom:'1px solid #F0F0F0' }}>
                <input
                  type="checkbox"
                  checked={allChecked}
                  ref={el => { if (el) el.indeterminate = someChecked; }}
                  onChange={toggleAll}
                  style={{ cursor:'pointer', width:15, height:15 }}
                />
              </th>
              {cols.map(c => (
                <th key={c.key} style={{ padding:'10px 16px', textAlign:'left', fontSize:11, fontWeight:600, color:'#9CA3AF', letterSpacing:'0.05em', textTransform:'uppercase', borderBottom:'1px solid #F0F0F0', whiteSpace:'nowrap' }}>
                  {c.label}
                </th>
              ))}
              <th style={{ padding:'10px 12px', width:32, borderBottom:'1px solid #F0F0F0' }} />
            </tr>
          </thead>
          <tbody>
            {visibleRows.map((row, i) => {
              const name = getName(row);
              const color = avatarColor(name);
              const isChecked = selected.has(i);

              return (
                <tr key={i}
                  style={{ borderBottom:'1px solid #F5F5F5', background: isChecked ? '#F8F8F8' : 'transparent', cursor:'pointer', borderLeft: isChecked ? '3px solid #111' : '3px solid transparent' }}
                  onMouseEnter={e => { if (!isChecked) e.currentTarget.style.background='#FAFAFA'; }}
                  onMouseLeave={e => { if (!isChecked) e.currentTarget.style.background='transparent'; }}
                >
                  {/* Checkbox */}
                  <td style={{ padding:'11px 16px', width:44 }} onClick={e => toggleRow(i, e)}>
                    <input type="checkbox" checked={isChecked} onChange={() => {}} style={{ cursor:'pointer', width:15, height:15 }} />
                  </td>

                  {/* Data cells — click to open detail */}
                  {cols.map((c, ci) => {
                    const val = row[c.key];
                    const display = val==null||val==='' ? '—' : String(val);

                    if (ci===0 && (c.key==='fullName'||c.key==='name')) {
                      return (
                        <td key={c.key} style={{ padding:'11px 16px', whiteSpace:'nowrap' }} onClick={() => onDetail(row)}>
                          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                            <div style={{ width:30, height:30, borderRadius:'50%', background:color, color:'#fff', flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, fontWeight:700 }}>
                              {(name||'?')[0].toUpperCase()}
                            </div>
                            <span style={{ fontWeight:600, color:'#111' }}>{display}</span>
                          </div>
                        </td>
                      );
                    }
                    if (c.key==='email' && val) return <td key={c.key} style={{ padding:'11px 16px' }} onClick={() => onDetail(row)}><span style={{ fontFamily:'monospace', fontSize:12, color:'#111', fontWeight:500 }}>{val}</span></td>;
                    if (c.key==='phone' && val) return <td key={c.key} style={{ padding:'11px 16px' }} onClick={() => onDetail(row)}><span style={{ fontFamily:'monospace', fontSize:12, color:'#2563eb', fontWeight:600 }}>{val}</span></td>;
                    return <td key={c.key} style={{ padding:'11px 16px', color:'#374151', maxWidth:180, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }} onClick={() => onDetail(row)}>{display}</td>;
                  })}

                  {/* Arrow */}
                  <td style={{ padding:'11px 12px', width:32 }} onClick={() => onDetail(row)}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#D1D5DB" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div ref={loaderRef} style={{ padding: hasMore ? '14px 20px' : '0' }}>
        {hasMore && (
          <button onClick={() => setVisible(v => Math.min(v+PAGE_SIZE, filtered.length))}
            style={{ width:'100%', padding:'10px', borderRadius:8, border:'1px solid #E5E7EB', background:'#fff', fontSize:13, fontWeight:500, cursor:'pointer', color:'#374151' }}>
            Load more ({filtered.length - visible} remaining)
          </button>
        )}
      </div>
    </div>
  );
}

/* ── History ── */
function HistoryList({ entries, loading, user }) {
  if (loading) return <div style={{ padding:40, textAlign:'center', color:'#9CA3AF', fontSize:13 }}>Loading...</div>;
  if (entries.length===0) return <div style={{ padding:60, textAlign:'center', fontSize:14, fontWeight:600, color:'#374151' }}>No history yet</div>;
  return (
    <div>
      {entries.map((entry, i) => (
        <div key={entry._id} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'14px 24px', borderBottom: i<entries.length-1 ? '1px solid #F5F5F5' : 'none' }}>
          <div style={{ display:'flex', alignItems:'center', gap:14 }}>
            <div style={{ width:38, height:38, borderRadius:10, background:'#F3F4F6', display:'flex', alignItems:'center', justifyContent:'center' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="1.8"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
            </div>
            <div>
              <div style={{ fontWeight:600, fontSize:13, color:'#111' }}>{entry.label||entry.dataType}</div>
              <div style={{ fontSize:11, color:'#9CA3AF', marginTop:2 }}>{(entry.count||0).toLocaleString()} records &nbsp;·&nbsp; {entry.source}</div>
            </div>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:14 }}>
            {user && (
              <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                <AvatarCircle name={user.fullName||''} src={user.profileImage||user.emailAvatar} size={26} />
                <span style={{ fontSize:11, color:'#9CA3AF' }}>{user.fullName?.split(' ')[0]}</span>
              </div>
            )}
            <Pill type={entry.dataType} />
            <span style={{ fontSize:12, color:'#9CA3AF' }}>{formatDate(entry.createdAt)}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ── Share confirm modal ── */
function ShareConfirm({ leads, onClose, onShared }) {
  const [loading, setLoading] = useState(false);
  const count = leads.length;
  const first = leads[0] || {};
  const firstName = getName(first);

  const handle = async () => {
    setLoading(true);
    try {
      const res = await api.post('/sales-pipeline/share', { leads, sourceEntryLabel:'Core Data Center' });
      if (res.data.success) onShared();
    } catch { alert('Failed to share. Make sure you are logged in.'); }
    setLoading(false);
  };

  return (
    <>
      <div onClick={onClose} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.25)', zIndex:60 }} />
      <div style={{ position:'fixed', top:'50%', left:'50%', transform:'translate(-50%,-50%)', background:'#fff', borderRadius:14, padding:28, width:400, zIndex:70, boxShadow:'0 20px 60px rgba(0,0,0,0.12)', fontFamily:'Inter,-apple-system,sans-serif' }}>
        <h2 style={{ margin:'0 0 6px', fontSize:17, fontWeight:700, color:'#111' }}>Share to Sales Pipeline</h2>
        <p style={{ margin:'0 0 20px', fontSize:13, color:'#9CA3AF' }}>{count} lead{count>1?'s':''} will be added for your sales team to follow up.</p>
        <div style={{ background:'#F9FAFB', border:'1px solid #F0F0F0', borderRadius:10, padding:'12px 16px', marginBottom:24, maxHeight:180, overflowY:'auto' }}>
          {leads.map((lead, i) => {
            const name = getName(lead);
            return (
              <div key={i} style={{ display:'flex', alignItems:'center', gap:10, marginBottom: i<leads.length-1 ? 10 : 0 }}>
                <AvatarCircle name={name} size={30} />
                <div>
                  <div style={{ fontWeight:600, fontSize:13, color:'#111' }}>{name||'—'}</div>
                  <div style={{ fontSize:11, color:'#9CA3AF', marginTop:1 }}>{lead.email||lead.phone||lead.currentCompany||''}</div>
                </div>
              </div>
            );
          })}
        </div>
        <div style={{ display:'flex', gap:10 }}>
          <button onClick={onClose} style={{ flex:1, padding:'10px', borderRadius:8, border:'1px solid #E5E7EB', background:'#fff', fontSize:13, fontWeight:500, cursor:'pointer', color:'#374151' }}>Cancel</button>
          <button onClick={handle} disabled={loading} style={{ flex:2, padding:'10px', borderRadius:8, border:'none', background:'#111', color:'#fff', fontSize:13, fontWeight:600, cursor:'pointer', opacity:loading?0.6:1 }}>
            {loading ? 'Sharing...' : `Share ${count} Lead${count>1?'s':''}`}
          </button>
        </div>
      </div>
    </>
  );
}

/* ── Main ── */
export default function CoreDataCenter() {
  const [entries, setEntries]     = useState([]);
  const [stats, setStats]         = useState(null);
  const [loading, setLoading]     = useState(true);
  const [allData, setAllData]     = useState({});
  const [loadingData, setLoadingData] = useState(false);
  const [refreshing, setRefreshing]   = useState(false);
  const [activeTab, setActiveTab] = useState('leads');
  const [search, setSearch]       = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterEmail, setFilterEmail]   = useState(false);
  const [filterPhone, setFilterPhone]   = useState(false);
  // Multi-select — lifted up so action bar is above card
  const [selectedLeads, setSelectedLeads] = useState([]);
  // Detail panel
  const [detailLead, setDetailLead] = useState(null);
  // Share confirm
  const [shareTarget, setShareTarget] = useState(null);
  const [user, setUser] = useState(null);

  useEffect(() => {
    try { setUser(JSON.parse(localStorage.getItem('user')||'null')); } catch {}
  }, []);

  const loadEntries = useCallback(async (silent=false) => {
    if (!silent) setLoading(true); else setRefreshing(true);
    try {
      const [eRes, sRes] = await Promise.all([
        fetch(API_CDC).then(r=>r.json()),
        fetch(`${API_CDC}/stats/summary`).then(r=>r.json()),
      ]);
      setEntries(eRes.entries||[]);
      setStats(sRes);
    } catch {}
    setLoading(false); setRefreshing(false);
  }, []);

  const loadAllData = useCallback(async (list) => {
    if (!list.length) return;
    setLoadingData(true);
    try {
      const results = await Promise.all(list.map(e=>fetch(`${API_CDC}/${e._id}`).then(r=>r.json())));
      const map = {};
      results.forEach((res,i) => { if(res.entry?.data) map[list[i]._id]=res.entry.data; });
      setAllData(map);
    } catch {}
    setLoadingData(false);
  }, []);

  useEffect(() => { loadEntries(); }, [loadEntries]);
  useEffect(() => { if(entries.length>0) loadAllData(entries); }, [entries, loadAllData]);

  const flatByType = (type) => {
    const rel = type==='all' ? entries : entries.filter(e=>e.dataType===type);
    return rel.flatMap(e => Array.isArray(allData[e._id]) ? allData[e._id] : []);
  };
  const applyFilters = (rows) => {
    let r = rows;
    if (filterStatus!=='all') r = r.filter(x=>(x.enrichmentStatus||'none')===filterStatus);
    if (filterEmail) r = r.filter(x=>x.email&&x.email!=='');
    if (filterPhone) r = r.filter(x=>x.phone&&x.phone!=='');
    return r;
  };

  const totalRecords = entries.reduce((s,e)=>s+(e.count||0),0);
  const byType = (t) => (stats?.byType||[]).find(x=>x._id===t);
  const tabRows = activeTab==='history' ? [] : applyFilters(flatByType(activeTab));
  const colDefs = activeTab==='contacts' ? CONTACT_COLS : LEAD_COLS;

  const handleShared = () => {
    setShareTarget(null);
    setSelectedLeads([]);
    const el = document.createElement('div');
    el.textContent = 'Lead added to Sales Pipeline';
    el.style.cssText = 'position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:#111;color:#fff;padding:10px 20px;borderRadius:8px;fontSize:13px;fontWeight:500;zIndex:9999;fontFamily:Inter,sans-serif;boxShadow:0 4px 16px rgba(0,0,0,0.15)';
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 2500);
  };

  return (
    <div style={{ padding:'28px 32px', background:'#FAFAFA', minHeight:'100vh', fontFamily:'Inter,-apple-system,sans-serif', color:'#111' }}>

      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:24 }}>
        <div>
          <h1 style={{ fontSize:20, fontWeight:700, margin:0 }}>Core Data Center</h1>
          <p style={{ fontSize:13, color:'#9CA3AF', margin:'4px 0 0' }}>Centralized store — receives and merges data from Orion and other sources</p>
        </div>
        <button onClick={() => loadEntries(true)} style={{ display:'flex', alignItems:'center', gap:6, background:'#fff', color:'#374151', border:'1px solid #E5E7EB', borderRadius:8, padding:'8px 16px', fontSize:13, fontWeight:500, cursor:'pointer', opacity:refreshing?0.7:1 }}>
          <span style={{ display:'inline-block', animation:refreshing?'spin 1s linear infinite':'none' }}>↻</span> Refresh
        </button>
      </div>

      {/* Stat cards */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap:14, marginBottom:24 }}>
        <StatCard label="Total Datasets" value={loading?'—':entries.length} />
        <StatCard label="Total Records"  value={loading?'—':totalRecords.toLocaleString()} />
        <StatCard label="Leads"    value={loading?'—':(byType('leads')?.totalRecords||0).toLocaleString()} />
        <StatCard label="Contacts" value={loading?'—':(byType('contacts')?.totalRecords||0).toLocaleString()} accent="#16A34A" />
      </div>

      {/* ACTION BAR — above table card, only when leads selected */}
      {selectedLeads.length > 0 && (
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', background:'#fff', border:'1px solid #E5E7EB', borderRadius:10, padding:'10px 20px', marginBottom:12, boxShadow:'0 1px 4px rgba(0,0,0,0.06)' }}>
          <span style={{ fontSize:13, color:'#374151', fontWeight:500 }}>{selectedLeads.length} lead{selectedLeads.length>1?'s':''} selected</span>
          <div style={{ display:'flex', gap:8 }}>
            <button onClick={() => setSelectedLeads([])} style={{ padding:'7px 16px', borderRadius:8, border:'1px solid #E5E7EB', background:'#fff', fontSize:13, fontWeight:500, cursor:'pointer', color:'#6B7280' }}>
              Clear
            </button>
            <button onClick={() => setShareTarget(selectedLeads)} style={{ padding:'7px 18px', borderRadius:8, border:'none', background:'#111', color:'#fff', fontSize:13, fontWeight:600, cursor:'pointer' }}>
              Share to Sales Pipeline
            </button>
          </div>
        </div>
      )}

      {/* Main card */}
      <div style={{ background:'#fff', border:'1px solid #F0F0F0', borderRadius:14, boxShadow:'0 1px 4px rgba(0,0,0,0.04)', overflow:'hidden' }}>

        {/* Tab bar + filters */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', borderBottom:'1px solid #F0F0F0', padding:'0 20px', flexWrap:'wrap', gap:8 }}>
          <div style={{ display:'flex' }}>
            {TABS.map(t => (
              <button key={t.key} onClick={() => { setActiveTab(t.key); setSearch(''); setSelectedLeads([]); }} style={{
                padding:'13px 18px', fontSize:13, fontWeight: activeTab===t.key ? 600 : 400,
                color: activeTab===t.key ? '#111' : '#9CA3AF',
                background:'none', border:'none', cursor:'pointer',
                borderBottom: activeTab===t.key ? '2px solid #111' : '2px solid transparent',
                marginBottom:-1,
              }}>{t.label}</button>
            ))}
          </div>

          {activeTab !== 'history' && (
            <div style={{ display:'flex', alignItems:'center', gap:8, paddingBottom:8 }}>
              <div style={{ display:'flex', alignItems:'center', gap:6, background:'#F9FAFB', border:'1px solid #F0F0F0', borderRadius:7, padding:'6px 12px' }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
                <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search..."
                  style={{ border:'none', outline:'none', fontSize:13, background:'transparent', color:'#111', width:150, fontFamily:'Inter,sans-serif' }} />
              </div>
              <select value={filterStatus} onChange={e=>setFilterStatus(e.target.value)}
                style={{ height:34, border:'1px solid #E5E7EB', borderRadius:7, padding:'0 10px', fontSize:12, color:'#374151', background:'#fff', outline:'none', cursor:'pointer' }}>
                <option value="all">All Status</option>
                <option value="enriched">Enriched</option>
                <option value="pending">Pending</option>
                <option value="none">None</option>
              </select>
              <button onClick={()=>setFilterEmail(p=>!p)} style={{ height:34, padding:'0 12px', borderRadius:7, border:'1px solid #E5E7EB', background:filterEmail?'#111':'#fff', color:filterEmail?'#fff':'#374151', fontSize:12, fontWeight:500, cursor:'pointer' }}>Has Email</button>
              <button onClick={()=>setFilterPhone(p=>!p)} style={{ height:34, padding:'0 12px', borderRadius:7, border:'1px solid #E5E7EB', background:filterPhone?'#2563eb':'#fff', color:filterPhone?'#fff':'#374151', fontSize:12, fontWeight:500, cursor:'pointer' }}>Has Phone</button>
            </div>
          )}
        </div>

        {activeTab === 'history' ? (
          <HistoryList entries={entries} loading={loading} user={user} />
        ) : loadingData && tabRows.length === 0 ? (
          <div style={{ padding:60, textAlign:'center', color:'#9CA3AF', fontSize:13 }}>Loading records...</div>
        ) : (
          <LeadsTable
            rows={tabRows}
            colDefs={colDefs}
            search={search}
            onSelectionChange={setSelectedLeads}
            onDetail={setDetailLead}
          />
        )}
      </div>

      {/* Detail panel */}
      {detailLead && (
        <DetailPanel lead={detailLead} onClose={() => setDetailLead(null)} onShare={(lead) => { setShareTarget(lead); }} />
      )}

      {/* Share confirm */}
      {shareTarget && (
        <ShareConfirm leads={shareTarget} onClose={() => setShareTarget(null)} onShared={handleShared} />
      )}

      <style>{`@keyframes spin{from{transform:rotate(0deg);}to{transform:rotate(360deg);}}`}</style>
    </div>
  );
}
