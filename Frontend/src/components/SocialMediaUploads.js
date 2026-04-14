import React, { useState, useEffect, useCallback } from 'react';
import { FiImage, FiFile, FiExternalLink, FiDownload, FiSearch, FiX, FiLock } from 'react-icons/fi';
import { toast } from 'sonner';
import api from '../config/api';
import './SocialMediaUploads.css';

const PLATFORM_COLORS = {
    Instagram: '#e1306c',
    LinkedIn:  '#0077b5',
    YouTube:   '#ff0000',
    X:         '#000000',
    Facebook:  '#1877f2',
    Reddit:    '#ff4500',
    Other:     '#6b7280',
};

function formatBytes(bytes) {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(d) {
    if (!d) return '';
    return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function isImage(mimeType, url) {
    if (mimeType && mimeType.startsWith('image/')) return true;
    if (url && /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(url)) return true;
    return false;
}

export default function SocialMediaUploads({ embedded = false }) {
    const [files, setFiles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [typeFilter, setTypeFilter] = useState('all');   // all | upload | reference
    const [accountFilter, setAccountFilter] = useState('all');
    const [preview, setPreview] = useState(null);

    const fetchFiles = useCallback(async () => {
        setLoading(true);
        try {
            const res = await api.get('/social-media-calendar/media-files');
            setFiles(res.data.files || []);
        } catch (err) {
            console.error('[SocialMediaUploads] fetch error:', err);
            toast.error('Failed to load files');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchFiles(); }, [fetchFiles]);

    // Build unique account list for filter
    const accounts = Array.from(
        new Map(
            files
                .filter(f => f.account)
                .map(f => [f.account._id, f.account])
        ).values()
    );

    const filtered = files.filter(f => {
        if (typeFilter !== 'all' && f.type !== typeFilter) return false;
        if (accountFilter !== 'all' && f.account?._id !== accountFilter) return false;
        if (search.trim()) {
            const q = search.toLowerCase();
            if (
                !f.filename?.toLowerCase().includes(q) &&
                !f.postTitle?.toLowerCase().includes(q) &&
                !f.account?.name?.toLowerCase().includes(q)
            ) return false;
        }
        return true;
    });

    return (
        <div className={`smu-root${embedded ? ' smu-root--embedded' : ''}`}>
            {/* Header */}
            <div className="smu-header">
                <div className="smu-header-left">
                    <h2 className="smu-title">Upload Files</h2>
                    <p className="smu-subtitle">
                        Media files from your assigned Content Calendar accounts
                    </p>
                </div>
                <div className="smu-access-note">
                    <FiLock size={13} />
                    <span>Showing files you have access to</span>
                </div>
            </div>

            {/* Filters */}
            <div className="smu-filters">
                <div className="smu-search-wrap">
                    <FiSearch className="smu-search-icon" size={14} />
                    <input
                        className="smu-search"
                        placeholder="Search files, posts, accounts..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                    {search && (
                        <button className="smu-search-clear" onClick={() => setSearch('')}>
                            <FiX size={13} />
                        </button>
                    )}
                </div>

                <select
                    className="smu-filter-select"
                    value={typeFilter}
                    onChange={e => setTypeFilter(e.target.value)}
                >
                    <option value="all">All Types</option>
                    <option value="upload">Uploaded Media</option>
                    <option value="reference">Reference Images</option>
                </select>

                <select
                    className="smu-filter-select"
                    value={accountFilter}
                    onChange={e => setAccountFilter(e.target.value)}
                >
                    <option value="all">All Accounts</option>
                    {accounts.map(a => (
                        <option key={a._id} value={a._id}>{a.name}</option>
                    ))}
                </select>
            </div>

            {/* Stats bar */}
            {!loading && (
                <div className="smu-stats">
                    <span>{filtered.length} file{filtered.length !== 1 ? 's' : ''}</span>
                    {accountFilter === 'all' && accounts.length > 0 && (
                        <span>{accounts.length} account{accounts.length !== 1 ? 's' : ''}</span>
                    )}
                </div>
            )}

            {/* Content */}
            {loading ? (
                <div className="smu-loading">
                    <div className="smu-spinner" />
                    <span>Loading files...</span>
                </div>
            ) : filtered.length === 0 ? (
                <div className="smu-empty">
                    <FiImage size={40} className="smu-empty-icon" />
                    <h4>No files found</h4>
                    <p>
                        {files.length === 0
                            ? 'No uploads yet. Upload files to posts in the Content Calendar.'
                            : 'No files match your current filters.'}
                    </p>
                </div>
            ) : (
                <div className="smu-grid">
                    {filtered.map(f => (
                        <FileCard
                            key={`${f._id}-${f.type}`}
                            file={f}
                            onPreview={setPreview}
                        />
                    ))}
                </div>
            )}

            {/* Preview modal */}
            {preview && (
                <div className="smu-preview-overlay" onClick={() => setPreview(null)}>
                    <div className="smu-preview-modal" onClick={e => e.stopPropagation()}>
                        <div className="smu-preview-header">
                            <span className="smu-preview-name">{preview.filename}</span>
                            <div style={{ display: 'flex', gap: 8 }}>
                                {preview.type === 'reference' && preview.webViewLink && (
                                    <a
                                        href={preview.webViewLink}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="smu-preview-action"
                                        title="Open in Drive"
                                    >
                                        <FiExternalLink size={16} />
                                    </a>
                                )}
                                {preview.type === 'upload' && preview.url && (
                                    <a
                                        href={`${process.env.REACT_APP_API_URL || ''}${preview.url}`}
                                        download={preview.filename}
                                        className="smu-preview-action"
                                        title="Download"
                                    >
                                        <FiDownload size={16} />
                                    </a>
                                )}
                                <button className="smu-preview-close" onClick={() => setPreview(null)}>
                                    <FiX size={18} />
                                </button>
                            </div>
                        </div>
                        <div className="smu-preview-body">
                            {isImage(preview.mimeType, preview.url) ? (
                                <img
                                    src={
                                        preview.type === 'upload'
                                            ? `${process.env.REACT_APP_API_URL || ''}${preview.url}`
                                            : preview.url
                                    }
                                    alt={preview.filename}
                                    className="smu-preview-img"
                                />
                            ) : (
                                <div className="smu-preview-noimg">
                                    <FiFile size={48} />
                                    <span>{preview.filename}</span>
                                </div>
                            )}
                        </div>
                        <div className="smu-preview-meta">
                            {preview.account && (
                                <span
                                    className="smu-preview-account"
                                    style={{ background: preview.account.color || '#e5e7eb' }}
                                >
                                    {preview.account.name}
                                </span>
                            )}
                            <span className="smu-preview-post">{preview.postTitle}</span>
                            <span className="smu-preview-date">{formatDate(preview.uploadedAt)}</span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function FileCard({ file, onPreview }) {
    const imgSrc = file.type === 'upload'
        ? `${process.env.REACT_APP_API_URL || ''}${file.url}`
        : file.url;

    const showImage = isImage(file.mimeType, file.url) && imgSrc;
    const accentColor = file.account
        ? (PLATFORM_COLORS[file.account.platform] || '#6b7280')
        : '#6b7280';

    return (
        <div className="smu-card" onClick={() => onPreview(file)}>
            <div className="smu-card-thumb">
                {showImage ? (
                    <img src={imgSrc} alt={file.filename} className="smu-card-img" />
                ) : (
                    <div className="smu-card-icon">
                        <FiFile size={28} />
                    </div>
                )}
                <span className={`smu-card-type-badge smu-card-type-badge--${file.type}`}>
                    {file.type === 'reference' ? 'Ref' : 'Upload'}
                </span>
            </div>

            <div className="smu-card-body">
                <p className="smu-card-filename" title={file.filename}>
                    {file.filename || 'Untitled'}
                </p>

                {file.account && (
                    <div className="smu-card-account">
                        <span
                            className="smu-card-account-dot"
                            style={{ background: accentColor }}
                        />
                        <span className="smu-card-account-name">{file.account.name}</span>
                    </div>
                )}

                <p className="smu-card-post" title={file.postTitle}>
                    {file.postTitle}
                </p>

                <div className="smu-card-footer">
                    {file.size && <span className="smu-card-size">{formatBytes(file.size)}</span>}
                    <span className="smu-card-date">{formatDate(file.uploadedAt)}</span>
                </div>
            </div>
        </div>
    );
}
