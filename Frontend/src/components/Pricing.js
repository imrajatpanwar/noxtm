import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { IoMdCheckmark } from "react-icons/io";
import { MdClose } from "react-icons/md";
import { useRole } from '../contexts/RoleContext';
import { toast } from 'sonner';
import './Pricing.css';

const Pricing = () => {
  const navigate = useNavigate();
  const [billingType, setBillingType] = useState('Monthly');
  // eslint-disable-next-line no-unused-vars
  const { currentUser, upgradeToSoloHQ } = useRole();

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

  const features = [
    {
      name: 'Client Leads',
      soloHQ: true,
      noxtm: true,
      enterprise: true
    },
    {
      name: 'Conversion Tracking',
      soloHQ: false,
      noxtm: true,
      enterprise: true
    },
    {
      name: 'Project Management',
      soloHQ: '5 Projects',
      noxtm: 'Unlimited',
      enterprise: 'Unlimited'
    },
    {
      name: 'Email Marketing',
      soloHQ: false,
      noxtm: 'Unlimited',
      enterprise: 'Unlimited'
    },
    {
      name: 'WhatsApp Marketing',
      soloHQ: false,
      noxtm: true,
      enterprise: true
    },
    {
      name: 'Social Media Scheduler',
      soloHQ: false,
      noxtm: 'Unlimited Instagram | LinkedIn',
      enterprise: 'Unlimited Instagram | LinkedIn'
    },
    {
      name: 'Internal Messages',
      soloHQ: false,
      noxtm: true,
      enterprise: true
    },
    {
      name: 'Employee can be Add',
      soloHQ: '10 Employees',
      noxtm: '500 Employees',
      enterprise: 'Unlimited Employees'
    },
    {
      name: 'HR Management',
      soloHQ: false,
      noxtm: true,
      enterprise: true
    },
    {
      name: 'Financial Management',
      soloHQ: false,
      noxtm: true,
      enterprise: true
    },
    {
      name: 'Internal Policies',
      soloHQ: false,
      noxtm: true,
      enterprise: true
    },
    {
      name: 'Video Meeting',
      soloHQ: false,
      noxtm: true,
      enterprise: false
    },
    {
      name: 'Quick Tools',
      soloHQ: false,
      noxtm: true,
      enterprise: true
    },
    {
      name: 'SEO & Content',
      soloHQ: false,
      noxtm: true,
      enterprise: false
    },
    {
      name: 'Storage',
      soloHQ: '500 MB',
      noxtm: 'Unlimited storage',
      enterprise: 'Unlimited storage'
    },
    {
      name: 'Up Time',
      soloHQ: '-',
      noxtm: '99.9% uptime SLA',
      enterprise: '99.99% uptime SLA'
    },
    {
      name: 'Email notifications',
      soloHQ: '100 emails per day',
      noxtm: 'Unlimited',
      enterprise: 'Unlimited'
    },
    {
      name: 'Support',
      soloHQ: 'Community Support',
      noxtm: '24/7 Premium Support',
      enterprise: '24/7 Premium Support'
    }
  ];

  const plans = [
    {
      name: 'Solo HQ Dashboard',
      price: 'Free',
      buttonText: 'Get Started',
      buttonClass: 'btn-outline'
    },
    {
      name: 'Noxtm Dashboard',
      price: billingType === 'Annual' ? '₹10,399' : '₹12,999',
      buttonText: 'Upgrade Now',
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

    if (plan.name === 'Solo HQ Dashboard') {
      try {
        // Call the backend to set up subscription
        const response = await fetch('/api/subscribe/solohq', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
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
          toast.success('Successfully subscribed to SOLOHQ plan!');
          navigate('/dashboard');
        } else {
          toast.error(data.message || 'Failed to subscribe to SOLOHQ plan');
        }
      } catch (error) {
        console.error('Subscription error:', error);
        toast.error(error.message || 'Failed to process subscription. Please try again.');
      }
    } else if (plan.name === 'Noxtm Dashboard') {
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
                className={`plan-btn ${plan.buttonClass}`}
                onClick={() => handlePlanSelect(plan)}
              >
                {plan.buttonText}
              </button>
            </div>
          ))}
        </div>
        
        <div className="table-body">
          {features.map((feature, index) => (
            <div key={index} className="feature-row">
              <div className="feature-name">{feature.name}</div>
              <div className="feature-value">
                {renderFeatureValue(feature.soloHQ)}
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