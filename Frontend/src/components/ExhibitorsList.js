import React, { useState, useEffect, useCallback } from 'react';
import './ExhibitorsList.css';
import Breadcrumb from './Breadcrumb';
import { FiX, FiPlus, FiEdit2, FiTrash2 } from 'react-icons/fi';

function ExhibitorsList({ tradeShow, onNavigate }) {
  const [exhibitors, setExhibitors] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [formData, setFormData] = useState({
    companyName: '',
    boothNo: '',
    location: '',
    options: ''
  });
  const [editingId, setEditingId] = useState(null);

  const fetchExhibitors = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/trade-shows/${tradeShow._id}/exhibitors`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setExhibitors(data.exhibitors || []);
      }
    } catch (error) {
      console.error('Error fetching exhibitors:', error);
    }
  }, [tradeShow]);

  useEffect(() => {
    if (tradeShow) {
      fetchExhibitors();
    }
  }, [tradeShow, fetchExhibitors]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const token = localStorage.getItem('token');
      const url = editingId
        ? `/api/exhibitors/${editingId}`
        : `/api/trade-shows/${tradeShow._id}/exhibitors`;

      const response = await fetch(url, {
        method: editingId ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        await fetchExhibitors();
        setShowAddModal(false);
        setFormData({ companyName: '', boothNo: '', location: '', options: '' });
        setEditingId(null);
      } else {
        const data = await response.json();
        alert(data.message || 'Error saving exhibitor');
      }
    } catch (error) {
      console.error('Error saving exhibitor:', error);
      alert('Error saving exhibitor. Please try again.');
    }
  };

  const handleEdit = (exhibitor) => {
    setFormData({
      companyName: exhibitor.companyName,
      boothNo: exhibitor.boothNo,
      location: exhibitor.location,
      options: exhibitor.options
    });
    setEditingId(exhibitor._id);
    setShowAddModal(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this exhibitor?')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/exhibitors/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        await fetchExhibitors();
      } else {
        const data = await response.json();
        alert(data.message || 'Error deleting exhibitor');
      }
    } catch (error) {
      console.error('Error deleting exhibitor:', error);
      alert('Error deleting exhibitor. Please try again.');
    }
  };

  const breadcrumbItems = [
    { label: 'Home', section: 'overview' },
    { label: 'Global Trade Shows', section: 'global-trade-show' },
    { label: tradeShow?.shortName || 'Trade Show' }
  ];

  return (
    <div className="exhibitors-container">
      <Breadcrumb items={breadcrumbItems} onNavigate={onNavigate} />

      <div className="exhibitors-header">
        <div>
          <h1 className="exhibitors-short-name">{tradeShow?.shortName}</h1>
          <p className="exhibitors-title">{tradeShow?.fullName}</p>
        </div>
        <div className="exhibitors-header-actions">
          <button className="exhibitors-add-btn" onClick={() => setShowAddModal(true)}>
            <FiPlus /> Add Exhibitor
          </button>
        </div>
      </div>

      {/* Exhibitors Table */}
      <div className="exhibitors-table-container">
        {exhibitors.length > 0 ? (
          <table className="exhibitors-table">
            <thead>
              <tr>
                <th>Company Name</th>
                <th>Booth No.</th>
                <th>Location</th>
                <th>Options</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {exhibitors.map(exhibitor => (
                <tr key={exhibitor._id}>
                  <td>{exhibitor.companyName}</td>
                  <td>{exhibitor.boothNo}</td>
                  <td>{exhibitor.location}</td>
                  <td>{exhibitor.options}</td>
                  <td>
                    <div className="exhibitor-actions">
                      <button className="exhibitor-icon-btn" onClick={() => handleEdit(exhibitor)} title="Edit">
                        <FiEdit2 />
                      </button>
                      <button className="exhibitor-icon-btn exhibitor-delete-btn" onClick={() => handleDelete(exhibitor._id)} title="Delete">
                        <FiTrash2 />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="exhibitors-empty">
            <p>No exhibitors added yet</p>
          </div>
        )}
      </div>

      {/* Add/Edit Exhibitor Modal */}
      {showAddModal && (
        <div className="exhibitor-modal-overlay" onClick={() => {
          setShowAddModal(false);
          setFormData({ companyName: '', boothNo: '', location: '', options: '' });
          setEditingId(null);
        }}>
          <div className="exhibitor-modal-content" onClick={e => e.stopPropagation()}>
            <div className="exhibitor-modal-header">
              <h2>{editingId ? 'Edit Exhibitor' : 'Add New Exhibitor'}</h2>
              <button
                className="exhibitor-modal-close"
                onClick={() => {
                  setShowAddModal(false);
                  setFormData({ companyName: '', boothNo: '', location: '', options: '' });
                  setEditingId(null);
                }}
              >
                <FiX />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="exhibitor-form">
              <div className="exhibitor-form-field">
                <label>Company Name *</label>
                <input
                  type="text"
                  value={formData.companyName}
                  onChange={e => setFormData({ ...formData, companyName: e.target.value })}
                  required
                  placeholder="Enter company name"
                />
              </div>

              <div className="exhibitor-form-field">
                <label>Booth No.</label>
                <input
                  type="text"
                  value={formData.boothNo}
                  onChange={e => setFormData({ ...formData, boothNo: e.target.value })}
                  placeholder="Enter booth number"
                />
              </div>

              <div className="exhibitor-form-field">
                <label>Location *</label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={e => setFormData({ ...formData, location: e.target.value })}
                  required
                  placeholder="City, Country"
                />
              </div>

              <div className="exhibitor-form-field">
                <label>Options</label>
                <input
                  type="text"
                  value={formData.options}
                  onChange={e => setFormData({ ...formData, options: e.target.value })}
                  placeholder="Additional options or notes"
                />
              </div>

              <div className="exhibitor-form-actions">
                <button
                  type="button"
                  className="exhibitor-cancel-btn"
                  onClick={() => {
                    setShowAddModal(false);
                    setFormData({ companyName: '', boothNo: '', location: '', options: '' });
                    setEditingId(null);
                  }}
                >
                  Cancel
                </button>
                <button type="submit" className="exhibitor-submit-btn">
                  {editingId ? 'Update Exhibitor' : 'Add Exhibitor'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default ExhibitorsList;
