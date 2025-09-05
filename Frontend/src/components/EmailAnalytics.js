import React from 'react';

function EmailAnalytics() {
  return (
    <>
      <h1>Analytics & Reporting</h1>
      <div className="dashboard-card">
        <h3>Email Marketing Analytics</h3>
        <p>Comprehensive analytics and reporting for all your email marketing campaigns.</p>
        <p>Track performance metrics, subscriber behavior, and campaign ROI.</p>
        <ul>
          <li>Real-time campaign analytics</li>
          <li>Subscriber engagement tracking</li>
          <li>Revenue attribution reporting</li>
          <li>A/B testing results</li>
        </ul>
      </div>
      
      <div className="dashboard-grid">
        <div className="dashboard-card">
          <h3>Campaign Performance</h3>
          <p><strong>Total Campaigns Sent:</strong> 124</p>
          <p><strong>Total Emails Delivered:</strong> 485,230</p>
          <p><strong>Overall Open Rate:</strong> 26.4%</p>
          <p><strong>Overall Click Rate:</strong> 4.8%</p>
        </div>
        
        <div className="dashboard-card">
          <h3>Revenue Analytics</h3>
          <p><strong>Total Revenue:</strong> $127,500</p>
          <p><strong>Revenue per Email:</strong> $0.26</p>
          <p><strong>ROI:</strong> 485%</p>
          <p><strong>Average Order Value:</strong> $85.20</p>
        </div>
        
        <div className="dashboard-card">
          <h3>Subscriber Analytics</h3>
          <p><strong>Total Subscribers:</strong> 12,450</p>
          <p><strong>Growth Rate:</strong> +8.5% this month</p>
          <p><strong>Churn Rate:</strong> 2.1%</p>
          <p><strong>Engagement Score:</strong> 7.8/10</p>
        </div>
        
        <div className="dashboard-card">
          <h3>Top Performing Campaigns</h3>
          <div style={{ marginBottom: '0.5rem' }}>
            <p><strong>Black Friday Sale:</strong> 42.3% open rate</p>
            <small style={{ color: '#666' }}>Generated $15,200 revenue</small>
          </div>
          <div style={{ marginBottom: '0.5rem' }}>
            <p><strong>Product Launch:</strong> 38.7% open rate</p>
            <small style={{ color: '#666' }}>Generated $8,900 revenue</small>
          </div>
          <div style={{ marginBottom: '0.5rem' }}>
            <p><strong>Welcome Series:</strong> 35.1% open rate</p>
            <small style={{ color: '#666' }}>Generated $5,400 revenue</small>
          </div>
        </div>
        
        <div className="dashboard-card">
          <h3>Device & Client Analytics</h3>
          <p><strong>Mobile Opens:</strong> 68%</p>
          <p><strong>Desktop Opens:</strong> 28%</p>
          <p><strong>Webmail Opens:</strong> 4%</p>
          <p><strong>Top Client:</strong> Apple Mail (35%)</p>
        </div>
        
        <div className="dashboard-card">
          <h3>Geographic Analytics</h3>
          <div style={{ marginBottom: '0.5rem' }}>
            <p><strong>United States:</strong> 45%</p>
          </div>
          <div style={{ marginBottom: '0.5rem' }}>
            <p><strong>Canada:</strong> 22%</p>
          </div>
          <div style={{ marginBottom: '0.5rem' }}>
            <p><strong>United Kingdom:</strong> 18%</p>
          </div>
          <div style={{ marginBottom: '0.5rem' }}>
            <p><strong>Other:</strong> 15%</p>
          </div>
        </div>
      </div>
    </>
  );
}

export default EmailAnalytics;
