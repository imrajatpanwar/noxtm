import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import './Signup.css';

function Signup({ onSignup }) {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    businessName: '',
    businessEmail: '',
    role: 'Freelancer' // Default to Freelancer
  });
  const [userType, setUserType] = useState('Freelancer'); // Default to Freelancer
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
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
    setMessage('');

    // Validate user type is selected
    if (!userType) {
      setMessage('Please select which best describes you');
      setLoading(false);
      return;
    }

    // Validate passwords match
    if (formData.password !== formData.confirmPassword) {
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

    // For Team Member, check if business email domain exists
    if (userType === 'Team Member') {
      // Extract domain from email
      const emailDomain = formData.email.split('@')[1];
      // Here you would typically check against existing business domains
      // For now, we'll simulate this check
      try {
        const response = await fetch('/api/check-domain', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ domain: emailDomain }),
        });
        
        if (!response.ok) {
          setMessage('Business domain not found. Please contact your administrator.');
          setLoading(false);
          return;
        }
      } catch (error) {
        console.log('Domain check skipped for demo purposes');
      }
    }

    // Prepare signup data based on user type
    let signupData;
    if (userType === 'Business Owner') {
      signupData = {
        username: formData.username || formData.businessName,
        email: formData.businessEmail,
        password: formData.password,
        role: 'Business Admin',
        businessName: formData.businessName,
        userType: 'Business Owner'
      };
    } else if (userType === 'Freelancer') {
      signupData = {
        username: formData.username || formData.businessName,
        email: formData.businessEmail,
        password: formData.password,
        role: 'Freelancer',
        businessName: formData.businessName,
        userType: 'Freelancer'
      };
    } else {
      signupData = {
        username: formData.username,
        email: formData.email,
        password: formData.password,
        role: 'Team Member',
        userType: 'Team Member'
      };
    }

    const result = await onSignup(signupData.username, signupData.email, signupData.password, signupData.role, signupData);
    
    if (result.success) {
      setMessage('Account created successfully!');
      setTimeout(() => {
        if (userType === 'Business Owner' || userType === 'Freelancer') {
          navigate('/pricing');
        } else {
          navigate('/access-restricted');
        }
      }, 1000);
    } else {
      setMessage(result.message);
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
            {/* Terms and Privacy */}
            <div className="terms-section">
              <p>
                By clicking "Create Account" above, you acknowledge that you 
                have read and understood, and agree to Noxtm's{' '}
                <a href="/terms" className="terms-link">Terms & Conditions</a> and{' '}
                <a href="/privacy" className="terms-link">Privacy Policy</a>.
              </p>
            </div>
          </div>
        </div>

        {/* Right Side - Signup Form */}
        <div className="signup-right-side">
          <div className="signup-form">
            
            {message && (
              <div className={`alert ${message.includes('successfully') ? 'alert-success' : 'alert-error'}`}>
                {message}
              </div>
            )}
            
            {/* Email Signup Form */}
            <form onSubmit={handleSubmit} className="email-signup-form">
              {/* User Type Selection */}
              <div className="form-group">
                <label className="form-label">Which of these best describes you?</label>
                <div className="user-type-options">
                  <div 
                    className={`user-type-option ${userType === 'Freelancer' ? 'selected' : ''}`}
                    onClick={() => {
                      setUserType('Freelancer');
                      setFormData({
                        username: '',
                        email: '',
                        password: '',
                        confirmPassword: '',
                        businessName: '',
                        businessEmail: '',
                        role: 'Freelancer'
                      });
                    }}
                  >
                    Freelancer
                  </div>
                  <div 
                    className={`user-type-option ${userType === 'Business Owner' ? 'selected' : ''}`}
                    onClick={() => {
                      setUserType('Business Owner');
                      setFormData({
                        username: '',
                        email: '',
                        password: '',
                        confirmPassword: '',
                        businessName: '',
                        businessEmail: '',
                        role: 'Business Admin'
                      });
                    }}
                  >
                    Business Owner
                  </div>
                  <div 
                    className={`user-type-option ${userType === 'Team Member' ? 'selected' : ''}`}
                    onClick={() => {
                      setUserType('Team Member');
                      setFormData({
                        username: '',
                        email: '',
                        password: '',
                        confirmPassword: '',
                        businessName: '',
                        businessEmail: '',
                        role: 'Team Member'
                      });
                    }}
                  >
                    Team Member
                  </div>
                </div>
              </div>

              {/* Conditional Form Fields Based on User Type */}
              {(userType === 'Business Owner' || userType === 'Freelancer') && (
                <>
                  <div className="form-row">
                    <div className="form-group">
                      <label htmlFor="businessName" className="form-label">
                        {userType === 'Freelancer' ? 'Name/Business Name' : 'Business Name'}
                      </label>
                      <input
                        type="text"
                        id="businessName"
                        name="businessName"
                        value={formData.businessName}
                        onChange={handleChange}
                        placeholder={userType === 'Freelancer' ? 'Enter your name or business name...' : 'Enter your business name...'}
                        className="form-input"
                        required
                      />
                    </div>
                    
                    <div className="form-group">
                      <label htmlFor="businessEmail" className="form-label">Email</label>
                      <input
                        type="email"
                        id="businessEmail"
                        name="businessEmail"
                        value={formData.businessEmail}
                        onChange={handleChange}
                        placeholder="Enter your email address..."
                        className="form-input"
                        required
                      />
                    </div>
                  </div>
                </>
              )}

              {userType === 'Team Member' && (
                <>
                  <div className="form-row">
                    <div className="form-group">
                      <label htmlFor="username" className="form-label">Username</label>
                      <input
                        type="text"
                        id="username"
                        name="username"
                        value={formData.username}
                        onChange={handleChange}
                        placeholder="Enter your username..."
                        className="form-input"
                        required
                      />
                    </div>
                    
                    <div className="form-group">
                      <label htmlFor="email" className="form-label">Business Email</label>
                      <input
                        type="email"
                        id="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        placeholder="Enter your business email address..."
                        className="form-input"
                        required
                      />
                    </div>
                  </div>
                  <small className="form-help-text">
                    Please use your company email address. We'll verify your domain access.
                  </small>
                </>
              )}

              {/* Password fields - shown for both user types */}
              {userType && (
                <>
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
                </>
              )}
              
              {/* Terms and Privacy */}
              <div className="terms-section">
                <p>
                  By clicking "Create Account" above, you acknowledge that you 
                  have read and understood, and agree to Noxtm's{' '}
                  <a href="/terms" className="terms-link">Terms & Conditions</a> and{' '}
                  <a href="/privacy" className="terms-link">Privacy Policy</a>.
                </p>
              </div>
              
              <button type="submit" className="continue-btn" disabled={loading || !userType}>
                {loading ? 'Creating Account...' : 'Create Account'}
              </button>
            </form>

            {/* Login Link */}
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
