import React from 'react';

function TeamEmail() {
  return (
    <div className="dashboard-card">
      <h2>Team Email</h2>
      <p>Internal team email management and communication.</p>
      
      <div className="dashboard-grid">
        <div className="dashboard-card">
          <h3>Inbox</h3>
          <p>View and manage incoming team emails and notifications.</p>
        </div>
        
        <div className="dashboard-card">
          <h3>Compose Email</h3>
          <p>Send emails to team members and departments.</p>
        </div>
        
        <div className="dashboard-card">
          <h3>Email Templates</h3>
          <p>Create and manage email templates for common communications.</p>
        </div>
        
        <div className="dashboard-card">
          <h3>Distribution Lists</h3>
          <p>Manage team email groups and distribution lists.</p>
        </div>
      </div>
    </div>
  );
}

export default TeamEmail;
