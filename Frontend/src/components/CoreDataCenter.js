// v2 — Core Data Center
import React, { useState, useEffect, useCallback } from 'react';

const API = 'http://localhost:5001/api/core-data';

const TYPE_META = {
  leads:    { color: '#E8602C', bg: '#FFF4EE', border: '#FDDCCA' },
  contacts: { color: '#16A34A', bg: '#F0FDF4', border: '#BBF7D0' },
  custom:   { color: '#7C3AED', bg: '#F5F3FF', border: '#DDD6FE' },
  test:     { color: '#6B7280', bg: '#F9FAFB', border: '#E5E7EB' },
};
const meta = (t) => TYPE_META[t] || { color: '#6B7280', bg: '#F9FAFB', border: '#E5E7EB' };

/* ── tiny components ── */
function Pill({ type }) {
  const m = meta(type);
  return (
    <span style={{
      background: m.bg, color: m.color, border: `1px solid ${m.border}`,
      borderRadius: 5, padding: '2px 9px', fontSize: 11, fontWeight: 600, letterSpacing: 0.2,
    }}>{type}</span>
  );
}

function StatCard({ label, value, sub, accent }) {
  return (
    <div style={{
      background: '#fff', border: '1px solid #F0F0F0', borderRadius: 12,
      padding: '18px 20px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
    }}>
      <div style={{ fontSize: 26, fontWeight: 700, color: accent || '#111', lineHeight: 1.1 }}>{value}</div>
      <div style={{ fontSize: 12, color: '#6B7280', marginTop: 5, fontWeight: 500 }}>{label}</div>
      {sub && <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

function SegmentBar({ value, max }) {
  const total = 24;
  const filled = max > 0 ? Math.round((value / max) * total) : 0;
  return (
    <div style={{ display: 'flex', gap: 2, alignItems: 'center' }}>
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} style={{
          flex: 1, height: 6, borderRadius: 2,
          background: i < filled ? '#E8602C' : '#F0F0F0',
          transition: 'background 0.2s',
        }} />
      ))}
    </div>
  );
}

