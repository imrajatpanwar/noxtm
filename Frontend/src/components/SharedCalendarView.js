import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { FiChevronLeft, FiChevronRight, FiCalendar, FiGrid, FiList, FiLock } from 'react-icons/fi';
import { WEEKDAYS, STATUS_COLORS, getDaysInMonth, getWeekDays, getPostsForDay, isToday, formatDateStr, truncateWords, statusClass } from './calendarHelpers';
import axios from 'axios';

const isDev = process.env.NODE_ENV === 'development';
const API_BASE = process.env.REACT_APP_API_URL || (isDev ? 'http://localhost:5001' : '');

function SharedCalendarView() {
    const { token } = useParams();
    const [posts, setPosts] = useState([]);
    const [accounts, setAccounts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [currentDate, setCurrentDate] = useState(new Date());
    const [viewMode, setViewMode] = useState('month');
    const [selectedPost, setSelectedPost] = useState(null);

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const monthName = currentDate.toLocaleString('default', { month: 'long', year: 'numeric' });

    useEffect(() => {
        const fetch = async () => {
            try {
                const res = await axios.get(`${API_BASE}/api/social-media-calendar/public/${token}`);
                setPosts(res.data.posts || []);
                setAccounts(res.data.accounts || []);
            } catch (err) {
                setError(err.response?.status === 404 ? 'This calendar link is invalid or has been revoked.' : 'Failed to load calendar.');
            } finally {
                setLoading(false);
            }
        };
        fetch();
    }, [token]);

    const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
    const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

    const monthDays = getDaysInMonth(year, month);
    const weekDays = getWeekDays(currentDate);

    if (loading) return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', fontFamily: "'Switzer', -apple-system, sans-serif", color: '#6b7280' }}>
            <FiCalendar size={24} style={{ marginRight: 10 }} /> Loading calendar…
        </div>
    );

    if (error) return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', fontFamily: "'Switzer', -apple-system, sans-serif", gap: 12 }}>
            <FiLock size={36} color="#9ca3af" />
            <p style={{ color: '#374151', fontSize: 16, fontWeight: 600, margin: 0 }}>{error}</p>
            <p style={{ color: '#9ca3af', fontSize: 13, margin: 0 }}>The link may have been removed or changed.</p>
        </div>
    );

    return (
        <div style={{ fontFamily: "'Switzer', -apple-system, BlinkMacSystemFont, sans-serif", minHeight: '100vh', background: '#f9fafb' }}>
            {/* Header */}
            <div style={{ background: '#fff', borderBottom: '1px solid #e5e7eb', padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 36, height: 36, borderRadius: 8, background: '#1a1a1a', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <FiCalendar size={18} />
                    </div>
                    <div>
                        <div style={{ fontSize: 15, fontWeight: 700, color: '#1a1a1a' }}>Content Calendar</div>
                        <div style={{ fontSize: 12, color: '#9ca3af' }}>View-only shared calendar</div>
                    </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ display: 'flex', background: '#f3f4f6', borderRadius: 8, padding: 2 }}>
                        <button onClick={() => setViewMode('month')} style={{ padding: '5px 12px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 5, background: viewMode === 'month' ? '#fff' : 'transparent', color: viewMode === 'month' ? '#1a1a1a' : '#6b7280', boxShadow: viewMode === 'month' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none' }}>
                            <FiGrid size={12} /> Month
                        </button>
                        <button onClick={() => setViewMode('week')} style={{ padding: '5px 12px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 5, background: viewMode === 'week' ? '#fff' : 'transparent', color: viewMode === 'week' ? '#1a1a1a' : '#6b7280', boxShadow: viewMode === 'week' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none' }}>
                            <FiList size={12} /> Week
                        </button>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <button onClick={prevMonth} style={{ width: 28, height: 28, borderRadius: 6, border: '1px solid #e5e7eb', background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#374151' }}><FiChevronLeft size={14} /></button>
                        <span style={{ fontSize: 13, fontWeight: 600, color: '#1a1a1a', minWidth: 130, textAlign: 'center' }}>{monthName}</span>
                        <button onClick={nextMonth} style={{ width: 28, height: 28, borderRadius: 6, border: '1px solid #e5e7eb', background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#374151' }}><FiChevronRight size={14} /></button>
                    </div>
                </div>
            </div>

            {/* Calendar Grid */}
            <div style={{ padding: '20px 24px' }}>
                {viewMode === 'month' ? (
                    <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
                        {/* Weekday headers */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', borderBottom: '1px solid #e5e7eb' }}>
                            {WEEKDAYS.map(d => (
                                <div key={d} style={{ padding: '10px 4px', textAlign: 'center', fontSize: 11, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{d}</div>
                            ))}
                        </div>
                        {/* Days grid */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
                            {monthDays.map((day, idx) => {
                                const dayPosts = getPostsForDay(posts, day.date);
                                const todayDay = isToday(day.date);
                                return (
                                    <div key={idx} style={{ minHeight: 100, borderRight: idx % 7 !== 6 ? '1px solid #f3f4f6' : 'none', borderBottom: '1px solid #f3f4f6', padding: '6px 4px', background: todayDay ? '#fffbeb' : 'transparent' }}>
                                        <div style={{ fontSize: 12, fontWeight: todayDay ? 700 : 500, color: !day.currentMonth ? '#d1d5db' : todayDay ? '#f59e0b' : '#374151', marginBottom: 4, paddingLeft: 2 }}>
                                            {day.day}
                                        </div>
                                        {dayPosts.slice(0, 3).map(post => (
                                            <div key={post._id} onClick={() => setSelectedPost(post)} style={{ fontSize: 10, fontWeight: 500, padding: '2px 5px', borderRadius: 4, marginBottom: 2, cursor: 'pointer', background: STATUS_COLORS[post.status] + '22', color: STATUS_COLORS[post.status], borderLeft: `2px solid ${STATUS_COLORS[post.status]}`, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }} title={post.title}>
                                                {truncateWords(post.title, 4)}
                                            </div>
                                        ))}
                                        {dayPosts.length > 3 && <div style={{ fontSize: 10, color: '#9ca3af', paddingLeft: 2 }}>+{dayPosts.length - 3} more</div>}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ) : (
                    <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '60px repeat(7, 1fr)', borderBottom: '1px solid #e5e7eb' }}>
                            <div style={{ padding: '10px 8px' }} />
                            {weekDays.map((d, i) => (
                                <div key={i} style={{ padding: '10px 8px', textAlign: 'center', borderLeft: '1px solid #f3f4f6' }}>
                                    <div style={{ fontSize: 10, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{WEEKDAYS[d.getDay()]}</div>
                                    <div style={{ fontSize: 18, fontWeight: 700, color: isToday(d) ? '#f59e0b' : '#1a1a1a', marginTop: 2 }}>{d.getDate()}</div>
                                </div>
                            ))}
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '60px repeat(7, 1fr)', minHeight: 400 }}>
                            <div style={{ padding: '8px 4px', fontSize: 10, color: '#9ca3af' }}>Posts</div>
                            {weekDays.map((d, i) => {
                                const dayPosts = getPostsForDay(posts, d);
                                return (
                                    <div key={i} style={{ borderLeft: '1px solid #f3f4f6', padding: '8px 4px', minHeight: 120 }}>
                                        {dayPosts.map(post => (
                                            <div key={post._id} onClick={() => setSelectedPost(post)} style={{ fontSize: 11, fontWeight: 500, padding: '4px 6px', borderRadius: 5, marginBottom: 4, cursor: 'pointer', background: STATUS_COLORS[post.status] + '22', color: STATUS_COLORS[post.status], borderLeft: `2px solid ${STATUS_COLORS[post.status]}` }}>
                                                {truncateWords(post.title, 3)}
                                            </div>
                                        ))}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>

            {/* Post detail overlay */}
            {selectedPost && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setSelectedPost(null)}>
                    <div style={{ background: '#fff', borderRadius: 14, padding: 24, maxWidth: 440, width: '90%', boxShadow: '0 20px 60px rgba(0,0,0,0.15)' }} onClick={e => e.stopPropagation()}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                            <div>
                                <div style={{ fontSize: 16, fontWeight: 700, color: '#1a1a1a' }}>{selectedPost.title}</div>
                                <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 2 }}>{selectedPost.postDate} {selectedPost.postTime && `• ${selectedPost.postTime}`}</div>
                            </div>
                            <button onClick={() => setSelectedPost(null)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#9ca3af', fontSize: 18, lineHeight: 1 }}>×</button>
                        </div>
                        <div style={{ display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap' }}>
                            <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 20, background: STATUS_COLORS[selectedPost.status] + '22', color: STATUS_COLORS[selectedPost.status] }}>{selectedPost.status}</span>
                            <span style={{ fontSize: 11, fontWeight: 500, padding: '3px 8px', borderRadius: 20, background: '#f3f4f6', color: '#6b7280' }}>{selectedPost.platform}</span>
                            {selectedPost.postType && <span style={{ fontSize: 11, fontWeight: 500, padding: '3px 8px', borderRadius: 20, background: '#f3f4f6', color: '#6b7280' }}>{selectedPost.postType}</span>}
                        </div>
                        {selectedPost.content && (
                            <div style={{ fontSize: 13, color: '#374151', lineHeight: 1.6, background: '#f9fafb', borderRadius: 8, padding: '10px 12px', marginBottom: 12, whiteSpace: 'pre-wrap' }}>{selectedPost.content}</div>
                        )}
                        {selectedPost.referenceLinks?.length > 0 && (
                            <div>
                                <div style={{ fontSize: 11, fontWeight: 600, color: '#9ca3af', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Reference Links</div>
                                {selectedPost.referenceLinks.map((link, i) => (
                                    <a key={i} href={link} target="_blank" rel="noreferrer" style={{ display: 'block', fontSize: 12, color: '#2563eb', textDecoration: 'none', marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{link}</a>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Footer */}
            <div style={{ textAlign: 'center', padding: '20px', color: '#d1d5db', fontSize: 12 }}>
                Powered by <strong style={{ color: '#9ca3af' }}>Noxtm</strong>
            </div>
        </div>
    );
}

export default SharedCalendarView;
