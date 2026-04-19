import React, { useState, useEffect, useRef, useCallback } from 'react';
import { FiPlus, FiEdit3, FiX, FiCheck, FiFileText } from 'react-icons/fi';
import api from '../config/api';
import { useRole } from '../contexts/RoleContext';
import './CompanyPolicies.css';

// ── Rich textarea with bold + bullet toolbar ────────────────────────────────
function RichTextarea({ value, onChange, rows = 18, placeholder }) {
  const ref = useRef(null);

  const applyBold = () => {
    const el = ref.current;
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const selected = value.slice(start, end);
    const newVal = value.slice(0, start) + '**' + selected + '**' + value.slice(end);
    onChange(newVal);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(start + 2, end + 2);
    });
  };

  const applyBullet = () => {
    const el = ref.current;
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;

    // Find start of first selected line
    const lineStart = value.lastIndexOf('\n', start - 1) + 1;
    // Find end of last selected line
    const lineEnd = value.indexOf('\n', end);
    const blockEnd = lineEnd === -1 ? value.length : lineEnd;

    const block = value.slice(lineStart, blockEnd);
    const lines = block.split('\n');

    // Toggle: if all lines already have bullet, remove; otherwise add
    const allBulleted = lines.every(l => l.startsWith('- '));
    const newLines = allBulleted
      ? lines.map(l => l.slice(2))
      : lines.map(l => l.startsWith('- ') ? l : '- ' + l);

    const newBlock = newLines.join('\n');
    const newVal = value.slice(0, lineStart) + newBlock + value.slice(blockEnd);
    onChange(newVal);

    requestAnimationFrame(() => {
      el.focus();
      const delta = allBulleted ? -2 : 2;
      el.setSelectionRange(start + delta, end + delta * lines.length);
    });
  };

  return (
    <div className="cp-rte-wrap">
      <div className="cp-rte-toolbar">
        <button type="button" className="cp-rte-btn" onMouseDown={e => { e.preventDefault(); applyBold(); }} title="Bold (select text first)">
          <strong>B</strong>
        </button>
        <button type="button" className="cp-rte-btn" onMouseDown={e => { e.preventDefault(); applyBullet(); }} title="Bullet list (select lines or place cursor)">
          • List
        </button>
      </div>
      <textarea
        ref={ref}
        rows={rows}
        className="cp-letter-textarea"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
      />
    </div>
  );
}

// ── Render inline: **bold** markers ─────────────────────────────────────────
function RichInline({ text }) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return <strong key={i}>{part.slice(2, -2)}</strong>;
        }
        return <span key={i}>{part}</span>;
      })}
    </>
  );
}

// ── Render text with **bold** and - bullet list support ───────────────────────
function RichText({ text }) {
  if (!text) return null;

  const lines = text.split('\n');
  const output = [];
  let bulletBuffer = [];

  const flushBullets = (key) => {
    if (bulletBuffer.length === 0) return;
    output.push(
      <ul key={`ul-${key}`} className="cp-bullet-list">
        {bulletBuffer.map((item, j) => (
          <li key={j}><RichInline text={item} /></li>
        ))}
      </ul>
    );
    bulletBuffer = [];
  };

  lines.forEach((line, i) => {
    if (line.startsWith('- ')) {
      bulletBuffer.push(line.slice(2));
    } else {
      flushBullets(i);
      output.push(<span key={i}><RichInline text={line} />{'\n'}</span>);
    }
  });
  flushBullets('end');

  return <>{output}</>;
}

// ── Signature canvas ────────────────────────────────────────────────────────
function SignaturePad({ onSigned }) {
  const canvasRef = useRef(null);
  const drawing = useRef(false);

  const pos = (e, canvas) => {
    const r = canvas.getBoundingClientRect();
    const src = e.touches ? e.touches[0] : e;
    return { x: src.clientX - r.left, y: src.clientY - r.top };
  };

  const start = (e) => {
    e.preventDefault();
    drawing.current = true;
    const c = canvasRef.current;
    const ctx = c.getContext('2d');
    const p = pos(e, c);
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
  };

  const move = (e) => {
    if (!drawing.current) return;
    e.preventDefault();
    const c = canvasRef.current;
    const ctx = c.getContext('2d');
    const p = pos(e, c);
    ctx.lineTo(p.x, p.y);
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();
    onSigned(c.toDataURL('image/png'));
  };

  const stop = () => { drawing.current = false; };

  const clear = () => {
    const c = canvasRef.current;
    c.getContext('2d').clearRect(0, 0, c.width, c.height);
    onSigned(null);
  };

  return (
    <div className="sig-wrap">
      <canvas
        ref={canvasRef}
        className="sig-canvas"
        width={460}
        height={140}
        onMouseDown={start}
        onMouseMove={move}
        onMouseUp={stop}
        onMouseLeave={stop}
        onTouchStart={start}
        onTouchMove={move}
        onTouchEnd={stop}
      />
      <button type="button" className="sig-clear-btn" onClick={clear}>Clear</button>
    </div>
  );
}

