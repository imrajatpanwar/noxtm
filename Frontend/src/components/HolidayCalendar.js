import React from 'react';

function HolidayCalendar() {
  return (
    <div className="dashboard-card">
      <h2>Holiday Calendar</h2>
      <p>Manage company holidays, events, and important dates.</p>
      
      <div className="dashboard-grid">
        <div className="dashboard-card">
          <h3>Company Holidays</h3>
          <p>View and manage official company holidays and observances.</p>
        </div>
        
        <div className="dashboard-card">
          <h3>Event Calendar</h3>
          <p>Track company events, meetings, and special occasions.</p>
        </div>
        
        <div className="dashboard-card">
          <h3>Leave Calendar</h3>
          <p>View employee leave schedules and vacation planning.</p>
        </div>
        
        <div className="dashboard-card">
          <h3>Calendar Management</h3>
          <p>Add, edit, and manage calendar events and holiday schedules.</p>
        </div>
      </div>
    </div>
  );
}

export default HolidayCalendar;
