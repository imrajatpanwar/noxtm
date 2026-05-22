// v2 — redesigned to match Orion table style, Noxtm blue accent
import React, { useState, useEffect, useCallback } from 'react';
import { FiSearch, FiCheck, FiRefreshCw, FiDownload, FiSend, FiX, FiChevronRight, FiPhone } from 'react-icons/fi';
import { Skeleton } from './ui/skeleton';
import api from '../config/api';
import { toast } from 'sonner';

const STATUS_TABS = [
  { value: 'all', label: 'All' },
  { value: 'new', label: 'New' },
  { value: 'active', label: 'Active' },
  { value: 'followup', label: 'Follow-up' },
  { value: 'converted', label: 'Converted' },
  { value: 'dead', label: 'Dead' },
];

const STATUS_STYLE = {
  new:       { bg: '#f3f4f6', color: '#6b7280' },
  active:    { bg: '#dcfce7', color: '#16a34a' },
  followup:  { bg: '#fef9c3', color: '#ca8a04' },
  converted: { bg: '#dbeafe', color: '#2563eb' },
  dead:      { bg: '#fee2e2', color: '#dc2626' },
};

const AVATAR_COLORS = [
  '#2563eb', '#7c3aed', '#db2777', '#059669', '#d97706', '#0891b2',
];

function avatarColor(name = '') {
  const code = name.charCodeAt(0) || 0;
  return AVATAR_COLORS[code % AVATAR_COLORS.length];
}

function formatDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function StatusBadge({ status }) {
  const s = STATUS_STYLE[status] || STATUS_STYLE.new;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      padding: '3px 10px', borderRadius: 20,
      fontSize: 11, fontWeight: 600,
      background: s.bg, color: s.color,
      textTransform: 'capitalize',
    }}>{status}</span>
  );
}

