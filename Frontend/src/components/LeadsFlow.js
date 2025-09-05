import React from 'react';

function LeadsFlow() {
  return (
    <>
      <h1>Leads Flow</h1>
      <div className="dashboard-card">
        <h3>Lead Generation Analytics</h3>
        <p>Monitor and analyze your lead generation performance across all channels.</p>
        <p>Track conversion rates, source effectiveness, and lead quality metrics.</p>
        <ul>
          <li>Website traffic conversion</li>
          <li>Social media leads</li>
          <li>Email campaign responses</li>
          <li>Referral tracking</li>
        </ul>
      </div>
      
      <div className="dashboard-grid">
        <div className="dashboard-card">
          <h3>Lead Sources</h3>
          <p><strong>Website:</strong> 45%</p>
          <p><strong>Social Media:</strong> 30%</p>
          <p><strong>Email Campaigns:</strong> 15%</p>
          <p><strong>Referrals:</strong> 10%</p>
        </div>
        
        <div className="dashboard-card">
          <h3>Conversion Metrics</h3>
          <p><strong>Total Leads:</strong> 1,234</p>
          <p><strong>Qualified Leads:</strong> 567</p>
          <p><strong>Conversion Rate:</strong> 46%</p>
          <p><strong>Average Lead Score:</strong> 8.2/10</p>
        </div>
      </div>
    </>
  );
}

export default LeadsFlow;
