import React from 'react';

function Services() {
  return (
    <>
      <h1>Services</h1>
      <div className="dashboard-card">
        <h3>Our Service Offerings</h3>
        <p>Comprehensive overview of all services provided by Noxtm.</p>
        <p>Manage service packages, pricing, and client requirements.</p>
        <ul>
          <li>Service catalog management</li>
          <li>Pricing and package configuration</li>
          <li>Service delivery tracking</li>
          <li>Client service preferences</li>
        </ul>
      </div>
      
      <div className="dashboard-grid">
        <div className="dashboard-card">
          <h3>Design Services</h3>
          <p><strong>Brand Identity & Design</strong></p>
          <p>Starting from $10</p>
          <ul>
            <li>Logo design and branding</li>
            <li>Visual identity systems</li>
            <li>Print and digital materials</li>
            <li>Brand guidelines</li>
          </ul>
        </div>
        
        <div className="dashboard-card">
          <h3>Development Services</h3>
          <p><strong>Web Development</strong></p>
          <p>Starting from $100</p>
          <ul>
            <li>Custom website development</li>
            <li>E-commerce solutions</li>
            <li>Mobile-responsive design</li>
            <li>CMS integration</li>
          </ul>
        </div>
        
        <div className="dashboard-card">
          <h3>Marketing Services</h3>
          <p><strong>Digital Marketing</strong></p>
          <p>Starting from $150</p>
          <ul>
            <li>Social media marketing</li>
            <li>Email marketing campaigns</li>
            <li>SEO optimization</li>
            <li>Content marketing</li>
          </ul>
        </div>
        
        <div className="dashboard-card">
          <h3>Consulting Services</h3>
          <p><strong>Business Consulting</strong></p>
          <p>Custom pricing</p>
          <ul>
            <li>Strategy development</li>
            <li>Process optimization</li>
            <li>Technology consulting</li>
            <li>Growth planning</li>
          </ul>
        </div>
        
        <div className="dashboard-card">
          <h3>Service Statistics</h3>
          <p><strong>Active Services:</strong> 12</p>
          <p><strong>Most Popular:</strong> Web Development</p>
          <p><strong>Highest Revenue:</strong> Digital Marketing</p>
          <p><strong>Client Satisfaction:</strong> 4.9/5</p>
        </div>
      </div>
    </>
  );
}

export default Services;
