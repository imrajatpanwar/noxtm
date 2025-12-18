import React, { useState, useEffect } from 'react';
import { FiX, FiMail, FiLock, FiCheckCircle } from 'react-icons/fi';
import api from '../config/api';
import './CreateEmailModal.css';

function CreateEmailModal({ isOpen, onClose, onSuccess }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [passwordStrength, setPasswordStrength] = useState('');
  const [verifiedDomains, setVerifiedDomains] = useState([]);
  const [selectedDomain, setSelectedDomain] = useState('');
  const [loadingDomains, setLoadingDomains] = useState(true);

  // Fetch verified domains when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchVerifiedDomains();
    }
  }, [isOpen]);

  const fetchVerifiedDomains = async () => {
    try {
      setLoadingDomains(true);
      const response = await api.get('/email-accounts/by-verified-domain');

      if (response.data.success && response.data.verifiedDomains) {
        const domains = response.data.verifiedDomains;
        setVerifiedDomains(domains);

        // Auto-select first domain or default to noxtm.com
        if (domains.length > 0) {
          setSelectedDomain(domains[0]);
        } else {
          setSelectedDomain('noxtm.com'); // Fallback
        }
      } else {
        setSelectedDomain('noxtm.com'); // Fallback
      }
    } catch (err) {
      console.error('Error fetching verified domains:', err);
      setSelectedDomain('noxtm.com'); // Fallback
    } finally {
      setLoadingDomains(false);
    }
  };

  // Validate username
  const isValidUsername = (user) => {
    const regex = /^[a-z0-9._-]+$/;
    return regex.test(user) && user.length >= 3 && user.length <= 30;
  };

  // Check password strength
  const checkPasswordStrength = (pass) => {
    if (pass.length < 6) return 'weak';
    if (pass.length < 10) return 'medium';
    if (pass.length >= 12 && /[A-Z]/.test(pass) && /[0-9]/.test(pass) && /[!@#$%^&*]/.test(pass)) {
      return 'strong';
    }
    return 'medium';
  };

  const handlePasswordChange = (e) => {
    const newPassword = e.target.value;
    setPassword(newPassword);
    setPasswordStrength(checkPasswordStrength(newPassword));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (!username) {
      setError('Username is required');
      return;
    }

    if (!isValidUsername(username)) {
      setError('Username must be 3-30 characters and contain only lowercase letters, numbers, dots, hyphens, or underscores');
      return;
    }

    if (!password || password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);

    try {
      const response = await api.post('/email-accounts/create-hosted', {
        username,
        password,
        domain: selectedDomain // Include selected domain
      });

      // Success!
      console.log('Account created:', response.data);

      // Store domain for auto-switch functionality (Phase 3A)
      localStorage.setItem('lastCreatedDomain', selectedDomain);

      // Reset form
      setUsername('');
      setPassword('');
      setConfirmPassword('');
      setPasswordStrength('');

      // Call success callback
      if (onSuccess) {
        onSuccess(response.data);
      }

      // Close modal
      onClose();

    } catch (err) {
      console.error('Error creating account:', err);
      setError(err.response?.data?.message || 'Failed to create email account. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const fullEmail = username ? `${username}@${selectedDomain}` : `@${selectedDomain}`;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content create-email-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Create New Email Account</h2>
          <button className="close-btn" onClick={onClose}>
            <FiX />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="create-email-form">
          {error && (
            <div className="error-message">
              {error}
            </div>
          )}

          {/* Domain Selector */}
          <div className="form-group">
            <label htmlFor="domain">
              <FiMail /> Domain
            </label>
            {loadingDomains ? (
              <p style={{ fontSize: '14px', color: '#666' }}>Loading verified domains...</p>
            ) : verifiedDomains.length > 0 ? (
              <select
                id="domain"
                value={selectedDomain}
                onChange={(e) => setSelectedDomain(e.target.value)}
                disabled={loading}
                style={{
                  width: '100%',
                  padding: '10px',
                  borderRadius: '5px',
                  border: '1px solid #ddd',
                  fontSize: '14px'
                }}
              >
                {verifiedDomains.map(domain => (
                  <option key={domain} value={domain}>
                    @{domain}
                  </option>
                ))}
              </select>
            ) : (
              <div style={{ padding: '10px', backgroundColor: '#fff3cd', borderRadius: '5px', marginBottom: '10px' }}>
                <p style={{ margin: 0, fontSize: '14px', color: '#856404' }}>
                  No verified domains found. Using default: @noxtm.com
                </p>
              </div>
            )}
          </div>

          {/* Username Field */}
          <div className="form-group">
            <label htmlFor="username">
              <FiMail /> Username
            </label>
            <div className="email-input-wrapper">
              <input
                type="text"
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value.toLowerCase())}
                placeholder="username"
                disabled={loading || loadingDomains}
                autoFocus
              />
              <span className="email-domain">@{selectedDomain}</span>
            </div>
            <div className="full-email-preview">{fullEmail}</div>
            <small className="help-text">
              Use lowercase letters, numbers, dots, hyphens, or underscores (3-30 characters)
            </small>
          </div>

          {/* Password Field */}
          <div className="form-group">
            <label htmlFor="password">
              <FiLock /> Password
            </label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={handlePasswordChange}
              placeholder="Enter password"
              disabled={loading}
            />
            {password && (
              <div className={`password-strength ${passwordStrength}`}>
                <div className="strength-bar">
                  <div className="strength-fill"></div>
                </div>
                <span className="strength-label">
                  {passwordStrength === 'weak' && 'Weak password'}
                  {passwordStrength === 'medium' && 'Medium strength'}
                  {passwordStrength === 'strong' && 'Strong password'}
                </span>
              </div>
            )}
            <small className="help-text">
              Minimum 6 characters. For better security, use 12+ characters with uppercase, numbers, and symbols.
            </small>
          </div>

          {/* Confirm Password Field */}
          <div className="form-group">
            <label htmlFor="confirmPassword">
              <FiCheckCircle /> Confirm Password
            </label>
            <input
              type="password"
              id="confirmPassword"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-enter password"
              disabled={loading}
            />
          </div>

          {/* Submit Button */}
          <div className="modal-actions">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading || !username || !password || !confirmPassword}
            >
              {loading ? 'Creating Account...' : 'Create Email Account'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default CreateEmailModal;
