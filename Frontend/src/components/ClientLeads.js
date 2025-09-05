import React from 'react';

function ClientLeads() {
  return (
    <>
      <h1>Client Leads</h1>
      <div className="dashboard-card">
        <h3>Client Lead Management</h3>
        <p>Manage and track all your client leads in one centralized location.</p>
        <p>View lead status, contact information, and conversion progress.</p>
        <ul>
          <li>New leads requiring follow-up</li>
          <li>Qualified prospects</li>
          <li>Active negotiations</li>
          <li>Converted clients</li>
        </ul>
      </div>
      
      <div className="dashboard-grid">
        <div className="dashboard-card">
          <h3>Lead Status Overview</h3>
          <p><strong>New Leads:</strong> 23</p>
          <p><strong>In Progress:</strong> 15</p>
          <p><strong>Qualified:</strong> 8</p>
          <p><strong>Converted:</strong> 12</p>
        </div>
        
        <div className="dashboard-card">
          <h3>Recent Client Activity</h3>
          <div style={{ marginBottom: '0.5rem' }}>
            <p>John Smith - Initial contact made</p>
            <small style={{ color: '#666' }}>2 hours ago</small>
          </div>
          <div style={{ marginBottom: '0.5rem' }}>
            <p>Sarah Johnson - Proposal sent</p>
            <small style={{ color: '#666' }}>5 hours ago</small>
          </div>
          <div style={{ marginBottom: '0.5rem' }}>
            <p>Mike Davis - Meeting scheduled</p>
            <small style={{ color: '#666' }}>1 day ago</small>
          </div>
        </div>
      </div>
    </>
  );
}

export default ClientLeads;
