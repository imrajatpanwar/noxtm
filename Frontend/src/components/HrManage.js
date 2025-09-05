import React from 'react';

function HrManage() {
  return (
    <div className="dashboard-card">
      <h2>HR Management</h2>
      <p>Core HR management tools and administrative functions.</p>
      
      <div className="dashboard-grid">
        <div className="dashboard-card">
          <h3>Employee Records</h3>
          <p>Manage employee personal information, documents, and files.</p>
        </div>
        
        <div className="dashboard-card">
          <h3>Performance Reviews</h3>
          <p>Conduct and track employee performance evaluations and reviews.</p>
        </div>
        
        <div className="dashboard-card">
          <h3>Training & Development</h3>
          <p>Manage employee training programs and skill development initiatives.</p>
        </div>
        
        <div className="dashboard-card">
          <h3>Compliance Tracking</h3>
          <p>Track HR compliance requirements and regulatory obligations.</p>
        </div>
      </div>
    </div>
  );
}

export default HrManage;
