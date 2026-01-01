import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { FiCheck, FiX, FiAlertCircle, FiUsers, FiBriefcase } from 'react-icons/fi';
import './InviteAccept.css';

const InviteAccept = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [inviteData, setInviteData] = useState(null);
  const [error, setError] = useState('');
  const [accepting, setAccepting] = useState(false);

  const validateInvite = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/company/invite/${token}`);
      const data = await response.json();

      if (response.ok && data.valid) {
        setInviteData(data.invitation);
        setError('');
      } else {
        setError(data.message || 'Invalid or expired invitation link');
      }
    } catch (err) {
      console.error('Error validating invite:', err);
      setError('Failed to validate invitation. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    validateInvite();
  }, [validateInvite]);

  const handleAcceptInvite = async () => {
    const token = localStorage.getItem('token');

    // If not logged in, redirect to login with return URL
    if (!token) {
      toast.info('Please log in to accept this invitation');
      localStorage.setItem('inviteToken', window.location.pathname);
      navigate(`/login?redirect=${encodeURIComponent(window.location.pathname)}`);
      return;
    }

    setAccepting(true);
    try {
      const response = await fetch(`/api/company/invite/${window.location.pathname.split('/').pop()}/accept`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();

      if (response.ok && data.success) {
        toast.success('Successfully joined the company!');

        // Update user data in localStorage with complete data from backend
        const updatedUser = {
          ...JSON.parse(localStorage.getItem('user') || '{}'),
          companyId: data.company._id,
          // Include any other company-related data from response
          ...(data.user || {})
        };
        localStorage.setItem('user', JSON.stringify(updatedUser));

        // Dispatch event to notify App.js and RoleContext of user update
        window.dispatchEvent(new Event('userUpdated'));

        // Small delay to ensure state propagates before navigation
        setTimeout(() => {
          navigate('/dashboard', { replace: true });
        }, 100);
      } else {
        toast.error(data.message || 'Failed to accept invitation');
        if (response.status === 403) {
          // Email mismatch - suggest logging in with correct account
          setError(data.message);
        }
      }
    } catch (err) {
      console.error('Error accepting invite:', err);
      toast.error('Failed to accept invitation. Please try again.');
    } finally {
      setAccepting(false);
    }
  };

  const handleGoToSignup = () => {
    localStorage.setItem('inviteToken', window.location.pathname);
    localStorage.setItem('inviteEmail', inviteData?.email || '');
    navigate(`/signup?email=${encodeURIComponent(inviteData?.email || '')}`);
  };

  if (loading) {
    return (
      <div className="invite-accept-container">
        <div className="invite-accept-card loading-card">
          <div className="loading-spinner"></div>
          <p>Validating invitation...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="invite-accept-container">
        <div className="invite-accept-card error-card">
          <div className="error-icon">
            <FiX />
          </div>
          <h2>Invalid Invitation</h2>
          <p>{error}</p>
          <button className="btn-primary" onClick={() => navigate('/')}>
            Go to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="invite-accept-container">
      <div className="invite-accept-card">
        <div className="invite-icon-success">
          <FiUsers />
        </div>

        <h1>You're Invited!</h1>
        <p className="invite-subtitle">
          Join your team on <strong>{inviteData?.companyName}</strong>
        </p>

        <div className="invite-details">
          <div className="invite-detail-item">
            <FiBriefcase className="detail-icon" />
            <div>
              <div className="detail-label">Company</div>
              <div className="detail-value">{inviteData?.companyName}</div>
            </div>
          </div>

          {inviteData?.industry && (
            <div className="invite-detail-item">
              <FiAlertCircle className="detail-icon" />
              <div>
                <div className="detail-label">Industry</div>
                <div className="detail-value">{inviteData.industry}</div>
              </div>
            </div>
          )}

          <div className="invite-detail-item">
            <FiCheck className="detail-icon" />
            <div>
              <div className="detail-label">Your Role</div>
              <div className="detail-value">
                <span className="role-badge">{inviteData?.roleInCompany}</span>
              </div>
            </div>
          </div>

          <div className="invite-detail-item">
            <FiAlertCircle className="detail-icon" />
            <div>
              <div className="detail-label">Invited Email</div>
              <div className="detail-value">{inviteData?.email}</div>
            </div>
          </div>
        </div>

        {inviteData?.expiresAt && (
          <div className="invite-expiry-notice">
            This invitation expires on {new Date(inviteData.expiresAt).toLocaleDateString()}
          </div>
        )}

        <div className="invite-actions">
          <button
            className="btn-accept"
            onClick={handleAcceptInvite}
            disabled={accepting}
          >
            {accepting ? 'Accepting...' : 'Accept Invitation'}
          </button>

          {!localStorage.getItem('token') && (
            <>
              <div className="or-divider">or</div>
              <button
                className="btn-signup"
                onClick={handleGoToSignup}
              >
                Create New Account
              </button>
            </>
          )}
        </div>

        <p className="invite-footer">
          By accepting, you agree to join this company workspace and collaborate with your team members.
        </p>
      </div>
    </div>
  );
};

export default InviteAccept;
