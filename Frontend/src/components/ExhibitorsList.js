import React, { useState, useEffect } from 'react';
import './ExhibitorsList.css';
import Breadcrumb from './Breadcrumb';
import defaultAvatar from './image/default-avatar.svg';
import { FiPlus, FiX, FiSearch, FiEdit2, FiTrash2, FiChevronDown, FiChevronUp, FiMail, FiPhone, FiMapPin } from 'react-icons/fi';

function ExhibitorsList({ tradeShow, onNavigate }) {
  const [exhibitors, setExhibitors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [editId, setEditId] = useState(null);
  const [expandedId, setExpandedId] = useState(null);

  const [form, setForm] = useState({
    companyName: '', boothNo: '', location: '',
    companyEmail: '', website: '', options: '',
    contacts: [{ fullName: '', designation: '', phone: '', email: '', location: '' }]
  });
  const [errors, setErrors] = useState({});

  const breadcrumbs = [
    { label: 'Global Trade Shows', section: 'global-trade-show' },
    { label: tradeShow?.shortName || 'Exhibitors' }
  ];

  useEffect(() => { if (tradeShow?._id) fetchExhibitors(); }, [tradeShow]);

  const fetchExhibitors = async () => {
    try {
      setLoading(true);
      const t = localStorage.getItem('token');
      const r = await fetch(`/api/trade-shows/${tradeShow._id}/exhibitors`, { headers: { Authorization: `Bearer ${t}` } });
      if (r.ok) { const d = await r.json(); setExhibitors(d.exhibitors || []); }
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const resetForm = () => {
    setForm({ companyName: '', boothNo: '', location: '', companyEmail: '', website: '', options: '', contacts: [{ fullName: '', designation: '', phone: '', email: '', location: '' }] });
    setErrors({}); setEditId(null);
  };

  const openAdd = () => { resetForm(); setShowModal(true); };
  const openEdit = (ex) => {
    setForm({
      companyName: ex.companyName || '', boothNo: ex.boothNo || '', location: ex.location || '',
      companyEmail: ex.companyEmail || '', website: ex.website || '', options: ex.options || '',
      contacts: ex.contacts?.length > 0 ? ex.contacts.map(c => ({
        fullName: c.fullName || '', designation: c.designation || '', phone: c.phone || '', email: c.email || '', location: c.location || ''
      })) : [{ fullName: '', designation: '', phone: '', email: '', location: '' }]
    });
    setEditId(ex._id); setShowModal(true);
  };
  const closeModal = () => { setShowModal(false); resetForm(); };

  const handleInput = (e) => {
    const { name, value } = e.target;
    setForm(p => ({ ...p, [name]: value }));
    if (errors[name]) setErrors(p => ({ ...p, [name]: '' }));
  };

  const handleContact = (idx, field, value) => {
    setForm(p => {
      const c = [...p.contacts]; c[idx] = { ...c[idx], [field]: value }; return { ...p, contacts: c };
    });
  };
  const addContact = () => setForm(p => ({ ...p, contacts: [...p.contacts, { fullName: '', designation: '', phone: '', email: '', location: '' }] }));
  const removeContact = (idx) => { if (form.contacts.length > 1) setForm(p => ({ ...p, contacts: p.contacts.filter((_, i) => i !== idx) })); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const er = {};
    if (!form.companyName.trim()) er.companyName = 'Required';
    if (Object.keys(er).length) { setErrors(er); return; }

    setSaving(true);
    try {
      const t = localStorage.getItem('token');
      const url = editId ? `/api/exhibitors/${editId}` : `/api/trade-shows/${tradeShow._id}/exhibitors`;
      const method = editId ? 'PUT' : 'POST';
      const body = { ...form, contacts: form.contacts.filter(c => c.fullName.trim()) };

      const r = await fetch(url, { method, headers: { Authorization: `Bearer ${t}`, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      if (r.ok) { await fetchExhibitors(); closeModal(); }
      else { const d = await r.json(); setErrors({ general: d.message || 'Error saving' }); }
    } catch (_) { setErrors({ general: 'Error saving exhibitor' }); } finally { setSaving(false); }
  };

  const deleteExhibitor = async (id) => {
    if (!window.confirm('Delete this exhibitor?')) return;
    try {
      const t = localStorage.getItem('token');
      await fetch(`/api/exhibitors/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${t}` } });
      fetchExhibitors();
    } catch (e) { console.error(e); }
  };

  const filtered = exhibitors.filter(ex =>
    ex.companyName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    ex.boothNo?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    ex.location?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="exl">
      <Breadcrumb items={breadcrumbs} onNavigate={onNavigate} />

      <div className="exl-head">
        <div className="exl-head-l">
          <h1>Exhibitors</h1>
          <span className="exl-badge">{exhibitors.length}</span>
        </div>
        <div className="exl-head-r">
          <div className="exl-srch">
            <FiSearch size={15} />
            <input placeholder="Search exhibitors..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
          </div>
          <button className="exl-add" onClick={openAdd}><FiPlus size={16} /> Add Exhibitor</button>
        </div>
      </div>

      {loading ? (
        <div className="exl-load"><div className="exl-spin" /><p>Loading exhibitors...</p></div>
      ) : filtered.length > 0 ? (
        <div className="exl-table-wrap">
          <table className="exl-table">
            <thead>
              <tr>
                <th>Company</th>
                <th>Booth</th>
                <th>Location</th>
                <th>Email</th>
                <th>Website</th>
                <th>Contacts</th>
                <th style={{ width: 80 }}></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(ex => (
                <React.Fragment key={ex._id}>
                  <tr className={expandedId === ex._id ? 'expanded' : ''} onClick={() => setExpandedId(expandedId === ex._id ? null : ex._id)}>
                    <td className="exl-co">
                      <strong>{ex.companyName}</strong>
                      {ex.options && <span className="exl-opt">{ex.options}</span>}
                    </td>
                    <td><span className="exl-booth">{ex.boothNo || '—'}</span></td>
                    <td>{ex.location || '—'}</td>
                    <td>{ex.companyEmail ? <a href={`mailto:${ex.companyEmail}`} onClick={e => e.stopPropagation()} className="exl-link">{ex.companyEmail}</a> : '—'}</td>
                    <td>{ex.website ? <a href={ex.website.startsWith('http') ? ex.website : `https://${ex.website}`} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()} className="exl-link">{ex.website}</a> : '—'}</td>
                    <td><span className="exl-ct-count">{ex.contacts?.length || 0}</span></td>
                    <td onClick={e => e.stopPropagation()}>
                      <div className="exl-acts">
                        <button onClick={() => openEdit(ex)} title="Edit"><FiEdit2 size={13} /></button>
                        <button className="del" onClick={() => deleteExhibitor(ex._id)} title="Delete"><FiTrash2 size={13} /></button>
                        <button onClick={() => setExpandedId(expandedId === ex._id ? null : ex._id)}>
                          {expandedId === ex._id ? <FiChevronUp size={14} /> : <FiChevronDown size={14} />}
                        </button>
                      </div>
                    </td>
                  </tr>
                  {expandedId === ex._id && ex.contacts?.length > 0 && (
                    <tr className="exl-expand-row">
                      <td colSpan="7">
                        <div className="exl-contacts">
                          <h4>Contacts ({ex.contacts.length})</h4>
                          <div className="exl-contacts-grid">
                            {ex.contacts.map((c, i) => (
                              <div key={i} className="exl-contact-card">
                                <div className="exl-cc-head">
                                  <img src={defaultAvatar} alt="" />
                                  <div>
                                    <strong>{c.fullName || 'N/A'}</strong>
                                    {c.designation && <span>{c.designation}</span>}
                                  </div>
                                </div>
                                <div className="exl-cc-info">
                                  {c.email && <div><FiMail size={11} /><a href={`mailto:${c.email}`}>{c.email}</a></div>}
                                  {c.phone && <div><FiPhone size={11} /><span>{c.phone}</span></div>}
                                  {c.location && <div><FiMapPin size={11} /><span>{c.location}</span></div>}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="exl-empty">
          <h3>No Exhibitors Yet</h3>
          <p>Add exhibitors for {tradeShow?.shortName || 'this trade show'}.</p>
          <button className="exl-add" onClick={openAdd}><FiPlus size={16} /> Add Exhibitor</button>
        </div>
      )}

      {/* Add / Edit Modal */}
      {showModal && (
        <div className="noxtm-overlay" onClick={closeModal}>
          <div className="exl-modal" onClick={e => e.stopPropagation()}>
            <div className="exl-mh">
              <h2>{editId ? 'Edit Exhibitor' : 'Add Exhibitor'}</h2>
              <button onClick={closeModal}><FiX size={18} /></button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="exl-mb">
                {errors.general && <div className="exl-err">{errors.general}</div>}

                <div className="exl-sec">
                  <h4>Company Info</h4>
                  <div className="exl-r2">
                    <div className="exl-f">
                      <label>Company Name <span className="req">*</span></label>
                      <input name="companyName" value={form.companyName} onChange={handleInput} placeholder="Company name" className={errors.companyName ? 'err' : ''} />
                      {errors.companyName && <span className="exl-ferr">{errors.companyName}</span>}
                    </div>
                    <div className="exl-f">
                      <label>Booth No.</label>
                      <input name="boothNo" value={form.boothNo} onChange={handleInput} placeholder="e.g. A-302" />
                    </div>
                  </div>
                  <div className="exl-r2">
                    <div className="exl-f">
                      <label>Location</label>
                      <input name="location" value={form.location} onChange={handleInput} placeholder="Hall, Section" />
                    </div>
                    <div className="exl-f">
                      <label>Options</label>
                      <input name="options" value={form.options} onChange={handleInput} placeholder="Options tag" />
                    </div>
                  </div>
                  <div className="exl-r2">
                    <div className="exl-f">
                      <label>Email</label>
                      <input name="companyEmail" value={form.companyEmail} onChange={handleInput} placeholder="company@email.com" />
                    </div>
                    <div className="exl-f">
                      <label>Website</label>
                      <input name="website" value={form.website} onChange={handleInput} placeholder="www.company.com" />
                    </div>
                  </div>
                </div>

                <div className="exl-sec">
                  <div className="exl-sec-head">
                    <h4>Contacts</h4>
                    <button type="button" className="exl-add-ct" onClick={addContact}><FiPlus size={13} /> Add Contact</button>
                  </div>
                  {form.contacts.map((c, i) => (
                    <div key={i} className="exl-ct-block">
                      <div className="exl-ct-top">
                        <span>Contact {i + 1}</span>
                        {form.contacts.length > 1 && <button type="button" onClick={() => removeContact(i)}><FiX size={13} /></button>}
                      </div>
                      <div className="exl-r2">
                        <div className="exl-f"><label>Full Name</label><input value={c.fullName} onChange={e => handleContact(i, 'fullName', e.target.value)} placeholder="Full name" /></div>
                        <div className="exl-f"><label>Designation</label><input value={c.designation} onChange={e => handleContact(i, 'designation', e.target.value)} placeholder="Title / role" /></div>
                      </div>
                      <div className="exl-r3">
                        <div className="exl-f"><label>Phone</label><input value={c.phone} onChange={e => handleContact(i, 'phone', e.target.value)} placeholder="+1..." /></div>
                        <div className="exl-f"><label>Email</label><input value={c.email} onChange={e => handleContact(i, 'email', e.target.value)} placeholder="email@company.com" /></div>
                        <div className="exl-f"><label>Location</label><input value={c.location} onChange={e => handleContact(i, 'location', e.target.value)} placeholder="City, Country" /></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="exl-mf">
                <button type="button" className="exl-btn-c" onClick={closeModal} disabled={saving}>Cancel</button>
                <button type="submit" className="exl-btn-s" disabled={saving}>{saving ? 'Saving...' : (editId ? 'Update' : 'Add Exhibitor')}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default ExhibitorsList;
