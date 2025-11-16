import React from 'react';
import './Breadcrumb.css';

function Breadcrumb({ items, onNavigate }) {
  return (
    <nav className="breadcrumb">
      {items.map((item, index) => (
        <React.Fragment key={index}>
          {index > 0 && <span className="breadcrumb-separator">›</span>}
          {item.onClick || (onNavigate && item.section) ? (
            <button
              className="breadcrumb-item breadcrumb-link"
              onClick={() => item.onClick ? item.onClick() : onNavigate(item.section, item.data)}
            >
              {item.label}
            </button>
          ) : (
            <span className="breadcrumb-item breadcrumb-current">
              {item.label}
            </span>
          )}
        </React.Fragment>
      ))}
    </nav>
  );
}

export default Breadcrumb;
