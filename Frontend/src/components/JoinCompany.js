import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import './JoinCompany.css';

function JoinCompany({ onSignup }) {
  const [searchParams] = useSearchParams();
  const { token: paramToken } = useParams();
  const navigate = useNavigate();
  // Support both /invite/:token and /join-company?token=xxx formats
  const token = paramToken || searchParams.get('token');

  const [loading, setLoading] = useState(true);
  const [invitationValid, setInvitationValid] = useState(false);
  const [invitationData, setInvitationData] = useState(null);
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState({
    hasUppercase: false,
    hasLowercase: false,
    hasSpecialChar: false,
    minLength: false,
    isValid: false
  });

  useEffect(() => {
    if (!token) {
      toast.error('Invalid invitation link');
      navigate('/login');
      return;
    }

    verifyInvitation();
  }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

  const verifyInvitation = async () => {
    try {
      const response = await fetch(`/api/messaging/invitations/verify/${token}`);
      const data = await response.json();

      if (response.ok && data.valid) {
        setInvitationValid(true);
        setInvitationData(data);
        setFormData(prev => ({
          ...prev,
          email: data.invitation.email
        }));
      } else {
        const errorMsg = data.message || 'Invalid or expired invitation';
        if (errorMsg.includes('expired') || errorMsg.includes('used')) {
          toast.error(errorMsg);
        } else {
          toast.error(errorMsg);
        }
        setTimeout(() => navigate('/login'), 3000);
      }
    } catch (error) {
      console.error('Error verifying invitation:', error);
      toast.error('Failed to verify invitation');
      setTimeout(() => navigate('/login'), 2000);
    } finally {
      setLoading(false);
    }
  };

  const validatePasswordStrength = (password) => {
    const strength = {
      hasUppercase: /[A-Z]/.test(password),
      hasLowercase: /[a-z]/.test(password),
      hasSpecialChar: /[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/.test(password),
      minLength: password.length >= 8,
    };
    strength.isValid = Object.values(strength).every(v => v);
    setPasswordStrength(strength);
  };

  const handlePasswordChange = (e) => {
    const newPassword = e.target.value;
    setFormData({ ...formData, password: newPassword });
    validatePasswordStrength(newPassword);
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validation
    if (!formData.fullName.trim()) {
      toast.error('Please enter your full name');
      return;
    }

    if (!passwordStrength.isValid) {
      toast.error('Password must contain uppercase, lowercase, and special character');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    setSubmitting(true);

    try {
      // Create user account directly via API call instead of using onSignup
      // This bypasses the email verification flow used in regular signup
      const signupResponse = await fetch('/api/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          fullName: formData.fullName,
          email: formData.email,
          password: formData.password,
          role: 'Employee' // Default role for invited users
        })
      });

      const signupData = await signupResponse.json();

      if (!signupResponse.ok || !signupData.success) {
        if (signupData.userExists) {
          toast.error('This email is already registered. Try logging in instead.');
          setTimeout(() => {
            navigate(`/login?email=${encodeURIComponent(formData.email)}`);
          }, 2000);
        } else {
          toast.error(signupData.message || 'Failed to create account');
        }
        setSubmitting(false);
        return;
      }

      // Store the token immediately after registration
      localStorage.setItem('token', signupData.token);
      localStorage.setItem('user', JSON.stringify(signupData.user));

      // Accept invitation with authentication
      const acceptResponse = await fetch('/api/messaging/invitations/signup-accept', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${signupData.token}`
        },
        body: JSON.stringify({
          token: token,
          userId: signupData.user.id
        })
      });

      const acceptData = await acceptResponse.json();

      if (acceptResponse.ok && acceptData.success) {
        // Update token if new one provided
        if (acceptData.token) {
          localStorage.setItem('token', acceptData.token);
        }

        // Update user with complete company info
        const updatedUser = {
          ...signupData.user,
          companyId: acceptData.company.id,
          subscription: acceptData.user.subscription,
          permissions: acceptData.user.permissions,
          access: acceptData.user.access
        };
        localStorage.setItem('user', JSON.stringify(updatedUser));

        toast.success(`Successfully joined ${invitationData.company.companyName}!`);

        // Use hard redirect to ensure clean page reload with updated user state
        setTimeout(() => {
          window.location.href = '/dashboard';
        }, 1000);
      } else {
        toast.error(acceptData.message || 'Failed to join company');
        setSubmitting(false);
      }
    } catch (error) {
      console.error('Error during signup:', error);
      toast.error('An error occurred. Please try again.');
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="join-company-container">
        <div className="join-company-card">
          <div className="loading-state">
            <div className="spinner"></div>
            <p>Verifying invitation...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!invitationValid) {
    return (
      <div className="join-company-container">
        <div className="join-company-card">
          <div className="error-state">
            <div className="error-icon">⚠️</div>
            <h2>Invalid Invitation</h2>
            <p>This invitation link is invalid or has expired.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="join-company-container">
      <div className="join-company-card">
        <div className="join-company-header">
          <h1>Accept Invitation to {invitationData.company.companyName}</h1>
          <p className="invitation-subtitle">
            You've been invited to join {invitationData.company.companyName}
          </p>
        </div>

        <div className="company-info-box">
          <div className="company-info-item">
            <span className="info-label">Company:</span>
            <span className="info-value">{invitationData.company.companyName}</span>
          </div>
          {invitationData.company.industry && (
            <div className="company-info-item">
              <span className="info-label">Industry:</span>
              <span className="info-value">{invitationData.company.industry}</span>
            </div>
          )}
          <div className="company-info-item">
            <span className="info-label">Your Role:</span>
            <span className="info-value">{invitationData.invitation.roleInCompany}</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="join-company-form">
          <div className="form-group">
            <label htmlFor="fullName">Full Name *</label>
            <input
              type="text"
              id="fullName"
              name="fullName"
              value={formData.fullName}
              onChange={handleChange}
              placeholder="Enter your full name"
              required
              disabled={submitting}
            />
          </div>

          <div className="form-group">
            <label htmlFor="email">Email Address *</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              disabled
              className="disabled-input"
            />
            <small className="form-hint">This email was invited by your company</small>
          </div>

          <div className="form-group">
            <label htmlFor="password">Password *</label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handlePasswordChange}
              placeholder="Create a strong password (min 8 characters)"
              required
              disabled={submitting}
              minLength="8"
            />
            <div className="password-strength-indicators">
              <div className={`strength-item ${passwordStrength.minLength ? 'valid' : ''}`}>
                {passwordStrength.minLength ? '✓' : '○'} At least 8 characters
              </div>
              <div className={`strength-item ${passwordStrength.hasUppercase ? 'valid' : ''}`}>
                {passwordStrength.hasUppercase ? '✓' : '○'} One uppercase letter
              </div>
              <div className={`strength-item ${passwordStrength.hasLowercase ? 'valid' : ''}`}>
                {passwordStrength.hasLowercase ? '✓' : '○'} One lowercase letter
              </div>
              <div className={`strength-item ${passwordStrength.hasSpecialChar ? 'valid' : ''}`}>
                {passwordStrength.hasSpecialChar ? '✓' : '○'} One special character
              </div>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="confirmPassword">Confirm Password *</label>
            <input
              type="password"
              id="confirmPassword"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              placeholder="Re-enter your password"
              required
              disabled={submitting}
              minLength="6"
            />
          </div>

          <button
            type="submit"
            className="btn-join-company"
            disabled={submitting}
          >
            {submitting ? 'Creating Account...' : 'Accept & Join'}
          </button>
        </form>

        <div className="join-company-footer">
          <p>Already have an account? <a href="/login">Login here</a></p>
        </div>
      </div>
    </div>
  );
}

export default JoinCompany;
