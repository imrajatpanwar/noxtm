import React, { useState, useEffect } from 'react';
import TaskManager from './TaskManager';
import { useModules } from '../contexts/ModuleContext';
import api from '../config/api';
import './Overview.css';

// Revenue Graph Component
const RevenueGraph = () => {
  const [selectedPeriod, setSelectedPeriod] = useState('Yearly');
  const [hoveredPoint, setHoveredPoint] = useState(null);
  const [hoveredLine, setHoveredLine] = useState(null);
  const [contactsData, setContactsData] = useState([]);
  const [tradeShowsData, setTradeShowsData] = useState([]);
  const { isModuleInstalled } = useModules();
  const exhibitOSActive = isModuleInstalled('ExhibitOS');

  // Fetch real data for contacts and trade shows
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch contacts count
        const clientsRes = await api.get('/clients');
        if (clientsRes.data.success) {
          const clients = clientsRes.data.clients || [];
          // Group by month for the current year
          const monthCounts = Array(12).fill(0);
          clients.forEach(client => {
            const createdDate = new Date(client.createdAt || client.created_at);
            const currentYear = new Date().getFullYear();
            if (createdDate.getFullYear() === currentYear) {
              monthCounts[createdDate.getMonth()]++;
            }
          });
          // Cumulative count
          const cumulative = monthCounts.reduce((acc, count, idx) => {
            acc.push((acc[idx - 1] || 0) + count);
            return acc;
          }, []);
          setContactsData(cumulative);
        }

        // Fetch trade shows count if ExhibitOS is active
        if (exhibitOSActive) {
          const tradeShowsRes = await api.get('/trade-shows');
          if (tradeShowsRes.data.success) {
            const shows = tradeShowsRes.data.tradeShows || [];
            const monthCounts = Array(12).fill(0);
            shows.forEach(show => {
              const startDate = new Date(show.startDate);
              const currentYear = new Date().getFullYear();
              if (startDate.getFullYear() === currentYear) {
                monthCounts[startDate.getMonth()]++;
              }
            });
            // Cumulative count
            const cumulative = monthCounts.reduce((acc, count, idx) => {
              acc.push((acc[idx - 1] || 0) + count);
              return acc;
            }, []);
            setTradeShowsData(cumulative);
          }
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      }
    };

    fetchData();
  }, [exhibitOSActive]);

  // Sample monthly revenue data
  const monthlyData = [
    { month: 'Jan', value: 12000 },
    { month: 'Feb', value: 18000 },
    { month: 'Mar', value: 25000 },
    { month: 'Apr', value: 22000 },
    { month: 'May', value: 28000 },
    { month: 'Jun', value: 32000 },
    { month: 'Jul', value: 35000 },
    { month: 'Aug', value: 39952 },
    { month: 'Sep', value: 45000 },
    { month: 'Oct', value: 52000 },
    { month: 'Nov', value: 58000 },
    { month: 'Dec', value: 72592 },
  ];

  const totalRevenue = monthlyData[monthlyData.length - 1].value;
  const maxValue = 90000;
  const maxContacts = Math.max(...contactsData, 100);
  const maxTradeShows = Math.max(...tradeShowsData, 50);

  // Generate path data for revenue
  const getPathData = () => {
    return monthlyData.map((d, i) => {
      const x = (i / (monthlyData.length - 1)) * 100;
      const y = 100 - (d.value / maxValue) * 100;
      return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
    }).join(' ');
  };

  // Generate path data for contacts
  const getContactsPath = () => {
    if (contactsData.length === 0) return '';
    return contactsData.map((count, i) => {
      const x = (i / (contactsData.length - 1)) * 100;
      const y = 100 - (count / maxContacts) * 80; // Scale to 80% of graph height
      return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
    }).join(' ');
  };

  // Generate path data for trade shows
  const getTradeShowsPath = () => {
    if (tradeShowsData.length === 0) return '';
    return tradeShowsData.map((count, i) => {
      const x = (i / (tradeShowsData.length - 1)) * 100;
      const y = 100 - (count / maxTradeShows) * 60; // Scale to 60% of graph height
      return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
    }).join(' ');
  };

  return (
    <div className="revenue-graph-card">
      <div className="revenue-header">
        <div className="revenue-info">
          <span className="revenue-label">Total Revenue</span>
          <span className="revenue-amount">${totalRevenue.toLocaleString()}</span>
        </div>
        <div className="graph-legend">
          <div className="legend-item">
            <span className="legend-dot" style={{ background: '#1a1a1a' }}></span>
            <span>Revenue</span>
          </div>
          <div className="legend-item">
            <span className="legend-dot" style={{ background: '#4285f4' }}></span>
            <span>Contacts ({contactsData[contactsData.length - 1] || 0})</span>
          </div>
          {exhibitOSActive && (
            <div className="legend-item">
              <span className="legend-dot" style={{ background: '#34a853' }}></span>
              <span>Trade Shows ({tradeShowsData[tradeShowsData.length - 1] || 0})</span>
            </div>
          )}
        </div>
        <div className="period-selector">
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
          >
            <option value="Monthly">Monthly</option>
            <option value="Quarterly">Quarterly</option>
            <option value="Yearly">Yearly</option>
          </select>
        </div>
      </div>

      <div className="graph-container">
        {/* Y-axis labels */}
        <div className="y-axis">
          <span>90k</span>
          <span>60k</span>
          <span>40k</span>
          <span>20k</span>
          <span>10k</span>
          <span>0</span>
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
                d={getPathData()}
                fill="none"
                stroke="#1a1a1a"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                vectorEffect="non-scaling-stroke"
              />

              {/* Contacts line - blue */}
              {contactsData.length > 0 && (
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
              )}

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
              {monthlyData.map((d, i) => (
                <div
                  key={i}
                  className="hover-zone"
                  style={{ left: `${(i / (monthlyData.length - 1)) * 100}%` }}
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
                  left: `${(hoveredPoint / (monthlyData.length - 1)) * 100}%`,
                  top: `${100 - (monthlyData[hoveredPoint].value / maxValue) * 100}%`
                }}
              >
                <div className="tooltip-content">
                  ${monthlyData[hoveredPoint].value.toLocaleString()}
                </div>
                <div className="tooltip-line" />
              </div>
            )}
          </div>

          {/* X-axis labels */}
          <div className="x-axis">
            {monthlyData.map((d, i) => (
              <span key={i}>{d.month}</span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

function Overview({ error }) {
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
    </div>
  );
}

export default Overview;
