import React from 'react';
import { MdCheckBoxOutlineBlank, MdCheckBox, MdIndeterminateCheckBox } from 'react-icons/md';
import './Checkbox.css';

function Checkbox({ checked = false, indeterminate = false, onChange, disabled = false }) {
  const handleClick = (e) => {
    e.stopPropagation();
    if (!disabled && onChange) {
      onChange(!checked);
    }
  };

  return (
    <button
      className={`gmail-checkbox ${checked ? 'checked' : ''} ${disabled ? 'disabled' : ''}`}
      onClick={handleClick}
      type="button"
      aria-checked={indeterminate ? 'mixed' : checked}
      role="checkbox"
      disabled={disabled}
    >
      {indeterminate ? (
        <MdIndeterminateCheckBox className="checkbox-icon" />
      ) : checked ? (
        <MdCheckBox className="checkbox-icon" />
      ) : (
        <MdCheckBoxOutlineBlank className="checkbox-icon" />
      )}
    </button>
  );
}

export default Checkbox;
