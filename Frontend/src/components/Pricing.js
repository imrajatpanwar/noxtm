import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { IoMdCheckmark } from "react-icons/io";
import { useRole } from '../contexts/RoleContext';
import { toast } from 'sonner';
import api from '../config/api';
import './Pricing.css';

const Pricing = () => {
  const navigate = useNavigate();
  const [billingType, setBillingType] = useState('Monthly');
  const [loading, setLoading] = useState(false);
  const { currentUser } = useRole();

  // Check if user is a company member and redirect to dashboard automatically
  React.useEffect(() => {
    const user = localStorage.getItem('user');
    if (user) {
      try {
        const userData = JSON.parse(user);
        // If user has a companyId, they're a company member and should access dashboard
        if (userData.companyId) {
          navigate('/dashboard');
          return;
        }
      } catch (error) {
        console.error('Error parsing user data:', error);
      }
    }
  }, [navigate]);

  const plans = [
    {
      name: 'Starter',
      description: 'Perfect for individuals and small teams getting started',
      monthlyPrice: 1699,
      yearlyPrice: 1359,
      planKey: 'Starter',
      features: [
        'Up to 5 team members',
        'Client Leads Management',
        'Conversion Tracking',
        'Project Management (Limited)',
        'Email Marketing (Limited)',
        'WhatsApp Marketing',
        'Internal Messages',
        'HR Management',
        'Financial Management',
        '5GB Storage',
        'Email Support'
      ]
    },
    {
      name: 'Pro+',
      description: 'Best for growing businesses with advanced needs',
      monthlyPrice: 2699,
      yearlyPrice: 2159,
      planKey: 'Pro+',
      popular: true,
      features: [
        'Up to 50 team members',
        'Everything in Starter, plus:',
        'Unlimited Project Management',
        'Unlimited Email Marketing',
        'Social Media Scheduler',
        'Video Meeting',
        'SEO & Content Tools',
        '50GB Storage',
        '24/7 Support',
        '99.9% Uptime SLA'
      ]
    },
    {
      name: 'Advance',
      description: 'For large teams requiring maximum power and support',
      monthlyPrice: 4699,
      yearlyPrice: 3759,
      planKey: 'Advance',
      features: [
        'Up to 500 team members',
        'Everything in Pro+, plus:',
        'Unlimited Storage',
        'Priority 24/7 Premium Support',
        '99.99% Uptime SLA',
        'Advanced Analytics',
        'Custom Integrations',
        'Dedicated Account Manager',
        'White-label Options',
        'API Access'
      ]
    }
  ];

  const handlePlanSelect = async (plan) => {
    if (!currentUser) {
      navigate('/signup');
      return;
    }

    // If user is admin, redirect directly to dashboard
    if (currentUser.role === 'Admin') {
      navigate('/dashboard');
      return;
    }

    setLoading(true);
    try {
      const response = await api.post('/subscription/subscribe', {
        plan: plan.planKey,
        billingCycle: billingType
      });

      if (response.data.success) {
        // Update local user data
        localStorage.setItem('user', JSON.stringify(response.data.user));
        // Dispatch event to notify App.js of user update
        window.dispatchEvent(new Event('userUpdated'));
        toast.success(`Successfully subscribed to ${plan.name} plan!`);
        // Redirect to company setup
        navigate('/company-setup');
      } else {
        toast.error(response.data.message || `Failed to subscribe to ${plan.name} plan`);
      }
    } catch (error) {
      console.error('Subscription error:', error);
      toast.error(error.response?.data?.message || 'Failed to process subscription. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getPrice = (plan) => {
    return billingType === 'Annual' ? plan.yearlyPrice : plan.monthlyPrice;
  };

  return (
    <div className="pricing-container">
      <div className="pricing-header">
        <h1>Choose Your Plan</h1>
        <p className="pricing-subtitle">Select the perfect plan for your business needs</p>

        <div className="toggle-wrapper">
          <div className={`toggle-pill ${billingType.toLowerCase()}`} role="group" aria-label="Billing period selection">
            <button
              type="button"
              className={`toggle-option left ${billingType === 'Annual' ? 'active' : ''}`}
              onClick={() => setBillingType('Annual')}
              aria-pressed={billingType === 'Annual'}
            >
              Annual <span className="discount-tag"><span className="percentage">20%</span><span className="off-text">OFF</span></span>
            </button>
            <button
              type="button"
              className={`toggle-option right ${billingType === 'Monthly' ? 'active' : ''}`}
              onClick={() => setBillingType('Monthly')}
              aria-pressed={billingType === 'Monthly'}
            >
              Monthly
            </button>
            <div className="slider-backdrop" aria-hidden="true" />
          </div>
        </div>
      </div>

      <div className="pricing-cards-container">
        {plans.map((plan, index) => (
          <div key={index} className={`pricing-card ${plan.popular ? 'popular' : ''}`}>
            {plan.popular && <div className="popular-badge">Most Popular</div>}

            <div className="card-header">
              <h3 className="plan-name">{plan.name}</h3>
              <p className="plan-description">{plan.description}</p>
            </div>

            <div className="card-pricing">
              <span className="price-amount">₹{getPrice(plan).toLocaleString('en-IN')}</span>
              <span className="price-period">/{billingType === 'Annual' ? 'year' : 'month'}</span>
            </div>

            <button
              className={`card-btn ${plan.popular ? 'btn-popular' : 'btn-default'}`}
              onClick={() => handlePlanSelect(plan)}
              disabled={loading}
            >
              {loading ? 'Processing...' : 'Get Started'}
            </button>

            <div className="card-features">
              <ul>
                {plan.features.map((feature, fIndex) => (
                  <li key={fIndex}>
                    <span className="feature-icon"><IoMdCheckmark /></span>
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ))}
      </div>

      <div className="enterprise-section">
        <div className="enterprise-card">
          <div className="enterprise-content">
            <h3>Need Enterprise Solutions?</h3>
            <p>Get custom pricing, dedicated support, and advanced features for large organizations.</p>
          </div>
          <button
            className="enterprise-btn"
            onClick={() => window.location.href = 'mailto:sales@noxtm.com'}
          >
            Contact Sales
          </button>
        </div>
      </div>
    </div>
  );
};

export default Pricing;
