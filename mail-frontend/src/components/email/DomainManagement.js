import React, { useState, useEffect, useCallback } from 'react';
import { Eye, EyeOff, Key, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import api from '../../config/api';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import './DomainManagement.css';

const DomainManagement = () => {
  const [domains, setDomains] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchDomainData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/email-accounts/by-verified-domain');

      if (res.data.success) {
        const verifiedDomains = res.data.verifiedDomains || [];
        const emailAccounts = res.data.accounts || [];

        const domainInfoMap = {};

        verifiedDomains.forEach(domain => {
          domainInfoMap[domain] = {
            domain,
            accounts: [],
            totalEmails: 0,
            verified: true
          };
        });

        emailAccounts.forEach(account => {
          const domain = account.domain?.toLowerCase();
          if (domain && domainInfoMap[domain]) {
            domainInfoMap[domain].accounts.push(account);
          }
        });

        setDomains(Object.values(domainInfoMap));
        setAccounts(emailAccounts);
      }
    } catch (err) {
      setError('Failed to load domain information');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDomainData();
  }, [fetchDomainData]);

  if (loading) {
    return (
      <div className="dm-container">
        <div className="dm-loading">
          <div className="dm-spinner"></div>
          <p>Loading domain information...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dm-container">
        <div className="dm-error">
          <p>{error}</p>
          <button className="dm-btn-retry" onClick={fetchDomainData}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="dm-container">
      <div className="dm-header">
        <h2>Domain Information</h2>
        <p>View your email domain and account details</p>
      </div>

      {/* Stats Overview */}
      <div className="dm-stats-row">
        <div className="dm-stat-item">
          <span className="dm-stat-value">{domains.length}</span>
          <span className="dm-stat-label">Total Domains</span>
        </div>
        <div className="dm-stat-item">
          <span className="dm-stat-value">{domains.filter(d => d.verified).length}</span>
          <span className="dm-stat-label">Verified</span>
        </div>
        <div className="dm-stat-item">
          <span className="dm-stat-value">{accounts.length}</span>
          <span className="dm-stat-label">Email Accounts</span>
        </div>
      </div>

      {domains.length === 0 ? (
        <div className="dm-empty">
          <div className="dm-empty-icon">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="12" cy="12" r="10"/>
              <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
            </svg>
          </div>
          <h3>No Domain Found</h3>
          <p>No verified domain is associated with your account. Please contact your administrator.</p>
        </div>
      ) : (
        <div className="dm-domains-list">
          {domains.map((domainInfo, index) => (
            <DomainCard key={index} domainInfo={domainInfo} onRefresh={fetchDomainData} />
          ))}
        </div>
      )}
    </div>
  );
};

