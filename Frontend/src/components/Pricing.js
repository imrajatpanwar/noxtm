import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRole } from '../contexts/RoleContext';
import { toast } from 'sonner';
import api from '../config/api';
import setupBg from '../assets/background_setup.webp';
import './Pricing.css';

const PLANS = [
  {
    name: 'Starter',
    subtitle: 'For solo entrepreneurs',
    label: '01 — SOLO',
    monthlyPrice: 1699,
    yearlyPrice: 1359,
    planKey: 'Starter',
    hasTrial: true,
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
    name: 'Pro +',
    subtitle: 'For Small Businesses',
    label: '02 — POPULAR',
    monthlyPrice: 2699,
    yearlyPrice: 2159,
    planKey: 'Pro+',
    hasTrial: true,
    popular: true,
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
    highlighted: ['Everything from Starter', 'Add 60 Team Access Max', 'Free 10,000 Bulk emails', '50GB Storage Access', 'Request new integrations', 'Intelligent Analytics Bot', 'AI Analysis work report', 'Priority customer support', '99.9% Up time'],
  },
  {
    name: 'Advance',
    subtitle: 'For High-scale businesses',
    label: '03 — SCALE',
    monthlyPrice: 4699,
    yearlyPrice: 3759,
    planKey: 'Advance',
    hasTrial: false,
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

const Pricing = () => {
  const navigate = useNavigate();
  const [billing, setBilling] = useState('monthly');
  const [loading, setLoading] = useState(false);
  const [activePlan, setActivePlan] = useState(null);
  const { currentUser } = useRole();

  const userSub = currentUser?.subscription;
  const isOnTrial = userSub?.status === 'trial' && userSub?.endDate && new Date(userSub.endDate) > new Date();
  const isActive  = userSub?.status === 'active';
  const currentPlanKey = userSub?.plan;

  const handlePlanSelect = async (plan) => {
    if (!currentUser) { navigate('/signup'); return; }
    if (currentUser.role === 'Admin') { navigate('/dashboard'); return; }

    // already on this plan
    if ((isOnTrial || isActive) && currentPlanKey === plan.planKey) {
      navigate('/dashboard');
      return;
    }

    setLoading(true);
    setActivePlan(plan.planKey);
    try {
      if (plan.hasTrial) {
        const response = await api.post('/subscription/start-trial', { plan: plan.planKey });
        if (response.data.success) {
          localStorage.setItem('user', JSON.stringify(response.data.user));
          window.dispatchEvent(new Event('userUpdated'));
          toast.success(response.data.message || `${plan.name} trial started!`);
          navigate('/dashboard');
        } else {
          toast.error(response.data.message || 'Failed to start trial');
          setActivePlan(null);
        }
      } else {
        navigate(`/checkout?plan=${encodeURIComponent(plan.planKey)}&billing=${billing === 'yearly' ? 'Annual' : 'Monthly'}`);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to process. Please try again.');
      setActivePlan(null);
    } finally {
      setLoading(false);
    }
  };

  const getPrice = (plan) => billing === 'yearly' ? plan.yearlyPrice : plan.monthlyPrice;

  const btnLabel = (plan) => {
    if (loading && activePlan === plan.planKey) return 'Starting...';
    if ((isOnTrial || isActive) && currentPlanKey === plan.planKey)
      return isOnTrial ? 'Current trial →' : 'Current plan →';
    return plan.hasTrial ? 'Start trial →' : 'Get started →';
  };

  return (
    <div className="pr-root" style={{ backgroundImage: `url(${setupBg})` }}>

      {/* grid overlay */}
      <div className="pr-grid-overlay" />

      {/* glass window */}
      <div className="pr-window">
        <div className="pr-dots">
          <span className="pr-dot pr-dot-red" />
          <span className="pr-dot pr-dot-yellow" />
          <span className="pr-dot pr-dot-green" />
        </div>

        <div className="pr-inner">

          {/* header */}
          <div className="pr-header">
            <div>
              <div className="pr-step-label">STEP 06 · CHOOSE PLAN</div>
              <h1 className="pr-heading">Pick a plan.</h1>
              <p className="pr-sub">14-day free trial. Upgrade, downgrade, or cancel any time.</p>
            </div>
            <div className="pr-billing-toggle">
              <button
                className={billing === 'monthly' ? 'active' : ''}
                onClick={() => setBilling('monthly')}
              >Monthly</button>
              <button
                className={billing === 'yearly' ? 'active' : ''}
                onClick={() => setBilling('yearly')}
              >
                Yearly <span className="pr-discount">-20%</span>
              </button>
            </div>
          </div>

          {/* plans */}
          <div className="pr-plans-grid">
            {PLANS.map(plan => (
              <div
                key={plan.planKey}
                className={`pr-plan-card ${plan.popular ? 'popular' : ''} ${currentPlanKey === plan.planKey ? 'current' : ''}`}
              >
                {plan.popular && <div className="pr-recommended">● RECOMMENDED</div>}
                <div className="pr-plan-label">{plan.label}</div>
                <div className="pr-plan-name">{plan.name}</div>
                <div className="pr-plan-subtitle">{plan.subtitle}</div>
                <div className="pr-plan-price">
                  <span className="pr-currency">₹</span>
                  <span className="pr-amount">{getPrice(plan).toLocaleString()}</span>
                  <span className="pr-per">/mo</span>
                </div>
                <button
                  className={`pr-plan-btn ${plan.popular ? 'dark' : ''} ${currentPlanKey === plan.planKey ? 'current-btn' : ''}`}
                  onClick={() => handlePlanSelect(plan)}
                  disabled={loading}
                >
                  {btnLabel(plan)}
                </button>
                <ul className="pr-features">
                  {plan.features.map(f => (
                    <li key={f} className={plan.highlighted.includes(f) ? 'bold' : ''}>
                      <span className={`pr-feat-icon ${plan.highlighted.includes(f) ? 'filled' : ''}`}>✓</span>
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {/* footer bar */}
          <div className="pr-footer-bar">
            <span>🔒 SSL ENCRYPTED · CANCEL ANY TIME</span>
            <span>GST INCLUDED · BILLED IN INR</span>
          </div>

        </div>
      </div>
    </div>
  );
};

export default Pricing;
