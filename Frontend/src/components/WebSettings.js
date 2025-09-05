import React from 'react';

function WebSettings() {
  return (
    <div className="dashboard-card">
      <h2>Web Settings</h2>
      <p>Configure website settings, domain management, and web configurations.</p>
      
      <div className="dashboard-grid">
        <div className="dashboard-card">
          <h3>Site Configuration</h3>
          <p>Manage website title, description, favicon, and basic site settings.</p>
        </div>
        
        <div className="dashboard-card">
          <h3>Domain Management</h3>
          <p>Configure custom domains, SSL certificates, and DNS settings.</p>
        </div>
        
        <div className="dashboard-card">
          <h3>SEO Settings</h3>
          <p>Optimize meta tags, structured data, and search engine visibility.</p>
        </div>
        
        <div className="dashboard-card">
          <h3>Performance Settings</h3>
          <p>Configure caching, compression, and website performance optimizations.</p>
        </div>
      </div>
    </div>
  );
}

export default WebSettings;
