import React from 'react';

function ConversionTracking() {
  return (
    <>
      <h1>Conversion Tracking</h1>
      <div className="dashboard-card">
        <h3>Conversion Analytics</h3>
        <p>Track and optimize your conversion funnel performance.</p>
        <p>Identify bottlenecks and opportunities for improvement.</p>
        <ul>
          <li>Funnel analysis</li>
          <li>Goal completion rates</li>
          <li>A/B testing results</li>
          <li>User behavior insights</li>
        </ul>
      </div>
      
      <div className="dashboard-grid">
        <div className="dashboard-card">
          <h3>Conversion Funnel</h3>
          <p><strong>Visitors:</strong> 10,245</p>
          <p><strong>Leads:</strong> 1,234 (12%)</p>
          <p><strong>Qualified Leads:</strong> 567 (46%)</p>
          <p><strong>Customers:</strong> 89 (16%)</p>
        </div>
        
        <div className="dashboard-card">
          <h3>Goal Completions</h3>
          <p><strong>Newsletter Signup:</strong> 8.5%</p>
          <p><strong>Free Trial:</strong> 3.2%</p>
          <p><strong>Purchase:</strong> 1.8%</p>
          <p><strong>Contact Form:</strong> 5.1%</p>
        </div>
        
        <div className="dashboard-card">
          <h3>A/B Testing Results</h3>
          <div style={{ marginBottom: '0.5rem' }}>
            <p><strong>Landing Page A:</strong> 3.2% conversion</p>
          </div>
          <div style={{ marginBottom: '0.5rem' }}>
            <p><strong>Landing Page B:</strong> 4.1% conversion</p>
          </div>
          <div style={{ marginBottom: '0.5rem' }}>
            <p><strong>Winner:</strong> Page B (+28% improvement)</p>
          </div>
        </div>
      </div>
    </>
  );
}

export default ConversionTracking;
