// Letter Management — full flow: templates, issue (wizard + signature), issued letters
import React, { useState, useEffect, useCallback, useRef } from 'react';
import api from '../config/api';

/* ── Palette ── */
const BLK = '#111';
const BLUE = '#2563eb';
const BORDER = '#F0F0F0';
const MUTED = '#9CA3AF';
const FONT = 'Inter,-apple-system,sans-serif';

/* ── Category config ── */
const CAT_CFG = {
  offer:       { label: 'Offer Letter',      color: '#16A34A', bg: '#F0FDF4', border: '#BBF7D0' },
  employment:  { label: 'Employment Cert.',  color: '#2563eb', bg: '#EFF6FF', border: '#BFDBFE' },
  appointment: { label: 'Appointment',       color: '#7C3AED', bg: '#F5F3FF', border: '#DDD6FE' },
  promotion:   { label: 'Promotion',         color: '#D97706', bg: '#FFFBEB', border: '#FDE68A' },
  salary:      { label: 'Salary Revision',   color: '#0891B2', bg: '#ECFEFF', border: '#A5F3FC' },
  warning:     { label: 'Warning',           color: '#DC2626', bg: '#FEF2F2', border: '#FECACA' },
  termination: { label: 'Termination',       color: '#7F1D1D', bg: '#FEF2F2', border: '#FECACA' },
  experience:  { label: 'Experience / Relieving', color: '#374151', bg: '#F3F4F6', border: '#E5E7EB' },
  noc:         { label: 'NOC',               color: '#065F46', bg: '#ECFDF5', border: '#A7F3D0' },
  internship:  { label: 'Internship',        color: '#9D174D', bg: '#FDF2F8', border: '#FBCFE8' },
  custom:      { label: 'Custom',            color: '#6B7280', bg: '#F9FAFB', border: '#E5E7EB' },
};
const catMeta = (c) => CAT_CFG[c] || CAT_CFG.custom;

const STATUS_CFG = {
  issued:  { label: 'Issued',  color: '#16A34A', bg: '#F0FDF4' },
  viewed:  { label: 'Viewed',  color: '#2563eb', bg: '#EFF6FF' },
  revoked: { label: 'Revoked', color: '#DC2626', bg: '#FEF2F2' },
};

/* ── Built-in templates ── */
const BUILTINS = [
  {
    id: 'bi-offer', name: 'Offer Letter', category: 'offer',
    subject: 'Offer of Employment – {{jobTitle}} at {{companyName}}',
    variables: ['employeeName','jobTitle','department','companyName','joiningDate','grossMonthlySalary','annualCTC','probationPeriod','workLocation','reportingManager','acceptanceDeadline','companyAddress'],
    content: `Dear {{employeeName}},

We are pleased to offer you the position of {{jobTitle}} in the {{department}} department at {{companyName}}, effective {{joiningDate}}.

COMPENSATION & BENEFITS
• Gross Monthly Salary: {{grossMonthlySalary}}
• Annual CTC: {{annualCTC}}
• Probation Period: {{probationPeriod}}
• Work Location: {{workLocation}}
• Reporting Manager: {{reportingManager}}

TERMS & CONDITIONS
1. You will be required to maintain confidentiality of all company information.
2. During probation, either party may terminate with 7 days' written notice.
3. Post-probation, 30 days' notice is required from either party.

Please confirm your acceptance by signing and returning this letter by {{acceptanceDeadline}}.

We look forward to welcoming you to the team.

Warm regards,
HR Department
{{companyName}}
{{companyAddress}}`
  },
  {
    id: 'bi-appointment', name: 'Appointment Letter', category: 'appointment',
    subject: 'Appointment Letter – {{jobTitle}} – {{companyName}}',
    variables: ['employeeName','jobTitle','department','companyName','joiningDate','grossMonthlySalary','workLocation','companyAddress','date'],
    content: `Date: {{date}}

Dear {{employeeName}},

We are pleased to appoint you as {{jobTitle}} in the {{department}} department at {{companyName}}, with effect from {{joiningDate}}.

Your appointment is subject to the following terms:
• Designation: {{jobTitle}}
• Department: {{department}}
• Location: {{workLocation}}
• Gross Monthly Salary: {{grossMonthlySalary}}

You are required to complete all formalities before or on your date of joining.

Please sign and return a copy of this letter as acknowledgement of acceptance.

Yours sincerely,
HR Department
{{companyName}}
{{companyAddress}}`
  },
  {
    id: 'bi-employment', name: 'Employment Confirmation', category: 'employment',
    subject: 'Confirmation of Employment – {{employeeName}}',
    variables: ['employeeName','jobTitle','department','companyName','date'],
    content: `TO WHOM IT MAY CONCERN

Date: {{date}}

This is to certify that {{employeeName}} has been employed with {{companyName}} as {{jobTitle}} in the {{department}} department.

{{employeeName}} is currently on our payroll and their employment is in good standing.

This letter is issued upon the request of the employee for the purpose of [visa / bank / personal use].

Issued on: {{date}}

Authorized Signatory
{{companyName}}`
  },
  {
    id: 'bi-salary', name: 'Salary Revision Letter', category: 'salary',
    subject: 'Salary Revision – {{employeeName}}',
    variables: ['employeeName','jobTitle','department','companyName','date','newSalary','effectiveDate'],
    content: `Date: {{date}}

Dear {{employeeName}},

We are pleased to inform you that, in recognition of your performance and contribution, your salary has been revised with effect from {{effectiveDate}}.

REVISED COMPENSATION
• Designation: {{jobTitle}}
• Department: {{department}}
• Revised Gross Monthly Salary: {{newSalary}}

This revision reflects our appreciation of your continued efforts and commitment to {{companyName}}.

Please sign and return a copy of this letter as acknowledgement.

Regards,
HR Department
{{companyName}}`
  },
  {
    id: 'bi-promotion', name: 'Promotion Letter', category: 'promotion',
    subject: 'Congratulations on Your Promotion – {{employeeName}}',
    variables: ['employeeName','jobTitle','department','companyName','date','newDesignation','newSalary','effectiveDate'],
    content: `Date: {{date}}

Dear {{employeeName}},

We are delighted to inform you that, in recognition of your outstanding performance, you have been promoted to {{newDesignation}} in the {{department}} department, effective {{effectiveDate}}.

REVISED TERMS
• New Designation: {{newDesignation}}
• New Gross Monthly Salary: {{newSalary}}

This promotion reflects our confidence in your abilities. We look forward to your continued growth.

Congratulations!

HR Department
{{companyName}}`
  },
  {
    id: 'bi-experience', name: 'Experience / Relieving Letter', category: 'experience',
    subject: 'Experience Certificate – {{employeeName}}',
    variables: ['employeeName','jobTitle','department','companyName','date','joiningDate','lastWorkingDate'],
    content: `TO WHOM IT MAY CONCERN

Date: {{date}}

This is to certify that {{employeeName}} was employed with {{companyName}} as {{jobTitle}} in the {{department}} department from {{joiningDate}} to {{lastWorkingDate}}.

During their tenure, {{employeeName}} demonstrated excellent professional skills, integrity, and a strong work ethic.

We thank {{employeeName}} for their valuable contribution and wish them success in all future endeavors.

This letter is issued in good faith at the request of the employee.

Sincerely,
HR Department
{{companyName}}`
  },
  {
    id: 'bi-noc', name: 'NOC Letter', category: 'noc',
    subject: 'No Objection Certificate – {{employeeName}}',
    variables: ['employeeName','jobTitle','department','companyName','date','nocPurpose'],
    content: `TO WHOM IT MAY CONCERN

Date: {{date}}

This is to certify that {{employeeName}}, currently employed as {{jobTitle}} in the {{department}} department at {{companyName}}, has applied for {{nocPurpose}}.

We have no objection to their pursuing the said purpose. This certificate does not affect their employment status with us.

This NOC is issued in good faith at the request of the employee.

Authorized Signatory
{{companyName}}`
  },
  {
    id: 'bi-warning', name: 'Warning Letter', category: 'warning',
    subject: 'Warning Letter – {{employeeName}}',
    variables: ['employeeName','jobTitle','department','companyName','date'],
    content: `CONFIDENTIAL

Date: {{date}}

To,
{{employeeName}}
{{jobTitle}}, {{department}}

Subject: Written Warning

Dear {{employeeName}},

This letter serves as an official written warning regarding [describe incident in detail].

This behavior is in violation of {{companyName}}'s [policy name]. A recurrence may result in further disciplinary action, up to and including termination.

You are required to acknowledge receipt of this letter by signing below.

Regards,
HR Department
{{companyName}}

__________________________
Employee Signature & Date`
  },
  {
    id: 'bi-internship', name: 'Internship Completion', category: 'internship',
    subject: 'Internship Completion Certificate – {{employeeName}}',
    variables: ['employeeName','department','companyName','date','internshipStart','internshipEnd','projectTitle'],
    content: `TO WHOM IT MAY CONCERN

Date: {{date}}

This is to certify that {{employeeName}} has successfully completed an internship with {{companyName}} in the {{department}} department from {{internshipStart}} to {{internshipEnd}}.

During the internship, {{employeeName}} worked on {{projectTitle}} and demonstrated initiative, learning ability, and professionalism.

We wish {{employeeName}} all the best in their future endeavors.

HR Department
{{companyName}}`
  },
  {
    id: 'bi-termination', name: 'Termination Letter', category: 'termination',
    subject: 'Termination of Employment – {{employeeName}}',
    variables: ['employeeName','jobTitle','department','companyName','date','terminationDate','reason'],
    content: `CONFIDENTIAL

Date: {{date}}

To,
{{employeeName}}
{{jobTitle}}, {{department}}

Dear {{employeeName}},

We regret to inform you that your employment with {{companyName}} is being terminated effective {{terminationDate}}.

Reason: {{reason}}

Please return all company property by your last working day. Your final settlement will be processed as per company policy.

This decision is final.

HR Department
{{companyName}}`
  },
];

