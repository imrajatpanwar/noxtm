import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './EmailNotes.css';

const EmailNotes = ({ assignmentId }) => {
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newNote, setNewNote] = useState('');
  const [adding, setAdding] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState(null);
  const [editContent, setEditContent] = useState('');

  useEffect(() => {
    if (assignmentId) {
      fetchNotes();
    }
  }, [assignmentId]);

  const fetchNotes = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`/api/email-notes/${assignmentId}`);
      setNotes(res.data.notes || []);
    } catch (error) {
      console.error('Error fetching notes:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddNote = async () => {
    const content = newNote.trim();

    if (!content) {
      return;
    }

    setAdding(true);

    try {
      await axios.post('/api/email-notes/', {
        assignmentId,
        content
      });

      setNewNote('');
      await fetchNotes();

    } catch (error) {
      console.error('Error adding note:', error);
      alert('Error adding note: ' + (error.response?.data?.error || error.message));
    } finally {
      setAdding(false);
    }
  };

  const handleEditNote = async (noteId) => {
    const content = editContent.trim();

    if (!content) {
      return;
    }

    try {
      await axios.patch(`/api/email-notes/${noteId}`, {
        content
      });

      setEditingNoteId(null);
      setEditContent('');
      await fetchNotes();

    } catch (error) {
      console.error('Error editing note:', error);
      alert('Error editing note: ' + (error.response?.data?.error || error.message));
    }
  };

  const handleDeleteNote = async (noteId) => {
    if (!confirm('Are you sure you want to delete this note?')) {
      return;
    }

    try {
      await axios.delete(`/api/email-notes/${noteId}`);
      await fetchNotes();

    } catch (error) {
      console.error('Error deleting note:', error);
      alert('Error deleting note: ' + (error.response?.data?.error || error.message));
    }
  };

  const startEdit = (note) => {
    setEditingNoteId(note._id);
    setEditContent(note.content);
  };

  const cancelEdit = () => {
    setEditingNoteId(null);
    setEditContent('');
  };

  const formatDate = (date) => {
    const d = new Date(date);
    const now = new Date();
    const diff = now - d;
    const hours = diff / (1000 * 60 * 60);

    if (hours < 1) {
      const minutes = Math.floor(diff / (1000 * 60));
      return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`;
    } else if (hours < 24) {
      return `${Math.floor(hours)} hour${Math.floor(hours) !== 1 ? 's' : ''} ago`;
    } else if (hours < 48) {
      return 'Yesterday';
    } else {
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }
  };

  if (loading) {
    return <div className="notes-loading">Loading notes...</div>;
  }

  return (
    <div className="email-notes">
      {/* Add Note Form */}
      <div className="add-note-form">
        <textarea
          value={newNote}
          onChange={(e) => setNewNote(e.target.value)}
          placeholder="Add a note..."
          rows="3"
          disabled={adding}
        />
        <button
          className="btn-add-note"
          onClick={handleAddNote}
          disabled={adding || !newNote.trim()}
        >
          {adding ? 'Adding...' : 'Add Note'}
        </button>
      </div>

      {/* Notes List */}
      {notes.length === 0 ? (
        <div className="no-notes">
          <p>No notes yet</p>
          <small>Add internal notes to collaborate with your team</small>
        </div>
      ) : (
        <div className="notes-list">
          {notes.map(note => (
            <div key={note._id} className="note-item">
              <div className="note-header">
                <div className="note-author-info">
                  <div className="author-avatar">
                    {note.author?.name?.charAt(0) || '?'}
                  </div>
                  <div>
                    <div className="author-name">{note.author?.name || 'Unknown'}</div>
                    <div className="note-date">
                      {formatDate(note.createdAt)}
                      {note.edited && <span className="edited-badge">(edited)</span>}
                    </div>
                  </div>
                </div>

                <div className="note-actions">
                  {editingNoteId !== note._id && (
                    <>
                      <button
                        className="note-action-btn"
                        onClick={() => startEdit(note)}
                        title="Edit"
                      >
                        ✏️
                      </button>
                      <button
                        className="note-action-btn"
                        onClick={() => handleDeleteNote(note._id)}
                        title="Delete"
                      >
                        🗑️
                      </button>
                    </>
                  )}
                </div>
              </div>

              {editingNoteId === note._id ? (
                <div className="edit-note-form">
                  <textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    rows="3"
                  />
                  <div className="edit-actions">
                    <button
                      className="btn-cancel"
                      onClick={cancelEdit}
                    >
                      Cancel
                    </button>
                    <button
                      className="btn-save"
                      onClick={() => handleEditNote(note._id)}
                      disabled={!editContent.trim()}
                    >
                      Save
                    </button>
                  </div>
                </div>
              ) : (
                <div className="note-content">{note.content}</div>
              )}

              {note.mentions && note.mentions.length > 0 && (
                <div className="note-mentions">
                  Mentioned: {note.mentions.map(m => m.name).join(', ')}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default EmailNotes;
