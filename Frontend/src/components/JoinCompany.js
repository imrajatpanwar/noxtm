import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { FiEye, FiEyeOff } from 'react-icons/fi';
import api from '../config/api';
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
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
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
      const response = await api.get(`/messaging/invitations/verify/${token}`);
      const data = response.data;

      if (data.valid) {
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
      hasSpecialChar: /[^A-Za-z0-9\s]/.test(password),
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
      const signupResponse = await api.post('/register', {
        fullName: formData.fullName,
        email: formData.email,
        password: formData.password,
        invitationToken: token
      });

      const signupData = signupResponse.data;

      if (!signupData.success) {
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
      const acceptResponse = await api.post('/messaging/invitations/signup-accept', {
        token: token,
        userId: signupData.user.id
      });

      const acceptData = acceptResponse.data;

      if (acceptData.success) {
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

        // Dispatch event to notify App.js and RoleContext
        window.dispatchEvent(new Event('userUpdated'));

        toast.success(`Successfully joined ${invitationData.company.companyName}!`);

        // Short delay for state propagation, then navigate
        setTimeout(() => {
          navigate('/dashboard', { replace: true });
        }, 100);
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
      <div className="jc-container">
        <div className="jc-card">
          <div className="jc-loading-state">
            <div className="jc-spinner"></div>
            <p>Verifying invitation...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!invitationValid) {
    return (
      <div className="jc-container">
        <div className="jc-card">
          <div className="jc-error-state">
            <div className="jc-error-icon">⚠️</div>
            <h2>Invalid Invitation</h2>
            <p>This invitation link is invalid or has expired.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="jc-container">
      <div className="jc-card">
        <div className="jc-header">
          <h1>Accept Invitation to {invitationData.company.companyName}</h1>
          <p className="jc-subtitle">
            You've been invited to join <strong>{invitationData.company.companyName}</strong>
          </p>
        </div>

        <div className="jc-content-wrapper">
          <div className="jc-info-section">
            <div className="jc-info-item">
              <span className="jc-info-label">Company:</span>
              <span className="jc-info-value">{invitationData.company.companyName}</span>
            </div>
            {invitationData.company.industry && (
              <div className="jc-info-item">
                <span className="jc-info-label">Industry:</span>
                <span className="jc-info-value">{invitationData.company.industry}</span>
              </div>
            )}
            <div className="jc-info-item">
              <span className="jc-info-label">Your Role:</span>
              <span className="jc-info-value">
                Employee
                {invitationData.invitation.jobTitle ? ` (${invitationData.invitation.jobTitle})` : ''}
              </span>
            </div>
            <div className="jc-info-item">
              <span className="jc-info-label">Email:</span>
              <span className="jc-info-value">{formData.email}</span>
            </div>

            <div className="jc-footer-link">
              <p>Already have an account? <a href="/login">Login here</a></p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="jc-form">
            <div className="jc-form-group">
              <label htmlFor="fullName">Full Name*</label>
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

            <div className="jc-form-group jc-password-wrapper">
              <label htmlFor="password">Password*</label>
              <div className="jc-password-field">
                <input
                  type={showPassword ? "text" : "password"}
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handlePasswordChange}
                  placeholder="Create a Strong Password"
                  required
                  disabled={submitting}
                  minLength="8"
                />
                <button
                  type="button"
                  className="jc-password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                  tabIndex={-1}
                >
                  {showPassword ? <FiEyeOff /> : <FiEye />}
                </button>
              </div>
            </div>

            <div className="jc-form-group jc-password-wrapper">
              <label htmlFor="confirmPassword">Confirm Password*</label>
              <div className="jc-password-field">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  id="confirmPassword"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  placeholder="Re-enter your password"
                  required
                  disabled={submitting}
                  minLength="8"
                />
                <button
                  type="button"
                  className="jc-password-toggle"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  tabIndex={-1}
                >
                  {showConfirmPassword ? <FiEyeOff /> : <FiEye />}
                </button>
              </div>
            </div>

            <div className="jc-form-footer">
              <button
                type="submit"
                className="jc-btn-submit"
                disabled={submitting}
              >
                {submitting ? 'Creating Account...' : 'Accept & Join'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default JoinCompany;
