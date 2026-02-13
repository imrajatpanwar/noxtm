import React, { useState, useEffect } from 'react';
import TaskManager from './TaskManager';
import { useModules } from '../contexts/ModuleContext';
import api from '../config/api';
import './Overview.css';

// User avatar component
const UserAvatar = ({ user, size = 28 }) => {
  if (!user) return null;

  const displayName = user.fullName || user.name || user.email?.split('@')[0] || 'User';
  const initials = displayName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '?';

  const colors = ['#667eea', '#764ba2', '#f093fb', '#f5576c', '#4facfe', '#00f2fe', '#43e97b', '#38f9d7'];
  const colorIndex = displayName.charCodeAt(0) % colors.length;
  const bgColor = colors[colorIndex];

  const profileImg = user.profileImage || user.avatar || user.profilePicture;

  return (
    <div
      className="active-team-avatar"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.4,
        background: profileImg ? 'transparent' : bgColor
      }}
      title={displayName}
    >
      {profileImg ? (
        <img src={profileImg} alt={displayName} />
      ) : (
        <span>{initials}</span>
      )}
    </div>
  );
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

function Overview({ error }) {
  const [companyUsers, setCompanyUsers] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [usersRes, tasksRes] = await Promise.all([
          api.get('/users/company-members'),
          api.get('/tasks')
        ]);
        
        const users = usersRes.data.members || usersRes.data || [];
        // /tasks returns { tasks: [...], pagination: {...} }
        const taskData = tasksRes.data.tasks || tasksRes.data || [];
        
        setCompanyUsers(Array.isArray(users) ? users : []);
        setTasks(Array.isArray(taskData) ? taskData : []);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching overview data:', err);
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Get active users (users who have tasks assigned)
  const activeUserIds = new Set();
  tasks.forEach(task => {
    task.assignees?.forEach(assignee => {
      activeUserIds.add(assignee._id || assignee);
    });
  });
  const activeUsers = companyUsers.filter(u => activeUserIds.has(u._id));
  
  // Show all users if no active users, or show active users
  const displayUsers = activeUsers.length > 0 ? activeUsers : companyUsers;

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

        {/* Right side - Active Team + Task Manager */}
        <div className="overview-right">
          {!loading && displayUsers.length > 0 && (
            <div className="active-team-section">
              <div className="active-team-header">
                <span className="active-team-label">{activeUsers.length > 0 ? 'Active Team' : 'Team Members'}</span>
                <span className="active-team-count">{displayUsers.length}</span>
              </div>
              <div className="active-team-avatars">
                {displayUsers.slice(0, 8).map(user => (
                  <UserAvatar key={user._id} user={user} size={32} />
                ))}
                {displayUsers.length > 8 && (
                  <div className="active-team-more">+{displayUsers.length - 8}</div>
                )}
              </div>
            </div>
          )}
          <TaskManager isWidget={true} />
        </div>
      </div>
    </div>
  );
}

export default Overview;
