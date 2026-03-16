import React from 'react';
import './Overview.css';

function Overview({ error }) {
  return (
    <div className="overview-wrapper">
      {error && (
        <div className="alert alert-error">
          {error}
        </div>
      )}
    </div>
  );
}

export default Overview;
