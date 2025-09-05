import React from 'react';

function EmployeeDetails() {
  return (
    <div className="dashboard-card">
      <h2>Employee Details</h2>
      <p>Comprehensive employee information and personal records management.</p>
      
      <div className="dashboard-grid">
        <div className="dashboard-card">
          <h3>Personal Information</h3>
          <p>Employee personal details, contact information, and emergency contacts.</p>
        </div>
        
        <div className="dashboard-card">
          <h3>Employment Details</h3>
          <p>Job title, department, salary, and employment status information.</p>
        </div>
        
        <div className="dashboard-card">
          <h3>Skills & Qualifications</h3>
          <p>Employee skills, certifications, and educational background.</p>
        </div>
        
        <div className="dashboard-card">
          <h3>Document Management</h3>
          <p>Store and manage employee documents, contracts, and certificates.</p>
        </div>
      </div>
    </div>
  );
}

export default EmployeeDetails;
