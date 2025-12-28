import React from 'react';
import './Tab.css';

function Tab({ icon: Icon, label, active = false, onClick, count }) {
  return (
    <button
      className={`gmail-tab ${active ? 'active' : ''}`}
      onClick={onClick}
      type="button"
    >
      <div className="tab-content">
        {Icon && <Icon className="tab-icon" />}
        <span className="tab-label">{label}</span>
        {count > 0 && <span className="tab-count">({count})</span>}
      </div>
    </button>
  );
}

export default Tab;
