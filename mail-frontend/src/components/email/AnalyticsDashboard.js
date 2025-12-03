import React, { useState, useEffect } from 'react';
import api from '../../config/api';
import {
  exportSummaryToCSV,
  exportTrendsToCSV,
  exportTeamPerformanceToCSV,
  exportTagsToCSV,
  exportAllToCSV
} from '../../utils/csvExport';
import { exportAnalyticsToPDF } from '../../utils/pdfExport';
import './AnalyticsDashboard.css';

const AnalyticsDashboard = () => {
  const [summary, setSummary] = useState(null);
  const [trends, setTrends] = useState([]);
  const [teamPerformance, setTeamPerformance] = useState([]);
  const [tags, setTags] = useState([]);
  const [realTimeStats, setRealTimeStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedDays, setSelectedDays] = useState(30);
  const [selectedMetric, setSelectedMetric] = useState('volume');
  const [showExportMenu, setShowExportMenu] = useState(false);

  useEffect(() => {
    fetchAllData();

    // Refresh real-time stats every 30 seconds
    const interval = setInterval(fetchRealTimeStats, 30000);
    return () => clearInterval(interval);
  }, [selectedDays, selectedMetric]);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchDashboardSummary(),
        fetchTrends(),
        fetchTeamPerformance(),
        fetchTags(),
        fetchRealTimeStats()
      ]);
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchDashboardSummary = async () => {
    try {
      const res = await api.get(`/analytics/dashboard?days=${selectedDays}`);
      setSummary(res.data.summary);
    } catch (error) {
      console.error('Error fetching dashboard summary:', error);
    }
  };

  const fetchTrends = async () => {
    try {
      const res = await api.get(`/analytics/trends?days=${selectedDays}&metric=${selectedMetric}`);
      setTrends(res.data.trend || []);
    } catch (error) {
      console.error('Error fetching trends:', error);
    }
  };

  const fetchTeamPerformance = async () => {
    try {
      const res = await api.get(`/analytics/team-performance?days=${selectedDays}`);
      setTeamPerformance(res.data.topPerformers || []);
    } catch (error) {
      console.error('Error fetching team performance:', error);
    }
  };

  const fetchTags = async () => {
    try {
      const res = await api.get(`/analytics/tags?days=${selectedDays}`);
      setTags(res.data.tags || []);
    } catch (error) {
      console.error('Error fetching tags:', error);
    }
  };

  const fetchRealTimeStats = async () => {
    try {
      const res = await api.get('/analytics/real-time');
      setRealTimeStats(res.data.stats);
    } catch (error) {
      console.error('Error fetching real-time stats:', error);
    }
  };

  const formatTime = (minutes) => {
    if (!minutes && minutes !== 0) return 'N/A';
    if (minutes < 60) return `${Math.round(minutes)}m`;
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const handleExport = (type) => {
    switch (type) {
      case 'summary':
        exportSummaryToCSV(summary);
        break;
      case 'trends':
        exportTrendsToCSV(trends, selectedMetric);
        break;
      case 'team':
        exportTeamPerformanceToCSV(teamPerformance);
        break;
      case 'tags':
        exportTagsToCSV(tags);
        break;
      case 'all':
        exportAllToCSV({ summary, trends, teamPerformance, tags, metric: selectedMetric });
        break;
      default:
        break;
    }
    setShowExportMenu(false);
  };

  const handleExportPDF = () => {
    const dateRange = `Last ${selectedDays} days`;
    exportAnalyticsToPDF({
      summary,
      trends,
      teamPerformance,
      tags,
      dateRange
    });
    setShowExportMenu(false);
  };

  if (loading) {
    return (
      <div className="analytics-dashboard">
        <div className="analytics-loading">Loading analytics...</div>
      </div>
    );
  }

  return (
    <div className="analytics-dashboard">
      {/* Header */}
      <div className="analytics-header">
        <div className="analytics-title">
          <h2>Analytics Dashboard</h2>
          <p>Performance insights and metrics</p>
        </div>
        <div className="analytics-controls">
          <select
            value={selectedDays}
            onChange={(e) => setSelectedDays(parseInt(e.target.value))}
            className="days-selector"
          >
            <option value={7}>Last 7 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
          </select>

          <div className="export-dropdown">
            <button
              className="export-button"
              onClick={() => setShowExportMenu(!showExportMenu)}
            >
              📊 Export
            </button>
            {showExportMenu && (
              <div className="export-menu">
                <div className="export-section-title">CSV Export</div>
                <button onClick={() => handleExport('summary')}>Summary</button>
                <button onClick={() => handleExport('trends')}>Trends</button>
                <button onClick={() => handleExport('team')}>Team Performance</button>
                <button onClick={() => handleExport('tags')}>Tag Usage</button>
                <button onClick={() => handleExport('all')}>Complete Report (CSV)</button>
                <div className="export-divider"></div>
                <div className="export-section-title">PDF Export</div>
                <button onClick={handleExportPDF} className="export-pdf-button">
                  📄 Complete Report (PDF)
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Real-time Stats Banner */}
      {realTimeStats && (
        <div className="realtime-banner">
          <div className="realtime-title">
            <span className="live-indicator"></span>
            Today's Activity
          </div>
          <div className="realtime-stats">
            <div className="realtime-stat">
              <span className="stat-value">{realTimeStats.todayReceived}</span>
              <span className="stat-label">Received</span>
            </div>
            <div className="realtime-stat">
              <span className="stat-value">{realTimeStats.todayResolved}</span>
              <span className="stat-label">Resolved</span>
            </div>
            <div className="realtime-stat">
              <span className="stat-value">{realTimeStats.currentlyOpen}</span>
              <span className="stat-label">Open</span>
            </div>
            <div className="realtime-stat">
              <span className="stat-value">{realTimeStats.todayUnassigned}</span>
              <span className="stat-label">Unassigned</span>
            </div>
          </div>
        </div>
      )}

      {/* Summary Cards */}
      {summary && (
        <div className="summary-cards">
          <div className="summary-card">
            <div className="card-icon" style={{ background: '#EBF8FF', color: '#3182ce' }}>=�</div>
            <div className="card-content">
              <div className="card-value">{summary.totalReceived || 0}</div>
              <div className="card-label">Total Received</div>
            </div>
          </div>

          <div className="summary-card">
            <div className="card-icon" style={{ background: '#F0FFF4', color: '#48bb78' }}></div>
            <div className="card-content">
              <div className="card-value">{summary.totalResolved || 0}</div>
              <div className="card-label">Total Resolved</div>
            </div>
          </div>

          <div className="summary-card">
            <div className="card-icon" style={{ background: '#FAF5FF', color: '#9f7aea' }}>�</div>
            <div className="card-content">
              <div className="card-value">{formatTime(summary.avgResponseTime)}</div>
              <div className="card-label">Avg Response Time</div>
            </div>
          </div>

          <div className="summary-card">
            <div className="card-icon" style={{ background: '#FFFAF0', color: '#ed8936' }}>=�</div>
            <div className="card-content">
              <div className="card-value">
                {summary.totalResolved && summary.totalReceived
                  ? `${Math.round((summary.totalResolved / summary.totalReceived) * 100)}%`
                  : 'N/A'}
              </div>
              <div className="card-label">Resolution Rate</div>
            </div>
          </div>
        </div>
      )}

      {/* Trend Chart */}
      <div className="analytics-section">
        <div className="section-header">
          <h3>Trends</h3>
          <div className="metric-selector">
            <button
              className={`metric-btn ${selectedMetric === 'volume' ? 'active' : ''}`}
              onClick={() => setSelectedMetric('volume')}
            >
              Volume
            </button>
            <button
              className={`metric-btn ${selectedMetric === 'response-time' ? 'active' : ''}`}
              onClick={() => setSelectedMetric('response-time')}
            >
              Response Time
            </button>
            <button
              className={`metric-btn ${selectedMetric === 'priority' ? 'active' : ''}`}
              onClick={() => setSelectedMetric('priority')}
            >
              Priority
            </button>
            <button
              className={`metric-btn ${selectedMetric === 'status' ? 'active' : ''}`}
              onClick={() => setSelectedMetric('status')}
            >
              Status
            </button>
          </div>
        </div>

        {trends.length === 0 ? (
          <div className="no-data">No trend data available</div>
        ) : (
          <div className="trend-chart">
            <div className="chart-area">
              {selectedMetric === 'volume' && (
                <SimpleTrendChart
                  data={trends}
                  dataKeys={['received', 'resolved']}
                  colors={['#3182ce', '#48bb78']}
                  labels={['Received', 'Resolved']}
                />
              )}
              {selectedMetric === 'response-time' && (
                <SimpleTrendChart
                  data={trends}
                  dataKeys={['avgResponseTime']}
                  colors={['#9f7aea']}
                  labels={['Avg Response Time (min)']}
                />
              )}
              {selectedMetric === 'priority' && (
                <SimpleTrendChart
                  data={trends}
                  dataKeys={['urgent', 'high', 'normal', 'low']}
                  colors={['#e53e3e', '#ed8936', '#3182ce', '#718096']}
                  labels={['Urgent', 'High', 'Normal', 'Low']}
                />
              )}
              {selectedMetric === 'status' && (
                <SimpleTrendChart
                  data={trends}
                  dataKeys={['new', 'in_progress', 'resolved', 'closed']}
                  colors={['#3182ce', '#ed8936', '#48bb78', '#718096']}
                  labels={['New', 'In Progress', 'Resolved', 'Closed']}
                />
              )}
            </div>
          </div>
        )}
      </div>

      {/* Two Column Layout */}
      <div className="analytics-grid">
        {/* Team Performance */}
        <div className="analytics-section">
          <h3>Top Performers</h3>
          {teamPerformance.length === 0 ? (
            <div className="no-data">No performance data available</div>
          ) : (
            <div className="performers-list">
              {teamPerformance.slice(0, 5).map((performer, index) => (
                <div key={performer.userId?._id || index} className="performer-item">
                  <div className="performer-rank">#{index + 1}</div>
                  <div className="performer-info">
                    <div className="performer-name">
                      {performer.userId?.name || 'Unknown'}
                    </div>
                    <div className="performer-stats">
                      {performer.emailsResolved} resolved " {formatTime(performer.avgResponseTime)} avg
                    </div>
                  </div>
                  <div className="performer-badge">
                    {performer.emailsResolved}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Top Tags */}
        <div className="analytics-section">
          <h3>Top Tags</h3>
          {tags.length === 0 ? (
            <div className="no-data">No tag data available</div>
          ) : (
            <div className="tags-list">
              {tags.slice(0, 10).map((tag, index) => (
                <div key={index} className="tag-item">
                  <span className="tag-name">{tag.tag}</span>
                  <div className="tag-bar-container">
                    <div
                      className="tag-bar"
                      style={{
                        width: `${(tag.count / tags[0].count) * 100}%`
                      }}
                    ></div>
                  </div>
                  <span className="tag-count">{tag.count}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Simple Trend Chart Component (CSS-based visualization)
const SimpleTrendChart = ({ data, dataKeys, colors, labels }) => {
  if (!data || data.length === 0) return <div className="no-data">No data</div>;

  // Find max value for scaling
  const maxValue = Math.max(
    ...data.map(d => Math.max(...dataKeys.map(key => d[key] || 0)))
  );

  return (
    <div className="simple-chart">
      <div className="chart-legend">
        {labels.map((label, i) => (
          <div key={i} className="legend-item">
            <span className="legend-color" style={{ background: colors[i] }}></span>
            <span className="legend-label">{label}</span>
          </div>
        ))}
      </div>

      <div className="chart-bars">
        {data.map((point, index) => (
          <div key={index} className="chart-bar-group">
            <div className="bar-stack">
              {dataKeys.map((key, keyIndex) => {
                const value = point[key] || 0;
                const height = maxValue > 0 ? (value / maxValue) * 100 : 0;
                return (
                  <div
                    key={keyIndex}
                    className="bar"
                    style={{
                      height: `${height}%`,
                      background: colors[keyIndex],
                      opacity: 0.8
                    }}
                    title={`${labels[keyIndex]}: ${value}`}
                  ></div>
                );
              })}
            </div>
            <div className="bar-label">
              {point.date ? new Date(point.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : index}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AnalyticsDashboard;
