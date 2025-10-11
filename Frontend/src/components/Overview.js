import React from 'react';

function Overview({ user, dashboardData, error }) {
  const safeUser = user || {};
  const recentActivity = Array.isArray(dashboardData?.data?.recentActivity)
    ? dashboardData.data.recentActivity
    : [];
  const totalUsers = dashboardData?.data?.totalUsers;
  const dashboardMessage = dashboardData?.message;

  return (
    <>
      <h1>
        Welcome to your Dashboard, {safeUser.username || 'there'}!
      </h1>

      {error && (
        <div className="alert alert-error">
          {error}
        </div>
      )}

      <div className="dashboard-grid">
        <div className="dashboard-card">
          <h3>Profile Information</h3>
          <p><strong>Username:</strong> {safeUser.username || 'N/A'}</p>
          <p><strong>Email:</strong> {safeUser.email || 'N/A'}</p>
          <p><strong>Role:</strong> {safeUser.role || 'N/A'}</p>
          <p><strong>User ID:</strong> {safeUser.id || 'N/A'}</p>
        </div>

        {(dashboardMessage || totalUsers !== undefined || recentActivity.length > 0) && (
          <div className="dashboard-card">
            <h3>Dashboard Summary</h3>

            {dashboardMessage && (
              <p style={{ marginBottom: '0.75rem' }}>{dashboardMessage}</p>
            )}

            {totalUsers !== undefined && (
              <p><strong>Total Users:</strong> {totalUsers}</p>
            )}

            {recentActivity.length > 0 ? (
              <div style={{ marginTop: '0.75rem' }}>
                <h4 style={{ marginBottom: '0.5rem' }}>Recent Activity</h4>
                {recentActivity.map((activity, index) => (
                  <div key={activity.id || index} style={{ marginBottom: '0.5rem' }}>
                    <p>{activity.action || 'Activity performed'}</p>
                    {activity.timestamp && (
                      <small style={{ color: '#666' }}>
                        {new Date(activity.timestamp).toLocaleString()}
                      </small>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ marginTop: '0.75rem', color: '#666' }}>
                No recent activity available yet.
              </p>
            )}
          </div>
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
