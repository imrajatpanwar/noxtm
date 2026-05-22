import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { FiDownload, FiFileText } from 'react-icons/fi';
import './PublicLetterView.css';

const isDev = process.env.NODE_ENV === 'development';
const API_BASE = process.env.REACT_APP_API_URL || (isDev ? 'http://localhost:5001' : '');

function buildApiUrl(path) {
  return API_BASE ? `${API_BASE}${path}` : path;
}

function PublicLetterView() {
  const { token } = useParams();
  const [letter, setLetter] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchLetter = async () => {
      try {
        setLoading(true);
        setError('');
        const res = await axios.get(buildApiUrl(`/api/letter-templates/public/${token}`));
        if (res.data.success) {
          setLetter(res.data.letter);
        } else {
          setError('Letter not found.');
        }
      } catch (err) {
        console.error('Error loading public letter:', err);
        setError('This letter link is unavailable or has been removed.');
      } finally {
        setLoading(false);
      }
    };
    fetchLetter();
  }, [token]);

  if (loading) {
    return (
      <div className="plv-page">
        <div className="plv-shell plv-state">Loading letter...</div>
      </div>
    );
  }

  if (error || !letter) {
    return (
      <div className="plv-page">
        <div className="plv-shell plv-state">
          <FiFileText />
          <h1>Letter unavailable</h1>
          <p>{error || 'Letter not found.'}</p>
        </div>
      </div>
    );
  }

  const company = letter.companySnapshot || {};
  const companyLine = [company.email, company.phone, company.website].filter(Boolean).join(' | ');
  const addressLine = [company.address, company.city, company.state, company.zipCode, company.country].filter(Boolean).join(', ');

  return (
    <div className="plv-page">
      <div className="plv-toolbar">
        <div>
          <span>Public letter</span>
          <strong>{letter.templateName}</strong>
        </div>
        <a href={buildApiUrl(`/api/letter-templates/public/${token}/download`)}>
          <FiDownload /> Download PDF
        </a>
      </div>

      <main className="plv-document">
        <header className="plv-letterhead">
          <div>
            <h1>{company.name || 'Company Letter'}</h1>
            {companyLine && <p>{companyLine}</p>}
            {addressLine && <p>{addressLine}</p>}
          </div>
        </header>

        <section className="plv-meta">
          <div>
            <span>Document</span>
            <strong>{letter.subject || letter.templateName}</strong>
          </div>
          <div>
            <span>Generated</span>
            <strong>{new Date(letter.createdAt).toLocaleDateString()}</strong>
          </div>
        </section>

        <article className="plv-content">
          {letter.content}
        </article>

        <footer className="plv-footer">
          <span>Generated with Noxtm</span>
        </footer>
      </main>
    </div>
  );
}

export default PublicLetterView;
