import React, { useState, useEffect, useCallback } from 'react';
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  Tooltip, ResponsiveContainer,
} from 'recharts';
import api from '../config/api';

const METRICS = [
  { key: 'new',       label: 'New',       color: '#6b7280' },
  { key: 'active',    label: 'Active',    color: '#16a34a' },
  { key: 'followup',  label: 'Follow-up', color: '#d97706' },
  { key: 'converted', label: 'Converted', color: '#2563eb' },
  { key: 'dead',      label: 'Dead',      color: '#dc2626' },
];

const CARD = {
  background: '#fff',
  border: '1px solid #e4e4e7',
  borderRadius: 14,
  boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
  overflow: 'hidden',
  display: 'flex',
  flexDirection: 'column',
  height: '100%',
};

function CustomTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: '#fff', border: '1px solid #e4e4e7', borderRadius: 8,
      padding: '8px 12px', boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
      fontFamily: "'Switzer', sans-serif",
    }}>
      <div style={{ fontWeight: 600, color: '#1a1a1a', fontSize: 12, marginBottom: 2 }}>{payload[0].payload.label}</div>
      <div style={{ color: '#6b7280', fontSize: 12 }}>{payload[0].value} leads</div>
    </div>
  );
}

export default function LeadsRadarChart() {
  const [data, setData] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);

  const fetchStats = useCallback(() => {
    api.get('/whatsapp-leads/stats')
      .then(res => {
        const s = res.data.stats || {};
        setStats(s);
        setData(METRICS.map(m => ({ label: m.label, value: s[m.key] || 0 })));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  useEffect(() => {
    window.addEventListener('dashboard:refresh', fetchStats);
    return () => window.removeEventListener('dashboard:refresh', fetchStats);
  }, [fetchStats]);

  return (
    <div style={CARD}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
        padding: '16px 20px', borderBottom: '1px solid #f4f4f5',
      }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#1a1a1a', fontFamily: "'Switzer', sans-serif", lineHeight: 1 }}>
            Leads
          </div>
          <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 3, fontFamily: "'Switzer', sans-serif" }}>
            {stats.total || 0} total leads
          </div>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 18, fontWeight: 700, color: '#16a34a', fontFamily: "'Switzer', sans-serif", lineHeight: 1 }}>
              {stats.active || 0}
            </div>
            <div style={{ fontSize: 10, color: '#9ca3af', fontFamily: "'Switzer', sans-serif", marginTop: 2, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Active
            </div>
          </div>
          <div style={{ width: 1, background: '#f3f4f6' }} />
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 18, fontWeight: 700, color: '#2563eb', fontFamily: "'Switzer', sans-serif", lineHeight: 1 }}>
              {stats.converted || 0}
            </div>
            <div style={{ fontSize: 10, color: '#9ca3af', fontFamily: "'Switzer', sans-serif", marginTop: 2, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Converted
            </div>
          </div>
        </div>
      </div>

      {/* Chart */}
      <div style={{ flex: 1, padding: '8px 8px 0' }}>
        {loading ? (
          <div style={{ height: 174, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af', fontSize: 13, fontFamily: "'Switzer', sans-serif" }}>
            Loading…
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={174}>
            <RadarChart data={data} outerRadius="72%">
              <PolarGrid stroke="#f0f0f0" />
              <PolarAngleAxis
                dataKey="label"
                tick={{ fontSize: 11, fill: '#6b7280', fontFamily: "'Switzer', sans-serif", fontWeight: 500 }}
              />
              <PolarRadiusAxis tick={false} axisLine={false} tickLine={false} domain={[0, 'auto']} />
              <Radar
                dataKey="value"
                stroke="#1a1a1a"
                strokeWidth={1.5}
                fill="#1a1a1a"
                fillOpacity={0.07}
                dot={{ r: 4, fill: '#1a1a1a', stroke: '#fff', strokeWidth: 2 }}
                activeDot={{ r: 5, fill: '#1a1a1a', stroke: '#fff', strokeWidth: 2 }}
              />
              <Tooltip content={<CustomTooltip />} />
            </RadarChart>
          </ResponsiveContainer>
        )}
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
        gap: 8,
        padding: '0 18px 16px',
        fontFamily: "'Switzer', sans-serif",
      }}>
        {[
          ['New', stats.new || 0],
          ['Follow-up', stats.followup || 0],
          ['Dead', stats.dead || 0],
        ].map(([label, value]) => (
          <div key={label} style={{
            borderRadius: 8,
            background: 'transparent',
            padding: '8px 9px',
            minWidth: 0,
          }}>
            <div style={{ fontSize: 14, fontWeight: 800, color: '#111827', lineHeight: 1 }}>{value}</div>
            <div style={{
              marginTop: 3,
              color: '#71717a',
              fontSize: 10,
              fontWeight: 700,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}>{label}</div>
          </div>
        ))}
      </div>

    </div>
  );
}
