import React from 'react';

function ReferralClient() {
  return (
    <>
      <h1>Referral Client</h1>
      <div className="dashboard-card">
        <h3>Client Referral Program</h3>
        <p>Manage and track your client referral program to grow your business through existing clients.</p>
        <p>Monitor referral performance, reward tracking, and client advocacy metrics.</p>
        <ul>
          <li>Referral program management</li>
          <li>Reward and commission tracking</li>
          <li>Client advocacy metrics</li>
          <li>Referral link generation</li>
        </ul>
      </div>
      
      <div className="dashboard-grid">
        <div className="dashboard-card">
          <h3>Referral Overview</h3>
          <p><strong>Total Referrals:</strong> 67</p>
          <p><strong>Successful Conversions:</strong> 34</p>
          <p><strong>Conversion Rate:</strong> 50.7%</p>
          <p><strong>Revenue Generated:</strong> $85,400</p>
        </div>
        
        <div className="dashboard-card">
          <h3>Top Referrers</h3>
          <div style={{ marginBottom: '0.5rem' }}>
            <p><strong>TechCorp Solutions:</strong> 8 referrals</p>
            <small style={{ color: '#666' }}>6 conversions, $24,500 revenue</small>
          </div>
          <div style={{ marginBottom: '0.5rem' }}>
            <p><strong>Digital Marketing Pro:</strong> 6 referrals</p>
            <small style={{ color: '#666' }}>4 conversions, $18,200 revenue</small>
          </div>
          <div style={{ marginBottom: '0.5rem' }}>
            <p><strong>StartUp Innovations:</strong> 5 referrals</p>
            <small style={{ color: '#666' }}>3 conversions, $12,800 revenue</small>
          </div>
        </div>
        
        <div className="dashboard-card">
          <h3>Referral Rewards</h3>
          <p><strong>Total Rewards Paid:</strong> $12,750</p>
          <p><strong>Pending Rewards:</strong> $3,200</p>
          <p><strong>Average Reward:</strong> $375</p>
          <p><strong>Reward Type:</strong> Cash & Credits</p>
        </div>
        
        <div className="dashboard-card">
          <h3>Recent Referrals</h3>
          <div style={{ marginBottom: '0.5rem' }}>
            <p><strong>E-commerce Development:</strong> In Progress</p>
            <small style={{ color: '#666' }}>Referred by TechCorp Solutions</small>
          </div>
          <div style={{ marginBottom: '0.5rem' }}>
            <p><strong>Brand Identity Package:</strong> Converted</p>
            <small style={{ color: '#666' }}>Referred by Digital Marketing Pro</small>
          </div>
          <div style={{ marginBottom: '0.5rem' }}>
            <p><strong>Mobile App Development:</strong> Proposal Sent</p>
            <small style={{ color: '#666' }}>Referred by StartUp Innovations</small>
          </div>
        </div>
        
        <div className="dashboard-card">
          <h3>Program Settings</h3>
          <p>Referral program configuration:</p>
          <ul>
            <li>Commission rate: 15%</li>
            <li>Minimum payout: $100</li>
            <li>Tracking period: 90 days</li>
            <li>Reward type: Cash + Credits</li>
          </ul>
        </div>
        
        <div className="dashboard-card">
          <h3>Program Performance</h3>
          <p><strong>Program ROI:</strong> 385%</p>
          <p><strong>Client Satisfaction:</strong> 4.9/5</p>
          <p><strong>Referral Quality Score:</strong> 8.7/10</p>
          <p><strong>Repeat Referrals:</strong> 68%</p>
        </div>
      </div>
    </>
  );
}

export default ReferralClient;