/* ── Detail side panel ── */
function DetailPanel({ lead, onClose, onStatusChange }) {
  if (!lead) return null;
  const initials = (lead.name || lead.phone || '?')[0].toUpperCase();
  const color = avatarColor(lead.name || '');

  return (
    <>
      {/* overlay */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.08)', zIndex: 40,
        }}
      />
      {/* panel */}
      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0,
        width: 400, background: '#fff', zIndex: 50,
        boxShadow: '-4px 0 24px rgba(0,0,0,0.08)',
        display: 'flex', flexDirection: 'column',
        fontFamily: "'Switzer', -apple-system, sans-serif",
      }}>
        {/* Panel header */}
        <div style={{ padding: '20px 24px', borderBottom: '1px solid #f0f0f0', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{
              width: 44, height: 44, borderRadius: '50%',
              background: color, color: '#fff',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 18, fontWeight: 700,
            }}>{initials}</div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#111' }}>{lead.name || '—'}</div>
              <div style={{ fontSize: 13, color: '#9ca3af', marginTop: 2, display: 'flex', alignItems: 'center', gap: 5 }}>
                <FiPhone size={11} /> {lead.phone}
              </div>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', padding: 4, borderRadius: 6 }}>
            <FiX size={18} />
          </button>
        </div>

        {/* Scrollable body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>

          {/* Status */}
          <Section label="Status">
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <StatusBadge status={lead.status} />
              <select
                value={lead.status}
                onChange={e => onStatusChange(lead._id, e.target.value)}
                style={{
                  border: '1px solid #e5e7eb', borderRadius: 6,
                  padding: '4px 8px', fontSize: 12, fontWeight: 500,
                  fontFamily: "'Switzer', sans-serif", color: '#374151',
                  background: '#fff', cursor: 'pointer', outline: 'none',
                }}
              >
                <option value="new">New</option>
                <option value="active">Active</option>
                <option value="followup">Follow-up</option>
                <option value="converted">Converted</option>
                <option value="dead">Dead</option>
              </select>
            </div>
          </Section>

          {/* Phone */}
          <Section label="Phone">
            <InfoRow value={lead.phone} mono />
          </Section>

          {/* Reply */}
          <Section label="Reply">
            {lead.campaigns?.some(c => c.replied) ? (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 13, color: '#16a34a', fontWeight: 600 }}>
                <FiCheck size={13} /> Replied
              </span>
            ) : (
              <span style={{ fontSize: 13, color: '#9ca3af' }}>No reply yet</span>
            )}
          </Section>

          {/* Campaigns */}
          <Section label={`Campaigns (${lead.campaigns?.length || 0})`}>
            {lead.campaigns?.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {lead.campaigns.map((c, i) => (
                  <div key={i} style={{
                    background: '#f9fafb', border: '1px solid #f0f0f0',
                    borderRadius: 8, padding: '10px 12px',
                  }}>
                    <div style={{ fontWeight: 600, fontSize: 13, color: '#111' }}>{c.campaignName || 'Campaign'}</div>
                    {c.sentAt && <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 3 }}>Sent: {formatDate(c.sentAt)}</div>}
                    {c.replied && (
                      <div style={{ marginTop: 4, display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#16a34a', fontWeight: 600 }}>
                        <FiCheck size={10} /> Replied
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <span style={{ fontSize: 13, color: '#9ca3af' }}>No campaigns</span>
            )}
          </Section>

          {/* Dates */}
          <Section label="Timeline">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <InfoRow label="Last campaign" value={formatDate(lead.lastCampaignAt)} />
              <InfoRow label="Created" value={formatDate(lead.createdAt)} />
              {lead.updatedAt && <InfoRow label="Updated" value={formatDate(lead.updatedAt)} />}
            </div>
          </Section>

        </div>
      </div>
    </>
  );
}

function Section({ label, children }) {
  return (
    <div style={{ marginBottom: 22 }}>
      <div style={{ fontSize: 10, fontWeight: 600, color: '#9ca3af', letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 8 }}>{label}</div>
      {children}
    </div>
  );
}

function InfoRow({ label, value, mono }) {
  return (
    <div style={{ display: 'flex', justifyContent: label ? 'space-between' : 'flex-start', fontSize: 13, gap: 8 }}>
      {label && <span style={{ color: '#9ca3af' }}>{label}</span>}
      <span style={{ color: '#111', fontWeight: 500, fontFamily: mono ? 'monospace' : 'inherit', fontSize: mono ? 12 : 13 }}>{value || '—'}</span>
    </div>
  );
}

/* ── Main component ── */
export default function LeadsFlow() {
  const [leads, setLeads] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [stats, setStats] = useState({ total: 0, new: 0, active: 0, followup: 0, converted: 0, dead: 0 });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [selectedCampaign, setSelectedCampaign] = useState('');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);
  const [repliedOnly, setRepliedOnly] = useState(false);
  const [selectedRows, setSelectedRows] = useState(new Set());

  const fetchAll = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const params = {};
      if (activeTab !== 'all') params.status = activeTab;
      if (selectedCampaign) params.campaignId = selectedCampaign;
      if (search.trim()) params.search = search.trim();

      const [leadsRes, campaignsRes, statsRes] = await Promise.all([
        api.get('/whatsapp-leads', { params }),
        api.get('/whatsapp-leads/campaigns'),
        api.get('/whatsapp-leads/stats'),
      ]);
      setLeads(leadsRes.data.leads || []);
      setCampaigns(campaignsRes.data.campaigns || []);
      setStats(statsRes.data.stats || { total: 0, new: 0, active: 0, followup: 0, converted: 0, dead: 0 });
    } catch {
      toast.error('Failed to load leads');
    } finally {
      setLoading(false);
    }
  }, [activeTab, selectedCampaign, search]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  useEffect(() => {
    window.addEventListener('dashboard:refresh', fetchAll);
    return () => window.removeEventListener('dashboard:refresh', fetchAll);
  }, [fetchAll]);

  useEffect(() => {
    const t = setTimeout(() => fetchAll(), 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const handleStatusChange = async (leadId, newStatus) => {
    try {
      await api.put(`/whatsapp-leads/${leadId}/status`, { status: newStatus });
      setLeads(prev => prev.map(l => l._id === leadId ? { ...l, status: newStatus } : l));
      if (selected?._id === leadId) setSelected(p => ({ ...p, status: newStatus }));
      const statsRes = await api.get('/whatsapp-leads/stats');
      setStats(statsRes.data.stats || stats);
    } catch {
      toast.error('Failed to update status');
    }
  };

  const toggleRow = (id, e) => {
    e.stopPropagation();
    setSelectedRows(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };
  const toggleAll = () => {
    if (selectedRows.size === filtered.length) setSelectedRows(new Set());
    else setSelectedRows(new Set(filtered.map(l => l._id)));
  };

  const filtered = repliedOnly
    ? leads.filter(l => l.campaigns?.some(c => c.replied))
    : leads;

  const allSelected = filtered.length > 0 && selectedRows.size === filtered.length;

  const S = {
    wrap: { padding: '28px 32px', background: '#f9fafb', minHeight: '100vh', fontFamily: "'Switzer', -apple-system, sans-serif", color: '#111' },
    header: { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 22 },
    headerTitle: { fontSize: 20, fontWeight: 700, margin: 0, color: '#111' },
    headerSub: { fontSize: 13, color: '#9ca3af', margin: '3px 0 0' },
    headerBtns: { display: 'flex', alignItems: 'center', gap: 8 },
    btn: (primary) => ({
      display: 'inline-flex', alignItems: 'center', gap: 6,
      padding: '8px 14px', borderRadius: 8, fontSize: 13, fontWeight: 500,
      cursor: 'pointer', border: primary ? 'none' : '1px solid #e5e7eb',
      background: primary ? '#2563eb' : '#fff',
      color: primary ? '#fff' : '#374151',
      fontFamily: "'Switzer', sans-serif",
    }),
    searchRow: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 },
    searchBox: {
      flex: 1, display: 'flex', alignItems: 'center', gap: 8,
      background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8,
      padding: '0 14px', height: 40,
    },
    searchInput: {
      flex: 1, border: 'none', outline: 'none', fontSize: 13,
      color: '#111', background: 'transparent', fontFamily: "'Switzer', sans-serif",
    },
    filterBtn: (active) => ({
      height: 40, padding: '0 16px', borderRadius: 8, border: '1px solid #e5e7eb',
      background: active ? '#2563eb' : '#fff',
      color: active ? '#fff' : '#374151',
      fontSize: 13, fontWeight: 500, cursor: 'pointer',
      fontFamily: "'Switzer', sans-serif",
    }),
    campaignSel: {
      height: 40, border: '1px solid #e5e7eb', borderRadius: 8,
      padding: '0 10px', fontSize: 13, fontWeight: 500,
      color: '#374151', background: '#fff', outline: 'none',
      cursor: 'pointer', fontFamily: "'Switzer', sans-serif", minWidth: 150,
    },
    tabsWrap: { display: 'flex', gap: 2, background: '#f3f4f6', borderRadius: 8, padding: 3 },
    tab: (active) => ({
      padding: '5px 12px', borderRadius: 6, border: 'none',
      background: active ? '#fff' : 'transparent',
      color: active ? '#111' : '#6b7280',
      fontSize: 12, fontWeight: 500, cursor: 'pointer',
      boxShadow: active ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
      fontFamily: "'Switzer', sans-serif",
    }),
    tableCard: { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, overflow: 'hidden' },
    th: { padding: '10px 16px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em', background: '#f9fafb', borderBottom: '1px solid #e5e7eb' },
    td: { padding: '13px 16px', fontSize: 13, color: '#374151', borderBottom: '1px solid #f3f4f6', verticalAlign: 'middle' },
  };

  return (
    <div style={S.wrap}>
      {/* Header */}
      <div style={S.header}>
        <div>
          <h1 style={S.headerTitle}>Leads / CRM</h1>
          <p style={S.headerSub}>{stats.total} leads</p>
        </div>
        <div style={S.headerBtns}>
          {selectedRows.size > 0 && (
            <span style={{ fontSize: 12, color: '#9ca3af' }}>{selectedRows.size} selected</span>
          )}
          <button onClick={() => fetchAll(true)} style={S.btn(false)}>
            <FiRefreshCw size={13} /> Refresh
          </button>
          <button style={S.btn(false)}>
            <FiDownload size={13} /> Export CSV
          </button>
          <button style={S.btn(true)}>
            <FiSend size={13} /> Send to Core Data
          </button>
        </div>
      </div>

      {/* Search + filters */}
      <div style={S.searchRow}>
        <div style={S.searchBox}>
          <FiSearch size={14} color="#9ca3af" />
          <input
            style={S.searchInput}
            placeholder="Search leads..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <select style={S.campaignSel} value={selectedCampaign} onChange={e => setSelectedCampaign(e.target.value)}>
          <option value="">All Campaigns</option>
          {campaigns.map(c => (
            <option key={c._id} value={c._id}>{c.name}</option>
          ))}
        </select>
        <button style={S.filterBtn(repliedOnly)} onClick={() => setRepliedOnly(p => !p)}>
          Replied only
        </button>
        <div style={S.tabsWrap}>
          {STATUS_TABS.map(t => (
            <button key={t.value} style={S.tab(activeTab === t.value)} onClick={() => setActiveTab(t.value)}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div style={S.tableCard}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={{ ...S.th, width: 44 }}>
                <input type="checkbox" checked={allSelected} onChange={toggleAll} style={{ borderRadius: 4, cursor: 'pointer' }} />
              </th>
              {['Name', 'Phone', 'Status', 'Campaigns', 'Last Campaign', 'Reply', ''].map(h => (
                <th key={h} style={S.th}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              [...Array(6)].map((_, i) => (
                <tr key={i}>
                  <td style={S.td}><Skeleton style={{ height: 14, width: 14, borderRadius: 4 }} /></td>
                  <td style={S.td}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <Skeleton style={{ width: 32, height: 32, borderRadius: '50%' }} />
                      <div>
                        <Skeleton style={{ height: 13, width: 120, borderRadius: 6, marginBottom: 5 }} />
                        <Skeleton style={{ height: 11, width: 80, borderRadius: 6 }} />
                      </div>
                    </div>
                  </td>
                  {[90, 60, 100, 80, 60, 20].map((w, j) => (
                    <td key={j} style={S.td}><Skeleton style={{ height: 13, width: w, borderRadius: 6 }} /></td>
                  ))}
                </tr>
              ))
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ ...S.td, textAlign: 'center', padding: '52px 24px' }}>
                  <FiPhone size={32} color="#e5e7eb" style={{ display: 'block', margin: '0 auto 12px' }} />
                  <div style={{ fontSize: 14, fontWeight: 600, color: '#374151', marginBottom: 4 }}>No leads found</div>
                  <div style={{ fontSize: 13, color: '#9ca3af' }}>Leads appear here when WhatsApp campaigns are sent</div>
                </td>
              </tr>
            ) : filtered.map(lead => {
              const initials = (lead.name || lead.phone || '?')[0].toUpperCase();
              const color = avatarColor(lead.name || '');
              const replied = lead.campaigns?.some(c => c.replied);
              const isSelected = selected?._id === lead._id;

              return (
                <tr
                  key={lead._id}
                  onClick={() => setSelected(isSelected ? null : lead)}
                  style={{
                    cursor: 'pointer',
                    background: isSelected ? '#eff6ff' : 'transparent',
                    borderLeft: isSelected ? '3px solid #2563eb' : '3px solid transparent',
                    transition: 'background 0.1s',
                  }}
                  onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = '#fafafa'; }}
                  onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = 'transparent'; }}
                >
                  {/* Checkbox */}
                  <td style={{ ...S.td, width: 44 }} onClick={e => toggleRow(lead._id, e)}>
                    <input type="checkbox" checked={selectedRows.has(lead._id)} onChange={() => {}} style={{ borderRadius: 4, cursor: 'pointer' }} />
                  </td>

                  {/* Name */}
                  <td style={S.td}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{
                        width: 32, height: 32, borderRadius: '50%',
                        background: color, color: '#fff',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 13, fontWeight: 700, flexShrink: 0,
                      }}>{initials}</div>
                      <span style={{ fontWeight: 600, color: '#111' }}>{lead.name || '—'}</span>
                    </div>
                  </td>

                  {/* Phone */}
                  <td style={S.td}>
                    <span style={{ fontFamily: 'monospace', fontSize: 12, color: '#2563eb' }}>{lead.phone}</span>
                  </td>

                  {/* Status */}
                  <td style={S.td}><StatusBadge status={lead.status} /></td>

                  {/* Campaigns */}
                  <td style={S.td}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                      {lead.campaigns?.slice(0, 2).map((c, i) => (
                        <span key={i} style={{
                          display: 'inline-block', fontSize: 11, fontWeight: 500,
                          padding: '2px 7px', borderRadius: 4,
                          background: '#f3f4f6', color: '#374151',
                          maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        }}>{c.campaignName || 'Campaign'}</span>
                      ))}
                      {(lead.campaigns?.length || 0) > 2 && (
                        <span style={{ fontSize: 11, color: '#9ca3af' }}>+{lead.campaigns.length - 2} more</span>
                      )}
                      {!lead.campaigns?.length && <span style={{ color: '#d1d5db' }}>—</span>}
                    </div>
                  </td>

                  {/* Last campaign */}
                  <td style={{ ...S.td, color: '#9ca3af', fontSize: 12 }}>{formatDate(lead.lastCampaignAt)}</td>

                  {/* Reply */}
                  <td style={S.td}>
                    {replied ? (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 600, color: '#16a34a' }}>
                        <FiCheck size={11} /> Replied
                      </span>
                    ) : (
                      <span style={{ fontSize: 11, color: '#d1d5db' }}>No reply</span>
                    )}
                  </td>

                  {/* Arrow */}
                  <td style={{ ...S.td, width: 32, padding: '13px 12px' }}>
                    <FiChevronRight size={14} color="#d1d5db" />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Detail panel */}
      {selected && (
        <DetailPanel
          lead={selected}
          onClose={() => setSelected(null)}
          onStatusChange={handleStatusChange}
        />
      )}
    </div>
  );
}
