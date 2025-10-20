import React, { useState, useEffect } from 'react';
import api from '../config/api';
import { FiFileText, FiPlus } from 'react-icons/fi';
import './EmailManagement.css';

function EmailTemplates() {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      const response = await api.get('/email-templates');
      setTemplates(response.data.data || []);
    } catch (err) {
      console.error('Error fetching templates:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="email-management-page"><h1>Loading...</h1></div>;

  return (
    <div className="email-management-page">
      <div className="page-header">
        <h1><FiFileText /> Email Templates</h1>
        <button className="btn-primary"><FiPlus /> Create Template</button>
      </div>

      <div className="content-card">
        <div className="templates-grid">
          {templates.map((template) => (
            <div key={template._id} className="template-card">
              <h3>{template.name}</h3>
              <p className="template-subject">{template.subject}</p>
              <div className="template-meta">
                <span className={`badge ${template.category}`}>{template.category}</span>
                <span className="template-type">{template.type}</span>
              </div>
              <div className="template-stats">
                <small>Sent: {template.sendCount} times</small>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default EmailTemplates;
