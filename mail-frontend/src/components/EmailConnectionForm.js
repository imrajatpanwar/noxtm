import React, { useState } from 'react';
import { Mail, Lock, AlertCircle, Eye, EyeOff, LogIn } from 'lucide-react';
import { Skeleton } from './ui/skeleton';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import api from '../config/api';
import { toast } from 'sonner';

function EmailConnectionForm({ onSuccess, onCancel }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await api.post('/email-accounts/connect', {
        email: email.trim(),
        password
      });

      if (response.data.success) {
        toast.success('Email connected successfully!');
        if (onSuccess) {
          onSuccess(response.data.account);
        }
      } else {
        setError(response.data.message || 'Failed to connect');
      }
    } catch (err) {
      const errorMessage = err.response?.data?.message || 'Failed to connect to email account';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        {/* Header */}
        <div className="px-8 pt-8 pb-4 text-center">
          <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-blue-50 flex items-center justify-center">
            <Mail className="h-7 w-7 text-blue-600" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-1">
            Connect Your Email
          </h3>
          <p className="text-sm text-gray-500">
            Enter your admin-provided email credentials to get started
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-8 pb-8 space-y-5">
          {/* Email Field */}
          <div className="space-y-2">
            <Label htmlFor="connect-email" className="text-sm font-medium text-gray-700 flex items-center gap-1.5">
              <Mail className="h-3.5 w-3.5 text-gray-400" />
              Email Address
            </Label>
            <Input
              id="connect-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your.email@company.com"
              required
              disabled={loading}
              autoComplete="email"
              className="h-11 bg-gray-50 border-gray-200 focus:bg-white transition-colors"
            />
          </div>

          {/* Password Field */}
          <div className="space-y-2">
            <Label htmlFor="connect-password" className="text-sm font-medium text-gray-700 flex items-center gap-1.5">
              <Lock className="h-3.5 w-3.5 text-gray-400" />
              Password
            </Label>
            <div className="relative">
              <Input
                id="connect-password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your email password"
                required
                disabled={loading}
                autoComplete="current-password"
                className="h-11 bg-gray-50 border-gray-200 focus:bg-white transition-colors pr-10"
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 border border-red-100">
              <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {/* Submit Button */}
          <Button
            type="submit"
            disabled={loading}
            className="w-full h-11 gap-2 text-sm font-medium rounded-lg"
          >
            {loading ? (
              <>
                <Skeleton className="h-4 w-4 rounded-full" />
                Connecting...
              </>
            ) : (
              <>
                <LogIn className="h-4 w-4" />
                Connect to Email
              </>
            )}
          </Button>

          {/* Cancel Button */}
          {onCancel && (
            <Button
              type="button"
              variant="ghost"
              onClick={onCancel}
              className="w-full h-10 text-sm text-gray-500"
            >
              Cancel
            </Button>
          )}
        </form>

        {/* Footer */}
        <div className="px-8 py-4 bg-gray-50 border-t border-gray-100">
          <p className="text-xs text-gray-400 text-center">
            Don't have your email credentials? Contact your workspace administrator.
          </p>
        </div>
      </div>
    </div>
  );
}

export default EmailConnectionForm;
