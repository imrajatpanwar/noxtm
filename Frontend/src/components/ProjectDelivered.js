import React from 'react';

function ProjectDelivered() {
  return (
    <>
      <h1>Project Delivered</h1>
      <div className="dashboard-card">
        <h3>Delivered Projects Overview</h3>
        <p>Track and manage all successfully delivered projects to clients.</p>
        <p>View delivery timelines, client feedback, and project outcomes.</p>
        <ul>
          <li>Completed project documentation</li>
          <li>Client sign-off records</li>
          <li>Project delivery reports</li>
          <li>Post-delivery support tracking</li>
        </ul>
      </div>
      
      <div className="dashboard-grid">
        <div className="dashboard-card">
          <h3>Delivery Statistics</h3>
          <p><strong>Total Delivered:</strong> 127</p>
          <p><strong>On-Time Delivery:</strong> 95%</p>
          <p><strong>Client Satisfaction:</strong> 4.8/5</p>
          <p><strong>Average Delivery Time:</strong> 18 days</p>
        </div>
        
        <div className="dashboard-card">
          <h3>Recent Deliveries</h3>
          <div style={{ marginBottom: '0.5rem' }}>
            <p><strong>E-commerce Platform:</strong> TechCorp Ltd</p>
            <small style={{ color: '#666' }}>Delivered 2 days ago</small>
          </div>
          <div style={{ marginBottom: '0.5rem' }}>
            <p><strong>Brand Identity Package:</strong> StartUp Inc</p>
            <small style={{ color: '#666' }}>Delivered 5 days ago</small>
          </div>
          <div style={{ marginBottom: '0.5rem' }}>
            <p><strong>Mobile App Development:</strong> RetailPro</p>
            <small style={{ color: '#666' }}>Delivered 1 week ago</small>
          </div>
        </div>
        
        <div className="dashboard-card">
          <h3>Client Feedback</h3>
          <div style={{ marginBottom: '0.5rem' }}>
            <p><strong>5 Stars:</strong> "Exceptional quality and service"</p>
            <small style={{ color: '#666' }}>TechCorp Ltd - E-commerce Platform</small>
          </div>
          <div style={{ marginBottom: '0.5rem' }}>
            <p><strong>4 Stars:</strong> "Great work, minor revisions needed"</p>
            <small style={{ color: '#666' }}>StartUp Inc - Brand Identity</small>
          </div>
        </div>
      </div>
    </>
  );
}

export default ProjectDelivered;
