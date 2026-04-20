import React, { useState, useEffect, useCallback } from 'react';
import { Area, AreaChart, CartesianGrid, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import api from '../config/api';

const chartConfig = {
  companies: { label: 'Company Data', color: '#1a1a1a' },
  projects:  { label: 'Projects',     color: '#6b7280' },
};

const RANGES = [
  { value: '7d',  short: '7D' },
  { value: '30d', short: '30D' },
  { value: '90d', short: '3M' },
];

const CARD = {
  background: '#fff',
  border: '1px solid #e4e4e7',
  borderRadius: 14,
  boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
  overflow: 'hidden',
};

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const formatted = new Date(label).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  return (
    <div style={{
      background: '#fff', border: '1px solid #e4e4e7', borderRadius: 10,
      padding: '10px 14px', boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
      fontFamily: "'Switzer', sans-serif", minWidth: 140,
    }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: '#9ca3af', marginBottom: 8 }}>{formatted}</div>
      {payload.map(entry => (
        <div key={entry.dataKey} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, marginBottom: 4 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: entry.color }} />
            <span style={{ fontSize: 12, color: '#6b7280' }}>{chartConfig[entry.dataKey]?.label}</span>
          </div>
          <span style={{ fontSize: 12, fontWeight: 600, color: '#09090b', fontVariantNumeric: 'tabular-nums' }}>
            {entry.value.toLocaleString()}
          </span>
        </div>
      ))}
    </div>
  );
}

function CustomLegend({ payload }) {
  if (!payload?.length) return null;
  return (
    <div style={{ display: 'flex', justifyContent: 'center', gap: 20, paddingTop: 12 }}>
      {payload.map(entry => (
        <div key={entry.value} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: entry.color }} />
          <span style={{ fontSize: 12, color: '#6b7280', fontFamily: "'Switzer', sans-serif" }}>
            {chartConfig[entry.dataKey || entry.value]?.label || entry.value}
          </span>
        </div>
      ))}
    </div>
  );
}

export default function OverviewAreaChart() {
  const [range, setRange] = useState('7d');
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchChart = useCallback(() => {
    let cancelled = false;
    setLoading(true);
    api.get(`/overview-stats/chart?range=${range}`)
      .then(res => { if (!cancelled) { setData(res.data.data || []); setLoading(false); } })
      .catch(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [range]);

  useEffect(() => fetchChart(), [fetchChart]);

  // Re-fetch on global 30s poll
  useEffect(() => {
    window.addEventListener('dashboard:refresh', fetchChart);
    return () => window.removeEventListener('dashboard:refresh', fetchChart);
  }, [fetchChart]);

  const tickFormatter = v => new Date(v).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  return (
    <div style={CARD}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '16px 20px', borderBottom: '1px solid #f4f4f5',
      }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#1a1a1a', fontFamily: "'Switzer', sans-serif", lineHeight: 1 }}>
            Activity
          </div>
          <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 3, fontFamily: "'Switzer', sans-serif" }}>
            Company data &amp; projects over time
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {Object.entries(chartConfig).map(([key, cfg]) => (
              <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: cfg.color }} />
                <span style={{ fontSize: 12, color: '#6b7280', fontFamily: "'Switzer', sans-serif", fontWeight: 500 }}>{cfg.label}</span>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', background: '#f4f4f5', borderRadius: 8, padding: 2, gap: 2 }}>
            {RANGES.map(r => (
              <button
                key={r.value}
                onClick={() => setRange(r.value)}
                style={{
                  padding: '4px 10px', borderRadius: 6, border: 'none', cursor: 'pointer',
                  fontSize: 11, fontWeight: 500, fontFamily: "'Switzer', sans-serif",
                  background: range === r.value ? '#fff' : 'transparent',
                  color: range === r.value ? '#09090b' : '#6b7280',
                  boxShadow: range === r.value ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                  transition: 'all 0.15s',
                }}
              >
                {r.short}
              </button>
            ))}
          </div>
        </div>
      </div>
      {/* Chart */}
      <div style={{ padding: '16px 16px 12px' }}>
        {loading ? (
          <div style={{ height: 240, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af', fontSize: 13, fontFamily: "'Switzer', sans-serif" }}>
            Loading…
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="fillCompanies" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#1a1a1a" stopOpacity={0.12} />
                  <stop offset="95%" stopColor="#1a1a1a" stopOpacity={0.01} />
                </linearGradient>
                <linearGradient id="fillProjects" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6b7280" stopOpacity={0.12} />
                  <stop offset="95%" stopColor="#6b7280" stopOpacity={0.01} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} stroke="#f0f0f0" />
              <XAxis
                dataKey="date"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                minTickGap={32}
                tick={{ fontSize: 11, fill: '#9ca3af', fontFamily: "'Switzer', sans-serif" }}
                tickFormatter={tickFormatter}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 11, fill: '#9ca3af', fontFamily: "'Switzer', sans-serif" }}
                allowDecimals={false}
                width={40}
                domain={[0, 'auto']}
                tickFormatter={(v) => v === 0 ? '0' : v}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#e4e4e7', strokeWidth: 1 }} />
              <Area dataKey="companies" type="monotone" fill="url(#fillCompanies)" stroke="#1a1a1a" strokeWidth={1.5} dot={false} activeDot={{ r: 4, fill: '#1a1a1a', strokeWidth: 0 }} />
              <Area dataKey="projects"  type="monotone" fill="url(#fillProjects)"  stroke="#6b7280" strokeWidth={1.5} dot={false} activeDot={{ r: 4, fill: '#6b7280', strokeWidth: 0 }} />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
