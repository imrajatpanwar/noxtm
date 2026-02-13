// Calendar constants and helpers
export const PLATFORMS = ['Instagram', 'LinkedIn', 'YouTube', 'X', 'Facebook', 'Reddit', 'Other'];
export const STATUSES = ['Draft', 'Pending Review', 'Approved', 'Scheduled', 'Published', 'Rejected'];
export const PRIORITIES = ['Low', 'Medium', 'High'];
export const STATUS_COLORS = {
    'Draft': '#9ca3af', 'Pending Review': '#d97706', 'Approved': '#16a34a',
    'Scheduled': '#2563eb', 'Published': '#1a1a1a', 'Rejected': '#dc2626'
};
export const PRIORITY_COLORS = { 'Low': '#9ca3af', 'Medium': '#d97706', 'High': '#dc2626' };
export const ACCOUNT_COLORS = ['#1a1a1a', '#6b7280', '#d97706', '#16a34a', '#2563eb', '#dc2626', '#7c3aed', '#0891b2', '#ea580c', '#64748b'];
export const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
export const PLATFORM_LIMITS = { Instagram: 2200, LinkedIn: 3000, YouTube: 5000, X: 280, Facebook: 63206, Reddit: 40000, Other: 99999 };

export const statusClass = (s) => s.toLowerCase().replace(/\s+/g, '-');
export const getInitials = (name) => name ? name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : '?';
export const formatTime = (date) => new Date(date).toLocaleString('default', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
export const formatDateStr = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export const isToday = (date) => {
    const t = new Date();
    return date.getDate() === t.getDate() && date.getMonth() === t.getMonth() && date.getFullYear() === t.getFullYear();
};

export const getDaysInMonth = (year, month) => {
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();
    const days = [];
    for (let i = firstDay - 1; i >= 0; i--) days.push({ day: daysInPrevMonth - i, currentMonth: false, date: new Date(year, month - 1, daysInPrevMonth - i) });
    for (let i = 1; i <= daysInMonth; i++) days.push({ day: i, currentMonth: true, date: new Date(year, month, i) });
    const remaining = 42 - days.length;
    for (let i = 1; i <= remaining; i++) days.push({ day: i, currentMonth: false, date: new Date(year, month + 1, i) });
    return days;
};

export const getWeekDays = (currentDate) => {
    const start = new Date(currentDate);
    start.setDate(start.getDate() - start.getDay());
    return Array.from({ length: 7 }, (_, i) => { const d = new Date(start); d.setDate(d.getDate() + i); return d; });
};

export const getPostsForDay = (posts, date, statusFilter, searchQuery) => {
    let filtered = posts.filter(p => {
        const pd = new Date(p.postDate);
        return pd.getDate() === date.getDate() && pd.getMonth() === date.getMonth() && pd.getFullYear() === date.getFullYear();
    });
    if (statusFilter !== 'all') filtered = filtered.filter(p => statusClass(p.status) === statusFilter);
    if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        filtered = filtered.filter(p => p.title.toLowerCase().includes(q) || p.content?.toLowerCase().includes(q) || p.platform?.toLowerCase().includes(q));
    }
    return filtered;
};

export const defaultPostForm = () => ({ title: '', content: '', postDate: '', postTime: '10:00', platform: 'Instagram', socialMediaAccount: '', labels: '', notes: '', status: 'Draft', priority: 'Medium', isRecurring: false, recurringPattern: '' });
export const defaultAccountForm = () => ({ name: '', platform: 'Instagram', handle: '', color: '#1a1a1a', assignedTo: '' });
