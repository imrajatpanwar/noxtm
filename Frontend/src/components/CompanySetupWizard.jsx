import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import setupBg from '../assets/background_setup.webp';
import './CompanySetupWizard.css';

const API_BASE = process.env.REACT_APP_API_URL ||
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:5001' : '');

/* ─── Data ─────────────────────────────────────────── */
const PLANS = [
  {
    name: 'Starter', subtitle: 'For solo entrepreneurs', label: '01 — SOLO',
    monthlyPrice: 1699, yearlyPrice: 1359, planKey: 'Starter', hasTrial: true,
    features: [
      'Access to Dashboard management',
      'Add 5 Team Access Max',
      'Free Business Mail Access',
      '10 GB Storage Access',
      'Free AI Analytics & Suggestions',
      '10+ integrations Tools',
      'Customer support',
    ],
    highlighted: [],
  },
  {
    name: 'Pro +', subtitle: 'For Small Businesses', label: '02 — POPULAR',
    monthlyPrice: 2699, yearlyPrice: 2159, planKey: 'Pro+', hasTrial: true, popular: true,
    features: [
      'Everything from Starter',
      'Add 60 Team Access Max',
      'Free 10,000 Bulk emails',
      '50GB Storage Access',
      'Request new integrations',
      'Intelligent Analytics Bot',
      'AI Analysis work report',
      'Priority customer support',
      '99.9% Up time',
    ],
    highlighted: [
      'Everything from Starter',
      'Add 60 Team Access Max',
      'Free 10,000 Bulk emails',
      '50GB Storage Access',
      'Request new integrations',
      'Intelligent Analytics Bot',
      'AI Analysis work report',
      'Priority customer support',
      '99.9% Up time',
    ],
  },
  {
    name: 'Advance', subtitle: 'For High-scale businesses', label: '03 — SCALE',
    monthlyPrice: 4699, yearlyPrice: 3759, planKey: 'Advance', hasTrial: false,
    features: [
      'Everything from Pro+',
      'Unlimited Team Access',
      'Free 50,000 Bulk Emails',
      '75GB Storage Access',
      'Advanced noxtm bot',
      'Custom Branding',
    ],
    highlighted: [],
  },
];

const TEAM_SIZES = [
  { label: 'Just me', value: '1', num: '01' },
  { label: '1–10',   value: '1-10',  num: '02' },
  { label: '11–50',  value: '11-50', num: '03' },
  { label: '51–200', value: '51-200',num: '04' },
  { label: '200+',   value: '200+',  num: '05' },
];

const STEPS = ['Name', 'Email', 'Company', 'Website', 'Team'];
/* ─── Typewriter heading ────────────────────────────── */
function TypewriterHeading({ text, trigger, onDone }) {
  const [displayed, setDisplayed] = useState('');
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!text) return;
    setDisplayed('');
    setDone(false);
    let i = 0;
    const t = setInterval(() => {
      i++;
      setDisplayed(text.slice(0, i));
      if (i >= text.length) {
        clearInterval(t);
        setDone(true);
        onDone?.();
      }
    }, 22);
    return () => clearInterval(t);
  }, [text, trigger]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <h1 className="csw-heading">
      {displayed}
      {!done && <span className="csw-cursor" aria-hidden="true">|</span>}
    </h1>
  );
}

/* ─── Fade subtext ──────────────────────────────────── */
function FadeSubtext({ text, visible }) {
  return (
    <p className={`csw-subtext ${visible ? 'csw-subtext-visible' : ''}`}>
      {text}
    </p>
  );
}

/* ─── Animated step label ───────────────────────────── */
function StepLabel({ step, total, label }) {
  return (
    <div className="csw-step-label csw-step-label-anim">
      STEP {String(step).padStart(2, '0')} / {String(total).padStart(2, '0')}
      <span className="csw-step-dash" />
      {label.toUpperCase()}
    </div>
  );
}

