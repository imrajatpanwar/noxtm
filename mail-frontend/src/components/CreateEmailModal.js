import React, { useState, useEffect } from 'react';
import { Mail, Lock, CheckCircle, AlertTriangle, Eye, EyeOff } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import api from '../config/api';

function CreateEmailModal({ isOpen, onClose, onSuccess }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [passwordStrength, setPasswordStrength] = useState('');
  const [verifiedDomains, setVerifiedDomains] = useState([]);
  const [selectedDomain, setSelectedDomain] = useState('');
  const [loadingDomains, setLoadingDomains] = useState(true);

  useEffect(() => {
    if (isOpen) {
      fetchVerifiedDomains();
    }
  }, [isOpen]);

  const fetchVerifiedDomains = async () => {
    try {
      setLoadingDomains(true);
      const response = await api.get('/email-accounts/by-verified-domain');

      if (response.data.success && response.data.verifiedDomains) {
        const domains = response.data.verifiedDomains;
        setVerifiedDomains(domains);
        if (domains.length > 0) {
          setSelectedDomain(domains[0]);
        } else {
          setSelectedDomain('');
        }
      } else {
        setSelectedDomain('');
      }
    } catch (err) {
      setSelectedDomain('');
    } finally {
      setLoadingDomains(false);
    }
  };

  const isValidUsername = (user) => {
    const regex = /^[a-z0-9._-]+$/;
    return regex.test(user) && user.length >= 3 && user.length <= 30;
  };

  const checkPasswordStrength = (pass) => {
    if (pass.length < 6) return 'weak';
    if (pass.length < 10) return 'medium';
    if (pass.length >= 12 && /[A-Z]/.test(pass) && /[0-9]/.test(pass) && /[!@#$%^&*]/.test(pass)) {
      return 'strong';
    }
    return 'medium';
  };

  const handlePasswordChange = (e) => {
    const newPassword = e.target.value;
    setPassword(newPassword);
    setPasswordStrength(checkPasswordStrength(newPassword));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!username) {
      setError('Username is required');
      return;
    }
    if (!isValidUsername(username)) {
      setError('Username must be 3-30 characters and contain only lowercase letters, numbers, dots, hyphens, or underscores');
      return;
    }
    if (!password || password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (!selectedDomain || selectedDomain === '') {
      setError('Please add a domain first. Go to Domain Management to add your domain.');
      return;
    }

    setLoading(true);

    try {
      const response = await api.post('/email-accounts/create-hosted', {
        username,
        password,
        domain: selectedDomain
      });
      localStorage.setItem('lastCreatedDomain', selectedDomain);

      setUsername('');
      setPassword('');
      setConfirmPassword('');
      setPasswordStrength('');

      if (onSuccess) {
        onSuccess(response.data);
      }
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create email account. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const fullEmail = username ? `${username}@${selectedDomain}` : `@${selectedDomain}`;

  const strengthColor = {
    weak: 'bg-red-500',
    medium: 'bg-amber-500',
    strong: 'bg-emerald-500',
  };

  const strengthWidth = {
    weak: 'w-1/3',
    medium: 'w-2/3',
    strong: 'w-full',
  };

  const strengthTextColor = {
    weak: 'text-red-500',
    medium: 'text-amber-500',
    strong: 'text-emerald-500',
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Mail className="h-5 w-5" />
            Create New Email Account
          </DialogTitle>
          <DialogDescription>
            Set up a new email address on your verified domain.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Domain */}
          <div className="space-y-2">
            <Label className="flex items-center gap-1.5">
              <Mail className="h-3.5 w-3.5" />
              Domain
            </Label>
            {loadingDomains ? (
              <div className="flex items-center h-9 px-3 rounded-md border border-border bg-muted text-sm text-muted-foreground">
                Loading verified domains...
              </div>
            ) : verifiedDomains.length > 0 ? (
              <div className="flex items-center h-9 px-3 rounded-md border border-border bg-muted text-sm font-medium text-foreground">
                @{selectedDomain}
              </div>
            ) : (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
                <div className="flex items-center gap-2 text-sm font-medium text-amber-800 mb-1">
                  <AlertTriangle className="h-4 w-4" />
                  No domains available
                </div>
                <p className="text-xs text-amber-700">
                  You need to add and verify your own domain before creating email accounts.
                  Please go to <strong>Domain Management</strong> to add your domain.
                </p>
              </div>
            )}
          </div>

          {/* Username */}
          <div className="space-y-2">
            <Label htmlFor="username" className="flex items-center gap-1.5">
              <Mail className="h-3.5 w-3.5" />
              Username
            </Label>
            <div className="flex">
              <Input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value.toLowerCase())}
                placeholder="username"
                disabled={loading || loadingDomains}
                autoFocus
                className="rounded-r-none border-r-0"
              />
              <div className="flex items-center px-3 rounded-r-md border border-border bg-muted text-sm text-muted-foreground whitespace-nowrap">
                @{selectedDomain}
              </div>
            </div>
            {username && (
              <p className="text-xs font-medium text-primary">{fullEmail}</p>
            )}
            <p className="text-xs text-muted-foreground">
              Use lowercase letters, numbers, dots, hyphens, or underscores (3-30 characters)
            </p>
          </div>

          {/* Password */}
          <div className="space-y-2">
            <Label htmlFor="password" className="flex items-center gap-1.5">
              <Lock className="h-3.5 w-3.5" />
              Password
            </Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={handlePasswordChange}
                placeholder="Enter password"
                disabled={loading}
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/60 hover:text-muted-foreground cursor-pointer"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {password && (
              <div className="space-y-1">
                <div className="h-1 w-full rounded-full bg-[#e2e8f0] overflow-hidden">
                  <div className={`h-full rounded-full transition-all duration-300 ${strengthWidth[passwordStrength]} ${strengthColor[passwordStrength]}`} />
                </div>
                <p className={`text-xs font-medium ${strengthTextColor[passwordStrength]}`}>
                  {passwordStrength === 'weak' && 'Weak password'}
                  {passwordStrength === 'medium' && 'Medium strength'}
                  {passwordStrength === 'strong' && 'Strong password'}
                </p>
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              Minimum 6 characters. For better security, use 12+ characters with uppercase, numbers, and symbols.
            </p>
          </div>

          {/* Confirm Password */}
          <div className="space-y-2">
            <Label htmlFor="confirmPassword" className="flex items-center gap-1.5">
              <CheckCircle className="h-3.5 w-3.5" />
              Confirm Password
            </Label>
            <div className="relative">
              <Input
                id="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter password"
                disabled={loading}
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/60 hover:text-muted-foreground cursor-pointer"
                tabIndex={-1}
              >
                {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {confirmPassword && password !== confirmPassword && (
              <p className="text-xs text-red-500">Passwords do not match</p>
            )}
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading || !username || !password || !confirmPassword}
            >
              {loading ? 'Creating Account...' : 'Create Email Account'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default CreateEmailModal;
