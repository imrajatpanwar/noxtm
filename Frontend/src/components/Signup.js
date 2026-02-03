import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../config/api';
import './Signup.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

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

  const handleBlurTrim = (e) => {
    const { name, value } = e.target;
    if (name === 'password' || name === 'confirmPassword') {
      const trimmed = (value || '').trim();
      if (trimmed !== value) {
        setFormData((prev) => ({ ...prev, [name]: trimmed }));
      }
    }
  };

  useEffect(() => {
    setPasswordsMatch((formData.password || '').trim() === (formData.confirmPassword || '').trim());
  }, [formData.password, formData.confirmPassword]);

  useEffect(() => {
    if (passwordsMatch && message === 'Passwords do not match') {
      setMessage('');
    }
  }, [passwordsMatch, message]);

  const handleGoogleSignup = () => {
    window.location.href = `${API_URL}/api/auth/google`;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    setTouchedConfirm(true);

    if ((formData.password || '').trim() !== (formData.confirmPassword || '').trim()) {
      setMessage('Passwords do not match');
      setLoading(false);
      return;
    }

    if (formData.password.length < 6) {
      setMessage('Password must be at least 6 characters long');
      setLoading(false);
      return;
    }

    try {
      const response = await api.post('/send-verification-code', {
        fullName: formData.fullName,
        email: formData.email,
        password: formData.password,
        role: 'User'
      });

      if (response.data.success) {
        setMessage('Verification code sent to ' + formData.email);
        setStep(2);
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
        localStorage.setItem('token', response.data.token);
        localStorage.setItem('user', JSON.stringify(response.data.user));

        const user = response.data.user;
        const hasActiveSubscription = user.subscription &&
          user.subscription.status === 'active' &&
          user.subscription.plan !== 'None';

        setMessage('Account created successfully! Redirecting...');
        setTimeout(() => {
          if (hasActiveSubscription) {
            window.location.href = '/dashboard';
          } else {
            window.location.href = '/pricing';
          }
        }, 1500);
      }
    } catch (error) {
      const errorMessage = error.response?.data?.message ||
        error.response?.data?.error ||
        'Verification failed. Please try again.';
      setMessage(errorMessage);
    }

    setLoading(false);
  };

  return (
    <div className="signup-page">
      <div className="signup-centered-container">
        <div className="signup-form">
          {message && (
            <div className={`alert ${message.includes('successfully') || message.includes('sent to') ? 'alert-success' : 'alert-error'}`}>
              {message}
            </div>
          )}

          {step === 1 ? (
            <>
              <h1 className="signup-title">Create your Account</h1>

              {/* Google Signup Button */}
              <div className="social-signup-section">
                <button type="button" className="google-signup-btn" onClick={handleGoogleSignup}>
                  <svg width="20" height="20" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                  </svg>
                  <span>Continue with Google</span>
                </button>
              </div>

              {/* Divider */}
              <div className="signup-divider">
                <span>or</span>
              </div>

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
                    <div className="signup-password-input-container">
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
                            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                            <line x1="1" y1="1" x2="23" y2="23" />
                          </svg>
                        ) : (
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                            <circle cx="12" cy="12" r="3" />
                          </svg>
                        )}
                      </button>
                    </div>
                  </div>
                  <div className="form-group">
                    <label htmlFor="confirmPassword" className="form-label">Confirm Password</label>
                    <div className="signup-password-input-container">
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
                            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                            <line x1="1" y1="1" x2="23" y2="23" />
                          </svg>
                        ) : (
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                            <circle cx="12" cy="12" r="3" />
                          </svg>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
                {touchedConfirm && !passwordsMatch && (
                  <div className="field-error">
                    Passwords do not match
                  </div>
                )}

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
            </>
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
  );
}

export default Signup;
