import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import './Login.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

function Login({ onLogin }) {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  // Handle Google OAuth error from URL
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const errorParam = urlParams.get('error');

    if (errorParam) {
      const errorMessages = {
        'google_auth_failed': 'Google authentication failed. Please try again.',
        'no_code': 'No authorization code received. Please try again.',
        'token_exchange_failed': 'Failed to authenticate with Google. Please try again.',
        'no_email': 'Could not retrieve email from Google. Please try again.',
        'server_error': 'Server error during authentication. Please try again.'
      };
      setError(errorMessages[errorParam] || 'Authentication failed. Please try again.');
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  // CRITICAL FIX: Handle already-authenticated users with redirect=mail parameter
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const redirectParam = urlParams.get('redirect');

    if (redirectParam === 'mail') {
      const token = localStorage.getItem('token');
      const user = localStorage.getItem('user');

      if (token && user) {
        console.log('[LOGIN] User already authenticated, redirecting to mail app...');
        const mailBaseUrl = process.env.REACT_APP_MAIL_URL || 'https://mail.noxtm.com';
        const mailUrl = `${mailBaseUrl}?auth_token=${encodeURIComponent(token)}`;
        window.location.href = mailUrl;
        return;
      }
    }
  }, []);

  // Google One Tap Sign-in
  useEffect(() => {
    // Only initialize if user is not already logged in
    if (localStorage.getItem('token')) return;

    if (window.google) {
      window.google.accounts.id.initialize({
        client_id: '765005911235-ntg3ieuf0okgj7b4d7ve3bn4dr1gunjv.apps.googleusercontent.com',
        callback: handleGoogleOneTap,
        auto_select: false,
        cancel_on_tap_outside: true,
      });

      // Show the One Tap prompt
      window.google.accounts.id.prompt((notification) => {
        if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
          console.log('[GOOGLE ONE TAP] Prompt not shown:', notification.getNotDisplayedReason());
        }
      });
    }
  }, []);

  const handleGoogleOneTap = async (response) => {
    try {
      setLoading(true);
      setError('');

      // Send the credential to our backend for verification
      const res = await fetch(`${API_URL}/api/auth/google/one-tap`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential: response.credential })
      });

      const data = await res.json();

      if (data.success && data.token) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        
        // Check for mail redirect
        const urlParams = new URLSearchParams(window.location.search);
        const redirectParam = urlParams.get('redirect');
        
        if (redirectParam === 'mail') {
          const mailBaseUrl = process.env.REACT_APP_MAIL_URL || 'https://mail.noxtm.com';
          window.location.href = `${mailBaseUrl}?auth_token=${encodeURIComponent(data.token)}`;
        } else {
          window.location.href = '/dashboard';
        }
      } else {
        setError(data.message || 'Google sign-in failed');
      }
    } catch (err) {
      setError('Failed to authenticate with Google');
      console.error('[GOOGLE ONE TAP] Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleGoogleLogin = () => {
    window.location.href = `${API_URL}/api/auth/google`;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const result = await onLogin(formData.email, formData.password);

    if (result.success) {
      const urlParams = new URLSearchParams(window.location.search);
      const redirectParam = urlParams.get('redirect');

      if (redirectParam === 'mail') {
        const token = localStorage.getItem('token');
        const mailBaseUrl = process.env.REACT_APP_MAIL_URL || 'https://mail.noxtm.com';
        const mailUrl = token
          ? `${mailBaseUrl}?auth_token=${encodeURIComponent(token)}`
          : mailBaseUrl;
        window.location.href = mailUrl;
        return;
      }

      if (result.user.role === 'Admin') {
        navigate('/dashboard');
        setLoading(false);
        return;
      }

      const subscription = result.user.subscription;
      const hasValidSubscription = subscription && (
        subscription.status === 'active' ||
        (subscription.status === 'trial' && subscription.endDate && new Date(subscription.endDate) > new Date())
      );

      if (hasValidSubscription) {
        navigate('/dashboard');
      } else {
        navigate('/pricing');
      }
    } else {
      setError(result.message || 'Login failed. Please try again.');
    }

    setLoading(false);
  };

  return (
    <div className="login-page">
      <div className="login-centered-container">
        <div className="login-form">
          <h1 className="login-title">Login into your Account</h1>

          {/* Error Message */}
          {error && (
            <div className="login-error-message">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <span>{error}</span>
            </div>
          )}

          {/* Google Login Button */}
          <div className="social-login-section">
            <button type="button" className="google-login-btn" onClick={handleGoogleLogin}>
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
          <div className="login-divider">
            <span>or</span>
          </div>

          {/* Email Login Form */}
          <form onSubmit={handleSubmit} className="email-login-form">
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

            <div className="form-group">
              <div className="login-password-input-container">
                <input
                  type={showPassword ? "text" : "password"}
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
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

            <div className="password-options">
              <div className="remember-me-container">
                <input
                  type="checkbox"
                  id="rememberMe"
                  className="remember-me-checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                />
                <label htmlFor="rememberMe" className="remember-me-label">
                  Remember me
                </label>
              </div>
              <button
                type="button"
                className="forgot-password-link"
                onClick={() => navigate('/forgot-password')}
              >
                Forgot password?
              </button>
            </div>

            <button type="submit" className="continue-btn" disabled={loading}>
              {loading ? 'Signing in...' : 'Continue with email'}
            </button>
          </form>

          {/* Create Account Link */}
          <div className="create-account-section">
            <p className="create-account-text">
              Don't have an account? <Link to="/signup" className="create-account-link">Create Account</Link>
            </p>
          </div>

          {/* Terms and Privacy */}
          <div className="terms-section">
            <p>
              By clicking "Continue" above, you acknowledge that you
              have read and understood, and agree to Noxtm's{' '}
              <a href="/terms" className="terms-link">Terms & Conditions</a> and{' '}
              <a href="/privacy" className="terms-link">Privacy Policy</a>.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Login;
