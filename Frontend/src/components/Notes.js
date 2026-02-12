import React, { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from 'sonner';
import {
  FiPlus, FiSearch, FiEdit3, FiTrash2, FiX, FiBookmark, FiArchive,
  FiTag, FiClock, FiMoreVertical, FiCheck, FiChevronDown
} from 'react-icons/fi';
import api from '../config/api';
import './Notes.css';

function Notes() {
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  const [selectedNote, setSelectedNote] = useState(null);
  const [showEditor, setShowEditor] = useState(false);
  const [editorData, setEditorData] = useState({ title: '', content: '', tags: [], color: 'default' });
  const [isEditing, setIsEditing] = useState(false);
  const [activeMenu, setActiveMenu] = useState(null);
  const [tagInput, setTagInput] = useState('');
  const menuRef = useRef(null);
  const searchTimer = useRef(null);

  // Fetch notes
  const fetchNotes = useCallback(async (searchQuery = '') => {
    try {
      setLoading(true);
      const params = { archived: showArchived };
      if (searchQuery) params.search = searchQuery;
      const res = await api.get('/api/notes', { params });
      if (res.data.success) {
        setNotes(res.data.notes);
      }
    } catch (err) {
      toast.error('Failed to load notes');
    } finally {
      setLoading(false);
    }
  }, [showArchived]);

  useEffect(() => { fetchNotes(); }, [fetchNotes]);

  // Debounced search
  const handleSearch = (value) => {
    setSearch(value);
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => fetchNotes(value), 300);
  };

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setActiveMenu(null);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Create note
  const handleCreate = async () => {
    if (!editorData.title.trim()) {
      toast.error('Title is required');
      return;
    }
    try {
      const res = await api.post('/api/notes', editorData);
      if (res.data.success) {
        toast.success('Note created');
        setShowEditor(false);
        resetEditor();
        fetchNotes(search);
      }
    } catch (err) {
      toast.error('Failed to create note');
    }
  };

  // Update note
  const handleUpdate = async () => {
    if (!editorData.title.trim()) {
      toast.error('Title is required');
      return;
    }
    try {
      const res = await api.put(`/api/notes/${selectedNote._id}`, editorData);
      if (res.data.success) {
        toast.success('Note updated');
        setShowEditor(false);
        resetEditor();
        fetchNotes(search);
      }
    } catch (err) {
      toast.error('Failed to update note');
    }
  };

  // Delete note
  const handleDelete = async (id) => {
    if (!window.confirm('Delete this note permanently?')) return;
    try {
      const res = await api.delete(`/api/notes/${id}`);
      if (res.data.success) {
        toast.success('Note deleted');
        fetchNotes(search);
      }
    } catch (err) {
      toast.error('Failed to delete note');
    }
  };

  // Toggle pin
  const handlePin = async (id) => {
    try {
      const res = await api.patch(`/api/notes/${id}/pin`);
      if (res.data.success) fetchNotes(search);
    } catch (err) {
      toast.error('Failed to pin note');
    }
  };

  // Toggle archive
  const handleArchive = async (id) => {
    try {
      const res = await api.patch(`/api/notes/${id}/archive`);
      if (res.data.success) {
        toast.success(showArchived ? 'Note restored' : 'Note archived');
        fetchNotes(search);
      }
    } catch (err) {
      toast.error('Failed to archive note');
    }
  };

  // Open editor
  const openNewNote = () => {
    resetEditor();
    setIsEditing(false);
    setSelectedNote(null);
    setShowEditor(true);
  };

  const openEditNote = (note) => {
    setEditorData({
      title: note.title,
      content: note.content,
      tags: note.tags || [],
      color: note.color || 'default'
    });
    setSelectedNote(note);
    setIsEditing(true);
    setShowEditor(true);
    setActiveMenu(null);
  };

  const resetEditor = () => {
    setEditorData({ title: '', content: '', tags: [], color: 'default' });
    setTagInput('');
    setSelectedNote(null);
  };

  // Tag handling
  const addTag = () => {
    const tag = tagInput.trim();
    if (tag && !editorData.tags.includes(tag) && editorData.tags.length < 10) {
      setEditorData(prev => ({ ...prev, tags: [...prev.tags, tag] }));
      setTagInput('');
    }
  };

  const removeTag = (tag) => {
    setEditorData(prev => ({ ...prev, tags: prev.tags.filter(t => t !== tag) }));
  };

  const handleTagKeyDown = (e) => {
    if (e.key === 'Enter') { e.preventDefault(); addTag(); }
    if (e.key === 'Backspace' && !tagInput && editorData.tags.length > 0) {
      removeTag(editorData.tags[editorData.tags.length - 1]);
    }
  };

  // Format date
  const formatDate = (dateStr) => {
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now - d;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHrs = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHrs < 24) return `${diffHrs}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  // Truncate content for card preview
  const truncate = (str, len = 120) => {
    if (!str) return '';
    return str.length > len ? str.substring(0, len) + '...' : str;
  };

  const pinnedNotes = notes.filter(n => n.pinned);
  const otherNotes = notes.filter(n => !n.pinned);

  return (
    <div className="notes-container">
      {/* Header */}
      <div className="notes-header">
        <div className="notes-header-left">
          <h1 className="notes-title">Notes</h1>
          <span className="notes-count">{notes.length}</span>
        </div>
        <div className="notes-header-right">
          <div className="notes-search">
            <FiSearch className="notes-search-icon" />
            <input
              type="text"
              placeholder="Search notes..."
              value={search}
              onChange={(e) => handleSearch(e.target.value)}
              className="notes-search-input"
            />
            {search && (
              <button className="notes-search-clear" onClick={() => { setSearch(''); fetchNotes(); }}>
                <FiX />
              </button>
            )}
          </div>
          <button
            className={`notes-filter-btn ${showArchived ? 'active' : ''}`}
            onClick={() => setShowArchived(!showArchived)}
          >
            <FiArchive />
            <span>{showArchived ? 'Archived' : 'Active'}</span>
            <FiChevronDown />
          </button>
          <button className="notes-new-btn" onClick={openNewNote}>
            <FiPlus />
            <span>New Note</span>
          </button>
        </div>
      </div>

      {/* Notes Grid */}
      <div className="notes-body">
        {loading ? (
          <div className="notes-loading">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="notes-skeleton" />
            ))}
          </div>
        ) : notes.length === 0 ? (
          <div className="notes-empty">
            <div className="notes-empty-icon">
              <FiEdit3 />
            </div>
            <h3>{showArchived ? 'No archived notes' : 'No notes yet'}</h3>
            <p>{showArchived ? 'Notes you archive will appear here.' : 'Create your first note to get started.'}</p>
            {!showArchived && (
              <button className="notes-empty-btn" onClick={openNewNote}>
                <FiPlus /> New Note
              </button>
            )}
          </div>
        ) : (
          <>
            {pinnedNotes.length > 0 && (
              <>
                <div className="notes-section-label">Pinned</div>
                <div className="notes-grid">
                  {pinnedNotes.map(note => (
                    <NoteCard
                      key={note._id}
                      note={note}
                      activeMenu={activeMenu}
                      setActiveMenu={setActiveMenu}
                      menuRef={menuRef}
                      onEdit={openEditNote}
                      onDelete={handleDelete}
                      onPin={handlePin}
                      onArchive={handleArchive}
                      formatDate={formatDate}
                      truncate={truncate}
                    />
                  ))}
                </div>
              </>
            )}

            {otherNotes.length > 0 && (
              <>
                {pinnedNotes.length > 0 && <div className="notes-section-label">Others</div>}
                <div className="notes-grid">
                  {otherNotes.map(note => (
                    <NoteCard
                      key={note._id}
                      note={note}
                      activeMenu={activeMenu}
                      setActiveMenu={setActiveMenu}
                      menuRef={menuRef}
                      onEdit={openEditNote}
                      onDelete={handleDelete}
                      onPin={handlePin}
                      onArchive={handleArchive}
                      formatDate={formatDate}
                      truncate={truncate}
                    />
                  ))}
                </div>
              </>
            )}
          </>
        )}
      </div>

      {/* Editor Modal */}
      {showEditor && (
        <div className="notes-modal-overlay" onClick={() => { setShowEditor(false); resetEditor(); }}>
          <div className="notes-modal" onClick={(e) => e.stopPropagation()}>
            <div className="notes-modal-header">
              <h2>{isEditing ? 'Edit Note' : 'New Note'}</h2>
              <button className="notes-modal-close" onClick={() => { setShowEditor(false); resetEditor(); }}>
                <FiX />
              </button>
            </div>

            <div className="notes-modal-body">
              <input
                type="text"
                className="notes-editor-title"
                placeholder="Title"
                value={editorData.title}
                onChange={(e) => setEditorData(prev => ({ ...prev, title: e.target.value }))}
                autoFocus
                maxLength={200}
              />

              <textarea
                className="notes-editor-content"
                placeholder="Write your note..."
                value={editorData.content}
                onChange={(e) => setEditorData(prev => ({ ...prev, content: e.target.value }))}
                rows={12}
              />

              <div className="notes-editor-tags">
                <FiTag className="notes-tag-icon" />
                <div className="notes-tag-list">
                  {editorData.tags.map(tag => (
                    <span key={tag} className="notes-tag">
                      {tag}
                      <button onClick={() => removeTag(tag)}><FiX /></button>
                    </span>
                  ))}
                  <input
                    type="text"
                    className="notes-tag-input"
                    placeholder={editorData.tags.length === 0 ? 'Add tags...' : ''}
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={handleTagKeyDown}
                    maxLength={30}
                  />
                </div>
              </div>
            </div>

            <div className="notes-modal-footer">
              <button className="notes-btn-cancel" onClick={() => { setShowEditor(false); resetEditor(); }}>
                Cancel
              </button>
              <button className="notes-btn-save" onClick={isEditing ? handleUpdate : handleCreate}>
                <FiCheck />
                {isEditing ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================
// Note Card Component
// ============================================
function NoteCard({ note, activeMenu, setActiveMenu, menuRef, onEdit, onDelete, onPin, onArchive, formatDate, truncate }) {
  return (
    <div className={`note-card ${note.pinned ? 'pinned' : ''}`} onClick={() => onEdit(note)}>
      <div className="note-card-top">
        <h3 className="note-card-title">{note.title}</h3>
        <div className="note-card-menu-wrapper" ref={activeMenu === note._id ? menuRef : null}>
          <button
            className="note-card-menu-btn"
            onClick={(e) => { e.stopPropagation(); setActiveMenu(activeMenu === note._id ? null : note._id); }}
          >
            <FiMoreVertical />
          </button>
          {activeMenu === note._id && (
            <div className="note-card-dropdown">
              <button onClick={(e) => { e.stopPropagation(); onPin(note._id); setActiveMenu(null); }}>
                <FiBookmark /> {note.pinned ? 'Unpin' : 'Pin'}
              </button>
              <button onClick={(e) => { e.stopPropagation(); onEdit(note); }}>
                <FiEdit3 /> Edit
              </button>
              <button onClick={(e) => { e.stopPropagation(); onArchive(note._id); setActiveMenu(null); }}>
                <FiArchive /> {note.archived ? 'Restore' : 'Archive'}
              </button>
              <button className="danger" onClick={(e) => { e.stopPropagation(); onDelete(note._id); setActiveMenu(null); }}>
                <FiTrash2 /> Delete
              </button>
            </div>
          )}
        </div>
      </div>

      {note.content && (
        <p className="note-card-content">{truncate(note.content)}</p>
      )}

      <div className="note-card-bottom">
        <div className="note-card-tags">
          {(note.tags || []).slice(0, 3).map(tag => (
            <span key={tag} className="note-card-tag">{tag}</span>
          ))}
          {(note.tags || []).length > 3 && (
            <span className="note-card-tag-more">+{note.tags.length - 3}</span>
          )}
        </div>
        <div className="note-card-time">
          <FiClock />
          <span>{formatDate(note.updatedAt)}</span>
        </div>
      </div>

      {note.pinned && <div className="note-pin-indicator"><FiBookmark /></div>}
    </div>
  );
}

export default Notes;
