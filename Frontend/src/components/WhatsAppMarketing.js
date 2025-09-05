import React from 'react';

function WhatsAppMarketing() {
  return (
    <>
      <h1>WhatsApp Marketing</h1>
      <div className="dashboard-card">
        <h3>WhatsApp Business Marketing</h3>
        <p>Leverage WhatsApp Business API for direct customer communication and marketing campaigns.</p>
        <p>Create automated messages, broadcast campaigns, and manage customer conversations.</p>
        <ul>
          <li>WhatsApp Business API integration</li>
          <li>Automated message sequences</li>
          <li>Broadcast campaign management</li>
          <li>Customer conversation tracking</li>
        </ul>
      </div>
      
      <div className="dashboard-grid">
        <div className="dashboard-card">
          <h3>Campaign Overview</h3>
          <p><strong>Active Campaigns:</strong> 5</p>
          <p><strong>Total Contacts:</strong> 8,450</p>
          <p><strong>Messages Sent:</strong> 25,600</p>
          <p><strong>Response Rate:</strong> 68.5%</p>
        </div>
        
        <div className="dashboard-card">
          <h3>Message Templates</h3>
          <div style={{ marginBottom: '0.5rem' }}>
            <p><strong>Welcome Message:</strong> Approved</p>
            <small style={{ color: '#666' }}>Used in onboarding campaigns</small>
          </div>
          <div style={{ marginBottom: '0.5rem' }}>
            <p><strong>Order Confirmation:</strong> Approved</p>
            <small style={{ color: '#666' }}>Transactional messages</small>
          </div>
          <div style={{ marginBottom: '0.5rem' }}>
            <p><strong>Promotional Offer:</strong> Pending Review</p>
            <small style={{ color: '#666' }}>Marketing campaigns</small>
          </div>
        </div>
        
        <div className="dashboard-card">
          <h3>Performance Metrics</h3>
          <p><strong>Message Delivery Rate:</strong> 98.2%</p>
          <p><strong>Read Rate:</strong> 85.7%</p>
          <p><strong>Click-through Rate:</strong> 12.4%</p>
          <p><strong>Conversion Rate:</strong> 8.9%</p>
        </div>
        
        <div className="dashboard-card">
          <h3>Recent Campaigns</h3>
          <div style={{ marginBottom: '0.5rem' }}>
            <p><strong>Product Launch Alert:</strong> 72% response rate</p>
            <small style={{ color: '#666' }}>Sent to 3,200 contacts</small>
          </div>
          <div style={{ marginBottom: '0.5rem' }}>
            <p><strong>Flash Sale Notification:</strong> 65% response rate</p>
            <small style={{ color: '#666' }}>Sent to 5,800 contacts</small>
          </div>
        </div>
        
        <div className="dashboard-card">
          <h3>Automation Features</h3>
          <p>Available automation tools:</p>
          <ul>
            <li>Welcome message sequences</li>
            <li>Order status updates</li>
            <li>Abandoned cart reminders</li>
            <li>Customer support chatbots</li>
          </ul>
        </div>
        
        <div className="dashboard-card">
          <h3>Contact Management</h3>
          <p><strong>Total Contacts:</strong> 8,450</p>
          <p><strong>Opted-in Users:</strong> 8,120</p>
          <p><strong>Active Conversations:</strong> 145</p>
          <p><strong>Blocked Users:</strong> 23</p>
        </div>
      </div>
    </>
  );
}

export default WhatsAppMarketing;
