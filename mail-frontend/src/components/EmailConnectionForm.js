import React, { useState } from 'react';
import { FiMail, FiLock, FiAlertCircle } from 'react-icons/fi';
import api from '../config/api';
import './EmailConnectionForm.css';

function EmailConnectionForm({ onSuccess, onCancel }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await api.post('/email-accounts/connect', {
        email: email.trim(),
        password
      });

      if (response.data.success) {
        // Connection successful
        if (onSuccess) {
          onSuccess(response.data.account);
        }
      } else {
        setError(response.data.message || 'Failed to connect');
      }
    } catch (err) {
      console.error('Connection error:', err);
      const errorMessage = err.response?.data?.message || 'Failed to connect to email account';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="email-connection-form">
      <div className="form-header">
        <FiMail className="header-icon" />
        <h3>Connect to Your Email Account</h3>
        <p className="form-description">
          Enter the email address and password provided by your workspace administrator
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="email">
            <FiMail className="label-icon" />
            Email Address
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="your.email@company.com"
            required
            disabled={loading}
            autoComplete="email"
          />
        </div>

        <div className="form-group">
          <label htmlFor="password">
            <FiLock className="label-icon" />
            Password
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter your email password"
            required
            disabled={loading}
            autoComplete="current-password"
          />
        </div>

        {error && (
          <div className="error-message">
            <FiAlertCircle />
            {error}
          </div>
        )}

        <div className="form-actions">
          <button
            type="submit"
            className="btn-connect"
            disabled={loading}
          >
            {loading ? 'Connecting...' : 'Connect to Email'}
          </button>
          {onCancel && (
            <button
              type="button"
              className="btn-cancel"
              onClick={onCancel}
              disabled={loading}
            >
              Cancel
            </button>
          )}
        </div>
      </form>

      <div className="form-footer">
        <small>
          Don't have your email credentials? Contact your workspace administrator.
        </small>
      </div>
    </div>
  );
}

export default EmailConnectionForm;
