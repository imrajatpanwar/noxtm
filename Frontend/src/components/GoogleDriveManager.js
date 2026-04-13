import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useGoogleLogin, googleLogout } from '@react-oauth/google';
import axios from 'axios';
import './GoogleDriveManager.css';

const CLIENT_ID = '375084822664-hljdpq569rpmgs1kd7kp3b36vs7s6n8k.apps.googleusercontent.com';
const SCOPES = 'https://www.googleapis.com/auth/drive.file';
const DRIVE_UPLOAD_URL = 'https://www.googleapis.com/upload/drive/v3/files';
const DRIVE_FILES_URL = 'https://www.googleapis.com/drive/v3/files';

// App-specific folder name on Drive
const FOLDER_NAME = 'Noxtm Assets';

export default function GoogleDriveManager() {
  const [accessToken, setAccessToken] = useState(null);
  const [user, setUser] = useState(null);
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({});
  const [dragOver, setDragOver] = useState(false);
  const [folderId, setFolderId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [previewFile, setPreviewFile] = useState(null);
  const fileInputRef = useRef(null);

  // ── Google Login ─────────────────────────────────────────────────────────
  const login = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      setAccessToken(tokenResponse.access_token);
      // Fetch user profile
      try {
        const profile = await axios.get(
          'https://www.googleapis.com/oauth2/v3/userinfo',
          { headers: { Authorization: `Bearer ${tokenResponse.access_token}` } }
        );
        setUser(profile.data);
      } catch (e) { /* ignore */ }
    },
    onError: (err) => setError('Google sign-in failed. Please try again.'),
    scope: SCOPES,
  });

  const disconnect = () => {
    googleLogout();
    setAccessToken(null);
    setUser(null);
    setFiles([]);
    setFolderId(null);
  };

  // ── Ensure Noxtm Assets folder exists ────────────────────────────────────
  const ensureFolder = useCallback(async (token) => {
    if (folderId) return folderId;

    // Search for existing folder
    const search = await axios.get(DRIVE_FILES_URL, {
      headers: { Authorization: `Bearer ${token}` },
      params: {
        q: `name='${FOLDER_NAME}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
        fields: 'files(id,name)',
      },
    });

    if (search.data.files?.length > 0) {
      const id = search.data.files[0].id;
      setFolderId(id);
      return id;
    }

    // Create the folder
    const created = await axios.post(
      'https://www.googleapis.com/drive/v3/files',
      { name: FOLDER_NAME, mimeType: 'application/vnd.google-apps.folder' },
      { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } }
    );
    setFolderId(created.data.id);
    return created.data.id;
  }, [folderId]);

  // ── Fetch files ───────────────────────────────────────────────────────────
  const fetchFiles = useCallback(async (token, folderIdParam) => {
    setLoading(true);
    try {
      const fId = folderIdParam || await ensureFolder(token);
      const res = await axios.get(DRIVE_FILES_URL, {
        headers: { Authorization: `Bearer ${token}` },
        params: {
          q: `'${fId}' in parents and trashed=false`,
          fields: 'files(id,name,mimeType,size,thumbnailLink,webViewLink,iconLink,createdTime)',
          orderBy: 'createdTime desc',
          pageSize: 50,
        },
      });
      setFiles(res.data.files || []);
    } catch (e) {
      setError('Failed to load files from Google Drive.');
    } finally {
      setLoading(false);
    }
  }, [ensureFolder]);

  // Load files when token is available
  useEffect(() => {
    if (accessToken) {
      ensureFolder(accessToken).then((id) => fetchFiles(accessToken, id));
    }
  }, [accessToken]); // eslint-disable-line

  // ── Upload a single file ──────────────────────────────────────────────────
  const uploadFile = async (file) => {
    const token = accessToken;
    const fId = folderId || await ensureFolder(token);

    const metadata = {
      name: file.name,
      parents: [fId],
    };

    const form = new FormData();
    form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
    form.append('file', file);

    setUploadProgress((prev) => ({ ...prev, [file.name]: 0 }));

    await axios.post(`${DRIVE_UPLOAD_URL}?uploadType=multipart`, form, {
      headers: { Authorization: `Bearer ${token}` },
      onUploadProgress: (evt) => {
        const pct = Math.round((evt.loaded / evt.total) * 100);
        setUploadProgress((prev) => ({ ...prev, [file.name]: pct }));
      },
    });

    setUploadProgress((prev) => {
      const next = { ...prev };
      delete next[file.name];
      return next;
    });
  };

  const handleFiles = async (fileList) => {
    if (!accessToken) { setError('Connect your Google account first.'); return; }
    const arr = Array.from(fileList);
    if (!arr.length) return;
    setUploading(true);
    setError(null);
    try {
      await Promise.all(arr.map(uploadFile));
      await fetchFiles(accessToken, folderId);
    } catch (e) {
      setError('Upload failed. Please check your permissions and try again.');
    } finally {
      setUploading(false);
    }
  };

  // ── Delete a file ─────────────────────────────────────────────────────────
  const deleteFile = async (fileId, fileName) => {
    if (!window.confirm(`Delete "${fileName}" from Google Drive?`)) return;
    try {
      await axios.delete(`${DRIVE_FILES_URL}/${fileId}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      setFiles((prev) => prev.filter((f) => f.id !== fileId));
    } catch (e) {
      setError('Failed to delete the file.');
    }
  };

  // ── Helpers ───────────────────────────────────────────────────────────────
  const isImage = (mimeType) => mimeType?.startsWith('image/');
  const isVideo = (mimeType) => mimeType?.startsWith('video/');
  const formatBytes = (bytes) => {
    if (!bytes) return '—';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };
  const formatDate = (iso) => iso ? new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '';

  const getFileIcon = (mimeType) => {
    if (isImage(mimeType)) return '🖼️';
    if (isVideo(mimeType)) return '🎬';
    if (mimeType?.includes('pdf')) return '📄';
    if (mimeType?.includes('spreadsheet') || mimeType?.includes('excel')) return '📊';
    if (mimeType?.includes('document') || mimeType?.includes('word')) return '📝';
    if (mimeType?.includes('zip') || mimeType?.includes('rar')) return '🗜️';
    return '📁';
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="gdm-root">
      {/* Header */}
      <div className="gdm-header">
        <div className="gdm-header-left">
          <div className="gdm-header-icon">
            <svg viewBox="0 0 87.3 78" xmlns="http://www.w3.org/2000/svg" className="gdm-drive-logo">
              <path d="m6.6 66.85 3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3l13.75-23.8h-27.5c0 1.55.4 3.1 1.2 4.5z" fill="#0066da"/>
              <path d="m43.65 25-13.75-23.8c-1.35.8-2.5 1.9-3.3 3.3l-25.4 44a9.06 9.06 0 0 0 -1.2 4.5h27.5z" fill="#00ac47"/>
              <path d="m73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75 7.65-13.25c.8-1.4 1.2-2.95 1.2-4.5h-27.502l5.852 11.5z" fill="#ea4335"/>
              <path d="m43.65 25 13.75-23.8c-1.35-.8-2.9-1.2-4.5-1.2h-18.5c-1.6 0-3.15.45-4.5 1.2z" fill="#00832d"/>
              <path d="m59.8 53h-32.3l-13.75 23.8c1.35.8 2.9 1.2 4.5 1.2h50.8c1.6 0 3.15-.45 4.5-1.2z" fill="#2684fc"/>
              <path d="m73.4 26.5-12.7-22c-.8-1.4-1.95-2.5-3.3-3.3l-13.75 23.8 16.15 27h27.45c0-1.55-.4-3.1-1.2-4.5z" fill="#ffba00"/>
            </svg>
          </div>
          <div>
            <h1 className="gdm-title">Google Drive Assets</h1>
            <p className="gdm-subtitle">Upload, manage and access your media files via Google Drive</p>
          </div>
        </div>

        <div className="gdm-header-right">
          {accessToken ? (
            <div className="gdm-user-pill">
              {user?.picture && <img src={user.picture} alt={user.name} className="gdm-avatar" />}
              <span className="gdm-user-name">{user?.name || 'Connected'}</span>
              <button className="gdm-btn gdm-btn-disconnect" onClick={disconnect}>Disconnect</button>
            </div>
          ) : (
            <button className="gdm-btn gdm-btn-connect" onClick={() => login()}>
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 2H3v16h5v4l4-4h5l4-4V2zm-10 9V7m4 4V7"/></svg>
              Connect Google Account
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="gdm-error">
          <span>⚠️ {error}</span>
          <button onClick={() => setError(null)}>✕</button>
        </div>
      )}

      {/* Drop Zone */}
      <div
        className={`gdm-dropzone ${dragOver ? 'gdm-dropzone--active' : ''} ${!accessToken ? 'gdm-dropzone--locked' : ''}`}
        onDragOver={(e) => { e.preventDefault(); if (accessToken) setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          handleFiles(e.dataTransfer.files);
        }}
        onClick={() => accessToken && fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          style={{ display: 'none' }}
          onChange={(e) => handleFiles(e.target.files)}
        />
        <div className="gdm-dropzone-inner">
          <div className="gdm-dropzone-icon">
            {uploading ? (
              <div className="gdm-spinner" />
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="16 16 12 12 8 16"/><line x1="12" y1="12" x2="12" y2="21"/>
                <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/>
              </svg>
            )}
          </div>
          <p className="gdm-dropzone-title">
            {uploading ? 'Uploading to Google Drive…' : dragOver ? 'Drop to upload' : 'Drag & drop files here'}
          </p>
          <p className="gdm-dropzone-hint">
            {accessToken ? 'or click to browse — files save to your Google Drive' : 'Connect your Google account to upload'}
          </p>
          {!accessToken && (
            <button className="gdm-btn gdm-btn-connect gdm-btn-sm" onClick={(e) => { e.stopPropagation(); login(); }}>
              Connect Google Account
            </button>
          )}
        </div>

        {/* Upload progress pills */}
        {Object.entries(uploadProgress).length > 0 && (
          <div className="gdm-progress-list">
            {Object.entries(uploadProgress).map(([name, pct]) => (
              <div key={name} className="gdm-progress-item">
                <span className="gdm-progress-name">{name}</span>
                <div className="gdm-progress-bar-wrap">
                  <div className="gdm-progress-bar" style={{ width: `${pct}%` }} />
                </div>
                <span className="gdm-progress-pct">{pct}%</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* File Grid */}
      <div className="gdm-section">
        <div className="gdm-section-header">
          <h2 className="gdm-section-title">
            {loading ? 'Loading assets…' : `${files.length} Asset${files.length !== 1 ? 's' : ''}`}
          </h2>
          {accessToken && !loading && (
            <button className="gdm-btn gdm-btn-ghost" onClick={() => fetchFiles(accessToken, folderId)}>
              ↻ Refresh
            </button>
          )}
        </div>

        {loading ? (
          <div className="gdm-grid">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="gdm-card gdm-card-skeleton" />
            ))}
          </div>
        ) : files.length === 0 ? (
          <div className="gdm-empty">
            <p>No assets yet. Upload files using the zone above.</p>
          </div>
        ) : (
          <div className="gdm-grid">
            {files.map((file) => (
              <div key={file.id} className="gdm-card" onClick={() => setPreviewFile(file)}>
                <div className="gdm-card-thumb">
                  {file.thumbnailLink ? (
                    <img src={file.thumbnailLink} alt={file.name} className="gdm-thumb-img" />
                  ) : (
                    <span className="gdm-thumb-icon">{getFileIcon(file.mimeType)}</span>
                  )}
                </div>
                <div className="gdm-card-info">
                  <p className="gdm-card-name" title={file.name}>{file.name}</p>
                  <p className="gdm-card-meta">{formatBytes(file.size)} · {formatDate(file.createdTime)}</p>
                </div>
                <div className="gdm-card-actions" onClick={(e) => e.stopPropagation()}>
                  <a href={file.webViewLink} target="_blank" rel="noreferrer" className="gdm-action-btn" title="Open in Drive">↗</a>
                  <button className="gdm-action-btn gdm-action-delete" title="Delete" onClick={() => deleteFile(file.id, file.name)}>✕</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Preview Modal */}
      {previewFile && (
        <div className="gdm-modal-backdrop" onClick={() => setPreviewFile(null)}>
          <div className="gdm-modal" onClick={(e) => e.stopPropagation()}>
            <div className="gdm-modal-header">
              <span className="gdm-modal-title">{previewFile.name}</span>
              <button className="gdm-modal-close" onClick={() => setPreviewFile(null)}>✕</button>
            </div>
            <div className="gdm-modal-body">
              {isImage(previewFile.mimeType) && previewFile.thumbnailLink ? (
                <img src={previewFile.thumbnailLink.replace('s220', 's800')} alt={previewFile.name} className="gdm-modal-preview-img" />
              ) : isVideo(previewFile.mimeType) ? (
                <div className="gdm-modal-no-preview">🎬 Video preview not available</div>
              ) : (
                <div className="gdm-modal-no-preview">{getFileIcon(previewFile.mimeType)} No preview available</div>
              )}
            </div>
            <div className="gdm-modal-footer">
              <span className="gdm-modal-meta">{formatBytes(previewFile.size)} · {formatDate(previewFile.createdTime)}</span>
              <a href={previewFile.webViewLink} target="_blank" rel="noreferrer" className="gdm-btn gdm-btn-connect">Open in Drive ↗</a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
