import React, { useState, useEffect, useCallback } from 'react';
import api from '../config/api';

const cardStyle = {
  background: '#fff',
  border: '1px solid #e5e7eb',
  borderRadius: '10px',
  padding: '16px',
  marginBottom: '12px',
};

const statBox = {
  textAlign: 'center',
  padding: '12px',
  borderRadius: '8px',
  background: '#f9fafb',
  border: '1px solid #f3f4f6',
};

const statNumber = {
  fontSize: '24px',
  fontWeight: 700,
  color: '#111827',
  lineHeight: 1.2,
};

const statLabel = {
  fontSize: '11px',
  color: '#6b7280',
  fontWeight: 500,
  marginTop: '4px',
};

const btnOutline = {
  padding: '6px 14px',
  borderRadius: '6px',
  border: '1px solid #e5e7eb',
  background: '#fff',
  color: '#374151',
  fontSize: '12px',
  fontWeight: 500,
  cursor: 'pointer',
  fontFamily: "'Switzer', sans-serif",
};

const confidenceBadge = (score) => {
  const color = score >= 0.85 ? '#166534' : score >= 0.6 ? '#92400e' : '#991b1b';
  const bg = score >= 0.85 ? '#dcfce7' : score >= 0.6 ? '#fef3c7' : '#fee2e2';
  return {
    display: 'inline-block',
    padding: '2px 8px',
    borderRadius: '4px',
    fontSize: '11px',
    fontWeight: 600,
    color,
    background: bg,
  };
};

const methodBadge = (method) => {
  const colors = {
    regex: { bg: '#dbeafe', color: '#1e40af' },
    direct: { bg: '#e0e7ff', color: '#4338ca' },
    llm: { bg: '#fef3c7', color: '#92400e' },
    bulk: { bg: '#f3e8ff', color: '#7c3aed' },
    skip: { bg: '#f3f4f6', color: '#6b7280' },
    retry: { bg: '#fee2e2', color: '#991b1b' },
  };
  const c = colors[method] || colors.direct;
  return {
    display: 'inline-block',
    padding: '2px 6px',
    borderRadius: '3px',
    fontSize: '10px',
    fontWeight: 600,
    color: c.color,
    background: c.bg,
    marginRight: '4px',
  };
};

