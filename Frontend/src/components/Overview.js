import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  FiAlertCircle,
  FiArrowRight,
  FiBriefcase,
  FiCheckCircle,
  FiClock,
  FiDatabase,
  FiDollarSign,
  FiFileText,
  FiRefreshCw,
  FiTarget,
  FiTrendingUp,
  FiUsers,
} from 'react-icons/fi';
import api from '../config/api';
import OverviewAreaChart from './OverviewAreaChart';
import LeadsRadarChart from './LeadsRadarChart';
import TaskManager from './TaskManager';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Progress } from './ui/progress';
import './Overview.css';

const emptyStats = {
  tasks: {},
  notes: {},
  companiesData: {},
  leads: {},
  contacts: {},
  clients: {},
  projects: {},
  socialMedia: {},
  campaigns: {},
  contentCalendar: {},
  linkedin: {},
  whatsapp: {},
  hr: {},
  finance: {},
};

function compactNumber(value) {
  const numeric = Number(value || 0);
  return new Intl.NumberFormat('en-US', {
    notation: Math.abs(numeric) >= 10000 ? 'compact' : 'standard',
    maximumFractionDigits: 1,
  }).format(numeric);
}

function compactMoney(value) {
  const numeric = Number(value || 0);
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    notation: Math.abs(numeric) >= 10000 ? 'compact' : 'standard',
    maximumFractionDigits: Math.abs(numeric) >= 10000 ? 1 : 0,
  }).format(numeric);
}

function mergeStats(stats) {
  return {
    ...emptyStats,
    ...(stats || {}),
    tasks: { ...emptyStats.tasks, ...(stats?.tasks || {}) },
    notes: { ...emptyStats.notes, ...(stats?.notes || {}) },
    companiesData: { ...emptyStats.companiesData, ...(stats?.companiesData || {}) },
    leads: { ...emptyStats.leads, ...(stats?.leads || {}) },
    contacts: { ...emptyStats.contacts, ...(stats?.contacts || {}) },
    clients: { ...emptyStats.clients, ...(stats?.clients || {}) },
    projects: { ...emptyStats.projects, ...(stats?.projects || {}) },
    socialMedia: { ...emptyStats.socialMedia, ...(stats?.socialMedia || {}) },
    campaigns: { ...emptyStats.campaigns, ...(stats?.campaigns || {}) },
    contentCalendar: { ...emptyStats.contentCalendar, ...(stats?.contentCalendar || {}) },
    linkedin: { ...emptyStats.linkedin, ...(stats?.linkedin || {}) },
    whatsapp: { ...emptyStats.whatsapp, ...(stats?.whatsapp || {}) },
    hr: { ...emptyStats.hr, ...(stats?.hr || {}) },
    finance: { ...emptyStats.finance, ...(stats?.finance || {}) },
  };
}

const clampPercent = (value) => Math.max(0, Math.min(100, Math.round(value || 0)));

