import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import './CampaignWizard.css';
import CSVImport from './ImportModals/CSVImport';
import LeadImport from './ImportModals/LeadImport';
import TradeShowImport from './ImportModals/TradeShowImport';

function CampaignWizard() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [templates, setTemplates] = useState([]);
  const [contactLists, setContactLists] = useState([]);
  const [showImportModal, setShowImportModal] = useState(null);

  const [campaignData, setCampaignData] = useState({
    name: '',
    description: '',
    replyTo: '',
    subject: '',
    body: '',
    emailTemplate: '',
    fromEmail: 'rajat@mail.noxtm.com',
    fromName: 'Noxtm',
    selectedLists: [],
    customRecipients: []
  });

  useEffect(() => {
    fetchTemplates();
    fetchContactLists();
    if (id) {
      fetchCampaign(id);
    }
  }, [id]);

  const fetchTemplates = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/email-templates', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        const result = await response.json();
        setTemplates(result.data || []);
      }
    } catch (err) {
      console.error('Error fetching templates:', err);
    }
  };

  const fetchContactLists = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/contact-lists', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        const result = await response.json();
        setContactLists(result.data || []);
      }
    } catch (err) {
      console.error('Error fetching contact lists:', err);
    }
  };

  const fetchCampaign = async (campaignId) => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5000/api/campaigns/${campaignId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        const result = await response.json();
        const campaign = result.data;
        setCampaignData({
          name: campaign.name,
          description: campaign.description || '',
          replyTo: campaign.replyTo,
          subject: campaign.subject,
          body: campaign.body,
          emailTemplate: campaign.emailTemplate?._id || '',
          fromEmail: campaign.fromEmail,
          fromName: campaign.fromName,
          selectedLists: campaign.contactLists.map(list => list._id),
          customRecipients: campaign.recipients || []
        });
      }
      setLoading(false);
    } catch (err) {
      console.error('Error fetching campaign:', err);
      setLoading(false);
    }
  };

  const handleInputChange = (field, value) => {
    setCampaignData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleTemplateSelect = (templateId) => {
    const template = templates.find(t => t._id === templateId);
    if (template) {
      setCampaignData(prev => ({
        ...prev,
        emailTemplate: templateId,
        subject: template.subject,
        body: template.body
      }));
    }
  };

  const handleListToggle = (listId) => {
    setCampaignData(prev => ({
      ...prev,
      selectedLists: prev.selectedLists.includes(listId)
        ? prev.selectedLists.filter(id => id !== listId)
        : [...prev.selectedLists, listId]
    }));
  };

  const handleImportComplete = (listId) => {
    setShowImportModal(null);
    fetchContactLists();
    if (listId) {
      setCampaignData(prev => ({
        ...prev,
        selectedLists: [...prev.selectedLists, listId]
      }));
    }
  };

  const validateStep = (step) => {
    switch (step) {
      case 1:
        return campaignData.name && campaignData.replyTo;
      case 2:
        return campaignData.subject && campaignData.body;
      case 3:
        return campaignData.selectedLists.length > 0 || campaignData.customRecipients.length > 0;
      default:
        return true;
    }
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => prev + 1);
    } else {
      alert('Please fill in all required fields');
    }
  };

  const handleBack = () => {
    setCurrentStep(prev => prev - 1);
  };

  const handleSaveDraft = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');

      const payload = {
        name: campaignData.name,
        description: campaignData.description,
        replyTo: campaignData.replyTo,
        subject: campaignData.subject,
        body: campaignData.body,
        fromEmail: campaignData.fromEmail,
        fromName: campaignData.fromName,
        emailTemplate: campaignData.emailTemplate || undefined
      };

      const url = id
        ? `http://localhost:5000/api/campaigns/${id}`
        : 'http://localhost:5000/api/campaigns';
      const method = id ? 'PATCH' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error('Failed to save campaign');
      }

      const result = await response.json();
      const campaignId = result.data._id;

      // Add recipients if lists are selected
      if (campaignData.selectedLists.length > 0) {
        await fetch(`http://localhost:5000/api/campaigns/${campaignId}/recipients`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            contactListIds: campaignData.selectedLists
          })
        });
      }

      alert('Campaign saved as draft');
      navigate('/campaigns');
    } catch (err) {
      console.error('Error saving campaign:', err);
      alert('Failed to save campaign');
    } finally {
      setLoading(false);
    }
  };

  const handleSendNow = async () => {
    if (!window.confirm('Are you sure you want to send this campaign now?')) {
      return;
    }

    try {
      setLoading(true);
      const token = localStorage.getItem('token');

      // First save/create the campaign
      let campaignId = id;

      if (!campaignId) {
        const createResponse = await fetch('http://localhost:5000/api/campaigns', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            name: campaignData.name,
            description: campaignData.description,
            replyTo: campaignData.replyTo,
            subject: campaignData.subject,
            body: campaignData.body,
            fromEmail: campaignData.fromEmail,
            fromName: campaignData.fromName,
            emailTemplate: campaignData.emailTemplate || undefined
          })
        });

        if (!createResponse.ok) {
          throw new Error('Failed to create campaign');
        }

        const createResult = await createResponse.json();
        campaignId = createResult.data._id;
      }

      // Add recipients
      if (campaignData.selectedLists.length > 0) {
        await fetch(`http://localhost:5000/api/campaigns/${campaignId}/recipients`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            contactListIds: campaignData.selectedLists
          })
        });
      }

      // Send campaign
      const sendResponse = await fetch(`http://localhost:5000/api/campaigns/${campaignId}/send`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!sendResponse.ok) {
        throw new Error('Failed to send campaign');
      }

      alert('Campaign is being sent!');
      navigate('/campaigns');
    } catch (err) {
      console.error('Error sending campaign:', err);
      alert('Failed to send campaign: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const getTotalRecipients = () => {
    const selectedListsData = contactLists.filter(list =>
      campaignData.selectedLists.includes(list._id)
    );
    return selectedListsData.reduce((total, list) => total + list.contactCount, 0);
  };

  const modules = {
    toolbar: [
      [{ 'header': [1, 2, false] }],
      ['bold', 'italic', 'underline', 'strike'],
      [{ 'list': 'ordered'}, { 'list': 'bullet' }],
      [{ 'color': [] }, { 'background': [] }],
      ['link'],
      ['clean']
    ],
  };

  return (
    <div className="campaign-wizard-container">
      {/* Progress Steps */}
      <div className="wizard-steps">
        <div className={currentStep >= 1 ? 'step active' : 'step'}>
          <div className="step-number">1</div>
          <div className="step-label">Campaign Details</div>
        </div>
        <div className="step-line"></div>
        <div className={currentStep >= 2 ? 'step active' : 'step'}>
          <div className="step-number">2</div>
          <div className="step-label">Email Content</div>
        </div>
        <div className="step-line"></div>
        <div className={currentStep >= 3 ? 'step active' : 'step'}>
          <div className="step-number">3</div>
          <div className="step-label">Recipients</div>
        </div>
        <div className="step-line"></div>
        <div className={currentStep >= 4 ? 'step active' : 'step'}>
          <div className="step-number">4</div>
          <div className="step-label">Review & Send</div>
        </div>
      </div>

      {/* Step Content */}
      <div className="wizard-content">
        {/* Step 1: Campaign Details */}
        {currentStep === 1 && (
          <div className="step-content">
            <h2>Campaign Details</h2>
            <p className="step-description">Set up your campaign name and reply-to email</p>

            <div className="form-group">
              <label>Campaign Name *</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g., Q4 Product Launch"
                value={campaignData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
              />
            </div>

            <div className="form-group">
              <label>Description</label>
              <textarea
                className="form-textarea"
                placeholder="Brief description of this campaign"
                value={campaignData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                rows={3}
              />
            </div>

            <div className="form-group">
              <label>Reply-To Email *</label>
              <input
                type="email"
                className="form-input"
                placeholder="replies@yourdomain.com"
                value={campaignData.replyTo}
                onChange={(e) => handleInputChange('replyTo', e.target.value)}
              />
              <small>Responses will be sent to this email address</small>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>From Email</label>
                <input
                  type="email"
                  className="form-input"
                  value={campaignData.fromEmail}
                  onChange={(e) => handleInputChange('fromEmail', e.target.value)}
                />
              </div>

              <div className="form-group">
                <label>From Name</label>
                <input
                  type="text"
                  className="form-input"
                  value={campaignData.fromName}
                  onChange={(e) => handleInputChange('fromName', e.target.value)}
                />
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Email Content */}
        {currentStep === 2 && (
          <div className="step-content">
            <h2>Email Content</h2>
            <p className="step-description">Create your email or choose from templates</p>

            {templates.length > 0 && (
              <div className="form-group">
                <label>Use Template (Optional)</label>
                <select
                  className="form-select"
                  value={campaignData.emailTemplate}
                  onChange={(e) => handleTemplateSelect(e.target.value)}
                >
                  <option value="">Create Custom Email</option>
                  {templates.map(template => (
                    <option key={template._id} value={template._id}>
                      {template.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="form-group">
              <label>Subject Line *</label>
              <input
                type="text"
                className="form-input"
                placeholder="Enter email subject"
                value={campaignData.subject}
                onChange={(e) => handleInputChange('subject', e.target.value)}
              />
              <small>Variables: {'{{name}}'}, {'{{companyName}}'}, {'{{email}}'}</small>
            </div>

            <div className="form-group">
              <label>Email Body *</label>
              <ReactQuill
                theme="snow"
                value={campaignData.body}
                onChange={(value) => handleInputChange('body', value)}
                modules={modules}
                placeholder="Write your email content here..."
              />
              <small>Use variables for personalization: {'{{'} name {'}}'},  {'{{'} companyName {'}}'},  {'{{'} email {'}}'}</small>
            </div>
          </div>
        )}

        {/* Step 3: Recipients */}
        {currentStep === 3 && (
          <div className="step-content">
            <h2>Recipients</h2>
            <p className="step-description">Select contact lists or import new contacts</p>

            <div className="import-actions">
              <button
                className="btn-import"
                onClick={() => setShowImportModal('csv')}
              >
                📁 Import CSV
              </button>
              <button
                className="btn-import"
                onClick={() => setShowImportModal('leads')}
              >
                👥 Import from Leads
              </button>
              <button
                className="btn-import"
                onClick={() => setShowImportModal('tradeshow')}
              >
                🎪 Import from Trade Show
              </button>
            </div>

            <div className="contact-lists">
              <h3>Select Contact Lists</h3>
              {contactLists.length === 0 ? (
                <p className="no-lists">No contact lists available. Import contacts to create a list.</p>
              ) : (
                <div className="lists-grid">
                  {contactLists.map(list => (
                    <div
                      key={list._id}
                      className={campaignData.selectedLists.includes(list._id) ? 'list-card selected' : 'list-card'}
                      onClick={() => handleListToggle(list._id)}
                    >
                      <div className="list-checkbox">
                        <input
                          type="checkbox"
                          checked={campaignData.selectedLists.includes(list._id)}
                          onChange={() => handleListToggle(list._id)}
                        />
                      </div>
                      <div className="list-info">
                        <h4>{list.name}</h4>
                        <p>{list.description || 'No description'}</p>
                        <span className="contact-count">{list.contactCount} contacts</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="recipient-summary">
              <strong>Total Recipients:</strong> {getTotalRecipients()}
            </div>
          </div>
        )}

        {/* Step 4: Review & Send */}
        {currentStep === 4 && (
          <div className="step-content">
            <h2>Review & Send</h2>
            <p className="step-description">Review your campaign before sending</p>

            <div className="review-section">
              <h3>Campaign Details</h3>
              <div className="review-item">
                <span className="review-label">Name:</span>
                <span className="review-value">{campaignData.name}</span>
              </div>
              <div className="review-item">
                <span className="review-label">Reply-To:</span>
                <span className="review-value">{campaignData.replyTo}</span>
              </div>
              <div className="review-item">
                <span className="review-label">From:</span>
                <span className="review-value">{campaignData.fromName} &lt;{campaignData.fromEmail}&gt;</span>
              </div>
            </div>

            <div className="review-section">
              <h3>Email Content</h3>
              <div className="review-item">
                <span className="review-label">Subject:</span>
                <span className="review-value">{campaignData.subject}</span>
              </div>
              <div className="email-preview">
                <h4>Body Preview:</h4>
                <div className="preview-content" dangerouslySetInnerHTML={{ __html: campaignData.body }} />
              </div>
            </div>

            <div className="review-section">
              <h3>Recipients</h3>
              <div className="review-item">
                <span className="review-label">Total Recipients:</span>
                <span className="review-value">{getTotalRecipients()}</span>
              </div>
              <div className="review-item">
                <span className="review-label">Contact Lists:</span>
                <span className="review-value">{campaignData.selectedLists.length} lists selected</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Navigation Buttons */}
      <div className="wizard-actions">
        <button
          className="btn-secondary"
          onClick={() => navigate('/campaigns')}
        >
          Cancel
        </button>

        <div className="action-buttons-right">
          {currentStep > 1 && (
            <button
              className="btn-secondary"
              onClick={handleBack}
            >
              Back
            </button>
          )}

          {currentStep < 4 && (
            <button
              className="btn-primary"
              onClick={handleNext}
              disabled={!validateStep(currentStep)}
            >
              Next
            </button>
          )}

          {currentStep === 4 && (
            <>
              <button
                className="btn-secondary"
                onClick={handleSaveDraft}
                disabled={loading}
              >
                Save as Draft
              </button>
              <button
                className="btn-primary"
                onClick={handleSendNow}
                disabled={loading || getTotalRecipients() === 0}
              >
                {loading ? 'Sending...' : 'Send Now'}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Import Modals */}
      {showImportModal === 'csv' && (
        <CSVImport
          onClose={() => setShowImportModal(null)}
          onImportComplete={handleImportComplete}
        />
      )}
      {showImportModal === 'leads' && (
        <LeadImport
          onClose={() => setShowImportModal(null)}
          onImportComplete={handleImportComplete}
        />
      )}
      {showImportModal === 'tradeshow' && (
        <TradeShowImport
          onClose={() => setShowImportModal(null)}
          onImportComplete={handleImportComplete}
        />
      )}
    </div>
  );
}

export default CampaignWizard;
