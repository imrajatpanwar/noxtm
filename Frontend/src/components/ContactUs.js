import React, { useState } from 'react';
import './PolicyPages.css';

const initialState = { name: '', email: '', subject: '', message: '' };

const ContactUs = () => {
  const [form, setForm] = useState(initialState);
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus(null);

    if (!form.name || !form.email || !form.message) {
      setStatus({ type: 'error', message: 'Please fill required fields.' });
      return;
    }
    setSubmitting(true);

    try {
      // Placeholder for actual API integration
      await new Promise(r => setTimeout(r, 900));
      setStatus({ type: 'success', message: 'Message sent! We will reply shortly.' });
      setForm(initialState);
    } catch (err) {
      setStatus({ type: 'error', message: 'Something went wrong. Try again later.' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="policy-wrapper">
      <h1>Contact Us</h1>
      <p className="intro">Have a question about features, billing, security, or partnerships? Send us a note and the right team member will follow up.</p>

      <form className="contact-form" onSubmit={handleSubmit} noValidate>
        <div className="form-grid">
          <label>
            <span>Name *</span>
            <input name="name" value={form.name} onChange={handleChange} placeholder="Your full name" required />
          </label>
          <label>
            <span>Email *</span>
            <input type="email" name="email" value={form.email} onChange={handleChange} placeholder="you@example.com" required />
          </label>
          <label>
            <span>Subject</span>
            <input name="subject" value={form.subject} onChange={handleChange} placeholder="(Optional)" />
          </label>
          <label className="full">
            <span>Message *</span>
            <textarea name="message" rows="6" value={form.message} onChange={handleChange} placeholder="Tell us how we can help" required />
          </label>
        </div>
        <button type="submit" className="submit-btn" disabled={submitting}>{submitting ? 'Sending...' : 'Send Message'}</button>
        {status && <div className={`form-status ${status.type}`}>{status.message}</div>}
      </form>

      <section>
        <h2>Other Ways to Reach Us</h2>
        <ul>
          <li>Email: support@noxtm.com</li>
          <li>Sales: sales@noxtm.com</li>
          <li>Status Page: status.noxtm.com</li>
        </ul>
      </section>

      <footer className="policy-footer">We aim to respond within 1 business day.</footer>
    </div>
  );
};

export default ContactUs;