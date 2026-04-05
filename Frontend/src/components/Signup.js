import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../config/api';
import './Signup.css';
import { API_BASE_URL } from '../config/apiConfig';

const API_URL = API_BASE_URL;

function Signup({ onSignup }) {
  const [step, setStep] = useState(1); // 1 = email, 2 = details, 3 = verification
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
  });
  const [verificationCode, setVerificationCode] = useState('');
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState(''); // 'success' or 'error'
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleGoogleSignup = () => {
    window.location.href = `${API_URL}/api/auth/google`;
  };

  const handleEmailStep = (e) => {
    e.preventDefault();
    if (!formData.email) return;
    setMessage('');
    setStep(2);
  };

  const handleDetailsSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    setMessageType('');

    if (formData.password.length < 6) {
      setMessage('Password must be at least 6 characters');
      setMessageType('error');
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
        setMessageType('success');
        setStep(3);
      }
    } catch (error) {
      const errData = error.response?.data;
      if (errData?.userExists || errData?.redirectToLogin) {
        setMessage('This email is already registered. Redirecting to login...');
        setMessageType('error');
        setTimeout(() => {
          window.location.href = `/login?email=${encodeURIComponent(formData.email)}`;
        }, 2000);
      } else {
        setMessage(errData?.message || 'Failed to send verification code');
        setMessageType('error');
      }
    }
    setLoading(false);
  };

  const handleVerifyCode = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    setMessageType('');

    try {
      const response = await api.post('/verify-code', {
        email: formData.email,
        code: verificationCode
      });

      if (response.data.success) {
        localStorage.setItem('token', response.data.token);
        localStorage.setItem('user', JSON.stringify(response.data.user));
        setMessage('Account created successfully! Redirecting...');
        setMessageType('success');
        setTimeout(() => {
          window.location.href = '/company-setup';
        }, 1500);
      }
    } catch (error) {
      const errData = error.response?.data;
      if (errData?.userExists || errData?.redirectToLogin) {
        setMessage('This email is already registered. Redirecting to login...');
        setMessageType('error');
        setTimeout(() => {
          window.location.href = `/login?email=${encodeURIComponent(formData.email)}`;
        }, 2000);
      } else {
        setMessage(errData?.message || 'Verification failed. Please try again.');
        setMessageType('error');
      }
    }
    setLoading(false);
  };

  const handleResendCode = async () => {
    setLoading(true);
    setMessage('');
    setMessageType('');
    setVerificationCode(''); // Clear old code so user doesn't submit it

    try {
      const response = await api.post('/send-verification-code', {
        fullName: formData.fullName,
        email: formData.email,
        password: formData.password,
        role: 'User'
      });

      if (response.data.success) {
        setMessage('A new verification code has been sent to ' + formData.email + '. The previous code is no longer valid.');
        setMessageType('success');
      }
    } catch (error) {
      const errData = error.response?.data;
      setMessage(errData?.message || 'Failed to resend verification code');
      setMessageType('error');
    }
    setLoading(false);
  };

  return (
    <div className="su-page">
      <div className="su-card">
        {/* Logo */}
        <div className="su-logo">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
            <path d="M16 7V5a4 4 0 0 0-8 0v2" />
          </svg>
        </div>

        {message && (
          <div className={`su-alert su-alert-${messageType}`}>
            {message}
          </div>
        )}

        {step === 1 && (
          <>
            <h1 className="su-title">Welcome to Noxtm</h1>
            <p className="su-subtitle">
              Already have an account? <Link to="/login" className="su-link">Sign in</Link>
            </p>

            <form onSubmit={handleEmailStep}>
              <div className="su-field">
                <label className="su-label" htmlFor="email">Email</label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  className="su-input"
                  placeholder="m@example.com"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  autoFocus
                />
              </div>
              <button type="submit" className="su-btn su-btn-primary">
                Create Account
              </button>
            </form>

            <div className="su-divider">
              <span>Or</span>
            </div>

            <div className="su-social-row">
              <button type="button" className="su-btn su-btn-outline" disabled>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
                </svg>
                Continue with Apple
              </button>
              <button type="button" className="su-btn su-btn-outline" onClick={handleGoogleSignup}>
                <svg width="16" height="16" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Continue with Google
              </button>
            </div>

            <p className="su-terms">
              By clicking continue, you agree to our{' '}
              <Link to="/terms" className="su-link">Terms of Service</Link> and{' '}
              <Link to="/privacy" className="su-link">Privacy Policy</Link>.
            </p>
          </>
        )}

        {step === 2 && (
          <>
            <h1 className="su-title">Complete your account</h1>
            <p className="su-subtitle">
              Signing up as <strong>{formData.email}</strong>
            </p>

            <form onSubmit={handleDetailsSubmit}>
              <div className="su-field">
                <label className="su-label" htmlFor="fullName">Full Name</label>
                <input
                  id="fullName"
                  name="fullName"
                  type="text"
                  className="su-input"
                  placeholder="Enter your full name"
                  value={formData.fullName}
                  onChange={handleChange}
                  required
                  autoFocus
                />
              </div>
              <div className="su-field">
                <label className="su-label" htmlFor="password">Password</label>
                <div className="su-password-wrap">
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    className="su-input"
                    placeholder="Create a password (min. 6 characters)"
                    value={formData.password}
                    onChange={handleChange}
                    required
                  />
                  <button type="button" className="su-password-toggle" onClick={() => setShowPassword(!showPassword)}>
                    {showPassword ? (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                    ) : (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                    )}
                  </button>
                </div>
              </div>
              <button type="submit" className="su-btn su-btn-primary" disabled={loading}>
                {loading ? 'Sending code...' : 'Continue'}
              </button>
              <button type="button" className="su-btn su-btn-ghost" onClick={() => setStep(1)}>
                Back
              </button>
            </form>
          </>
        )}

        {step === 3 && (
          <>
            <h1 className="su-title">Verify your email</h1>
            <p className="su-subtitle">
              We've sent a 6-digit code to <strong>{formData.email}</strong>
            </p>

            <form onSubmit={handleVerifyCode}>
              <div className="su-field">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <label className="su-label" htmlFor="verificationCode" style={{ margin: 0 }}>Verification Code</label>
                  <button
                    type="button"
                    onClick={handleResendCode}
                    disabled={loading}
                    style={{
                      background: 'none',
                      border: 'none',
                      padding: 0,
                      fontSize: '13px',
                      color: '#09090b',
                      cursor: 'pointer',
                      fontWeight: 500,
                      textDecoration: 'underline',
                      textUnderlineOffset: '2px',
                      opacity: loading ? 0.5 : 1
                    }}
                  >
                    Resend Code
                  </button>
                </div>
                <input
                  id="verificationCode"
                  type="text"
                  className="su-input"
                  placeholder="Enter 6-digit code"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value)}
                  maxLength="6"
                  required
                  autoFocus
                />
              </div>
              <button type="submit" className="su-btn su-btn-primary" disabled={loading}>
                {loading ? 'Verifying...' : 'Verify & Create Account'}
              </button>
              <button type="button" className="su-btn su-btn-ghost" onClick={() => setStep(2)}>
                Back
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

export default Signup;
