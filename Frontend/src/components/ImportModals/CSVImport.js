import React, { useState } from 'react';
import './ImportModals.css';

function CSVImport({ onClose, onImportComplete }) {
  const [listName, setListName] = useState('');
  const [description, setDescription] = useState('');
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      // Validate file type
      const validTypes = ['text/csv', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'];
      if (validTypes.includes(selectedFile.type) || selectedFile.name.endsWith('.csv')) {
        setFile(selectedFile);
        setError(null);
      } else {
        setError('Please select a valid CSV file');
        setFile(null);
      }
    }
  };

  const handleImport = async () => {
    if (!listName || !file) {
      setError('Please provide a list name and select a CSV file');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const formData = new FormData();
      formData.append('file', file);
      formData.append('listName', listName);
      formData.append('description', description);

      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/contact-lists/import/csv', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.message || 'Failed to import CSV');
      }

      const result = await response.json();
      alert(`Successfully imported ${result.data.contactCount} contacts`);
      onImportComplete(result.data.listId);
    } catch (err) {
      console.error('CSV import error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Import from CSV</h2>
          <button className="modal-close" onClick={onClose}>&times;</button>
        </div>

        <div className="modal-body">
          <div className="form-group">
            <label>List Name *</label>
            <input
              type="text"
              className="form-input"
              placeholder="e.g., Q4 Prospects"
              value={listName}
              onChange={(e) => setListName(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label>Description</label>
            <textarea
              className="form-textarea"
              placeholder="Brief description of this contact list"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
            />
          </div>

          <div className="form-group">
            <label>CSV File *</label>
            <div className="file-upload">
              <input
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={handleFileChange}
                id="csv-file-input"
              />
              <label htmlFor="csv-file-input" className="file-upload-label">
                {file ? file.name : 'Choose CSV file'}
              </label>
            </div>
            <small>Supported columns: email, name, company, phone, designation, location</small>
          </div>

          {error && (
            <div className="error-message">
              {error}
            </div>
          )}

          <div className="csv-help">
            <h4>CSV Format Guidelines:</h4>
            <ul>
              <li>First row should contain column headers</li>
              <li>Required column: <strong>email</strong></li>
              <li>Optional columns: name, company, phone, designation, location</li>
              <li>Maximum file size: 5MB</li>
            </ul>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button
            className="btn-primary"
            onClick={handleImport}
            disabled={loading || !listName || !file}
          >
            {loading ? 'Importing...' : 'Import Contacts'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default CSVImport;
