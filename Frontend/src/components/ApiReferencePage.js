import React from 'react';
import { Link } from 'react-router-dom';
import {
  FiLock, FiUser, FiBriefcase, FiUsers, FiTarget,
  FiFolder, FiCheckSquare, FiPackage, FiFileText,
  FiMail, FiList, FiMessageCircle, FiGlobe, FiTrendingUp,
  FiLayers, FiSend, FiEdit3, FiShield, FiZap, FiServer,
  FiCode, FiClock, FiAlertTriangle, FiBook
} from 'react-icons/fi';
import './PublicPages.css';

const apiCategories = [
  {
    category: 'Authentication & Identity',
    desc: 'Secure user registration, login, session management, and account verification flows.',
    icon: <FiLock />,
    color: '#10b981',
    features: ['User registration & email verification', 'JWT-based session management', 'Password reset & recovery', 'Multi-factor authentication support']
  },
  {
    category: 'User & Profile Management',
    desc: 'Complete user profile lifecycle including image upload, password changes, and preference management.',
    icon: <FiUser />,
    color: '#3b82f6',
    features: ['Profile read & update', 'Profile image management', 'Password management', 'Notification preferences']
  },
  {
    category: 'Company & Workspace',
    desc: 'Set up and manage your organizational workspace with team invitations and member controls.',
    icon: <FiBriefcase />,
    color: '#8b5cf6',
    features: ['Company creation & setup', 'Member invitations & onboarding', 'Member management', 'Permission configuration']
  },
  {
    category: 'Roles & Permissions',
    desc: 'Granular role-based access control with section-level permissions across the entire platform.',
    icon: <FiShield />,
    color: '#f59e0b',
    features: ['Role listing & assignment', 'Section-level permissions', 'User access management', 'Permission inheritance']
  },
  {
    category: 'Client & Lead Management',
    desc: 'Full CRM capabilities to manage client records, track leads through pipeline stages, and generate quotes.',
    icon: <FiTarget />,
    color: '#ef4444',
    features: ['Client CRUD operations', 'Lead pipeline management', 'Status tracking & conversion', 'Quote generation']
  },
  {
    category: 'Projects & Tasks',
    desc: 'End-to-end project management with task assignment, milestone tracking, and progress analytics.',
    icon: <FiFolder />,
    color: '#06b6d4',
    features: ['Project lifecycle management', 'Task creation & assignment', 'Milestone tracking', 'Progress statistics']
  },
  {
    category: 'Products & Inventory',
    desc: 'Manage your product catalog with pricing, stock levels, categories, and inventory analytics.',
    icon: <FiPackage />,
    color: '#84cc16',
    features: ['Product catalog management', 'Inventory tracking', 'Category organization', 'Product statistics']
  },
  {
    category: 'Invoices & Billing',
    desc: 'Create professional invoices, track payment statuses, generate PDFs, and send directly to clients.',
    icon: <FiFileText />,
    color: '#f97316',
    features: ['Invoice generation', 'Status tracking', 'PDF export', 'Email delivery']
  },
  {
    category: 'Email Campaigns',
    desc: 'Build, schedule, and send email marketing campaigns with template management and performance tracking.',
    icon: <FiMail />,
    color: '#ec4899',
    features: ['Campaign creation & scheduling', 'Template management', 'Test email sends', 'Delivery analytics']
  },
  {
    category: 'Contact Lists',
    desc: 'Manage subscriber lists for campaigns with CSV import, contact validation, and segmentation.',
    icon: <FiList />,
    color: '#14b8a6',
    features: ['List management', 'Contact import (CSV)', 'Email validation', 'Segmentation tools']
  },
  {
    category: 'WhatsApp Integration',
    desc: 'Connect WhatsApp Business API for messaging campaigns, chatbot automation, and conversation tracking.',
    icon: <FiMessageCircle />,
    color: '#22c55e',
    features: ['Account linking', 'Message sending', 'Campaign management', 'Chatbot configuration']
  },
  {
    category: 'Modules & Extensions',
    desc: 'Install and manage workspace modules including Exhibit OS, Agency OS, Chat Automation, and more.',
    icon: <FiLayers />,
    color: '#a855f7',
    features: ['Module installation', 'Module management', 'Feature activation', 'Module uninstallation']
  },
  {
    category: 'Noxtm Mail',
    desc: 'Professional email infrastructure with custom domains, delivery logs, DNS verification, and statistics.',
    icon: <FiSend />,
    color: '#0ea5e9',
    features: ['Email sending', 'Delivery logs', 'DNS verification', 'Mail statistics']
  },
  {
    category: 'Blog & Content',
    desc: 'Publish and manage blog content with SEO-friendly slugs, categories, and media management.',
    icon: <FiEdit3 />,
    color: '#64748b',
    features: ['Blog CRUD operations', 'Category management', 'SEO slug support', 'Media handling']
  }
];

