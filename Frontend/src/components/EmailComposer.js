import React, { useState } from 'react';
import api from '../config/api';
import { FiMail, FiSend, FiCheckCircle, FiAlertCircle } from 'react-icons/fi';
import './EmailComposer.css';

function EmailComposer() {
  const [formData, setFormData] = useState({
    to: '',
    subject: '',
    body: '',
    isHtml: false
  });
  const [sending, setSending] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validation
    if (!formData.to || !formData.subject || !formData.body) {
      setError('Please fill in all required fields');
      return;
    }

    // Simple email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.to)) {
      setError('Please enter a valid email address');
      return;
    }

    try {
      setSending(true);
      setError('');
      setSuccess('');

      await api.post('/noxtm-mail/send', {
        to: formData.to,
        subject: formData.subject,
        body: formData.body,
        isHtml: formData.isHtml
      });

      setSuccess('Email sent successfully!');

      // Reset form after 2 seconds
      setTimeout(() => {
        setFormData({
          to: '',
          subject: '',
          body: '',
          isHtml: false
        });
        setSuccess('');
      }, 3000);

    } catch (err) {
      console.error('Failed to send email:', err);
      setError(err.response?.data?.message || 'Failed to send email. Please try again.');
    } finally {
      setSending(false);
    }
  };

  const handleSendTest = async () => {
    try {
      setSending(true);
      setError('');
      setSuccess('');

      await api.post('/noxtm-mail/test');
      setSuccess('Test email sent successfully!');
    } catch (err) {
      console.error('Failed to send test email:', err);
      setError(err.response?.data?.message || 'Failed to send test email.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="email-composer">
      {/* Header */}
      <div className="composer-header">
        <h2>
          <FiMail className="header-icon" />
          Send Email
        </h2>
        <button
          onClick={handleSendTest}
          className="btn-test"
          disabled={sending}
        >
          <FiSend /> Send Test Email
        </button>
      </div>

      {/* Success/Error Messages */}
      {success && (
        <div className="message message-success">
          <FiCheckCircle />
          <span>{success}</span>
        </div>
      )}

      {error && (
        <div className="message message-error">
          <FiAlertCircle />
          <span>{error}</span>
        </div>
      )}

      {/* Email Form */}
      <div className="composer-card">
        <form onSubmit={handleSubmit} className="composer-form">
          {/* To Field */}
          <div className="form-group">
            <label htmlFor="to">
              To <span className="required">*</span>
            </label>
            <input
              type="email"
              id="to"
              name="to"
              value={formData.to}
              onChange={handleChange}
              placeholder="recipient@example.com"
              className="form-input"
              disabled={sending}
            />
            <small className="form-hint">Enter recipient email address</small>
          </div>

          {/* Subject Field */}
          <div className="form-group">
            <label htmlFor="subject">
              Subject <span className="required">*</span>
            </label>
            <input
              type="text"
              id="subject"
              name="subject"
              value={formData.subject}
              onChange={handleChange}
              placeholder="Email subject"
              className="form-input"
              disabled={sending}
            />
          </div>

          {/* HTML Checkbox */}
          <div className="form-group form-group-checkbox">
            <label className="checkbox-label">
              <input
                type="checkbox"
                name="isHtml"
                checked={formData.isHtml}
                onChange={handleChange}
                disabled={sending}
              />
              <span>Send as HTML</span>
            </label>
            <small className="form-hint">
              Enable if you want to include HTML formatting in your email
            </small>
          </div>

          {/* Body Field */}
          <div className="form-group">
            <label htmlFor="body">
              Message Body <span className="required">*</span>
            </label>
            <textarea
              id="body"
              name="body"
              value={formData.body}
              onChange={handleChange}
              placeholder={formData.isHtml ?
                "<h1>Hello!</h1>\n<p>Your message here...</p>" :
                "Your message here..."}
              className="form-textarea"
              rows={12}
              disabled={sending}
            />
            {formData.isHtml && (
              <small className="form-hint form-hint-warning">
                ⚠️ Make sure your HTML is properly formatted
              </small>
            )}
          </div>

          {/* Submit Button */}
          <div className="form-actions">
            <button
              type="submit"
              className="btn-submit"
              disabled={sending}
            >
              <FiSend />
              {sending ? 'Sending...' : 'Send Email'}
            </button>
          </div>
        </form>
      </div>

      {/* Info Cards */}
      <div className="info-cards">
        <div className="info-card">
          <h3>Email Sending Info</h3>
          <ul>
            <li>Emails are sent from: <code>noreply@noxtm.com</code></li>
            <li>All sent emails are logged in the Email Logs section</li>
            <li>Failed emails will be retried automatically</li>
            <li>Check DNS Configuration to ensure proper email delivery</li>
          </ul>
        </div>

        <div className="info-card">
          <h3>Best Practices</h3>
          <ul>
            <li>Use clear and descriptive subject lines</li>
            <li>Test HTML emails before sending to large audiences</li>
            <li>Avoid spam trigger words in subject and body</li>
            <li>Include an unsubscribe link for marketing emails</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

export default EmailComposer;
