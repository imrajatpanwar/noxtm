import React from 'react';

function HrOverview() {
  return (
    <div className="dashboard-card">
      <h2>HR Overview</h2>
      <p>Comprehensive overview of human resources management and analytics.</p>
      
      <div className="dashboard-grid">
        <div className="dashboard-card">
          <h3>Employee Statistics</h3>
          <p>Total employees, new hires, departures, and workforce analytics.</p>
        </div>
        
        <div className="dashboard-card">
          <h3>Department Summary</h3>
          <p>Employee distribution across departments and teams.</p>
        </div>
        
        <div className="dashboard-card">
          <h3>Recruitment Pipeline</h3>
          <p>Current open positions, applications, and hiring progress.</p>
        </div>
        
        <div className="dashboard-card">
          <h3>HR Metrics</h3>
          <p>Key HR performance indicators and employee satisfaction metrics.</p>
        </div>
      </div>
    </div>
  );
}

export default HrOverview;
