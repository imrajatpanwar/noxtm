import React from 'react';

function LetterTemplates() {
  return (
    <div className="dashboard-card">
      <h2>Letter Templates</h2>
      <p>Create and manage HR letter templates for various purposes.</p>
      
      <div className="dashboard-grid">
        <div className="dashboard-card">
          <h3>Offer Letters</h3>
          <p>Job offer letter templates and employment contract templates.</p>
        </div>
        
        <div className="dashboard-card">
          <h3>Employment Letters</h3>
          <p>Employment verification, reference, and recommendation letters.</p>
        </div>
        
        <div className="dashboard-card">
          <h3>Disciplinary Letters</h3>
          <p>Warning letters, disciplinary actions, and performance improvement plans.</p>
        </div>
        
        <div className="dashboard-card">
          <h3>Termination Letters</h3>
          <p>Resignation acceptance, termination, and exit interview templates.</p>
        </div>
      </div>
    </div>
  );
}

export default LetterTemplates;
