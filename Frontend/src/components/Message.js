import React from 'react';

function Message() {
  return (
    <div className="dashboard-card">
      <h2>Team Messages</h2>
      <p>Internal team messaging and communication hub.</p>
      
      <div className="dashboard-grid">
        <div className="dashboard-card">
          <h3>Recent Messages</h3>
          <p>View and manage recent team messages and conversations.</p>
        </div>
        
        <div className="dashboard-card">
          <h3>Team Channels</h3>
          <p>Organize conversations by project or department channels.</p>
        </div>
        
        <div className="dashboard-card">
          <h3>Direct Messages</h3>
          <p>Private one-on-one conversations with team members.</p>
        </div>
        
        <div className="dashboard-card">
          <h3>Message Analytics</h3>
          <p>Track team communication patterns and engagement.</p>
        </div>
      </div>
    </div>
  );
}

export default Message;
