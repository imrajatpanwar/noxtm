import React from 'react';

function Overview({ user, dashboardData, error }) {
  return (
    <>
      <h1>Welcome to your Dashboard, {user.username}!</h1>
      
      {error && (
        <div className="alert alert-error">
          {error}
        </div>
      )}
      
      <div className="dashboard-grid">
        <div className="dashboard-card">
          <h3>Profile Information</h3>
          <p><strong>Username:</strong> {user.username}</p>
          <p><strong>Email:</strong> {user.email}</p>
          <p><strong>User ID:</strong> {user.id}</p>
        </div>
        
        {dashboardData && (
          <>
            <div className="dashboard-card">
              <h3>Statistics</h3>
              <p><strong>Total Users:</strong> {dashboardData.data.totalUsers}</p>
              <p><strong>Status:</strong> Active</p>
            </div>
            
            <div className="dashboard-card">
              <h3>Recent Activity</h3>
              {dashboardData.data.recentActivity.map((activity, index) => (
                <div key={index} style={{ marginBottom: '0.5rem' }}>
                  <p>{activity.action}</p>
                  <small style={{ color: '#666' }}>
                    {new Date(activity.timestamp).toLocaleString()}
                  </small>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
      
      <div className="dashboard-card">
        <h3>Quick Actions</h3>
        <p>This is where you can add more functionality to your dashboard.</p>
        <p>Some ideas:</p>
        <ul>
          <li>User management</li>
          <li>Data analytics</li>
          <li>Settings configuration</li>
          <li>File uploads</li>
        </ul>
      </div>
    </>
  );
}

export default Overview;
