import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  FiBook, FiZap, FiUser, FiGrid, FiCheckSquare,
  FiUsers, FiFolder, FiMessageCircle, FiMail,
  FiMonitor, FiGlobe, FiTrendingUp, FiMessageSquare,
  FiArrowRight
} from 'react-icons/fi';
import './PublicPages.css';

const sections = [
  {
    id: 'getting-started',
    group: 'Getting Started',
    icon: <FiZap />,
    items: [
      { id: 'introduction', label: 'Introduction' },
      { id: 'quick-start', label: 'Quick Start Guide' },
      { id: 'account-setup', label: 'Account Setup' },
    ]
  },
  {
    id: 'platform',
    group: 'Platform',
    icon: <FiGrid />,
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
    icon: <FiMessageCircle />,
    items: [
      { id: 'team-messaging', label: 'Messaging' },
      { id: 'noxtm-mail', label: 'Noxtm Mail' },
      { id: 'noxtm-chat', label: 'Noxtm Chat' },
    ]
  },
  {
    id: 'modules',
    group: 'Modules',
    icon: <FiGlobe />,
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
          <span className="public-hero-badge"><FiBook style={{ fontSize: 13 }} /> Documentation</span>
          <h1>Noxtm Documentation</h1>
          <p>
            Everything you need to set up, configure, and get the most out of the Noxtm platform. From first login to advanced module configuration.
          </p>
        </div>

        {/* Quick Links */}
        <div className="docs-quick-links">
          <div className="docs-quick-link" onClick={() => scrollTo('quick-start')}>
            <FiZap className="docs-ql-icon" />
            <div>
              <h4>Quick Start</h4>
              <p>Get running in under 5 minutes</p>
            </div>
            <FiArrowRight className="docs-ql-arrow" />
          </div>
          <div className="docs-quick-link" onClick={() => scrollTo('dashboard')}>
            <FiGrid className="docs-ql-icon" />
            <div>
              <h4>Platform Guide</h4>
              <p>Explore dashboard and features</p>
            </div>
            <FiArrowRight className="docs-ql-arrow" />
          </div>
          <div className="docs-quick-link" onClick={() => scrollTo('exhibit-os')}>
            <FiGlobe className="docs-ql-icon" />
            <div>
              <h4>Modules</h4>
              <p>Exhibit OS, Agency OS, WhatsApp</p>
            </div>
            <FiArrowRight className="docs-ql-arrow" />
          </div>
        </div>

        {/* Sidebar Layout */}
        <div className="docs-sidebar-layout">
          <nav className="docs-sidebar">
            {sections.map(sec => (
              <div className="docs-sidebar-section" key={sec.id}>
                <h4>{sec.icon} {sec.group}</h4>
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
            <div className="docs-section-block" id="introduction">
              <h2>Introduction</h2>
              <p>
                Noxtm is an all-in-one business management platform designed for creative agencies, service businesses, and growing teams. It combines project management, CRM, HR, finance, communication, and marketing tools into a single workspace.
              </p>
              <p>
                Every Noxtm workspace is organized around your <strong>company</strong>. Once you create a company, you can invite team members, assign roles and permissions, and start managing your operations immediately.
              </p>
              <div className="docs-info-box">
                <strong>Tip:</strong> Noxtm uses a role-based access system. The company owner has full access. Invited members see only the sections their role permits.
              </div>
            </div>

            {/* Quick Start */}
            <div className="docs-section-block" id="quick-start">
              <h2>Quick Start Guide</h2>
              <p>Get up and running in under 5 minutes:</p>

              <div className="docs-step">
                <div className="docs-step-num">1</div>
                <div className="docs-step-content">
                  <h3>Create your account</h3>
                  <p>Sign up at <Link to="/signup" style={{ color: '#3b82f6', textDecoration: 'none', fontWeight: 500 }}>noxtm.com/signup</Link> with your email address. Verify via the 6-digit code sent to your inbox.</p>
                </div>
              </div>

              <div className="docs-step">
                <div className="docs-step-num">2</div>
                <div className="docs-step-content">
                  <h3>Set up your company</h3>
                  <p>After signing in, create a company by entering your company name, industry, and preferred currency. This becomes your workspace.</p>
                </div>
              </div>

              <div className="docs-step">
                <div className="docs-step-num">3</div>
                <div className="docs-step-content">
                  <h3>Invite your team</h3>
                  <p>Go to <strong>Settings &amp; Configuration &rarr; Users &amp; Roles</strong> to invite team members by email. Assign roles to control what each person can access.</p>
                </div>
              </div>

              <div className="docs-step">
                <div className="docs-step-num">4</div>
                <div className="docs-step-content">
                  <h3>Start managing</h3>
                  <p>Add your first client, create a project, assign tasks, and explore the dashboard analytics.</p>
                </div>
              </div>
            </div>

            {/* Account Setup */}
            <div className="docs-section-block" id="account-setup">
              <h2>Account Setup</h2>
              <p>Your profile settings are accessible from the avatar dropdown in the header. Here you can update:</p>
              <div className="docs-feature-list">
                <div className="docs-feature-item"><FiUser /> Full name and profile image</div>
                <div className="docs-feature-item"><FiMail /> Email and password</div>
                <div className="docs-feature-item"><FiMessageSquare /> Notification preferences</div>
                <div className="docs-feature-item"><FiGlobe /> Timezone and language</div>
              </div>
              <div className="docs-warning-box">
                <strong>Note:</strong> Only the company owner can change the subscription plan. Team members cannot modify billing settings.
              </div>
            </div>

            {/* Dashboard */}
            <div className="docs-section-block" id="dashboard">
              <h2>Dashboard</h2>
              <p>The Dashboard is your home screen. It displays an overview of your workspace including:</p>
              <div className="docs-feature-list">
                <div className="docs-feature-item"><FiGrid /> <strong>Overview widgets</strong> — Active projects, pending tasks, recent leads, revenue summary</div>
                <div className="docs-feature-item"><FiZap /> <strong>Activity feed</strong> — Latest actions across your workspace</div>
                <div className="docs-feature-item"><FiArrowRight /> <strong>Quick actions</strong> — Create tasks, add clients, or compose emails in one click</div>
              </div>
              <p>
                The sidebar gives you access to every section: Data Center, Projects, Communication, Marketing, HR, Finance, Policies, and Settings.
              </p>
            </div>

            {/* Task Manager */}
            <div className="docs-section-block" id="task-manager">
              <h2>Task Manager</h2>
              <p>
                Create tasks with titles, descriptions, due dates, priority levels, and assignees. Tasks can be linked to specific clients or projects.
              </p>
              <div className="docs-code-block">
                <code>
                  <span className="code-comment">// Task Status Flow</span>{'\n'}
                  Not Started &rarr; In Progress &rarr; In Review &rarr; Completed{'\n'}{'\n'}
                  <span className="code-comment">// Priority Levels</span>{'\n'}
                  Low | Medium | High | Urgent
                </code>
              </div>
              <p>
                Filter tasks by status, assignee, due date, or project. The task board supports both list and kanban views.
              </p>
            </div>

            {/* Clients & Leads */}
            <div className="docs-section-block" id="clients-leads">
              <h2>Clients &amp; Leads</h2>
              <p>
                The Data Center houses your lead pipeline and client database. Leads flow through customizable stages:
              </p>
              <div className="docs-code-block">
                <code>
                  <span className="code-comment">// Default Lead Stages</span>{'\n'}
                  Cold Lead &rarr; Warm Lead &rarr; Qualified (SQL) &rarr; Active &rarr; Dead Lead{'\n'}{'\n'}
                  <span className="code-comment">// Client fields</span>{'\n'}
                  Company Name, Contact Person, Email, Phone,{'\n'}
                  Industry, Source, Assigned To, Status, Notes
                </code>
              </div>
            </div>

            {/* Projects */}
            <div className="docs-section-block" id="projects">
              <h2>Projects</h2>
              <p>
                Group related tasks, files, and notes under a project. Each project can be assigned to a client and tracked with start/end dates and progress percentage.
              </p>
              <div className="docs-info-box">
                <strong>Tip:</strong> Use milestones to break large projects into phases. Each milestone can have its own tasks and due dates.
              </div>
            </div>

            {/* Messaging */}
            <div className="docs-section-block" id="team-messaging">
              <h2>Team Messaging</h2>
              <p>
                Noxtm includes built-in team messaging with real-time delivery, read receipts, file attachments, and emoji reactions. Create direct messages or group channels.
              </p>
              <p>
                Online team members are shown in the header. The messaging sidebar shows unread counts for each conversation.
              </p>
            </div>

            {/* Noxtm Mail */}
            <div className="docs-section-block" id="noxtm-mail">
              <h2>Noxtm Mail</h2>
              <p>
                Professional email hosting integrated directly into Noxtm. Access your email at <strong>mail.noxtm.com</strong> with automatic authentication from the main dashboard.
              </p>
              <p>
                Supports custom domains, signatures, templates, and bulk sending through the marketing module.
              </p>
            </div>

            {/* Noxtm Chat */}
            <div className="docs-section-block" id="noxtm-chat">
              <h2>Noxtm Chat</h2>
              <p>
                Embed a live chat widget on your website. Visitors can send messages that route to your team in real-time. The widget supports AI-powered auto-replies, custom branding, and agent assignment.
              </p>
            </div>

            {/* Exhibit OS */}
            <div className="docs-section-block" id="exhibit-os">
              <h2>Exhibit OS</h2>
              <p>
                A module for managing trade show participation. Create trade shows, track exhibitors, manage floor plans, and coordinate campaigns — all integrated with the <strong>Findr</strong> Chrome extension for on-site data collection.
              </p>
              <div className="docs-info-box">
                <strong>Mutual exclusion:</strong> Exhibit OS and Agency OS cannot be active simultaneously. Installing one will automatically deactivate the other.
              </div>
            </div>

            {/* Agency OS */}
            <div className="docs-section-block" id="agency-os">
              <h2>Agency OS</h2>
              <p>
                Built for digital marketing agencies. Manage trending services, track targeted companies, and coordinate outreach campaigns. Uses the same Findr Chrome extension with agency-specific workflows.
              </p>
            </div>

            {/* WhatsApp */}
            <div className="docs-section-block" id="whatsapp">
              <h2>WhatsApp Marketing</h2>
              <p>
                Connect your WhatsApp Business API to send broadcast campaigns, template messages, and track conversation metrics. Supports rate limiting and delivery analytics.
              </p>
            </div>

            <hr className="public-divider" />

            {/* CTA */}
            <div className="public-cta">
              <h2>Need more help?</h2>
              <p>Explore the API overview or reach out to our support team.</p>
              <div className="public-btn-group">
                <Link to="/api-reference" className="public-btn public-btn-primary">API Reference</Link>
                <a href="mailto:hello@noxtm.com" className="public-btn public-btn-outline" style={{ textDecoration: 'none' }}>Contact Support</a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default DocumentationPage;
