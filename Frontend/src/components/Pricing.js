import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { IoMdCheckmark } from "react-icons/io";
import './Pricing.css';

const Pricing = () => {
  const navigate = useNavigate();
  const [billingType, setBillingType] = useState('Monthly');

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
      price: billingType === 'Annual' ? '$799' : '$999',
      buttonText: 'Upgrade Now',
      buttonClass: 'btn-primary'
    },
    {
      name: 'Enterprise',
      price: '-',
      buttonText: 'Contact Sales',
      buttonClass: 'btn-enterprise'
    }
  ];

  const handlePlanSelect = (plan) => {
    if (plan.name === 'Solo HQ Dashboard') {
      navigate('/signup');
    } else if (plan.name === 'Enterprise') {
      window.location.href = 'mailto:sales@noxtm.com';
    } else {
      navigate('/signup');
    }
  };

  const renderFeatureValue = (value) => {
    if (value === true) {
      return <span className="feature-check"><IoMdCheckmark /></span>;
    } else if (value === false) {
      return <span className="feature-cross">✗</span>;
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
        <div className="table-header">
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