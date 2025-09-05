import React from 'react';

function EmailMarketing() {
  return (
    <>
      <h1>Email Marketing</h1>
      <div className="dashboard-card">
        <h3>Email Marketing Dashboard</h3>
        <p>Manage and track all your email marketing campaigns from one central location.</p>
        <p>Create, send, and analyze email campaigns to maximize engagement and conversions.</p>
        <ul>
          <li>Campaign creation and management</li>
          <li>Subscriber list management</li>
          <li>Performance analytics</li>
          <li>A/B testing capabilities</li>
        </ul>
      </div>
      
      <div className="dashboard-grid">
        <div className="dashboard-card">
          <h3>Campaign Overview</h3>
          <p><strong>Active Campaigns:</strong> 8</p>
          <p><strong>Total Subscribers:</strong> 12,450</p>
          <p><strong>Monthly Sends:</strong> 45,200</p>
          <p><strong>Average Open Rate:</strong> 24.8%</p>
        </div>
        
        <div className="dashboard-card">
          <h3>Recent Campaigns</h3>
          <div style={{ marginBottom: '0.5rem' }}>
            <p><strong>Summer Sale Newsletter:</strong> 28.5% open rate</p>
            <small style={{ color: '#666' }}>Sent 2 days ago to 5,200 subscribers</small>
          </div>
          <div style={{ marginBottom: '0.5rem' }}>
            <p><strong>Product Launch Announcement:</strong> 31.2% open rate</p>
            <small style={{ color: '#666' }}>Sent 1 week ago to 8,100 subscribers</small>
          </div>
          <div style={{ marginBottom: '0.5rem' }}>
            <p><strong>Monthly Newsletter:</strong> 22.1% open rate</p>
            <small style={{ color: '#666' }}>Sent 2 weeks ago to 12,450 subscribers</small>
          </div>
        </div>
        
        <div className="dashboard-card">
          <h3>Performance Metrics</h3>
          <p><strong>Click-through Rate:</strong> 4.2%</p>
          <p><strong>Conversion Rate:</strong> 2.8%</p>
          <p><strong>Unsubscribe Rate:</strong> 0.5%</p>
          <p><strong>Revenue Generated:</strong> $24,500</p>
        </div>
        
        <div className="dashboard-card">
          <h3>Quick Actions</h3>
          <p>Manage your email marketing workflow:</p>
          <ul>
            <li>Create new campaign</li>
            <li>Design email template</li>
            <li>Manage subscriber lists</li>
            <li>View detailed analytics</li>
          </ul>
        </div>
      </div>
    </>
  );
}

export default EmailMarketing;
