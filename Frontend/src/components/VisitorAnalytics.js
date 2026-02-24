import React, { useState, useEffect, useCallback } from 'react';
import {
  FiActivity, FiUsers, FiMonitor, FiSmartphone, FiGlobe,
  FiSearch, FiRefreshCw, FiFilter, FiChevronDown, FiX,
  FiCpu, FiShield, FiMapPin, FiClock, FiWifi, FiWifiOff,
  FiTrash2, FiAlertCircle, FiTablet
} from 'react-icons/fi';
import api from '../config/api';
import { toast } from 'sonner';
import './VisitorAnalytics.css';

function VisitorAnalytics() {
  const [visitors, setVisitors] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState('all'); // all, online, offline, bot, human
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('live'); // live, analytics

  const fetchVisitors = useCallback(async () => {
    try {
      const params = new URLSearchParams({
        page,
        limit: 50,
        sort: 'lastSeenAt',
        order: 'desc'
      });
      if (filter !== 'all') params.append('filter', filter);
      if (searchQuery) params.append('search', searchQuery);

      const response = await api.get(`/visitors?${params.toString()}`);
      if (response.data.success) {
        setVisitors(response.data.visitors);
        setTotalPages(response.data.totalPages);
        setTotal(response.data.total);
      }
    } catch (error) {
      console.error('Error fetching visitors:', error);
    }
  }, [page, filter, searchQuery]);

  const fetchStats = useCallback(async () => {
    try {
      const response = await api.get('/visitors/stats');
      if (response.data.success) {
        setStats(response.data.stats);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  }, []);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchVisitors(), fetchStats()]);
      setLoading(false);
    };
    loadData();
  }, [fetchVisitors, fetchStats]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      fetchVisitors();
      fetchStats();
    }, 30000);
    return () => clearInterval(interval);
  }, [fetchVisitors, fetchStats]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchVisitors(), fetchStats()]);
    setRefreshing(false);
    toast.success('Data refreshed');
  };

  const handleDelete = async (id) => {
    try {
      const response = await api.delete(`/visitors/${id}`);
      if (response.data.success) {
        toast.success('Visitor record deleted');
        fetchVisitors();
        fetchStats();
      }
    } catch (error) {
      toast.error('Failed to delete visitor');
    }
  };

  const getDeviceIcon = (deviceType) => {
    switch (deviceType?.toLowerCase()) {
      case 'mobile': return <FiSmartphone size={14} />;
      case 'tablet': return <FiTablet size={14} />;
      default: return <FiMonitor size={14} />;
    }
  };

  const getTimeSince = (date) => {
    if (!date) return 'Unknown';
    const seconds = Math.floor((new Date() - new Date(date)) / 1000);
    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  };

  if (loading) {
    return (
      <div className="va-container">
        <div className="va-loading">
          <div className="va-spinner" />
          <p>Loading visitor analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="va-container">
      {/* Header */}
      <div className="va-header">
        <div className="va-header-left">
          <div className="va-header-icon"><FiActivity size={20} /></div>
          <div>
            <h1>Visitor Analytics</h1>
            <p className="va-header-sub">Live users, bots, locations & devices · Auto-refreshes every 30s</p>
          </div>
        </div>
        <div className="va-header-right">
          <button className={`va-refresh-btn ${refreshing ? 'spinning' : ''}`} onClick={handleRefresh} disabled={refreshing}>
            <FiRefreshCw size={14} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Stats Overview */}
      {stats && (
        <div className="va-stats-grid">
          <div className="va-stat-card">
            <div className="va-stat-icon online"><FiWifi size={18} /></div>
            <div className="va-stat-info">
              <span className="va-stat-value">{stats.onlineNow}</span>
              <span className="va-stat-label">Online Now</span>
            </div>
          </div>
          <div className="va-stat-card">
            <div className="va-stat-icon total"><FiUsers size={18} /></div>
            <div className="va-stat-info">
              <span className="va-stat-value">{stats.totalVisitors}</span>
              <span className="va-stat-label">Total Visitors</span>
            </div>
          </div>
          <div className="va-stat-card">
            <div className="va-stat-icon human"><FiShield size={18} /></div>
            <div className="va-stat-info">
              <span className="va-stat-value">{stats.totalHumans}</span>
              <span className="va-stat-label">Humans</span>
            </div>
          </div>
          <div className="va-stat-card">
            <div className="va-stat-icon bot"><FiCpu size={18} /></div>
            <div className="va-stat-info">
              <span className="va-stat-value">{stats.totalBots}</span>
              <span className="va-stat-label">Bots</span>
            </div>
          </div>
          <div className="va-stat-card">
            <div className="va-stat-icon today"><FiClock size={18} /></div>
            <div className="va-stat-info">
              <span className="va-stat-value">{stats.todayVisitors}</span>
              <span className="va-stat-label">Today</span>
            </div>
          </div>
          <div className="va-stat-card">
            <div className="va-stat-icon weekly"><FiGlobe size={18} /></div>
            <div className="va-stat-info">
              <span className="va-stat-value">{stats.last7DaysVisitors}</span>
              <span className="va-stat-label">Last 7 Days</span>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="va-tabs">
        <button className={`va-tab ${activeTab === 'live' ? 'active' : ''}`} onClick={() => setActiveTab('live')}>
          <FiWifi size={14} />
          <span>Live Visitors</span>
          {stats && <span className="va-tab-badge">{total}</span>}
        </button>
        <button className={`va-tab ${activeTab === 'analytics' ? 'active' : ''}`} onClick={() => setActiveTab('analytics')}>
          <FiActivity size={14} />
          <span>Analytics</span>
        </button>
      </div>

      {activeTab === 'live' && (
        <>
          {/* Search & Filters */}
          <div className="va-toolbar">
            <div className="va-search">
              <FiSearch size={14} />
              <input
                placeholder="Search by IP, browser, location, device..."
                value={searchQuery}
                onChange={e => { setSearchQuery(e.target.value); setPage(1); }}
              />
              {searchQuery && (
                <button className="va-search-clear" onClick={() => { setSearchQuery(''); setPage(1); }}>
                  <FiX size={14} />
                </button>
              )}
            </div>
            <div className="va-filters">
              {['all', 'online', 'offline', 'human', 'bot'].map(f => (
                <button
                  key={f}
                  className={`va-filter-btn ${filter === f ? 'active' : ''}`}
                  onClick={() => { setFilter(f); setPage(1); }}
                >
                  {f === 'online' && <FiWifi size={12} />}
                  {f === 'offline' && <FiWifiOff size={12} />}
                  {f === 'human' && <FiShield size={12} />}
                  {f === 'bot' && <FiCpu size={12} />}
                  <span>{f.charAt(0).toUpperCase() + f.slice(1)}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Table Header */}
          <div className="va-table-header">
            <div className="va-th-status">Status</div>
            <div className="va-th-user">User / Fingerprint</div>
            <div className="va-th-ip">IP Address</div>
            <div className="va-th-location">Location</div>
            <div className="va-th-device">Device</div>
            <div className="va-th-browser">Browser / OS</div>
            <div className="va-th-sessions">Sessions</div>
            <div className="va-th-seen">Last Seen</div>
            <div className="va-th-actions"></div>
          </div>

          {/* Visitor List */}
          {visitors.length > 0 ? (
            <div className="va-list">
              {visitors.map(v => (
                <div key={v._id} className={`va-row ${v.isOnline ? 'online' : ''} ${v.isBot ? 'bot' : ''}`}>
                  <div className="va-cell-status">
                    {v.isBot ? (
                      <span className="va-badge bot" title={v.botReason || 'Bot detected'}>
                        <FiCpu size={12} /> Bot
                      </span>
                    ) : v.isOnline ? (
                      <span className="va-badge online"><FiWifi size={12} /> Live</span>
                    ) : (
                      <span className="va-badge offline"><FiWifiOff size={12} /> Offline</span>
                    )}
                  </div>

                  <div className="va-cell-user">
                    {v.userId ? (
                      <div className="va-user-info">
                        <strong>{v.userId.fullName || 'User'}</strong>
                        <span className="va-user-email">{v.userId.email}</span>
                      </div>
                    ) : (
                      <div className="va-user-info">
                        <strong>Anonymous</strong>
                        <span className="va-fingerprint" title={v.fingerprint}>{v.fingerprint?.substring(0, 12)}...</span>
                      </div>
                    )}
                  </div>

                  <div className="va-cell-ip">
                    <code className="va-ip">{v.ip || 'Unknown'}</code>
                  </div>

                  <div className="va-cell-location">
                    <FiMapPin size={12} />
                    <span>
                      {[v.location?.city, v.location?.region, v.location?.country].filter(Boolean).join(', ') || 'Unknown'}
                    </span>
                  </div>

                  <div className="va-cell-device">
                    {getDeviceIcon(v.device?.type)}
                    <span>{v.device?.type || 'Desktop'}</span>
                    {v.screenResolution && <span className="va-screen">{v.screenResolution}</span>}
                  </div>

                  <div className="va-cell-browser">
                    <div className="va-browser-info">
                      <span>{v.browser?.name} {v.browser?.version?.split('.')[0]}</span>
                      <span className="va-os">{v.os?.name} {v.os?.version}</span>
                    </div>
                  </div>

                  <div className="va-cell-sessions">
                    <span className="va-session-count">{v.sessionCount || 1}</span>
                  </div>

                  <div className="va-cell-seen">
                    <FiClock size={12} />
                    <span>{getTimeSince(v.lastSeenAt)}</span>
                  </div>

                  <div className="va-cell-actions">
                    <button className="va-delete-btn" onClick={() => handleDelete(v._id)} title="Delete record">
                      <FiTrash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="va-empty">
              <FiActivity size={40} />
              <h3>No visitors found</h3>
              <p>{searchQuery || filter !== 'all' ? 'Try adjusting your search or filters.' : 'Visitor data will appear here as users access your workspace.'}</p>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="va-pagination">
              <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Previous</button>
              <span>Page {page} of {totalPages}</span>
              <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Next</button>
            </div>
          )}
        </>
      )}

      {activeTab === 'analytics' && stats && (
        <div className="va-analytics">
          {/* Browser Distribution */}
          <div className="va-chart-card">
            <h3><FiMonitor size={16} /> Browser Distribution</h3>
            <div className="va-bar-chart">
              {stats.browserStats?.map((b, i) => {
                const pct = stats.totalVisitors > 0 ? Math.round((b.count / stats.totalVisitors) * 100) : 0;
                return (
                  <div key={i} className="va-bar-row">
                    <span className="va-bar-label">{b._id || 'Unknown'}</span>
                    <div className="va-bar-track">
                      <div className="va-bar-fill" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="va-bar-value">{b.count} ({pct}%)</span>
                  </div>
                );
              })}
              {(!stats.browserStats || stats.browserStats.length === 0) && <p className="va-no-data">No data yet</p>}
            </div>
          </div>

          {/* OS Distribution */}
          <div className="va-chart-card">
            <h3><FiCpu size={16} /> Operating System</h3>
            <div className="va-bar-chart">
              {stats.osStats?.map((o, i) => {
                const pct = stats.totalVisitors > 0 ? Math.round((o.count / stats.totalVisitors) * 100) : 0;
                return (
                  <div key={i} className="va-bar-row">
                    <span className="va-bar-label">{o._id || 'Unknown'}</span>
                    <div className="va-bar-track">
                      <div className="va-bar-fill os" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="va-bar-value">{o.count} ({pct}%)</span>
                  </div>
                );
              })}
              {(!stats.osStats || stats.osStats.length === 0) && <p className="va-no-data">No data yet</p>}
            </div>
          </div>

          {/* Device Distribution */}
          <div className="va-chart-card">
            <h3><FiSmartphone size={16} /> Device Types</h3>
            <div className="va-device-grid">
              {stats.deviceStats?.map((d, i) => {
                const pct = stats.totalVisitors > 0 ? Math.round((d.count / stats.totalVisitors) * 100) : 0;
                return (
                  <div key={i} className="va-device-card">
                    {d._id === 'Mobile' ? <FiSmartphone size={24} /> : d._id === 'Tablet' ? <FiTablet size={24} /> : <FiMonitor size={24} />}
                    <strong>{d._id || 'Desktop'}</strong>
                    <span>{d.count} ({pct}%)</span>
                  </div>
                );
              })}
              {(!stats.deviceStats || stats.deviceStats.length === 0) && <p className="va-no-data">No data yet</p>}
            </div>
          </div>

          {/* Top Countries */}
          <div className="va-chart-card">
            <h3><FiGlobe size={16} /> Top Countries</h3>
            <div className="va-bar-chart">
              {stats.countryStats?.map((c, i) => {
                const pct = stats.totalVisitors > 0 ? Math.round((c.count / stats.totalVisitors) * 100) : 0;
                return (
                  <div key={i} className="va-bar-row">
                    <span className="va-bar-label">{c._id || 'Unknown'}</span>
                    <div className="va-bar-track">
                      <div className="va-bar-fill country" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="va-bar-value">{c.count} ({pct}%)</span>
                  </div>
                );
              })}
              {(!stats.countryStats || stats.countryStats.length === 0) && <p className="va-no-data">No data yet</p>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default VisitorAnalytics;
