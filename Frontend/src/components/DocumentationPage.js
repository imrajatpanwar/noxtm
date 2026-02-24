import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import './PublicPages.css';

const sections = [
  {
    id: 'getting-started',
    group: 'Getting Started',
    items: [
      { id: 'introduction', label: 'Introduction' },
      { id: 'quick-start', label: 'Quick Start' },
      { id: 'account-setup', label: 'Account Setup' },
    ]
  },
  {
    id: 'platform',
    group: 'Platform',
    items: [
      { id: 'dashboard', label: 'Dashboard' },
      { id: 'task-manager', label: 'Task Manager' },
      { id: 'clients-leads', label: 'Clients & Leads' },
      { id: 'projects', label: 'Projects' },
    ]
  },
  {
    id: 'communication',
    group: 'Communication',
    items: [
      { id: 'team-messaging', label: 'Messaging' },
      { id: 'noxtm-mail', label: 'Noxtm Mail' },
      { id: 'noxtm-chat', label: 'Noxtm Chat' },
    ]
  },
  {
    id: 'modules',
    group: 'Modules',
    items: [
      { id: 'exhibit-os', label: 'Exhibit OS' },
      { id: 'agency-os', label: 'Agency OS' },
      { id: 'whatsapp', label: 'WhatsApp Marketing' },
    ]
  },
];

