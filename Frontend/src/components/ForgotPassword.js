import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import api from '../config/api';
import { FiMail, FiLock, FiArrowLeft, FiCheck, FiX, FiAlertCircle } from 'react-icons/fi';
import './ForgotPassword.css';

const ForgotPassword = () => {
  const [step, setStep] = useState(1); // 1: Email, 2: Code & Password
  const [email, setEmail] = useState('');
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [passwordStrength, setPasswordStrength] = useState('');
  const [resendTimer, setResendTimer] = useState(0);
  const navigate = useNavigate();
  const codeInputRefs = useRef([]);

  // Timer for resend code
  useEffect(() => {
    let interval;
    if (resendTimer > 0) {
      interval = setInterval(() => {
        setResendTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [resendTimer]);

  // Password strength calculator
  useEffect(() => {
    if (!newPassword) {
      setPasswordStrength('');
      return;
    }

    let strength = 0;
    if (newPassword.length >= 8) strength++;
    if (/[a-z]/.test(newPassword) && /[A-Z]/.test(newPassword)) strength++;
    if (/\d/.test(newPassword)) strength++;
    if (/[^a-zA-Z0-9]/.test(newPassword)) strength++;

    if (strength <= 1) setPasswordStrength('weak');
    else if (strength <= 2) setPasswordStrength('medium');
    else setPasswordStrength('strong');
  }, [newPassword]);

  const handleSendCode = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      const response = await api.post('/forgot-password', {
        email: email.trim()
      });

      if (response.data.success) {
        setMessage({ type: 'success', text: 'Verification code sent to your email!' });
        setStep(2);
        setResendTimer(60); // 60 seconds cooldown
        toast.success('Verification code sent!');
      }
    } catch (err) {
      const errorMsg = err.response?.data?.message || 'Failed to send verification code';
      setMessage({ type: 'error', text: errorMsg });
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleCodeChange = (index, value) => {
    // Only allow digits
    if (!/^\d*$/.test(value)) return;

    const newCode = [...code];
    newCode[index] = value.slice(-1); // Take only last character
    setCode(newCode);

    // Auto-focus next input
    if (value && index < 5) {
      codeInputRefs.current[index + 1]?.focus();
    }
  };

  const handleCodeKeyDown = (index, e) => {
    // Handle backspace
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      codeInputRefs.current[index - 1]?.focus();
    }
  };

  const handleCodePaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').trim();

    // Check if pasted data is 6 digits
    if (/^\d{6}$/.test(pastedData)) {
      const newCode = pastedData.split('');
      setCode(newCode);
      codeInputRefs.current[5]?.focus();
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: '', text: '' });

    // Validate passwords match
    if (newPassword !== confirmPassword) {
      setMessage({ type: 'error', text: 'Passwords do not match' });
      setLoading(false);
      toast.error('Passwords do not match');
      return;
    }

    // Validate password length
    if (newPassword.length < 6) {
      setMessage({ type: 'error', text: 'Password must be at least 6 characters long' });
      setLoading(false);
      toast.error('Password must be at least 6 characters');
      return;
    }

    try {
      const verificationCode = code.join('');
      const response = await api.post('/reset-password', {
        email: email.trim(),
        code: verificationCode,
        newPassword
      });

      if (response.data.success) {
        setMessage({ type: 'success', text: 'Password reset successfully!' });
        toast.success('Password reset successfully!');

        setTimeout(() => {
          navigate('/login');
        }, 2000);
      }
    } catch (err) {
      const errorMsg = err.response?.data?.message || 'Failed to reset password';
      setMessage({ type: 'error', text: errorMsg });
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    if (resendTimer > 0) return;

    setLoading(true);
    try {
      const response = await api.post('/forgot-password', {
        email: email.trim()
      });

      if (response.data.success) {
        toast.success('New code sent to your email!');
        setResendTimer(60);
        setCode(['', '', '', '', '', '']);
        codeInputRefs.current[0]?.focus();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to resend code');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="forgot-password-page">
      <div className="forgot-password-container">
        <div className="forgot-password-header">
          <div className="forgot-password-icon">
            {step === 1 ? <FiMail /> : <FiLock />}
          </div>
          <h1 className="forgot-password-title">
            {step === 1 ? 'Forgot Password?' : 'Reset Password'}
          </h1>
          <p className="forgot-password-subtitle">
            {step === 1
              ? "Enter your email address and we'll send you a verification code to reset your password."
              : 'Enter the 6-digit code sent to your email and create a new password.'}
          </p>
        </div>

        {message.text && (
          <div className={`alert-message alert-${message.type}`}>
            {message.type === 'success' ? <FiCheck /> :
             message.type === 'error' ? <FiX /> : <FiAlertCircle />}
            <span>{message.text}</span>
          </div>
        )}

        {step === 1 ? (
          // Step 1: Email Input
          <form onSubmit={handleSendCode} className="forgot-password-form">
            <div className="form-group">
              <label htmlFor="email">Email Address</label>
              <input
                type="email"
                id="email"
                className="form-input"
                placeholder="Enter your email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
                autoFocus
              />
            </div>

            <button
              type="submit"
              className={`submit-button ${loading ? 'loading' : ''}`}
              disabled={loading}
            >
              {loading ? '' : 'Send Verification Code'}
            </button>

            <div className="back-links">
              <button type="button" className="back-link" onClick={() => navigate('/login')}>
                <FiArrowLeft />
                Back to Login
              </button>
            </div>
          </form>
        ) : (
          // Step 2: Code & New Password Input
          <form onSubmit={handleResetPassword} className="forgot-password-form">
            <div className="form-group">
              <label>Verification Code</label>
              <div className="code-input-container" onPaste={handleCodePaste}>
                {code.map((digit, index) => (
                  <input
                    key={index}
                    ref={(el) => (codeInputRefs.current[index] = el)}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    className="code-digit"
                    value={digit}
                    onChange={(e) => handleCodeChange(index, e.target.value)}
                    onKeyDown={(e) => handleCodeKeyDown(index, e)}
                    disabled={loading}
                    autoFocus={index === 0}
                  />
                ))}
              </div>
              <div className="resend-code-container">
                <button
                  type="button"
                  className="resend-code-button"
                  onClick={handleResendCode}
                  disabled={resendTimer > 0 || loading}
                >
                  {resendTimer > 0 ? `Resend in ${resendTimer}s` : 'Resend Code'}
                </button>
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="newPassword">New Password</label>
              <input
                type="password"
                id="newPassword"
                className="form-input"
                placeholder="Enter new password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                disabled={loading}
              />
              {newPassword && (
                <>
                  <div className="password-strength-indicator">
                    <div className={`password-strength-bar ${passwordStrength}`}></div>
                  </div>
                  <div className="password-strength-text">
                    Password strength: {passwordStrength === 'weak' ? 'Weak' :
                                       passwordStrength === 'medium' ? 'Medium' : 'Strong'}
                  </div>
                </>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="confirmPassword">Confirm Password</label>
              <input
                type="password"
                id="confirmPassword"
                className="form-input"
                placeholder="Confirm new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                disabled={loading}
              />
            </div>

            <button
              type="submit"
              className={`submit-button ${loading ? 'loading' : ''}`}
              disabled={loading || code.some(d => !d)}
            >
              {loading ? '' : 'Reset Password'}
            </button>

            <div className="back-links">
              <button type="button" className="back-link" onClick={() => setStep(1)}>
                <FiArrowLeft />
                Back
              </button>
              <span className="link-separator">•</span>
              <button type="button" className="back-link" onClick={() => navigate('/login')}>
                Back to Login
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default ForgotPassword;
