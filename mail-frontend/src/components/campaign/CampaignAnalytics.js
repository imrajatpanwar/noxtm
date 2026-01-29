import React, { useState, useEffect } from 'react';
import api from '../../config/api';
import './CampaignAnalytics.css';

// Helper function to generate heatmap data
const generateHeatmapData = (campaigns) => {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const hours = Array.from({ length: 24 }, (_, i) => i);
  
  // Initialize heatmap grid
  const heatmap = days.map(day => 
    hours.map(() => ({ opens: 0, sends: 0, rate: 0 }))
  );
  
  // Aggregate campaign data by day/hour
  campaigns.forEach(campaign => {
    if (campaign.sentAt) {
      const date = new Date(campaign.sentAt);
      const day = date.getDay();
      const hour = date.getHours();
      const sent = campaign.stats?.sent || 0;
      const opened = campaign.trackingStats?.opened || 0;
      
      heatmap[day][hour].sends += sent;
      heatmap[day][hour].opens += opened;
    }
  });
  
  // Calculate rates
  heatmap.forEach(dayData => {
    dayData.forEach(cell => {
      cell.rate = cell.sends > 0 ? (cell.opens / cell.sends) * 100 : 0;
    });
  });
  
  return { days, hours, data: heatmap };
};

function CampaignAnalytics() {
  const [campaigns, setCampaigns] = useState([]);
  const [overallStats, setOverallStats] = useState(null);
  const [previousPeriodStats, setPreviousPeriodStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedDays, setSelectedDays] = useState(30);
  const [selectedCampaign, setSelectedCampaign] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [campaignDetails, setCampaignDetails] = useState(null);
  const [detailsFilter, setDetailsFilter] = useState('all');
  const [activeTab, setActiveTab] = useState('overview');
  const [exportLoading, setExportLoading] = useState(false);

  useEffect(() => {
    fetchCampaignAnalytics();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDays]);

  const fetchCampaignAnalytics = async () => {
    setLoading(true);
    try {
      // Fetch current period
      const res = await api.get(`/tracking/analytics/campaigns?days=${selectedDays}`);
      if (res.data.success) {
        setCampaigns(res.data.campaigns || []);
        setOverallStats(res.data.overallStats || {});
      }
      
      // Fetch previous period for comparison
      const prevRes = await api.get(`/tracking/analytics/campaigns?days=${selectedDays}&offset=${selectedDays}`);
      if (prevRes.data.success) {
        setPreviousPeriodStats(prevRes.data.overallStats || {});
      }
    } catch (error) {
      console.error('Error fetching campaign analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCampaignDetails = async (campaignId) => {
    try {
      const res = await api.get(`/tracking/campaign/${campaignId}/details`);
      if (res.data.success) {
        setCampaignDetails(res.data.recipients || []);
      }
    } catch (error) {
      console.error('Error fetching campaign details:', error);
      setCampaignDetails([]);
    }
  };

  const handleViewDetails = async (campaign) => {
    setSelectedCampaign(campaign);
    setShowDetailsModal(true);
    await fetchCampaignDetails(campaign._id);
  };

  const closeDetailsModal = () => {
    setShowDetailsModal(false);
    setSelectedCampaign(null);
    setCampaignDetails(null);
    setDetailsFilter('all');
  };

  const getFilteredDetails = () => {
    if (!campaignDetails) return [];
    switch (detailsFilter) {
      case 'opened':
        return campaignDetails.filter(r => r.opened);
      case 'not-opened':
        return campaignDetails.filter(r => !r.opened);
      case 'clicked':
        return campaignDetails.filter(r => r.clicked);
      case 'unsubscribed':
        return campaignDetails.filter(r => r.unsubscribed);
      default:
        return campaignDetails;
    }
  };

  // Calculate growth percentage
  const calculateGrowth = (current, previous) => {
    if (!previous || previous === 0) return current > 0 ? 100 : 0;
    return (((current - previous) / previous) * 100).toFixed(1);
  };

  // Get best/worst performing campaigns
  const getBestCampaigns = (metric = 'openRate', limit = 5) => {
    return campaigns
      .filter(c => c.trackingEnabled && c.stats?.sent > 0)
      .map(c => {
        const sent = c.stats?.sent || 0;
        const opened = c.trackingStats?.opened || 0;
        const clicked = c.trackingStats?.clicked || 0;
        return {
          ...c,
          openRate: sent > 0 ? ((opened / sent) * 100) : 0,
          clickRate: opened > 0 ? ((clicked / opened) * 100) : 0
        };
      })
      .sort((a, b) => b[metric] - a[metric])
      .slice(0, limit);
  };

  const getWorstCampaigns = (metric = 'openRate', limit = 5) => {
    return campaigns
      .filter(c => c.trackingEnabled && c.stats?.sent > 0)
      .map(c => {
        const sent = c.stats?.sent || 0;
        const opened = c.trackingStats?.opened || 0;
        const clicked = c.trackingStats?.clicked || 0;
        return {
          ...c,
          openRate: sent > 0 ? ((opened / sent) * 100) : 0,
          clickRate: opened > 0 ? ((clicked / opened) * 100) : 0
        };
      })
      .sort((a, b) => a[metric] - b[metric])
      .slice(0, limit);
  };

  // Export to CSV
  const exportToCSV = () => {
    setExportLoading(true);
    try {
      const headers = ['Campaign Name', 'Status', 'Sent', 'Opened', 'Open Rate', 'Clicked', 'Click Rate', 'Created'];
      const rows = campaigns.map(c => {
        const sent = c.stats?.sent || 0;
        const opened = c.trackingStats?.opened || 0;
        const clicked = c.trackingStats?.clicked || 0;
        return [
          c.name,
          c.status,
          sent,
          opened,
          sent > 0 ? ((opened / sent) * 100).toFixed(1) + '%' : '0%',
          clicked,
          opened > 0 ? ((clicked / opened) * 100).toFixed(1) + '%' : '0%',
          new Date(c.createdAt).toLocaleDateString()
        ];
      });
      
      const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `campaign-analytics-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
    } finally {
      setExportLoading(false);
    }
  };

  // Calculate email health score
  const calculateHealthScore = () => {
    const bounceRate = totalSent > 0 ? (totalBounced / totalSent) * 100 : 0;
    const unsubRate = totalSent > 0 ? ((overallStats?.totalUnsubscribed || 0) / totalSent) * 100 : 0;
    
    let score = 100;
    score -= bounceRate * 2; // Penalize bounces
    score -= unsubRate * 3; // Penalize unsubscribes more
    score += openRate * 0.5; // Reward opens
    score += clickRate * 0.3; // Reward clicks
    
    return Math.max(0, Math.min(100, Math.round(score)));
  };

  if (loading) {
    return (
      <div className="campaign-analytics-page">
        <div className="analytics-loading">Loading campaign analytics...</div>
      </div>
    );
  }

  // Calculate data for graphs
  const totalSent = overallStats?.totalSent || 0;
  const totalOpened = overallStats?.totalOpened || 0;
  const totalClicked = overallStats?.totalClicked || 0;
  const totalBounced = overallStats?.totalBounced || 0;
  const totalUnsubscribed = overallStats?.totalUnsubscribed || 0;
  const notOpened = totalSent - totalOpened;
  const openRate = parseFloat(overallStats?.avgOpenRate) || 0;
  const clickRate = parseFloat(overallStats?.avgClickRate) || 0;

  // Previous period data for comparison
  const prevSent = previousPeriodStats?.totalSent || 0;
  const prevOpened = previousPeriodStats?.totalOpened || 0;
  const prevClicked = previousPeriodStats?.totalClicked || 0;
  const prevOpenRate = parseFloat(previousPeriodStats?.avgOpenRate) || 0;
  const prevClickRate = parseFloat(previousPeriodStats?.avgClickRate) || 0;

  // Growth calculations
  const sentGrowth = calculateGrowth(totalSent, prevSent);
  const openedGrowth = calculateGrowth(totalOpened, prevOpened);
  const clickedGrowth = calculateGrowth(totalClicked, prevClicked);
  const openRateGrowth = calculateGrowth(openRate, prevOpenRate);
  const clickRateGrowth = calculateGrowth(clickRate, prevClickRate);

  // Email health score
  const healthScore = calculateHealthScore();

  // Device breakdown data (simulated - would come from tracking data)
  const deviceData = overallStats?.deviceBreakdown || [
    { name: 'Desktop', value: Math.round(totalOpened * 0.55), color: '#1a1a1a' },
    { name: 'Mobile', value: Math.round(totalOpened * 0.35), color: '#6366f1' },
    { name: 'Tablet', value: Math.round(totalOpened * 0.10), color: '#22c55e' }
  ];

  // Browser breakdown data
  const browserData = overallStats?.browserBreakdown || [
    { name: 'Chrome', value: 45 },
    { name: 'Safari', value: 25 },
    { name: 'Outlook', value: 15 },
    { name: 'Gmail', value: 10 },
    { name: 'Other', value: 5 }
  ];

  // Engagement heatmap data (day x hour)
  const heatmapData = generateHeatmapData(campaigns);

  // Campaign performance data for bar chart
  const topCampaigns = campaigns
    .filter(c => c.trackingEnabled && c.stats?.sent > 0)
    .slice(0, 5)
    .map(c => ({
      name: c.name.length > 15 ? c.name.substring(0, 15) + '...' : c.name,
      sent: c.stats?.sent || 0,
      opened: c.trackingStats?.opened || 0,
      clicked: c.trackingStats?.clicked || 0
    }));

  return (
    <div className="campaign-analytics-page">
      {/* Header */}
      <div className="analytics-page-header">
        <div className="header-left">
          <h2>Campaign Analytics</h2>
          <p>Track performance of your email campaigns</p>
        </div>
        <div className="header-right">
          <select
            value={selectedDays}
            onChange={(e) => setSelectedDays(parseInt(e.target.value))}
            className="days-select"
          >
            <option value={7}>Last 7 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
            <option value={365}>Last year</option>
          </select>
          <button className="export-btn" onClick={exportToCSV} disabled={exportLoading}>
            {exportLoading ? 'Exporting...' : '↓ Export CSV'}
          </button>
          <button className="refresh-btn" onClick={fetchCampaignAnalytics}>
            ↻ Refresh
          </button>
        </div>
      </div>

      {/* Analytics Tabs */}
      <div className="analytics-tabs">
        <button 
          className={`tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          Overview
        </button>
        <button 
          className={`tab-btn ${activeTab === 'campaigns' ? 'active' : ''}`}
          onClick={() => setActiveTab('campaigns')}
        >
          Campaigns
        </button>
        <button 
          className={`tab-btn ${activeTab === 'engagement' ? 'active' : ''}`}
          onClick={() => setActiveTab('engagement')}
        >
          Engagement
        </button>
        <button 
          className={`tab-btn ${activeTab === 'devices' ? 'active' : ''}`}
          onClick={() => setActiveTab('devices')}
        >
          Devices & Geo
        </button>
        <button 
          className={`tab-btn ${activeTab === 'health' ? 'active' : ''}`}
          onClick={() => setActiveTab('health')}
        >
          Email Health
        </button>
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <>
          {/* Comparison Stats Cards */}
          <div className="comparison-stats-row">
            <ComparisonCard 
              label="Total Sent"
              value={totalSent}
              previousValue={prevSent}
              growth={sentGrowth}
              icon="send"
            />
            <ComparisonCard 
              label="Total Opened"
              value={totalOpened}
              previousValue={prevOpened}
              growth={openedGrowth}
              icon="eye"
            />
            <ComparisonCard 
              label="Total Clicked"
              value={totalClicked}
              previousValue={prevClicked}
              growth={clickedGrowth}
              icon="click"
            />
            <ComparisonCard 
              label="Open Rate"
              value={`${openRate.toFixed(1)}%`}
              previousValue={`${prevOpenRate.toFixed(1)}%`}
              growth={openRateGrowth}
              icon="percent"
              isPercentage
            />
            <ComparisonCard 
              label="Click Rate"
              value={`${clickRate.toFixed(1)}%`}
              previousValue={`${prevClickRate.toFixed(1)}%`}
              growth={clickRateGrowth}
              icon="cursor"
              isPercentage
            />
          </div>

          {/* Performance Line Chart */}
          <div className="performance-chart-section">
            <div className="chart-header">
              <h3>Performance Tracking</h3>
              <select className="period-select" value={selectedDays} onChange={(e) => setSelectedDays(parseInt(e.target.value))}>
                <option value={7}>Weekly</option>
                <option value={30}>Monthly</option>
                <option value={90}>Quarterly</option>
                <option value={365}>Yearly</option>
              </select>
            </div>
            <PerformanceLineChart 
              campaigns={campaigns} 
              selectedDays={selectedDays}
              totalSent={totalSent}
              totalOpened={totalOpened}
              totalClicked={totalClicked}
              openRate={openRate}
              clickRate={clickRate}
              totalCampaigns={overallStats?.totalCampaigns || 0}
            />
          </div>

          {/* Secondary Charts Row */}
          <div className="graphs-section">
            <div className="graph-card">
              <h3>Email Delivery Overview</h3>
              <div className="donut-chart-container">
                <DonutChart
                  data={[
                    { label: 'Opened', value: totalOpened, color: '#22c55e' },
                    { label: 'Not Opened', value: notOpened > 0 ? notOpened : 0, color: '#e2e8f0' },
                    { label: 'Bounced', value: totalBounced, color: '#ef4444' }
                  ]}
                  total={totalSent}
                  centerLabel="Total Sent"
                />
              </div>
              <div className="chart-legend">
                <div className="legend-item">
                  <span className="legend-dot" style={{ background: '#22c55e' }}></span>
                  <span>Opened ({totalOpened})</span>
                </div>
                <div className="legend-item">
                  <span className="legend-dot" style={{ background: '#e2e8f0' }}></span>
                  <span>Not Opened ({notOpened > 0 ? notOpened : 0})</span>
                </div>
                <div className="legend-item">
                  <span className="legend-dot" style={{ background: '#ef4444' }}></span>
                  <span>Bounced ({totalBounced})</span>
                </div>
              </div>
            </div>

            <div className="graph-card">
              <h3>Top Campaigns Performance</h3>
              {topCampaigns.length === 0 ? (
                <div className="no-chart-data">No tracked campaigns with data yet</div>
              ) : (
                <div className="bar-chart-container">
                  <BarChart data={topCampaigns} />
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* Campaigns Tab */}
      {activeTab === 'campaigns' && (
        <>
          {/* Best & Worst Performing */}
          <div className="performance-tables-row">
            <div className="performance-table-card">
              <h3>Best Performing Campaigns</h3>
              <div className="sub-tabs">
                <span className="sub-tab active">By Open Rate</span>
              </div>
              <table className="mini-table">
                <thead>
                  <tr>
                    <th>Campaign</th>
                    <th>Open Rate</th>
                    <th>Click Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {getBestCampaigns('openRate').map((c, i) => (
                    <tr key={c._id}>
                      <td>
                        <span className="rank-badge">{i + 1}</span>
                        {c.name.length > 20 ? c.name.substring(0, 20) + '...' : c.name}
                      </td>
                      <td className="rate-cell positive">{c.openRate.toFixed(1)}%</td>
                      <td className="rate-cell">{c.clickRate.toFixed(1)}%</td>
                    </tr>
                  ))}
                  {getBestCampaigns('openRate').length === 0 && (
                    <tr><td colSpan="3" className="no-data">No campaigns with data</td></tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="performance-table-card">
              <h3>Needs Improvement</h3>
              <div className="sub-tabs">
                <span className="sub-tab active">Lowest Open Rate</span>
              </div>
              <table className="mini-table">
                <thead>
                  <tr>
                    <th>Campaign</th>
                    <th>Open Rate</th>
                    <th>Click Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {getWorstCampaigns('openRate').map((c, i) => (
                    <tr key={c._id}>
                      <td>
                        <span className="rank-badge warning">{i + 1}</span>
                        {c.name.length > 20 ? c.name.substring(0, 20) + '...' : c.name}
                      </td>
                      <td className="rate-cell negative">{c.openRate.toFixed(1)}%</td>
                      <td className="rate-cell">{c.clickRate.toFixed(1)}%</td>
                    </tr>
                  ))}
                  {getWorstCampaigns('openRate').length === 0 && (
                    <tr><td colSpan="3" className="no-data">No campaigns with data</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* All Campaigns Table */}
          <div className="campaigns-section">
            <h3>All Campaigns</h3>
            {campaigns.length === 0 ? (
              <div className="no-campaigns">
                <p>No campaigns found in this period</p>
              </div>
            ) : (
              <div className="campaigns-table-wrapper">
                <table className="campaigns-table">
                  <thead>
                    <tr>
                      <th>Campaign Name</th>
                      <th>Status</th>
                      <th>Tracking</th>
                      <th>Sent</th>
                      <th>Opens</th>
                      <th>Open Rate</th>
                      <th>Clicks</th>
                      <th>Click Rate</th>
                      <th>Created</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {campaigns.map(campaign => {
                      const sent = campaign.stats?.sent || 0;
                      const opened = campaign.trackingStats?.opened || campaign.stats?.opened || 0;
                      const clicked = campaign.trackingStats?.clicked || campaign.stats?.clicked || 0;
                      const campaignOpenRate = sent > 0 ? ((opened / sent) * 100).toFixed(1) : 0;
                      const campaignClickRate = opened > 0 ? ((clicked / opened) * 100).toFixed(1) : 0;

                      return (
                        <tr key={campaign._id}>
                          <td className="campaign-name-cell">
                            <span className="campaign-name">{campaign.name}</span>
                          </td>
                          <td>
                            <span className={`status-pill ${campaign.status}`}>
                              {campaign.status}
                            </span>
                          </td>
                          <td>
                            {campaign.trackingEnabled ? (
                              <span className="tracking-badge on">Tracked</span>
                            ) : (
                              <span className="tracking-badge off">Not Tracked</span>
                            )}
                          </td>
                          <td className="number-cell">{sent}</td>
                          <td className="number-cell">
                            {campaign.trackingEnabled ? opened : '-'}
                          </td>
                          <td className="number-cell">
                            {campaign.trackingEnabled ? (
                              <span className="rate-value">{campaignOpenRate}%</span>
                            ) : '-'}
                          </td>
                          <td className="number-cell">
                            {campaign.trackingEnabled ? clicked : '-'}
                          </td>
                          <td className="number-cell">
                            {campaign.trackingEnabled ? (
                              <span className="rate-value">{campaignClickRate}%</span>
                            ) : '-'}
                          </td>
                          <td className="date-cell">
                            {new Date(campaign.createdAt).toLocaleDateString()}
                          </td>
                          <td>
                            {campaign.trackingEnabled && (
                              <button
                                className="view-details-btn"
                                onClick={() => handleViewDetails(campaign)}
                              >
                                View Details
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* Engagement Tab */}
      {activeTab === 'engagement' && (
        <>
          <div className="engagement-section">
            <div className="heatmap-card">
              <h3>Best Time to Send Emails</h3>
              <p className="card-subtitle">Engagement heatmap showing open rates by day and hour</p>
              <EngagementHeatmap data={heatmapData} />
            </div>
          </div>

          <div className="link-analytics-section">
            <div className="graph-card full-width">
              <h3>Link Click Performance</h3>
              <LinkClicksTable campaigns={campaigns} />
            </div>
          </div>
        </>
      )}

      {/* Devices & Geo Tab */}
      {activeTab === 'devices' && (
        <>
          <div className="devices-section">
            <div className="graph-card">
              <h3>Device Breakdown</h3>
              <div className="donut-chart-container">
                <DonutChart
                  data={deviceData.map(d => ({ label: d.name, value: d.value, color: d.color }))}
                  total={totalOpened}
                  centerLabel="Opens"
                />
              </div>
              <div className="chart-legend">
                {deviceData.map((d, i) => (
                  <div key={i} className="legend-item">
                    <span className="legend-dot" style={{ background: d.color }}></span>
                    <span>{d.name} ({d.value})</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="graph-card">
              <h3>Browser / Email Client</h3>
              <div className="browser-list">
                {browserData.map((b, i) => (
                  <div key={i} className="browser-item">
                    <div className="browser-info">
                      <span className="browser-name">{b.name}</span>
                      <span className="browser-percent">{b.value}%</span>
                    </div>
                    <div className="browser-bar">
                      <div className="browser-bar-fill" style={{ width: `${b.value}%` }}></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="geo-section">
            <div className="graph-card full-width">
              <h3>Geographic Distribution</h3>
              <p className="card-subtitle">Top locations where your emails are opened</p>
              <GeoTable />
            </div>
          </div>
        </>
      )}

      {/* Email Health Tab */}
      {activeTab === 'health' && (
        <>
          <div className="health-section">
            <div className="health-score-card">
              <h3>Email Health Score</h3>
              <div className="health-score-circle">
                <HealthScoreGauge score={healthScore} />
              </div>
              <p className="health-description">
                {healthScore >= 80 ? 'Excellent! Your email health is great.' :
                 healthScore >= 60 ? 'Good. Some room for improvement.' :
                 healthScore >= 40 ? 'Fair. Consider improving your list hygiene.' :
                 'Needs attention. Review your email practices.'}
              </p>
            </div>

            <div className="health-metrics-card">
              <h3>Health Metrics</h3>
              <div className="health-metrics-grid">
                <div className="health-metric">
                  <div className="metric-header">
                    <span>Bounce Rate</span>
                    <span className={`metric-value ${totalSent > 0 && (totalBounced / totalSent) * 100 > 5 ? 'negative' : 'positive'}`}>
                      {totalSent > 0 ? ((totalBounced / totalSent) * 100).toFixed(1) : 0}%
                    </span>
                  </div>
                  <div className="metric-bar">
                    <div 
                      className="metric-bar-fill bounce" 
                      style={{ width: `${Math.min(totalSent > 0 ? (totalBounced / totalSent) * 100 : 0, 100)}%` }}
                    ></div>
                  </div>
                  <span className="metric-hint">Keep below 5%</span>
                </div>

                <div className="health-metric">
                  <div className="metric-header">
                    <span>Unsubscribe Rate</span>
                    <span className={`metric-value ${totalSent > 0 && (totalUnsubscribed / totalSent) * 100 > 1 ? 'negative' : 'positive'}`}>
                      {totalSent > 0 ? ((totalUnsubscribed / totalSent) * 100).toFixed(2) : 0}%
                    </span>
                  </div>
                  <div className="metric-bar">
                    <div 
                      className="metric-bar-fill unsub" 
                      style={{ width: `${Math.min(totalSent > 0 ? (totalUnsubscribed / totalSent) * 100 * 10 : 0, 100)}%` }}
                    ></div>
                  </div>
                  <span className="metric-hint">Keep below 0.5%</span>
                </div>

                <div className="health-metric">
                  <div className="metric-header">
                    <span>Engagement Rate</span>
                    <span className={`metric-value ${openRate > 20 ? 'positive' : openRate > 10 ? '' : 'negative'}`}>
                      {openRate.toFixed(1)}%
                    </span>
                  </div>
                  <div className="metric-bar">
                    <div 
                      className="metric-bar-fill engagement" 
                      style={{ width: `${Math.min(openRate, 100)}%` }}
                    ></div>
                  </div>
                  <span className="metric-hint">Industry avg: 20-25%</span>
                </div>

                <div className="health-metric">
                  <div className="metric-header">
                    <span>Click-to-Open Rate</span>
                    <span className={`metric-value ${clickRate > 10 ? 'positive' : ''}`}>
                      {clickRate.toFixed(1)}%
                    </span>
                  </div>
                  <div className="metric-bar">
                    <div 
                      className="metric-bar-fill click" 
                      style={{ width: `${Math.min(clickRate * 2, 100)}%` }}
                    ></div>
                  </div>
                  <span className="metric-hint">Industry avg: 10-15%</span>
                </div>
              </div>
            </div>
          </div>

          <div className="bounce-analysis-section">
            <div className="graph-card full-width">
              <h3>Bounce & Delivery Analysis</h3>
              <BounceAnalysisChart 
                totalSent={totalSent}
                totalBounced={totalBounced}
                totalUnsubscribed={totalUnsubscribed}
                campaigns={campaigns}
              />
            </div>
          </div>
        </>
      )}

      {/* Details Modal */}
      {showDetailsModal && selectedCampaign && (
        <div className="details-modal-overlay" onClick={closeDetailsModal}>
          <div className="details-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Campaign Details: {selectedCampaign.name}</h3>
              <button className="close-btn" onClick={closeDetailsModal}>×</button>
            </div>

            <div className="modal-filters">
              <button
                className={`filter-btn ${detailsFilter === 'all' ? 'active' : ''}`}
                onClick={() => setDetailsFilter('all')}
              >
                All ({campaignDetails?.length || 0})
              </button>
              <button
                className={`filter-btn ${detailsFilter === 'opened' ? 'active' : ''}`}
                onClick={() => setDetailsFilter('opened')}
              >
                Opened ({campaignDetails?.filter(r => r.opened).length || 0})
              </button>
              <button
                className={`filter-btn ${detailsFilter === 'not-opened' ? 'active' : ''}`}
                onClick={() => setDetailsFilter('not-opened')}
              >
                Not Opened ({campaignDetails?.filter(r => !r.opened).length || 0})
              </button>
              <button
                className={`filter-btn ${detailsFilter === 'clicked' ? 'active' : ''}`}
                onClick={() => setDetailsFilter('clicked')}
              >
                Clicked ({campaignDetails?.filter(r => r.clicked).length || 0})
              </button>
            </div>

            <div className="modal-content">
              {!campaignDetails ? (
                <div className="loading-details">Loading details...</div>
              ) : getFilteredDetails().length === 0 ? (
                <div className="no-details">No recipients match this filter</div>
              ) : (
                <table className="details-table">
                  <thead>
                    <tr>
                      <th>Email</th>
                      <th>Opened</th>
                      <th>Opens</th>
                      <th>First Opened</th>
                      <th>Clicked</th>
                      <th>Clicks</th>
                      <th>Device</th>
                    </tr>
                  </thead>
                  <tbody>
                    {getFilteredDetails().map((recipient, index) => (
                      <tr key={index}>
                        <td>{recipient.recipientEmail}</td>
                        <td>
                          {recipient.opened ? (
                            <span className="yes-badge">✓</span>
                          ) : (
                            <span className="no-badge">✗</span>
                          )}
                        </td>
                        <td>{recipient.openCount || 0}</td>
                        <td>
                          {recipient.openedAt
                            ? new Date(recipient.openedAt).toLocaleString()
                            : '-'}
                        </td>
                        <td>
                          {recipient.clicked ? (
                            <span className="yes-badge">✓</span>
                          ) : (
                            <span className="no-badge">✗</span>
                          )}
                        </td>
                        <td>{recipient.clickCount || 0}</td>
                        <td>
                          {recipient.openEvents?.[0]?.device || '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Donut Chart Component
const DonutChart = ({ data, total, centerLabel }) => {
  const size = 180;
  const strokeWidth = 24;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  
  let currentOffset = 0;
  
  return (
    <div className="donut-chart">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#f1f5f9"
          strokeWidth={strokeWidth}
        />
        
        {/* Data segments */}
        {data.map((segment, index) => {
          const percentage = total > 0 ? (segment.value / total) * 100 : 0;
          const strokeDasharray = `${(percentage / 100) * circumference} ${circumference}`;
          const rotation = currentOffset * 3.6 - 90;
          currentOffset += percentage;
          
          if (segment.value === 0) return null;
          
          return (
            <circle
              key={index}
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke={segment.color}
              strokeWidth={strokeWidth}
              strokeDasharray={strokeDasharray}
              strokeLinecap="round"
              transform={`rotate(${rotation} ${size / 2} ${size / 2})`}
              style={{ transition: 'stroke-dasharray 0.5s ease' }}
            />
          );
        })}
      </svg>
      <div className="donut-center">
        <div className="donut-value">{total}</div>
        <div className="donut-label">{centerLabel}</div>
      </div>
    </div>
  );
};

// Gauge Chart Component (kept for future use)
// eslint-disable-next-line no-unused-vars
const GaugeChart = ({ value, label, color }) => {
  const size = 140;
  const strokeWidth = 14;
  const radius = (size - strokeWidth) / 2;
  const circumference = Math.PI * radius; // Half circle
  const progress = (value / 100) * circumference;
  
  return (
    <div className="gauge-chart">
      <svg width={size} height={size / 2 + 20} viewBox={`0 0 ${size} ${size / 2 + 20}`}>
        {/* Background arc */}
        <path
          d={`M ${strokeWidth / 2} ${size / 2} A ${radius} ${radius} 0 0 1 ${size - strokeWidth / 2} ${size / 2}`}
          fill="none"
          stroke="#e2e8f0"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />
        
        {/* Progress arc */}
        <path
          d={`M ${strokeWidth / 2} ${size / 2} A ${radius} ${radius} 0 0 1 ${size - strokeWidth / 2} ${size / 2}`}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={`${progress} ${circumference}`}
          style={{ transition: 'stroke-dasharray 0.5s ease' }}
        />
      </svg>
      <div className="gauge-value" style={{ color }}>{value}%</div>
      <div className="gauge-label">{label}</div>
    </div>
  );
};

// Bar Chart Component
const BarChart = ({ data }) => {
  const maxValue = Math.max(...data.map(d => d.sent), 1);
  
  return (
    <div className="bar-chart">
      <div className="bar-chart-bars">
        {data.map((item, index) => (
          <div key={index} className="bar-group">
            <div className="bars">
              <div 
                className="bar sent" 
                style={{ height: `${(item.sent / maxValue) * 100}%` }}
                title={`Sent: ${item.sent}`}
              >
                <span className="bar-value">{item.sent}</span>
              </div>
              <div 
                className="bar opened" 
                style={{ height: `${(item.opened / maxValue) * 100}%` }}
                title={`Opened: ${item.opened}`}
              >
                <span className="bar-value">{item.opened}</span>
              </div>
              <div 
                className="bar clicked" 
                style={{ height: `${(item.clicked / maxValue) * 100}%` }}
                title={`Clicked: ${item.clicked}`}
              >
                <span className="bar-value">{item.clicked}</span>
              </div>
            </div>
            <div className="bar-label">{item.name}</div>
          </div>
        ))}
      </div>
      <div className="bar-chart-legend">
        <div className="legend-item">
          <span className="legend-box sent"></span>
          <span>Sent</span>
        </div>
        <div className="legend-item">
          <span className="legend-box opened"></span>
          <span>Opened</span>
        </div>
        <div className="legend-item">
          <span className="legend-box clicked"></span>
          <span>Clicked</span>
        </div>
      </div>
    </div>
  );
};

// Performance Line Chart Component with Stats Panel
// eslint-disable-next-line no-unused-vars
const PerformanceLineChart = ({ campaigns, selectedDays, totalSent, totalOpened, totalClicked, openRate, clickRate, totalCampaigns }) => {
  const [hoveredPoint, setHoveredPoint] = useState(null);
  
  // Generate data points based on real campaign data
  const generateChartData = () => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const currentMonth = new Date().getMonth();
    
    const data = [];
    const numPoints = selectedDays <= 7 ? 7 : 12;
    
    // If we have campaigns, try to use real data
    if (campaigns && campaigns.length > 0) {
      // Group campaigns by month/day and aggregate stats
      for (let i = 0; i < numPoints; i++) {
        const monthIndex = (currentMonth - numPoints + i + 13) % 12;
        
        // Find campaigns for this period
        const periodCampaigns = campaigns.filter(c => {
          const campaignMonth = new Date(c.createdAt).getMonth();
          return campaignMonth === monthIndex;
        });
        
        const sent = periodCampaigns.reduce((acc, c) => acc + (c.stats?.sent || 0), 0);
        const opened = periodCampaigns.reduce((acc, c) => acc + (c.trackingStats?.opened || c.stats?.opened || 0), 0);
        
        data.push({
          label: selectedDays <= 7 ? `Day ${i + 1}` : months[monthIndex],
          value: sent,
          opened: opened,
          sent: sent,
          date: new Date(2026, monthIndex, 15)
        });
      }
    } else {
      // Show empty data with 0 values
      for (let i = 0; i < numPoints; i++) {
        const monthIndex = (currentMonth - numPoints + i + 13) % 12;
        data.push({
          label: selectedDays <= 7 ? `Day ${i + 1}` : months[monthIndex],
          value: 0,
          opened: 0,
          sent: 0,
          date: new Date(2026, monthIndex, 15)
        });
      }
    }
    
    return data;
  };
  
  const chartData = generateChartData();
  const maxValue = Math.max(...chartData.map(d => d.value), 1);
  const minValue = 0; // Always start from 0
  const valueRange = maxValue || 1;
  
  const width = 1200;
  const height = 280;
  const padding = { top: 20, right: 20, bottom: 40, left: 40 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;
  
  // Generate smooth curve path
  const generatePath = () => {
    const points = chartData.map((d, i) => ({
      x: padding.left + (i / (chartData.length - 1)) * chartWidth,
      y: padding.top + chartHeight - ((d.value - minValue) / valueRange) * chartHeight
    }));
    
    // Create smooth bezier curve
    let path = `M ${points[0].x} ${points[0].y}`;
    
    for (let i = 1; i < points.length; i++) {
      const prev = points[i - 1];
      const curr = points[i];
      const cp1x = prev.x + (curr.x - prev.x) / 3;
      const cp1y = prev.y;
      const cp2x = curr.x - (curr.x - prev.x) / 3;
      const cp2y = curr.y;
      path += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${curr.x} ${curr.y}`;
    }
    
    return { linePath: path, points };
  };
  
  const { linePath, points } = generatePath();
  
  // Area path (for gradient fill)
  const areaPath = `${linePath} L ${points[points.length - 1].x} ${height - padding.bottom} L ${points[0].x} ${height - padding.bottom} Z`;
  
  // Y-axis labels
  const yLabels = [];
  const numYLabels = 5;
  for (let i = 0; i <= numYLabels; i++) {
    const value = Math.round(minValue + (valueRange * i) / numYLabels);
    yLabels.push({
      value,
      y: padding.top + chartHeight - (i / numYLabels) * chartHeight
    });
  }
  
  const handleMouseMove = (index) => {
    setHoveredPoint(index);
  };
  
  return (
    <div className="line-chart-with-stats">
      <div className="line-chart-container">
        <svg 
          width="100%" 
          height={height} 
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio="xMidYMid meet"
        >
          <defs>
            <linearGradient id="areaGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#1a1a1a" stopOpacity="0.15" />
              <stop offset="100%" stopColor="#1a1a1a" stopOpacity="0.02" />
            </linearGradient>
          </defs>
          
          {/* Grid lines */}
          {yLabels.map((label, i) => (
            <g key={i}>
              <line
                x1={padding.left}
                y1={label.y}
                x2={width - padding.right}
                y2={label.y}
                stroke="#f1f5f9"
                strokeWidth="1"
              />
              <text
                x={padding.left - 10}
                y={label.y + 4}
                textAnchor="end"
                fontSize="12"
                fill="#94a3b8"
              >
                {label.value}
              </text>
            </g>
          ))}
          
          {/* X-axis labels */}
          {chartData.map((d, i) => (
            <text
              key={i}
              x={padding.left + (i / (chartData.length - 1)) * chartWidth}
              y={height - 10}
              textAnchor="middle"
              fontSize="12"
              fill="#94a3b8"
            >
              {d.label}
            </text>
          ))}
          
          {/* Area fill */}
          <path
            d={areaPath}
            fill="url(#areaGradient)"
          />
          
          {/* Line */}
          <path
            d={linePath}
            fill="none"
            stroke="#1a1a1a"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          
          {/* Interactive points */}
          {points.map((point, i) => (
            <g key={i}>
              <circle
                cx={point.x}
                cy={point.y}
                r={hoveredPoint === i ? 7 : 4}
                fill={hoveredPoint === i ? "#1a1a1a" : "white"}
                stroke="#1a1a1a"
                strokeWidth="2"
                style={{ cursor: 'pointer', transition: 'all 0.2s' }}
                onMouseEnter={() => handleMouseMove(i)}
                onMouseLeave={() => setHoveredPoint(null)}
              />
            </g>
          ))}
        </svg>
        
        {/* Tooltip */}
        {hoveredPoint !== null && (
          <div 
            className="chart-tooltip"
            style={{
              left: `${(points[hoveredPoint].x / width) * 100}%`,
              top: `${points[hoveredPoint].y - 10}px`
            }}
          >
            <div className="tooltip-date">
              {chartData[hoveredPoint].date.toLocaleDateString('en-US', { 
                month: 'short', 
                day: 'numeric', 
                year: 'numeric'
              })}
            </div>
            <div className="tooltip-row">
              <span className="dot"></span>
              <span>Sent:</span>
              <strong>{chartData[hoveredPoint].sent}</strong>
            </div>
            <div className="tooltip-row">
              <span className="dot opened"></span>
              <span>Opened:</span>
              <strong>{chartData[hoveredPoint].opened}</strong>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Comparison Card Component
const ComparisonCard = ({ label, value, previousValue, growth, icon, isPercentage }) => {
  const isPositive = parseFloat(growth) >= 0;
  
  const iconSvg = {
    send: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/></svg>,
    eye: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>,
    click: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122M5.05 12.95l-2.122 2.122"/></svg>,
    percent: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="19" y1="5" x2="5" y2="19"/><circle cx="6.5" cy="6.5" r="2.5"/><circle cx="17.5" cy="17.5" r="2.5"/></svg>,
    cursor: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 3l14 9-6 2-2 6L5 3z"/></svg>
  };
  
  return (
    <div className="comparison-card">
      <div className="comparison-icon">{iconSvg[icon]}</div>
      <div className="comparison-content">
        <div className="comparison-value">{value}</div>
        <div className="comparison-label">{label}</div>
        <div className={`comparison-growth ${isPositive ? 'positive' : 'negative'}`}>
          <span className="growth-arrow">{isPositive ? '↑' : '↓'}</span>
          <span>{Math.abs(growth)}%</span>
          <span className="vs-previous">vs previous period</span>
        </div>
      </div>
    </div>
  );
};

// Engagement Heatmap Component
const EngagementHeatmap = ({ data }) => {
  const { days, hours, data: heatmapData } = data;
  
  const getColor = (rate) => {
    if (rate === 0) return '#f1f5f9';
    if (rate < 10) return '#d1fae5';
    if (rate < 25) return '#6ee7b7';
    if (rate < 50) return '#34d399';
    if (rate < 75) return '#10b981';
    return '#059669';
  };
  
  return (
    <div className="heatmap-container">
      <div className="heatmap-grid">
        <div className="heatmap-row header">
          <div className="heatmap-cell day-label"></div>
          {hours.filter((_, i) => i % 3 === 0).map(h => (
            <div key={h} className="heatmap-cell hour-label" style={{ gridColumn: `span 3` }}>
              {h === 0 ? '12am' : h === 12 ? '12pm' : h < 12 ? `${h}am` : `${h-12}pm`}
            </div>
          ))}
        </div>
        {days.map((day, dayIndex) => (
          <div key={day} className="heatmap-row">
            <div className="heatmap-cell day-label">{day}</div>
            {hours.map(hour => (
              <div 
                key={`${day}-${hour}`}
                className="heatmap-cell"
                style={{ backgroundColor: getColor(heatmapData[dayIndex][hour].rate) }}
                title={`${day} ${hour}:00 - Open Rate: ${heatmapData[dayIndex][hour].rate.toFixed(1)}%`}
              ></div>
            ))}
          </div>
        ))}
      </div>
      <div className="heatmap-legend">
        <span>Low</span>
        <div className="legend-gradient"></div>
        <span>High</span>
      </div>
    </div>
  );
};

// Link Clicks Table Component
const LinkClicksTable = ({ campaigns }) => {
  // Aggregate link clicks from campaigns
  const linkData = campaigns
    .filter(c => c.trackingStats?.linkClicks)
    .flatMap(c => Object.entries(c.trackingStats.linkClicks || {}).map(([url, clicks]) => ({
      url,
      clicks,
      campaign: c.name
    })))
    .sort((a, b) => b.clicks - a.clicks)
    .slice(0, 10);
  
  if (linkData.length === 0) {
    return (
      <div className="no-data-message">
        <p>No link click data available yet.</p>
        <p className="hint">Link tracking data will appear here once recipients click links in your tracked campaigns.</p>
      </div>
    );
  }
  
  return (
    <table className="link-clicks-table">
      <thead>
        <tr>
          <th>Link URL</th>
          <th>Campaign</th>
          <th>Clicks</th>
        </tr>
      </thead>
      <tbody>
        {linkData.map((link, i) => (
          <tr key={i}>
            <td className="link-url">{link.url.length > 50 ? link.url.substring(0, 50) + '...' : link.url}</td>
            <td>{link.campaign}</td>
            <td className="clicks-count">{link.clicks}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};

// Geographic Table Component
const GeoTable = () => {
  // This would come from real tracking data
  const geoData = [
    { country: 'United States', opens: 0, percentage: 0 },
    { country: 'United Kingdom', opens: 0, percentage: 0 },
    { country: 'Canada', opens: 0, percentage: 0 },
    { country: 'Germany', opens: 0, percentage: 0 },
    { country: 'Australia', opens: 0, percentage: 0 }
  ];
  
  return (
    <div className="geo-table-container">
      <table className="geo-table">
        <thead>
          <tr>
            <th>Country</th>
            <th>Opens</th>
            <th>Percentage</th>
          </tr>
        </thead>
        <tbody>
          {geoData.map((geo, i) => (
            <tr key={i}>
              <td className="country-cell">
                <span className="country-flag">{geo.country.substring(0, 2).toUpperCase()}</span>
                {geo.country}
              </td>
              <td>{geo.opens}</td>
              <td>
                <div className="percentage-bar">
                  <div className="percentage-fill" style={{ width: `${geo.percentage}%` }}></div>
                  <span>{geo.percentage}%</span>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="geo-hint">Geographic data will be populated as tracking events are collected.</p>
    </div>
  );
};

// Health Score Gauge Component
const HealthScoreGauge = ({ score }) => {
  const size = 180;
  const strokeWidth = 16;
  const radius = (size - strokeWidth) / 2;
  const circumference = Math.PI * radius * 1.5; // 270 degree arc
  const progress = (score / 100) * circumference;
  
  const getColor = () => {
    if (score >= 80) return '#22c55e';
    if (score >= 60) return '#eab308';
    if (score >= 40) return '#f97316';
    return '#ef4444';
  };
  
  return (
    <div className="health-gauge">
      <svg width={size} height={size * 0.75} viewBox={`0 0 ${size} ${size * 0.75}`}>
        {/* Background arc */}
        <path
          d={`M ${strokeWidth / 2} ${size * 0.6} A ${radius} ${radius} 0 1 1 ${size - strokeWidth / 2} ${size * 0.6}`}
          fill="none"
          stroke="#e2e8f0"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />
        
        {/* Progress arc */}
        <path
          d={`M ${strokeWidth / 2} ${size * 0.6} A ${radius} ${radius} 0 1 1 ${size - strokeWidth / 2} ${size * 0.6}`}
          fill="none"
          stroke={getColor()}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={`${progress} ${circumference}`}
          style={{ transition: 'stroke-dasharray 0.5s ease' }}
        />
      </svg>
      <div className="health-score-value" style={{ color: getColor() }}>{score}</div>
      <div className="health-score-label">out of 100</div>
    </div>
  );
};

// Bounce Analysis Chart Component
const BounceAnalysisChart = ({ totalSent, totalBounced, totalUnsubscribed, campaigns }) => {
  const delivered = totalSent - totalBounced;
  const deliveryRate = totalSent > 0 ? ((delivered / totalSent) * 100).toFixed(1) : 100;
  
  return (
    <div className="bounce-analysis">
      <div className="delivery-stats">
        <div className="delivery-stat-card">
          <div className="stat-icon success">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
              <polyline points="22 4 12 14.01 9 11.01"/>
            </svg>
          </div>
          <div className="stat-details">
            <div className="stat-value">{delivered}</div>
            <div className="stat-label">Delivered</div>
          </div>
          <div className="stat-rate positive">{deliveryRate}%</div>
        </div>
        
        <div className="delivery-stat-card">
          <div className="stat-icon warning">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="8" x2="12" y2="12"/>
              <line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
          </div>
          <div className="stat-details">
            <div className="stat-value">{totalBounced}</div>
            <div className="stat-label">Bounced</div>
          </div>
          <div className="stat-rate negative">{totalSent > 0 ? ((totalBounced / totalSent) * 100).toFixed(1) : 0}%</div>
        </div>
        
        <div className="delivery-stat-card">
          <div className="stat-icon danger">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3zm7-13h2.67A2.31 2.31 0 0 1 22 4v7a2.31 2.31 0 0 1-2.33 2H17"/>
            </svg>
          </div>
          <div className="stat-details">
            <div className="stat-value">{totalUnsubscribed}</div>
            <div className="stat-label">Unsubscribed</div>
          </div>
          <div className="stat-rate negative">{totalSent > 0 ? ((totalUnsubscribed / totalSent) * 100).toFixed(2) : 0}%</div>
        </div>
      </div>
      
      <div className="delivery-tips">
        <h4>Tips to Improve Deliverability</h4>
        <ul>
          <li>Keep your bounce rate below 5% by regularly cleaning your email list</li>
          <li>Monitor unsubscribe rates and adjust email frequency if needed</li>
          <li>Use double opt-in to ensure valid email addresses</li>
          <li>Maintain consistent sending patterns to build sender reputation</li>
        </ul>
      </div>
    </div>
  );
};

export default CampaignAnalytics;
