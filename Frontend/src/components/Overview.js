import React from 'react';
import OverviewAreaChart from './OverviewAreaChart';
import LeadsRadarChart from './LeadsRadarChart';
import './Overview.css';

function Overview({ user, dashboardData, error }) {
  return (
    <div className="overview-wrapper">
      {error && (
        <div className="alert alert-error">
          {error}
        </div>
      )}

      <div className="overview-charts-row">
        <div className="overview-chart-area">
          <OverviewAreaChart />
        </div>
        <div className="overview-chart-radar">
          <LeadsRadarChart />
        </div>
      </div>
    </div>
  );
}

export default Overview;