function Overview({ dashboardData, error, onNavigate }) {
  const [overviewStats, setOverviewStats] = useState(null);
  const [loadingStats, setLoadingStats] = useState(true);
  const [statsError, setStatsError] = useState('');
  const [coreData, setCoreData] = useState(null);

  const fetchOverviewStats = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoadingStats(true);
    try {
      const response = await api.get('/overview-stats');
      setOverviewStats(response.data?.stats || null);
      setStatsError('');
    } catch (err) {
      console.error('Overview stats error:', err);
      setStatsError('Unable to load overview stats. Please try again.');
    } finally {
      if (!silent) setLoadingStats(false);
    }
  }, []);

  useEffect(() => {
    fetchOverviewStats();
    // Fetch Core Data Center stats — no auth needed
    fetch('http://localhost:5001/api/core-data/stats/summary')
      .then(r => r.json())
      .then(d => setCoreData(d))
      .catch(() => {});
  }, [fetchOverviewStats]);

  useEffect(() => {
    const refresh = () => fetchOverviewStats({ silent: true });
    window.addEventListener('dashboard:refresh', refresh);
    return () => window.removeEventListener('dashboard:refresh', refresh);
  }, [fetchOverviewStats]);

  const stats = useMemo(() => mergeStats(overviewStats), [overviewStats]);
  const activeTasks = Number(stats.tasks.inProgress || 0) + Number(stats.tasks.inReview || 0);
  const leadTotal = Number(stats.leads.total || 0);
  const leadNew = Number(stats.leads.new || 0) + Number(stats.leads.cold || 0);
  const leadActive = Number(stats.leads.active || 0);
  const leadWarm = Number(stats.leads.warm || 0);
  const leadFollowup = Number(stats.leads.followup || 0);
  const leadQualified = Number(stats.leads.qualified || 0);
  const leadConverted = Number(stats.leads.converted || 0);
  const leadDead = Number(stats.leads.dead || 0);
  const leadNeedsTouch = leadNew + leadFollowup + leadWarm;
  const leadEngaged = leadActive + leadWarm + leadFollowup + leadQualified + leadConverted;
  const leadEngagedRate = leadTotal ? clampPercent((leadEngaged / leadTotal) * 100) : 0;
  const leadConversion = leadTotal ? clampPercent((leadConverted / leadTotal) * 100) : 0;

  const quickStats = useMemo(() => ([
    {
      label: 'Tasks',
      value: compactNumber(stats.tasks.total),
      meta: `${compactNumber(activeTasks)} active - ${compactNumber(stats.tasks.done)} done`,
      icon: FiTarget,
      tone: 'blue',
      section: 'task-manager',
    },
    {
      label: 'Core Data',
      value: coreData ? compactNumber(coreData.byType?.reduce((s, t) => s + t.totalRecords, 0) || 0) : '—',
      meta: coreData ? `${compactNumber(coreData.total || 0)} datasets` : 'Loading...',
      icon: FiDatabase,
      tone: 'purple',
      section: 'core-data-center',
    },
    {
      label: 'Projects',
      value: compactNumber(stats.projects.total),
      meta: `${compactNumber(stats.projects.inProgress)} in progress`,
      icon: FiBriefcase,
      tone: 'amber',
      section: 'our-projects',
    },
    {
      label: 'Finance',
      value: compactMoney(stats.finance.totalRevenue),
      meta: `${compactMoney(stats.finance.pendingRevenue)} pending`,
      icon: FiDollarSign,
      tone: 'slate',
      section: 'invoice-management',
    },
    {
      label: 'HR',
      value: compactNumber(stats.hr.teamSize),
      meta: `${compactNumber(stats.hr.presentToday)} present today`,
      icon: FiUsers,
      tone: 'cyan',
      section: 'hr-overview',
    },
  ]), [stats, activeTasks, coreData]);

  const attentionItems = useMemo(() => ([
    {
      label: 'Pending leaves',
      value: compactNumber(stats.hr.pendingLeaves),
      rawValue: Number(stats.hr.pendingLeaves || 0),
      section: 'hr-overview',
      icon: FiClock,
      tone: 'amber',
    },
    {
      label: 'Tasks in review',
      value: compactNumber(stats.tasks.inReview),
      rawValue: Number(stats.tasks.inReview || 0),
      section: 'task-manager',
      icon: FiCheckCircle,
      tone: 'blue',
    },
    {
      label: 'Pending revenue',
      value: compactMoney(stats.finance.pendingRevenue),
      rawValue: Number(stats.finance.pendingRevenue || 0),
      section: 'invoice-management',
      icon: FiDollarSign,
      tone: 'green',
    },
    {
      label: 'Overdue invoices',
      value: compactNumber(stats.finance.invoicesOverdue),
      rawValue: Number(stats.finance.invoicesOverdue || 0),
      section: 'invoice-management',
      icon: FiAlertCircle,
      tone: 'red',
    },
  ]), [stats]);

  const totalActivity = useMemo(() => ([
    stats.tasks.total,
    stats.notes.total,
    stats.companiesData.total,
    stats.leads.total,
    stats.contacts.total,
    stats.clients.total,
    stats.projects.total,
    stats.socialMedia.total,
    stats.campaigns.total,
    stats.whatsapp.campaigns,
    stats.whatsapp.contacts,
    stats.hr.teamSize,
    stats.finance.invoicesTotal,
  ]).reduce((sum, value) => sum + Number(value || 0), 0), [stats]);

  const navigateTo = (section) => {
    if (section && typeof onNavigate === 'function') onNavigate(section);
  };

  return (
    <div className="overview-wrapper" data-dashboard-loaded={dashboardData ? 'true' : 'false'}>
      {error && (
        <div className="alert alert-error">
          {error}
        </div>
      )}

      <div className="overview-page-header">
        <div>
          <h1>Overview</h1>
          <p>Workspace health, risks, and activity in one compact view.</p>
        </div>
        <Button className="overview-refresh-action" variant="outline" size="sm" onClick={() => fetchOverviewStats()}>
          <FiRefreshCw size={14} />
          Refresh
        </Button>
      </div>

      {statsError && (
        <div className="overview-inline-error">
          <FiAlertCircle size={16} />
          <span>{statsError}</span>
          <Button className="overview-card-action" variant="outline" size="sm" onClick={() => fetchOverviewStats()}>Retry</Button>
        </div>
      )}

      {loadingStats ? (
        <div className="overview-kpi-grid" aria-label="Loading overview stats">
          {Array.from({ length: 5 }).map((_, index) => (
            <div className="overview-card overview-card-skeleton" key={index} />
          ))}
        </div>
      ) : (
        <>
          <section className="overview-command-grid">
            <div className="overview-mini-kpis">
              {quickStats.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    type="button"
                    className={`overview-kpi-card tone-${item.tone}`}
                    key={item.label}
                    onClick={() => navigateTo(item.section)}
                  >
                    <div className="overview-kpi-icon"><Icon size={17} /></div>
                    <div className="overview-kpi-content">
                      <span className="overview-kpi-label">{item.label}</span>
                      <strong>{item.value}</strong>
                      <span className="overview-kpi-meta">{item.meta}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>

          {totalActivity === 0 && !statsError && (
            <div className="overview-empty-note">
              <FiFileText size={16} />
              <span>No workspace activity has been recorded yet. Overview cards will fill in as your team adds tasks, leads, projects, HR, and finance data.</span>
            </div>
          )}
        </>
      )}

      <section className="overview-workbench">
        <div className="overview-work-card overview-chart-area">
          <OverviewAreaChart />
        </div>

        <Card className="overview-work-card overview-task-widget-card tw-rounded-lg">
          <CardHeader className="overview-card-header">
            <div>
              <CardTitle className="overview-panel-title">Task flow</CardTitle>
            </div>
            <Button className="overview-card-action" variant="ghost" size="sm" onClick={() => navigateTo('task-manager')}>
              Full view
              <FiArrowRight size={13} />
            </Button>
          </CardHeader>
          <CardContent className="overview-task-widget-content">
            <TaskManager isWidget />
          </CardContent>
        </Card>
      </section>

      <section className="overview-section overview-attention-section">
        <div className="overview-attention-grid">
          {attentionItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                type="button"
                className={`overview-attention-card tone-${item.rawValue > 0 ? item.tone : 'neutral'}`}
                key={item.label}
                onClick={() => navigateTo(item.section)}
              >
                <span className="overview-attention-icon"><Icon size={16} /></span>
                <span className="overview-attention-copy">
                  <strong>{item.value}</strong>
                  <span>{item.label}</span>
                </span>
                <FiArrowRight size={14} />
              </button>
            );
          })}
        </div>
      </section>

      <section className="overview-leads-below">
        <Card className="overview-leads-summary tw-rounded-lg">
          <CardHeader className="overview-card-header">
            <div>
              <Badge variant="success" className="overview-card-badge"><FiTrendingUp size={12} /> Leads</Badge>
              <CardTitle className="overview-panel-title">{compactNumber(leadTotal)} total leads</CardTitle>
            </div>
            <Button className="overview-card-action" variant="ghost" size="sm" onClick={() => navigateTo('leads-flow')}>
              Open leads
              <FiArrowRight size={13} />
            </Button>
          </CardHeader>
          <CardContent className="overview-leads-content">
            <div className="overview-leads-hero">
              <div>
                <span>Pipeline volume</span>
                <strong>{compactNumber(leadTotal)}</strong>
                <small>{compactNumber(leadEngaged)} engaged leads</small>
              </div>
              <div className="overview-leads-health">
                <strong>{leadEngagedRate}%</strong>
                <span>Engaged</span>
              </div>
            </div>

            <div className="overview-lead-signal-grid">
              <span><strong>{compactNumber(leadNew)}</strong> New</span>
              <span><strong>{compactNumber(leadActive)}</strong> Active</span>
              <span><strong>{compactNumber(leadFollowup)}</strong> Follow-up</span>
              <span><strong>{compactNumber(leadConverted)}</strong> Converted</span>
              <span><strong>{compactNumber(leadDead)}</strong> Dead</span>
            </div>

            <div className="overview-leads-progress-block">
              <div className="overview-progress-row">
                <span>Conversion rate</span>
                <strong>{leadConversion}%</strong>
              </div>
              <Progress className="overview-quality-progress" value={leadConversion} />
            </div>

            <div className="overview-leads-insight">
              <FiTrendingUp size={14} />
              <span>{compactNumber(leadNeedsTouch)} leads need a next touch.</span>
            </div>
          </CardContent>
        </Card>

        <div className="overview-chart-radar">
          <LeadsRadarChart />
        </div>
      </section>

      {/* Core Data Center Activity */}
      <section className="overview-leads-below" style={{ marginTop: 16 }}>
        <Card className="overview-leads-summary tw-rounded-lg">
          <CardHeader className="overview-card-header">
            <div>
              <Badge variant="outline" className="overview-card-badge" style={{ color: '#E8602C', borderColor: '#FDDCCA', background: '#FFF4EE' }}>
                <FiDatabase size={12} style={{ marginRight: 4 }} /> Core Data Center
              </Badge>
              <CardTitle className="overview-panel-title">
                {coreData ? `${compactNumber(coreData.total || 0)} dataset${coreData.total !== 1 ? 's' : ''}` : 'Loading...'}
              </CardTitle>
            </div>
            <Button className="overview-card-action" variant="ghost" size="sm" onClick={() => navigateTo('core-data-center')}>
              Open Data Center
              <FiArrowRight size={13} />
            </Button>
          </CardHeader>
          <CardContent className="overview-leads-content">
            {!coreData ? (
              <div style={{ color: '#9CA3AF', fontSize: 13 }}>Fetching Core Data stats...</div>
            ) : coreData.total === 0 ? (
              <div style={{ color: '#9CA3AF', fontSize: 13 }}>
                No data yet. Send leads from Orion → Leads → "Send to Core Data".
              </div>
            ) : (
              <>
                <div className="overview-leads-hero">
                  <div>
                    <span>Total records stored</span>
                    <strong>{compactNumber(coreData.byType?.reduce((s, t) => s + t.totalRecords, 0) || 0)}</strong>
                    <small>{compactNumber(coreData.bySource?.length || 0)} source{(coreData.bySource?.length || 0) !== 1 ? 's' : ''}</small>
                  </div>
                  <div className="overview-leads-health">
                    <strong>{compactNumber(coreData.total || 0)}</strong>
                    <span>Datasets</span>
                  </div>
                </div>

                <div className="overview-lead-signal-grid">
                  {(coreData.byType || []).map(t => (
                    <span key={t._id}>
                      <strong>{compactNumber(t.totalRecords)}</strong> {t._id}
                    </span>
                  ))}
                  {(coreData.bySource || []).map(s => (
                    <span key={s._id}>
                      <strong>{compactNumber(s.count)}</strong> from {s._id}
                    </span>
                  ))}
                </div>

                <div className="overview-leads-insight">
                  <FiDatabase size={14} />
                  <span>
                    {(coreData.byType || []).map(t => `${t.totalRecords} ${t._id}`).join(' · ')} stored across all datasets.
                  </span>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Breakdown mini cards */}
        <div className="overview-chart-radar" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {(coreData?.byType || []).map(t => {
            const totalRecs = coreData.byType.reduce((s, x) => s + x.totalRecords, 0) || 1;
            const pct = Math.round((t.totalRecords / totalRecs) * 100);
            const colors = { leads: '#E8602C', contacts: '#16A34A', custom: '#7C3AED' };
            const color = colors[t._id] || '#6B7280';
            return (
              <div key={t._id} style={{ background: '#fff', border: '1px solid #F0F0F0', borderRadius: 10, padding: '12px 16px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: '#374151', textTransform: 'capitalize' }}>{t._id}</span>
                  <span style={{ fontSize: 12, color, fontWeight: 700 }}>{compactNumber(t.totalRecords)}</span>
                </div>
                <div style={{ display: 'flex', gap: 2 }}>
                  {Array.from({ length: 20 }).map((_, i) => (
                    <div key={i} style={{ flex: 1, height: 5, borderRadius: 2, background: i < Math.round(pct / 5) ? color : '#F0F0F0' }} />
                  ))}
                </div>
                <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 4 }}>{t.count} dataset{t.count !== 1 ? 's' : ''} · {pct}% of total</div>
              </div>
            );
          })}
          {(!coreData || coreData.total === 0) && (
            <div style={{ background: '#fff', border: '1px solid #F0F0F0', borderRadius: 10, padding: '20px 16px', textAlign: 'center', color: '#9CA3AF', fontSize: 13 }}>
              No datasets yet
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

export default Overview;
