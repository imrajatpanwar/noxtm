import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { IoMdCheckmark } from "react-icons/io";
import { MdClose } from "react-icons/md";
import { useRole } from '../contexts/RoleContext';
import { toast } from 'sonner';
import api from '../config/api';
import './Pricing.css';

const Pricing = () => {
  const navigate = useNavigate();
  const [billingType, setBillingType] = useState('Monthly');
  const [loading, setLoading] = useState(false);
  const { currentUser } = useRole();

  // Check if trial is unavailable (already used or expired)
  const hasUsedTrial = currentUser?.subscription?.trialUsed === true;
  const isTrialExpired = currentUser?.subscription?.plan === 'Trial' &&
    currentUser?.subscription?.endDate &&
    new Date(currentUser.subscription.endDate) < new Date();
  const isTrialUnavailable = hasUsedTrial || isTrialExpired;

  // Debug logging
  React.useEffect(() => {
    if (currentUser) {
      console.log('[PRICING] Current user:', currentUser.email);
      console.log('[PRICING] Subscription:', currentUser.subscription);
      console.log('[PRICING] trialUsed value:', currentUser?.subscription?.trialUsed);
      console.log('[PRICING] hasUsedTrial:', hasUsedTrial);
      console.log('[PRICING] isTrialExpired:', isTrialExpired);
      console.log('[PRICING] isTrialUnavailable:', isTrialUnavailable);
    }
  }, [currentUser, hasUsedTrial, isTrialExpired, isTrialUnavailable]);

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

  // Start 7-day free trial
  const startTrial = async () => {
    if (!currentUser) {
      console.log('[TRIAL] No current user, redirecting to signup');
      navigate('/signup');
      return;
    }

    console.log('[TRIAL] Starting trial for user:', currentUser.email);
    setLoading(true);
    try {
      const response = await api.post('/subscription/start-trial');
      console.log('[TRIAL] Backend response:', response.data);

      if (response.data.success) {
        // Use the full user object from backend response
        const updatedUser = response.data.user;
        console.log('[TRIAL] Updated user from backend:', updatedUser);

        // Update localStorage with the complete user object
        localStorage.setItem('user', JSON.stringify(updatedUser));
        console.log('[TRIAL] LocalStorage updated with full user object');

        // Dispatch event to update RoleContext
        window.dispatchEvent(new Event('userUpdated'));
        console.log('[TRIAL] userUpdated event dispatched');

        toast.success('Your 7-day free trial has started!');

        console.log('[TRIAL] Redirecting to company setup...');
        // Force immediate redirect to company setup page
        // Using replace() instead of href to avoid timing issues
        window.location.replace('/company-setup');
      } else {
        console.error('[TRIAL] Backend returned success=false');
      }
    } catch (error) {
      console.error('[TRIAL] Error:', error);
      console.error('[TRIAL] Error response:', error.response?.data);
      toast.error(error.response?.data?.message || 'Failed to start trial');
    } finally {
      setLoading(false);
    }
  };

  const features = [
    {
      name: 'Client Leads',
      trial: true,
      noxtm: true,
      enterprise: true
    },
    {
      name: 'Conversion Tracking',
      trial: true,
      noxtm: true,
      enterprise: true
    },
    {
      name: 'Project Management',
      trial: 'Limited',
      noxtm: 'Unlimited',
      enterprise: 'Unlimited'
    },
    {
      name: 'Email Marketing',
      trial: 'Limited',
      noxtm: 'Unlimited',
      enterprise: 'Unlimited'
    },
    {
      name: 'WhatsApp Marketing',
      trial: true,
      noxtm: true,
      enterprise: true
    },
    {
      name: 'Social Media Scheduler',
      trial: 'Limited',
      noxtm: 'Unlimited Instagram | LinkedIn',
      enterprise: 'Unlimited Instagram | LinkedIn'
    },
    {
      name: 'Internal Messages',
      trial: true,
      noxtm: true,
      enterprise: true
    },
    {
      name: 'Employee can be Add',
      trial: '5 Employees',
      noxtm: '500 Employees',
      enterprise: 'Unlimited Employees'
    },
    {
      name: 'HR Management',
      trial: true,
      noxtm: true,
      enterprise: true
    },
    {
      name: 'Financial Management',
      trial: true,
      noxtm: true,
      enterprise: true
    },
    {
      name: 'Internal Policies',
      trial: true,
      noxtm: true,
      enterprise: true
    },
    {
      name: 'Video Meeting',
      trial: false,
      noxtm: true,
      enterprise: false
    },
    {
      name: 'Quick Tools',
      trial: true,
      noxtm: true,
      enterprise: true
    },
    {
      name: 'SEO & Content',
      trial: false,
      noxtm: true,
      enterprise: false
    },
    {
      name: 'Storage',
      trial: '1 GB storage',
      noxtm: 'Unlimited storage',
      enterprise: 'Unlimited storage'
    },
    {
      name: 'Up Time',
      trial: '99% uptime',
      noxtm: '99.9% uptime SLA',
      enterprise: '99.99% uptime SLA'
    },
    {
      name: 'Email notifications',
      trial: 'Limited',
      noxtm: 'Unlimited',
      enterprise: 'Unlimited'
    },
    {
      name: 'Support',
      trial: 'Email Support',
      noxtm: '24/7 Premium Support',
      enterprise: '24/7 Premium Support'
    }
  ];

  const plans = [
    {
      name: '7-Day Free Trial',
      price: 'Free',
      buttonText: 'Start Trial',
      buttonClass: 'btn-trial',
      isTrial: true
    },
    {
      name: 'Noxtm Dashboard',
      price: billingType === 'Annual' ? '₹10,399' : '₹12,999',
      buttonText: 'Get Started',
      buttonClass: 'btn-outline'
    },
    {
      name: 'Enterprise',
      price: '-',
      buttonText: 'Contact Sales',
      buttonClass: 'btn-outline'
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

    // Handle trial plan
    if (plan.isTrial) {
      startTrial();
      return;
    }

    if (plan.name === 'Noxtm Dashboard') {
      try {
        // Call the backend to set up Noxtm subscription
        const response = await fetch('/api/subscribe/noxtm', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify({
            billingType: billingType // Send 'Monthly' or 'Annual'
          })
        });

        // Check if response is ok and is JSON
        const contentType = response.headers.get('content-type');
        if (!response.ok) {
          if (contentType && contentType.includes('application/json')) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Subscription failed');
          } else {
            throw new Error('Server error. Please try again later.');
          }
        }

        if (!contentType || !contentType.includes('application/json')) {
          throw new Error('Invalid response from server');
        }

        const data = await response.json();

        if (data.success) {
          // Update local user data
          localStorage.setItem('user', JSON.stringify(data.user));
          // Dispatch event to notify App.js of user update
          window.dispatchEvent(new Event('userUpdated'));
          toast.success('Successfully subscribed to Noxtm plan!');
          // Redirect to company setup for Noxtm users
          navigate('/company-setup');
        } else {
          toast.error(data.message || 'Failed to subscribe to Noxtm plan');
        }
      } catch (error) {
        console.error('Noxtm subscription error:', error);
        toast.error(error.message || 'Failed to process subscription. Please try again.');
      }
    } else if (plan.name === 'Enterprise') {
      window.location.href = 'mailto:sales@noxtm.com';
    }
  };

  const renderFeatureValue = (value) => {
    if (value === true) {
      return <span className="feature-check"><IoMdCheckmark /></span>;
    } else if (value === false) {
      return <span className="feature-cross"><MdClose /></span>;
    } else {
      return <span className="feature-text">{value}</span>;
    }
  };

  return (
    <div className="pricing-container">
      <div className="pricing-header">
        <h1>Upgrade your plan</h1>

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

      <div className="pricing-table">
        <div className="price-section-header">
          <div className="feature-column"></div>
          {plans.map((plan, index) => (
            <div key={index} className="plan-column">
              <h3>{plan.name}</h3>
              <div className="plan-price">{plan.price}</div>
              <button
                className={`plan-btn ${plan.buttonClass}${plan.isTrial && isTrialUnavailable ? ' btn-disabled' : ''}`}
                onClick={() => handlePlanSelect(plan)}
                disabled={plan.isTrial && isTrialUnavailable}
              >
                {plan.isTrial && isTrialUnavailable ? 'Trial Used' : plan.buttonText}
              </button>
            </div>
          ))}
        </div>

        <div className="table-body">
          {features.map((feature, index) => (
            <div key={index} className="feature-row">
              <div className="feature-name">{feature.name}</div>
              <div className="feature-value">
                {renderFeatureValue(feature.trial)}
              </div>
              <div className="feature-value">
                {renderFeatureValue(feature.noxtm)}
              </div>
              <div className="feature-value">
                {renderFeatureValue(feature.enterprise)}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Pricing;