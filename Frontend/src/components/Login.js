import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import './Login.css';
import dayHero from '../assets/day-time-login-signup.webp';
import nightHero from '../assets/night-time-login-signup.webp';

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

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(''); // Clear previous errors

    const result = await onLogin(formData.email, formData.password);

    if (result.success) {
      // Check for redirect parameter (for cross-app navigation)
      const urlParams = new URLSearchParams(window.location.search);
      const redirectParam = urlParams.get('redirect');

      // If redirect=mail, send user to mail app
      if (redirectParam === 'mail') {
        // Get the token that was just set in localStorage
        const token = localStorage.getItem('token');

        // Pass token as URL parameter so mail app can use it immediately
        // Cookie might take a moment to sync across subdomains
        const mailUrl = token
          ? `https://mail.noxtm.com?auth_token=${encodeURIComponent(token)}`
          : 'https://mail.noxtm.com';

        window.location.href = mailUrl;
        return;
      }

      // Normal login flow
      // Admin users always go directly to dashboard (bypass subscription checks)
      if (result.user.role === 'Admin' || result.user.role === 'Lord') {
        navigate('/dashboard');
        setLoading(false);
        return;
      }

      // Check if user has valid subscription (active or trial that hasn't expired)
      const subscription = result.user.subscription;
      const hasValidSubscription = subscription && (
        subscription.status === 'active' ||
        (subscription.status === 'trial' && subscription.endDate && new Date(subscription.endDate) > new Date())
      );

      // Users with valid subscription go to dashboard
      if (hasValidSubscription) {
        navigate('/dashboard');
      } else {
        // Users without valid subscription go to pricing
        navigate('/pricing');
      }
    } else {
      // Show error message
      setError(result.message || 'Login failed. Please try again.');
    }

    setLoading(false);
  };

  const currentHour = new Date().getHours();
  const isDayTime = currentHour >= 6 && currentHour < 18;
  const heroImage = isDayTime ? dayHero : nightHero;
  const heroAlt = isDayTime ? 'Daytime Noxtm illustration' : 'Nighttime Noxtm illustration';

  return (
    <div className="login-page">
      <div className="login-split-container">
        <div className="login-left-side">
          <img src={heroImage} alt={heroAlt} className="login-hero-image" />
        </div>

        {/* Right Side - Login Form */}
        <div className="login-right-side">
          <div className="login-form">
            <h1 className="login-title">Login into your Account</h1>

            {/* Error Message */}
            {error && (
              <div style={{
                backgroundColor: '#fef2f2',
                border: '1px solid #fecaca',
                borderRadius: '8px',
                padding: '12px 16px',
                marginBottom: '20px',
                color: '#dc2626',
                fontSize: '14px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                <span>{error}</span>
              </div>
            )}

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
                By clicking "Continue with email" above, you acknowledge that you
                have read and understood, and agree to Noxtm's{' '}
                <a href="/terms" className="terms-link">Terms & Conditions</a> and{' '}
                <a href="/privacy" className="terms-link">Privacy Policy</a>.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Login;
