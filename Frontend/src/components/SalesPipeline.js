// Sales Pipeline — manage leads shared from Core Data Center
import React, { useState, useEffect, useCallback } from 'react';
import api from '../config/api';

const STATUS_CFG = {
  new:       { label:'New',       color:'#6B7280', bg:'#F3F4F6', border:'#E5E7EB' },
  contacted: { label:'Contacted', color:'#2563EB', bg:'#EFF6FF', border:'#BFDBFE' },
  followup:  { label:'Follow-up', color:'#D97706', bg:'#FFFBEB', border:'#FDE68A' },
  converted: { label:'Converted', color:'#16A34A', bg:'#F0FDF4', border:'#BBF7D0' },
};
const STATUSES = Object.keys(STATUS_CFG);

const AVATAR_COLORS = ['#111827','#2563eb','#7c3aed','#059669','#d97706','#db2777'];
const avatarColor = (s='') => AVATAR_COLORS[(s.charCodeAt(0)||0) % AVATAR_COLORS.length];

function Avatar({ name='', src, size=32 }) {
  const initial = name[0]?.toUpperCase()||'?';
  if (src) return <img src={src} alt={name} title={name} style={{ width:size, height:size, borderRadius:'50%', objectFit:'cover', flexShrink:0 }} />;
  return (
    <div title={name} style={{ width:size, height:size, borderRadius:'50%', background:avatarColor(name), color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', fontSize:size*0.4, fontWeight:700, flexShrink:0 }}>
      {initial}
    </div>
  );
}

function StatusBadge({ status }) {
  const s = STATUS_CFG[status]||STATUS_CFG.new;
  return <span style={{ display:'inline-flex', alignItems:'center', padding:'3px 10px', borderRadius:20, fontSize:11, fontWeight:600, background:s.bg, color:s.color, border:`1px solid ${s.border}` }}>{s.label}</span>;
}

function formatDate(d) {
  if (!d) return null;
  return new Date(d).toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric' });
}
function formatDateTime(d) {
  if (!d) return '—';
  return new Date(d).toLocaleString('en-US', { month:'short', day:'numeric', hour:'2-digit', minute:'2-digit' });
}

/* ── Detail side panel ── */
function DetailPanel({ lead, team, onClose, onUpdate }) {
  const [status, setStatus]     = useState(lead.status);
  const [remark, setRemark]     = useState(lead.remark||'');
  const [followUpAt, setFollowUpAt] = useState(lead.followUpAt ? new Date(lead.followUpAt).toISOString().slice(0,16) : '');
  const [assignedTo, setAssignedTo] = useState(lead.assignedTo?.userId||'');
  const [saving, setSaving]     = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      const res = await api.put(`/sales-pipeline/${lead._id}`, { status, remark, followUpAt: followUpAt||null, assignedToId: assignedTo||undefined });
      if (res.data.success) onUpdate(res.data.lead);
    } catch {}
    setSaving(false);
  };

  const fullData = lead.fullData || {};
  const fields = [
    { label:'Email',    value: lead.email || fullData.email },
    { label:'Phone',    value: lead.phone || fullData.phone },
    { label:'Company',  value: lead.company || fullData.currentCompany },
    { label:'Location', value: lead.location || fullData.location },
    { label:'Headline', value: lead.headline || fullData.headline },
    { label:'Degree',   value: fullData.connectionDegree },
    { label:'LinkedIn', value: fullData.linkedinUrl },
  ].filter(f => f.value);

  return (
    <>
      <div onClick={onClose} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.1)', zIndex:40 }} />
      <div style={{ position:'fixed', top:0, right:0, bottom:0, width:440, background:'#fff', zIndex:50, boxShadow:'-4px 0 30px rgba(0,0,0,0.1)', display:'flex', flexDirection:'column', fontFamily:'Inter,-apple-system,sans-serif' }}>

        {/* Header */}
        <div style={{ padding:'20px 24px', borderBottom:'1px solid #F0F0F0' }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
            <div style={{ display:'flex', alignItems:'center', gap:12 }}>
              <Avatar name={lead.name} size={42} />
              <div>
                <div style={{ fontWeight:700, fontSize:16, color:'#111' }}>{lead.name||'—'}</div>
                <div style={{ fontSize:12, color:'#9CA3AF', marginTop:2 }}>{lead.company||lead.headline||'—'}</div>
              </div>
            </div>
            <button onClick={onClose} style={{ background:'none', border:'none', color:'#9CA3AF', cursor:'pointer', fontSize:20, padding:4 }}>×</button>
          </div>

          {/* Shared by + assigned */}
          <div style={{ display:'flex', alignItems:'center', gap:16, marginTop:14 }}>
            {lead.sharedBy?.name && (
              <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                <span style={{ fontSize:10, color:'#9CA3AF', textTransform:'uppercase', letterSpacing:'0.05em' }}>Shared by</span>
                <Avatar name={lead.sharedBy.name} src={lead.sharedBy.avatar} size={22} />
                <span style={{ fontSize:12, color:'#374151', fontWeight:500 }}>{lead.sharedBy.name.split(' ')[0]}</span>
              </div>
            )}
            {lead.assignedTo?.name && (
              <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                <span style={{ fontSize:10, color:'#9CA3AF', textTransform:'uppercase', letterSpacing:'0.05em' }}>Working</span>
                <Avatar name={lead.assignedTo.name} src={lead.assignedTo.avatar} size={22} />
                <span style={{ fontSize:12, color:'#374151', fontWeight:500 }}>{lead.assignedTo.name.split(' ')[0]}</span>
              </div>
            )}
          </div>
        </div>

        {/* Scrollable body */}
        <div style={{ flex:1, overflowY:'auto', padding:'20px 24px' }}>

          {/* Lead details */}
          <Section label="Contact Details">
            {fields.map(f => (
              <div key={f.label} style={{ display:'flex', justifyContent:'space-between', marginBottom:8, fontSize:13 }}>
                <span style={{ color:'#9CA3AF', minWidth:70 }}>{f.label}</span>
                <span style={{ color: f.label==='Phone' ? '#2563eb' : f.label==='Email' ? '#111' : '#374151', fontWeight: f.label==='Phone'||f.label==='Email' ? 600 : 400, fontFamily: f.label==='Phone'||f.label==='Email' ? 'monospace' : 'inherit', fontSize: f.label==='Phone'||f.label==='Email' ? 12 : 13, textAlign:'right', maxWidth:260, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                  {f.label==='LinkedIn' ? <a href={f.value} target="_blank" rel="noreferrer" style={{ color:'#2563eb', textDecoration:'none' }}>View Profile →</a> : f.value}
                </span>
              </div>
            ))}
          </Section>

          {/* Status */}
          <Section label="Status">
            <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
              {STATUSES.map(s => {
                const c = STATUS_CFG[s];
                const active = status===s;
                return (
                  <button key={s} onClick={()=>setStatus(s)} style={{ padding:'5px 12px', borderRadius:20, border:`1px solid ${active?c.color:c.border}`, background:active?c.bg:'#fff', color:active?c.color:'#6B7280', fontSize:12, fontWeight:active?600:400, cursor:'pointer' }}>
                    {c.label}
                  </button>
                );
              })}
            </div>
          </Section>

          {/* Assign to */}
          <Section label="Assigned To">
            <select value={assignedTo} onChange={e=>setAssignedTo(e.target.value)}
              style={{ width:'100%', border:'1px solid #E5E7EB', borderRadius:8, padding:'8px 12px', fontSize:13, color:'#374151', background:'#fff', outline:'none', cursor:'pointer', fontFamily:'Inter,sans-serif' }}>
              <option value="">Unassigned</option>
              {team.map(u => <option key={u._id} value={u._id}>{u.fullName} ({u.role})</option>)}
            </select>
          </Section>

          {/* Follow-up */}
          <Section label="Follow-up Date & Time">
            <input type="datetime-local" value={followUpAt} onChange={e=>setFollowUpAt(e.target.value)}
              style={{ width:'100%', border:'1px solid #E5E7EB', borderRadius:8, padding:'8px 12px', fontSize:13, color:'#374151', background:'#fff', outline:'none', boxSizing:'border-box', fontFamily:'Inter,sans-serif' }} />
          </Section>

          {/* Remark */}
          <Section label="Remark / Notes">
            <textarea value={remark} onChange={e=>setRemark(e.target.value)} rows={4}
              placeholder="Add notes about this lead..."
              style={{ width:'100%', border:'1px solid #E5E7EB', borderRadius:8, padding:'10px 12px', fontSize:13, color:'#374151', background:'#fff', outline:'none', resize:'vertical', boxSizing:'border-box', fontFamily:'Inter,sans-serif', lineHeight:1.5 }} />
          </Section>

          {/* Timeline */}
          <Section label="Timeline">
            <div style={{ fontSize:13, color:'#9CA3AF', display:'flex', flexDirection:'column', gap:5 }}>
              <div>Added: <span style={{ color:'#374151' }}>{formatDateTime(lead.createdAt)}</span></div>
              {lead.followUpAt && <div>Follow-up: <span style={{ color:'#D97706', fontWeight:600 }}>{formatDateTime(lead.followUpAt)}</span></div>}
              {lead.sourceEntryLabel && <div>Source: <span style={{ color:'#374151' }}>{lead.sourceEntryLabel}</span></div>}
            </div>
          </Section>
        </div>

        {/* Footer */}
        <div style={{ padding:'16px 24px', borderTop:'1px solid #F0F0F0', display:'flex', gap:10 }}>
          <button onClick={onClose} style={{ flex:1, padding:'10px', borderRadius:8, border:'1px solid #E5E7EB', background:'#fff', fontSize:13, fontWeight:500, cursor:'pointer', color:'#374151' }}>Cancel</button>
          <button onClick={save} disabled={saving} style={{ flex:2, padding:'10px', borderRadius:8, border:'none', background:'#111', color:'#fff', fontSize:13, fontWeight:600, cursor:'pointer', opacity:saving?0.6:1 }}>
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </>
  );
}

function Section({ label, children }) {
  return (
    <div style={{ marginBottom:22 }}>
      <div style={{ fontSize:10, fontWeight:600, color:'#9CA3AF', letterSpacing:'0.07em', textTransform:'uppercase', marginBottom:10 }}>{label}</div>
      {children}
    </div>
  );
}

/* ── Lead card ── */
function LeadCard({ lead, onClick }) {
  const followUpSoon = lead.followUpAt && new Date(lead.followUpAt) < new Date(Date.now() + 24*60*60*1000);

  return (
    <div onClick={onClick} style={{ background:'#fff', border:'1px solid #F0F0F0', borderRadius:12, padding:'16px 18px', cursor:'pointer', transition:'box-shadow 0.15s', boxShadow:'0 1px 3px rgba(0,0,0,0.04)' }}
      onMouseEnter={e=>e.currentTarget.style.boxShadow='0 4px 16px rgba(0,0,0,0.08)'}
      onMouseLeave={e=>e.currentTarget.style.boxShadow='0 1px 3px rgba(0,0,0,0.04)'}>

      {/* Top row */}
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:10 }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <Avatar name={lead.name} size={36} />
          <div>
            <div style={{ fontWeight:700, fontSize:14, color:'#111' }}>{lead.name||'—'}</div>
            <div style={{ fontSize:11, color:'#9CA3AF', marginTop:1 }}>{lead.company||lead.headline||'No company'}</div>
          </div>
        </div>
        <StatusBadge status={lead.status} />
      </div>

      {/* Contact info */}
      <div style={{ display:'flex', flexDirection:'column', gap:4, marginBottom:12 }}>
        {lead.email && (
          <div style={{ fontSize:12, color:'#374151', fontFamily:'monospace' }}>{lead.email}</div>
        )}
        {lead.phone && (
          <div style={{ fontSize:12, color:'#2563eb', fontFamily:'monospace', fontWeight:600 }}>{lead.phone}</div>
        )}
        {!lead.email && !lead.phone && (
          <div style={{ fontSize:12, color:'#D1D5DB' }}>No contact info</div>
        )}
      </div>

      {/* Remark */}
      {lead.remark && (
        <div style={{ fontSize:12, color:'#6B7280', background:'#F9FAFB', borderRadius:6, padding:'6px 10px', marginBottom:10, lineHeight:1.4 }}>
          {lead.remark.slice(0,100)}{lead.remark.length>100?'...':''}
        </div>
      )}

      {/* Bottom row */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          {/* Who is working on this */}
          {lead.assignedTo?.name && (
            <div style={{ display:'flex', alignItems:'center', gap:5 }}>
              <Avatar name={lead.assignedTo.name} src={lead.assignedTo.avatar} size={22} />
              <span style={{ fontSize:11, color:'#9CA3AF' }}>{lead.assignedTo.name.split(' ')[0]}</span>
            </div>
          )}
          {!lead.assignedTo?.name && <span style={{ fontSize:11, color:'#D1D5DB' }}>Unassigned</span>}
        </div>

        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          {lead.followUpAt && (
            <span style={{ fontSize:11, color: followUpSoon ? '#D97706' : '#9CA3AF', fontWeight: followUpSoon ? 600 : 400 }}>
              {followUpSoon ? '⏰ ' : ''}{formatDate(lead.followUpAt)}
            </span>
          )}
          {lead.sharedBy?.name && (
            <div title={`Shared by ${lead.sharedBy.name}`}>
              <Avatar name={lead.sharedBy.name} src={lead.sharedBy.avatar} size={20} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Main ── */
export default function SalesPipeline() {
  const [leads, setLeads]         = useState([]);
  const [team, setTeam]           = useState([]);
  const [stats, setStats]         = useState(null);
  const [loading, setLoading]     = useState(true);
  const [selected, setSelected]   = useState(null);
  const [activeStatus, setActiveStatus] = useState('all');
  const [search, setSearch]       = useState('');
  const [view, setView]           = useState('grid'); // grid | list

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (activeStatus !== 'all') params.status = activeStatus;
      if (search.trim()) params.search = search.trim();
      const [leadsRes, teamRes, statsRes] = await Promise.all([
        api.get('/sales-pipeline', { params }),
        api.get('/sales-pipeline/team/members'),
        api.get('/sales-pipeline/stats/summary'),
      ]);
      setLeads(leadsRes.data.leads || []);
      setTeam(teamRes.data.users || []);
      setStats(statsRes.data);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  }, [activeStatus, search]);

  useEffect(() => { fetchAll(); }, [fetchAll]);
  useEffect(() => {
    const t = setTimeout(() => fetchAll(), 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const handleUpdate = (updated) => {
    setLeads(prev => prev.map(l => l._id === updated._id ? updated : l));
    setSelected(updated);
  };

  const byStatus = (s) => (stats?.byStatus||[]).find(x=>x._id===s)?.count||0;

  const STATUS_TABS = [
    { key:'all',       label:'All',       count: stats?.total||0 },
    { key:'new',       label:'New',       count: byStatus('new') },
    { key:'contacted', label:'Contacted', count: byStatus('contacted') },
    { key:'followup',  label:'Follow-up', count: byStatus('followup') },
    { key:'converted', label:'Converted', count: byStatus('converted') },
  ];

  return (
    <div style={{ padding:'28px 32px', background:'#F9FAFB', minHeight:'100vh', fontFamily:'Inter,-apple-system,sans-serif', color:'#111' }}>

      {/* Header */}
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:24 }}>
        <div>
          <h1 style={{ fontSize:20, fontWeight:700, margin:0 }}>Sales Pipeline</h1>
          <p style={{ fontSize:13, color:'#9CA3AF', margin:'4px 0 0' }}>Manage leads from Core Data Center — track status, follow-ups &amp; assignments</p>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          {/* View toggle */}
          <div style={{ display:'flex', border:'1px solid #E5E7EB', borderRadius:8, overflow:'hidden' }}>
            {[{v:'grid',icon:'⊞'},{v:'list',icon:'☰'}].map(({v,icon}) => (
              <button key={v} onClick={()=>setView(v)} style={{ padding:'7px 12px', border:'none', background:view===v?'#111':'#fff', color:view===v?'#fff':'#6B7280', cursor:'pointer', fontSize:14 }}>{icon}</button>
            ))}
          </div>
          <button onClick={fetchAll} style={{ display:'flex', alignItems:'center', gap:6, padding:'8px 14px', borderRadius:8, border:'1px solid #E5E7EB', background:'#fff', fontSize:13, fontWeight:500, cursor:'pointer', color:'#374151' }}>
            ↻ Refresh
          </button>
        </div>
      </div>

      {/* Stat cards */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:12, marginBottom:24 }}>
        {STATUS_TABS.filter(t=>t.key!=='all').map(t => {
          return (
            <div key={t.key} onClick={()=>setActiveStatus(t.key===activeStatus?'all':t.key)} style={{ background:'#fff', border:`1px solid ${activeStatus===t.key?STATUS_CFG[t.key].color:'#F0F0F0'}`, borderRadius:12, padding:'14px 18px', cursor:'pointer', boxShadow:'0 1px 3px rgba(0,0,0,0.04)' }}>
              <div style={{ fontSize:24, fontWeight:700, color:STATUS_CFG[t.key].color }}>{t.count}</div>
              <div style={{ fontSize:11, color:'#9CA3AF', marginTop:4, fontWeight:500, textTransform:'uppercase', letterSpacing:'0.04em' }}>{t.label}</div>
            </div>
          );
        })}
      </div>

      {/* Filter bar */}
      <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:20 }}>
        {/* Search */}
        <div style={{ flex:1, display:'flex', alignItems:'center', gap:8, background:'#fff', border:'1px solid #E5E7EB', borderRadius:8, padding:'0 14px', height:40 }}>
          <span style={{ color:'#9CA3AF', fontSize:14 }}>🔍</span>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search name, email, phone, company..."
            style={{ flex:1, border:'none', outline:'none', fontSize:13, color:'#111', background:'transparent', fontFamily:'Inter,sans-serif' }} />
        </div>
        {/* Status tabs */}
        <div style={{ display:'flex', gap:2, background:'#F3F4F6', borderRadius:8, padding:3 }}>
          {STATUS_TABS.map(t => (
            <button key={t.key} onClick={()=>setActiveStatus(t.key)} style={{ padding:'5px 12px', borderRadius:6, border:'none', background:activeStatus===t.key?'#fff':'transparent', color:activeStatus===t.key?'#111':'#6B7280', fontSize:12, fontWeight:activeStatus===t.key?600:400, cursor:'pointer', boxShadow:activeStatus===t.key?'0 1px 3px rgba(0,0,0,0.1)':'none', fontFamily:'Inter,sans-serif', whiteSpace:'nowrap' }}>
              {t.label} {t.count > 0 && <span style={{ opacity:0.6 }}>{t.count}</span>}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div style={{ textAlign:'center', padding:60, color:'#9CA3AF' }}>Loading pipeline...</div>
      ) : leads.length === 0 ? (
        <div style={{ textAlign:'center', padding:'80px 24px', color:'#9CA3AF' }}>
          <div style={{ width:48, height:48, borderRadius:12, background:'#F3F4F6', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 16px' }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="1.5"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>
          </div>
          <div style={{ fontSize:15, fontWeight:600, color:'#374151', marginBottom:6 }}>No leads in pipeline</div>
          <div style={{ fontSize:13 }}>Go to Core Data Center → select leads → Share to Sales Pipeline</div>
        </div>
      ) : view === 'grid' ? (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(300px, 1fr))', gap:14 }}>
          {leads.map(lead => (
            <LeadCard key={lead._id} lead={lead} onClick={()=>setSelected(lead)} />
          ))}
        </div>
      ) : (
        /* List view */
        <div style={{ background:'#fff', border:'1px solid #F0F0F0', borderRadius:14, overflow:'hidden', boxShadow:'0 1px 4px rgba(0,0,0,0.04)' }}>
          <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
            <thead>
              <tr style={{ background:'#FAFAFA' }}>
                {['Name','Email','Phone','Company','Status','Assigned','Follow-up','Remark'].map(h => (
                  <th key={h} style={{ padding:'10px 16px', textAlign:'left', fontSize:11, fontWeight:600, color:'#9CA3AF', textTransform:'uppercase', letterSpacing:'0.05em', borderBottom:'1px solid #F0F0F0', whiteSpace:'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {leads.map(lead => (
                <tr key={lead._id} onClick={()=>setSelected(lead)} style={{ borderBottom:'1px solid #F5F5F5', cursor:'pointer' }}
                  onMouseEnter={e=>e.currentTarget.style.background='#FAFAFA'}
                  onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                  <td style={{ padding:'12px 16px' }}>
                    <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                      <Avatar name={lead.name} size={30} />
                      <span style={{ fontWeight:600, color:'#111' }}>{lead.name||'—'}</span>
                    </div>
                  </td>
                  <td style={{ padding:'12px 16px', fontFamily:'monospace', fontSize:12, color:'#374151' }}>{lead.email||'—'}</td>
                  <td style={{ padding:'12px 16px', fontFamily:'monospace', fontSize:12, color:'#2563eb', fontWeight:600 }}>{lead.phone||'—'}</td>
                  <td style={{ padding:'12px 16px', color:'#374151', maxWidth:140, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{lead.company||'—'}</td>
                  <td style={{ padding:'12px 16px' }}><StatusBadge status={lead.status} /></td>
                  <td style={{ padding:'12px 16px' }}>
                    {lead.assignedTo?.name ? (
                      <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                        <Avatar name={lead.assignedTo.name} src={lead.assignedTo.avatar} size={24} />
                        <span style={{ fontSize:12, color:'#374151' }}>{lead.assignedTo.name.split(' ')[0]}</span>
                      </div>
                    ) : <span style={{ fontSize:12, color:'#D1D5DB' }}>—</span>}
                  </td>
                  <td style={{ padding:'12px 16px', fontSize:12, color: lead.followUpAt && new Date(lead.followUpAt)<new Date(Date.now()+86400000) ? '#D97706':'#9CA3AF', fontWeight: lead.followUpAt && new Date(lead.followUpAt)<new Date(Date.now()+86400000)?600:400 }}>
                    {formatDate(lead.followUpAt)||'—'}
                  </td>
                  <td style={{ padding:'12px 16px', color:'#6B7280', maxWidth:160, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{lead.remark||'—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Detail panel */}
      {selected && (
        <DetailPanel lead={selected} team={team} onClose={()=>setSelected(null)} onUpdate={handleUpdate} />
      )}
    </div>
  );
}
