import React from 'react';

function CompanyPolicies() {
  return (
    <div className="dashboard-card">
      <h2>Company Policies</h2>
      <p>Manage and maintain company policies, procedures, and guidelines.</p>
      
      <div className="dashboard-grid">
        <div className="dashboard-card">
          <h3>HR Policies</h3>
          <p>Employee conduct, attendance, leave policies, and workplace guidelines.</p>
        </div>
        
        <div className="dashboard-card">
          <h3>Security Policies</h3>
          <p>Data security, access control, and information protection policies.</p>
        </div>
        
        <div className="dashboard-card">
          <h3>Operational Policies</h3>
          <p>Business operations, quality standards, and process guidelines.</p>
        </div>
        
        <div className="dashboard-card">
          <h3>Compliance Policies</h3>
          <p>Regulatory compliance, legal requirements, and industry standards.</p>
        </div>
      </div>
    </div>
  );
}

export default CompanyPolicies;
