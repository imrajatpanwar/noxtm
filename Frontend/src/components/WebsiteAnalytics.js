import React from 'react';

function WebsiteAnalytics() {
  return (
    <div className="dashboard-card">
      <h2>Website Analytics</h2>
      <p>Track website performance, visitor analytics, and user behavior insights.</p>
      
      <div className="dashboard-grid">
        <div className="dashboard-card">
          <h3>Traffic Overview</h3>
          <p>Website visitors, page views, sessions, and traffic source analysis.</p>
        </div>
        
        <div className="dashboard-card">
          <h3>User Behavior</h3>
          <p>User journey, bounce rate, time on site, and engagement metrics.</p>
        </div>
        
        <div className="dashboard-card">
          <h3>Conversion Tracking</h3>
          <p>Goal completions, conversion rates, and funnel analysis.</p>
        </div>
        
        <div className="dashboard-card">
          <h3>Performance Metrics</h3>
          <p>Page load times, core web vitals, and website performance data.</p>
        </div>
      </div>
    </div>
  );
}

export default WebsiteAnalytics;
