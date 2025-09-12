import React from 'react';

function ProfileSettings({ user, onLogout }) {
  return (
    <div className="dashboard-card">
      <h2>Profile Settings</h2>
      <p>Manage your personal profile information and account preferences.</p>
      
      {/* User Preview Section */}
      <div className="dashboard-card" style={{ marginBottom: '2rem', backgroundColor: '#f8fafc', border: '2px solid #e2e8f0' }}>
        <h3 style={{ color: '#1e40af', marginBottom: '1rem' }}>👤 User Preview</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
          <div>
            <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.9rem', color: '#6b7280', fontWeight: '500' }}>Username:</p>
            <p style={{ margin: '0 0 1rem 0', fontSize: '1.1rem', color: '#1f2937', fontWeight: '600' }}>
              {user?.username || 'Not specified'}
            </p>
          </div>
          <div>
            <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.9rem', color: '#6b7280', fontWeight: '500' }}>Email:</p>
            <p style={{ margin: '0 0 1rem 0', fontSize: '1.1rem', color: '#1f2937', fontWeight: '600' }}>
              {user?.email || 'Not specified'}
            </p>
          </div>
          <div>
            <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.9rem', color: '#6b7280', fontWeight: '500' }}>Role:</p>
            <p style={{ 
              margin: '0 0 1rem 0', 
              fontSize: '1.1rem', 
              color: user?.role === 'User' ? '#dc2626' : '#059669', 
              fontWeight: '600',
              padding: '0.25rem 0.75rem',
              backgroundColor: user?.role === 'User' ? '#fef2f2' : '#f0fdf4',
              borderRadius: '0.5rem',
              display: 'inline-block'
            }}>
              {user?.role || 'Not specified'}
            </p>
          </div>
          <div>
            <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.9rem', color: '#6b7280', fontWeight: '500' }}>Status:</p>
            <p style={{ 
              margin: '0 0 1rem 0', 
              fontSize: '1.1rem', 
              color: '#059669', 
              fontWeight: '600',
              padding: '0.25rem 0.75rem',
              backgroundColor: '#f0fdf4',
              borderRadius: '0.5rem',
              display: 'inline-block'
            }}>
              {user?.status || 'Active'}
            </p>
          </div>
        </div>
        {user?.role === 'User' && (
          <div style={{ 
            marginTop: '1rem', 
            padding: '1rem', 
            backgroundColor: '#fef3c7', 
            border: '1px solid #f59e0b', 
            borderRadius: '0.5rem' 
          }}>
            <p style={{ margin: '0', fontSize: '0.9rem', color: '#92400e' }}>
              ⚠️ <strong>Restricted Access:</strong> Your account has limited permissions. Contact an administrator to request additional access.
            </p>
          </div>
        )}
      </div>

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
      
      {/* Account Actions Section */}
      <div className="dashboard-card" style={{ marginTop: '2rem', border: '1px solid #e5e7eb' }}>
        <h3>Account Actions</h3>
        <p>Manage your account session and security.</p>
        
        <div style={{ marginTop: '1rem', display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <div style={{ flex: 1 }}>
            <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.9rem', color: '#6b7280' }}>
              Currently logged in as: <strong>{user?.username || user?.email || 'User'}</strong>
            </p>
            <p style={{ margin: '0', fontSize: '0.8rem', color: '#9ca3af' }}>
              Role: {user?.role || 'Not specified'}
            </p>
          </div>
          
          <button 
            onClick={onLogout}
            style={{
              padding: '0.75rem 1.5rem',
              backgroundColor: '#ef4444',
              color: 'white',
              border: 'none',
              borderRadius: '0.5rem',
              cursor: 'pointer',
              fontSize: '0.9rem',
              fontWeight: '500',
              transition: 'background-color 0.2s',
              minWidth: '120px'
            }}
            onMouseOver={(e) => e.target.style.backgroundColor = '#dc2626'}
            onMouseOut={(e) => e.target.style.backgroundColor = '#ef4444'}
          >
            Logout
          </button>
        </div>
      </div>
    </div>
  );
}

export default ProfileSettings;