const DomainCard = ({ domainInfo, onRefresh }) => {
  const [expanded, setExpanded] = useState(true);
  const [deletingId, setDeletingId] = useState(null);
  const [passwordModal, setPasswordModal] = useState({ open: false, accountId: null, email: '' });
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [resettingPassword, setResettingPassword] = useState(false);

  const handleDeleteAccount = async (accountId, email) => {
    if (!window.confirm(`Are you sure you want to delete the email account "${email}"? This action cannot be undone.`)) {
      return;
    }
    setDeletingId(accountId);
    try {
      await api.delete(`/email-accounts/${accountId}`);
      toast.success(`Account ${email} deleted`);
      if (onRefresh) onRefresh();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete email account');
    } finally {
      setDeletingId(null);
    }
  };

  const openPasswordModal = (accountId, email) => {
    setPasswordModal({ open: true, accountId, email });
    setNewPassword('');
    setConfirmPassword('');
    setShowNewPassword(false);
    setShowConfirmPassword(false);
  };

  const handleResetPassword = async () => {
    if (!newPassword || newPassword.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    setResettingPassword(true);
    try {
      await api.post(`/email-accounts/${passwordModal.accountId}/reset-password`, {
        newPassword
      });
      toast.success(`Password updated for ${passwordModal.email}`);
      setPasswordModal({ open: false, accountId: null, email: '' });
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to reset password');
    } finally {
      setResettingPassword(false);
    }
  };

  // Password strength indicator
  const getPasswordStrength = (pwd) => {
    if (!pwd) return { label: '', color: '', width: '0%' };
    let score = 0;
    if (pwd.length >= 8) score++;
    if (pwd.length >= 12) score++;
    if (/[A-Z]/.test(pwd)) score++;
    if (/[0-9]/.test(pwd)) score++;
    if (/[^A-Za-z0-9]/.test(pwd)) score++;
    if (score <= 2) return { label: 'Weak', color: '#ef4444', width: '33%' };
    if (score <= 3) return { label: 'Medium', color: '#f59e0b', width: '66%' };
    return { label: 'Strong', color: '#22c55e', width: '100%' };
  };

  const strength = getPasswordStrength(newPassword);

  return (
    <div className={`dm-domain-card ${expanded ? 'expanded' : ''}`}>
      <div className="dm-card-header" onClick={() => setExpanded(!expanded)}>
        <div className="dm-card-info">
          <h3 className="dm-domain-name">{domainInfo.domain}</h3>
          <div className="dm-domain-meta">
            <span className={`dm-status ${domainInfo.verified ? 'verified' : 'pending'}`}>
              {domainInfo.verified ? 'Verified' : 'Pending'}
            </span>
            <span className="dm-meta-divider">|</span>
            <span className="dm-accounts-count">{domainInfo.accounts.length} account(s)</span>
          </div>
        </div>
        <button className="dm-expand-btn">
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            style={{ transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}
          >
            <polyline points="6 9 12 15 18 9"/>
          </svg>
        </button>
      </div>

      {expanded && (
        <div className="dm-card-body">
          {/* Domain Details */}
          <div className="dm-details-section">
            <h4>Domain Details</h4>
            <div className="dm-details-grid">
              <div className="dm-detail-row">
                <span className="dm-detail-label">Domain</span>
                <span className="dm-detail-value">{domainInfo.domain}</span>
              </div>
              <div className="dm-detail-row">
                <span className="dm-detail-label">Status</span>
                <span className={`dm-detail-value ${domainInfo.verified ? 'text-success' : 'text-warning'}`}>
                  {domainInfo.verified ? 'Active & Verified' : 'Pending Verification'}
                </span>
              </div>
              <div className="dm-detail-row">
                <span className="dm-detail-label">Email Accounts</span>
                <span className="dm-detail-value">{domainInfo.accounts.length}</span>
              </div>
            </div>
          </div>

          {/* Email Accounts */}
          {domainInfo.accounts.length > 0 && (
            <div className="dm-accounts-section">
              <h4>Email Accounts</h4>
              <div className="dm-accounts-list">
                {domainInfo.accounts.map(account => (
                  <div key={account._id} className="dm-account-item">
                    <div className="dm-account-avatar">
                      {account.email?.charAt(0).toUpperCase() || 'E'}
                    </div>
                    <div className="dm-account-details">
                      <span className="dm-account-email">{account.email}</span>
                      <span className="dm-account-type">{account.accountType || 'hosted'}</span>
                    </div>
                    <span className={`dm-account-status ${account.enabled ? 'active' : 'inactive'}`}>
                      {account.enabled ? 'Active' : 'Inactive'}
                    </span>
                    {/* Reset Password Button */}
                    <button
                      className="dm-account-action-btn"
                      title="Reset password"
                      onClick={() => openPasswordModal(account._id, account.email)}
                      style={{
                        width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        borderRadius: '8px', border: 'none', background: 'transparent', cursor: 'pointer',
                        color: '#6b7280', transition: 'all 0.15s'
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = '#f3f4f6'; e.currentTarget.style.color = '#0b57d0'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#6b7280'; }}
                    >
                      <Key size={16} />
                    </button>
                    {/* Delete Button */}
                    <button
                      className="dm-account-delete-btn"
                      title="Delete account"
                      disabled={deletingId === account._id}
                      onClick={() => handleDeleteAccount(account._id, account.email)}
                    >
                      {deletingId === account._id ? (
                        <span className="dm-delete-spinner"></span>
                      ) : (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <polyline points="3 6 5 6 21 6"/>
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                          <line x1="10" y1="11" x2="10" y2="17"/>
                          <line x1="14" y1="11" x2="14" y2="17"/>
                        </svg>
                      )}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* DNS Information */}
          <div className="dm-dns-section">
            <h4>DNS Configuration</h4>
            <p className="dm-dns-note">
              Your domain is configured to use our mail servers. DNS records are managed by your system administrator.
            </p>
            <div className="dm-dns-records">
              <div className="dm-dns-record">
                <span className="dm-record-type">MX</span>
                <span className="dm-record-value">mail.noxtm.com (Priority 10)</span>
              </div>
              <div className="dm-dns-record">
                <span className="dm-record-type">A</span>
                <span className="dm-record-value">mail.{domainInfo.domain} - 185.137.122.61</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Password Reset Modal */}
      <Dialog open={passwordModal.open} onOpenChange={(open) => { if (!open) setPasswordModal({ open: false, accountId: null, email: '' }); }}>
        <DialogContent className="sm:max-w-[440px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Key className="h-5 w-5 text-blue-600" />
              Reset Password
            </DialogTitle>
            <DialogDescription>
              Set a new password for <strong>{passwordModal.email}</strong>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* New Password */}
            <div className="space-y-2">
              <Label htmlFor="new-pwd" className="text-sm font-medium">New Password</Label>
              <div className="relative">
                <Input
                  id="new-pwd"
                  type={showNewPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Minimum 8 characters"
                  className="pr-10"
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  tabIndex={-1}
                >
                  {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {/* Strength Bar */}
              {newPassword && (
                <div className="space-y-1">
                  <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{ width: strength.width, backgroundColor: strength.color }}
                    />
                  </div>
                  <span className="text-[11px] font-medium" style={{ color: strength.color }}>
                    {strength.label}
                  </span>
                </div>
              )}
            </div>

            {/* Confirm Password */}
            <div className="space-y-2">
              <Label htmlFor="confirm-pwd" className="text-sm font-medium">Confirm Password</Label>
              <div className="relative">
                <Input
                  id="confirm-pwd"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter password"
                  className="pr-10"
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  tabIndex={-1}
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {confirmPassword && newPassword !== confirmPassword && (
                <span className="text-[11px] text-red-500">Passwords do not match</span>
              )}
              {confirmPassword && newPassword === confirmPassword && confirmPassword.length >= 8 && (
                <span className="text-[11px] text-green-500">Passwords match</span>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setPasswordModal({ open: false, accountId: null, email: '' })}
            >
              Cancel
            </Button>
            <Button
              onClick={handleResetPassword}
              disabled={resettingPassword || !newPassword || newPassword.length < 8 || newPassword !== confirmPassword}
              className="gap-2"
            >
              {resettingPassword ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Updating...
                </>
              ) : (
                'Update Password'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DomainManagement;
