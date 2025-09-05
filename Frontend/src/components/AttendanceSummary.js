import React from 'react';

function AttendanceSummary() {
  return (
    <div className="dashboard-card">
      <h2>Attendance Summary</h2>
      <p>Track and analyze employee attendance patterns and time management.</p>
      
      <div className="dashboard-grid">
        <div className="dashboard-card">
          <h3>Daily Attendance</h3>
          <p>View daily attendance records and employee check-in/check-out times.</p>
        </div>
        
        <div className="dashboard-card">
          <h3>Monthly Reports</h3>
          <p>Generate monthly attendance reports and analytics for all employees.</p>
        </div>
        
        <div className="dashboard-card">
          <h3>Leave Tracking</h3>
          <p>Track sick leave, vacation days, and other types of employee absences.</p>
        </div>
        
        <div className="dashboard-card">
          <h3>Attendance Analytics</h3>
          <p>Analyze attendance trends, patterns, and identify attendance issues.</p>
        </div>
      </div>
    </div>
  );
}

export default AttendanceSummary;