const errorCodes = [
  { code: '400', title: 'Bad Request', desc: 'The request body or query parameters are missing or malformed.', color: '#f59e0b' },
  { code: '401', title: 'Unauthorized', desc: 'The JWT token is missing, invalid, or has expired.', color: '#ef4444' },
  { code: '403', title: 'Forbidden', desc: 'Your role does not have permission for this action.', color: '#f97316' },
  { code: '404', title: 'Not Found', desc: 'The resource does not exist or belongs to another workspace.', color: '#6b7280' },
  { code: '429', title: 'Rate Limited', desc: 'Too many requests. Wait before retrying.', color: '#8b5cf6' },
  { code: '500', title: 'Server Error', desc: 'An unexpected error occurred on our side.', color: '#dc2626' },
];

function ApiReferencePage() {
  return (
    <div className="public-page">
      <div className="public-page-container">

        {/* Hero */}
        <div className="public-hero">
          <span className="public-hero-badge"><FiCode style={{ fontSize: 13 }} /> API Overview</span>
          <h1>Noxtm Platform API</h1>
          <p>
            A comprehensive RESTful API powering every feature of the Noxtm platform. 
            Built for reliability, secured with JWT authentication, and designed for seamless integration.
          </p>
        </div>

        {/* Quick Highlights */}
        <div className="api-highlights-grid">
          <div className="api-highlight-card">
            <div className="api-highlight-icon" style={{ background: '#ecfdf5', color: '#10b981' }}>
              <FiServer />
            </div>
            <div>
              <h4>RESTful Architecture</h4>
              <p>Standard HTTP methods with JSON request and response format across all endpoints.</p>
            </div>
          </div>
          <div className="api-highlight-card">
            <div className="api-highlight-icon" style={{ background: '#eff6ff', color: '#3b82f6' }}>
              <FiLock />
            </div>
            <div>
              <h4>JWT Authentication</h4>
              <p>Secure Bearer token authentication with configurable expiration for all protected routes.</p>
            </div>
          </div>
          <div className="api-highlight-card">
            <div className="api-highlight-icon" style={{ background: '#f5f3ff', color: '#8b5cf6' }}>
              <FiShield />
            </div>
            <div>
              <h4>Role-Based Access</h4>
              <p>Granular permissions ensure users only access resources their role permits.</p>
            </div>
          </div>
          <div className="api-highlight-card">
            <div className="api-highlight-icon" style={{ background: '#fff7ed', color: '#f59e0b' }}>
              <FiClock />
            </div>
            <div>
              <h4>Rate Limiting</h4>
              <p>Per-user and per-IP rate limits protect the platform from abuse and ensure fair usage.</p>
            </div>
          </div>
        </div>

        {/* API Categories */}
        <div className="api-section-header">
          <h2 className="public-section-title">API Categories</h2>
          <p className="public-section-subtitle" style={{ maxWidth: '680px' }}>
            The Noxtm API is organized into 14 resource categories covering every aspect of the platform — from authentication to marketing automation.
          </p>
        </div>

        <div className="api-categories-grid">
          {apiCategories.map((cat, i) => (
            <div className="api-category-card" key={i}>
              <div className="api-category-header">
                <div className="api-category-icon" style={{ background: cat.color + '15', color: cat.color }}>
                  {cat.icon}
                </div>
                <h3>{cat.category}</h3>
              </div>
              <p className="api-category-desc">{cat.desc}</p>
              <div className="api-category-features">
                {cat.features.map((f, fi) => (
                  <span className="api-feature-tag" key={fi}>{f}</span>
                ))}
              </div>
            </div>
          ))}
        </div>

        <hr className="public-divider" />

        {/* How it Works */}
        <div className="api-section-header">
          <h2 className="public-section-title">How It Works</h2>
          <p className="public-section-subtitle" style={{ maxWidth: '600px' }}>
            A simple overview of how to interact with the Noxtm API.
          </p>
        </div>

        <div className="api-steps-grid">
          <div className="api-step-card">
            <div className="api-step-number">1</div>
            <h3>Authenticate</h3>
            <p>Register or log in to receive a secure JWT token that authenticates all subsequent requests.</p>
          </div>
          <div className="api-step-card">
            <div className="api-step-number">2</div>
            <h3>Set Up Workspace</h3>
            <p>Create your company, invite team members, and configure roles and permissions for your organization.</p>
          </div>
          <div className="api-step-card">
            <div className="api-step-number">3</div>
            <h3>Manage Resources</h3>
            <p>Use standard REST operations to create, read, update, and delete resources across the platform.</p>
          </div>
          <div className="api-step-card">
            <div className="api-step-number">4</div>
            <h3>Scale & Automate</h3>
            <p>Install modules, configure marketing campaigns, and automate workflows as your business grows.</p>
          </div>
        </div>

        <hr className="public-divider" />

        {/* Error Codes */}
        <div className="api-section-header">
          <h2 className="public-section-title">Response Codes</h2>
          <p className="public-section-subtitle" style={{ maxWidth: '600px' }}>
            Standard HTTP status codes returned by the API.
          </p>
        </div>

        <div className="api-error-grid">
          {errorCodes.map((err, i) => (
            <div className="api-error-card" key={i}>
              <div className="api-error-code" style={{ color: err.color }}>{err.code}</div>
              <div className="api-error-info">
                <h4>{err.title}</h4>
                <p>{err.desc}</p>
              </div>
            </div>
          ))}
        </div>

        <hr className="public-divider" />

        {/* Rate Limiting Info */}
        <div className="api-section-header">
          <h2 className="public-section-title">Rate Limiting & Security</h2>
          <p className="public-section-subtitle" style={{ maxWidth: '680px' }}>
            All API endpoints are rate-limited per user and IP address. Email and WhatsApp endpoints have additional throttling to prevent abuse.
          </p>
        </div>

        <div className="api-info-cards-row">
          <div className="api-info-card">
            <div className="api-info-card-icon"><FiZap /></div>
            <h4>Request Limits</h4>
            <p>General endpoints allow a generous number of requests per minute. Communication endpoints have stricter per-hour limits.</p>
          </div>
          <div className="api-info-card">
            <div className="api-info-card-icon"><FiAlertTriangle /></div>
            <h4>Abuse Protection</h4>
            <p>Automated monitoring detects unusual patterns. Repeated violations may result in temporary IP blocks or account restrictions.</p>
          </div>
          <div className="api-info-card">
            <div className="api-info-card-icon"><FiBook /></div>
            <h4>Best Practices</h4>
            <p>Use pagination for list endpoints. Cache responses where appropriate. Implement exponential backoff on retries.</p>
          </div>
        </div>

        {/* CTA */}
        <div className="public-cta" style={{ marginTop: 48 }}>
          <h2>Want to integrate with Noxtm?</h2>
          <p>Read the documentation or contact our engineering team for API access and guidance.</p>
          <div className="public-btn-group">
            <Link to="/documentation" className="public-btn public-btn-primary">Documentation</Link>
            <a href="mailto:hello@noxtm.com" className="public-btn public-btn-outline" style={{ textDecoration: 'none' }}>Contact Engineering</a>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ApiReferencePage;