function DataTable({ data }) {
  if (!Array.isArray(data) || data.length === 0)
    return <div style={{ color: '#9CA3AF', fontSize: 13, padding: '24px 0' }}>No records in this dataset.</div>;

  const keys = Object.keys(data[0]).filter(k => !['__v'].includes(k)).slice(0, 8);
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead>
          <tr>
            {keys.map(k => (
              <th key={k} style={{
                padding: '8px 14px', textAlign: 'left', color: '#9CA3AF', fontWeight: 500,
                fontSize: 11, letterSpacing: 0.5, borderBottom: '1px solid #F0F0F0', whiteSpace: 'nowrap',
              }}>{k.toUpperCase()}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.slice(0, 100).map((row, i) => (
            <tr key={i} style={{ borderBottom: '1px solid #FAFAFA' }}>
              {keys.map(k => (
                <td key={k} style={{
                  padding: '9px 14px', color: '#374151',
                  maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {typeof row[k] === 'object' && row[k] !== null
                    ? JSON.stringify(row[k]).slice(0, 60)
                    : String(row[k] ?? '—')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {data.length > 100 && (
        <div style={{ fontSize: 12, color: '#9CA3AF', padding: '10px 14px', borderTop: '1px solid #F0F0F0' }}>
          Showing 100 of {data.length} records
        </div>
      )}
    </div>
  );
}

/* ── main ── */
export default function CoreDataCenter() {
  const [entries, setEntries]       = useState([]);
  const [stats, setStats]           = useState(null);
  const [selected, setSelected]     = useState(null);
  const [selectedData, setSelectedData] = useState(null);
  const [loadingData, setLoadingData]   = useState(false);
  const [loading, setLoading]       = useState(true);
  const [filterType, setFilterType] = useState('all');
  const [deleting, setDeleting]     = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true); else setRefreshing(true);
    try {
      const [eRes, sRes] = await Promise.all([
        fetch(API).then(r => r.json()),
        fetch(`${API}/stats/summary`).then(r => r.json()),
      ]);
      setEntries(eRes.entries || []);
      setStats(sRes);
    } catch {}
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const openEntry = async (entry) => {
    if (selected?._id === entry._id) { setSelected(null); setSelectedData(null); return; }
    setSelected(entry);
    setSelectedData(null);
    setLoadingData(true);
    try {
      const res = await fetch(`${API}/${entry._id}`).then(r => r.json());
      setSelectedData(res.entry?.data ?? null);
    } catch {}
    setLoadingData(false);
  };

  const deleteEntry = async (id, e) => {
    e.stopPropagation();
    setDeleting(id);
    await fetch(`${API}/${id}`, { method: 'DELETE' });
    setEntries(p => p.filter(x => x._id !== id));
    if (selected?._id === id) { setSelected(null); setSelectedData(null); }
    setDeleting(null);
    load(true);
  };

  const types = ['all', ...new Set(entries.map(e => e.dataType))];
  const filtered = filterType === 'all' ? entries : entries.filter(e => e.dataType === filterType);
  const totalRecords = entries.reduce((s, e) => s + (e.count || 0), 0);

  return (
    <div style={{ padding: '28px 32px', background: '#FAFAFA', minHeight: '100vh', fontFamily: 'Inter, -apple-system, sans-serif', color: '#111' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0, color: '#111' }}>Core Data Center</h1>
          <p style={{ color: '#9CA3AF', fontSize: 13, marginTop: 3, margin: '3px 0 0' }}>
            Centralized store — receives data from Orion and other sources
          </p>
        </div>
        <button
          onClick={() => load(true)}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            background: '#111', color: '#fff', border: 'none', borderRadius: 8,
            padding: '8px 16px', fontSize: 13, fontWeight: 500, cursor: 'pointer',
            opacity: refreshing ? 0.7 : 1,
          }}
        >
          <span style={{ display: 'inline-block', animation: refreshing ? 'spin 1s linear infinite' : 'none' }}>↻</span>
          Refresh
        </button>
      </div>

      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 24 }}>
        <StatCard label="Total Datasets" value={loading ? '—' : entries.length} />
        <StatCard label="Total Records" value={loading ? '—' : totalRecords.toLocaleString()} accent="#E8602C" />
        {(stats?.byType || []).slice(0, 2).map(t => (
          <StatCard key={t._id} label={t._id} value={t.totalRecords.toLocaleString()}
            sub={`${t.count} dataset${t.count !== 1 ? 's' : ''}`} accent={meta(t._id).color} />
        ))}
      </div>

      {/* Body */}
      <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: 16 }}>

        {/* List panel */}
        <div style={{ background: '#fff', border: '1px solid #F0F0F0', borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.04)', overflow: 'hidden' }}>

          {/* Type filter tabs */}
          <div style={{ display: 'flex', borderBottom: '1px solid #F0F0F0', overflowX: 'auto' }}>
            {types.map(t => (
              <button key={t} onClick={() => setFilterType(t)} style={{
                padding: '9px 14px', fontSize: 12, fontWeight: filterType === t ? 600 : 400,
                color: filterType === t ? '#111' : '#9CA3AF', background: 'none', border: 'none',
                borderBottom: filterType === t ? '2px solid #E8602C' : '2px solid transparent',
                cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0,
              }}>{t}</button>
            ))}
          </div>

          {loading ? (
            <div style={{ padding: 40, textAlign: 'center', color: '#9CA3AF', fontSize: 13 }}>Loading...</div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center' }}>
              <div style={{ fontSize: 32, marginBottom: 10 }}>📭</div>
              <div style={{ fontSize: 13, color: '#9CA3AF' }}>No data yet</div>
              <div style={{ fontSize: 12, color: '#C4C4C4', marginTop: 4 }}>Send data from Orion → Leads</div>
            </div>
          ) : (
            <div style={{ maxHeight: 540, overflowY: 'auto' }}>
              {filtered.map(entry => (
                <div
                  key={entry._id}
                  onClick={() => openEntry(entry)}
                  style={{
                    padding: '12px 16px', borderBottom: '1px solid #FAFAFA', cursor: 'pointer',
                    background: selected?._id === entry._id ? '#FFF4EE' : '#fff',
                    borderLeft: selected?._id === entry._id ? '3px solid #E8602C' : '3px solid transparent',
                    transition: 'all 0.1s',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5 }}>
                    <span style={{ fontWeight: 600, fontSize: 13, color: '#111', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {entry.label || entry.dataType}
                    </span>
                    <Pill type={entry.dataType} />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 11, color: '#9CA3AF' }}>{(entry.count || 0).toLocaleString()} records · {entry.source}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 11, color: '#C4C4C4' }}>{new Date(entry.createdAt).toLocaleDateString()}</span>
                      <button
                        onClick={(e) => deleteEntry(entry._id, e)}
                        style={{ background: 'none', border: 'none', color: deleting === entry._id ? '#C4C4C4' : '#EF4444', cursor: 'pointer', fontSize: 13, padding: 0, lineHeight: 1 }}
                      >{deleting === entry._id ? '···' : '×'}</button>
                    </div>
                  </div>
                  {/* mini segment bar */}
                  <div style={{ marginTop: 7 }}>
                    <SegmentBar value={entry.count || 0} max={Math.max(...filtered.map(e => e.count || 0), 1)} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Data viewer panel */}
        <div style={{ background: '#fff', border: '1px solid #F0F0F0', borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.04)', overflow: 'hidden', minHeight: 400 }}>
          {!selected ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', padding: 48, color: '#9CA3AF' }}>
              <div style={{ width: 48, height: 48, borderRadius: 12, background: '#F9FAFB', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, marginBottom: 14 }}>📦</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#374151' }}>Select a dataset</div>
              <div style={{ fontSize: 12, marginTop: 4 }}>Click any entry on the left to view its records</div>
            </div>
          ) : (
            <>
              {/* Viewer header */}
              <div style={{ padding: '14px 20px', borderBottom: '1px solid #F0F0F0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14, color: '#111' }}>{selected.label || selected.dataType}</div>
                  <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 2 }}>
                    {(selected.count || 0).toLocaleString()} records &nbsp;·&nbsp; source: <strong style={{ color: '#6B7280' }}>{selected.source}</strong> &nbsp;·&nbsp; {new Date(selected.createdAt).toLocaleString()}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <Pill type={selected.dataType} />
                  <button onClick={() => { setSelected(null); setSelectedData(null); }}
                    style={{ background: 'none', border: 'none', color: '#9CA3AF', cursor: 'pointer', fontSize: 18, lineHeight: 1, padding: 2 }}>×</button>
                </div>
              </div>

              {/* Table */}
              <div style={{ overflowY: 'auto', maxHeight: 520 }}>
                {loadingData ? (
                  <div style={{ padding: 40, textAlign: 'center', color: '#9CA3AF', fontSize: 13 }}>Loading records...</div>
                ) : Array.isArray(selectedData) ? (
                  <DataTable data={selectedData} />
                ) : selectedData !== null ? (
                  <pre style={{ fontSize: 12, color: '#374151', background: '#F9FAFB', margin: 16, padding: 16, borderRadius: 8, overflowX: 'auto', lineHeight: 1.6 }}>
                    {JSON.stringify(selectedData, null, 2)}
                  </pre>
                ) : (
                  <div style={{ padding: 40, textAlign: 'center', color: '#9CA3AF', fontSize: 13 }}>No data</div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
