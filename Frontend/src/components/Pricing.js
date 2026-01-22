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

  // Check if user is a company member and redirect to dashboard automatically
  React.useEffect(() => {
    const user = localStorage.getItem('user');
    if (user) {
      try {
        const userData = JSON.parse(user);
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
      subtitle: 'For solo enterpreneurs',
      monthlyPrice: 1699,
      yearlyPrice: 1359,
      planKey: 'Starter',
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
      const response = await api.post('/subscription/subscribe', {
        plan: plan.planKey,
        billingCycle: billingType === 'yearly' ? 'Annual' : 'Monthly'
      });

      if (response.data.success) {
        localStorage.setItem('user', JSON.stringify(response.data.user));
        window.dispatchEvent(new Event('userUpdated'));
        toast.success(`Successfully subscribed to ${plan.name} plan!`);
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
    return billingType === 'yearly' ? plan.yearlyPrice : plan.monthlyPrice;
  };

  return (
    <div className="pricing-container">
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
          <div key={index} className="pricing-card">
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
              className="get-started-btn"
              onClick={() => handlePlanSelect(plan)}
              disabled={loading}
            >
              {loading ? 'Processing...' : 'Get Started'}
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
