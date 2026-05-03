import React, { useState, useEffect, useCallback } from 'react';
import { FiActivity, FiCalendar, FiCheck, FiClock, FiEdit3, FiFlag, FiInbox, FiMessageSquare, FiMoreVertical, FiPlus, FiSearch, FiSend, FiTarget, FiTrash2, FiUserCheck, FiUserX, FiUsers, FiX } from 'react-icons/fi';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { CalendarIcon } from 'lucide-react';
import api from '../config/api';
import { useRole } from '../contexts/RoleContext';
import './TaskManager.css';
import { confirm } from './ui/alert-dialog';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Calendar } from './ui/calendar';
import { Card } from './ui/card';
import { Dialog, DialogBody, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog';
import { Input } from './ui/input';
import { InputGroup, InputGroupAddon, InputGroupText } from './ui/input-group';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Select, SelectContent, SelectItem } from './ui/select';
import { Separator } from './ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Textarea } from './ui/textarea';
import { ToggleGroup, ToggleGroupItem } from './ui/toggle-group';

const TASK_TYPES = [
  { id: 'One Time',  label: 'One Time',  code: 'OT', color: '#111827', desc: 'Single task, no repeat' },
  { id: 'Daily',     label: 'Daily Task', code: 'DY', color: '#111827', desc: 'Repeats daily with target' },
  { id: 'Calendar',  label: 'Calendar',  code: 'CL', color: '#111827', desc: 'Tied to a calendar date' },
  { id: 'Recurring', label: 'Recurring', code: 'RC', color: '#111827', desc: 'Weekly or monthly repeat' },
  { id: 'Milestone', label: 'Milestone', code: 'MS', color: '#111827', desc: 'Key project milestone' },
  { id: 'Sprint',    label: 'Sprint',    code: 'SP', color: '#111827', desc: 'Timeboxed sprint task' },
];
const TYPE_META = TASK_TYPES.reduce((a, t) => { a[t.id] = t; return a; }, {});

const SOURCES = ['Manual', 'Data Center', 'Calendar', 'CRM', 'HR'];

const getId = (value) => (value?._id || value?.id || value)?.toString?.() || '';
const sameUser = (left, right) => Boolean(getId(left) && getId(left) === getId(right));
const getPendingRequests = (task) => (task.assignmentRequests || []).filter(request => request.status === 'pending');
const getMyPendingRequest = (task, currentUserId) => getPendingRequests(task).find(request => sameUser(request.user, currentUserId));
const getAcceptedRequests = (task) => (task.assignmentRequests || []).filter(request => request.status === 'accepted');
const getRejectedRequests = (task) => (task.assignmentRequests || []).filter(request => request.status === 'rejected');

const isDataCenterTask = (task) => (
  task?.progressSource === 'Data Center' ||
  task?.source === 'Data Center' ||
  (task?.labels || []).includes('Data Center')
);

const getTodayProgress = (task) => {
  if (Number.isFinite(Number(task.todayProgress))) return Number(task.todayProgress);
  const today = new Date().toISOString().slice(0, 10);
  return (task.dailyProgress || [])
    .filter(p => p.date === today)
    .reduce((sum, p) => sum + (Number(p.count) || 0), 0);
};

const getProgressTarget = (task) => {
  const target = Number(task.progressTarget || task.target);
  return Number.isFinite(target) && target > 0 ? target : 100;
};

const getProgressMeta = (task) => {
  const hasDailyProgress = isDataCenterTask(task) || task.taskType === 'Daily' || Number(task.target) > 0 || (task.dailyProgress || []).length > 0;

  if (hasDailyProgress) {
    const done = getTodayProgress(task);
    const target = getProgressTarget(task);
    const percent = target > 0 ? Math.min(100, Math.round((done / target) * 100)) : 0;
    const isDataCenterProgress = isDataCenterTask(task);
    return {
      label: isDataCenterProgress ? 'Data Center Today' : 'Daily Task',
      value: `Target : ${done}/${target}`,
      percent,
    };
  }

  const byStatus = {
    Todo: 0,
    'In Progress': 45,
    'In Review': 72,
    Done: 100,
  };
  const percent = byStatus[task.status] ?? 0;
  return {
    label: 'Progress',
    value: `${percent}%`,
    percent,
  };
};

const getCardSource = (task) => {
  if (task.source && task.source !== 'Manual') return task.source;
  const firstModuleLabel = (task.labels || []).find(label => label && label !== 'Manual');
  return firstModuleLabel || task.source || 'Manual';
};

const getUserLabel = (user, fallback = 'User') => (
  user?.fullName || user?.name || user?.email || fallback
);

const formatTaskTime = (value) => {
  if (!value) return 'Just now';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Just now';
  return date.toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  });
};

const getActivityLabel = (action = '') => ({
  created: 'created the task',
  updated: 'updated the task',
  status_changed: 'changed status',
  assigned: 'updated assignees',
  unassigned: 'removed an assignee',
  commented: 'commented',
  priority_changed: 'changed priority',
  assignment_requested: 'sent assignment request',
  assignment_accepted: 'accepted assignment',
  assignment_rejected: 'rejected assignment'
}[action] || action.replace(/_/g, ' ') || 'updated the task');

/* ── Avatar (circular) ─────────────────────────────────── */
const UserAvatar = ({ user, size = 30 }) => {
  const [imgError, setImgError] = React.useState(false);
  if (!user) return null;
  const name = user.fullName || user.name || user.email?.split('@')[0] || '?';
  const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  const palette = ['#667eea','#f5576c','#4facfe','#43e97b','#f093fb','#f97316','#06b6d4','#8b5cf6'];
  const bg = palette[name.charCodeAt(0) % palette.length];
  const img = (user.profileImage || user.avatar) && !imgError ? (user.profileImage || user.avatar) : null;
  return (
    <div className="tm-av" style={{ width: size, height: size, fontSize: size * 0.38, background: img ? 'transparent' : bg }} title={name}>
      {img ? <img src={img} alt={name} onError={() => setImgError(true)} style={{ width:'100%', height:'100%', objectFit:'cover', borderRadius:'50%' }} /> : <span>{initials}</span>}
    </div>
  );
};