function NoxtmSkillAnalytics({ skills: propSkills }) {
  const [ownSkills, setOwnSkills] = useState([]);
  const [selectedSkillId, setSelectedSkillId] = useState('');
  const [analytics, setAnalytics] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [sessionsTotal, setSessionsTotal] = useState(0);
  const [sessionsPage, setSessionsPage] = useState(1);
  const [auditView, setAuditView] = useState(null);
  const [loading, setLoading] = useState(false);

  const skills = propSkills || ownSkills;

  // Self-fetch skills if not provided via props
  useEffect(() => {
    if (propSkills) return;
    api.get('/noxtm-skills').then(res => {
      if (res.data.success) setOwnSkills(res.data.skills || []);
    }).catch(() => {});
  }, [propSkills]);

  const fetchAnalytics = useCallback(async (id) => {
    if (!id) return;
    setLoading(true);
    try {
      const res = await api.get(`/noxtm-skills/analytics/${id}`);
      if (res.data.success) setAnalytics(res.data.analytics);
    } catch (e) {
      console.error('[SkillAnalytics] fetch error:', e);
      setAnalytics(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchSessions = useCallback(async (slug, page = 1) => {
    try {
      const res = await api.get(`/noxtm-skills/sessions/${slug}?page=${page}&limit=10`);
      if (res.data.success) {
        setSessions(res.data.sessions || []);
        setSessionsTotal(res.data.total || 0);
        setSessionsPage(page);
      }
    } catch (e) {
      console.error('[SkillAnalytics] sessions error:', e);
    }
  }, []);

  const fetchAudit = async (sessionId) => {
    try {
      const res = await api.get(`/noxtm-skills/audit/${sessionId}`);
      if (res.data.success) setAuditView(res.data);
    } catch (e) {
      console.error('[SkillAnalytics] audit error:', e);
    }
  };

  useEffect(() => {
    if (selectedSkillId) {
      fetchAnalytics(selectedSkillId);
      const skill = skills.find(s => s._id === selectedSkillId);
      if (skill) fetchSessions(skill.slug);
    }
  }, [selectedSkillId, skills, fetchAnalytics, fetchSessions]);

  const selectedSkill = skills.find(s => s._id === selectedSkillId);
  const completionRate = analytics && analytics.totalSessions > 0
    ? Math.round((analytics.completedSessions / analytics.totalSessions) * 100)
    : 0;

  if (auditView) {
    return (
      <div>
        <button style={btnOutline} onClick={() => setAuditView(null)}>← Back to sessions</button>
        <div style={{ marginTop: '12px' }}>
          <h4 style={{ fontSize: '14px', fontWeight: 600, margin: '0 0 4px' }}>
            Audit Trail — {auditView.meta.sessionId.substring(0, 20)}...
          </h4>
          <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '12px' }}>
            {auditView.meta.turnCount} turns · Avg confidence: {Math.round((auditView.meta.avgConfidence || 0) * 100)}%
            · {auditView.meta.complete ? 'Completed' : 'Incomplete'}
          </div>

          {(auditView.audit || []).length === 0 ? (
            <div style={{ padding: '20px', textAlign: 'center', color: '#9ca3af' }}>No audit entries</div>
          ) : (
            <table style={{ width: '100%', fontSize: '12px', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
                  <th style={{ padding: '8px 6px', textAlign: 'left', color: '#6b7280', fontWeight: 600 }}>Turn</th>
                  <th style={{ padding: '8px 6px', textAlign: 'left', color: '#6b7280', fontWeight: 600 }}>Field</th>
                  <th style={{ padding: '8px 6px', textAlign: 'left', color: '#6b7280', fontWeight: 600 }}>User Input</th>
                  <th style={{ padding: '8px 6px', textAlign: 'left', color: '#6b7280', fontWeight: 600 }}>Extracted</th>
                  <th style={{ padding: '8px 6px', textAlign: 'left', color: '#6b7280', fontWeight: 600 }}>Method</th>
                  <th style={{ padding: '8px 6px', textAlign: 'left', color: '#6b7280', fontWeight: 600 }}>Confidence</th>
                  <th style={{ padding: '8px 6px', textAlign: 'left', color: '#6b7280', fontWeight: 600 }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {auditView.audit.map((entry, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid #f3f4f6' }}>
                    <td style={{ padding: '6px' }}>{entry.turn}</td>
                    <td style={{ padding: '6px', fontFamily: 'monospace', fontSize: '11px' }}>{entry.fieldPath || '-'}</td>
                    <td style={{ padding: '6px', maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {entry.userMessage || '-'}
                    </td>
                    <td style={{ padding: '6px', maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {entry.extractedValue !== null ? String(entry.extractedValue) : '-'}
                    </td>
                    <td style={{ padding: '6px' }}>
                      <span style={methodBadge(entry.method)}>{entry.method}</span>
                    </td>
                    <td style={{ padding: '6px' }}>
                      {entry.confidence > 0 ? (
                        <span style={confidenceBadge(entry.confidence)}>{Math.round(entry.confidence * 100)}%</span>
                      ) : '-'}
                    </td>
                    <td style={{ padding: '6px' }}>
                      {entry.valid ? (
                        <span style={{ color: '#166534', fontSize: '11px' }}>OK</span>
                      ) : (
                        <span style={{ color: '#991b1b', fontSize: '11px' }}>{entry.retryReason || 'Failed'}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {Object.keys(auditView.meta.collected || {}).length > 0 && (
            <div style={{ ...cardStyle, marginTop: '12px' }}>
              <h5 style={{ fontSize: '12px', fontWeight: 600, margin: '0 0 8px', color: '#374151' }}>Collected Data</h5>
              <pre style={{ fontSize: '11px', background: '#f9fafb', padding: '10px', borderRadius: '6px', overflow: 'auto', margin: 0 }}>
                {JSON.stringify(auditView.meta.collected, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Skill selector */}
      <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '16px' }}>
        <select
          style={{
            padding: '8px 12px', borderRadius: '6px', border: '1px solid #e5e7eb',
            fontSize: '13px', color: '#111827', flex: 1, fontFamily: "'Switzer', sans-serif",
          }}
          value={selectedSkillId}
          onChange={e => setSelectedSkillId(e.target.value)}
        >
          <option value="">Select a skill...</option>
          {skills.map(s => (
            <option key={s._id} value={s._id}>{s.name} ({s.slug})</option>
          ))}
        </select>
      </div>

      {loading && <div style={{ padding: '20px', color: '#6b7280', textAlign: 'center' }}>Loading analytics...</div>}

      {!loading && selectedSkillId && !analytics && (
        <div style={{ padding: '24px', color: '#9ca3af', textAlign: 'center', background: '#f9fafb', borderRadius: '10px' }}>
          No analytics data yet. Start using this skill to generate data.
        </div>
      )}

      {!loading && analytics && (
        <>
          {/* Overview cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', marginBottom: '12px' }}>
            <div style={statBox}>
              <div style={statNumber}>{analytics.totalSessions}</div>
              <div style={statLabel}>Total Sessions</div>
            </div>
            <div style={statBox}>
              <div style={statNumber}>{completionRate}%</div>
              <div style={statLabel}>Completion Rate</div>
            </div>
            <div style={statBox}>
              <div style={statNumber}>{Math.round((analytics.avgConfidence || 0) * 100)}%</div>
              <div style={statLabel}>Avg Confidence</div>
            </div>
            <div style={statBox}>
              <div style={statNumber}>{(analytics.avgTurns || 0).toFixed(1)}</div>
              <div style={statLabel}>Avg Turns</div>
            </div>
          </div>

          {/* Secondary stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', marginBottom: '16px' }}>
            <div style={statBox}>
              <div style={{ ...statNumber, fontSize: '18px' }}>{analytics.completedSessions}</div>
              <div style={statLabel}>Completed</div>
            </div>
            <div style={statBox}>
              <div style={{ ...statNumber, fontSize: '18px' }}>{analytics.abandonedSessions || 0}</div>
              <div style={statLabel}>Abandoned</div>
            </div>
            <div style={statBox}>
              <div style={{ ...statNumber, fontSize: '18px' }}>{analytics.resumedSessions || 0}</div>
              <div style={statLabel}>Resumed</div>
            </div>
            <div style={statBox}>
              <div style={{ ...statNumber, fontSize: '18px' }}>{analytics.bulkExtractionCount || 0}</div>
              <div style={statLabel}>Bulk Extractions</div>
            </div>
          </div>

          {/* Confidence breakdown */}
          <div style={cardStyle}>
            <h4 style={{ margin: '0 0 12px', fontSize: '14px', fontWeight: 600 }}>Confidence Distribution</h4>
            <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
              {[
                { label: 'High (≥85%)', count: analytics.highConfidenceCount, color: '#166534', bg: '#dcfce7' },
                { label: 'Medium (60-84%)', count: analytics.medConfidenceCount, color: '#92400e', bg: '#fef3c7' },
                { label: 'Low (<60%)', count: analytics.lowConfidenceCount, color: '#991b1b', bg: '#fee2e2' },
              ].map(b => (
                <div key={b.label} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <div style={{
                    width: '12px', height: '12px', borderRadius: '3px', background: b.bg, border: `1px solid ${b.color}30`,
                  }} />
                  <span style={{ fontSize: '12px', color: '#374151' }}>{b.label}: <strong>{b.count}</strong></span>
                </div>
              ))}
            </div>

            {/* Simple bar chart */}
            {(() => {
              const total = (analytics.highConfidenceCount || 0) + (analytics.medConfidenceCount || 0) + (analytics.lowConfidenceCount || 0);
              if (total === 0) return null;
              return (
                <div style={{ display: 'flex', height: '24px', borderRadius: '6px', overflow: 'hidden', marginTop: '12px' }}>
                  {analytics.highConfidenceCount > 0 && (
                    <div style={{
                      width: `${(analytics.highConfidenceCount / total) * 100}%`,
                      background: '#22c55e',
                      transition: 'width 0.3s ease',
                    }} />
                  )}
                  {analytics.medConfidenceCount > 0 && (
                    <div style={{
                      width: `${(analytics.medConfidenceCount / total) * 100}%`,
                      background: '#f59e0b',
                      transition: 'width 0.3s ease',
                    }} />
                  )}
                  {analytics.lowConfidenceCount > 0 && (
                    <div style={{
                      width: `${(analytics.lowConfidenceCount / total) * 100}%`,
                      background: '#ef4444',
                      transition: 'width 0.3s ease',
                    }} />
                  )}
                </div>
              );
            })()}
          </div>

          {/* Per-field stats */}
          {analytics.fieldStats?.length > 0 && (
            <div style={cardStyle}>
              <h4 style={{ margin: '0 0 12px', fontSize: '14px', fontWeight: 600 }}>Field Performance</h4>
              <table style={{ width: '100%', fontSize: '12px', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
                    <th style={{ padding: '8px 6px', textAlign: 'left', color: '#6b7280' }}>Field</th>
                    <th style={{ padding: '8px 6px', textAlign: 'center', color: '#6b7280' }}>Answered</th>
                    <th style={{ padding: '8px 6px', textAlign: 'center', color: '#6b7280' }}>Skipped</th>
                    <th style={{ padding: '8px 6px', textAlign: 'center', color: '#6b7280' }}>Retries</th>
                    <th style={{ padding: '8px 6px', textAlign: 'center', color: '#6b7280' }}>Avg Conf.</th>
                    <th style={{ padding: '8px 6px', textAlign: 'left', color: '#6b7280' }}>Methods</th>
                  </tr>
                </thead>
                <tbody>
                  {analytics.fieldStats.map((f, i) => {
                    const methods = f.extractionMethods || {};
                    const methodEntries = Object.entries(methods).filter(([, v]) => v > 0);
                    return (
                      <tr key={i} style={{ borderBottom: '1px solid #f3f4f6' }}>
                        <td style={{ padding: '6px', fontFamily: 'monospace', fontSize: '11px' }}>{f.fieldPath}</td>
                        <td style={{ padding: '6px', textAlign: 'center' }}>{f.totalAnswered}</td>
                        <td style={{ padding: '6px', textAlign: 'center' }}>{f.totalSkipped}</td>
                        <td style={{ padding: '6px', textAlign: 'center', color: f.totalRetries > 0 ? '#991b1b' : '#6b7280' }}>
                          {f.totalRetries}
                        </td>
                        <td style={{ padding: '6px', textAlign: 'center' }}>
                          {f.avgConfidence > 0 ? (
                            <span style={confidenceBadge(f.avgConfidence)}>
                              {Math.round(f.avgConfidence * 100)}%
                            </span>
                          ) : '-'}
                        </td>
                        <td style={{ padding: '6px' }}>
                          {methodEntries.map(([m, count]) => (
                            <span key={m} style={methodBadge(m)}>{m}: {count}</span>
                          ))}
                          {methodEntries.length === 0 && <span style={{ color: '#9ca3af' }}>-</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Daily trend (last 7 days) */}
          {analytics.dailyStats?.length > 0 && (
            <div style={cardStyle}>
              <h4 style={{ margin: '0 0 12px', fontSize: '14px', fontWeight: 600 }}>Daily Trend (last {analytics.dailyStats.length} days)</h4>
              <div style={{ display: 'flex', gap: '6px', alignItems: 'flex-end', height: '80px' }}>
                {analytics.dailyStats.slice(-7).map((d, i) => {
                  const maxSessions = Math.max(...analytics.dailyStats.slice(-7).map(x => x.sessions), 1);
                  const h = Math.max((d.sessions / maxSessions) * 70, 4);
                  return (
                    <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                      <span style={{ fontSize: '10px', color: '#374151', fontWeight: 600 }}>{d.sessions}</span>
                      <div style={{
                        width: '100%',
                        height: `${h}px`,
                        background: d.completions > 0 ? '#6366f1' : '#d1d5db',
                        borderRadius: '4px 4px 0 0',
                        transition: 'height 0.3s ease',
                      }} />
                      <span style={{ fontSize: '9px', color: '#9ca3af' }}>{d.date.slice(5)}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Recent sessions */}
          <div style={cardStyle}>
            <h4 style={{ margin: '0 0 12px', fontSize: '14px', fontWeight: 600 }}>
              Recent Sessions ({sessionsTotal})
            </h4>
            {sessions.length === 0 ? (
              <div style={{ padding: '16px', textAlign: 'center', color: '#9ca3af', fontSize: '13px' }}>No sessions found</div>
            ) : (
              <>
                <table style={{ width: '100%', fontSize: '12px', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
                      <th style={{ padding: '8px 6px', textAlign: 'left', color: '#6b7280' }}>User</th>
                      <th style={{ padding: '8px 6px', textAlign: 'center', color: '#6b7280' }}>Turns</th>
                      <th style={{ padding: '8px 6px', textAlign: 'center', color: '#6b7280' }}>Confidence</th>
                      <th style={{ padding: '8px 6px', textAlign: 'center', color: '#6b7280' }}>Status</th>
                      <th style={{ padding: '8px 6px', textAlign: 'left', color: '#6b7280' }}>Date</th>
                      <th style={{ padding: '8px 6px', textAlign: 'center', color: '#6b7280' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sessions.map(s => (
                      <tr key={s.sessionId} style={{ borderBottom: '1px solid #f3f4f6' }}>
                        <td style={{ padding: '6px' }}>
                          <div style={{ fontSize: '12px', color: '#111827' }}>{s.userId?.fullName || 'Unknown'}</div>
                          <div style={{ fontSize: '10px', color: '#9ca3af' }}>{s.userId?.email || ''}</div>
                        </td>
                        <td style={{ padding: '6px', textAlign: 'center' }}>{s.turnCount}</td>
                        <td style={{ padding: '6px', textAlign: 'center' }}>
                          {s.avgConfidence > 0 ? (
                            <span style={confidenceBadge(s.avgConfidence)}>
                              {Math.round(s.avgConfidence * 100)}%
                            </span>
                          ) : '-'}
                        </td>
                        <td style={{ padding: '6px', textAlign: 'center' }}>
                          {s.complete ? (
                            <span style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '4px', background: '#dcfce7', color: '#166534' }}>Complete</span>
                          ) : (
                            <span style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '4px', background: '#fef3c7', color: '#92400e' }}>
                              {s.resumed ? 'Resumed' : 'In Progress'}
                            </span>
                          )}
                        </td>
                        <td style={{ padding: '6px', fontSize: '11px', color: '#6b7280' }}>
                          {new Date(s.lastActiveAt).toLocaleDateString()}
                        </td>
                        <td style={{ padding: '6px', textAlign: 'center' }}>
                          <button style={{ ...btnOutline, fontSize: '11px', padding: '3px 10px' }} onClick={() => fetchAudit(s.sessionId)}>
                            View Audit
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Pagination */}
                {sessionsTotal > 10 && (
                  <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '12px' }}>
                    <button
                      style={btnOutline}
                      disabled={sessionsPage <= 1}
                      onClick={() => fetchSessions(selectedSkill?.slug, sessionsPage - 1)}
                    >
                      ← Prev
                    </button>
                    <span style={{ fontSize: '12px', color: '#6b7280', alignSelf: 'center' }}>
                      Page {sessionsPage} of {Math.ceil(sessionsTotal / 10)}
                    </span>
                    <button
                      style={btnOutline}
                      disabled={sessionsPage >= Math.ceil(sessionsTotal / 10)}
                      onClick={() => fetchSessions(selectedSkill?.slug, sessionsPage + 1)}
                    >
                      Next →
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export default NoxtmSkillAnalytics;
