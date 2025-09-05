import React from 'react';

function EmailTemplate() {
  return (
    <>
      <h1>Create Email Template</h1>
      <div className="dashboard-card">
        <h3>Email Template Designer</h3>
        <p>Design beautiful, responsive email templates with our drag-and-drop editor.</p>
        <p>Create professional templates that work across all email clients and devices.</p>
        <ul>
          <li>Drag-and-drop email builder</li>
          <li>Responsive design templates</li>
          <li>Custom HTML/CSS support</li>
          <li>Template library management</li>
        </ul>
      </div>
      
      <div className="dashboard-grid">
        <div className="dashboard-card">
          <h3>Template Library</h3>
          <p><strong>Total Templates:</strong> 25</p>
          <p><strong>Custom Templates:</strong> 8</p>
          <p><strong>Pre-built Templates:</strong> 17</p>
          <p><strong>Most Used:</strong> Newsletter Template</p>
        </div>
        
        <div className="dashboard-card">
          <h3>Template Categories</h3>
          <div style={{ marginBottom: '0.5rem' }}>
            <p><strong>Newsletter:</strong> 6 templates</p>
          </div>
          <div style={{ marginBottom: '0.5rem' }}>
            <p><strong>Promotional:</strong> 8 templates</p>
          </div>
          <div style={{ marginBottom: '0.5rem' }}>
            <p><strong>Welcome:</strong> 4 templates</p>
          </div>
          <div style={{ marginBottom: '0.5rem' }}>
            <p><strong>Event:</strong> 3 templates</p>
          </div>
          <div style={{ marginBottom: '0.5rem' }}>
            <p><strong>Transactional:</strong> 4 templates</p>
          </div>
        </div>
        
        <div className="dashboard-card">
          <h3>Design Elements</h3>
          <p>Available design components:</p>
          <ul>
            <li>Text blocks and headers</li>
            <li>Image and gallery blocks</li>
            <li>Button and CTA elements</li>
            <li>Social media links</li>
            <li>Footer and contact info</li>
          </ul>
        </div>
        
        <div className="dashboard-card">
          <h3>Template Performance</h3>
          <div style={{ marginBottom: '0.5rem' }}>
            <p><strong>Best Performing:</strong> Summer Sale Template</p>
            <small style={{ color: '#666' }}>35.2% open rate, 6.8% CTR</small>
          </div>
          <div style={{ marginBottom: '0.5rem' }}>
            <p><strong>Most Popular:</strong> Monthly Newsletter</p>
            <small style={{ color: '#666' }}>Used in 45 campaigns</small>
          </div>
        </div>
        
        <div className="dashboard-card">
          <h3>Recent Templates</h3>
          <div style={{ marginBottom: '0.5rem' }}>
            <p><strong>Holiday Promotion:</strong> Created 2 days ago</p>
          </div>
          <div style={{ marginBottom: '0.5rem' }}>
            <p><strong>Product Announcement:</strong> Created 1 week ago</p>
          </div>
          <div style={{ marginBottom: '0.5rem' }}>
            <p><strong>Customer Survey:</strong> Created 2 weeks ago</p>
          </div>
        </div>
      </div>
    </>
  );
}

export default EmailTemplate;
