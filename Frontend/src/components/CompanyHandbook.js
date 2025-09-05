import React from 'react';

function CompanyHandbook() {
  return (
    <div className="dashboard-card">
      <h2>Company Handbook</h2>
      <p>Comprehensive employee handbook with company information and guidelines.</p>
      
      <div className="dashboard-grid">
        <div className="dashboard-card">
          <h3>Company Overview</h3>
          <p>Mission, vision, values, and organizational structure information.</p>
        </div>
        
        <div className="dashboard-card">
          <h3>Employee Guidelines</h3>
          <p>Work expectations, dress code, communication protocols, and behavior standards.</p>
        </div>
        
        <div className="dashboard-card">
          <h3>Benefits & Compensation</h3>
          <p>Employee benefits, compensation structure, and perks information.</p>
        </div>
        
        <div className="dashboard-card">
          <h3>Procedures & Processes</h3>
          <p>Standard operating procedures, workflows, and process documentation.</p>
        </div>
      </div>
    </div>
  );
}

export default CompanyHandbook;
