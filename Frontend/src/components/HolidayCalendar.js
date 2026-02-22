import React, { useState, useEffect, useCallback } from 'react';
import api from '../config/api';
import { useRole } from '../contexts/RoleContext';
import {
  FiPlus, FiEdit2, FiTrash2, FiCalendar, FiChevronLeft, FiChevronRight,
  FiX, FiCheck, FiClock, FiAlertCircle, FiFileText
} from 'react-icons/fi';
import './HolidayCalendar.css';

const TODAY = new Date();
const todayStr = `${TODAY.getFullYear()}-${String(TODAY.getMonth() + 1).padStart(2, '0')}-${String(TODAY.getDate()).padStart(2, '0')}`;
const pad = (n) => String(n).padStart(2, '0');

function fmtDateShort(str) {
  if (!str) return '';
  return new Date(str + 'T00:00:00').toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
}

const HOL_TYPE_LABELS = { national: 'National', company: 'Company', optional: 'Optional', restricted: 'Restricted' };
const TYPE_LABELS = { casual: 'Casual', sick: 'Sick', earned: 'Earned', unpaid: 'Unpaid', other: 'Other' };

function HolidayCalendar() {
  const { currentUser } = useRole();
  const isManager = ['Admin', 'Business Admin', 'HR'].includes(currentUser?.role);

  const [pageTab, setPageTab] = useState('holidays');

  /* ── Holidays ── */
  const [holidays, setHolidays] = useState([]);
  const [loadingHol, setLoadingHol] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showHolModal, setShowHolModal] = useState(false);
  const [editingHol, setEditingHol] = useState(null);
  const [holForm, setHolForm] = useState({ name: '', date: '', type: 'company', description: '', isRecurring: false });
  const [savingHol, setSavingHol] = useState(false);

  /* ── Leaves ── */
  const [leaves, setLeaves] = useState([]);
  const [loadingLeaves, setLoadingLeaves] = useState(false);
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [leaveForm, setLeaveForm] = useState({ startDate: '', endDate: '', leaveType: 'casual', reason: '' });
  const [savingLeave, setSavingLeave] = useState(false);
  const [leaveViewMode, setLeaveViewMode] = useState('my');

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const fetchHolidays = useCallback(async () => {
    try {
      setLoadingHol(true);
      const res = await api.get('/holidays', { params: { year, month: month + 1 } });
      if (res.data.success) setHolidays(res.data.holidays || []);
    } catch (e) { console.error(e); } finally { setLoadingHol(false); }
  }, [year, month]);

  const fetchLeaves = useCallback(async () => {
    try {
      setLoadingLeaves(true);
      const params = { year: TODAY.getFullYear() };
      if (isManager && leaveViewMode === 'team') params.all = 'true';
      const res = await api.get('/leaves', { params });
      if (res.data.success) setLeaves(res.data.leaves || []);
    } catch (e) { console.error(e); } finally { setLoadingLeaves(false); }
  }, [isManager, leaveViewMode]);

  useEffect(() => { fetchHolidays(); }, [fetchHolidays]);
  useEffect(() => { if (pageTab === 'leaves') fetchLeaves(); }, [pageTab, fetchLeaves]);

  /* ── Calendar ── */
  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));
  const monthStr = currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const calDays = [];
  for (let i = 0; i < firstDay; i++) calDays.push(null);
  for (let d = 1; d <= daysInMonth; d++) calDays.push(d);

  const getHolForDay = (day) => {
    if (!day) return [];
    const ds = `${year}-${pad(month + 1)}-${pad(day)}`;
    return holidays.filter(h => h.date === ds);
  };
  const isToday = (day) => day && month === TODAY.getMonth() && year === TODAY.getFullYear() && day === TODAY.getDate();

  /* ── Holiday actions ── */
  const openAddHol = (day) => {
    const ds = day ? `${year}-${pad(month + 1)}-${pad(day)}` : '';
    setHolForm({ name: '', date: ds, type: 'company', description: '', isRecurring: false });
    setEditingHol(null);
    setShowHolModal(true);
  };
  const openEditHol = (h) => {
    setHolForm({ name: h.name, date: h.date, type: h.type, description: h.description || '', isRecurring: h.isRecurring || false });
    setEditingHol(h);
    setShowHolModal(true);
  };
  const saveHol = async () => {
    if (!holForm.name || !holForm.date) return;
    setSavingHol(true);
    try {
      if (editingHol) await api.put(`/holidays/${editingHol._id}`, holForm);
      else await api.post('/holidays', holForm);
      setShowHolModal(false);
      fetchHolidays();
    } catch (e) { console.error(e); } finally { setSavingHol(false); }
  };
  const deleteHol = async (id) => {
    if (!window.confirm('Delete this holiday?')) return;
    try { await api.delete(`/holidays/${id}`); fetchHolidays(); } catch (e) { console.error(e); }
  };

  /* ── Leave actions ── */
  const computeDays = () => {
    if (!leaveForm.startDate || !leaveForm.endDate || leaveForm.startDate > leaveForm.endDate) return 0;
    let count = 0;
    const cur = new Date(leaveForm.startDate + 'T00:00:00');
    const last = new Date(leaveForm.endDate + 'T00:00:00');
    while (cur <= last) { if (cur.getDay() !== 0 && cur.getDay() !== 6) count++; cur.setDate(cur.getDate() + 1); }
    return Math.max(count, 1);
  };
  const applyLeave = async () => {
    if (!leaveForm.startDate || !leaveForm.endDate) return;
    setSavingLeave(true);
    try {
      await api.post('/leaves', leaveForm);
      setShowLeaveModal(false);
      setLeaveForm({ startDate: '', endDate: '', leaveType: 'casual', reason: '' });
      fetchLeaves();
    } catch (e) { console.error(e); } finally { setSavingLeave(false); }
  };
  const deleteLeave = async (id) => {
    try { await api.delete(`/leaves/${id}`); fetchLeaves(); } catch (e) { console.error(e); }
  };
  const reviewLeave = async (id, status) => {
    try { await api.put(`/leaves/${id}/status`, { status }); fetchLeaves(); } catch (e) { console.error(e); }
  };

  /* ── Leave computed ── */
  const sortedLeaves = [...leaves].sort((a, b) => a.startDate.localeCompare(b.startDate));
  const upcoming = sortedLeaves.filter(l => l.startDate >= todayStr);
  const past = sortedLeaves.filter(l => l.startDate < todayStr);
  const pendingCount = leaves.filter(l => l.status === 'pending').length;
  const approvedCount = leaves.filter(l => l.status === 'approved').length;

  return (
    <div className="hcal">
      {/* ── Page tabs ── */}
      <div className="hcal-page-tabs">
        <button className={pageTab === 'holidays' ? 'active' : ''} onClick={() => setPageTab('holidays')}>
          <FiCalendar /> Holidays
        </button>
        <button className={pageTab === 'leaves' ? 'active' : ''} onClick={() => setPageTab('leaves')}>
          <FiFileText /> My Leaves
        </button>
      </div>

      {/* ════════════ HOLIDAYS TAB ════════════ */}
      {pageTab === 'holidays' && (
        <div className="hcal-tab-content">
          <div className="hcal-header">
            <div>
              <h2>Holiday Calendar</h2>
              <p className="hcal-subtitle">Company-wide public holidays</p>
            </div>
            <div className="hcal-header-actions">
              <div className="hcal-nav">
                <button className="hcal-nav-btn" onClick={prevMonth}><FiChevronLeft /></button>
                <span className="hcal-month-label">{monthStr}</span>
                <button className="hcal-nav-btn" onClick={nextMonth}><FiChevronRight /></button>
              </div>
              {isManager && (
                <button className="hcal-primary-btn" onClick={() => openAddHol()}>
                  <FiPlus /> Add Holiday
                </button>
              )}
            </div>
          </div>

          <div className="hcal-layout">
            <div className="hcal-calendar">
              <div className="hcal-weekdays">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                  <div key={d} className="hcal-weekday">{d}</div>
                ))}
              </div>
              <div className="hcal-grid">
                {calDays.map((day, i) => {
                  const dh = getHolForDay(day);
                  return (
                    <div
                      key={i}
                      className={`hcal-day ${!day ? 'empty' : ''} ${isToday(day) ? 'today' : ''} ${dh.length > 0 ? 'has-holiday' : ''}`}
                      onClick={() => day && isManager && openAddHol(day)}
                    >
                      {day && (
                        <>
                          <span className="hcal-day-num">{day}</span>
                          <div className="hcal-day-dots">
                            {dh.map((h, j) => (
                              <span
                                key={j}
                                className={`hcal-day-dot ${h.type}`}
                                title={h.name}
                                onClick={e => { e.stopPropagation(); isManager && openEditHol(h); }}
                              />
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
              <div className="hcal-legend">
                {Object.entries(HOL_TYPE_LABELS).map(([k, v]) => (
                  <span key={k} className="hcal-legend-item">
                    <span className={`hcal-legend-dot ${k}`} />{v}
                  </span>
                ))}
              </div>
            </div>

            <div className="hcal-sidebar">
              <div className="hcal-sidebar-head">
                <span>This month</span>
                <span className="hcal-count-badge">{holidays.length}</span>
              </div>
              {loadingHol ? (
                <div className="hcal-loading">Loading...</div>
              ) : holidays.length === 0 ? (
                <div className="hcal-empty-msg"><FiCalendar /><span>No holidays this month</span></div>
              ) : (
                <div className="hcal-list">
                  {[...holidays].sort((a, b) => a.date.localeCompare(b.date)).map(h => (
                    <div key={h._id} className="hcal-list-item">
                      <div className="hcal-list-datecol">
                        <span className="hcal-list-d">{new Date(h.date + 'T00:00:00').getDate()}</span>
                        <span className="hcal-list-wd">{new Date(h.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short' })}</span>
                      </div>
                      <div className="hcal-list-info">
                        <span className="hcal-list-name">{h.name}</span>
                        <span className={`hcal-type-badge ${h.type}`}>{HOL_TYPE_LABELS[h.type]}</span>
                      </div>
                      {isManager && (
                        <div className="hcal-list-actions">
                          <button onClick={() => openEditHol(h)}><FiEdit2 /></button>
                          <button onClick={() => deleteHol(h._id)} className="danger"><FiTrash2 /></button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {showHolModal && (
            <div className="hcal-overlay" onClick={() => setShowHolModal(false)}>
              <div className="hcal-modal" onClick={e => e.stopPropagation()}>
                <div className="hcal-modal-head">
                  <h3>{editingHol ? 'Edit Holiday' : 'Add Holiday'}</h3>
                  <button onClick={() => setShowHolModal(false)}><FiX /></button>
                </div>
                <div className="hcal-modal-body">
                  <div className="hcal-field">
                    <label>Name *</label>
                    <input type="text" value={holForm.name} onChange={e => setHolForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Republic Day" />
                  </div>
                  <div className="hcal-field">
                    <label>Date *</label>
                    <input type="date" value={holForm.date} onChange={e => setHolForm(p => ({ ...p, date: e.target.value }))} />
                  </div>
                  <div className="hcal-field">
                    <label>Type</label>
                    <select value={holForm.type} onChange={e => setHolForm(p => ({ ...p, type: e.target.value }))}>
                      {Object.entries(HOL_TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                    </select>
                  </div>
                  <div className="hcal-field">
                    <label>Description</label>
                    <textarea value={holForm.description} onChange={e => setHolForm(p => ({ ...p, description: e.target.value }))} rows={2} placeholder="Optional" />
                  </div>
                  <label className="hcal-checkbox-row">
                    <input type="checkbox" checked={holForm.isRecurring} onChange={e => setHolForm(p => ({ ...p, isRecurring: e.target.checked }))} />
                    <span>Recurring every year</span>
                  </label>
                </div>
                <div className="hcal-modal-foot">
                  <button className="hcal-cancel-btn" onClick={() => setShowHolModal(false)}>Cancel</button>
                  <button className="hcal-save-btn" onClick={saveHol} disabled={savingHol || !holForm.name || !holForm.date}>
                    {savingHol ? 'Saving…' : (editingHol ? 'Update' : 'Add Holiday')}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ════════════ LEAVES TAB ════════════ */}
      {pageTab === 'leaves' && (
        <div className="hcal-tab-content">
          <div className="hcal-header">
            <div>
              <h2>Leave Management</h2>
              <p className="hcal-subtitle">Apply, track and manage leave requests</p>
            </div>
            <div className="hcal-header-actions">
              {isManager && (
                <div className="hcal-toggle">
                  <button className={leaveViewMode === 'my' ? 'active' : ''} onClick={() => setLeaveViewMode('my')}>Mine</button>
                  <button className={leaveViewMode === 'team' ? 'active' : ''} onClick={() => setLeaveViewMode('team')}>Team</button>
                </div>
              )}
              <button className="hcal-primary-btn" onClick={() => setShowLeaveModal(true)}>
                <FiPlus /> Apply Leave
              </button>
            </div>
          </div>

          <div className="hcal-stats">
            <div className="hcal-stat">
              <span className="hcal-stat-val">{pendingCount}</span>
              <span className="hcal-stat-label">Pending</span>
            </div>
            <div className="hcal-stat">
              <span className="hcal-stat-val">{approvedCount}</span>
              <span className="hcal-stat-label">Approved</span>
            </div>
            <div className="hcal-stat">
              <span className="hcal-stat-val">{leaves.length}</span>
              <span className="hcal-stat-label">Total {TODAY.getFullYear()}</span>
            </div>
          </div>

          {loadingLeaves ? (
            <div className="hcal-loading">Loading…</div>
          ) : (
            <>
              <div className="hcal-section">
                <div className="hcal-section-head">
                  <FiClock size={13} /> Upcoming &amp; Active
                  <span className="hcal-count-badge">{upcoming.length}</span>
                </div>
                {upcoming.length === 0 ? (
                  <div className="hcal-empty-msg"><FiCheck /><span>No upcoming leaves</span></div>
                ) : (
                  <div className="hcal-leave-list">
                    {upcoming.map(l => (
                      <LeaveCard key={l._id} leave={l} isManager={isManager} onDelete={deleteLeave} onReview={reviewLeave} />
                    ))}
                  </div>
                )}
              </div>

              {past.length > 0 && (
                <div className="hcal-section">
                  <div className="hcal-section-head">
                    <FiAlertCircle size={13} /> Past Leaves
                    <span className="hcal-count-badge">{past.length}</span>
                  </div>
                  <div className="hcal-leave-list">
                    {[...past].reverse().map(l => (
                      <LeaveCard key={l._id} leave={l} isManager={isManager} onDelete={deleteLeave} onReview={reviewLeave} />
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {showLeaveModal && (
            <div className="hcal-overlay" onClick={() => setShowLeaveModal(false)}>
              <div className="hcal-modal" onClick={e => e.stopPropagation()}>
                <div className="hcal-modal-head">
                  <h3>Apply for Leave</h3>
                  <button onClick={() => setShowLeaveModal(false)}><FiX /></button>
                </div>
                <div className="hcal-modal-body">
                  <div className="hcal-field-row">
                    <div className="hcal-field">
                      <label>Start Date *</label>
                      <input type="date" value={leaveForm.startDate} min={todayStr} onChange={e => setLeaveForm(p => ({ ...p, startDate: e.target.value }))} />
                    </div>
                    <div className="hcal-field">
                      <label>End Date *</label>
                      <input type="date" value={leaveForm.endDate} min={leaveForm.startDate || todayStr} onChange={e => setLeaveForm(p => ({ ...p, endDate: e.target.value }))} />
                    </div>
                  </div>
                  {computeDays() > 0 && (
                    <div className="hcal-days-pill">{computeDays()} working day{computeDays() !== 1 ? 's' : ''}</div>
                  )}
                  <div className="hcal-field">
                    <label>Leave Type</label>
                    <select value={leaveForm.leaveType} onChange={e => setLeaveForm(p => ({ ...p, leaveType: e.target.value }))}>
                      {Object.entries(TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                    </select>
                  </div>
                  <div className="hcal-field">
                    <label>Reason</label>
                    <textarea value={leaveForm.reason} onChange={e => setLeaveForm(p => ({ ...p, reason: e.target.value }))} rows={3} placeholder="Brief reason for leave (optional)" />
                  </div>
                </div>
                <div className="hcal-modal-foot">
                  <button className="hcal-cancel-btn" onClick={() => setShowLeaveModal(false)}>Cancel</button>
                  <button className="hcal-save-btn" onClick={applyLeave} disabled={savingLeave || !leaveForm.startDate || !leaveForm.endDate}>
                    {savingLeave ? 'Submitting…' : 'Submit Application'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function LeaveCard({ leave, isManager, onDelete, onReview }) {
  const isPending = leave.status === 'pending';
  const isFuture = leave.startDate >= todayStr;
  const ownerName = leave.userId?.fullName;

  return (
    <div className={`hcal-leave-card status-${leave.status}`}>
      <div className="hcal-leave-left">
        <div className="hcal-leave-dates">
          <span>{fmtDateShort(leave.startDate)}</span>
          {leave.startDate !== leave.endDate && (
            <><span className="hcal-leave-arrow">→</span><span>{fmtDateShort(leave.endDate)}</span></>
          )}
        </div>
        <div className="hcal-leave-meta">
          {ownerName && <span className="hcal-leave-owner">{ownerName}</span>}
          <span className="hcal-leave-type">{TYPE_LABELS[leave.leaveType] || leave.leaveType}</span>
          <span className="hcal-leave-days">{leave.days}d</span>
        </div>
        {leave.reason && <p className="hcal-leave-reason">{leave.reason}</p>}
      </div>
      <div className="hcal-leave-right">
        <span className={`hcal-status-badge ${leave.status}`}>{leave.status}</span>
        <div className="hcal-leave-actions">
          {isManager && isPending && (
            <>
              <button className="hcal-action-btn approve" onClick={() => onReview(leave._id, 'approved')} title="Approve"><FiCheck /></button>
              <button className="hcal-action-btn reject" onClick={() => onReview(leave._id, 'rejected')} title="Reject"><FiX /></button>
            </>
          )}
          {isPending && isFuture && (
            <button className="hcal-action-btn delete" onClick={() => onDelete(leave._id)} title="Cancel"><FiTrash2 /></button>
          )}
        </div>
      </div>
    </div>
  );
}

export default HolidayCalendar;
