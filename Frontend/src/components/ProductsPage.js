import React from 'react';
import { Link } from 'react-router-dom';
import {
  FiGrid, FiTarget, FiUsers, FiMail, FiMessageCircle,
  FiBarChart2, FiDollarSign, FiShield, FiFileText, FiGlobe,
  FiPackage, FiUserCheck, FiSettings, FiLayers, FiZap,
  FiCheckCircle, FiArrowRight, FiStar, FiTrendingUp, FiMonitor
} from 'react-icons/fi';
import './PublicPages.css';

function ProductsPage() {
  const coreModules = [
    {
      icon: <FiGrid />, color: '#10b981', name: 'Dashboard & Overview',
      desc: 'Real-time analytics, task summaries, and team activity at a glance. Your command center for every project.',
      highlights: ['Live activity feed', 'Quick action shortcuts', 'Revenue summary widgets']
    },
    {
      icon: <FiTarget />, color: '#3b82f6', name: 'Task Manager',
      desc: 'Create, assign, and track tasks with deadlines, priorities, and status updates. Never miss a deliverable.',
      highlights: ['Kanban & list views', 'Multi-assignee support', 'Priority-based filtering']
    },
    {
      icon: <FiUsers />, color: '#8b5cf6', name: 'Client Management',
      desc: 'Store client details, track communication history, manage leads from first contact to conversion.',
      highlights: ['Client profiles & history', 'Lead pipeline stages', 'Quote generation']
    },
    {
      icon: <FiPackage />, color: '#f59e0b', name: 'Products & Inventory',
      desc: 'Manage your product catalog with SKU tracking, pricing, stock levels, and category organization.',
      highlights: ['SKU & pricing management', 'Stock level tracking', 'Category organization']
    },
    {
      icon: <FiFileText />, color: '#10b981', name: 'Notes & Documents',
      desc: 'Rich-text notes linked to projects. Keep meeting minutes, briefs, and ideas organized in one place.',
      highlights: ['Rich text editor', 'Project-linked notes', 'Quick search & filter']
    },
    {
      icon: <FiBarChart2 />, color: '#06b6d4', name: 'Lead Analytics',
      desc: 'Visualize your sales pipeline. Track lead sources, conversion rates, and revenue forecasts.',
      highlights: ['Pipeline visualization', 'Conversion tracking', 'Source attribution']
    },
  ];

  const communicationTools = [
    {
      icon: <FiMessageCircle />, color: '#3b82f6', name: 'Team Messaging',
      desc: 'Real-time direct messages, group channels, file sharing, and read receipts. Keep your team aligned.',
      tag: 'Built-in'
    },
    {
      icon: <FiMail />, color: '#ec4899', name: 'Noxtm Mail',
      desc: 'Built-in professional email with custom domains, templates, and seamless CRM integration.',
      tag: 'Custom Domain'
    },
    {
      icon: <FiMonitor />, color: '#10b981', name: 'Noxtm Chat',
      desc: 'AI-powered chatbot for your website. Automate support, capture leads, and route conversations.',
      tag: 'AI-Powered'
    },
    {
      icon: <FiMessageCircle />, color: '#22c55e', name: 'WhatsApp Marketing',
      desc: 'Broadcast campaigns, template messages, and conversation tracking through the WhatsApp Business API.',
      tag: 'Business API'
    },
  ];

  const modules = [
    {
      icon: <FiGlobe />, color: '#3b82f6', name: 'Exhibit OS',
      desc: 'Manage trade shows, track exhibitors, and coordinate event campaigns with the Findr chrome extension.',
      status: 'Available'
    },
    {
      icon: <FiTrendingUp />, color: '#f59e0b', name: 'Agency OS',
      desc: 'Trending service tracking and targeted company management for digital marketing agencies.',
      status: 'Available'
    },
    {
      icon: <FiZap />, color: '#8b5cf6', name: 'Chat Automation',
      desc: 'AI-driven chatbot with configurable providers, roleplay personas, and intelligent response pacing.',
      status: 'Available'
    },
    {
      icon: <FiLayers />, color: '#10b981', name: 'BotGit',
      desc: 'Connect AI bots to your workflow. Automate repetitive tasks and streamline data processing.',
      status: 'Coming Soon'
    },
  ];

  const management = [
    {
      icon: <FiUserCheck />, color: '#8b5cf6', name: 'HR Management',
      desc: 'Attendance, interviews, holiday calendars, letter templates, employee lifecycle, and incentive tracking.',
      features: ['Attendance tracking', 'Interview management', 'Letter templates', 'Incentive tracking']
    },
    {
      icon: <FiDollarSign />, color: '#f59e0b', name: 'Finance Management',
      desc: 'Invoices, billing, payment records, and expense management with automated workflows.',
      features: ['Invoice generation', 'Payment tracking', 'Expense management', 'PDF export']
    },
    {
      icon: <FiShield />, color: '#64748b', name: 'Internal Policies',
      desc: 'Company policies and handbook management. Keep your team informed and compliant.',
      features: ['Policy documents', 'Version control', 'Team acknowledgment', 'Compliance tracking']
    },
    {
      icon: <FiSettings />, color: '#06b6d4', name: 'Settings & Integrations',
      desc: 'Users, roles, permissions, credentials, and third-party integrations all in one place.',
      features: ['Role management', 'Permission control', 'Custom credentials', 'API integrations']
    },
  ];

  const platformNumbers = [
    { value: '18+', label: 'Built-in Modules' },
    { value: '4', label: 'Communication Channels' },
    { value: '99.9%', label: 'Uptime SLA' },
    { value: '24/7', label: 'Support Available' },
  ];

  return (
    <div className="public-page">
      <div className="public-page-container">

        {/* Hero */}
        <div className="public-hero">
          <span className="public-hero-badge"><FiStar style={{ fontSize: 12 }} /> Products</span>
          <h1>Everything you need to<br />run your business</h1>
          <p>
            Noxtm brings project management, communication, HR, finance, and marketing into a single platform — so you can stop switching between tools and start building.
          </p>
          <div className="public-btn-group" style={{ marginTop: 28 }}>
            <Link to="/signup" className="public-btn public-btn-primary">Get Started Free <FiArrowRight /></Link>
            <Link to="/pricing" className="public-btn public-btn-outline">View Pricing</Link>
          </div>
        </div>

        {/* Platform Numbers */}
        <div className="products-stats-grid">
          {platformNumbers.map((s, i) => (
            <div className="products-stat-card" key={i}>
              <h3>{s.value}</h3>
              <p>{s.label}</p>
            </div>
          ))}
        </div>

        {/* Core Platform */}
        <div className="products-section-heading">
          <span className="products-section-label">Core Platform</span>
          <h2 className="public-section-title">Essential tools that power every workspace</h2>
          <p className="public-section-subtitle">The foundation of Noxtm. Available on all plans.</p>
        </div>
        <div className="products-feature-grid">
          {coreModules.map((m, i) => (
            <div className="products-feature-card" key={i}>
              <div className="products-feature-icon" style={{ background: m.color + '12', color: m.color }}>
                {m.icon}
              </div>
              <h3>{m.name}</h3>
              <p>{m.desc}</p>
              <ul className="products-feature-highlights">
                {m.highlights.map((h, hi) => (
                  <li key={hi}><FiCheckCircle style={{ color: m.color, flexShrink: 0 }} /> {h}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <hr className="public-divider" />

        {/* Communication */}
        <div className="products-section-heading">
          <span className="products-section-label">Communication</span>
          <h2 className="public-section-title">Connect across every channel</h2>
          <p className="public-section-subtitle">Built-in messaging, email, chat widgets, and WhatsApp — all from one dashboard.</p>
        </div>
        <div className="products-comm-grid">
          {communicationTools.map((m, i) => (
            <div className="products-comm-card" key={i}>
              <div className="products-comm-top">
                <div className="products-comm-icon" style={{ background: m.color + '12', color: m.color }}>
                  {m.icon}
                </div>
                <span className="products-comm-tag">{m.tag}</span>
              </div>
              <h3>{m.name}</h3>
              <p>{m.desc}</p>
            </div>
          ))}
        </div>

        <hr className="public-divider" />

        {/* Installable Modules */}
        <div className="products-section-heading">
          <span className="products-section-label">Modules</span>
          <h2 className="public-section-title">Extend your workspace</h2>
          <p className="public-section-subtitle">Purpose-built modules you can install and remove anytime. Pay only for what you use.</p>
        </div>
        <div className="products-module-grid">
          {modules.map((m, i) => (
            <div className="products-module-card" key={i}>
              <div className="products-module-header">
                <div className="products-module-icon" style={{ background: m.color + '15', color: m.color }}>
                  {m.icon}
                </div>
                <span className={`products-module-status ${m.status === 'Coming Soon' ? 'coming' : 'live'}`}>{m.status}</span>
              </div>
              <h3>{m.name}</h3>
              <p>{m.desc}</p>
            </div>
          ))}
        </div>

        <hr className="public-divider" />

        {/* Management */}
        <div className="products-section-heading">
          <span className="products-section-label">Operations</span>
          <h2 className="public-section-title">Run HR, finance & compliance</h2>
          <p className="public-section-subtitle">Everything your operations team needs, built right into the platform.</p>
        </div>
        <div className="products-ops-grid">
          {management.map((m, i) => (
            <div className="products-ops-card" key={i}>
              <div className="products-ops-icon" style={{ background: m.color + '12', color: m.color }}>
                {m.icon}
              </div>
              <div className="products-ops-content">
                <h3>{m.name}</h3>
                <p>{m.desc}</p>
                <div className="products-ops-features">
                  {m.features.map((f, fi) => (
                    <span key={fi}>{f}</span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="public-cta" style={{ marginTop: 16 }}>
          <h2>Ready to simplify your workflow?</h2>
          <p>Start your free trial today. No credit card required.</p>
          <div className="public-btn-group">
            <Link to="/signup" className="public-btn public-btn-primary">Get Started Free</Link>
            <Link to="/pricing" className="public-btn public-btn-outline">View Pricing</Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ProductsPage;
