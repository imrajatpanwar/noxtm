import React from 'react';

function CampaignSetup() {
  return (
    <>
      <h1>Campaign Setup</h1>
      <div className="dashboard-card">
        <h3>Email Campaign Setup</h3>
        <p>Create and configure new email marketing campaigns with our intuitive setup wizard.</p>
        <p>Define your target audience, set campaign objectives, and schedule delivery.</p>
        <ul>
          <li>Campaign configuration wizard</li>
          <li>Audience segmentation</li>
          <li>Send time optimization</li>
          <li>Campaign objective setting</li>
        </ul>
      </div>
      
      <div className="dashboard-grid">
        <div className="dashboard-card">
          <h3>Campaign Types</h3>
          <div style={{ marginBottom: '0.5rem' }}>
            <p><strong>Newsletter:</strong> Regular updates and news</p>
          </div>
          <div style={{ marginBottom: '0.5rem' }}>
            <p><strong>Promotional:</strong> Sales and special offers</p>
          </div>
          <div style={{ marginBottom: '0.5rem' }}>
            <p><strong>Welcome Series:</strong> New subscriber onboarding</p>
          </div>
          <div style={{ marginBottom: '0.5rem' }}>
            <p><strong>Re-engagement:</strong> Win back inactive subscribers</p>
          </div>
        </div>
        
        <div className="dashboard-card">
          <h3>Setup Progress</h3>
          <p><strong>Draft Campaigns:</strong> 3</p>
          <p><strong>Scheduled Campaigns:</strong> 2</p>
          <p><strong>Templates Available:</strong> 15</p>
          <p><strong>Audience Segments:</strong> 8</p>
        </div>
        
        <div className="dashboard-card">
          <h3>Campaign Settings</h3>
          <p>Configure campaign parameters:</p>
          <ul>
            <li>Subject line optimization</li>
            <li>Sender name and email</li>
            <li>Reply-to settings</li>
            <li>Tracking preferences</li>
          </ul>
        </div>
        
        <div className="dashboard-card">
          <h3>Audience Targeting</h3>
          <p>Target the right audience:</p>
          <ul>
            <li>Demographic segmentation</li>
            <li>Behavioral targeting</li>
            <li>Geographic filtering</li>
            <li>Custom audience creation</li>
          </ul>
        </div>
      </div>
    </>
  );
}

export default CampaignSetup;