/* ── Daily progress bar ───────────────────────────────── */
const DailyBar = ({ task }) => {
  const { label, value, percent } = getProgressMeta(task);
  const BARS = 44;
  const filled = Math.round((percent / 100) * BARS);
  return (
    <div className="tm-bar-section" role="progressbar" aria-label={`${label} ${value}`} aria-valuemin="0" aria-valuemax="100" aria-valuenow={percent}>
      <div className="tm-bar-labels">
        <span className="tm-bar-type-label">{label}</span>
        <span className="tm-bar-target">{value}</span>
      </div>
      <div className="tm-bars-row">
        {Array.from({ length: BARS }, (_, i) => (
          <div key={i} className={`tm-seg${i < filled ? ' on' : ''}`} />
        ))}
      </div>
    </div>
  );
};

/* ── Task Card ─────────────────────────────────────────── */
const TaskCard = ({ task, onClick, onEdit, onDelete, currentUserId }) => {
  const sourceLabel = getCardSource(task);
  const commentCount = task.commentCount ?? task.comments?.length ?? 0;
  const pBadgeClass = { Low:'tm-pb-low', Medium:'tm-pb-med', High:'tm-pb-high', Urgent:'tm-pb-urg' }[task.priority] || 'tm-pb-med';
  const myPendingRequest = getMyPendingRequest(task, currentUserId);
  const pendingRequests = getPendingRequests(task);
  const acceptedRequests = getAcceptedRequests(task);
  const rejectedRequests = getRejectedRequests(task);
  const createdByMe = sameUser(task.createdBy, currentUserId);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (!menuOpen) return undefined;
    const close = () => setMenuOpen(false);
    window.addEventListener('click', close);
    return () => window.removeEventListener('click', close);
  }, [menuOpen]);

  return (
    <Card className={`tm-card${myPendingRequest ? ' tm-card-request' : ''}`} onClick={onClick}>
      {(myPendingRequest || (createdByMe && pendingRequests.length > 0)) && (
        <div className="tm-request-strip">
          <span>
            {myPendingRequest ? <FiInbox size={13} /> : <FiClock size={13} />}
            {myPendingRequest ? 'Request for you' : `${pendingRequests.length} request${pendingRequests.length === 1 ? '' : 's'} pending`}
          </span>
          <strong>{myPendingRequest ? 'Review' : 'Waiting'}</strong>
        </div>
      )}

      {/* Top: title + menu */}
      <div className="tm-card-head">
        <div>
          <h3 className="tm-card-title">{task.title}</h3>
          {task.description && <p className="tm-card-desc">{task.description.slice(0, 100)}{task.description.length > 100 ? '…' : ''}</p>}
        </div>
        <div className="tm-card-menu-wrap" onClick={e => e.stopPropagation()}>
          <button
            className="tm-card-menu"
            onClick={() => setMenuOpen(open => !open)}
            aria-label="Task options"
            aria-expanded={menuOpen}
          >
            <FiMoreVertical size={22}/>
          </button>
          {menuOpen && (
            <div className="tm-card-menu-pop" role="menu" aria-label="Task actions">
              <button
                type="button"
                className="tm-card-menu-item"
                onClick={() => {
                  setMenuOpen(false);
                  onEdit(task);
                }}
              >
                <FiEdit3 size={14} /> Edit
              </button>
              <button
                type="button"
                className="tm-card-menu-item danger"
                onClick={() => {
                  setMenuOpen(false);
                  onDelete(task);
                }}
              >
                <FiTrash2 size={14} /> Delete
              </button>
            </div>
          )}
        </div>
      </div>

      <DailyBar task={task} />

      {/* Footer: avatars | badges + comments */}
      <div className="tm-card-foot">
        <div className="tm-av-stack">
          {(task.assignees || []).slice(0, 3).map((u, i) => (
            <div key={i} className="tm-av-wrap" style={{ zIndex: 10 - i }}>
              <UserAvatar user={u} size={38} />
            </div>
          ))}
          {(task.assignees || []).length > 3 && (
            <div className="tm-av-more">+{task.assignees.length - 3}</div>
          )}
        </div>
        <div className="tm-card-badges">
          {sourceLabel && <span className="tm-dc-badge">{sourceLabel}</span>}
          <span className={`tm-priority-pill ${pBadgeClass}`}>{task.priority}</span>
          {acceptedRequests.length > 0 && <span className="tm-request-pill accepted"><FiUserCheck size={13}/> {acceptedRequests.length}</span>}
          {rejectedRequests.length > 0 && <span className="tm-request-pill rejected"><FiUserX size={13}/> {rejectedRequests.length}</span>}
          <span className="tm-comment-pill">
            <FiMessageSquare size={18}/> {commentCount}
          </span>
          {(task.activeUsers || []).length > 0 && (
            <span className="tm-active-pill"><span className="tm-dot"/> {task.activeUsers.length}</span>
          )}
        </div>
      </div>
    </Card>
  );
};