const VAR_LABELS = {
  employeeName:'Employee name', employeeEmail:'Employee email', department:'Department',
  jobTitle:'Job title', companyName:'Company name', companyEmail:'Company email',
  companyPhone:'Company phone', companyWebsite:'Company website', companyAddress:'Company address',
  date:'Letter date', year:'Year', joiningDate:'Joining date', lastWorkingDate:'Last working date',
  workLocation:'Work location', reportingManager:'Reporting manager',
  grossMonthlySalary:'Gross monthly salary', annualCTC:'Annual CTC', newSalary:'Revised salary',
  probationPeriod:'Probation period', acceptanceDeadline:'Acceptance deadline',
  effectiveDate:'Effective date', newDesignation:'New designation',
  internshipStart:'Internship start', internshipEnd:'Internship end', projectTitle:'Project / task',
  nocPurpose:'NOC purpose', terminationDate:'Termination date', reason:'Reason',
  address:'Address', city:'City', state:'State', country:'Country', phoneNumber:'Phone number',
};

/* ── Helpers ── */
const fmt = (d) => d ? new Date(d).toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric' }) : '—';
const initials = (s='') => s.split(' ').map(w=>w[0]||'').join('').slice(0,2).toUpperCase() || '?';
const ACOLORS = ['#111827','#1d4ed8','#7c3aed','#059669','#b45309','#dc2626'];
const acolor = (s='') => ACOLORS[(s.charCodeAt(0)||0) % ACOLORS.length];

function Avatar({ name='', src, size=28 }) {
  if (src) return <img src={src} alt={name} style={{ width:size, height:size, borderRadius:'50%', objectFit:'cover', flexShrink:0 }} />;
  return (
    <div style={{ width:size, height:size, borderRadius:'50%', background:acolor(name), color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', fontSize:size*0.38, fontWeight:700, flexShrink:0, letterSpacing:0 }}>
      {initials(name)}
    </div>
  );
}

function CatBadge({ cat }) {
  const m = catMeta(cat);
  return <span style={{ background:m.bg, color:m.color, border:`1px solid ${m.border}`, borderRadius:5, padding:'2px 8px', fontSize:11, fontWeight:600 }}>{m.label}</span>;
}

function StatusBadge({ status }) {
  const s = STATUS_CFG[status] || STATUS_CFG.issued;
  return <span style={{ background:s.bg, color:s.color, borderRadius:5, padding:'2px 8px', fontSize:11, fontWeight:600 }}>{s.label}</span>;
}

/* ── Signature Pad (canvas) ── */
function SignaturePad({ onResult }) {
  const canvasRef = useRef(null);
  const drawing = useRef(false);
  const [hasSig, setHasSig] = useState(false);

  const getPos = (e, canvas) => {
    const r = canvas.getBoundingClientRect();
    if (e.touches) return { x: e.touches[0].clientX - r.left, y: e.touches[0].clientY - r.top };
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };

  const start = (e) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const p = getPos(e, canvas);
    ctx.beginPath(); ctx.moveTo(p.x, p.y);
    drawing.current = true;
  };

  const move = (e) => {
    e.preventDefault();
    if (!drawing.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const p = getPos(e, canvas);
    ctx.lineWidth = 2.5; ctx.lineCap = 'round'; ctx.strokeStyle = BLK;
    ctx.lineTo(p.x, p.y); ctx.stroke();
    setHasSig(true);
  };

  const stop = (e) => {
    e.preventDefault();
    drawing.current = false;
    if (hasSig) onResult(canvasRef.current.toDataURL());
  };

  const clear = () => {
    const canvas = canvasRef.current;
    canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
    setHasSig(false);
    onResult(null);
  };

  return (
    <div>
      <canvas ref={canvasRef} width={420} height={110}
        style={{ border:`1px solid ${BORDER}`, borderRadius:8, cursor:'crosshair', display:'block', touchAction:'none', background:'#FAFAFA' }}
        onMouseDown={start} onMouseMove={move} onMouseUp={stop} onMouseLeave={stop}
        onTouchStart={start} onTouchMove={move} onTouchEnd={stop}
      />
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginTop:6 }}>
        <span style={{ fontSize:11, color:MUTED }}>Draw your signature above</span>
        <button onClick={clear} style={{ fontSize:11, color:MUTED, background:'none', border:'none', cursor:'pointer', textDecoration:'underline' }}>Clear</button>
      </div>
    </div>
  );
}

