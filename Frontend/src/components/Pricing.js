import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { IoMdCheckmark } from "react-icons/io";
import { useRole } from '../contexts/RoleContext';
import { toast } from 'sonner';
import api from '../config/api';
import './Pricing.css';

const Pricing = () => {
  const navigate = useNavigate();
  const [billingType, setBillingType] = useState('monthly');
  const [loading, setLoading] = useState(false);
  const { currentUser } = useRole();

  // Check if user already has an active subscription
  const userSub = currentUser?.subscription;
  const isOnTrial = userSub?.status === 'trial' && userSub?.endDate && new Date(userSub.endDate) > new Date();
  const isActive = userSub?.status === 'active';
  const currentPlanKey = userSub?.plan; // e.g. 'Starter', 'Pro+', 'Advance'

  const plans = [
    {
      name: 'Starter',
      subtitle: 'For solo entrepreneurs',
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
        'Customer support'
      ]
    },
    {
      name: 'Pro +',
      subtitle: 'For Small Businesses',
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
        '99.9% Up time'
      ]
    },
    {
      name: 'Advance',
      subtitle: 'For High-scale businesses',
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
        'Custom Branding'
      ]
    }
  ];

  const handlePlanSelect = async (plan) => {
    if (!currentUser) {
      navigate('/signup');
      return;
    }

    if (currentUser.role === 'Admin') {
      navigate('/dashboard');
      return;
    }

    setLoading(true);
    try {
      if (plan.hasTrial) {
        // Start 14-day free trial for Starter & Pro+
        const response = await api.post('/subscription/start-trial', {
          plan: plan.planKey
        });

        if (response.data.success) {
          localStorage.setItem('user', JSON.stringify(response.data.user));
          window.dispatchEvent(new Event('userUpdated'));
          toast.success(response.data.message || `14-day free trial of ${plan.name} started!`);
          navigate('/dashboard');
        } else {
          toast.error(response.data.message || 'Failed to start trial');
        }
      } else {
        // Advance plan — go to payment checkout
        navigate(`/checkout?plan=${encodeURIComponent(plan.planKey)}&billing=${billingType === 'yearly' ? 'Annual' : 'Monthly'}`);
      }
    } catch (error) {
      console.error('Plan selection error:', error);
      const msg = error.response?.data?.message || 'Failed to process. Please try again.';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const getPrice = (plan) => {
    return billingType === 'yearly' ? plan.yearlyPrice : plan.monthlyPrice;
  };

  return (
    <div className="pricing-container">
      {/* Stepper */}
      <div className="pricing-stepper">
        <div className="pricing-step completed">
          <div className="pricing-step-circle">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
          </div>
          <span>Company Details</span>
        </div>
        <div className="pricing-step-line"></div>
        <div className="pricing-step active">
          <div className="pricing-step-circle">2</div>
          <span>Choose Plan</span>
        </div>
        <div className="pricing-step-line"></div>
        <div className="pricing-step">
          <div className="pricing-step-circle">3</div>
          <span>Get Started</span>
        </div>
      </div>

      <div className="pricing-header">
        <h1>Choose your plan</h1>

        <div className="billing-toggle">
          <button
            type="button"
            className={`billing-option ${billingType === 'monthly' ? 'active' : ''}`}
            onClick={() => setBillingType('monthly')}
          >
            Pay monthly
          </button>
          <button
            type="button"
            className={`billing-option ${billingType === 'yearly' ? 'active' : ''}`}
            onClick={() => setBillingType('yearly')}
          >
            Pay yearly
          </button>
        </div>
      </div>

      <div className="pricing-cards-grid">
        {plans.map((plan, index) => (
          <div key={index} className={`pricing-card ${plan.popular ? 'pricing-card-popular' : ''}`}>
            {plan.popular && <div className="popular-badge">Most Popular</div>}
            {plan.hasTrial && <div className="trial-badge">14-Day Free Trial</div>}

            <div className="card-top">
              <h3 className="plan-title">{plan.name}</h3>
              <p className="plan-subtitle">{plan.subtitle}</p>
            </div>

            <div className="card-price">
              <span className="currency">₹</span>
              <span className="amount">{getPrice(plan)}</span>
              <span className="period">/ month</span>
            </div>

            <button
              className={`get-started-btn ${plan.hasTrial ? 'trial-btn' : ''} ${(isOnTrial || isActive) && currentPlanKey === plan.planKey ? 'current-plan-btn' : ''}`}
              onClick={() => {
                if ((isOnTrial || isActive) && currentPlanKey === plan.planKey) {
                  navigate('/dashboard');
                } else {
                  handlePlanSelect(plan);
                }
              }}
              disabled={loading}
            >
              {loading ? 'Processing...'
                : (isOnTrial || isActive) && currentPlanKey === plan.planKey
                  ? (isOnTrial ? 'Current Trial — Go to Dashboard' : 'Current Plan — Go to Dashboard')
                  : plan.hasTrial ? 'Start 14-Day Free Trial'
                  : 'Get Started'}
            </button>

            <ul className="features-list">
              {plan.features.map((feature, fIndex) => (
                <li key={fIndex}>
                  <span className="check-icon"><IoMdCheckmark /></span>
                  <span className="feature-text">{feature}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Pricing;