/* ── Create Task Modal ─────────────────────────────────── */
const CreateTaskModal = ({ isOpen, onClose, onTaskCreated, companyUsers, taskToEdit = null }) => {
  const isEditing = Boolean(taskToEdit);
  const [taskType, setTaskType] = useState('One Time');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('Medium');
  const [assignees, setAssignees] = useState([]);
  const [dueDate, setDueDate] = useState('');
  const [target, setTarget] = useState(100);
  const [calendarDate, setCalendarDate] = useState('');
  const [recurrence, setRecurrence] = useState('weekly');
  const [source, setSource] = useState('Manual');
  const [requestComment, setRequestComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [assigneePickerOpen, setAssigneePickerOpen] = useState(false);

  const reset = () => { setTaskType('One Time'); setTitle(''); setDescription(''); setPriority('Medium'); setAssignees([]); setDueDate(''); setTarget(100); setCalendarDate(''); setRecurrence('weekly'); setSource('Manual'); setRequestComment(''); setAssigneePickerOpen(false); };
  const usesTarget = taskType === 'Daily' || source === 'Data Center';

  useEffect(() => {
    if (!isOpen) return;
    if (!taskToEdit) {
      reset();
      return;
    }

    setTaskType(taskToEdit.taskType || 'One Time');
    setTitle(taskToEdit.title || '');
    setDescription(taskToEdit.description || '');
    setPriority(taskToEdit.priority || 'Medium');
    setAssignees((taskToEdit.assignees || []).map(user => getId(user)).filter(Boolean));
    setDueDate(taskToEdit.dueDate ? taskToEdit.dueDate.slice(0, 10) : '');
    setTarget(getProgressTarget(taskToEdit));
    setCalendarDate(taskToEdit.calendarDate ? taskToEdit.calendarDate.slice(0, 10) : '');
    setRecurrence(taskToEdit.recurrence || 'weekly');
    setSource(taskToEdit.source || getCardSource(taskToEdit) || 'Manual');
    setRequestComment('');
    setAssigneePickerOpen(false);
  }, [isOpen, taskToEdit]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) return;
    setSubmitting(true);
    const labels = source !== 'Manual' ? [source] : [];
    try {
      const payload = {
        title: title.trim(), description, priority, taskType, assignees,
        dueDate: dueDate || null, target: usesTarget ? target : null,
        calendarDate: calendarDate || null, recurrence: taskType === 'Recurring' ? recurrence : null,
        source, labels, requestComment
      };

      if (isEditing) {
        await api.put(`/tasks/${taskToEdit._id}`, payload);
      } else {
        await api.post('/tasks', payload);
      }

      toast.success(
        isEditing
          ? 'Task updated!'
          : (assignees.length ? 'Task request sent!' : 'Task created!')
      );
      onTaskCreated(); onClose(); reset();
    } catch { toast.error(isEditing ? 'Failed to update task' : 'Failed to create task'); }
    finally { setSubmitting(false); }
  };

  const toggleAssignee = id => setAssignees(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);
  if (!isOpen) return null;
  const selectedUsers = companyUsers.filter(user => assignees.includes(user._id));
  const timingLabel = taskType === 'Calendar'
    ? (calendarDate || 'No date')
    : taskType === 'Recurring'
      ? recurrence
      : (dueDate || 'No due date');

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="tm-create-dialog tm-create-dialog-redesign">
        <DialogHeader className="tm-create-header tm-create-header-redesign">
          <div className="tm-create-title-block">
            <span className="tm-create-kicker">{isEditing ? 'Task editor' : 'Task studio'}</span>
            <DialogTitle>{isEditing ? 'Edit task' : 'New task'}</DialogTitle>
            <DialogDescription>{isEditing ? 'Update the work packet before it moves forward.' : 'Shape the work packet, choose ownership, and send it into motion.'}</DialogDescription>
          </div>
          <div className="tm-create-summary-strip" aria-label="Task summary">
            <Badge variant="outline" className="tm-summary-badge"><FiTarget size={14} /> {TYPE_META[taskType]?.label}</Badge>
            <Badge variant="outline" className="tm-summary-badge"><FiFlag size={14} /> {priority}</Badge>
            <Badge variant="outline" className="tm-summary-badge"><FiUsers size={14} /> {assignees.length || 0}</Badge>
          </div>
          <DialogClose className="tm-dialog-close" aria-label="Close" />
        </DialogHeader>

        <form onSubmit={handleSubmit} className="tm-create-form tm-create-form-redesign">
          <DialogBody className="tm-create-body tm-create-body-redesign">
            <div className="tm-create-workspace">
              <section className="tm-create-primary-panel" aria-label="Task brief">
                <div className="tm-create-field tm-title-field">
                  <label>Task title</label>
                  <Input className="tm-shad-title tm-redesign-title" type="text" placeholder="Name the task" value={title} onChange={e => setTitle(e.target.value)} autoFocus required />
                </div>

                <div className="tm-create-field">
                  <label>Description</label>
                  <Textarea className="tm-shad-textarea tm-redesign-textarea" placeholder="Add context, acceptance notes, or blockers" value={description} onChange={e => setDescription(e.target.value)} rows={4} />
                </div>

                <div className="tm-create-field">
                  <label>Task type</label>
                  <ToggleGroup type="single" value={taskType} onValueChange={v => v && setTaskType(v)} className="tm-type-choice-grid">
                    {TASK_TYPES.map(t => (
                      <ToggleGroupItem key={t.id} value={t.id} className="tm-type-choice-card">
                        <span className="tm-type-choice-copy">
                          <strong>{t.label}</strong>
                          <em>{t.desc}</em>
                        </span>
                      </ToggleGroupItem>
                    ))}
                  </ToggleGroup>
                </div>
              </section>

              <aside className="tm-create-side-panel" aria-label="Task controls">
                <div className="tm-create-meta-grid">
                  <div className="tm-create-meta-cell">
                    <span>Type</span>
                    <strong>{TYPE_META[taskType]?.code}</strong>
                  </div>
                  <div className="tm-create-meta-cell">
                    <span>Timing</span>
                    <strong>{timingLabel}</strong>
                  </div>
                </div>

                <div className="tm-create-field">
                  <label>Source</label>
                  <ToggleGroup type="single" value={source} onValueChange={v => v && setSource(v)} className="tm-source-segments">
                    {SOURCES.map(s => <ToggleGroupItem key={s} value={s} className="tm-source-segment">{s}</ToggleGroupItem>)}
                  </ToggleGroup>
                </div>

                <div className="tm-create-field">
                  <label>Priority</label>
                  <ToggleGroup type="single" value={priority} onValueChange={v => v && setPriority(v)} className="tm-priority-stack">
                    {['Low','Medium','High','Urgent'].map(p => (
                      <ToggleGroupItem type="button" key={p} value={p} className={`tm-priority-card tm-priority-card-${p.toLowerCase()}`}>
                        <span>{p}</span>
                        <FiCheck size={14} />
                      </ToggleGroupItem>
                    ))}
                  </ToggleGroup>
                </div>

                <div className="tm-create-grid tm-create-timing-grid">
                  {usesTarget && (
                    <div className="tm-create-field">
                      <label>{source === 'Data Center' ? 'Data Center target' : 'Daily target'}</label>
                      <InputGroup className="tm-target-group">
                        <InputGroupAddon className="tm-target-prefix-addon">
                          <InputGroupText>{source === 'Data Center' ? '🎯' : '#'}</InputGroupText>
                        </InputGroupAddon>
                        <Input
                          className="tm-shad-input tm-target-input"
                          type="number"
                          min={1}
                          value={target}
                          onChange={e => setTarget(+e.target.value)}
                          data-slot="input-group-control"
                        />
                        <InputGroupAddon className="tm-target-addon">
                          <InputGroupText>{source === 'Data Center' ? 'records' : 'items'}</InputGroupText>
                        </InputGroupAddon>
                      </InputGroup>
                    </div>
                  )}
                  {taskType === 'Calendar' && (
                    <div className="tm-create-field">
                      <label>Calendar date</label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <button
                            type="button"
                            className={`tm-date-picker-btn${!calendarDate ? ' tm-date-picker-empty' : ''}`}
                          >
                            <CalendarIcon size={15} className="tm-date-picker-icon" />
                            {calendarDate
                              ? format(new Date(calendarDate + 'T00:00:00'), 'MMM d, yyyy')
                              : <span>Pick a date</span>}
                          </button>
                        </PopoverTrigger>
                        <PopoverContent className="tm-date-picker-pop" align="start" side="top" sideOffset={6}>
                          <Calendar
                            mode="single"
                            selected={calendarDate ? new Date(calendarDate + 'T00:00:00') : undefined}
                            onSelect={d => setCalendarDate(d ? format(d, 'yyyy-MM-dd') : '')}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                  )}
                  {taskType === 'Recurring' && (
                    <div className="tm-create-field">
                      <label>Repeat</label>
                      <Select
                        value={recurrence}
                        onValueChange={v => setRecurrence(v)}
                        aria-label="Repeat"
                        className="tm-repeat-standalone"
                      >
                        <SelectContent>
                          <SelectItem value="daily">Daily</SelectItem>
                          <SelectItem value="weekly">Weekly</SelectItem>
                          <SelectItem value="monthly">Monthly</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  {(taskType === 'One Time' || taskType === 'Milestone' || taskType === 'Sprint') && (
                    <div className="tm-create-field">
                      <label>Due date</label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <button
                            type="button"
                            className={`tm-date-picker-btn${!dueDate ? ' tm-date-picker-empty' : ''}`}
                          >
                            <CalendarIcon size={15} className="tm-date-picker-icon" />
                            {dueDate
                              ? format(new Date(dueDate + 'T00:00:00'), 'MMM d, yyyy')
                              : <span>Pick a date</span>}
                          </button>
                        </PopoverTrigger>
                        <PopoverContent className="tm-date-picker-pop" align="start" side="top" sideOffset={6}>
                          <Calendar
                            mode="single"
                            selected={dueDate ? new Date(dueDate + 'T00:00:00') : undefined}
                            onSelect={d => setDueDate(d ? format(d, 'yyyy-MM-dd') : '')}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                  )}
                </div>

                <Separator className="tm-create-separator" />

                <div className="tm-create-field tm-team-field">
                  <div className="tm-team-label-row">
                    <label>Assign to</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      {assignees.length > 0 && <span className="tm-assignee-count-badge">{assignees.length} selected</span>}
                      <button
                        type="button"
                        className={`tm-assignee-toggle-btn${assigneePickerOpen ? ' open' : ''}`}
                        aria-label={assigneePickerOpen ? 'Close assignee picker' : 'Open assignee picker'}
                        aria-expanded={assigneePickerOpen}
                        onClick={() => setAssigneePickerOpen(open => !open)}
                      >
                        {assigneePickerOpen ? <FiX size={13} /> : <FiPlus size={13} />}
                        {assigneePickerOpen ? 'Done' : 'Add members'}
                      </button>
                    </div>
                  </div>

                  {/* Selected avatar row */}
                  {selectedUsers.length > 0 && (
                    <div className="tm-assignee-avatar-row">
                      {selectedUsers.map(user => (
                        <div key={user._id} className="tm-assignee-avatar-chip">
                          <UserAvatar user={user} size={26} />
                          <span>{(user.fullName || user.email || '').split(' ')[0]}</span>
                          <button
                            type="button"
                            className="tm-assignee-remove"
                            onClick={() => toggleAssignee(user._id)}
                            aria-label={`Remove ${user.fullName}`}
                          >
                            <FiX size={10} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Inline member list */}
                  {assigneePickerOpen && (
                    <div className="tm-assignee-inline-list">
                      {companyUsers.length === 0 && (
                        <div className="tm-no-users">No team members found</div>
                      )}
                      {companyUsers.map(u => (
                        <button
                          type="button"
                          key={u._id}
                          className={`tm-assignee-member-row${assignees.includes(u._id) ? ' sel' : ''}`}
                          onClick={() => toggleAssignee(u._id)}
                        >
                          <UserAvatar user={u} size={30} />
                          <div className="tm-assignee-member-info">
                            <strong>{u.fullName || u.email}</strong>
                            {u.fullName && <span>{u.email}</span>}
                          </div>
                          <div className={`tm-assignee-member-check${assignees.includes(u._id) ? ' checked' : ''}`}>
                            {assignees.includes(u._id) && <FiCheck size={11} />}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {assignees.length > 0 && (
                  <div className="tm-create-field">
                    <label>Request note</label>
                    <Textarea
                      className="tm-shad-textarea tm-request-note-redesign"
                      placeholder="Optional note for invitees"
                      value={requestComment}
                      onChange={e => setRequestComment(e.target.value)}
                      rows={3}
                    />
                  </div>
                )}
              </aside>
            </div>
          </DialogBody>

          <DialogFooter className="tm-create-footer tm-create-footer-redesign">
            <div className="tm-footer-context">
              <FiCalendar size={15} />
              <span>{timingLabel}</span>
            </div>
            <Button type="button" variant="outline" className="tm-create-action tm-create-cancel" onClick={onClose}>Cancel</Button>
            <Button type="submit" className="tm-create-action tm-create-submit" disabled={!title.trim() || submitting}>
              {isEditing ? <FiEdit3 size={14}/> : <FiPlus size={14}/>}
              {submitting ? (isEditing ? 'Updating...' : 'Creating...') : (isEditing ? 'Update Task' : 'Create Task')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

/* ── Task Detail Panel ─────────────────────────────────── */
const TaskDetailPanel = ({ task, onClose, onTaskUpdated, companyUsers, currentUserId }) => {
  const [newComment, setNewComment] = useState('');
  const [responseComment, setResponseComment] = useState('');
  const today = new Date().toISOString().slice(0, 10);
  const myEntry = (task.dailyProgress || []).find(p => sameUser(p.user, currentUserId) && p.date === today);
  const myCount = myEntry?.count || 0;
  const isActive = (task.activeUsers || []).some(u => sameUser(u, currentUserId));
  const isDataCenterProgress = isDataCenterTask(task);
  const showProgressPanel = task.taskType === 'Daily' || isDataCenterProgress;
  const progressRows = isDataCenterProgress
    ? (task.dataCenterProgressByUser || [])
    : (task.dailyProgress || []).filter(p => p.date === today);
  const myPendingRequest = getMyPendingRequest(task, currentUserId);
  const pendingRequests = getPendingRequests(task);
  const acceptedRequests = getAcceptedRequests(task);
  const rejectedRequests = getRejectedRequests(task);
  const createdByMe = sameUser(task.createdBy, currentUserId);

  const patch = async (url, body) => { try { await api.patch(url, body); onTaskUpdated(); } catch {} };
  const handleDelete = async () => { if (!await confirm('Delete this task?')) return; try { await api.delete(`/tasks/${task._id}`); onTaskUpdated(); onClose(); } catch {} };
  const handleComment = async (e) => { e.preventDefault(); if (!newComment.trim()) return; try { await api.post(`/tasks/${task._id}/comments`, { content: newComment.trim() }); setNewComment(''); onTaskUpdated(); } catch {} };
  const handleAssignmentResponse = async (status) => {
    try {
      await api.patch(`/tasks/${task._id}/assignment-response`, { status, comment: responseComment.trim() });
      toast.success(status === 'accepted' ? 'Task accepted' : 'Task rejected');
      setResponseComment('');
      onTaskUpdated();
    } catch {
      toast.error('Could not update request');
    }
  };

  const meta = TYPE_META[task.taskType] || TYPE_META['One Time'];

  return (
    <div className="tm-detail">
      <div className="tm-detail-hd">
        <div style={{ flex: 1 }}>
          <h2 className="tm-detail-title">{task.title}</h2>
          {task.description && <p className="tm-detail-sub">{task.description}</p>}
        </div>
        <button className="tm-detail-x" onClick={onClose}><FiX size={20}/></button>
      </div>

      <div className="tm-detail-body">
        {myPendingRequest && (
          <div className="tm-request-panel">
            <div>
              <span className="tm-request-kicker"><FiInbox size={13}/> Task request</span>
              <h3>{myPendingRequest.requestedBy?.fullName || myPendingRequest.requestedBy?.email || 'A teammate'} wants to assign this to you.</h3>
              {myPendingRequest.requestComment && <p>{myPendingRequest.requestComment}</p>}
            </div>
            <textarea
              className="tm-request-comment"
              placeholder="Add a comment before accepting or rejecting..."
              value={responseComment}
              onChange={e => setResponseComment(e.target.value)}
              rows={2}
            />
            <div className="tm-request-actions">
              <button type="button" className="tm-request-btn accept" onClick={() => handleAssignmentResponse('accepted')}><FiCheck size={14}/> Accept</button>
              <button type="button" className="tm-request-btn reject" onClick={() => handleAssignmentResponse('rejected')}><FiX size={14}/> Reject</button>
            </div>
          </div>
        )}

        {createdByMe && (pendingRequests.length > 0 || acceptedRequests.length > 0 || rejectedRequests.length > 0) && (
          <div className="tm-request-panel creator">
            <span className="tm-request-kicker"><FiClock size={13}/> Assignment requests</span>
            <div className="tm-request-list">
              {[...pendingRequests, ...acceptedRequests, ...rejectedRequests].map(request => (
                <div key={request._id || getId(request.user)} className={`tm-request-row ${request.status}`}>
                  <UserAvatar user={request.user} size={26} />
                  <span>{request.user?.fullName || request.user?.email || 'User'}</span>
                  <strong>{request.status}</strong>
                  {request.responseComment && <em>{request.responseComment}</em>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Badges row */}
        <div className="tm-detail-badges">
          <span className="tm-type-badge-sm" style={{ background: meta.color + '18', color: meta.color, border: `1px solid ${meta.color}40` }}>{meta.code} {meta.label}</span>
          {(task.labels || []).map(l => <span key={l} className="tm-dc-badge">{l}</span>)}
          <span className={`tm-priority-pill ${{ Low:'tm-pb-low', Medium:'tm-pb-med', High:'tm-pb-high', Urgent:'tm-pb-urg' }[task.priority] || 'tm-pb-med'}`}>{task.priority}</span>
        </div>

        {/* Status */}
        <div className="tm-detail-sec">
          <label>Status</label>
          <div className="tm-status-btns">
            {['Todo','In Progress','In Review','Done'].map(s => (
              <button key={s} className={`tm-status-btn${task.status === s ? ' act' : ''}`} onClick={() => patch(`/tasks/${task._id}/status`, { status: s })}>{s}</button>
            ))}
          </div>
        </div>

        {/* Daily progress */}
        {showProgressPanel && (
          <div className="tm-detail-sec">
            <label>Team Progress Today</label>
            <DailyBar task={task} />
            {isDataCenterProgress ? (
              <p className="tm-progress-note">Progress is calculated from Data Center records added by assignees today.</p>
            ) : (
              <div className="tm-prog-ctrl">
                <span className="tm-prog-label">My count:</span>
                <button className="tm-prog-btn" onClick={() => patch(`/tasks/${task._id}/daily-progress`, { count: Math.max(0, myCount - 1) })}>−</button>
                <span className="tm-prog-val">{myCount}</span>
                <button className="tm-prog-btn" onClick={() => patch(`/tasks/${task._id}/daily-progress`, { count: myCount + 1 })}>+</button>
              </div>
            )}
            {/* Per-user breakdown */}
            {progressRows.length > 0 && (
              <div className="tm-user-progress">
                {progressRows.map((p, i) => (
                  <div key={i} className="tm-up-row">
                    <UserAvatar user={p.user} size={24}/>
                    <span>{p.user?.fullName || 'User'}</span>
                    <span className="tm-up-count">{p.count}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Active now */}
        <div className="tm-detail-sec">
          <label>Active Now</label>
          <div className="tm-active-list">
            {(task.activeUsers || []).length === 0
              ? <span className="tm-empty-txt">No one is working right now</span>
              : (task.activeUsers || []).map((u, i) => (
                  <div key={i} className="tm-active-row">
                    <UserAvatar user={u} size={26}/><span>{u.fullName || u.email}</span><span className="tm-online-dot"/>
                  </div>
                ))
            }
          </div>
          <button className={`tm-active-toggle${isActive ? ' stop' : ' start'}`} onClick={() => patch(`/tasks/${task._id}/active`, { isActive: !isActive })}>
            <FiActivity size={12}/> {isActive ? 'Stop Working' : 'Start Working'}
          </button>
        </div>

        {/* Assignees */}
        <div className="tm-detail-sec">
          <label>Assignees</label>
          <div className="tm-av-stack" style={{ flexWrap:'wrap', gap:8 }}>
            {(task.assignees || []).map((u, i) => (
              <div key={i} style={{ display:'flex', alignItems:'center', gap:6 }}>
                <UserAvatar user={u} size={26}/><span style={{ fontSize:12, color:'#374151' }}>{u.fullName || u.email}</span>
              </div>
            ))}
            {!task.assignees?.length && <span className="tm-empty-txt">No assignees</span>}
          </div>
        </div>

        {/* Comments */}
        <div className="tm-detail-sec">
          <label>Comments ({task.comments?.length || 0})</label>
          <div className="tm-comments">
            {(task.comments || []).filter(c => !c.parentId).map(c => (
              <div key={c._id} className="tm-comment">
                <UserAvatar user={c.author} size={26}/>
                <div><strong>{c.author?.fullName}</strong><p>{c.content}</p></div>
              </div>
            ))}
          </div>
          <form className="tm-comment-form" onSubmit={handleComment}>
            <input value={newComment} onChange={e => setNewComment(e.target.value)} placeholder="Add a comment…"/>
            <button type="submit" disabled={!newComment.trim()}><FiSend size={14}/></button>
          </form>
        </div>
      </div>

      <div className="tm-detail-ft">
        <button className="tm-del-btn" onClick={handleDelete}>Delete Task</button>
      </div>
    </div>
  );
};

/* ── Main TaskManager ──────────────────────────────────── */
function TaskManager({ isWidget = false }) {
  const { currentUser } = useRole();
  const currentUserId = getId(currentUser);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [companyUsers, setCompanyUsers] = useState([]);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('All');
  const [filterStatus, setFilterStatus] = useState('All');
  const [activeSection, setActiveSection] = useState('tasks');
  const [respondingRequestId, setRespondingRequestId] = useState('');

  const fetchTasks = useCallback(async () => {
    try { const r = await api.get('/tasks'); setTasks(r.data.tasks || []); }
    catch (e) { console.error(e); } finally { setLoading(false); }
  }, []);

  const fetchUsers = useCallback(async () => {
    try { const r = await api.get('/users/company-members'); setCompanyUsers(r.data.members || r.data || []); } catch {}
  }, []);

  useEffect(() => { fetchTasks(); fetchUsers(); }, [fetchTasks, fetchUsers]);

  useEffect(() => {
    const r = () => fetchTasks();
    window.addEventListener('task:updated', r);
    window.addEventListener('dashboard:refresh', r);
    return () => { window.removeEventListener('task:updated', r); window.removeEventListener('dashboard:refresh', r); };
  }, [fetchTasks]);

  // Realtime poll every 15s for activeUsers updates
  useEffect(() => {
    const iv = setInterval(fetchTasks, 15000);
    return () => clearInterval(iv);
  }, [fetchTasks]);

  const handleTaskClick = async (task) => {
    try { const r = await api.get(`/tasks/${task._id}`); setSelectedTask(r.data); } catch {}
  };
  const openEditTask = async (task) => {
    try {
      const r = await api.get(`/tasks/${task._id}`);
      setEditingTask(r.data);
      setIsCreateOpen(true);
    } catch {
      toast.error('Could not open task editor');
    }
  };
  const handleTaskDeleteFromCard = async (task) => {
    if (!await confirm('Delete this task?')) return;
    try {
      await api.delete(`/tasks/${task._id}`);
      toast.success('Task deleted');
      if (selectedTask?._id === task._id) setSelectedTask(null);
      fetchTasks();
    } catch {
      toast.error('Failed to delete task');
    }
  };
  const handleTaskUpdated = () => { fetchTasks(); if (selectedTask) handleTaskClick(selectedTask); };
  const handleInlineAssignmentResponse = async (task, request, status, event) => {
    event.stopPropagation();
    const requestKey = `${task._id}-${request._id || getId(request.user)}-${status}`;
    setRespondingRequestId(requestKey);
    try {
      await api.patch(`/tasks/${task._id}/assignment-response`, { status });
      toast.success(status === 'accepted' ? 'Task accepted' : 'Task rejected');
      await fetchTasks();
      if (selectedTask?._id === task._id) await handleTaskClick(task);
    } catch {
      toast.error('Could not update request');
    } finally {
      setRespondingRequestId('');
    }
  };

  const filtered = tasks.filter(t => {
    if (filterType !== 'All' && t.taskType !== filterType) return false;
    if (filterStatus !== 'All' && t.status !== filterStatus) return false;
    if (search && !t.title.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const getInvitationItems = (sourceTasks) => sourceTasks
    .flatMap(task => (task.assignmentRequests || []).flatMap(request => {
      const isReceived = sameUser(request.user, currentUserId);
      const isSent = sameUser(request.requestedBy, currentUserId);
      if (!isReceived && !isSent) return [];
      return [{
        id: `${task._id}-${request._id || getId(request.user)}-${isReceived ? 'received' : 'sent'}`,
        task,
        request,
        direction: isReceived ? 'received' : 'sent',
        timestamp: request.respondedAt || request.requestedAt || task.updatedAt || task.createdAt
      }];
    }))
    .sort((a, b) => new Date(b.timestamp || 0) - new Date(a.timestamp || 0));

  const getActivityItems = (sourceTasks) => sourceTasks
    .flatMap(task => (task.activity || []).map(activity => ({
      id: `${task._id}-${activity._id || activity.createdAt || activity.action}`,
      task,
      activity,
      timestamp: activity.createdAt || task.updatedAt || task.createdAt
    })))
    .sort((a, b) => new Date(b.timestamp || 0) - new Date(a.timestamp || 0));

  const invitationItems = getInvitationItems(filtered);
  const allInvitationItems = getInvitationItems(tasks);
  const activityItems = getActivityItems(filtered);
  const allActivityItems = getActivityItems(tasks);
  const pendingReceived = allInvitationItems.filter(item => item.direction === 'received' && item.request.status === 'pending').length;
  const pendingSent = allInvitationItems.filter(item => item.direction === 'sent' && item.request.status === 'pending').length;

  const stats = {
    total: tasks.length,
    requests: pendingReceived,
    pendingSent,
    invitations: pendingReceived + pendingSent,
    activity: allActivityItems.length,
    activeNow: tasks.filter(t => (t.activeUsers || []).length > 0).length,
    done: tasks.filter(t => t.status === 'Done').length,
  };

  if (loading) return <div className="tm-loading">Loading tasks…</div>;

  /* Widget mode */
  if (isWidget) {
    const widgetTasks = tasks.slice(0, 4);

    return (
      <div className="task-manager widget-mode">
        <div className="widget-header">
          <div className="widget-title-row"><h3>Tasks</h3><span className="task-total">{tasks.length}</span></div>
          <button className="create-btn-sm" onClick={() => { setEditingTask(null); setIsCreateOpen(true); }}><FiPlus size={14}/></button>
        </div>
        <div className="widget-tasks">
          {widgetTasks.map(t => {
            const progress = getProgressMeta(t);
            return (
                <div key={t._id} className="widget-task-item" data-status={t.status} onClick={() => handleTaskClick(t)}>
                <div className="widget-task-copy">
                  <div className="widget-task-line">
                    <span className="task-title">{t.title}</span>
                    <span className="widget-task-percent">{progress.percent}%</span>
                  </div>
                  <div className="widget-task-progress" aria-hidden="true">
                    <span style={{ width: `${progress.percent}%` }} />
                  </div>
                </div>
                <div className="widget-task-people" aria-label="Assigned people">
                  {(t.assignees || []).slice(0, 3).map((u, i) => (
                    <div key={u._id || i} className="widget-task-avatar">
                      <UserAvatar user={u} size={24} />
                    </div>
                  ))}
                  {(t.assignees || []).length > 3 && (
                    <span className="widget-task-more">+{t.assignees.length - 3}</span>
                  )}
                </div>
              </div>
            );
          })}
          {widgetTasks.length === 0 && (
            <div className="widget-empty-state">
              <FiActivity size={16} />
              <span>No tasks in the flow yet.</span>
            </div>
          )}
        </div>
        <CreateTaskModal isOpen={isCreateOpen} onClose={() => { setIsCreateOpen(false); setEditingTask(null); }} onTaskCreated={fetchTasks} companyUsers={companyUsers} taskToEdit={editingTask}/>
        {selectedTask && (
          <div className="noxtm-overlay" onClick={() => setSelectedTask(null)}>
            <div className="detail-modal" onClick={e => e.stopPropagation()}>
              <TaskDetailPanel task={selectedTask} onClose={() => setSelectedTask(null)} onTaskUpdated={handleTaskUpdated} companyUsers={companyUsers} currentUserId={currentUserId}/>
            </div>
          </div>
        )}
      </div>
    );
  }

  /* Full view */
  return (
    <div className="tm-root">
      {/* Header */}
      <div className="tm-header">
        <div>
          <h1 className="tm-heading">Task Manager</h1>
          <p className="tm-subheading">Requests, ownership, progress, and live task activity in one queue.</p>
        </div>
        <div className="tm-header-actions">
          <div className="tm-header-stats" aria-label="Task summary">
            {[['Total', stats.total], ['Requests', stats.requests], ['Pending sent', stats.pendingSent], ['Done', stats.done]].map(([lbl, val]) => (
              <span className="tm-header-stat" key={lbl}>
                <strong>{val}</strong>
                <em>{lbl}</em>
              </span>
            ))}
          </div>
          <button className="tm-new-btn" onClick={() => { setEditingTask(null); setIsCreateOpen(true); }}><FiPlus size={16}/> New Task</button>
        </div>
      </div>

      <Tabs value={activeSection} onValueChange={setActiveSection} className="tm-section-tabs">
        <TabsList className="tm-section-rail" aria-label="Task manager sections">
          {[
            { id: 'tasks', label: 'All Tasks', count: stats.total, icon: <FiCheck size={15} /> },
            { id: 'invitations', label: 'Invitations', count: stats.invitations, icon: <FiInbox size={15} /> },
            { id: 'activity', label: 'Activity', count: stats.activity, icon: <FiActivity size={15} /> }
          ].map(section => (
            <TabsTrigger
              key={section.id}
              value={section.id}
              className="tm-section-tab"
            >
              <span>{section.icon}{section.label}</span>
              <strong>{section.count}</strong>
            </TabsTrigger>
          ))}
        </TabsList>

        {/* Toolbar */}
        <div className="tm-toolbar">
        <div className="tm-search">
          <FiSearch size={14}/>
          <input
            placeholder={activeSection === 'activity' ? 'Search activity by task…' : activeSection === 'invitations' ? 'Search invitations by task…' : 'Search tasks…'}
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="tm-filters">
          <select value={filterType} onChange={e => setFilterType(e.target.value)} className="tm-filter-sel">
            <option value="All">All Types</option>
            {TASK_TYPES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
          </select>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="tm-filter-sel">
            {['All','Todo','In Progress','In Review','Done'].map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        </div>

        <TabsContent value="tasks" className="tm-tab-content">
          <div className="tm-cards-grid">
          {filtered.length === 0 ? (
            <div className="tm-empty">
              <span>No tasks found</span>
              <button onClick={() => { setEditingTask(null); setIsCreateOpen(true); }}>+ Create Task</button>
            </div>
          ) : filtered.map(task => (
            <TaskCard
              key={task._id}
              task={task}
              onClick={() => handleTaskClick(task)}
              onEdit={openEditTask}
              onDelete={handleTaskDeleteFromCard}
              currentUserId={currentUserId}
            />
          ))}
          </div>
        </TabsContent>

        <TabsContent value="invitations" className="tm-tab-content">
          <div className="tm-panel-list tm-invitations-list">
          {invitationItems.length === 0 ? (
            <div className="tm-empty tm-panel-empty">
              <span>No invitations found</span>
              <p>Task requests you send or receive will appear here.</p>
            </div>
          ) : invitationItems.map(({ id, task, request, direction, timestamp }) => {
            const isReceived = direction === 'received';
            const isPending = request.status === 'pending';
            const requestBaseKey = `${task._id}-${request._id || getId(request.user)}`;
            const isResponding = respondingRequestId.startsWith(requestBaseKey);

            return (
              <Card key={id} className={`tm-invite-row ${request.status} ${direction}`} onClick={() => handleTaskClick(task)}>
                <div className="tm-invite-avatar">
                  <UserAvatar user={isReceived ? request.requestedBy : request.user} size={34} />
                </div>
                <div className="tm-invite-copy">
                  <div className="tm-row-kicker">
                    {isReceived ? <FiInbox size={13}/> : <FiSend size={13}/>}
                    {isReceived ? 'Received request' : 'Sent request'}
                  </div>
                  <h3>{task.title}</h3>
                  <p>
                    {isReceived
                      ? `${getUserLabel(request.requestedBy, 'A teammate')} invited you`
                      : `Sent to ${getUserLabel(request.user, 'a teammate')}`}
                    <span>{formatTaskTime(timestamp)}</span>
                  </p>
                  {request.requestComment && <em>{request.requestComment}</em>}
                  {request.responseComment && <em>{request.responseComment}</em>}
                </div>
                <div className="tm-invite-side">
                  <span className={`tm-state-chip ${request.status}`}>{request.status}</span>
                  {isReceived && isPending && (
                    <div className="tm-inline-actions">
                      <button
                        type="button"
                        className="tm-inline-btn accept"
                        disabled={isResponding}
                        onClick={(event) => handleInlineAssignmentResponse(task, request, 'accepted', event)}
                      >
                        <FiCheck size={13}/> Accept
                      </button>
                      <button
                        type="button"
                        className="tm-inline-btn reject"
                        disabled={isResponding}
                        onClick={(event) => handleInlineAssignmentResponse(task, request, 'rejected', event)}
                      >
                        <FiX size={13}/> Reject
                      </button>
                    </div>
                  )}
                </div>
              </Card>
            );
          })}
          </div>
        </TabsContent>

        <TabsContent value="activity" className="tm-tab-content">
          <div className="tm-panel-list tm-activity-list">
          {activityItems.length === 0 ? (
            <div className="tm-empty tm-panel-empty">
              <span>No activity found</span>
              <p>Updates, comments, and assignment responses will appear here.</p>
            </div>
          ) : activityItems.map(({ id, task, activity, timestamp }) => (
            <Card key={id} className="tm-activity-row" onClick={() => handleTaskClick(task)}>
              <UserAvatar user={activity.user} size={34} />
              <div className="tm-activity-copy">
                <div className="tm-activity-line">
                  <strong>{getUserLabel(activity.user)}</strong>
                  <span>{getActivityLabel(activity.action)}</span>
                  <em>{formatTaskTime(timestamp)}</em>
                </div>
                {activity.details && <p>{activity.details}</p>}
                <small>{task.title}</small>
              </div>
            </Card>
          ))}
          </div>
        </TabsContent>
      </Tabs>

      <CreateTaskModal isOpen={isCreateOpen} onClose={() => { setIsCreateOpen(false); setEditingTask(null); }} onTaskCreated={fetchTasks} companyUsers={companyUsers} taskToEdit={editingTask}/>

      {selectedTask && (
        <div className="noxtm-overlay" onClick={() => setSelectedTask(null)}>
          <div className="tm-detail-modal" onClick={e => e.stopPropagation()}>
            <TaskDetailPanel task={selectedTask} onClose={() => setSelectedTask(null)} onTaskUpdated={handleTaskUpdated} companyUsers={companyUsers} currentUserId={currentUserId}/>
          </div>
        </div>
      )}
    </div>
  );
}

export default TaskManager;
