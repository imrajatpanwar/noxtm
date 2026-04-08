import React from 'react';
import NoxtmAssistant from './NoxtmAssistant';
import './Overview.css';

function Overview({ user, dashboardData, error }) {
  return (
    <div className="overview-wrapper">
      {error && (
        <div className="alert alert-error">
          {error}
        </div>
      )}

      <div className="overview-grid">
        {/* Left: Dashboard content (stats, graphs, tasks) */}
        <div className="overview-left">
          {/* Existing overview content renders here — revenue graph, stats panel, etc. */}
        </div>

        {/* Right: Noxtm Assistant Chat Panel */}
        <div className="overview-right">
          <NoxtmAssistant />
        </div>
      </div>
    </div>
  );
}

export default Overview;
