import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import './JoinCompany.css';

function JoinCompany({ onSignup }) {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');

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
        toast.error(data.message || 'Invalid or expired invitation');
        setTimeout(() => navigate('/login'), 2000);
      }
    } catch (error) {
      console.error('Error verifying invitation:', error);
      toast.error('Failed to verify invitation');
      setTimeout(() => navigate('/login'), 2000);
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

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validation
    if (!formData.fullName.trim()) {
      toast.error('Please enter your full name');
      return;
    }

    if (formData.password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    setSubmitting(true);

    try {
      // First, create the user account
      const signupResult = await onSignup(
        formData.fullName,
        formData.email,
        formData.password,
        'Employee', // Default role for invited users
        {}
      );

      if (!signupResult.success) {
        toast.error(signupResult.message || 'Failed to create account');
        setSubmitting(false);
        return;
      }

      // Then, accept the invitation with the new user ID
      const acceptResponse = await fetch('/api/messaging/invitations/signup-accept', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          token: token,
          userId: signupResult.user._id
        })
      });

      const acceptData = await acceptResponse.json();

      if (acceptResponse.ok && acceptData.success) {
        toast.success(`Successfully joined ${invitationData.company.companyName}!`);

        // Update user in localStorage with company info
        const updatedUser = {
          ...signupResult.user,
          companyId: acceptData.company.id
        };
        localStorage.setItem('user', JSON.stringify(updatedUser));

        // Trigger the storage event
        window.dispatchEvent(new Event('userUpdated'));

        setTimeout(() => navigate('/dashboard'), 1500);
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
          <h1>Join {invitationData.company.companyName}</h1>
          <p className="invitation-subtitle">
            You've been invited to join as <strong>{invitationData.invitation.roleInCompany}</strong>
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
              onChange={handleChange}
              placeholder="Create a strong password (min 6 characters)"
              required
              disabled={submitting}
              minLength="6"
            />
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
            {submitting ? 'Creating Account...' : 'Create Account & Join Company'}
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
