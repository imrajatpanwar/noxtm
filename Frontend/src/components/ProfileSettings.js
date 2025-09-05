import React from 'react';

function ProfileSettings() {
  return (
    <div className="dashboard-card">
      <h2>Profile Settings</h2>
      <p>Manage your personal profile information and account preferences.</p>
      
      <div className="dashboard-grid">
        <div className="dashboard-card">
          <h3>Personal Information</h3>
          <p>Update your name, email, phone number, and contact details.</p>
        </div>
        
        <div className="dashboard-card">
          <h3>Account Security</h3>
          <p>Change password, enable two-factor authentication, and security settings.</p>
        </div>
        
        <div className="dashboard-card">
          <h3>Preferences</h3>
          <p>Configure notifications, language, timezone, and display preferences.</p>
        </div>
        
        <div className="dashboard-card">
          <h3>Privacy Settings</h3>
          <p>Manage data privacy, visibility settings, and account permissions.</p>
        </div>
      </div>
    </div>
  );
}

export default ProfileSettings;
