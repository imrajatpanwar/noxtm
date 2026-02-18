import React, { useState, useEffect, useCallback } from 'react';
import api from '../config/api';
import { FiPlus, FiEdit2, FiTrash2, FiCalendar, FiChevronLeft, FiChevronRight, FiX } from 'react-icons/fi';
import './HolidayCalendar.css';

function HolidayCalendar() {
  const [holidays, setHolidays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showModal, setShowModal] = useState(false);
  const [editingHoliday, setEditingHoliday] = useState(null);
  const [form, setForm] = useState({ name: '', date: '', type: 'company', description: '', isRecurring: false });
  const [saving, setSaving] = useState(false);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const fetchHolidays = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get('/holidays', {
        params: { year, month: month + 1 }
      });
      if (response.data.success) {
        setHolidays(response.data.holidays || []);
      }
    } catch (err) {
      console.error('Error fetching holidays:', err);
    } finally {
      setLoading(false);
    }
  }, [year, month]);

  useEffect(() => {
    fetchHolidays();
  }, [fetchHolidays]);

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  const monthStr = currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  // Calendar grid data
  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const calendarDays = [];

  // Fill empty days before month start
  for (let i = 0; i < firstDayOfMonth; i++) {
    calendarDays.push(null);
  }
  for (let d = 1; d <= daysInMonth; d++) {
    calendarDays.push(d);
  }

  const getHolidaysForDay = (day) => {
    if (!day) return [];
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return holidays.filter(h => h.date === dateStr);
  };

  const isToday = (day) => {
    const today = new Date();
    return day === today.getDate() && month === today.getMonth() && year === today.getFullYear();
  };

  const openAddModal = (day) => {
    const dateStr = day ? `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}` : '';
    setForm({ name: '', date: dateStr, type: 'company', description: '', isRecurring: false });
    setEditingHoliday(null);
    setShowModal(true);
  };

  const openEditModal = (holiday) => {
    setForm({
      name: holiday.name,
      date: holiday.date,
      type: holiday.type,
      description: holiday.description || '',
      isRecurring: holiday.isRecurring || false
    });
    setEditingHoliday(holiday);
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.name || !form.date) return;
    try {
      setSaving(true);
      if (editingHoliday) {
        await api.put(`/holidays/${editingHoliday._id}`, form);
      } else {
        await api.post('/holidays', form);
      }
      setShowModal(false);
      fetchHolidays();
    } catch (err) {
      console.error('Error saving holiday:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this holiday?')) return;
    try {
      await api.delete(`/holidays/${id}`);
      fetchHolidays();
    } catch (err) {
      console.error('Error deleting holiday:', err);
    }
  };

  const typeColors = {
    national: { bg: 'rgba(255,180,60,0.15)', color: '#fb3' },
    company: { bg: 'rgba(100,100,255,0.15)', color: '#6b6bff' },
    optional: { bg: 'rgba(100,200,200,0.15)', color: '#6cc' },
    restricted: { bg: 'rgba(255,100,100,0.15)', color: '#f66' }
  };

  return (
    <div className="hcal">
      <div className="hcal-header">
        <div>
          <h2>Holiday Calendar</h2>
          <p className="hcal-subtitle">Company holidays visible to all members</p>
        </div>
        <button className="hcal-add-btn" onClick={() => openAddModal()}>
          <FiPlus /> Add Holiday
        </button>
      </div>

      {/* Month Navigation */}
      <div className="hcal-nav">
        <button onClick={prevMonth} className="hcal-nav-btn"><FiChevronLeft /></button>
        <h3><FiCalendar /> {monthStr}</h3>
        <button onClick={nextMonth} className="hcal-nav-btn"><FiChevronRight /></button>
      </div>

      <div className="hcal-layout">
        {/* Calendar Grid */}
        <div className="hcal-calendar">
          <div className="hcal-weekdays">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
              <div key={d} className="hcal-weekday">{d}</div>
            ))}
          </div>
          <div className="hcal-grid">
            {calendarDays.map((day, i) => {
              const dayHolidays = getHolidaysForDay(day);
              return (
                <div
                  key={i}
                  className={`hcal-day ${!day ? 'empty' : ''} ${isToday(day) ? 'today' : ''} ${dayHolidays.length > 0 ? 'has-holiday' : ''}`}
                  onClick={() => day && openAddModal(day)}
                >
                  {day && (
                    <>
                      <span className="hcal-day-num">{day}</span>
                      {dayHolidays.map((h, j) => (
                        <div
                          key={j}
                          className="hcal-day-holiday"
                          style={{ background: typeColors[h.type]?.bg, color: typeColors[h.type]?.color }}
                          onClick={e => { e.stopPropagation(); openEditModal(h); }}
                        >
                          {h.name}
                        </div>
                      ))}
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Holiday List */}
        <div className="hcal-list">
          <h3>Holidays this month ({holidays.length})</h3>
          {loading ? (
            <div className="hcal-list-loading">Loading...</div>
          ) : holidays.length > 0 ? (
            <div className="hcal-list-items">
              {holidays.sort((a, b) => a.date.localeCompare(b.date)).map(h => (
                <div key={h._id} className="hcal-list-item">
                  <div className="hcal-list-date">
                    <span className="hcal-list-day">
                      {new Date(h.date + 'T00:00:00').getDate()}
                    </span>
                    <span className="hcal-list-month">
                      {new Date(h.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short' })}
                    </span>
                  </div>
                  <div className="hcal-list-info">
                    <span className="hcal-list-name">{h.name}</span>
                    <span className={`hcal-list-type ${h.type}`}>{h.type}</span>
                    {h.description && <p className="hcal-list-desc">{h.description}</p>}
                  </div>
                  <div className="hcal-list-actions">
                    <button onClick={() => openEditModal(h)}><FiEdit2 /></button>
                    <button onClick={() => handleDelete(h._id)} className="delete"><FiTrash2 /></button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="hcal-empty">No holidays this month</p>
          )}
        </div>
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="hcal-modal-overlay" onClick={() => setShowModal(false)}>
          <div className="hcal-modal" onClick={e => e.stopPropagation()}>
            <div className="hcal-modal-header">
              <h3>{editingHoliday ? 'Edit Holiday' : 'Add Holiday'}</h3>
              <button onClick={() => setShowModal(false)}><FiX /></button>
            </div>
            <div className="hcal-modal-body">
              <div className="hcal-form-group">
                <label>Holiday Name *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g. Republic Day"
                />
              </div>
              <div className="hcal-form-group">
                <label>Date *</label>
                <input
                  type="date"
                  value={form.date}
                  onChange={e => setForm(prev => ({ ...prev, date: e.target.value }))}
                />
              </div>
              <div className="hcal-form-group">
                <label>Type</label>
                <select
                  value={form.type}
                  onChange={e => setForm(prev => ({ ...prev, type: e.target.value }))}
                >
                  <option value="national">National</option>
                  <option value="company">Company</option>
                  <option value="optional">Optional</option>
                  <option value="restricted">Restricted</option>
                </select>
              </div>
              <div className="hcal-form-group">
                <label>Description</label>
                <textarea
                  value={form.description}
                  onChange={e => setForm(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Optional description"
                  rows={3}
                />
              </div>
              <label className="hcal-checkbox">
                <input
                  type="checkbox"
                  checked={form.isRecurring}
                  onChange={e => setForm(prev => ({ ...prev, isRecurring: e.target.checked }))}
                />
                <span>Recurring every year</span>
              </label>
            </div>
            <div className="hcal-modal-footer">
              <button className="hcal-cancel-btn" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="hcal-save-btn" onClick={handleSave} disabled={saving || !form.name || !form.date}>
                {saving ? 'Saving...' : (editingHoliday ? 'Update' : 'Add Holiday')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default HolidayCalendar;
