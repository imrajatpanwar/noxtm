import React from 'react';

function Incentives() {
  return (
    <div className="dashboard-card">
      <h2>Employee Incentives</h2>
      <p>Manage employee rewards, bonuses, and recognition programs.</p>
      
      <div className="dashboard-grid">
        <div className="dashboard-card">
          <h3>Performance Bonuses</h3>
          <p>Track and manage performance-based bonuses and rewards.</p>
        </div>
        
        <div className="dashboard-card">
          <h3>Recognition Programs</h3>
          <p>Employee of the month, achievements, and recognition initiatives.</p>
        </div>
        
        <div className="dashboard-card">
          <h3>Incentive Schemes</h3>
          <p>Create and manage various incentive programs and reward structures.</p>
        </div>
        
        <div className="dashboard-card">
          <h3>Benefits & Perks</h3>
          <p>Manage employee benefits, perks, and compensation packages.</p>
        </div>
      </div>
    </div>
  );
}

export default Incentives;
