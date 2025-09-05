import React from 'react';

function Meeting() {
  return (
    <div className="dashboard-card">
      <h2>Team Meetings</h2>
      <p>Schedule and manage team meetings and video conferences.</p>
      
      <div className="dashboard-grid">
        <div className="dashboard-card">
          <h3>Upcoming Meetings</h3>
          <p>View scheduled meetings and upcoming team calls.</p>
        </div>
        
        <div className="dashboard-card">
          <h3>Schedule Meeting</h3>
          <p>Create new meetings and send invitations to team members.</p>
        </div>
        
        <div className="dashboard-card">
          <h3>Meeting Room</h3>
          <p>Join virtual meeting rooms and video conferences.</p>
        </div>
        
        <div className="dashboard-card">
          <h3>Meeting History</h3>
          <p>Access past meeting recordings and notes.</p>
        </div>
      </div>
    </div>
  );
}

export default Meeting;
