import React, { useState } from 'react';
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
    companyAddress: '',
    companyCity: '',
    companyState: '',
    companyCountry: '',
    companyZipCode: '',
    companyWebsite: '',
    industryType: '',
    companySize: '',
    gstin: ''
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate required fields
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
        // Update user data in localStorage
        const storedUser = JSON.parse(localStorage.getItem('user'));
        storedUser.companyId = data.companyId;
        localStorage.setItem('user', JSON.stringify(storedUser));

        toast.success('Company setup completed successfully!');
        navigate('/dashboard');
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

  const handleSkip = () => {
    toast.info('You can add company details later from settings');
    navigate('/dashboard');
  };

  return (
    <div className="company-setup-container">
      <div className="company-setup-card">
        <div className="company-setup-header">
          <h1>Complete Your Company Profile</h1>
          <p>Help us understand your business better. This information will be used for invoicing and personalization.</p>
        </div>

        <form onSubmit={handleSubmit} className="company-setup-form">
          <div className="form-section">
            <h3>Basic Information</h3>
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="companyName">Company Name <span className="required">*</span></label>
                <input
                  type="text"
                  id="companyName"
                  name="companyName"
                  value={formData.companyName}
                  onChange={handleChange}
                  placeholder="Enter company name"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="companyEmail">Company Email <span className="required">*</span></label>
                <input
                  type="email"
                  id="companyEmail"
                  name="companyEmail"
                  value={formData.companyEmail}
                  onChange={handleChange}
                  placeholder="company@example.com"
                  required
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="companyPhone">Phone Number</label>
                <input
                  type="tel"
                  id="companyPhone"
                  name="companyPhone"
                  value={formData.companyPhone}
                  onChange={handleChange}
                  placeholder="+91 XXXXX XXXXX"
                />
              </div>

              <div className="form-group">
                <label htmlFor="companyWebsite">Website</label>
                <input
                  type="url"
                  id="companyWebsite"
                  name="companyWebsite"
                  value={formData.companyWebsite}
                  onChange={handleChange}
                  placeholder="https://www.example.com"
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="industryType">Industry Type <span className="required">*</span></label>
                <select
                  id="industryType"
                  name="industryType"
                  value={formData.industryType}
                  onChange={handleChange}
                  required
                >
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

              <div className="form-group">
                <label htmlFor="companySize">Company Size</label>
                <select
                  id="companySize"
                  name="companySize"
                  value={formData.companySize}
                  onChange={handleChange}
                >
                  <option value="">Select Size</option>
                  <option value="1-10">1-10 employees</option>
                  <option value="11-50">11-50 employees</option>
                  <option value="51-200">51-200 employees</option>
                  <option value="201-500">201-500 employees</option>
                  <option value="500+">500+ employees</option>
                </select>
              </div>
            </div>
          </div>

          <div className="form-section">
            <h3>Address Details</h3>
            <div className="form-group full-width">
              <label htmlFor="companyAddress">Street Address</label>
              <input
                type="text"
                id="companyAddress"
                name="companyAddress"
                value={formData.companyAddress}
                onChange={handleChange}
                placeholder="Street address, building number"
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="companyCity">City</label>
                <input
                  type="text"
                  id="companyCity"
                  name="companyCity"
                  value={formData.companyCity}
                  onChange={handleChange}
                  placeholder="City"
                />
              </div>

              <div className="form-group">
                <label htmlFor="companyState">State</label>
                <input
                  type="text"
                  id="companyState"
                  name="companyState"
                  value={formData.companyState}
                  onChange={handleChange}
                  placeholder="State"
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="companyCountry">Country</label>
                <input
                  type="text"
                  id="companyCountry"
                  name="companyCountry"
                  value={formData.companyCountry}
                  onChange={handleChange}
                  placeholder="Country"
                />
              </div>

              <div className="form-group">
                <label htmlFor="companyZipCode">Zip Code</label>
                <input
                  type="text"
                  id="companyZipCode"
                  name="companyZipCode"
                  value={formData.companyZipCode}
                  onChange={handleChange}
                  placeholder="Zip/Postal Code"
                />
              </div>
            </div>
          </div>

          <div className="form-section">
            <h3>Tax Information (Optional)</h3>
            <div className="form-group">
              <label htmlFor="gstin">GSTIN/Tax ID</label>
              <input
                type="text"
                id="gstin"
                name="gstin"
                value={formData.gstin}
                onChange={handleChange}
                placeholder="Enter GSTIN or Tax ID"
              />
            </div>
          </div>

          <div className="form-actions">
            <button
              type="button"
              className="btn-skip"
              onClick={handleSkip}
              disabled={loading}
            >
              Skip for Now
            </button>
            <button
              type="submit"
              className="btn-submit"
              disabled={loading}
            >
              {loading ? 'Setting up...' : 'Complete Setup'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CompanySetup;