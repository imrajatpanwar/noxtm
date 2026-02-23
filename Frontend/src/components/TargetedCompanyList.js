import React, { useState, useEffect } from 'react';
import './ExhibitorsList.css';
import Breadcrumb from './Breadcrumb';
import defaultAvatar from './image/default-avatar.svg';
import { FiPlus, FiX, FiSearch, FiEdit2, FiTrash2, FiChevronDown, FiChevronUp, FiMail, FiPhone, FiMapPin } from 'react-icons/fi';

function TargetedCompanyList({ trendingService, onNavigate }) {
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [editId, setEditId] = useState(null);
  const [expandedId, setExpandedId] = useState(null);

  const [form, setForm] = useState({
    companyName: '', location: '',
    companyEmail: '', website: '', options: '',
    contacts: [{ fullName: '', designation: '', phone: '', email: '', location: '' }]
  });
  const [errors, setErrors] = useState({});

  const breadcrumbs = [
    { label: 'Trending Services', section: 'trending-services' },
    { label: trendingService?.serviceName || 'Targeted Companies' }
  ];

  useEffect(() => { if (trendingService?._id) fetchCompanies(); }, [trendingService]);

  const fetchCompanies = async () => {
    try {
      setLoading(true);
      const t = localStorage.getItem('token');
      const r = await fetch(`/api/trending-services/${trendingService._id}/targeted-companies`, { headers: { Authorization: `Bearer ${t}` } });
      if (r.ok) { const d = await r.json(); setCompanies(d.targetedCompanies || []); }
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const resetForm = () => {
    setForm({ companyName: '', location: '', companyEmail: '', website: '', options: '', contacts: [{ fullName: '', designation: '', phone: '', email: '', location: '' }] });
    setErrors({}); setEditId(null);
  };

  const openAdd = () => { resetForm(); setShowModal(true); };
  const openEdit = (tc) => {
    setForm({
      companyName: tc.companyName || '', location: tc.location || '',
      companyEmail: tc.companyEmail || '', website: tc.website || '', options: tc.options || '',
      contacts: tc.contacts?.length > 0 ? tc.contacts.map(c => ({
        fullName: c.fullName || '', designation: c.designation || '', phone: c.phone || '', email: c.email || '', location: c.location || ''
      })) : [{ fullName: '', designation: '', phone: '', email: '', location: '' }]
    });
    setEditId(tc._id); setShowModal(true);
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
      const url = editId ? `/api/targeted-companies/${editId}` : `/api/trending-services/${trendingService._id}/targeted-companies`;
      const method = editId ? 'PUT' : 'POST';
      const body = { ...form, contacts: form.contacts.filter(c => c.fullName.trim()) };

      const r = await fetch(url, { method, headers: { Authorization: `Bearer ${t}`, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      if (r.ok) { await fetchCompanies(); closeModal(); }
      else { const d = await r.json(); setErrors({ general: d.message || 'Error saving' }); }
    } catch (_) { setErrors({ general: 'Error saving targeted company' }); } finally { setSaving(false); }
  };

  const deleteCompany = async (id) => {
    if (!window.confirm('Delete this targeted company?')) return;
    try {
      const t = localStorage.getItem('token');
      await fetch(`/api/targeted-companies/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${t}` } });
      fetchCompanies();
    } catch (e) { console.error(e); }
  };

  const filtered = companies.filter(tc =>
    tc.companyName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    tc.location?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="exl">
      <Breadcrumb items={breadcrumbs} onNavigate={onNavigate} />

      <div className="exl-head">
        <div className="exl-head-l">
          <h1>Targeted Companies</h1>
          <span className="exl-badge">{companies.length}</span>
        </div>
        <div className="exl-head-r">
          <div className="exl-srch">
            <FiSearch size={15} />
            <input placeholder="Search companies..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
          </div>
          <button className="exl-add" onClick={openAdd}><FiPlus size={16} /> Add Company</button>
        </div>
      </div>

      {/* Companies Content */}
      {loading ? (
            <div className="exl-load"><div className="exl-spin" /><p>Loading targeted companies...</p></div>
          ) : filtered.length > 0 ? (
            <div className="exl-table-wrap">
              <table className="exl-table">
                <thead>
                  <tr>
                    <th>Company</th>
                    <th>Location</th>
                    <th>Email</th>
                    <th>Website</th>
                    <th>Contacts</th>
                    <th style={{ width: 80 }}></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(tc => (
                    <React.Fragment key={tc._id}>
                      <tr className={expandedId === tc._id ? 'expanded' : ''} onClick={() => setExpandedId(expandedId === tc._id ? null : tc._id)}>
                        <td className="exl-co">
                          <strong>{tc.companyName}</strong>
                          {tc.options && <span className="exl-opt">{tc.options}</span>}
                        </td>
                        <td>{tc.location || '—'}</td>
                        <td>{tc.companyEmail ? <a href={`mailto:${tc.companyEmail}`} onClick={e => e.stopPropagation()} className="exl-link">{tc.companyEmail}</a> : '—'}</td>
                        <td>{tc.website ? <a href={tc.website.startsWith('http') ? tc.website : `https://${tc.website}`} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()} className="exl-link">{tc.website}</a> : '—'}</td>
                        <td><span className="exl-ct-count">{tc.contacts?.length || 0}</span></td>
                        <td onClick={e => e.stopPropagation()}>
                          <div className="exl-acts">
                            <button onClick={() => openEdit(tc)} title="Edit"><FiEdit2 size={13} /></button>
                            <button className="del" onClick={() => deleteCompany(tc._id)} title="Delete"><FiTrash2 size={13} /></button>
                            <button onClick={() => setExpandedId(expandedId === tc._id ? null : tc._id)}>
                              {expandedId === tc._id ? <FiChevronUp size={14} /> : <FiChevronDown size={14} />}
                            </button>
                          </div>
                        </td>
                      </tr>
                      {expandedId === tc._id && tc.contacts?.length > 0 && (
                        <tr className="exl-expand-row">
                          <td colSpan="6">
                            <div className="exl-contacts">
                              <h4>Contacts ({tc.contacts.length})</h4>
                              <div className="exl-contacts-grid">
                                {tc.contacts.map((c, i) => (
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
              <h3>No Targeted Companies Yet</h3>
              <p>Add targeted companies for {trendingService?.serviceName || 'this trending service'}.</p>
              <button className="exl-add" onClick={openAdd}><FiPlus size={16} /> Add Company</button>
            </div>
          )}

      {/* Add / Edit Modal */}
      {showModal && (
        <div className="noxtm-overlay" onClick={closeModal}>
          <div className="exl-modal" onClick={e => e.stopPropagation()}>
            <div className="exl-mh">
              <h2>{editId ? 'Edit Targeted Company' : 'Add Targeted Company'}</h2>
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
                      <label>Location</label>
                      <input name="location" value={form.location} onChange={handleInput} placeholder="City, Country" />
                    </div>
                  </div>
                  <div className="exl-r2">
                    <div className="exl-f">
                      <label>Options</label>
                      <input name="options" value={form.options} onChange={handleInput} placeholder="Options tag" />
                    </div>
                    <div className="exl-f">
                      <label>Email</label>
                      <input name="companyEmail" value={form.companyEmail} onChange={handleInput} placeholder="company@email.com" />
                    </div>
                  </div>
                  <div className="exl-f">
                    <label>Website</label>
                    <input name="website" value={form.website} onChange={handleInput} placeholder="www.company.com" />
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
                <button type="submit" className="exl-btn-s" disabled={saving}>{saving ? 'Saving...' : (editId ? 'Update' : 'Add Company')}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default TargetedCompanyList;
