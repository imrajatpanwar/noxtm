import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import './CompanySetup.css';

const CompanySetup = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    companyName: '',
    companyEmail: '',
    companyPhone: '',
    companyWebsite: '',
    companyType: 'Business',
    industryType: '',
    companySize: '',
    description: '',
    companyAddress: '',
    companyCity: '',
    companyState: '',
    companyCountry: '',
    companyZipCode: '',
    gstin: ''
  });

  // Redirect if user already has a company
  useEffect(() => {
    const user = localStorage.getItem('user');
    if (user) {
      try {
        const userData = JSON.parse(user);
        if (userData.companyId) {
          const subscription = userData.subscription;
          const hasActive = subscription && (
            subscription.status === 'active' ||
            (subscription.status === 'trial' && subscription.endDate && new Date(subscription.endDate) > new Date())
          );
          navigate(hasActive ? '/dashboard' : '/pricing');
        }
      } catch (e) {}
    }
  }, [navigate]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.companyName || !formData.companyEmail || !formData.industryType) {
      toast.error('Please fill in all required fields');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/company/setup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (response.ok && data.success) {
        const storedUser = JSON.parse(localStorage.getItem('user'));
        storedUser.companyId = data.companyId;
        localStorage.setItem('user', JSON.stringify(storedUser));
        window.dispatchEvent(new Event('userUpdated'));

        toast.success('Company setup completed!');
        navigate('/pricing');
      } else {
        toast.error(data.message || 'Failed to setup company details');
      }
    } catch (error) {
      console.error('Company setup error:', error);
      toast.error('Failed to setup company. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="cs-page">
      <div className="cs-container">
        {/* Progress Stepper */}
        <div className="cs-stepper">
          <div className="cs-step active">
            <div className="cs-step-circle">1</div>
            <span>Company Details</span>
          </div>
          <div className="cs-step-line"></div>
          <div className="cs-step">
            <div className="cs-step-circle">2</div>
            <span>Choose Plan</span>
          </div>
          <div className="cs-step-line"></div>
          <div className="cs-step">
            <div className="cs-step-circle">3</div>
            <span>Get Started</span>
          </div>
        </div>

        <div className="cs-card">
          <div className="cs-header">
            <h1>Set Up Your Workspace</h1>
            <p>Tell us about your organization. This information will appear in your workspace settings and invoices.</p>
          </div>

          <form onSubmit={handleSubmit} className="cs-form">
            {/* Section 1: Basic Information */}
            <div className="cs-section">
              <div className="cs-section-label">
                <div className="cs-section-icon">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
                </div>
                <span>Basic Information</span>
              </div>

              <div className="cs-row">
                <div className="cs-field">
                  <label>Company Name <span className="cs-req">*</span></label>
                  <input
                    type="text"
                    name="companyName"
                    value={formData.companyName}
                    onChange={handleChange}
                    placeholder="Your company name"
                    required
                  />
                </div>
                <div className="cs-field">
                  <label>Company Email <span className="cs-req">*</span></label>
                  <input
                    type="email"
                    name="companyEmail"
                    value={formData.companyEmail}
                    onChange={handleChange}
                    placeholder="contact@company.com"
                    required
                  />
                </div>
              </div>

              <div className="cs-row">
                <div className="cs-field">
                  <label>Phone Number</label>
                  <input
                    type="tel"
                    name="companyPhone"
                    value={formData.companyPhone}
                    onChange={handleChange}
                    placeholder="+91 XXXXX XXXXX"
                  />
                </div>
                <div className="cs-field">
                  <label>Website</label>
                  <input
                    type="url"
                    name="companyWebsite"
                    value={formData.companyWebsite}
                    onChange={handleChange}
                    placeholder="https://www.company.com"
                  />
                </div>
              </div>
            </div>

            {/* Section 2: Organization Details */}
            <div className="cs-section">
              <div className="cs-section-label">
                <div className="cs-section-icon">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>
                </div>
                <span>Organization Details</span>
              </div>

              <div className="cs-row">
                <div className="cs-field">
                  <label>Workspace Type <span className="cs-req">*</span></label>
                  <select name="companyType" value={formData.companyType} onChange={handleChange} required>
                    <option value="Business">Business</option>
                    <option value="Personal">Personal</option>
                    <option value="Enterprise">Enterprise</option>
                    <option value="Educational">Educational</option>
                  </select>
                </div>
                <div className="cs-field">
                  <label>Industry Type <span className="cs-req">*</span></label>
                  <select name="industryType" value={formData.industryType} onChange={handleChange} required>
                    <option value="">Select Industry</option>
                    <option value="technology">Technology</option>
                    <option value="finance">Finance</option>
                    <option value="healthcare">Healthcare</option>
                    <option value="retail">Retail</option>
                    <option value="manufacturing">Manufacturing</option>
                    <option value="education">Education</option>
                    <option value="real-estate">Real Estate</option>
                    <option value="hospitality">Hospitality</option>
                    <option value="consulting">Consulting</option>
                    <option value="marketing">Marketing & Advertising</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>

              <div className="cs-row">
                <div className="cs-field">
                  <label>Company Size</label>
                  <select name="companySize" value={formData.companySize} onChange={handleChange}>
                    <option value="">Select Size</option>
                    <option value="1-10">1–10 employees</option>
                    <option value="11-50">11–50 employees</option>
                    <option value="51-200">51–200 employees</option>
                    <option value="201-500">201–500 employees</option>
                    <option value="500+">500+ employees</option>
                  </select>
                </div>
                <div className="cs-field">
                  <label>Description</label>
                  <input
                    type="text"
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    placeholder="Brief description of your organization"
                  />
                </div>
              </div>
            </div>

            {/* Section 3: Address Details */}
            <div className="cs-section">
              <div className="cs-section-label">
                <div className="cs-section-icon">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                </div>
                <span>Address</span>
              </div>

              <div className="cs-field cs-full">
                <label>Street Address</label>
                <input
                  type="text"
                  name="companyAddress"
                  value={formData.companyAddress}
                  onChange={handleChange}
                  placeholder="Street address, building number"
                />
              </div>

              <div className="cs-row">
                <div className="cs-field">
                  <label>City</label>
                  <input type="text" name="companyCity" value={formData.companyCity} onChange={handleChange} placeholder="City" />
                </div>
                <div className="cs-field">
                  <label>State</label>
                  <input type="text" name="companyState" value={formData.companyState} onChange={handleChange} placeholder="State" />
                </div>
              </div>

              <div className="cs-row">
                <div className="cs-field">
                  <label>Country</label>
                  <input type="text" name="companyCountry" value={formData.companyCountry} onChange={handleChange} placeholder="Country" />
                </div>
                <div className="cs-field">
                  <label>Zip Code</label>
                  <input type="text" name="companyZipCode" value={formData.companyZipCode} onChange={handleChange} placeholder="Zip / Postal Code" />
                </div>
              </div>
            </div>

            {/* Section 4: Tax Information */}
            <div className="cs-section cs-section-last">
              <div className="cs-section-label">
                <div className="cs-section-icon">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
                </div>
                <span>Tax Information (Optional)</span>
              </div>

              <div className="cs-field cs-full">
                <label>GSTIN / Tax ID</label>
                <input
                  type="text"
                  name="gstin"
                  value={formData.gstin}
                  onChange={handleChange}
                  placeholder="Enter GSTIN or Tax ID"
                />
              </div>
            </div>

            <div className="cs-actions">
              <button type="submit" className="cs-submit-btn" disabled={loading}>
                {loading ? (
                  <>
                    <svg className="cs-spinner" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>
                    Setting up...
                  </>
                ) : (
                  <>
                    Continue to Plans
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CompanySetup;