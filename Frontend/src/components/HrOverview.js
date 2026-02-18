import React, { useState, useEffect, useCallback } from 'react';
import api from '../config/api';
import { FiUsers, FiCheckCircle, FiXCircle, FiCalendar, FiAward, FiClock, FiTrendingUp, FiSettings, FiSave } from 'react-icons/fi';
import './HrOverview.css';

function HrOverview() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [settings, setSettings] = useState({
    workingHoursPerDay: 8,
    workingDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
    halfDayThresholdHours: 4
  });
  const [savingSettings, setSavingSettings] = useState(false);

  const fetchOverview = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get('/hr/overview');
      if (response.data.success) {
        setStats(response.data.stats);
        if (response.data.stats.hrSettings) {
          setSettings(response.data.stats.hrSettings);
        }
      }
    } catch (err) {
      setError('Failed to load HR overview');
      console.error('HR overview error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOverview();
  }, [fetchOverview]);

  const handleSaveSettings = async () => {
    try {
      setSavingSettings(true);
      await api.put('/hr/settings', settings);
      setShowSettings(false);
      fetchOverview();
    } catch (err) {
      console.error('Failed to save settings:', err);
      setError('Failed to save settings');
    } finally {
      setSavingSettings(false);
    }
  };

  const toggleDay = (day) => {
    setSettings(prev => ({
      ...prev,
      workingDays: prev.workingDays.includes(day)
        ? prev.workingDays.filter(d => d !== day)
        : [...prev.workingDays, day]
    }));
  };

  if (loading) {
    return (
      <div className="hr-overview">
        <div className="hr-loading">
          <div className="hr-loading-spinner"></div>
          <p>Loading HR Overview...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="hr-overview">
        <div className="hr-error">
          <p>{error}</p>
          <button onClick={fetchOverview} className="hr-retry-btn">Retry</button>
        </div>
      </div>
    );
  }

  const departments = stats?.departments || {};
  const maxDeptCount = Math.max(...Object.values(departments), 1);

  return (
    <div className="hr-overview">
      <div className="hr-overview-header">
        <div>
          <h2>HR Overview</h2>
          <p className="hr-overview-subtitle">Company workforce at a glance</p>
        </div>
        <button className="hr-settings-btn" onClick={() => setShowSettings(!showSettings)}>
          <FiSettings /> Company Settings
        </button>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div className="hr-settings-panel">
          <h3>Company Working Hours</h3>
          <div className="hr-settings-grid">
            <div className="hr-setting-item">
              <label>Working Hours Per Day</label>
              <input
                type="number"
                min="1"
                max="24"
                value={settings.workingHoursPerDay}
                onChange={e => setSettings(prev => ({ ...prev, workingHoursPerDay: Number(e.target.value) }))}
              />
            </div>
            <div className="hr-setting-item">
              <label>Half-Day Threshold (Hours)</label>
              <input
                type="number"
                min="1"
                max="12"
                value={settings.halfDayThresholdHours}
                onChange={e => setSettings(prev => ({ ...prev, halfDayThresholdHours: Number(e.target.value) }))}
              />
            </div>
            <div className="hr-setting-item hr-setting-days">
              <label>Working Days</label>
              <div className="hr-days-grid">
                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
                  <button
                    key={day}
                    className={`hr-day-btn ${settings.workingDays.includes(day) ? 'active' : ''}`}
                    onClick={() => toggleDay(day)}
                  >
                    {day}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <button className="hr-save-settings-btn" onClick={handleSaveSettings} disabled={savingSettings}>
            <FiSave /> {savingSettings ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      )}

      {/* KPI Cards */}
      <div className="hr-kpi-grid">
        <div className="hr-kpi-card hr-kpi-employees">
          <div className="hr-kpi-icon"><FiUsers /></div>
          <div className="hr-kpi-info">
            <span className="hr-kpi-value">{stats?.totalEmployees || 0}</span>
            <span className="hr-kpi-label">Total Employees</span>
          </div>
        </div>
        <div className="hr-kpi-card hr-kpi-present">
          <div className="hr-kpi-icon"><FiCheckCircle /></div>
          <div className="hr-kpi-info">
            <span className="hr-kpi-value">{stats?.presentToday || 0}</span>
            <span className="hr-kpi-label">Present Today</span>
          </div>
        </div>
        <div className="hr-kpi-card hr-kpi-absent">
          <div className="hr-kpi-icon"><FiXCircle /></div>
          <div className="hr-kpi-info">
            <span className="hr-kpi-value">{stats?.absentToday || 0}</span>
            <span className="hr-kpi-label">Absent Today</span>
          </div>
        </div>
        <div className="hr-kpi-card hr-kpi-leave">
          <div className="hr-kpi-icon"><FiClock /></div>
          <div className="hr-kpi-info">
            <span className="hr-kpi-value">{stats?.onLeave || 0}</span>
            <span className="hr-kpi-label">On Leave</span>
          </div>
        </div>
        <div className="hr-kpi-card hr-kpi-incentives">
          <div className="hr-kpi-icon"><FiAward /></div>
          <div className="hr-kpi-info">
            <span className="hr-kpi-value">{stats?.pendingIncentives || 0}</span>
            <span className="hr-kpi-label">Pending Incentives</span>
          </div>
        </div>
        <div className="hr-kpi-card hr-kpi-holidays">
          <div className="hr-kpi-icon"><FiCalendar /></div>
          <div className="hr-kpi-info">
            <span className="hr-kpi-value">{stats?.upcomingHolidays?.length || 0}</span>
            <span className="hr-kpi-label">Upcoming Holidays</span>
          </div>
        </div>
      </div>

      {/* Department & Holidays Row */}
      <div className="hr-overview-row">
        {/* Department Breakdown */}
        <div className="hr-overview-card hr-dept-card">
          <h3><FiTrendingUp /> Department Distribution</h3>
          <div className="hr-dept-list">
            {Object.entries(departments).length > 0 ? (
              Object.entries(departments)
                .sort((a, b) => b[1] - a[1])
                .map(([dept, count]) => (
                  <div key={dept} className="hr-dept-item">
                    <div className="hr-dept-header">
                      <span className="hr-dept-name">{dept}</span>
                      <span className="hr-dept-count">{count}</span>
                    </div>
                    <div className="hr-dept-bar-bg">
                      <div
                        className="hr-dept-bar-fill"
                        style={{ width: `${(count / maxDeptCount) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                ))
            ) : (
              <p className="hr-empty">No department data available</p>
            )}
          </div>
        </div>

        {/* Upcoming Holidays */}
        <div className="hr-overview-card hr-holidays-card">
          <h3><FiCalendar /> Upcoming Holidays</h3>
          <div className="hr-holidays-list">
            {stats?.upcomingHolidays?.length > 0 ? (
              stats.upcomingHolidays.map((holiday, i) => (
                <div key={i} className="hr-holiday-item">
                  <div className={`hr-holiday-type-badge ${holiday.type}`}>{holiday.type}</div>
                  <div className="hr-holiday-info">
                    <span className="hr-holiday-name">{holiday.name}</span>
                    <span className="hr-holiday-date">
                      {new Date(holiday.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <p className="hr-empty">No upcoming holidays</p>
            )}
          </div>
        </div>
      </div>

      {/* Work Hours Info */}
      <div className="hr-overview-card hr-workhours-card">
        <h3><FiClock /> Company Working Hours</h3>
        <div className="hr-workhours-info">
          <div className="hr-workhours-item">
            <span className="hr-wh-label">Hours per Day</span>
            <span className="hr-wh-value">{settings.workingHoursPerDay}h</span>
          </div>
          <div className="hr-workhours-item">
            <span className="hr-wh-label">Half-Day Threshold</span>
            <span className="hr-wh-value">{settings.halfDayThresholdHours}h</span>
          </div>
          <div className="hr-workhours-item">
            <span className="hr-wh-label">Working Days</span>
            <span className="hr-wh-value">{settings.workingDays.join(', ')}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default HrOverview;
