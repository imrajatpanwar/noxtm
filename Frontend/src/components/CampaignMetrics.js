import React from 'react';

function CampaignMetrics() {
  return (
    <>
      <h1>Campaign Metrics</h1>
      <div className="dashboard-card">
        <h3>Marketing Campaign Performance</h3>
        <p>Comprehensive analytics for all your marketing campaigns.</p>
        <p>Track ROI, engagement rates, and campaign effectiveness.</p>
        <ul>
          <li>Click-through rates</li>
          <li>Conversion metrics</li>
          <li>Cost per acquisition</li>
          <li>Revenue attribution</li>
        </ul>
      </div>
      
      <div className="dashboard-grid">
        <div className="dashboard-card">
          <h3>Campaign Performance</h3>
          <p><strong>Active Campaigns:</strong> 8</p>
          <p><strong>Total Impressions:</strong> 125,430</p>
          <p><strong>Click-through Rate:</strong> 3.2%</p>
          <p><strong>Cost per Click:</strong> $2.45</p>
        </div>
        
        <div className="dashboard-card">
          <h3>ROI Analysis</h3>
          <p><strong>Total Spend:</strong> $12,500</p>
          <p><strong>Revenue Generated:</strong> $45,200</p>
          <p><strong>Return on Investment:</strong> 261%</p>
          <p><strong>Cost per Acquisition:</strong> $85</p>
        </div>
        
        <div className="dashboard-card">
          <h3>Top Performing Campaigns</h3>
          <div style={{ marginBottom: '0.5rem' }}>
            <p><strong>Summer Sale 2024:</strong> 4.8% CTR</p>
          </div>
          <div style={{ marginBottom: '0.5rem' }}>
            <p><strong>Brand Awareness:</strong> 3.9% CTR</p>
          </div>
          <div style={{ marginBottom: '0.5rem' }}>
            <p><strong>Product Launch:</strong> 3.2% CTR</p>
          </div>
        </div>
      </div>
    </>
  );
}

export default CampaignMetrics;