function DocumentationPage() {
  const [activeSection, setActiveSection] = useState('introduction');

  const scrollTo = (id) => {
    setActiveSection(id);
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="public-page">
      <div className="public-page-container">
        {/* Hero */}
        <div className="public-hero">
          <span className="public-hero-badge">Documentation</span>
          <h1>Noxtm Documentation</h1>
          <p>
            Everything you need to set up, configure, and get the most out of the Noxtm platform.
          </p>
        </div>

        {/* Sidebar Layout */}
        <div className="docs-sidebar-layout">
          <nav className="docs-sidebar">
            {sections.map(sec => (
              <div className="docs-sidebar-section" key={sec.id}>
                <h4>{sec.group}</h4>
                {sec.items.map(item => (
                  <span
                    key={item.id}
                    className={`docs-sidebar-link ${activeSection === item.id ? 'active' : ''}`}
                    onClick={() => scrollTo(item.id)}
                  >
                    {item.label}
                  </span>
                ))}
              </div>
            ))}
          </nav>

          <div className="docs-content">
            {/* Introduction */}
            <h2 id="introduction">Introduction</h2>
            <p>
              Noxtm is an all-in-one business management platform designed for creative agencies, service businesses, and growing teams. It combines project management, CRM, HR, finance, communication, and marketing tools into a single workspace.
            </p>
            <p>
              Every Noxtm workspace is organized around your <strong>company</strong>. Once you create a company, you can invite team members, assign roles and permissions, and start managing your operations immediately.
            </p>
            <div className="docs-info-box">
              <strong>Tip:</strong> Noxtm uses a role-based access system. The company owner has full access. Invited members see only the sections their role permits.
            </div>

            {/* Quick Start */}
            <h2 id="quick-start">Quick Start</h2>
            <p>Get up and running in under 5 minutes:</p>
            <h3>1. Create your account</h3>
            <p>
              Sign up at <Link to="/signup" style={{ color: '#3b82f6' }}>noxtm.com/signup</Link> with your email address. Verify via the 6-digit code sent to your inbox.
            </p>
            <h3>2. Set up your company</h3>
            <p>
              After signing in, you'll be prompted to create a company. Enter your company name, industry, and preferred currency. This becomes your workspace.
            </p>
            <h3>3. Invite your team</h3>
            <p>
              Go to <strong>Settings &amp; Configuration → Users &amp; Roles</strong> to invite team members by email. Assign roles to control what each person can access.
            </p>
            <h3>4. Start managing</h3>
            <p>
              Add your first client, create a project, assign tasks, and explore the dashboard analytics.
            </p>

            {/* Account Setup */}
            <h2 id="account-setup">Account Setup</h2>
            <p>
              Your profile settings are accessible from the avatar dropdown in the header. Here you can update:
            </p>
            <ul style={{ fontSize: '14px', color: '#4b5563', lineHeight: '2', paddingLeft: '20px' }}>
              <li>Full name and profile image</li>
              <li>Email and password</li>
              <li>Notification preferences</li>
              <li>Timezone and language</li>
            </ul>
            <div className="docs-warning-box">
              <strong>Note:</strong> Only the company owner can change the subscription plan. Team members cannot modify billing settings.
            </div>

            {/* Dashboard */}
            <h2 id="dashboard">Dashboard</h2>
            <p>
              The Dashboard is your home screen. It displays an overview of your workspace including:
            </p>
            <ul style={{ fontSize: '14px', color: '#4b5563', lineHeight: '2', paddingLeft: '20px' }}>
              <li><strong>Overview widgets</strong> — Active projects, pending tasks, recent leads, revenue summary</li>
              <li><strong>Activity feed</strong> — Latest actions across your workspace</li>
              <li><strong>Quick actions</strong> — Create tasks, add clients, or compose emails in one click</li>
            </ul>
            <p>
              The sidebar gives you access to every section: Data Center, Projects, Communication, Marketing, HR, Finance, Policies, and Settings.
            </p>

            {/* Task Manager */}
            <h2 id="task-manager">Task Manager</h2>
            <p>
              Create tasks with titles, descriptions, due dates, priority levels, and assignees. Tasks can be linked to specific clients or projects.
            </p>
            <div className="docs-code-block">
              <code>
                <span className="code-comment">// Task Status Flow</span>{'\n'}
                Not Started → In Progress → In Review → Completed{'\n'}{'\n'}
                <span className="code-comment">// Priority Levels</span>{'\n'}
                Low | Medium | High | Urgent
              </code>
            </div>
            <p>
              Filter tasks by status, assignee, due date, or project. The task board supports both list and kanban views.
            </p>

            {/* Clients & Leads */}
            <h2 id="clients-leads">Clients &amp; Leads</h2>
            <p>
              The Data Center houses your lead pipeline and client database. Leads flow through customizable stages:
            </p>
            <div className="docs-code-block">
              <code>
                <span className="code-comment">// Default Lead Stages</span>{'\n'}
                Cold Lead → Warm Lead → Qualified (SQL) → Active → Dead Lead{'\n'}{'\n'}
                <span className="code-comment">// Client fields</span>{'\n'}
                Company Name, Contact Person, Email, Phone,{'\n'}
                Industry, Source, Assigned To, Status, Notes
              </code>
            </div>

            {/* Projects */}
            <h2 id="projects">Projects</h2>
            <p>
              Group related tasks, files, and notes under a project. Each project can be assigned to a client and tracked with start/end dates and progress percentage.
            </p>

            {/* Messaging */}
            <h2 id="team-messaging">Team Messaging</h2>
            <p>
              Noxtm includes built-in team messaging with real-time delivery, read receipts, file attachments, and emoji reactions. Create direct messages or group channels.
            </p>
            <p>
              Online team members are shown in the header. The messaging sidebar shows unread counts for each conversation.
            </p>

            {/* Noxtm Mail */}
            <h2 id="noxtm-mail">Noxtm Mail</h2>
            <p>
              Professional email hosting integrated directly into Noxtm. Access your email at <strong>mail.noxtm.com</strong> with automatic authentication from the main dashboard.
            </p>
            <p>
              Supports custom domains, signatures, templates, and bulk sending through the marketing module.
            </p>

            {/* Noxtm Chat */}
            <h2 id="noxtm-chat">Noxtm Chat</h2>
            <p>
              Embed a live chat widget on your website. Visitors can send messages that route to your team in real-time. The widget supports AI-powered auto-replies, custom branding, and agent assignment.
            </p>

            {/* Exhibit OS */}
            <h2 id="exhibit-os">Exhibit OS</h2>
            <p>
              A module for managing trade show participation. Create trade shows, track exhibitors, manage floor plans, and coordinate campaigns — all integrated with the <strong>Findr</strong> Chrome extension for on-site data collection.
            </p>
            <div className="docs-info-box">
              <strong>Mutual exclusion:</strong> Exhibit OS and Agency OS cannot be active simultaneously. Installing one will automatically deactivate the other.
            </div>

            {/* Agency OS */}
            <h2 id="agency-os">Agency OS</h2>
            <p>
              Built for digital marketing agencies. Manage trending services, track targeted companies, and coordinate outreach campaigns. Uses the same Findr Chrome extension with agency-specific workflows.
            </p>

            {/* WhatsApp */}
            <h2 id="whatsapp">WhatsApp Marketing</h2>
            <p>
              Connect your WhatsApp Business API to send broadcast campaigns, template messages, and track conversation metrics. Supports rate limiting and delivery analytics.
            </p>

            <hr className="public-divider" />

            {/* CTA */}
            <div className="public-cta">
              <h2>Need more help?</h2>
              <p>Reach out to our support team or explore the API reference.</p>
              <div className="public-btn-group">
                <Link to="/api-reference" className="public-btn public-btn-primary">API Reference</Link>
                <a href="mailto:hello@noxtm.com" className="public-btn public-btn-outline">Contact Support</a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default DocumentationPage;