/* ─── Main component ────────────────────────────────── */
export default function CompanySetupWizard() {
  const navigate = useNavigate();
  const inputRef = useRef(null);

  const [step, setStep] = useState(1);
  const [billing, setBilling] = useState('monthly');
  const [submitting, setSubmitting] = useState(false);
  const [enriching, setEnriching] = useState(false);
  const [animKey, setAnimKey] = useState(0); // trigger re-mount animation on step change
  const [headingDone, setHeadingDone] = useState(false);

  // form state
  const [workspaceName, setWorkspaceName] = useState('');
  const [companyEmail, setCompanyEmail] = useState('');
  const [companyDetails, setCompanyDetails] = useState({
    industry: '', hq: '', size: '', founded: '', description: '', specialties: '', tech: '', website: '',
  });
  const [editingCompany, setEditingCompany] = useState(false);
  const [companyWebsite, setCompanyWebsite] = useState('');
  const [teamSize, setTeamSize] = useState('');
  const [doneItems, setDoneItems] = useState([]);
  const [visibleDoneItems, setVisibleDoneItems] = useState(0);
  const [selectedPlan, setSelectedPlan] = useState(null);

  const setupCompletedRef = useRef(false); // prevent redirect after setup finishes

  const [firstName, setFirstName] = useState('');
  useEffect(() => {
    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      const name = user.fullName || user.name || '';
      setFirstName(name.split(' ')[0] || 'there');
      if (user.email) setCompanyEmail(user.email);
    } catch {}
  }, []);

  // Focus input & reset animation on step change
  useEffect(() => {
    setHeadingDone(false);
    setAnimKey(k => k + 1);
    setTimeout(() => inputRef.current?.focus(), 400);
  }, [step]);

  // Stagger done items + auto-advance
  useEffect(() => {
    if (step === 6 && doneItems.length > 0) {
      setVisibleDoneItems(0);
      doneItems.forEach((_, i) => {
        setTimeout(() => setVisibleDoneItems(v => Math.max(v, i + 1)), 300 + i * 320);
      });
      const totalDelay = 300 + (doneItems.length - 1) * 320 + 1200;
      setTimeout(() => setStep(7), totalDelay);
    }
  }, [step, doneItems]);

  // Redirect only if arriving with existing company (not after just completing setup)
  useEffect(() => {
    if (setupCompletedRef.current) return;
    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      if (user.companyId) {
        const sub = user.subscription;
        const active = sub && (sub.status === 'active' || (sub.status === 'trial' && sub.endDate && new Date(sub.endDate) > new Date()));
        navigate(active ? '/dashboard' : '/pricing');
      }
    } catch {}
  }, [navigate]);

  const totalSteps = 6;
  const progress = Math.min(Math.round((step / totalSteps) * 100), 100);
  const stepLabel = step <= 5 ? STEPS[step - 1] : step === 6 ? 'DONE' : 'PLAN';

  const handleKeyDown = (e) => { if (e.key === 'Enter') advance(); };

  // Not memoized — avoids stale closure over companyDetails/companyWebsite/teamSize
  const advance = async () => {
    if (step === 1) {
      if (!workspaceName.trim()) { toast.error('Enter a workspace name'); return; }
      setStep(2);
    } else if (step === 2) {
      if (!companyEmail.trim() || !/\S+@\S+\.\S+/.test(companyEmail)) { toast.error('Enter a valid email'); return; }
      const domain = companyEmail.split('@')[1] || '';
      setCompanyWebsite(`https://${domain}`);
      setStep(3);
      // Fire enrichment in background
      setEnriching(true);
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(`${API_BASE}/api/company/enrich`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ email: companyEmail }),
        });
        const data = await res.json();
        if (res.ok && data.success && data.data) {
          const e = data.data;
          setCompanyDetails({
            industry: e.industry || 'Technology',
            hq: e.headquarters || e.companyCity || '',
            size: e.size || '',
            founded: e.foundedYear ? String(e.foundedYear) : '',
            description: e.description || '',
            specialties: Array.isArray(e.specialties) ? e.specialties.join(', ') : (e.specialties || ''),
            tech: Array.isArray(e.techStack) ? e.techStack.join(', ') : (e.techStack || ''),
            website: e.companyWebsite || `https://${domain}`,
            companyName: e.companyName || '',
            logo: e.logo || '',
          });
          if (e.companyWebsite) setCompanyWebsite(e.companyWebsite);
          if (e.companyName && !workspaceName) setWorkspaceName(e.companyName);
        }
      } catch (err) {
        console.warn('[enrich] failed:', err.message);
      } finally {
        setEnriching(false);
      }
    } else if (step === 3) {
      setStep(4);
    } else if (step === 4) {
      setStep(5);
    } else if (step === 5) {
      if (!teamSize) { toast.error('Select a team size'); return; }
      handleSubmitSetup();
    }
  };

  const handleSubmitSetup = async () => {
    setSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/api/company/setup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          companyName: workspaceName,
          companyEmail,
          companyWebsite,
          industryType: companyDetails.industry || 'technology',
          companySize: teamSize,
          description: companyDetails.description,
          companyType: 'Business',
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setupCompletedRef.current = true;
        const stored = JSON.parse(localStorage.getItem('user') || '{}');
        stored.companyId = data.companyId;
        localStorage.setItem('user', JSON.stringify(stored));
        window.dispatchEvent(new Event('userUpdated'));
        setDoneItems(['Workspace created', 'Company details saved', 'Team size noted', 'Preparing plans...']);
        setStep(6);
      } else if (data.companyId) {
        // Company already exists — proceed without error
        setupCompletedRef.current = true;
        const stored = JSON.parse(localStorage.getItem('user') || '{}');
        stored.companyId = data.companyId;
        localStorage.setItem('user', JSON.stringify(stored));
        window.dispatchEvent(new Event('userUpdated'));
        setDoneItems(['Workspace created', 'Company details saved', 'Team size noted', 'Preparing plans...']);
        setStep(6);
      } else {
        toast.error(data.message || 'Setup failed');
      }
    } catch (err) {
      console.error('Setup error:', err);
      toast.error('Setup failed. Try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const startOver = () => {
    setStep(1);
    setWorkspaceName('');
    setCompanyEmail('');
    setCompanyDetails({ industry: '', hq: '', size: '', founded: '', description: '', specialties: '', tech: '', website: '' });
    setCompanyWebsite('');
    setTeamSize('');
    setDoneItems([]);
    setSelectedPlan(null);
  };

  const handleSelectPlan = async (plan) => {
    if (plan.hasTrial) {
      try {
        setSelectedPlan(plan.planKey);
        const token = localStorage.getItem('token');
        const res = await fetch(`${API_BASE}/api/subscription/start-trial`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ plan: plan.planKey }),
        });
        const data = await res.json();
        if (res.ok && data.success) {
          const stored = JSON.parse(localStorage.getItem('user') || '{}');
          stored.subscription = data.subscription;
          localStorage.setItem('user', JSON.stringify(stored));
          window.dispatchEvent(new Event('userUpdated'));
          toast.success(`${plan.name} trial started!`);
          navigate('/dashboard');
        } else {
          toast.error(data.message || 'Failed to start trial');
          setSelectedPlan(null);
        }
      } catch {
        toast.error('Failed to start trial');
        setSelectedPlan(null);
      }
    } else {
      navigate(`/checkout?plan=${plan.planKey}&billing=${billing}`);
    }
  };

  /* heading text per step */
  const headingText = {
    1: `What would you like to name your workspace, ${firstName}?`,
    2: `Great — ${workspaceName || '...'} it is. What's the best email for your company?`,
    3: editingCompany ? 'Edit your company details.' : 'Found your company.',
    4: "Perfect. And what's your company website?",
    5: `How big is your team at ${workspaceName || 'your company'} right now?`,
    6: 'All set. Your workspace is ready.',
  };

  const subtextMap = {
    1: 'Something that represents your team or company.',
    2: "We'll use this to detect company details.",
    3: editingCompany ? "Fill in what you know — you can update this later." : "Confirm the details below, or edit anything that's off.",
    4: 'Optional, but helps us tailor your workspace.',
    5: 'Pick the closest range.',
    6: 'Taking you to pick a plan.',
  };

  return (
    <div className="csw-root" style={{ backgroundImage: `url(${setupBg})` }}>

      {/* Fixed top bar */}
      <div className="csw-topbar">
        <div className="csw-topbar-left">
          <span className="csw-logo-sq" />
          <span className="csw-brand">noxtm</span>
          <span className="csw-sep">/</span>
          <span className="csw-topbar-title">{step === 7 ? 'CHOOSE PLAN' : 'COMPANY SETUP'}</span>
        </div>
        <div className="csw-topbar-right">
          {step === 7 ? (
            <button className="csw-back-btn" onClick={() => setStep(6)}>← BACK TO SETUP</button>
          ) : (
            <>
              <span className="csw-step-count">{String(Math.min(step, 6)).padStart(2, '0')} / {String(totalSteps).padStart(2, '0')}</span>
              <button className="csw-restart-btn" onClick={startOver}>↺ START OVER</button>
            </>
          )}
        </div>
      </div>

      {step < 7 && (
        <div className="csw-center-wrap">
          {/* Nav pills — sits directly above window */}
          {step <= 5 && (
            <div className="csw-nav-pills">
              {STEPS.map((s, i) => {
                const idx = i + 1;
                const done = idx < step;
                const active = idx === step;
                return (
                  <div key={s} className={`csw-pill ${active ? 'active' : ''} ${done ? 'done' : ''}`}>
                    {done && <span className="csw-check">✓</span>}
                    {s}
                  </div>
                );
              })}
            </div>
          )}

          {/* Outer frosted-glass window */}
          <div className="csw-window">
            <div className="csw-dots">
              <span className="csw-dot csw-dot-red" />
              <span className="csw-dot csw-dot-yellow" />
              <span className="csw-dot csw-dot-green" />
            </div>

            {/* Inner white card — re-mounts on step change for slide-in */}
            <div className="csw-card csw-card-enter" key={`card-${step}-${animKey}`}>

              <StepLabel step={Math.min(step, 6)} total={totalSteps} label={stepLabel} />

              {/* ── Step content ── */}
              <div className="csw-content">

                {/* Shared heading (steps 1–6) */}
                {step <= 6 && (
                  <>
                    <TypewriterHeading
                      text={headingText[step] || ''}
                      trigger={animKey}
                      onDone={() => setHeadingDone(true)}
                    />
                    <FadeSubtext text={subtextMap[step] || ''} visible={headingDone} />
                  </>
                )}

                {/* ── Step 1: workspace name ── */}
                {step === 1 && (
                  <div className={`csw-input-row ${headingDone ? 'csw-input-enter' : ''}`}>
                    <span className="csw-arrow">→</span>
                    <input
                      ref={inputRef}
                      className="csw-input"
                      placeholder="Workspace name"
                      value={workspaceName}
                      onChange={e => setWorkspaceName(e.target.value)}
                      onKeyDown={handleKeyDown}
                    />
                  </div>
                )}

                {/* ── Step 2: company email ── */}
                {step === 2 && (
                  <div className={`csw-input-row ${headingDone ? 'csw-input-enter' : ''}`}>
                    <span className="csw-arrow">→</span>
                    <input
                      ref={inputRef}
                      className="csw-input"
                      type="email"
                      placeholder="you@company.com"
                      value={companyEmail}
                      onChange={e => setCompanyEmail(e.target.value)}
                      onKeyDown={handleKeyDown}
                    />
                  </div>
                )}

                {/* ── Step 3: company confirm / edit ── */}
                {step === 3 && headingDone && (
                  !editingCompany ? (
                    <div className="csw-company-card csw-fadein">
                      {enriching && (
                        <div className="csw-enrich-loading">
                          <span className="csw-enrich-spinner" /> Fetching company data...
                        </div>
                      )}
                      <div className="csw-company-header">
                        {companyDetails.logo
                          ? <img src={companyDetails.logo} alt="logo" className="csw-company-logo-img" onError={e => e.target.style.display='none'} />
                          : <div className="csw-company-logo">{(companyDetails.companyName || workspaceName).charAt(0).toUpperCase()}</div>
                        }
                        <div>
                          <div className="csw-company-name">{companyDetails.companyName || workspaceName}</div>
                          <div className="csw-company-domain">{companyEmail.split('@')[1] || ''}</div>
                        </div>
                        <div className="csw-detected-badge">01 · DETECTED</div>
                      </div>
                      <div className="csw-company-details">
                        {[
                          ['INDUSTRY', companyDetails.industry || '—'],
                          ['HQ',       companyDetails.hq       || '—'],
                          ['SIZE',     companyDetails.size     || '—'],
                          ['FOUNDED',  companyDetails.founded  || '—'],
                        ].map(([k, v]) => (
                          <div key={k} className="csw-detail-row"><span>{k}</span><span>{v}</span></div>
                        ))}
                      </div>
                      {companyDetails.description && <p className="csw-company-desc">{companyDetails.description}</p>}
                      <div className="csw-company-actions">
                        <button className="csw-looks-right" onClick={advance}>Looks right →</button>
                        <button className="csw-edit-details" onClick={() => setEditingCompany(true)}>Edit details</button>
                      </div>
                    </div>
                  ) : (
                    <div className="csw-edit-form csw-fadein">
                      {[
                        { label: 'Industry',     key: 'industry',    placeholder: 'e.g. Design & Software' },
                        { label: 'HQ Location',  key: 'hq',          placeholder: 'e.g. Bengaluru, IN' },
                        { label: 'Company Size', key: 'size',        placeholder: 'e.g. 11–50' },
                        { label: 'Founded',      key: 'founded',     placeholder: 'e.g. 2023' },
                        { label: 'Description',  key: 'description', placeholder: 'Brief description...' },
                      ].map(({ label, key, placeholder }) => (
                        <div key={key} className="csw-edit-field">
                          <label>{label}</label>
                          <input
                            value={companyDetails[key]}
                            onChange={e => setCompanyDetails(prev => ({ ...prev, [key]: e.target.value }))}
                            placeholder={placeholder}
                          />
                        </div>
                      ))}
                      <button className="csw-save-details" onClick={() => setEditingCompany(false)}>Save details</button>
                    </div>
                  )
                )}

                {/* ── Step 4: website ── */}
                {step === 4 && (
                  <div className={`csw-input-row ${headingDone ? 'csw-input-enter' : ''}`}>
                    <span className="csw-arrow">→</span>
                    <input
                      ref={inputRef}
                      className="csw-input"
                      type="url"
                      placeholder="https://"
                      value={companyWebsite}
                      onChange={e => setCompanyWebsite(e.target.value)}
                      onKeyDown={handleKeyDown}
                    />
                  </div>
                )}

                {/* ── Step 5: team size ── */}
                {step === 5 && headingDone && (
                  <div className="csw-team-options csw-fadein">
                    {TEAM_SIZES.map((ts, i) => (
                      <button
                        key={ts.value}
                        className={`csw-team-btn ${teamSize === ts.value ? 'selected' : ''}`}
                        style={{ animationDelay: `${i * 60}ms` }}
                        onClick={() => setTeamSize(ts.value)}
                      >
                        <span className="csw-team-num">{ts.num}</span>
                        {ts.label}
                      </button>
                    ))}
                  </div>
                )}

                {/* ── Step 6: done ── */}
                {step === 6 && (
                  <div className="csw-done-list">
                    {doneItems.map((item, i) => (
                      <div
                        key={i}
                        className={`csw-done-item ${i < visibleDoneItems ? 'csw-done-item-visible' : ''}`}
                      >
                        <span className="csw-ok">[OK]</span>
                        <span>{item}</span>
                      </div>
                    ))}
                  </div>
                )}

              </div>{/* /csw-content */}

              {/* Footer — step 3 edit mode hides button */}
              {!(step === 3 && editingCompany) && (
                <div className="csw-footer">
                  <div className="csw-footer-top">
                    <span className="csw-to-continue">→ TO CONTINUE</span>
                    {step !== 3 && step !== 6 && (
                      <button
                        className="csw-continue-btn"
                        onClick={advance}
                        disabled={submitting}
                      >
                        {submitting ? 'Setting up...' : 'Continue setup'}&nbsp;→
                      </button>
                    )}
                  </div>
                  <div className="csw-progress-track">
                    <div className="csw-progress-fill" style={{ width: `${progress}%` }} />
                  </div>
                  <span className="csw-progress-label">PROGRESS {progress}%</span>
                </div>
              )}

            </div>{/* /csw-card */}
          </div>{/* /csw-window */}
        </div>
      )}

      {/* ── Plan selection ── */}
      {step === 7 && (
        <div className="csw-plan-window csw-card-enter" key="plan">
          <div className="csw-dots">
            <span className="csw-dot csw-dot-red" />
            <span className="csw-dot csw-dot-yellow" />
            <span className="csw-dot csw-dot-green" />
          </div>
          <div className="csw-plan-inner">

            {/* Header row */}
            <div className="csw-plan-header">
              <div>
                <div className="csw-plan-step-label">STEP 06 · CHOOSE PLAN</div>
                <h1 className="csw-plan-heading">Pick a plan.</h1>
                <p className="csw-plan-sub">14-day free trial. Upgrade, downgrade, or cancel any time.</p>
              </div>
              <div className="csw-billing-toggle">
                <button className={billing === 'monthly' ? 'active' : ''} onClick={() => setBilling('monthly')}>Monthly</button>
                <button className={billing === 'yearly' ? 'active' : ''} onClick={() => setBilling('yearly')}>
                  Yearly <span className="csw-discount">-20%</span>
                </button>
              </div>
            </div>

            {/* Plans */}
            <div className="csw-plans-grid">
              {PLANS.map(plan => (
                <div key={plan.planKey} className={`csw-plan-card ${plan.popular ? 'popular' : ''}`}>
                  {plan.popular && <div className="csw-recommended">● RECOMMENDED</div>}
                  <div className="csw-plan-label">{plan.label}</div>
                  <div className="csw-plan-name">{plan.name}</div>
                  <div className="csw-plan-subtitle">{plan.subtitle}</div>
                  <div className="csw-plan-price">
                    <span className="csw-currency">₹</span>
                    <span className="csw-amount">
                      {(billing === 'monthly' ? plan.monthlyPrice : plan.yearlyPrice).toLocaleString()}
                    </span>
                    <span className="csw-per">/mo</span>
                  </div>
                  <button
                    className={`csw-plan-btn ${plan.popular ? 'dark' : ''}`}
                    onClick={() => handleSelectPlan(plan)}
                    disabled={selectedPlan === plan.planKey}
                  >
                    {selectedPlan === plan.planKey ? 'Starting...' : plan.hasTrial ? 'Start trial →' : 'Get started →'}
                  </button>
                  <ul className="csw-features">
                    {plan.features.map(f => (
                      <li key={f} className={plan.highlighted.includes(f) ? 'bold' : ''}>
                        <span className={`csw-feat-icon ${plan.highlighted.includes(f) ? 'filled' : ''}`}>
                          {plan.highlighted.includes(f) ? '✓' : '✓'}
                        </span>
                        {f}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>

            {/* Bottom bar */}
            <div className="csw-plan-footer">
              <span>🔒 SSL ENCRYPTED · CANCEL ANY TIME</span>
              <span>GST INCLUDED · BILLED IN INR</span>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
