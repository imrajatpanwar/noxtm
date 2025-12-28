import React from 'react';
import './IconButton.css';

function IconButton({ icon: Icon, onClick, title, disabled = false, className = '' }) {
  const handleClick = (e) => {
    e.stopPropagation();
    if (!disabled && onClick) {
      onClick(e);
    }
  };

  return (
    <button
      className={`gmail-icon-button ${className} ${disabled ? 'disabled' : ''}`}
      onClick={handleClick}
      title={title}
      type="button"
      disabled={disabled}
    >
      <Icon className="icon" />
    </button>
  );
}

export default IconButton;
