import React, { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from 'sonner';
import {
  FiPlus, FiSearch, FiEdit3, FiTrash2, FiX, FiBookmark, FiArchive,
  FiTag, FiClock, FiMoreVertical, FiCheck, FiChevronDown,
  FiUserPlus, FiUser, FiSend, FiXCircle, FiCheckCircle, FiInbox
} from 'react-icons/fi';
import api from '../config/api';
import './Notes.css';

function Notes() {
  const [notes, setNotes] = useState([]);
  const [assignedNotes, setAssignedNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  const [activeTab, setActiveTab] = useState('my'); // 'my' | 'assigned'
  const [selectedNote, setSelectedNote] = useState(null);
  const [showEditor, setShowEditor] = useState(false);
  const [editorData, setEditorData] = useState({ title: '', content: '', tags: [], color: 'default', assignedTo: [] });
  const [isEditing, setIsEditing] = useState(false);
  const [activeMenu, setActiveMenu] = useState(null);
  const [tagInput, setTagInput] = useState('');
  const [companyUsers, setCompanyUsers] = useState([]);
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const menuRef = useRef(null);
  const searchTimer = useRef(null);
  const userDropdownRef = useRef(null);

  // Fetch company users for assignment
  const fetchCompanyUsers = useCallback(async () => {
    try {
      const res = await api.get('/notes/company-users');
      if (res.data.success) setCompanyUsers(res.data.users);
    } catch (err) { /* ignore */ }
  }, []);

  useEffect(() => { fetchCompanyUsers(); }, [fetchCompanyUsers]);

  // Fetch notes
  const fetchNotes = useCallback(async (searchQuery = '') => {
    try {
      setLoading(true);
      const params = { archived: showArchived };
      if (searchQuery) params.search = searchQuery;
      const res = await api.get('/notes', { params });
      if (res.data.success) {
        setNotes(res.data.notes);
      }
    } catch (err) {
      toast.error('Failed to load notes');
    } finally {
      setLoading(false);
    }
  }, [showArchived]);

  // Fetch assigned notes
  const fetchAssignedNotes = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get('/notes/assigned');
      if (res.data.success) {
        setAssignedNotes(res.data.notes);
      }
    } catch (err) {
      toast.error('Failed to load assigned notes');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'my') fetchNotes();
    else fetchAssignedNotes();
  }, [activeTab, fetchNotes, fetchAssignedNotes]);

  // Debounced search
  const handleSearch = (value) => {
    setSearch(value);
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => fetchNotes(value), 300);
  };

  // Close dropdowns on outside click
  useEffect(() => {
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setActiveMenu(null);
      if (userDropdownRef.current && !userDropdownRef.current.contains(e.target)) setShowUserDropdown(false);
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
      const res = await api.post('/notes', editorData);
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
      const payload = { ...editorData };
      // If assignedTo changed to empty array, send empty array to clear assignment
      if (!payload.assignedTo || payload.assignedTo.length === 0) payload.assignedTo = [];
      const res = await api.put(`/notes/${selectedNote._id}`, payload);
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
      const res = await api.delete(`/notes/${id}`);
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
      const res = await api.patch(`/notes/${id}/pin`);
      if (res.data.success) fetchNotes(search);
    } catch (err) {
      toast.error('Failed to pin note');
    }
  };

  // Toggle archive
  const handleArchive = async (id) => {
    try {
      const res = await api.patch(`/notes/${id}/archive`);
      if (res.data.success) {
        toast.success(showArchived ? 'Note restored' : 'Note archived');
        fetchNotes(search);
      }
    } catch (err) {
      toast.error('Failed to archive note');
    }
  };

  // Respond to assigned note
  const handleAssignmentResponse = async (noteId, response) => {
    try {
      const res = await api.patch(`/notes/${noteId}/respond`, { response });
      if (res.data.success) {
        toast.success(response === 'accepted' ? 'Note accepted' : 'Note rejected');
        fetchAssignedNotes();
      }
    } catch (err) {
      toast.error('Failed to respond');
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
    // Extract user IDs from assignedTo (handle both array and single value)
    let assignedUserIds = [];
    if (note.assignedTo) {
      if (Array.isArray(note.assignedTo)) {
        assignedUserIds = note.assignedTo.map(u => typeof u === 'string' ? u : u._id);
      } else {
        assignedUserIds = [typeof note.assignedTo === 'string' ? note.assignedTo : note.assignedTo._id];
      }
    }
    // Include botgit if note has bot access
    if (note.botgitAccess) {
      assignedUserIds = ['botgit', ...assignedUserIds];
    }
    
    setEditorData({
      title: note.title,
      content: note.content,
      tags: note.tags || [],
      color: note.color || 'default',
      assignedTo: assignedUserIds
    });
    setSelectedNote(note);
    setIsEditing(true);
    setShowEditor(true);
    setActiveMenu(null);
  };

  const resetEditor = () => {
    setEditorData({ title: '', content: '', tags: [], color: 'default', assignedTo: [] });
    setTagInput('');
    setUserSearchQuery('');
    setShowUserDropdown(false);
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

  // Botgit virtual identity for AI bot assignment
  const BOTGIT_IDENTITY = { _id: 'botgit', fullName: 'botgit', email: 'AI Bot · WhatsApp', isBotgit: true };

  // User assignment helpers
  const getSelectedUsers = () => {
    if (!editorData.assignedTo || editorData.assignedTo.length === 0) return [];
    return editorData.assignedTo.map(userId => {
      // Handle botgit special identity
      if (userId === 'botgit') return BOTGIT_IDENTITY;
      // Check if user data is already in selectedNote (populated)
      if (selectedNote?.assignedTo && Array.isArray(selectedNote.assignedTo)) {
        const foundUser = selectedNote.assignedTo.find(u => (u._id || u) === userId);
        if (foundUser && foundUser.fullName) return foundUser;
      }
      // Otherwise look up in companyUsers
      return companyUsers.find(u => u._id === userId) || { _id: userId, fullName: 'Unknown' };
    });
  };
  
  const addAssignedUser = (userId) => {
    if (!editorData.assignedTo.includes(userId)) {
      setEditorData(prev => ({ ...prev, assignedTo: [...prev.assignedTo, userId] }));
    }
    setUserSearchQuery('');
  };
  
  const removeAssignedUser = (userId) => {
    setEditorData(prev => ({ ...prev, assignedTo: prev.assignedTo.filter(id => id !== userId) }));
  };

  const filteredUsersRaw = companyUsers.filter(u =>
    u.fullName.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
    u.email.toLowerCase().includes(userSearchQuery.toLowerCase())
  );
  // Prepend botgit identity if it matches search
  const botgitMatch = !userSearchQuery || 'botgit'.includes(userSearchQuery.toLowerCase()) || 'ai bot'.includes(userSearchQuery.toLowerCase());
  const filteredUsers = botgitMatch ? [BOTGIT_IDENTITY, ...filteredUsersRaw] : filteredUsersRaw;

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
  const pendingAssigned = assignedNotes.filter(n => n.myAssignmentStatus === 'pending' || (!n.myAssignmentStatus && n.assignmentStatus === 'pending'));
  const acceptedAssigned = assignedNotes.filter(n => n.myAssignmentStatus === 'accepted' || (!n.myAssignmentStatus && n.assignmentStatus === 'accepted'));

  return (
    <div className="notes-container">
      {/* Header */}
      <div className="notes-header">
        <div className="notes-header-left">
          <h1 className="notes-title">Notes</h1>
          <span className="notes-count">{activeTab === 'my' ? notes.length : assignedNotes.length}</span>
        </div>
        <div className="notes-header-right">
          {activeTab === 'my' && (
            <>
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
            </>
          )}
          <button className="notes-new-btn" onClick={openNewNote}>
            <FiPlus />
            <span>New Note</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="notes-tabs">
        <button
          className={`notes-tab ${activeTab === 'my' ? 'active' : ''}`}
          onClick={() => setActiveTab('my')}
        >
          <FiEdit3 /> My Notes
        </button>
        <button
          className={`notes-tab ${activeTab === 'assigned' ? 'active' : ''}`}
          onClick={() => setActiveTab('assigned')}
        >
          <FiInbox /> Assigned to Me
          {pendingAssigned.length > 0 && (
            <span className="notes-tab-badge">{pendingAssigned.length}</span>
          )}
        </button>
      </div>

      {/* Notes Content */}
      <div className="notes-body">
        {loading ? (
          <div className="notes-loading">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="notes-skeleton" />
            ))}
          </div>
        ) : activeTab === 'my' ? (
          /* MY NOTES TAB */
          notes.length === 0 ? (
            <div className="notes-empty">
              <div className="notes-empty-icon"><FiEdit3 /></div>
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
          )
        ) : (
          /* ASSIGNED TO ME TAB */
          assignedNotes.length === 0 ? (
            <div className="notes-empty">
              <div className="notes-empty-icon"><FiInbox /></div>
              <h3>No assigned notes</h3>
              <p>Notes assigned to you by others will appear here.</p>
            </div>
          ) : (
            <>
              {pendingAssigned.length > 0 && (
                <>
                  <div className="notes-section-label">Pending Review</div>
                  <div className="notes-grid">
                    {pendingAssigned.map(note => (
                      <AssignedNoteCard
                        key={note._id}
                        note={note}
                        onRespond={handleAssignmentResponse}
                        formatDate={formatDate}
                        truncate={truncate}
                      />
                    ))}
                  </div>
                </>
              )}
              {acceptedAssigned.length > 0 && (
                <>
                  <div className="notes-section-label">Accepted</div>
                  <div className="notes-grid">
                    {acceptedAssigned.map(note => (
                      <AssignedNoteCard
                        key={note._id}
                        note={note}
                        onRespond={handleAssignmentResponse}
                        formatDate={formatDate}
                        truncate={truncate}
                        accepted
                      />
                    ))}
                  </div>
                </>
              )}
            </>
          )
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

              {/* Assign to User */}
              <div className="notes-assign-section">
                <div className="notes-assign-label">
                  <FiUserPlus />
                  <span>Assign to</span>
                </div>
                <div className="notes-assign-picker" ref={userDropdownRef}>
                  {/* Show selected users as badges */}
                  {editorData.assignedTo && editorData.assignedTo.length > 0 && (
                    <div className="notes-assign-selected-list">
                      {getSelectedUsers().map(user => (
                        <div key={user._id} className={`notes-assign-selected-badge ${user.isBotgit ? 'botgit-badge' : ''}`}>
                          <div className={`notes-assign-avatar ${user.isBotgit ? 'botgit-avatar' : ''}`}>
                            {user.isBotgit ? <span style={{ fontSize: '10px' }}>🤖</span> : <FiUser />}
                          </div>
                          <span>{user.fullName}</span>
                          <button onClick={() => removeAssignedUser(user._id)}>
                            <FiX />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {/* Trigger to open dropdown */}
                  <div
                    className="notes-assign-trigger"
                    onClick={() => setShowUserDropdown(!showUserDropdown)}
                  >
                    <FiUser />
                    <span>{editorData.assignedTo.length > 0 ? 'Add more...' : 'Select team members...'}</span>
                  </div>
                  
                  {showUserDropdown && (
                    <div className="notes-assign-dropdown">
                      <div className="notes-assign-search">
                        <FiSearch />
                        <input
                          type="text"
                          placeholder="Search users..."
                          value={userSearchQuery}
                          onChange={(e) => setUserSearchQuery(e.target.value)}
                          autoFocus
                        />
                      </div>
                      <div className="notes-assign-list">
                        {filteredUsers.length === 0 ? (
                          <div className="notes-assign-empty">No users found</div>
                        ) : (
                          filteredUsers.map(user => {
                            const isSelected = editorData.assignedTo.includes(user._id);
                            return (
                              <button
                                key={user._id}
                                className={`notes-assign-option ${isSelected ? 'selected' : ''} ${user.isBotgit ? 'botgit-option' : ''}`}
                                onClick={() => {
                                  if (isSelected) {
                                    removeAssignedUser(user._id);
                                  } else {
                                    addAssignedUser(user._id);
                                  }
                                }}
                              >
                                <div className={`notes-assign-avatar ${user.isBotgit ? 'botgit-avatar' : ''}`}>
                                  {user.isBotgit ? <span style={{ fontSize: '11px' }}>🤖</span> : <FiUser />}
                                </div>
                                <div className="notes-assign-info">
                                  <span className="notes-assign-name">{user.fullName}</span>
                                  <span className="notes-assign-email">{user.email}</span>
                                </div>
                                {isSelected && <FiCheck className="notes-assign-check" />}
                              </button>
                            );
                          })
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

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
                {editorData.assignedTo && editorData.assignedTo.length > 0 ? <FiSend /> : <FiCheck />}
                {isEditing ? 'Update' : (editorData.assignedTo && editorData.assignedTo.length > 0 ? 'Create & Assign' : 'Create')}
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
  const assignedUsers = note.assignedTo && Array.isArray(note.assignedTo) ? note.assignedTo : (note.assignedTo ? [note.assignedTo] : []);
  const hasAssignments = assignedUsers.length > 0 && note.assignments && note.assignments.length > 0;
  const hasBotgit = note.botgitAccess;

  const getInitial = (name) => {
    return name ? name.charAt(0).toUpperCase() : '?';
  };
  
  const getStatusForUser = (userId) => {
    if (!note.assignments) return 'pending';
    const assignment = note.assignments.find(a => (a.userId._id || a.userId).toString() === (userId._id || userId).toString());
    return assignment?.status || 'pending';
  };

  return (
    <div className={`note-card ${note.pinned ? 'pinned' : ''}`} onClick={() => onEdit(note)}>
      <div className="note-card-top">
        <h3 className="note-card-title">{note.title}</h3>
        {(hasAssignments || hasBotgit) && (
          <div className="note-card-avatars">
            {hasBotgit && (
              <div 
                className="note-card-avatar botgit-card-avatar" 
                title="botgit - AI Bot"
                style={{ zIndex: 11 }}
              >
                🤖
              </div>
            )}
            {assignedUsers.slice(0, 3).map((user, idx) => {
              const status = getStatusForUser(user._id || user);
              const userName = user.fullName || user.name || 'User';
              return (
                <div 
                  key={idx} 
                  className={`note-card-avatar ${status}`} 
                  title={`${userName} - ${status}`}
                  style={{ marginLeft: idx > 0 ? '-8px' : '0', zIndex: 10 - idx }}
                >
                  {getInitial(userName)}
                </div>
              );
            })}
            {assignedUsers.length > 3 && (
              <div className="note-card-avatar-more" title={`+${assignedUsers.length - 3} more`}>
                +{assignedUsers.length - 3}
              </div>
            )}
          </div>
        )}
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

// ============================================
// Assigned Note Card Component (for "Assigned to Me" tab)
// ============================================
function AssignedNoteCard({ note, onRespond, formatDate, truncate, accepted }) {
  const sender = note.assignedBy || note.userId;

  return (
    <div className={`note-card assigned-card ${accepted ? 'accepted' : 'pending'}`}>
      <div className="note-card-top">
        <h3 className="note-card-title">{note.title}</h3>
        <div className="assigned-from">
          <FiUser />
          <span>{sender?.fullName || 'Unknown'}</span>
        </div>
      </div>

      {note.content && (
        <p className="note-card-content">{truncate(note.content)}</p>
      )}

      <div className="note-card-tags" style={{ marginTop: 8 }}>
        {(note.tags || []).slice(0, 3).map(tag => (
          <span key={tag} className="note-card-tag">{tag}</span>
        ))}
      </div>

      <div className="note-card-bottom">
        <div className="note-card-time">
          <FiClock />
          <span>{formatDate(note.assignedAt || note.updatedAt)}</span>
        </div>
        {!accepted ? (
          <div className="assigned-actions">
            <button
              className="assigned-btn accept"
              onClick={() => onRespond(note._id, 'accepted')}
              title="Accept"
            >
              <FiCheckCircle />
            </button>
            <button
              className="assigned-btn reject"
              onClick={() => onRespond(note._id, 'rejected')}
              title="Reject"
            >
              <FiXCircle />
            </button>
          </div>
        ) : (
          <span className="assigned-status-label accepted">
            <FiCheck /> Accepted
          </span>
        )}
      </div>
    </div>
  );
}

export default Notes;
