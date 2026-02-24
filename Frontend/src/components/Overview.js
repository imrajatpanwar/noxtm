import React, { useState, useEffect } from 'react';
import TaskManager from './TaskManager';
import { useModules } from '../contexts/ModuleContext';
import api from '../config/api';
import './Overview.css';

// Icons for each section
const SectionIcons = {
  tasks: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/>
    </svg>
  ),
  notes: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
    </svg>
  ),
  companies: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
    </svg>
  ),
  leads: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/>
    </svg>
  ),
  contacts: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>
    </svg>
  ),
  clients: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16"/>
    </svg>
  ),
  projects: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/>
    </svg>
  ),
  social: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
    </svg>
  ),
  campaigns: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/>
    </svg>
  ),
  calendar: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
    </svg>
  ),
  linkedin: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
    </svg>
  ),
  whatsapp: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
    </svg>
  ),
  hr: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/>
    </svg>
  ),
  finance: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/>
    </svg>
  )
};

// Revenue Graph Component
const RevenueGraph = () => {
  const [selectedPeriod, setSelectedPeriod] = useState('Yearly');
  const [hoveredPoint, setHoveredPoint] = useState(null);
  const [revenueData, setRevenueData] = useState(Array(12).fill(0));
  const [contactsData, setContactsData] = useState(Array(12).fill(0));
  const [tradeShowsData, setTradeShowsData] = useState(Array(12).fill(0));
  const { isModuleInstalled } = useModules();
  const exhibitOSActive = isModuleInstalled('ExhibitOS');
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  // Fetch real data for revenue, contacts, and trade shows
  useEffect(() => {
    const fetchData = async () => {
      try {
        const currentYear = new Date().getFullYear();

        // Fetch all data in parallel
        const promises = [
          api.get('/clients'),
          api.get('/invoices')
        ];
        if (exhibitOSActive) {
          promises.push(api.get('/trade-shows'));
        }

        const results = await Promise.all(promises);

        // Process contacts - /clients returns raw array
        const clients = Array.isArray(results[0].data) ? results[0].data : [];
        const contactMonths = Array(12).fill(0);
        clients.forEach(client => {
          const d = new Date(client.createdAt);
          if (d.getFullYear() === currentYear) {
            contactMonths[d.getMonth()]++;
          }
        });
        setContactsData(contactMonths);

        // Process revenue from invoices - /invoices returns raw array
        const invoices = Array.isArray(results[1].data) ? results[1].data : [];
        const revMonths = Array(12).fill(0);
        invoices.forEach(inv => {
          if (inv.status === 'paid') {
            const d = new Date(inv.paidAt || inv.createdAt);
            if (d.getFullYear() === currentYear) {
              revMonths[d.getMonth()] += inv.total || 0;
            }
          }
        });
        setRevenueData(revMonths);

        // Process trade shows
        if (exhibitOSActive && results[2]) {
          if (results[2].data.success) {
            const shows = results[2].data.tradeShows || [];
            const showMonths = Array(12).fill(0);
            shows.forEach(show => {
              const d = new Date(show.showDate);
              if (d.getFullYear() === currentYear) {
                showMonths[d.getMonth()]++;
              }
            });
            setTradeShowsData(showMonths);
          }
        }
      } catch (error) {
        console.error('Error fetching graph data:', error);
      }
    };

    fetchData();
  }, [exhibitOSActive]);

  const totalRevenue = revenueData.reduce((sum, v) => sum + v, 0);
  const totalContacts = contactsData.reduce((sum, v) => sum + v, 0);
  const totalTradeShows = tradeShowsData.reduce((sum, v) => sum + v, 0);

  // Dynamic max values
  const rawMaxRevenue = Math.max(...revenueData, 1000);
  const maxContacts = Math.max(...contactsData, 5);
  const maxTradeShows = Math.max(...tradeShowsData, 5);

  // Calculate nice Y-axis for revenue
  const getNiceMax = (val) => {
    if (val <= 0) return 1000;
    const magnitude = Math.pow(10, Math.floor(Math.log10(val)));
    const normalized = val / magnitude;
    let niceNorm;
    if (normalized <= 1) niceNorm = 1;
    else if (normalized <= 2) niceNorm = 2;
    else if (normalized <= 5) niceNorm = 5;
    else niceNorm = 10;
    return niceNorm * magnitude;
  };

  const niceStep = getNiceMax(rawMaxRevenue / 5);
  const maxRevenue = niceStep * 5;

  // Y-axis labels
  const yLabels = [];
  for (let i = 5; i >= 0; i--) {
    const val = niceStep * i;
    if (val >= 1000) yLabels.push(`${Math.round(val / 1000)}k`);
    else yLabels.push(`${val}`);
  }

  // Generate path data for revenue
  const getRevenuePath = () => {
    return revenueData.map((v, i) => {
      const x = (i / 11) * 100;
      const y = 100 - (v / maxRevenue) * 100;
      return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
    }).join(' ');
  };

  // Generate path data for contacts
  const getContactsPath = () => {
    return contactsData.map((v, i) => {
      const x = (i / 11) * 100;
      const y = 100 - (v / maxContacts) * 100;
      return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
    }).join(' ');
  };

  // Generate path data for trade shows
  const getTradeShowsPath = () => {
    return tradeShowsData.map((v, i) => {
      const x = (i / 11) * 100;
      const y = 100 - (v / maxTradeShows) * 100;
      return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
    }).join(' ');
  };

  return (
    <div className="revenue-graph-card">
      <div className="revenue-header">
        <div className="revenue-top-row">
          <div className="revenue-info">
            <span className="revenue-label">Total Revenue</span>
            <span className="revenue-amount">${totalRevenue.toLocaleString()}</span>
          </div>
          <div className="period-selector">
            {['Monthly', 'Quarterly', 'Yearly'].map((p) => (
              <button
                key={p}
                className={`period-btn${selectedPeriod === p ? ' active' : ''}`}
                onClick={() => setSelectedPeriod(p)}
              >
                {p}
              </button>
            ))}
          </div>
        </div>
        <div className="graph-legend">
          <div className="legend-item">
            <span className="legend-line" style={{ background: '#1a1a1a' }}></span>
            <span>Revenue</span>
          </div>
          <div className="legend-item">
            <span className="legend-line" style={{ background: '#4285f4' }}></span>
            <span>Contacts ({totalContacts})</span>
          </div>
          {exhibitOSActive && (
            <div className="legend-item">
              <span className="legend-line" style={{ background: '#34a853' }}></span>
              <span>Trade Shows ({totalTradeShows})</span>
            </div>
          )}
        </div>
      </div>

      <div className="graph-container">
        {/* Y-axis labels */}
        <div className="y-axis">
          {yLabels.map((label, i) => (
            <span key={i}>{label}</span>
          ))}
        </div>

        {/* Graph area */}
        <div className="graph-area">
          <div className="graph-svg-wrapper">
            <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="graph-svg">
              {/* Grid lines */}
              {[20, 40, 60, 80].map((y) => (
                <line key={y} x1="0" y1={y} x2="100" y2={y} stroke="#f0f0f0" strokeWidth="0.5" />
              ))}

              {/* Revenue line - black */}
              <path
                d={getRevenuePath()}
                fill="none"
                stroke="#1a1a1a"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                vectorEffect="non-scaling-stroke"
              />

              {/* Contacts line - blue */}
              <path
                d={getContactsPath()}
                fill="none"
                stroke="#4285f4"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                vectorEffect="non-scaling-stroke"
                opacity="0.8"
              />

              {/* Trade Shows line - green */}
              {exhibitOSActive && tradeShowsData.length > 0 && (
                <path
                  d={getTradeShowsPath()}
                  fill="none"
                  stroke="#34a853"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  vectorEffect="non-scaling-stroke"
                  opacity="0.8"
                />
              )}
            </svg>

            {/* Hover zones for tooltip */}
            <div className="graph-hover-overlay">
              {months.map((m, i) => (
                <div
                  key={i}
                  className="hover-zone"
                  style={{ left: `${(i / 11) * 100}%` }}
                  onMouseEnter={() => setHoveredPoint(i)}
                  onMouseLeave={() => setHoveredPoint(null)}
                />
              ))}
            </div>

            {/* Tooltip */}
            {hoveredPoint !== null && (
              <div
                className="graph-tooltip"
                style={{
                  left: `${(hoveredPoint / 11) * 100}%`,
                  top: `${100 - (revenueData[hoveredPoint] / maxRevenue) * 100}%`
                }}
              >
                <div className="tooltip-content">
                  <div><strong>{months[hoveredPoint]}</strong></div>
                  <div>${revenueData[hoveredPoint].toLocaleString()}</div>
                  <div style={{ color: '#4285f4' }}>{contactsData[hoveredPoint]} contacts</div>
                  {exhibitOSActive && <div style={{ color: '#34a853' }}>{tradeShowsData[hoveredPoint]} shows</div>}
                </div>
                <div className="tooltip-line" />
              </div>
            )}
          </div>

          {/* X-axis labels */}
          <div className="x-axis">
            {months.map((m, i) => (
              <span key={i}>{m}</span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

function Overview({ error, onNavigate }) {
  const [stats, setStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await api.get('/overview-stats');
        if (res.data.success) setStats(res.data.stats);
      } catch (e) {
        console.error('Overview stats error:', e);
      } finally {
        setStatsLoading(false);
      }
    };
    fetchStats();
  }, []);

  const fmt = (n) => {
    if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
    if (n >= 1000) return (n / 1000).toFixed(1) + 'k';
    return String(n || 0);
  };

  // Section card definitions
  const sectionCards = stats ? [
    {
      key: 'tasks',
      title: 'Task Manager',
      icon: SectionIcons.tasks,
      color: '#3b82f6',
      nav: 'task-manager',
      value: fmt(stats.tasks.total),
      label: 'Total Tasks',
      pills: [
        { label: 'To Do', value: stats.tasks.todo, color: '#9ca3af' },
        { label: 'In Progress', value: stats.tasks.inProgress, color: '#3b82f6' },
        { label: 'Done', value: stats.tasks.done, color: '#22c55e' }
      ]
    },
    {
      key: 'notes',
      title: 'Notes',
      icon: SectionIcons.notes,
      color: '#f59e0b',
      nav: 'notes',
      value: fmt(stats.notes.total),
      label: 'Notes',
      pills: []
    },
    {
      key: 'companies',
      title: 'Companies Data',
      icon: SectionIcons.companies,
      color: '#8b5cf6',
      nav: 'trending-services',
      value: fmt(stats.companiesData.total),
      label: 'Companies',
      pills: []
    },
    {
      key: 'leads',
      title: 'Lead Management',
      icon: SectionIcons.leads,
      color: '#ef4444',
      nav: 'leads-flow',
      value: fmt(stats.leads.total),
      label: 'Total Leads',
      pills: [
        { label: 'Active', value: stats.leads.active, color: '#22c55e' },
        { label: 'Warm', value: stats.leads.warm, color: '#f59e0b' },
        { label: 'Cold', value: stats.leads.cold, color: '#6b7280' }
      ]
    },
    {
      key: 'contacts',
      title: 'Contacts',
      icon: SectionIcons.contacts,
      color: '#06b6d4',
      nav: 'email-marketing',
      value: fmt(stats.contacts.total),
      label: 'Contacts',
      pills: []
    },
    {
      key: 'clients',
      title: 'Client Management',
      icon: SectionIcons.clients,
      color: '#10b981',
      nav: 'client-management',
      value: fmt(stats.clients.total),
      label: 'Clients',
      pills: []
    },
    {
      key: 'projects',
      title: 'Client / Projects',
      icon: SectionIcons.projects,
      color: '#6366f1',
      nav: 'our-projects',
      value: fmt(stats.projects.total),
      label: 'Total Projects',
      pills: [
        { label: 'Active', value: stats.projects.inProgress, color: '#3b82f6' },
        { label: 'Completed', value: stats.projects.completed, color: '#22c55e' },
        { label: 'On Hold', value: stats.projects.onHold, color: '#f59e0b' }
      ]
    },
    {
      key: 'social',
      title: 'Social Media',
      icon: SectionIcons.social,
      color: '#ec4899',
      nav: 'content-calendar',
      value: fmt(stats.socialMedia.total),
      label: 'Total Posts',
      pills: [
        { label: 'Published', value: stats.socialMedia.published, color: '#22c55e' },
        { label: 'Scheduled', value: stats.socialMedia.scheduled, color: '#3b82f6' },
        { label: 'Drafts', value: stats.socialMedia.draft, color: '#9ca3af' }
      ]
    },
    {
      key: 'campaigns',
      title: 'Meta Ads',
      icon: SectionIcons.campaigns,
      color: '#f97316',
      nav: 'campaign-setup',
      value: fmt(stats.campaigns.total),
      label: 'Campaigns',
      pills: [
        { label: 'Sent', value: stats.campaigns.sent, color: '#22c55e' },
        { label: 'Scheduled', value: stats.campaigns.scheduled, color: '#3b82f6' },
        { label: 'Drafts', value: stats.campaigns.draft, color: '#9ca3af' }
      ]
    },
    {
      key: 'calendar',
      title: 'Content Calendar',
      icon: SectionIcons.calendar,
      color: '#14b8a6',
      nav: 'content-calendar',
      value: fmt(stats.contentCalendar.scheduled),
      label: 'Scheduled',
      pills: [
        { label: 'Published', value: stats.contentCalendar.published, color: '#22c55e' }
      ]
    },
    {
      key: 'linkedin',
      title: 'LinkedIn',
      icon: SectionIcons.linkedin,
      color: '#0a66c2',
      nav: 'linkedin',
      value: fmt(stats.linkedin.totalComments),
      label: 'AI Comments',
      pills: []
    },
    {
      key: 'whatsapp',
      title: 'WhatsApp',
      icon: SectionIcons.whatsapp,
      color: '#25d366',
      nav: 'whatsapp-marketing',
      value: fmt(stats.whatsapp.campaigns),
      label: 'Campaigns',
      pills: [
        { label: 'Contacts', value: stats.whatsapp.contacts, color: '#25d366' }
      ]
    },
    {
      key: 'hr',
      title: 'HR Management',
      icon: SectionIcons.hr,
      color: '#8b5cf6',
      nav: 'hr-overview',
      value: fmt(stats.hr.teamSize),
      label: 'Team Members',
      pills: [
        { label: 'Present Today', value: stats.hr.presentToday, color: '#22c55e' },
        { label: 'Pending Leaves', value: stats.hr.pendingLeaves, color: '#f59e0b' }
      ]
    },
    {
      key: 'finance',
      title: 'Finance Management',
      icon: SectionIcons.finance,
      color: '#059669',
      nav: 'invoice-management',
      value: '$' + fmt(stats.finance.totalRevenue),
      label: 'Revenue',
      pills: [
        { label: 'Pending', value: '$' + fmt(stats.finance.pendingRevenue), color: '#f59e0b' },
        { label: 'Invoices', value: stats.finance.invoicesTotal, color: '#3b82f6' },
        { label: 'Overdue', value: stats.finance.invoicesOverdue, color: '#ef4444' }
      ]
    }
  ] : [];

  return (
    <div className="overview-wrapper">
      {error && (
        <div className="alert alert-error">
          {error}
        </div>
      )}

      <div className="overview-grid">
        {/* Left side - Revenue Graph */}
        <div className="overview-left">
          <RevenueGraph />
        </div>

        {/* Right side - Task Manager */}
        <div className="overview-right">
          <TaskManager isWidget={true} />
        </div>
      </div>

      {/* Section Overview Cards */}
      <div className="ov-section-heading">
        <h2 className="ov-section-title">Overview</h2>
        <span className="ov-section-sub">Quick glance at all sections</span>
      </div>

      {statsLoading ? (
        <div className="ov-cards-loading">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="ov-card ov-card-skeleton">
              <div className="ov-skel-icon" />
              <div className="ov-skel-line ov-skel-w60" />
              <div className="ov-skel-line ov-skel-w40" />
            </div>
          ))}
        </div>
      ) : (
        <div className="ov-cards-grid">
          {sectionCards.map(card => (
            <div
              key={card.key}
              className="ov-card"
              onClick={() => onNavigate && onNavigate(card.nav)}
              style={{ '--ov-accent': card.color }}
            >
              <div className="ov-card-header">
                <div className="ov-card-icon" style={{ color: card.color }}>
                  {card.icon}
                </div>
                <span className="ov-card-title">{card.title}</span>
              </div>
              <div className="ov-card-body">
                <span className="ov-card-value">{card.value}</span>
                <span className="ov-card-label">{card.label}</span>
              </div>
              {card.pills.length > 0 && (
                <div className="ov-card-pills">
                  {card.pills.map((p, i) => (
                    <span key={i} className="ov-pill">
                      <span className="ov-pill-dot" style={{ background: p.color }} />
                      <span className="ov-pill-val">{p.value}</span>
                      <span className="ov-pill-lbl">{p.label}</span>
                    </span>
                  ))}
                </div>
              )}
              <div className="ov-card-arrow">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="9 18 15 12 9 6"/>
                </svg>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default Overview;