/* ── Letter Preview ── */
function LetterPreview({ letter, compact=false }) {
  if (!letter) return null;
  const pad = compact ? '18px 20px' : '28px 32px';
  return (
    <div style={{ background:'#fff', border:`1px solid ${BORDER}`, borderRadius:10, fontFamily:'Georgia,serif', fontSize:compact?12:13, lineHeight:1.7, color:'#222', overflow:'hidden' }}>
      {/* Company header */}
      <div style={{ padding: compact ? '12px 16px' : '18px 24px', borderBottom:`1px solid ${BORDER}`, background:'#FAFAFA' }}>
        <div style={{ fontWeight:700, fontSize:compact?13:15, color:BLK }}>{letter.companySnapshot?.name || '—'}</div>
        <div style={{ fontSize:11, color:MUTED, marginTop:2 }}>
          {[letter.companySnapshot?.email, letter.companySnapshot?.phone, letter.companySnapshot?.website].filter(Boolean).join('  ·  ')}
        </div>
      </div>
      {/* Subject */}
      {letter.subject && (
        <div style={{ padding: compact ? '10px 16px' : '14px 24px', borderBottom:`1px solid ${BORDER}`, fontWeight:600, fontSize:compact?12:14, color:BLK }}>
          {letter.subject}
        </div>
      )}
      {/* Body */}
      <div style={{ padding:pad, whiteSpace:'pre-wrap', maxHeight: compact ? 280 : 'none', overflowY: compact ? 'auto' : 'visible' }}>
        {letter.content}
      </div>
      {/* Signature */}
      {letter.signature?.data && (
        <div style={{ padding: compact ? '10px 16px' : '16px 24px', borderTop:`1px solid ${BORDER}` }}>
          <div style={{ fontSize:11, color:MUTED, marginBottom:6, textTransform:'uppercase', letterSpacing:'0.06em' }}>Authorized Signature</div>
          {letter.signature.signatureType === 'drawn'
            ? <img src={letter.signature.data} alt="signature" style={{ maxWidth:180, maxHeight:60 }} />
            : <div style={{ fontFamily:'cursive', fontSize:compact?20:26, color:BLK, lineHeight:1 }}>{letter.signature.data}</div>
          }
          {letter.signature.signerName && <div style={{ fontSize:12, color:BLK, fontWeight:600, marginTop:6 }}>{letter.signature.signerName}</div>}
          {letter.signature.designation && <div style={{ fontSize:11, color:MUTED }}>{letter.signature.designation}</div>}
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════════════ */
export default function LetterManagement() {
  const [tab, setTab] = useState('templates');

  // Templates
  const [templates, setTemplates] = useState([]);
  const [loadingTpl, setLoadingTpl] = useState(true);
  const [catFilter, setCatFilter] = useState('');
  const [showTplModal, setShowTplModal] = useState(false);
  const [editingTpl, setEditingTpl] = useState(null);
  const [tplForm, setTplForm] = useState({ name:'', category:'custom', subject:'', content:'' });
  const [savingTpl, setSavingTpl] = useState(false);

  // Issue letter wizard
  const [issueStep, setIssueStep] = useState(1); // 1=pick template, 2=employee+vars, 3=preview+sign
  const [issueTpl, setIssueTpl] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [issueForm, setIssueForm] = useState({ employeeId:'', customValues:{} });
  const [sigMode, setSigMode] = useState('typed'); // 'typed' | 'drawn'
  const [typedSig, setTypedSig] = useState('');
  const [drawnSig, setDrawnSig] = useState(null);
  const [signerName, setSignerName] = useState('');
  const [signerDesig, setSignerDesig] = useState('');
  const [issuing, setIssuing] = useState(false);
  const [issueResult, setIssueResult] = useState(null);

  // Issued letters
  const [issued, setIssued] = useState([]);
  const [loadingIssued, setLoadingIssued] = useState(false);
  const [issuedSearch, setIssuedSearch] = useState('');
  const [issuedCatFilter, setIssuedCatFilter] = useState('');
  const [viewLetter, setViewLetter] = useState(null);

  // Fetch templates
  const fetchTemplates = useCallback(async () => {
    setLoadingTpl(true);
    try {
      const res = await api.get('/letter-templates', { params: catFilter ? { category: catFilter } : {} });
      if (res.data.success) setTemplates(res.data.templates || []);
    } catch {}
    setLoadingTpl(false);
  }, [catFilter]);

  // Fetch employees
  const fetchEmployees = useCallback(async () => {
    try {
      const res = await api.get('/hr/employees');
      if (res.data.success) setEmployees(res.data.employees || []);
    } catch {}
  }, []);

  // Fetch issued letters
  const fetchIssued = useCallback(async () => {
    setLoadingIssued(true);
    try {
      const params = {};
      if (issuedCatFilter) params.category = issuedCatFilter;
      if (issuedSearch) params.search = issuedSearch;
      const res = await api.get('/letter-templates/issued', { params });
      if (res.data.success) setIssued(res.data.letters || []);
    } catch {}
    setLoadingIssued(false);
  }, [issuedCatFilter, issuedSearch]);

  useEffect(() => { fetchTemplates(); }, [fetchTemplates]);
  useEffect(() => { fetchEmployees(); }, [fetchEmployees]);
  useEffect(() => { if (tab === 'issued') fetchIssued(); }, [tab, fetchIssued]);

  /* ── Template CRUD ── */
  const openNewTpl = () => {
    setTplForm({ name:'', category:'custom', subject:'', content:'' });
    setEditingTpl(null);
    setShowTplModal(true);
  };
  const openEditTpl = (t) => {
    setTplForm({ name:t.name, category:t.category, subject:t.subject||'', content:t.content });
    setEditingTpl(t);
    setShowTplModal(true);
  };
  const saveTpl = async () => {
    if (!tplForm.name || !tplForm.content) return;
    setSavingTpl(true);
    try {
      if (editingTpl) await api.put(`/letter-templates/${editingTpl._id}`, tplForm);
      else await api.post('/letter-templates', tplForm);
      setShowTplModal(false);
      fetchTemplates();
    } catch {}
    setSavingTpl(false);
  };
  const deleteTpl = async (id) => {
    if (!window.confirm('Delete this template?')) return;
    try { await api.delete(`/letter-templates/${id}`); fetchTemplates(); } catch {}
  };

  /* ── Issue letter ── */
  const startIssue = (tpl) => {
    setIssueTpl(tpl);
    setIssueForm({
      employeeId: '',
      customValues: {
        date: new Date().toLocaleDateString(),
        year: new Date().getFullYear().toString(),
      }
    });
    setSigMode('typed');
    setTypedSig('');
    setDrawnSig(null);
    setSignerName('');
    setSignerDesig('HR Manager');
    setIssueResult(null);
    setIssueStep(2);
    setTab('issue');
  };

  const getSignaturePayload = () => {
    const data = sigMode === 'typed' ? typedSig : drawnSig;
    if (!data) return undefined;
    return { data, signatureType: sigMode, signerName, designation: signerDesig, signedAt: new Date().toISOString() };
  };

  const handleIssue = async () => {
    if (!issueTpl) return;
    setIssuing(true);
    try {
      const payload = {
        employeeId: issueForm.employeeId || undefined,
        customValues: issueForm.customValues,
        signature: getSignaturePayload(),
      };
      let res;
      if (issueTpl._isBuiltin) {
        res = await api.post('/letter-templates/generate-built-in', {
          ...payload,
          template: { name:issueTpl.name, category:issueTpl.category, subject:issueTpl.subject, content:issueTpl.content, variables:issueTpl.variables||[] }
        });
      } else {
        res = await api.post(`/letter-templates/${issueTpl._id}/generate`, payload);
      }
      if (res.data.success) {
        setIssueResult(res.data.generated);
        setIssueStep(4);
        fetchIssued();
      }
    } catch (e) {
      alert(e.response?.data?.message || 'Failed to issue letter.');
    }
    setIssuing(false);
  };

  const copyLink = (url) => { navigator.clipboard.writeText(url).catch(()=>{}); };

  const revokeIssued = async (id) => {
    if (!window.confirm('Revoke this letter? The public link will remain but status changes.')) return;
    try { await api.put(`/letter-templates/issued/${id}/revoke`); fetchIssued(); } catch {}
  };

  /* ── Filtered builtins ── */
  const builtins = catFilter ? BUILTINS.filter(b => b.category === catFilter) : BUILTINS;
  const filteredTpls = catFilter ? templates.filter(t => t.category === catFilter) : templates;

  /* ── Issued letters filtered ── */
  const filteredIssued = issued.filter(l => {
    const s = issuedSearch.toLowerCase();
    if (!s) return true;
    return (l.recipient?.name||'').toLowerCase().includes(s) ||
           (l.templateName||'').toLowerCase().includes(s) ||
           (l.recipient?.email||'').toLowerCase().includes(s);
  });

  const cats = Object.entries(CAT_CFG).map(([k,v]) => ({ key:k, label:v.label }));

  /* ════════════════════ RENDER ════════════════════ */
  return (
    <div style={{ padding:'28px 32px', background:'#FAFAFA', minHeight:'100vh', fontFamily:FONT, color:BLK }}>

      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:24 }}>
        <div>
          <h1 style={{ fontSize:20, fontWeight:700, margin:0 }}>Letter Management</h1>
          <p style={{ fontSize:13, color:MUTED, margin:'4px 0 0' }}>Create templates, issue letters to employees, track all issued documents</p>
        </div>
        <button onClick={() => { setTab('issue'); setIssueStep(1); setIssueTpl(null); setIssueResult(null); }}
          style={{ padding:'9px 18px', borderRadius:8, border:'none', background:BLK, color:'#fff', fontSize:13, fontWeight:600, cursor:'pointer' }}>
          + Issue Letter
        </button>
      </div>

      {/* Tab bar */}
      <div style={{ display:'flex', borderBottom:`1px solid ${BORDER}`, marginBottom:24, background:'#fff', borderRadius:'12px 12px 0 0', padding:'0 8px', boxShadow:'0 1px 3px rgba(0,0,0,0.04)' }}>
        {[
          { key:'templates', label:'Templates' },
          { key:'issue',     label:'Issue Letter' },
          { key:'issued',    label:'Issued Letters' },
        ].map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{
            padding:'14px 20px', fontSize:13, fontWeight: tab===t.key ? 600 : 400,
            color: tab===t.key ? BLK : MUTED,
            background:'none', border:'none', cursor:'pointer',
            borderBottom: tab===t.key ? `2px solid ${BLK}` : '2px solid transparent',
            marginBottom:-1,
          }}>{t.label}</button>
        ))}
      </div>

      {/* ══ TEMPLATES TAB ══ */}
      {tab === 'templates' && (
        <div>
          {/* Filter + New */}
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:18, flexWrap:'wrap', gap:10 }}>
            <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
              <button onClick={()=>setCatFilter('')} style={{ padding:'5px 12px', borderRadius:20, border:`1px solid ${catFilter===''?BLK:BORDER}`, background:catFilter===''?BLK:'#fff', color:catFilter===''?'#fff':MUTED, fontSize:12, cursor:'pointer', fontWeight:catFilter===''?600:400 }}>All</button>
              {cats.map(c => (
                <button key={c.key} onClick={()=>setCatFilter(c.key)} style={{ padding:'5px 12px', borderRadius:20, border:`1px solid ${catFilter===c.key?BLK:BORDER}`, background:catFilter===c.key?BLK:'#fff', color:catFilter===c.key?'#fff':MUTED, fontSize:12, cursor:'pointer', fontWeight:catFilter===c.key?600:400 }}>{c.label}</button>
              ))}
            </div>
            <button onClick={openNewTpl} style={{ padding:'7px 16px', borderRadius:8, border:`1px solid ${BORDER}`, background:'#fff', color:BLK, fontSize:13, fontWeight:500, cursor:'pointer' }}>
              + Custom Template
            </button>
          </div>

          {/* Built-in templates */}
          <div style={{ marginBottom:32 }}>
            <div style={{ fontSize:11, fontWeight:600, color:MUTED, letterSpacing:'0.07em', textTransform:'uppercase', marginBottom:14 }}>Built-in Templates ({builtins.length})</div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))', gap:14 }}>
              {builtins.map(tpl => {
                const m = catMeta(tpl.category);
                return (
                  <div key={tpl.id} style={{ background:'#fff', border:`1px solid ${BORDER}`, borderRadius:12, padding:'16px 18px', boxShadow:'0 1px 3px rgba(0,0,0,0.04)' }}>
                    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
                      <CatBadge cat={tpl.category} />
                      <span style={{ fontSize:11, color:MUTED }}>Built-in</span>
                    </div>
                    <div style={{ fontWeight:600, fontSize:14, color:BLK, marginBottom:6 }}>{tpl.name}</div>
                    <div style={{ fontSize:12, color:MUTED, marginBottom:12, lineHeight:1.5, height:36, overflow:'hidden' }}>{tpl.subject}</div>
                    <div style={{ display:'flex', gap:8 }}>
                      <button onClick={() => startIssue({ ...tpl, _isBuiltin:true })}
                        style={{ flex:2, padding:'7px 0', borderRadius:7, border:'none', background:BLK, color:'#fff', fontSize:12, fontWeight:600, cursor:'pointer' }}>
                        Issue Letter
                      </button>
                      <button onClick={() => { setTplForm({ name:tpl.name, category:tpl.category, subject:tpl.subject, content:tpl.content }); setEditingTpl(null); setShowTplModal(true); }}
                        style={{ flex:1, padding:'7px 0', borderRadius:7, border:`1px solid ${BORDER}`, background:'#fff', fontSize:12, cursor:'pointer', color:'#374151' }}>
                        Customize
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Custom templates */}
          <div>
            <div style={{ fontSize:11, fontWeight:600, color:MUTED, letterSpacing:'0.07em', textTransform:'uppercase', marginBottom:14 }}>
              My Templates ({filteredTpls.length})
            </div>
            {loadingTpl ? (
              <div style={{ color:MUTED, fontSize:13, padding:'20px 0' }}>Loading...</div>
            ) : filteredTpls.length === 0 ? (
              <div style={{ background:'#fff', border:`1px solid ${BORDER}`, borderRadius:12, padding:'40px', textAlign:'center', color:MUTED, fontSize:13 }}>
                No custom templates yet. Customize a built-in or click "+ Custom Template".
              </div>
            ) : (
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))', gap:14 }}>
                {filteredTpls.map(t => (
                  <div key={t._id} style={{ background:'#fff', border:`1px solid ${BORDER}`, borderRadius:12, padding:'16px 18px', boxShadow:'0 1px 3px rgba(0,0,0,0.04)' }}>
                    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
                      <CatBadge cat={t.category} />
                      <div style={{ display:'flex', gap:6 }}>
                        <button onClick={() => openEditTpl(t)} style={{ background:'none', border:'none', color:MUTED, cursor:'pointer', fontSize:13 }}>✎</button>
                        <button onClick={() => deleteTpl(t._id)} style={{ background:'none', border:'none', color:'#DC2626', cursor:'pointer', fontSize:13 }}>✕</button>
                      </div>
                    </div>
                    <div style={{ fontWeight:600, fontSize:14, color:BLK, marginBottom:6 }}>{t.name}</div>
                    {t.subject && <div style={{ fontSize:12, color:MUTED, marginBottom:10, height:32, overflow:'hidden' }}>{t.subject}</div>}
                    <button onClick={() => startIssue(t)}
                      style={{ width:'100%', padding:'7px 0', borderRadius:7, border:'none', background:BLK, color:'#fff', fontSize:12, fontWeight:600, cursor:'pointer' }}>
                      Issue Letter
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══ ISSUE LETTER TAB ══ */}
      {tab === 'issue' && (
        <div>
          {/* Step indicator */}
          {issueStep < 4 && (
            <div style={{ display:'flex', alignItems:'center', gap:0, marginBottom:24 }}>
              {[
                { n:1, label:'Select Template' },
                { n:2, label:'Employee & Details' },
                { n:3, label:'Signature' },
              ].map((s, i) => (
                <React.Fragment key={s.n}>
                  <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                    <div style={{ width:28, height:28, borderRadius:'50%', background: issueStep >= s.n ? BLK : '#E5E7EB', color: issueStep >= s.n ? '#fff' : MUTED, display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, fontWeight:700 }}>{s.n}</div>
                    <span style={{ fontSize:13, color: issueStep === s.n ? BLK : MUTED, fontWeight: issueStep === s.n ? 600 : 400 }}>{s.label}</span>
                  </div>
                  {i < 2 && <div style={{ flex:1, height:1, background:'#E5E7EB', margin:'0 12px' }} />}
                </React.Fragment>
              ))}
            </div>
          )}

          {/* Step 1 — Pick template */}
          {issueStep === 1 && (
            <div>
              <div style={{ fontSize:14, fontWeight:600, color:BLK, marginBottom:16 }}>Choose a template to issue</div>
              <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginBottom:18 }}>
                <button onClick={()=>setCatFilter('')} style={{ padding:'5px 12px', borderRadius:20, border:`1px solid ${catFilter===''?BLK:BORDER}`, background:catFilter===''?BLK:'#fff', color:catFilter===''?'#fff':MUTED, fontSize:12, cursor:'pointer' }}>All</button>
                {cats.map(c => <button key={c.key} onClick={()=>setCatFilter(c.key)} style={{ padding:'5px 12px', borderRadius:20, border:`1px solid ${catFilter===c.key?BLK:BORDER}`, background:catFilter===c.key?BLK:'#fff', color:catFilter===c.key?'#fff':MUTED, fontSize:12, cursor:'pointer' }}>{c.label}</button>)}
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(260px,1fr))', gap:12 }}>
                {(catFilter ? BUILTINS.filter(b=>b.category===catFilter) : BUILTINS).map(tpl => (
                  <div key={tpl.id} onClick={() => startIssue({ ...tpl, _isBuiltin:true })}
                    style={{ background:'#fff', border:`1px solid ${BORDER}`, borderRadius:12, padding:'14px 16px', cursor:'pointer', transition:'border-color 0.15s' }}
                    onMouseEnter={e=>e.currentTarget.style.borderColor=BLK}
                    onMouseLeave={e=>e.currentTarget.style.borderColor=BORDER}>
                    <CatBadge cat={tpl.category} />
                    <div style={{ fontWeight:600, fontSize:13, color:BLK, marginTop:8 }}>{tpl.name}</div>
                    <div style={{ fontSize:11, color:MUTED, marginTop:4 }}>{(tpl.variables||[]).length} variables</div>
                  </div>
                ))}
                {(catFilter ? templates.filter(t=>t.category===catFilter) : templates).map(t => (
                  <div key={t._id} onClick={() => startIssue(t)}
                    style={{ background:'#fff', border:`1px solid ${BORDER}`, borderRadius:12, padding:'14px 16px', cursor:'pointer' }}
                    onMouseEnter={e=>e.currentTarget.style.borderColor=BLK}
                    onMouseLeave={e=>e.currentTarget.style.borderColor=BORDER}>
                    <CatBadge cat={t.category} />
                    <div style={{ fontWeight:600, fontSize:13, color:BLK, marginTop:8 }}>{t.name}</div>
                    <div style={{ fontSize:11, color:MUTED, marginTop:4 }}>Custom template</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Step 2 — Employee + Variables */}
          {issueStep === 2 && issueTpl && (
            <div style={{ display:'grid', gridTemplateColumns:'1fr 380px', gap:20, alignItems:'start' }}>
              <div style={{ background:'#fff', border:`1px solid ${BORDER}`, borderRadius:12, padding:'24px 28px' }}>
                <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:20 }}>
                  <CatBadge cat={issueTpl.category} />
                  <span style={{ fontWeight:600, fontSize:15, color:BLK }}>{issueTpl.name}</span>
                </div>

                {/* Employee picker */}
                <div style={{ marginBottom:20 }}>
                  <label style={{ fontSize:12, fontWeight:600, color:'#374151', display:'block', marginBottom:6 }}>Select Employee</label>
                  <select value={issueForm.employeeId}
                    onChange={e => {
                      const emp = employees.find(x=>x._id===e.target.value);
                      setIssueForm(prev => ({
                        ...prev, employeeId: e.target.value,
                        customValues: {
                          ...prev.customValues,
                          employeeName: emp?.fullName||'',
                          employeeEmail: emp?.email||'',
                          department: emp?.department||'',
                          jobTitle: emp?.jobTitle||'',
                          phoneNumber: emp?.phoneNumber||'',
                        }
                      }));
                    }}
                    style={{ width:'100%', height:38, border:`1px solid ${BORDER}`, borderRadius:8, padding:'0 12px', fontSize:13, outline:'none', background:'#fff' }}>
                    <option value="">— Select Employee (optional) —</option>
                    {employees.map(e => <option key={e._id} value={e._id}>{e.fullName} · {e.department||e.jobTitle||e.email}</option>)}
                  </select>
                </div>

                {/* Variables */}
                {(issueTpl.variables||[]).length > 0 && (
                  <div>
                    <label style={{ fontSize:12, fontWeight:600, color:'#374151', display:'block', marginBottom:10 }}>Letter Details</label>
                    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                      {(issueTpl.variables||[]).map(v => (
                        <div key={v}>
                          <label style={{ fontSize:11, color:MUTED, display:'block', marginBottom:4 }}>{VAR_LABELS[v]||v}</label>
                          <input
                            type={v.toLowerCase().includes('date')||v==='effectiveDate'||v==='lastWorkingDate'||v==='terminationDate'||v==='internshipStart'||v==='internshipEnd'||v==='joiningDate'?'date':'text'}
                            value={issueForm.customValues[v]||''}
                            onChange={e => setIssueForm(prev => ({ ...prev, customValues:{ ...prev.customValues, [v]:e.target.value } }))}
                            placeholder={`{{${v}}}`}
                            style={{ width:'100%', height:34, border:`1px solid ${BORDER}`, borderRadius:7, padding:'0 10px', fontSize:12, outline:'none', boxSizing:'border-box' }}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div style={{ display:'flex', gap:10, marginTop:24 }}>
                  <button onClick={() => { setIssueStep(1); setIssueTpl(null); }} style={{ padding:'9px 20px', borderRadius:8, border:`1px solid ${BORDER}`, background:'#fff', fontSize:13, cursor:'pointer', color:'#374151' }}>
                    ← Back
                  </button>
                  <button onClick={() => setIssueStep(3)} style={{ flex:1, padding:'9px 20px', borderRadius:8, border:'none', background:BLK, color:'#fff', fontSize:13, fontWeight:600, cursor:'pointer' }}>
                    Continue to Signature →
                  </button>
                </div>
              </div>

              {/* Mini preview */}
              <div>
                <div style={{ fontSize:11, fontWeight:600, color:MUTED, letterSpacing:'0.07em', textTransform:'uppercase', marginBottom:10 }}>Preview</div>
                <div style={{ fontSize:11, color:MUTED, marginBottom:8 }}>Variables will be filled with the values above</div>
                <div style={{ maxHeight:400, overflowY:'auto', borderRadius:10 }}>
                  <LetterPreview compact letter={{
                    subject: issueTpl.subject,
                    content: issueTpl.content?.substring(0, 600) + (issueTpl.content?.length > 600 ? '...' : ''),
                    companySnapshot: {},
                  }} />
                </div>
              </div>
            </div>
          )}

          {/* Step 3 — Preview + Signature */}
          {issueStep === 3 && issueTpl && (
            <div style={{ display:'grid', gridTemplateColumns:'1fr 360px', gap:20, alignItems:'start' }}>
              {/* Full preview */}
              <div>
                <div style={{ fontSize:11, fontWeight:600, color:MUTED, letterSpacing:'0.07em', textTransform:'uppercase', marginBottom:12 }}>Letter Preview</div>
                <LetterPreview letter={{
                  subject: issueTpl.subject,
                  content: issueTpl.content,
                  companySnapshot: {},
                  signature: sigMode==='typed' && typedSig
                    ? { data:typedSig, signatureType:'typed', signerName, designation:signerDesig }
                    : sigMode==='drawn' && drawnSig
                      ? { data:drawnSig, signatureType:'drawn', signerName, designation:signerDesig }
                      : null,
                }} />
              </div>

              {/* Signature panel */}
              <div style={{ background:'#fff', border:`1px solid ${BORDER}`, borderRadius:12, padding:'22px 24px' }}>
                <div style={{ fontWeight:600, fontSize:14, color:BLK, marginBottom:16 }}>Add Signature</div>

                {/* Sig type toggle */}
                <div style={{ display:'flex', background:'#F3F4F6', borderRadius:8, padding:3, marginBottom:18 }}>
                  {['typed','drawn'].map(m => (
                    <button key={m} onClick={()=>setSigMode(m)} style={{ flex:1, padding:'6px 0', borderRadius:6, border:'none', background:sigMode===m?'#fff':'transparent', color:sigMode===m?BLK:MUTED, fontSize:12, fontWeight:sigMode===m?600:400, cursor:'pointer', boxShadow:sigMode===m?'0 1px 3px rgba(0,0,0,0.1)':'none' }}>
                      {m==='typed'?'Typed':'Hand-drawn'}
                    </button>
                  ))}
                </div>

                {sigMode === 'typed' ? (
                  <div style={{ marginBottom:16 }}>
                    <label style={{ fontSize:11, color:MUTED, display:'block', marginBottom:6 }}>Type your signature</label>
                    <input value={typedSig} onChange={e=>setTypedSig(e.target.value)} placeholder="e.g. John Smith"
                      style={{ width:'100%', border:`1px solid ${BORDER}`, borderRadius:8, padding:'10px 12px', fontSize:22, fontFamily:'cursive', color:BLK, outline:'none', boxSizing:'border-box' }} />
                  </div>
                ) : (
                  <div style={{ marginBottom:16 }}>
                    <SignaturePad onResult={setDrawnSig} />
                  </div>
                )}

                <div style={{ display:'grid', gap:10, marginBottom:20 }}>
                  <div>
                    <label style={{ fontSize:11, color:MUTED, display:'block', marginBottom:4 }}>Signer Name</label>
                    <input value={signerName} onChange={e=>setSignerName(e.target.value)} placeholder="Full name"
                      style={{ width:'100%', height:34, border:`1px solid ${BORDER}`, borderRadius:7, padding:'0 10px', fontSize:13, outline:'none', boxSizing:'border-box' }} />
                  </div>
                  <div>
                    <label style={{ fontSize:11, color:MUTED, display:'block', marginBottom:4 }}>Designation</label>
                    <input value={signerDesig} onChange={e=>setSignerDesig(e.target.value)} placeholder="e.g. HR Manager"
                      style={{ width:'100%', height:34, border:`1px solid ${BORDER}`, borderRadius:7, padding:'0 10px', fontSize:13, outline:'none', boxSizing:'border-box' }} />
                  </div>
                </div>

                <div style={{ display:'flex', gap:10 }}>
                  <button onClick={()=>setIssueStep(2)} style={{ padding:'9px 16px', borderRadius:8, border:`1px solid ${BORDER}`, background:'#fff', fontSize:13, cursor:'pointer', color:'#374151' }}>← Back</button>
                  <button onClick={handleIssue} disabled={issuing}
                    style={{ flex:1, padding:'9px 0', borderRadius:8, border:'none', background:BLK, color:'#fff', fontSize:13, fontWeight:600, cursor:'pointer', opacity:issuing?0.6:1 }}>
                    {issuing ? 'Issuing...' : 'Issue Letter'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Step 4 — Success */}
          {issueStep === 4 && issueResult && (
            <div style={{ maxWidth:640, margin:'0 auto' }}>
              <div style={{ background:'#fff', border:`1px solid ${BORDER}`, borderRadius:14, padding:'32px 36px', textAlign:'center', marginBottom:20 }}>
                <div style={{ width:52, height:52, borderRadius:'50%', background:'#F0FDF4', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 16px', fontSize:24 }}>✓</div>
                <div style={{ fontWeight:700, fontSize:18, color:BLK, marginBottom:6 }}>Letter Issued Successfully</div>
                <div style={{ fontSize:13, color:MUTED, marginBottom:24 }}>
                  {issueResult.recipient?.name ? `${issueResult.recipient.name} has been notified.` : 'Letter saved to Issued Letters.'}
                </div>
                <div style={{ display:'flex', gap:10, justifyContent:'center', flexWrap:'wrap' }}>
                  <button onClick={() => copyLink(issueResult.publicUrl||`${window.location.origin}/public/letters/${issueResult.token}`)}
                    style={{ padding:'9px 18px', borderRadius:8, border:`1px solid ${BORDER}`, background:'#fff', fontSize:13, fontWeight:500, cursor:'pointer' }}>
                    Copy Public Link
                  </button>
                  <a href={issueResult.publicUrl||`${window.location.origin}/public/letters/${issueResult.token}`} target="_blank" rel="noreferrer"
                    style={{ padding:'9px 18px', borderRadius:8, border:'none', background:'#EFF6FF', color:BLUE, fontSize:13, fontWeight:600, textDecoration:'none' }}>
                    Open Letter
                  </a>
                  <button onClick={() => { setIssueStep(1); setIssueTpl(null); setIssueResult(null); }}
                    style={{ padding:'9px 18px', borderRadius:8, border:'none', background:BLK, color:'#fff', fontSize:13, fontWeight:600, cursor:'pointer' }}>
                    Issue Another
                  </button>
                </div>
              </div>
              <LetterPreview letter={issueResult} />
            </div>
          )}
        </div>
      )}

      {/* ══ ISSUED LETTERS TAB ══ */}
      {tab === 'issued' && (
        <div>
          {/* Search + filter */}
          <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:18, flexWrap:'wrap' }}>
            <div style={{ display:'flex', alignItems:'center', gap:6, background:'#fff', border:`1px solid ${BORDER}`, borderRadius:8, padding:'6px 12px', flex:1, maxWidth:280 }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={MUTED} strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
              <input value={issuedSearch} onChange={e=>setIssuedSearch(e.target.value)} placeholder="Search employee or letter..."
                style={{ border:'none', outline:'none', fontSize:13, background:'transparent', color:BLK, width:'100%', fontFamily:FONT }} />
            </div>
            <select value={issuedCatFilter} onChange={e=>setIssuedCatFilter(e.target.value)}
              style={{ height:36, border:`1px solid ${BORDER}`, borderRadius:8, padding:'0 10px', fontSize:12, outline:'none', background:'#fff', color:'#374151' }}>
              <option value="">All Categories</option>
              {cats.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
            </select>
            <button onClick={fetchIssued} style={{ height:36, padding:'0 14px', borderRadius:8, border:`1px solid ${BORDER}`, background:'#fff', fontSize:12, cursor:'pointer', color:'#374151' }}>↻ Refresh</button>
          </div>

          {loadingIssued ? (
            <div style={{ padding:'40px', textAlign:'center', color:MUTED }}>Loading...</div>
          ) : filteredIssued.length === 0 ? (
            <div style={{ background:'#fff', border:`1px solid ${BORDER}`, borderRadius:12, padding:'60px', textAlign:'center', color:MUTED }}>
              <div style={{ fontSize:14, fontWeight:600, color:'#374151', marginBottom:6 }}>No issued letters yet</div>
              <div style={{ fontSize:13 }}>Issue your first letter from the "Issue Letter" tab.</div>
            </div>
          ) : (
            <div style={{ background:'#fff', border:`1px solid ${BORDER}`, borderRadius:12, overflow:'hidden' }}>
              <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
                <thead>
                  <tr style={{ background:'#FAFAFA', borderBottom:`1px solid ${BORDER}` }}>
                    {['Employee','Letter','Category','Issued By','Date','Status','Actions'].map(h => (
                      <th key={h} style={{ padding:'11px 16px', textAlign:'left', fontSize:11, fontWeight:600, color:MUTED, letterSpacing:'0.05em', textTransform:'uppercase', whiteSpace:'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredIssued.map((l, i) => (
                    <tr key={l._id} style={{ borderBottom: i<filteredIssued.length-1 ? `1px solid #F5F5F5` : 'none', cursor:'pointer' }}
                      onMouseEnter={e=>e.currentTarget.style.background='#FAFAFA'}
                      onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                      <td style={{ padding:'11px 16px' }}>
                        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                          <Avatar name={l.recipient?.name||'?'} size={28} />
                          <div>
                            <div style={{ fontWeight:600, color:BLK, fontSize:13 }}>{l.recipient?.name||'—'}</div>
                            <div style={{ fontSize:11, color:MUTED }}>{l.recipient?.jobTitle||l.recipient?.department||l.recipient?.email||''}</div>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding:'11px 16px' }}>
                        <div style={{ fontWeight:500, color:BLK }}>{l.templateName}</div>
                        {l.subject && <div style={{ fontSize:11, color:MUTED, maxWidth:180, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{l.subject}</div>}
                      </td>
                      <td style={{ padding:'11px 16px' }}><CatBadge cat={l.category} /></td>
                      <td style={{ padding:'11px 16px' }}>
                        {l.createdBy ? (
                          <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                            <Avatar name={l.createdBy.fullName||''} size={22} />
                            <span style={{ fontSize:12, color:'#374151' }}>{l.createdBy.fullName?.split(' ')[0]}</span>
                          </div>
                        ) : '—'}
                      </td>
                      <td style={{ padding:'11px 16px', color:MUTED, fontSize:12, whiteSpace:'nowrap' }}>{fmt(l.issuedAt||l.createdAt)}</td>
                      <td style={{ padding:'11px 16px' }}><StatusBadge status={l.status} /></td>
                      <td style={{ padding:'11px 16px' }}>
                        <div style={{ display:'flex', gap:6 }}>
                          <button onClick={() => setViewLetter(l)} style={{ padding:'5px 10px', borderRadius:6, border:`1px solid ${BORDER}`, background:'#fff', fontSize:11, cursor:'pointer' }}>View</button>
                          <button onClick={() => copyLink(l.publicUrl||'')} style={{ padding:'5px 10px', borderRadius:6, border:`1px solid ${BORDER}`, background:'#fff', fontSize:11, cursor:'pointer' }}>Link</button>
                          {l.status !== 'revoked' && (
                            <button onClick={() => revokeIssued(l._id)} style={{ padding:'5px 10px', borderRadius:6, border:`1px solid #FECACA`, background:'#FEF2F2', color:'#DC2626', fontSize:11, cursor:'pointer' }}>Revoke</button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ══ TEMPLATE MODAL ══ */}
      {showTplModal && (
        <div onClick={()=>setShowTplModal(false)} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.3)', zIndex:50, display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}>
          <div onClick={e=>e.stopPropagation()} style={{ background:'#fff', borderRadius:14, width:'100%', maxWidth:700, maxHeight:'90vh', display:'flex', flexDirection:'column', boxShadow:'0 24px 60px rgba(0,0,0,0.15)', fontFamily:FONT }}>
            <div style={{ padding:'20px 24px', borderBottom:`1px solid ${BORDER}`, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
              <h3 style={{ margin:0, fontSize:16, fontWeight:700 }}>{editingTpl ? 'Edit Template' : 'New Template'}</h3>
              <button onClick={()=>setShowTplModal(false)} style={{ background:'none', border:'none', color:MUTED, cursor:'pointer', fontSize:20 }}>×</button>
            </div>
            <div style={{ flex:1, overflowY:'auto', padding:'20px 24px', display:'flex', flexDirection:'column', gap:14 }}>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
                <div>
                  <label style={{ fontSize:12, fontWeight:600, color:'#374151', display:'block', marginBottom:5 }}>Template Name *</label>
                  <input value={tplForm.name} onChange={e=>setTplForm(p=>({...p,name:e.target.value}))} placeholder="e.g. Offer Letter – Engineering"
                    style={{ width:'100%', height:36, border:`1px solid ${BORDER}`, borderRadius:8, padding:'0 12px', fontSize:13, outline:'none', boxSizing:'border-box' }} />
                </div>
                <div>
                  <label style={{ fontSize:12, fontWeight:600, color:'#374151', display:'block', marginBottom:5 }}>Category</label>
                  <select value={tplForm.category} onChange={e=>setTplForm(p=>({...p,category:e.target.value}))}
                    style={{ width:'100%', height:36, border:`1px solid ${BORDER}`, borderRadius:8, padding:'0 10px', fontSize:13, outline:'none', boxSizing:'border-box', background:'#fff' }}>
                    {cats.map(c=><option key={c.key} value={c.key}>{c.label}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label style={{ fontSize:12, fontWeight:600, color:'#374151', display:'block', marginBottom:5 }}>Subject Line</label>
                <input value={tplForm.subject} onChange={e=>setTplForm(p=>({...p,subject:e.target.value}))} placeholder="e.g. Offer of Employment – {{jobTitle}}"
                  style={{ width:'100%', height:36, border:`1px solid ${BORDER}`, borderRadius:8, padding:'0 12px', fontSize:13, outline:'none', boxSizing:'border-box' }} />
              </div>
              <div>
                <label style={{ fontSize:12, fontWeight:600, color:'#374151', display:'block', marginBottom:5 }}>Content * — use {'{{variableName}}'} for placeholders</label>
                <div style={{ display:'flex', flexWrap:'wrap', gap:4, marginBottom:8 }}>
                  {Object.keys(VAR_LABELS).slice(0,12).map(v => (
                    <button key={v} onClick={()=>setTplForm(p=>({...p,content:p.content+`{{${v}}}`}))}
                      style={{ padding:'2px 8px', borderRadius:4, border:`1px solid ${BORDER}`, background:'#F9FAFB', fontSize:10, cursor:'pointer', color:'#374151' }}>
                      {`{{${v}}}`}
                    </button>
                  ))}
                </div>
                <textarea value={tplForm.content} onChange={e=>setTplForm(p=>({...p,content:e.target.value}))}
                  placeholder="Dear {{employeeName}},..."
                  style={{ width:'100%', height:240, border:`1px solid ${BORDER}`, borderRadius:8, padding:'10px 12px', fontSize:13, outline:'none', resize:'vertical', fontFamily:FONT, boxSizing:'border-box', lineHeight:1.6 }} />
              </div>
            </div>
            <div style={{ padding:'16px 24px', borderTop:`1px solid ${BORDER}`, display:'flex', justifyContent:'flex-end', gap:10 }}>
              <button onClick={()=>setShowTplModal(false)} style={{ padding:'9px 18px', borderRadius:8, border:`1px solid ${BORDER}`, background:'#fff', fontSize:13, cursor:'pointer' }}>Cancel</button>
              <button onClick={saveTpl} disabled={savingTpl||!tplForm.name||!tplForm.content}
                style={{ padding:'9px 20px', borderRadius:8, border:'none', background:BLK, color:'#fff', fontSize:13, fontWeight:600, cursor:'pointer', opacity:(savingTpl||!tplForm.name||!tplForm.content)?0.5:1 }}>
                {savingTpl?'Saving...':editingTpl?'Update':'Save Template'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══ VIEW LETTER MODAL ══ */}
      {viewLetter && (
        <div onClick={()=>setViewLetter(null)} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.3)', zIndex:50, display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}>
          <div onClick={e=>e.stopPropagation()} style={{ background:'#FAFAFA', borderRadius:14, width:'100%', maxWidth:680, maxHeight:'92vh', display:'flex', flexDirection:'column', boxShadow:'0 24px 60px rgba(0,0,0,0.15)', fontFamily:FONT }}>
            <div style={{ padding:'16px 22px', borderBottom:`1px solid ${BORDER}`, display:'flex', alignItems:'center', justifyContent:'space-between', background:'#fff', borderRadius:'14px 14px 0 0' }}>
              <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                <Avatar name={viewLetter.recipient?.name||'?'} size={32} />
                <div>
                  <div style={{ fontWeight:600, fontSize:14, color:BLK }}>{viewLetter.recipient?.name||'—'}</div>
                  <div style={{ fontSize:11, color:MUTED }}>{viewLetter.templateName} · {fmt(viewLetter.issuedAt||viewLetter.createdAt)}</div>
                </div>
              </div>
              <div style={{ display:'flex', gap:8 }}>
                <StatusBadge status={viewLetter.status} />
                <a href={viewLetter.publicUrl||''} target="_blank" rel="noreferrer" style={{ padding:'6px 12px', borderRadius:7, border:`1px solid ${BORDER}`, background:'#fff', fontSize:12, color:BLUE, textDecoration:'none', fontWeight:500 }}>Open</a>
                <button onClick={()=>copyLink(viewLetter.publicUrl||'')} style={{ padding:'6px 12px', borderRadius:7, border:`1px solid ${BORDER}`, background:'#fff', fontSize:12, cursor:'pointer' }}>Copy Link</button>
                <button onClick={()=>setViewLetter(null)} style={{ background:'none', border:'none', color:MUTED, cursor:'pointer', fontSize:20 }}>×</button>
              </div>
            </div>
            <div style={{ flex:1, overflowY:'auto', padding:20 }}>
              <LetterPreview letter={viewLetter} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