// ── Main component ───────────────────────────────────────────────────────────
function CompanyPolicies() {
  const { currentUser } = useRole();
  const canEdit =
    currentUser?.roleInCompany === 'Owner' ||
    currentUser?.role === 'Admin' ||
    currentUser?.role === 'Business Admin';

  const [policy, setPolicy] = useState(null);
  const [loading, setLoading] = useState(true);

  // Inline title editing
  const [titleEditing, setTitleEditing] = useState(false);
  const [titleDraft, setTitleDraft] = useState('');
  const [savingTitle, setSavingTitle] = useState(false);
  const titleInputRef = useRef(null);

  // Create modal
  const [showCreate, setShowCreate] = useState(false);
  const [createTitle, setCreateTitle] = useState('Company Policies');
  const [createContent, setCreateContent] = useState('');
  const [creating, setCreating] = useState(false);

  // Append modal
  const [showAppend, setShowAppend] = useState(false);
  const [appendContent, setAppendContent] = useState('');
  const [appending, setAppending] = useState(false);

  // Edit block modal
  const [editBlockIndex, setEditBlockIndex] = useState(null);
  const [editBlockContent, setEditBlockContent] = useState('');
  const [editingBlock, setEditingBlock] = useState(false);

  // Accept modal
  const [showAccept, setShowAccept] = useState(false);
  const [signature, setSignature] = useState(null);
  const [accepting, setAccepting] = useState(false);

  // Owner signature modal
  const [showOwnerSig, setShowOwnerSig] = useState(false);
  const [ownerSig, setOwnerSig] = useState(null);
  const [savingOwnerSig, setSavingOwnerSig] = useState(false);

  const fetchPolicy = useCallback(async () => {
    try {
      const res = await api.get('/company-policies');
      if (res.data.success) {
        setPolicy(res.data.policy);
        if (res.data.policy) setTitleDraft(res.data.policy.title || 'Company Policies');
      }
    } catch (err) {
      console.error('Error fetching policy:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchPolicy(); }, [fetchPolicy]);

  useEffect(() => {
    if (titleEditing && titleInputRef.current) {
      titleInputRef.current.focus();
      titleInputRef.current.select();
    }
  }, [titleEditing]);

  const handleTitleSave = async () => {
    const trimmed = titleDraft.trim();
    if (!trimmed || trimmed === policy.title) {
      setTitleEditing(false);
      setTitleDraft(policy.title);
      return;
    }
    setSavingTitle(true);
    try {
      await api.patch(`/company-policies/${policy._id}/title`, { title: trimmed });
      setPolicy(prev => ({ ...prev, title: trimmed }));
      setTitleEditing(false);
    } catch (err) {
      console.error('Error saving title:', err);
      setTitleDraft(policy.title);
      setTitleEditing(false);
    } finally {
      setSavingTitle(false);
    }
  };

  const handleTitleKeyDown = (e) => {
    if (e.key === 'Enter') handleTitleSave();
    if (e.key === 'Escape') {
      setTitleEditing(false);
      setTitleDraft(policy.title);
    }
  };

  const handleCreate = async () => {
    if (!createContent.trim()) return;
    setCreating(true);
    try {
      await api.post('/company-policies', { title: createTitle, content: createContent });
      setShowCreate(false);
      setCreateContent('');
      setCreateTitle('Company Policies');
      fetchPolicy();
    } catch (err) {
      console.error('Error creating policy:', err);
    } finally {
      setCreating(false);
    }
  };

  const handleAppend = async () => {
    if (!appendContent.trim() || !policy) return;
    setAppending(true);
    try {
      await api.post(`/company-policies/${policy._id}/append`, { content: appendContent });
      setShowAppend(false);
      setAppendContent('');
      fetchPolicy();
    } catch (err) {
      console.error('Error appending to policy:', err);
    } finally {
      setAppending(false);
    }
  };

  const handleEditBlock = async () => {
    if (!editBlockContent.trim() || !policy || editBlockIndex === null) return;
    setEditingBlock(true);
    try {
      await api.patch(`/company-policies/${policy._id}/blocks/${editBlockIndex}`, { content: editBlockContent });
      setEditBlockIndex(null);
      setEditBlockContent('');
      fetchPolicy();
    } catch (err) {
      console.error('Error editing block:', err);
    } finally {
      setEditingBlock(false);
    }
  };

  const handleAccept = async () => {
    if (!signature || !policy) return;
    setAccepting(true);
    try {
      await api.post(`/company-policies/${policy._id}/acknowledge`, { signatureImage: signature });
      setShowAccept(false);
      fetchPolicy();
    } catch (err) {
      console.error('Error accepting policy:', err);
    } finally {
      setAccepting(false);
    }
  };

  const handleOwnerSig = async () => {
    if (!ownerSig || !policy) return;
    setSavingOwnerSig(true);
    try {
      const res = await api.patch(`/company-policies/${policy._id}/owner-signature`, { signatureImage: ownerSig });
      setPolicy(prev => ({
        ...prev,
        ownerSignatureImage: res.data.ownerSignatureImage,
        ownerSignedAt: res.data.ownerSignedAt,
        ownerAcknowledgment: prev.ownerAcknowledgment
          ? { ...prev.ownerAcknowledgment, signatureImage: res.data.ownerSignatureImage, acknowledgedAt: res.data.ownerSignedAt }
          : null
      }));
      setShowOwnerSig(false);
      setOwnerSig(null);
    } catch (err) {
      console.error('Error saving owner signature:', err);
    } finally {
      setSavingOwnerSig(false);
    }
  };

  const fmtDate = (d) =>
    new Date(d).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

  // ── Loading ──────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="cp-wrap">
        <div className="cp-loading-state">
          <div className="cp-loading-line" style={{ width: 260 }} />
          <div className="cp-loading-line" style={{ width: '100%' }} />
          <div className="cp-loading-line" style={{ width: '85%' }} />
          <div className="cp-loading-line" style={{ width: '90%' }} />
        </div>
      </div>
    );
  }

  // ── No policy ────────────────────────────────────────────────────────────
  if (!policy) {
    return (
      <div className="cp-wrap">
        <div className="cp-empty-state">
          <div className="cp-empty-icon-wrap">
            <FiFileText size={32} />
          </div>
          <h3>No Company Policy</h3>
          {canEdit ? (
            <>
              <p>Create your company policy document to share with your team.</p>
              <button className="cp-btn-primary" onClick={() => setShowCreate(true)}>
                <FiPlus size={15} /> Create Policy
              </button>
            </>
          ) : (
            <p>Your company has not created a policy document yet.</p>
          )}
        </div>

        {showCreate && (
          <div className="cp-overlay" onClick={() => setShowCreate(false)}>
            <div className="cp-modal" onClick={e => e.stopPropagation()}>
              <div className="cp-modal-head">
                <h2>Create Company Policy</h2>
                <button onClick={() => setShowCreate(false)}><FiX size={17} /></button>
              </div>
              <div className="cp-modal-body">
                <div className="cp-fg">
                  <label>Policy Title</label>
                  <input
                    type="text"
                    value={createTitle}
                    onChange={e => setCreateTitle(e.target.value)}
                    placeholder="Company Policies"
                  />
                </div>
                <div className="cp-fg">
                  <label>Policy Content</label>
                  <RichTextarea
                    value={createContent}
                    onChange={setCreateContent}
                    placeholder="Write your company policy here..."
                  />
                </div>
              </div>
              <div className="cp-modal-foot">
                <button className="cp-btn-sec" onClick={() => setShowCreate(false)}>Cancel</button>
                <button
                  className="cp-btn-primary"
                  onClick={handleCreate}
                  disabled={creating || !createContent.trim()}
                >
                  {creating ? 'Saving...' : 'Save Policy'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ── Policy exists ────────────────────────────────────────────────────────
  const isAccepted = policy.isAcknowledged;

  return (
    <div className="cp-wrap">
      <div className="cp-letter">
        {/* Letter header */}
        <div className="cp-letter-header">
          {titleEditing ? (
            <div className="cp-title-edit-wrap">
              <input
                ref={titleInputRef}
                className="cp-title-input"
                value={titleDraft}
                onChange={e => setTitleDraft(e.target.value)}
                onBlur={handleTitleSave}
                onKeyDown={handleTitleKeyDown}
                disabled={savingTitle}
                maxLength={200}
              />
            </div>
          ) : (
            <div className="cp-title-display-wrap">
              <h1>{policy.title || 'Company Policies'}</h1>
              {canEdit && (
                <button
                  className="cp-title-edit-btn"
                  onClick={() => {
                    setTitleDraft(policy.title || 'Company Policies');
                    setTitleEditing(true);
                  }}
                  title="Edit title"
                >
                  <FiEdit3 size={15} />
                </button>
              )}
            </div>
          )}
        </div>

        {/* Content blocks */}
        <div className="cp-letter-body">
          {(policy.blocks || []).map((block, i) => (
            <div key={i} className="cp-block">
              <div className="cp-block-date-row">
                <span>{fmtDate(block.date)}</span>
                {canEdit && (
                  <button
                    className="cp-block-edit-btn"
                    title="Edit this block"
                    onClick={() => {
                      setEditBlockIndex(i);
                      setEditBlockContent(block.content);
                    }}
                  >
                    <FiEdit3 size={12} />
                  </button>
                )}
              </div>
              <div className="cp-block-text"><RichText text={block.content} /></div>
            </div>
          ))}
        </div>

        {/* Acknowledgement & Agreement section */}
        <div className="cp-ack-section">
          <div className="cp-ack-title">ACKNOWLEDGEMENT &amp; AGREEMENT</div>
          <p className="cp-ack-body">
            I, the undersigned, acknowledge that I have received, read, and understood the Noxtm Studio Official Company Policies.
            I understand that adherence to these policies is a condition of my continued employment or contract with Noxtm Studio.
            I agree that any violation of these terms may result in disciplinary action, including immediate termination and potential legal liability.
          </p>

          <div className="cp-ack-sigrow">
            {/* Employee */}
            <div className="cp-ack-sigblock">
              <div className="cp-ack-sig-label">Employee / Contractor Signature</div>
              <div className="cp-ack-sig-box">
                {policy.userAcknowledgment?.signatureImage
                  ? <img src={policy.userAcknowledgment.signatureImage} alt="Employee signature" className="cp-ack-sig-img" />
                  : <span className="cp-ack-sig-placeholder">—</span>}
              </div>
              <div className="cp-ack-field">
                <span className="cp-ack-field-label">Printed Name:</span>
                <span className="cp-ack-field-val">{policy.userAcknowledgment?.fullName || '___________________________'}</span>
              </div>
              <div className="cp-ack-field">
                <span className="cp-ack-field-label">Date:</span>
                <span className="cp-ack-field-val">
                  {policy.userAcknowledgment?.acknowledgedAt ? fmtDate(policy.userAcknowledgment.acknowledgedAt) : '___________________________'}
                </span>
              </div>
            </div>

            {/* Owner */}
            <div className="cp-ack-sigblock">
              <div className="cp-ack-sig-label">For Noxtm Studio (Authorized Signatory)</div>
              <div className="cp-ack-sig-box">
                {(policy.ownerAcknowledgment?.signatureImage || policy.ownerSignatureImage)
                  ? <img src={policy.ownerAcknowledgment?.signatureImage || policy.ownerSignatureImage} alt="Owner signature" className="cp-ack-sig-img" />
                  : canEdit
                    ? <button className="cp-ack-sign-btn" onClick={() => setShowOwnerSig(true)}>+ Add Signature</button>
                    : <span className="cp-ack-sig-placeholder">—</span>}
              </div>
              {(policy.ownerAcknowledgment?.signatureImage || policy.ownerSignatureImage) && canEdit && (
                <button className="cp-ack-resign-btn" onClick={() => setShowOwnerSig(true)}>Re-sign</button>
              )}
              <div className="cp-ack-field">
                <span className="cp-ack-field-label">Printed Name:</span>
                <span className="cp-ack-field-val">{policy.ownerAcknowledgment?.fullName || 'Rajat Panwar'}</span>
              </div>
              <div className="cp-ack-field">
                <span className="cp-ack-field-label">Title:</span>
                <span className="cp-ack-field-val">Owner / Founder</span>
              </div>
              <div className="cp-ack-field">
                <span className="cp-ack-field-label">Date:</span>
                <span className="cp-ack-field-val">
                  {(policy.ownerAcknowledgment?.acknowledgedAt || policy.ownerSignedAt)
                    ? fmtDate(policy.ownerAcknowledgment?.acknowledgedAt || policy.ownerSignedAt)
                    : '___________________________'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="cp-letter-footer">
          {canEdit ? (
            <button className="cp-btn-primary" onClick={() => setShowAppend(true)}>
              <FiEdit3 size={14} /> Edit / Add More
            </button>
          ) : !isAccepted ? (
            <button className="cp-btn-accept" onClick={() => setShowAccept(true)}>
              <FiCheck size={14} /> Accept Company Policy
            </button>
          ) : (
            <div className="cp-accepted-tag">
              <FiCheck size={14} /> You have accepted this policy
            </div>
          )}
        </div>
      </div>

      {/* ── Edit block modal ── */}
      {editBlockIndex !== null && (
        <div className="cp-overlay" onClick={() => setEditBlockIndex(null)}>
          <div className="cp-modal" onClick={e => e.stopPropagation()}>
            <div className="cp-modal-head">
              <h2>Edit Policy Block</h2>
              <button onClick={() => setEditBlockIndex(null)}><FiX size={17} /></button>
            </div>
            <div className="cp-modal-body">
              <p className="cp-note">You are editing an existing block. The date will remain unchanged.</p>
              <RichTextarea
                value={editBlockContent}
                onChange={setEditBlockContent}
                placeholder="Edit block content..."
              />
            </div>
            <div className="cp-modal-foot">
              <button className="cp-btn-sec" onClick={() => setEditBlockIndex(null)}>Cancel</button>
              <button
                className="cp-btn-primary"
                onClick={handleEditBlock}
                disabled={editingBlock || !editBlockContent.trim()}
              >
                {editingBlock ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Append modal ── */}
      {showAppend && (
        <div className="cp-overlay" onClick={() => setShowAppend(false)}>
          <div className="cp-modal" onClick={e => e.stopPropagation()}>
            <div className="cp-modal-head">
              <h2>Add to Policy</h2>
              <button onClick={() => setShowAppend(false)}><FiX size={17} /></button>
            </div>
            <div className="cp-modal-body">
              <p className="cp-note">New content will be appended with today's date. Existing content stays unchanged.</p>
              <RichTextarea
                value={appendContent}
                onChange={setAppendContent}
                placeholder="Continue the policy..."
              />
            </div>
            <div className="cp-modal-foot">
              <button className="cp-btn-sec" onClick={() => setShowAppend(false)}>Cancel</button>
              <button
                className="cp-btn-primary"
                onClick={handleAppend}
                disabled={appending || !appendContent.trim()}
              >
                {appending ? 'Adding...' : 'Add to Policy'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Owner signature modal ── */}
      {showOwnerSig && (
        <div className="cp-overlay" onClick={() => setShowOwnerSig(false)}>
          <div className="cp-modal cp-modal-sm" onClick={e => e.stopPropagation()}>
            <div className="cp-modal-head">
              <h2>Owner Signature</h2>
              <button onClick={() => setShowOwnerSig(false)}><FiX size={17} /></button>
            </div>
            <div className="cp-modal-body">
              <p className="cp-note">Sign as Rajat Panwar — Owner / Founder</p>
              <div className="cp-sig-label">Draw your signature</div>
              <SignaturePad onSigned={setOwnerSig} />
            </div>
            <div className="cp-modal-foot">
              <button className="cp-btn-sec" onClick={() => setShowOwnerSig(false)}>Cancel</button>
              <button
                className="cp-btn-primary"
                onClick={handleOwnerSig}
                disabled={!ownerSig || savingOwnerSig}
              >
                <FiCheck size={14} /> {savingOwnerSig ? 'Saving...' : 'Save Signature'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Accept modal ── */}
      {showAccept && (
        <div className="cp-overlay" onClick={() => setShowAccept(false)}>
          <div className="cp-modal cp-modal-sm" onClick={e => e.stopPropagation()}>
            <div className="cp-modal-head">
              <h2>Accept Company Policy</h2>
              <button onClick={() => setShowAccept(false)}><FiX size={17} /></button>
            </div>
            <div className="cp-modal-body">
              <p className="cp-note">
                By signing below, you confirm that you have read and agree to the Company Policy.
              </p>
              <div className="cp-sig-label">Draw your signature</div>
              <SignaturePad onSigned={setSignature} />
            </div>
            <div className="cp-modal-foot">
              <button className="cp-btn-sec" onClick={() => setShowAccept(false)}>Cancel</button>
              <button
                className="cp-btn-accept"
                onClick={handleAccept}
                disabled={!signature || accepting}
              >
                <FiCheck size={14} /> {accepting ? 'Accepting...' : 'I Accept'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default CompanyPolicies;
