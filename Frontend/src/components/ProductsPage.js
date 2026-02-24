import React from 'react';
import { Link } from 'react-router-dom';
import {
  FiGrid, FiTarget, FiUsers, FiMail, FiMessageCircle,
  FiBarChart2, FiDollarSign, FiShield, FiFileText, FiGlobe,
  FiPackage, FiUserCheck, FiSettings, FiLayers, FiZap
} from 'react-icons/fi';
import './PublicPages.css';

function ProductsPage() {
  const coreModules = [
    {
      icon: <FiGrid />, color: 'green', name: 'Dashboard & Overview',
      desc: 'Real-time analytics, task summaries, and team activity at a glance. Your command center for every project.'
    },
    {
      icon: <FiTarget />, color: 'blue', name: 'Task Manager',
      desc: 'Create, assign, and track tasks with deadlines, priorities, and status updates. Never miss a deliverable.'
    },
    {
      icon: <FiUsers />, color: 'purple', name: 'Client Management',
      desc: 'Store client details, track communication history, manage leads from first contact to conversion.'
    },
    {
      icon: <FiPackage />, color: 'orange', name: 'Products & Inventory',
      desc: 'Manage your product catalog with SKU tracking, pricing, stock levels, and category organization.'
    },
    {
      icon: <FiFileText />, color: 'green', name: 'Notes & Documents',
      desc: 'Rich-text notes linked to projects. Keep meeting minutes, briefs, and ideas organized in one place.'
    },
    {
      icon: <FiBarChart2 />, color: 'cyan', name: 'Lead Analytics',
      desc: 'Visualize your sales pipeline. Track lead sources, conversion rates, and revenue forecasts.'
    },
  ];

  const communicationTools = [
    {
      icon: <FiMessageCircle />, color: 'blue', name: 'Team Messaging',
      desc: 'Real-time direct messages, group channels, file sharing, and read receipts. Keep your team aligned.'
    },
    {
      icon: <FiMail />, color: 'rose', name: 'Noxtm Mail',
      desc: 'Built-in professional email with custom domains, templates, and seamless CRM integration.'
    },
    {
      icon: <FiMessageCircle />, color: 'green', name: 'Noxtm Chat',
      desc: 'AI-powered chatbot for your website. Automate support, capture leads, and route conversations.'
    },
    {
      icon: <FiMessageCircle />, color: 'purple', name: 'WhatsApp Marketing',
      desc: 'Broadcast campaigns, template messages, and conversation tracking through the WhatsApp Business API.'
    },
  ];

  const modules = [
    {
      icon: <FiGlobe />, color: '#3b82f6', name: 'Exhibit OS',
      desc: 'Manage trade shows, track exhibitors, and coordinate event campaigns with the Findr chrome extension.'
    },
    {
      icon: <FiGlobe />, color: '#f59e0b', name: 'Agency OS',
      desc: 'Trending service tracking and targeted company management for digital marketing agencies.'
    },
    {
      icon: <FiZap />, color: '#8b5cf6', name: 'Chat Automation',
      desc: 'AI-driven chatbot with configurable providers, roleplay personas, and intelligent response pacing.'
    },
    {
      icon: <FiLayers />, color: '#10b981', name: 'BotGit',
      desc: 'Connect AI bots to your workflow. Automate repetitive tasks and streamline data processing.'
    },
  ];

  const management = [
    {
      icon: <FiUserCheck />, color: 'purple', name: 'HR Management',
      desc: 'Attendance, interviews, holiday calendars, letter templates, employee lifecycle, and incentive tracking.'
    },
    {
      icon: <FiDollarSign />, color: 'orange', name: 'Finance Management',
      desc: 'Invoices, billing, payment records, and expense management with automated workflows.'
    },
    {
      icon: <FiShield />, color: 'slate', name: 'Internal Policies',
      desc: 'Company policies and handbook management. Keep your team informed and compliant.'
    },
    {
      icon: <FiSettings />, color: 'cyan', name: 'Settings & Integrations',
      desc: 'Users, roles, permissions, credentials, and third-party integrations all in one place.'
    },
  ];

  return (
    <div className="public-page">
      <div className="public-page-container">
        {/* Hero */}
        <div className="public-hero">
          <span className="public-hero-badge">Products</span>
          <h1>Everything you need to run your business</h1>
          <p>
            Noxtm brings project management, communication, HR, finance, and marketing into a single platform — so you can stop switching between tools and start building.
          </p>
        </div>

        {/* Core Platform */}
        <h2 className="public-section-title">Core Platform</h2>
        <p className="public-section-subtitle">Essential tools that power every Noxtm workspace.</p>
        <div className="public-cards-grid">
          {coreModules.map((m, i) => (
            <div className="public-card" key={i}>
              <div className={`public-card-icon ${m.color}`}>{m.icon}</div>
              <h3>{m.name}</h3>
              <p>{m.desc}</p>
            </div>
          ))}
        </div>

        {/* Communication */}
        <h2 className="public-section-title">Communication & Outreach</h2>
        <p className="public-section-subtitle">Connect with your team and customers across every channel.</p>
        <div className="public-cards-grid public-cards-grid-2">
          {communicationTools.map((m, i) => (
            <div className="public-card" key={i}>
              <div className={`public-card-icon ${m.color}`}>{m.icon}</div>
              <h3>{m.name}</h3>
              <p>{m.desc}</p>
            </div>
          ))}
        </div>

        {/* Installable Modules */}
        <h2 className="public-section-title">Installable Modules</h2>
        <p className="public-section-subtitle">Extend your workspace with purpose-built modules. Install only what you need.</p>
        <div className="products-module-grid">
          {modules.map((m, i) => (
            <div className="products-module-card" key={i}>
              <div className="products-module-header">
                <div className="products-module-icon" style={{ background: m.color + '18', color: m.color }}>
                  {m.icon}
                </div>
                <h3>{m.name}</h3>
              </div>
              <p>{m.desc}</p>
            </div>
          ))}
        </div>

        {/* Management */}
        <h2 className="public-section-title">Operations & Management</h2>
        <p className="public-section-subtitle">Run HR, finance, and compliance from the same dashboard.</p>
        <div className="public-cards-grid public-cards-grid-2">
          {management.map((m, i) => (
            <div className="public-card" key={i}>
              <div className={`public-card-icon ${m.color}`}>{m.icon}</div>
              <h3>{m.name}</h3>
              <p>{m.desc}</p>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="public-cta">
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
