import React, { useState, useEffect } from 'react';
import api from '../config/api';
import { FiGlobe, FiPlus, FiCheck, FiX } from 'react-icons/fi';
import { Skeleton } from './ui/skeleton';
import './EmailManagement.css';

function EmailDomains() {
  const [domains, setDomains] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDomains();
  }, []);

  const fetchDomains = async () => {
    try {
      const response = await api.get('/email-domains');
      setDomains(response.data.data || []);
    } catch (err) {
      console.error('Error fetching domains:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="email-management-page" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}><Skeleton className="tw-h-8 tw-w-48" /><Skeleton className="tw-h-4 tw-w-full" /><Skeleton className="tw-h-4 tw-w-full" /><Skeleton className="tw-h-4 tw-w-3/4" /></div>;

  return (
    <div className="email-management-page">
      <div className="page-header">
        <h1><FiGlobe /> Email Domains</h1>
        <button className="btn-primary"><FiPlus /> Add Domain</button>
      </div>

      <div className="content-card">
        <table className="data-table">
          <thead>
            <tr>
              <th>Domain</th>
              <th>Status</th>
              <th>Accounts</th>
              <th>Verified</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {domains.map((domain) => (
              <tr key={domain._id}>
                <td>{domain.domain}</td>
                <td><span className={`status-badge ${domain.enabled ? 'active' : 'inactive'}`}>
                  {domain.enabled ? 'Active' : 'Disabled'}
                </span></td>
                <td>{domain.accountCount}/{domain.maxAccounts}</td>
                <td>{domain.verified ? <FiCheck color="green" /> : <FiX color="red" />}</td>
                <td><button className="btn-secondary">DNS Setup</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default EmailDomains;
