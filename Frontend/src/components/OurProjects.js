import React from 'react';

function OurProjects() {
  return (
    <>
      <h1>Our Projects</h1>
      <div className="dashboard-card">
        <h3>Project Portfolio</h3>
        <p>View and manage all active and completed projects.</p>
        <p>Track project progress, deadlines, and team collaboration.</p>
        <ul>
          <li>Active projects</li>
          <li>Project timelines</li>
          <li>Team assignments</li>
          <li>Client deliverables</li>
        </ul>
      </div>
      
      <div className="dashboard-grid">
        <div className="dashboard-card">
          <h3>Project Statistics</h3>
          <p><strong>Total Projects:</strong> 24</p>
          <p><strong>Active Projects:</strong> 8</p>
          <p><strong>Completed:</strong> 16</p>
          <p><strong>On Schedule:</strong> 6/8</p>
        </div>
        
        <div className="dashboard-card">
          <h3>Active Projects</h3>
          <div style={{ marginBottom: '0.5rem' }}>
            <p><strong>E-commerce Website:</strong> 75% complete</p>
            <small style={{ color: '#666' }}>Due: Dec 15, 2024</small>
          </div>
          <div style={{ marginBottom: '0.5rem' }}>
            <p><strong>Brand Identity Design:</strong> 90% complete</p>
            <small style={{ color: '#666' }}>Due: Dec 8, 2024</small>
          </div>
          <div style={{ marginBottom: '0.5rem' }}>
            <p><strong>Mobile App Development:</strong> 45% complete</p>
            <small style={{ color: '#666' }}>Due: Jan 20, 2025</small>
          </div>
        </div>
        
        <div className="dashboard-card">
          <h3>Recent Completions</h3>
          <div style={{ marginBottom: '0.5rem' }}>
            <p><strong>Marketing Campaign:</strong> Delivered</p>
            <small style={{ color: '#666' }}>Completed 3 days ago</small>
          </div>
          <div style={{ marginBottom: '0.5rem' }}>
            <p><strong>Website Redesign:</strong> Delivered</p>
            <small style={{ color: '#666' }}>Completed 1 week ago</small>
          </div>
          <div style={{ marginBottom: '0.5rem' }}>
            <p><strong>Logo Design:</strong> Delivered</p>
            <small style={{ color: '#666' }}>Completed 2 weeks ago</small>
          </div>
        </div>
      </div>
    </>
  );
}

export default OurProjects;
