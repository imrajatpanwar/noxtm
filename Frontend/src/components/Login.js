import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { toast } from 'sonner';
import './Login.css';
import poweredByNoxtm from './image/powered_by_noxtm.svg';

function Login({ onLogin }) {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
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

    const result = await onLogin(formData.email, formData.password);
    
    if (result.success) {
      toast.success('Login successful! Welcome back!');
      setTimeout(() => {
        navigate('/dashboard');
      }, 1000);
    } else {
      toast.error(result.message || 'Login failed. Please try again.');
    }
    
    setLoading(false);
  };

  return (
    <div className="login-page">
      <div className="login-split-container">
        {/* Left Side - Welcome Content */}
        <div className="login-left-side">
          <div className="powered-by-logo">
            <img src={poweredByNoxtm} alt="Powered by Noxtm" />
          </div>
          <div className="welcome-content">
            <h1 className="welcome-title">Discover Noxtm Studio</h1>
            <p className="welcome-description">
              At Noxtm Studio, we don't just market, we create experiences 
              that connect, inspire, and convert.
            </p>
          </div>
        </div>

        {/* Right Side - Login Form */}
        <div className="login-right-side">
          <div className="login-form">
            <h1 className="login-title">Login into your Account</h1>
            
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
                <div className="password-input-container">
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
                <div className="forgot-password-container">
                  <button type="button" className="forgot-password-link">Forgot password?</button>
                </div>
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
                have read and understood, and agree to Noxtm Studio's{' '}
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
