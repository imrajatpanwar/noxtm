import React, { useState, useEffect, useCallback } from 'react';
import {
  FiBookOpen, FiPlus, FiEdit3, FiTrash2, FiX, FiSave, FiChevronRight,
  FiFileText, FiClock, FiChevronDown, FiSearch, FiLayers,
  FiUsers, FiHeart, FiDollarSign, FiSettings, FiShield, FiTarget
} from 'react-icons/fi';
import api from '../config/api';
import './CompanyHandbook.css';

const ICON_MAP = {
  book: FiBookOpen,
  file: FiFileText,
  users: FiUsers,
  heart: FiHeart,
  dollar: FiDollarSign,
  settings: FiSettings,
  shield: FiShield,
  target: FiTarget,
  layers: FiLayers,
};
const ICON_OPTIONS = Object.keys(ICON_MAP);

function CompanyHandbook() {
  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Section modal
  const [showSectionModal, setShowSectionModal] = useState(false);
  const [editingSection, setEditingSection] = useState(null);
  const [sectionForm, setSectionForm] = useState({ title: '', description: '', icon: 'book', status: 'draft' });
  const [savingSection, setSavingSection] = useState(false);

  // Page modal
  const [showPageModal, setShowPageModal] = useState(false);
  const [editingPage, setEditingPage] = useState(null);
  const [pageParentId, setPageParentId] = useState(null);
  const [pageForm, setPageForm] = useState({ title: '', content: '' });
  const [savingPage, setSavingPage] = useState(false);

  // Active section & page for reader view
  const [activeSectionId, setActiveSectionId] = useState(null);
  const [activePageId, setActivePageId] = useState(null);

  const fetchSections = useCallback(async () => {
    try {
      const res = await api.get('/handbook');
      if (res.data.success) setSections(res.data.sections);
    } catch (err) {
      console.error('Error fetching handbook:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchSections(); }, [fetchSections]);

  // Section CRUD
  const openCreateSection = () => {
    setEditingSection(null);
    setSectionForm({ title: '', description: '', icon: 'book', status: 'draft' });
    setShowSectionModal(true);
  };

  const openEditSection = (s) => {
    setEditingSection(s);
    setSectionForm({ title: s.title, description: s.description || '', icon: s.icon || 'book', status: s.status });
    setShowSectionModal(true);
  };

  const saveSection = async () => {
    if (!sectionForm.title.trim()) return;
    setSavingSection(true);
    try {
      if (editingSection) {
        await api.put(`/handbook/${editingSection._id}`, sectionForm);
      } else {
        await api.post('/handbook', sectionForm);
      }
      setShowSectionModal(false);
      fetchSections();
    } catch (err) {
      console.error('Error saving section:', err);
    } finally {
      setSavingSection(false);
    }
  };

  const deleteSection = async (id) => {
    if (!window.confirm('Delete this handbook section and all its pages?')) return;
    try {
      await api.delete(`/handbook/${id}`);
      if (activeSectionId === id) { setActiveSectionId(null); setActivePageId(null); }
      fetchSections();
    } catch (err) {
      console.error('Error deleting section:', err);
    }
  };

  // Page CRUD
  const openCreatePage = (sectionId) => {
    setPageParentId(sectionId);
    setEditingPage(null);
    setPageForm({ title: '', content: '' });
    setShowPageModal(true);
  };

  const openEditPage = (sectionId, page) => {
    setPageParentId(sectionId);
    setEditingPage(page);
    setPageForm({ title: page.title, content: page.content || '' });
    setShowPageModal(true);
  };

  const savePage = async () => {
    if (!pageForm.title.trim()) return;
    setSavingPage(true);
    try {
      if (editingPage) {
        await api.put(`/handbook/${pageParentId}/pages/${editingPage._id}`, pageForm);
      } else {
        await api.post(`/handbook/${pageParentId}/pages`, pageForm);
      }
      setShowPageModal(false);
      fetchSections();
    } catch (err) {
      console.error('Error saving page:', err);
    } finally {
      setSavingPage(false);
    }
  };

  const deletePage = async (sectionId, pageId) => {
    if (!window.confirm('Delete this page?')) return;
    try {
      await api.delete(`/handbook/${sectionId}/pages/${pageId}`);
      if (activePageId === pageId) setActivePageId(null);
      fetchSections();
    } catch (err) {
      console.error('Error deleting page:', err);
    }
  };

  // Filter
  const filteredSections = sections.filter(s =>
    s.title.toLowerCase().includes(search.toLowerCase()) ||
    s.description?.toLowerCase().includes(search.toLowerCase()) ||
    s.pages?.some(p => p.title.toLowerCase().includes(search.toLowerCase()))
  );

  // Lookup active section/page objects
  const activeSection = sections.find(s => s._id === activeSectionId);
  const activePage = activeSection?.pages?.find(p => p._id === activePageId);

  const getIcon = (key) => ICON_MAP[key] || FiBookOpen;

  const fmtDate = (d) => {
    if (!d) return '';
    return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const totalPages = sections.reduce((sum, s) => sum + (s.pages?.length || 0), 0);

  /* ============ READER VIEW ============ */
  if (activeSectionId && activeSection) {
    const SIcon = getIcon(activeSection.icon);

    return (
      <div className="hb-wrap">
        <div className="hb-reader">
          {/* Sidebar TOC */}
          <aside className="hb-toc">
            <div className="hb-toc-header">
              <button className="hb-toc-back" onClick={() => { setActiveSectionId(null); setActivePageId(null); }}>
                <FiChevronDown className="hb-back-arrow" /> All Sections
              </button>
            </div>
            <div className="hb-toc-section-title">
              <SIcon size={16} />
              <span>{activeSection.title}</span>
            </div>
            <nav className="hb-toc-pages">
              {(activeSection.pages || []).sort((a, b) => a.sortOrder - b.sortOrder).map((pg, i) => (
                <button
                  key={pg._id}
                  className={`hb-toc-page ${activePageId === pg._id ? 'active' : ''}`}
                  onClick={() => setActivePageId(pg._id)}
                >
                  <span className="hb-toc-num">{i + 1}</span>
                  <span className="hb-toc-page-title">{pg.title}</span>
                </button>
              ))}
              <button className="hb-toc-add-page" onClick={() => openCreatePage(activeSection._id)}>
                <FiPlus size={13} /> Add Page
              </button>
            </nav>
          </aside>

          {/* Content area */}
          <main className="hb-content">
            {activePage ? (
              <div className="hb-page">
                <div className="hb-page-header">
                  <h1>{activePage.title}</h1>
                  <div className="hb-page-actions">
                    <button className="hb-icon-btn" onClick={() => openEditPage(activeSection._id, activePage)}><FiEdit3 size={15} /></button>
                    <button className="hb-icon-btn danger" onClick={() => deletePage(activeSection._id, activePage._id)}><FiTrash2 size={15} /></button>
                  </div>
                </div>
                <div className="hb-page-body">
                  {activePage.content ? (
                    <div className="hb-rich" dangerouslySetInnerHTML={{ __html: activePage.content.replace(/\n/g, '<br/>') }} />
                  ) : (
                    <p className="hb-no-content">This page is empty. Click edit to add content.</p>
                  )}
                </div>
              </div>
            ) : (
              <div className="hb-page-placeholder">
                <div className="hb-page-ph-icon"><SIcon size={40} /></div>
                <h2>{activeSection.title}</h2>
                {activeSection.description && <p>{activeSection.description}</p>}
                <p className="hb-page-ph-hint">Select a page from the sidebar or create a new one.</p>
                <button className="hb-btn-primary sm" onClick={() => openCreatePage(activeSection._id)}>
                  <FiPlus size={15} /> Add First Page
                </button>
              </div>
            )}
          </main>
        </div>

        {/* Page Modal */}
        {showPageModal && (
          <div className="hb-overlay" onClick={() => setShowPageModal(false)}>
            <div className="hb-modal" onClick={e => e.stopPropagation()}>
              <div className="hb-modal-head">
                <h2>{editingPage ? 'Edit Page' : 'New Page'}</h2>
                <button onClick={() => setShowPageModal(false)}><FiX size={18} /></button>
              </div>
              <div className="hb-modal-body">
                <div className="hb-fg">
                  <label>Page Title *</label>
                  <input type="text" value={pageForm.title} onChange={e => setPageForm({...pageForm, title: e.target.value})} placeholder="e.g. Introduction" />
                </div>
                <div className="hb-fg">
                  <label>Content</label>
                  <textarea rows={14} value={pageForm.content} onChange={e => setPageForm({...pageForm, content: e.target.value})} placeholder="Write the page content..." />
                </div>
              </div>
              <div className="hb-modal-foot">
                <button className="hb-btn-sec" onClick={() => setShowPageModal(false)}>Cancel</button>
                <button className="hb-btn-primary" onClick={savePage} disabled={savingPage || !pageForm.title.trim()}>
                  <FiSave size={15} /> {savingPage ? 'Saving...' : editingPage ? 'Update' : 'Add Page'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  /* ============ OVERVIEW / SECTIONS LIST ============ */
  return (
    <div className="hb-wrap">
      {/* Header */}
      <div className="hb-header">
        <div className="hb-header-left">
          <div className="hb-header-icon"><FiBookOpen size={22} /></div>
          <div>
            <h1>Company Handbook</h1>
            <p>A comprehensive guide for employees — organized into sections and pages</p>
          </div>
        </div>
        <button className="hb-btn-primary" onClick={openCreateSection}>
          <FiPlus size={16} /> New Section
        </button>
      </div>

      {/* Quick stats bar */}
      <div className="hb-quick-stats">
        <div className="hb-qs">
          <FiLayers size={15} />
          <span><strong>{sections.length}</strong> sections</span>
        </div>
        <div className="hb-qs">
          <FiFileText size={15} />
          <span><strong>{totalPages}</strong> pages</span>
        </div>
        <div className="hb-qs">
          <FiClock size={15} />
          <span>Last updated {sections.length > 0 ? fmtDate(sections[0].updatedAt) : '—'}</span>
        </div>
      </div>

      {/* Search */}
      <div className="hb-search-bar">
        <FiSearch size={15} />
        <input type="text" placeholder="Search sections or pages..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {/* Sections grid */}
      {loading ? (
        <div className="hb-empty"><p>Loading handbook...</p></div>
      ) : filteredSections.length === 0 ? (
        <div className="hb-empty">
          <div className="hb-empty-ic"><FiBookOpen size={44} /></div>
          <h3>No Sections Yet</h3>
          <p>Start building your company handbook by adding the first section.</p>
          <button className="hb-btn-primary" onClick={openCreateSection}><FiPlus size={16} /> Create Section</button>
        </div>
      ) : (
        <div className="hb-sections-grid">
          {filteredSections.map(s => {
            const SIcon = getIcon(s.icon);
            const pgCount = s.pages?.length || 0;
            const isDraft = s.status === 'draft';

            return (
              <div key={s._id} className={`hb-section-card ${isDraft ? 'draft' : ''}`} onClick={() => { setActiveSectionId(s._id); setActivePageId(s.pages?.[0]?._id || null); }}>
                <div className="hb-sc-top">
                  <div className="hb-sc-icon"><SIcon size={20} /></div>
                  {isDraft && <span className="hb-sc-draft-badge">Draft</span>}
                  <div className="hb-sc-actions" onClick={e => e.stopPropagation()}>
                    <button onClick={() => openEditSection(s)}><FiEdit3 size={13} /></button>
                    <button className="danger" onClick={() => deleteSection(s._id)}><FiTrash2 size={13} /></button>
                  </div>
                </div>
                <h3>{s.title}</h3>
                {s.description && <p className="hb-sc-desc">{s.description}</p>}
                <div className="hb-sc-meta">
                  <span><FiFileText size={12} /> {pgCount} page{pgCount !== 1 ? 's' : ''}</span>
                  <span><FiClock size={12} /> {fmtDate(s.updatedAt)}</span>
                </div>
                {pgCount > 0 && (
                  <div className="hb-sc-pages-preview">
                    {s.pages.slice(0, 3).map((pg, i) => (
                      <span key={pg._id} className="hb-sc-pg">{i + 1}. {pg.title}</span>
                    ))}
                    {pgCount > 3 && <span className="hb-sc-pg more">+{pgCount - 3} more</span>}
                  </div>
                )}
                <div className="hb-sc-cta">
                  <span>Open Section</span>
                  <FiChevronRight size={14} />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Section modal */}
      {showSectionModal && (
        <div className="hb-overlay" onClick={() => setShowSectionModal(false)}>
          <div className="hb-modal" onClick={e => e.stopPropagation()}>
            <div className="hb-modal-head">
              <h2>{editingSection ? 'Edit Section' : 'New Section'}</h2>
              <button onClick={() => setShowSectionModal(false)}><FiX size={18} /></button>
            </div>
            <div className="hb-modal-body">
              <div className="hb-fg">
                <label>Section Title *</label>
                <input type="text" value={sectionForm.title} onChange={e => setSectionForm({...sectionForm, title: e.target.value})} placeholder="e.g. Company Overview" />
              </div>
              <div className="hb-fg">
                <label>Description</label>
                <input type="text" value={sectionForm.description} onChange={e => setSectionForm({...sectionForm, description: e.target.value})} placeholder="Brief section description" />
              </div>
              <div className="hb-form-row">
                <div className="hb-fg">
                  <label>Icon</label>
                  <div className="hb-icon-picker">
                    {ICON_OPTIONS.map(k => {
                      const Ic = ICON_MAP[k];
                      return (
                        <button key={k} className={`hb-ip-btn ${sectionForm.icon === k ? 'active' : ''}`} onClick={() => setSectionForm({...sectionForm, icon: k})} type="button">
                          <Ic size={16} />
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div className="hb-fg">
                  <label>Status</label>
                  <select value={sectionForm.status} onChange={e => setSectionForm({...sectionForm, status: e.target.value})}>
                    <option value="draft">Draft</option>
                    <option value="published">Published</option>
                    <option value="archived">Archived</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="hb-modal-foot">
              <button className="hb-btn-sec" onClick={() => setShowSectionModal(false)}>Cancel</button>
              <button className="hb-btn-primary" onClick={saveSection} disabled={savingSection || !sectionForm.title.trim()}>
                <FiSave size={15} /> {savingSection ? 'Saving...' : editingSection ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Page modal (from overview, user might add page to section) */}
      {showPageModal && (
        <div className="hb-overlay" onClick={() => setShowPageModal(false)}>
          <div className="hb-modal" onClick={e => e.stopPropagation()}>
            <div className="hb-modal-head">
              <h2>{editingPage ? 'Edit Page' : 'New Page'}</h2>
              <button onClick={() => setShowPageModal(false)}><FiX size={18} /></button>
            </div>
            <div className="hb-modal-body">
              <div className="hb-fg">
                <label>Page Title *</label>
                <input type="text" value={pageForm.title} onChange={e => setPageForm({...pageForm, title: e.target.value})} placeholder="e.g. Introduction" />
              </div>
              <div className="hb-fg">
                <label>Content</label>
                <textarea rows={14} value={pageForm.content} onChange={e => setPageForm({...pageForm, content: e.target.value})} placeholder="Write the page content..." />
              </div>
            </div>
            <div className="hb-modal-foot">
              <button className="hb-btn-sec" onClick={() => setShowPageModal(false)}>Cancel</button>
              <button className="hb-btn-primary" onClick={savePage} disabled={savingPage || !pageForm.title.trim()}>
                <FiSave size={15} /> {savingPage ? 'Saving...' : editingPage ? 'Update' : 'Add Page'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default CompanyHandbook;
