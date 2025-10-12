import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../config/api';
import './Signup.css';

function Signup({ onSignup }) {
  const [step, setStep] = useState(1); // 1 = form, 2 = verification
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [verificationCode, setVerificationCode] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [touchedConfirm, setTouchedConfirm] = useState(false);
  const [passwordsMatch, setPasswordsMatch] = useState(true);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  // Trim leading/trailing whitespace for password fields on blur to avoid accidental mismatch
  const handleBlurTrim = (e) => {
    const { name, value } = e.target;
    if (name === 'password' || name === 'confirmPassword') {
      const trimmed = (value || '').trim();
      if (trimmed !== value) {
        setFormData((prev) => ({ ...prev, [name]: trimmed }));
      }
    }
  };

  // Live check for password match so UI feedback is immediate
  useEffect(() => {
    // Compare trimmed values to avoid false mismatches due to accidental spaces
    setPasswordsMatch((formData.password || '').trim() === (formData.confirmPassword || '').trim());
  }, [formData.password, formData.confirmPassword]);

  // Clear a stale 'Passwords do not match' message when the user fixes the mismatch
  useEffect(() => {
    if (passwordsMatch && message === 'Passwords do not match') {
      setMessage('');
    }
  }, [passwordsMatch, message]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    setTouchedConfirm(true);

    // Validate passwords match
    // Compare trimmed current formData directly to avoid timing issues and
    // ignore leading/trailing whitespace that users may accidentally type.
    if ((formData.password || '').trim() !== (formData.confirmPassword || '').trim()) {
      setMessage('Passwords do not match');
      setLoading(false);
      return;
    }

    // Validate password length
    if (formData.password.length < 6) {
      setMessage('Password must be at least 6 characters long');
      setLoading(false);
      return;
    }

    try {
      // Send verification code
      const response = await api.post('/send-verification-code', {
        fullName: formData.fullName,
        email: formData.email,
        password: formData.password,
        role: 'User'
      });

      if (response.data.success) {
        setMessage('Verification code sent to ' + formData.email);
        setStep(2); // Move to verification step
      }
    } catch (error) {
      setMessage(error.response?.data?.message || 'Failed to send verification code');
    }

    setLoading(false);
  };

  const handleVerifyCode = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      const response = await api.post('/verify-code', {
        email: formData.email,
        code: verificationCode
      });

      if (response.data.success) {
        // Store token and user data
        localStorage.setItem('token', response.data.token);
        localStorage.setItem('user', JSON.stringify(response.data.user));

        setMessage('Account created successfully! Redirecting...');
        setTimeout(() => {
          // Use window.location for full page reload with new user state
          window.location.href = '/pricing';
        }, 1500);
      }
    } catch (error) {
      setMessage(error.response?.data?.message || 'Invalid verification code');
    }

    setLoading(false);
  };

  return (
    <div className="signup-page">
      <div className="signup-split-container">
        {/* Left Side - Welcome Content at Bottom */}
        <div className="signup-left-side">
          <div className="welcome-content">
            <h1 className="welcome-title">Create your Noxtm Account</h1>
            <p className="welcome-description">
              Start your journey with Noxtm and discover how we create 
              experiences that connect, inspire, and convert.
            </p>
            {/* Left-side terms removed - terms remain on the form (right side) */}
          </div>
        </div>

        {/* Right Side - Signup Form */}
        <div className="signup-right-side">
          <div className="signup-form">
            {message && (
              <div className={`alert ${message.includes('successfully') || message.includes('sent to') ? 'alert-success' : 'alert-error'}`}>
                {message}
              </div>
            )}

            {step === 1 ? (
              <form onSubmit={handleSubmit} className="email-signup-form">
                <div className="form-row">
                <div className="form-group">
                  <label htmlFor="fullName" className="form-label">Full Name</label>
                  <input
                    type="text"
                    id="fullName"
                    name="fullName"
                    value={formData.fullName}
                    onChange={handleChange}
                    placeholder="Enter your full name..."
                    className="form-input"
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="email" className="form-label">Email</label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="Enter your email address..."
                    className="form-input"
                    required
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="password" className="form-label">Password</label>
                  <div className="password-input-container">
                    <input
                      type={showPassword ? "text" : "password"}
                      id="password"
                      name="password"
                      value={formData.password}
                      onChange={handleChange}
                      onBlur={handleBlurTrim}
                      placeholder="••••••••••••••••••••••••"
                      className="form-input password-input"
                      required
                    />
                    <button
                      type="button"
                      className="password-toggle-btn"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? (
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
                          <line x1="1" y1="1" x2="23" y2="23"/>
                        </svg>
                      ) : (
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                          <circle cx="12" cy="12" r="3"/>
                        </svg>
                      )}
                    </button>
                  </div>
                </div>
                <div className="form-group">
                  <label htmlFor="confirmPassword" className="form-label">Confirm Password</label>
                  <div className="password-input-container">
            <input
                      type={showConfirmPassword ? "text" : "password"}
                      id="confirmPassword"
                      name="confirmPassword"
                      value={formData.confirmPassword}
              onChange={handleChange}
                      onBlur={(e) => { setTouchedConfirm(true); handleBlurTrim(e); }}
                      placeholder="••••••••••••••••••••••••"
                      className="form-input password-input"
                      required
                    />
                    <button
                      type="button"
                      className="password-toggle-btn"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                    >
                      {showConfirmPassword ? (
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
                          <line x1="1" y1="1" x2="23" y2="23"/>
                        </svg>
                      ) : (
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                          <circle cx="12" cy="12" r="3"/>
                        </svg>
                      )}
                    </button>
                  </div>
                </div>
              </div>
              {/* Inline password match hint */}
              {touchedConfirm && !passwordsMatch && (
                <div className="field-error" style={{ color: '#ef4444', marginBottom: '0.5rem' }}>
                  Passwords do not match
                </div>
              )}

              {/* Terms and Privacy */}
              <div className="terms-section">
                <p>
                  By clicking "Create Account" above, you acknowledge that you
                  have read and understood, and agree to Noxtm's{' '}
                  <Link to="/terms" className="terms-link">Terms & Conditions</Link> and{' '}
                  <Link to="/privacy" className="terms-link">Privacy Policy</Link>.
                </p>
              </div>
              <button type="submit" className="continue-btn" disabled={loading}>
                {loading ? 'Sending Code...' : 'Send Verification Code'}
              </button>
            </form>
            ) : (
              <form onSubmit={handleVerifyCode} className="email-signup-form">
                <div className="verification-info">
                  <h3>Verify Your Email</h3>
                  <p>We've sent a verification code to <strong>{formData.email}</strong></p>
                </div>
                <div className="form-group">
                  <label htmlFor="verificationCode" className="form-label">Enter Verification Code</label>
                  <input
                    type="text"
                    id="verificationCode"
                    name="verificationCode"
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value)}
                    placeholder="Enter 6-digit code..."
                    className="form-input"
                    maxLength="6"
                    required
                  />
                </div>
                <button type="submit" className="continue-btn" disabled={loading}>
                  {loading ? 'Verifying...' : 'Verify & Create Account'}
                </button>
                <button
                  type="button"
                  className="back-btn"
                  onClick={() => setStep(1)}
                  disabled={loading}
                >
                  Back to Sign Up
                </button>
              </form>
            )}

            <div className="create-account-section">
              <p className="create-account-text">
                Already have an account? <Link to="/login" className="create-account-link">Log in</Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Signup;
