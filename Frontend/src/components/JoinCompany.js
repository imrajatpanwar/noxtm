import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { FiEye, FiEyeOff } from 'react-icons/fi';
import api from '../config/api';
import { Skeleton } from './ui/skeleton';
import './JoinCompany.css';

function JoinCompany({ onSignup }) {
  const [searchParams] = useSearchParams();
  const { token: paramToken } = useParams();
  const navigate = useNavigate();
  const token = paramToken || searchParams.get('token');

  const [loading, setLoading] = useState(true);
  const [invitationValid, setInvitationValid] = useState(false);
  const [invitationData, setInvitationData] = useState(null);
  const [loginMode, setLoginMode] = useState(false); // existing user → login to join
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
        setFormData(prev => ({ ...prev, email: data.invitation.email }));
      } else {
        toast.error(data.message || 'Invalid or expired invitation');
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
    const strength = { minLength: password.length >= 6 };
    strength.isValid = strength.minLength;
    setPasswordStrength(strength);
  };

  const handlePasswordChange = (e) => {
    const newPassword = e.target.value;
    setFormData({ ...formData, password: newPassword });
    validatePasswordStrength(newPassword);
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // Shared: accept invitation after we have a valid auth token + userId
  const acceptInvitation = async (authToken, userId, userBase) => {
    const acceptResponse = await api.post(
      '/messaging/invitations/signup-accept',
      { token, userId },
      { headers: { Authorization: `Bearer ${authToken}` } }
    );
    const acceptData = acceptResponse.data;

    if (acceptData.success) {
      const finalToken = acceptData.token || authToken;
      localStorage.setItem('token', finalToken);
      const updatedUser = {
        ...userBase,
        companyId: acceptData.company.id,
        subscription: acceptData.user.subscription,
        permissions: acceptData.user.permissions,
        access: acceptData.user.access
      };
      localStorage.setItem('user', JSON.stringify(updatedUser));
      window.dispatchEvent(new Event('userUpdated'));
      toast.success(`Successfully joined ${invitationData.company.companyName}!`);
      setTimeout(() => navigate('/dashboard', { replace: true }), 100);
    } else {
      toast.error(acceptData.message || 'Failed to join company');
      setSubmitting(false);
    }
  };

  // Login-to-join handler (existing users)
  const handleLoginJoin = async (e) => {
    e.preventDefault();
    if (!formData.password) {
      toast.error('Please enter your password');
      return;
    }
    setSubmitting(true);
    try {
      const loginResponse = await api.post('/login', {
        email: formData.email,
        password: formData.password
      });
      const loginData = loginResponse.data;
      if (!loginData.token) {
        toast.error(loginData.message || 'Login failed');
        setSubmitting(false);
        return;
      }
      localStorage.setItem('token', loginData.token);
      localStorage.setItem('user', JSON.stringify(loginData.user));
      await acceptInvitation(loginData.token, loginData.user.id || loginData.user._id, loginData.user);
    } catch (error) {
      console.error('Login-join error:', error);
      const msg = error.response?.data?.message;
      toast.error(msg || 'Login failed. Check your password.');
      setSubmitting(false);
    }
  };

  // Register + join handler (new users)
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.fullName.trim()) {
      toast.error('Please enter your full name');
      return;
    }
    if (!passwordStrength.isValid) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    if (formData.password !== formData.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    setSubmitting(true);

    try {
      const signupResponse = await api.post('/register', {
        fullName: formData.fullName,
        email: formData.email,
        password: formData.password,
        invitationToken: token
      });
      const signupData = signupResponse.data;

      if (!signupData.success) {
        toast.error(signupData.message || 'Failed to create account');
        setSubmitting(false);
        return;
      }

      localStorage.setItem('token', signupData.token);
      localStorage.setItem('user', JSON.stringify(signupData.user));
      await acceptInvitation(signupData.token, signupData.user.id, signupData.user);
    } catch (error) {
      console.error('Error during signup:', error);
      const errData = error.response?.data;
      if (errData?.userExists) {
        // Switch to login mode — user already has an account
        setLoginMode(true);
        toast.info('Account already exists. Enter your password to join.');
        setSubmitting(false);
      } else {
        toast.error(errData?.message || 'An error occurred. Please try again.');
        setSubmitting(false);
      }
    }
  };

  if (loading) {
    return (
      <div className="jc-container">
        <div className="jc-card">
          <div className="jc-loading-state" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <Skeleton className="tw-h-8 tw-w-48" />
            <Skeleton className="tw-h-4 tw-w-full" />
            <Skeleton className="tw-h-4 tw-w-full" />
            <Skeleton className="tw-h-4 tw-w-3/4" />
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
              {loginMode
                ? <p>New user? <button type="button" className="jc-link-btn" onClick={() => setLoginMode(false)}>Create account instead</button></p>
                : <p>Already have an account? <button type="button" className="jc-link-btn" onClick={() => setLoginMode(true)}>Login here</button></p>
              }
            </div>
          </div>

          {loginMode ? (
            // LOGIN TO JOIN form
            <form onSubmit={handleLoginJoin} className="jc-form">
              <div className="jc-login-notice">
                <p>This email already has an account. Enter your password to join <strong>{invitationData.company.companyName}</strong>.</p>
              </div>

              <div className="jc-form-group jc-password-wrapper">
                <label htmlFor="password">Password*</label>
                <div className="jc-password-field">
                  <input
                    type={showPassword ? "text" : "password"}
                    id="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="Enter your password"
                    required
                    disabled={submitting}
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

              <div className="jc-form-footer">
                <button type="submit" className="jc-btn-submit" disabled={submitting}>
                  {submitting ? 'Joining...' : 'Login & Join'}
                </button>
              </div>
            </form>
          ) : (
            // REGISTER form
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
                    minLength="6"
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
                    minLength="6"
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
                <button type="submit" className="jc-btn-submit" disabled={submitting}>
                  {submitting ? 'Creating Account...' : 'Accept & Join'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

export default JoinCompany;
