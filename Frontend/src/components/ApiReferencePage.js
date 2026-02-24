import React from 'react';
import { Link } from 'react-router-dom';
import './PublicPages.css';

const apiGroups = [
  {
    title: 'Authentication',
    desc: 'Register, login, and manage user sessions.',
    endpoints: [
      { method: 'POST', path: '/api/register', desc: 'Create a new account' },
      { method: 'POST', path: '/api/login', desc: 'Authenticate and receive a JWT' },
      { method: 'POST', path: '/api/logout', desc: 'End the current session' },
      { method: 'POST', path: '/api/send-verification-code', desc: 'Send email verification code' },
      { method: 'POST', path: '/api/verify-code', desc: 'Verify email code' },
      { method: 'POST', path: '/api/forgot-password', desc: 'Request password reset' },
      { method: 'POST', path: '/api/reset-password', desc: 'Reset password with code' },
    ]
  },
  {
    title: 'Profile',
    desc: 'Read and update the authenticated user\'s profile.',
    endpoints: [
      { method: 'GET', path: '/api/profile', desc: 'Get current user profile' },
      { method: 'PUT', path: '/api/profile', desc: 'Update profile details' },
      { method: 'PUT', path: '/api/profile/password', desc: 'Change password' },
      { method: 'POST', path: '/api/profile/upload-image', desc: 'Upload profile image' },
      { method: 'DELETE', path: '/api/profile/picture', desc: 'Remove profile picture' },
    ]
  },
  {
    title: 'Company',
    desc: 'Set up and manage your workspace company.',
    endpoints: [
      { method: 'POST', path: '/api/company/setup', desc: 'Create a new company' },
      { method: 'GET', path: '/api/company/details', desc: 'Get company details' },
      { method: 'GET', path: '/api/company/members', desc: 'List all members' },
      { method: 'POST', path: '/api/company/invite', desc: 'Invite a team member' },
      { method: 'POST', path: '/api/company/invite/:token/accept', desc: 'Accept an invitation' },
      { method: 'DELETE', path: '/api/company/members/:memberId', desc: 'Remove a member' },
      { method: 'PUT', path: '/api/company/members/:memberId/permissions', desc: 'Update member permissions' },
    ]
  },
  {
    title: 'Users & Roles',
    desc: 'Manage users, roles, and permissions within your company.',
    endpoints: [
      { method: 'GET', path: '/api/users', desc: 'List company users' },
      { method: 'GET', path: '/api/users/company-members', desc: 'List company members' },
      { method: 'GET', path: '/api/roles', desc: 'Get available roles' },
      { method: 'PUT', path: '/api/users/:id', desc: 'Update a user' },
      { method: 'PUT', path: '/api/users/:userId/permissions', desc: 'Update user permissions' },
      { method: 'DELETE', path: '/api/users/:id', desc: 'Delete a user' },
    ]
  },
  {
    title: 'Clients',
    desc: 'Manage client records and communication.',
    endpoints: [
      { method: 'GET', path: '/api/clients', desc: 'List all clients' },
      { method: 'GET', path: '/api/clients/:id', desc: 'Get client by ID' },
      { method: 'POST', path: '/api/clients', desc: 'Create a client' },
      { method: 'PUT', path: '/api/clients/:id', desc: 'Update a client' },
      { method: 'DELETE', path: '/api/clients/:id', desc: 'Delete a client' },
      { method: 'POST', path: '/api/clients/:id/quote', desc: 'Create a quote' },
    ]
  },
  {
    title: 'Leads',
    desc: 'Track and manage your sales pipeline.',
    endpoints: [
      { method: 'GET', path: '/api/leads', desc: 'List leads with filters' },
      { method: 'GET', path: '/api/leads/:id', desc: 'Get lead by ID' },
      { method: 'POST', path: '/api/leads', desc: 'Create a lead' },
      { method: 'PUT', path: '/api/leads/:id', desc: 'Update a lead' },
      { method: 'PATCH', path: '/api/leads/:id/status', desc: 'Update lead status' },
      { method: 'DELETE', path: '/api/leads/:id', desc: 'Delete a lead' },
      { method: 'GET', path: '/api/leads/stats/summary', desc: 'Lead statistics' },
    ]
  },
  {
    title: 'Projects',
    desc: 'Create and manage projects with milestones and deliverables.',
    endpoints: [
      { method: 'GET', path: '/api/projects', desc: 'List projects' },
      { method: 'GET', path: '/api/projects/:id', desc: 'Get project by ID' },
      { method: 'POST', path: '/api/projects', desc: 'Create a project' },
      { method: 'PUT', path: '/api/projects/:id', desc: 'Update a project' },
      { method: 'DELETE', path: '/api/projects/:id', desc: 'Delete a project' },
      { method: 'PATCH', path: '/api/projects/:id/progress', desc: 'Update progress' },
      { method: 'POST', path: '/api/projects/:id/milestones', desc: 'Add a milestone' },
      { method: 'GET', path: '/api/projects/stats', desc: 'Project statistics' },
    ]
  },
  {
    title: 'Tasks',
    desc: 'Task creation, assignment, and status tracking.',
    endpoints: [
      { method: 'GET', path: '/api/tasks', desc: 'List tasks' },
      { method: 'GET', path: '/api/tasks/:id', desc: 'Get task by ID' },
      { method: 'POST', path: '/api/tasks', desc: 'Create a task' },
      { method: 'PUT', path: '/api/tasks/:id', desc: 'Update a task' },
      { method: 'PATCH', path: '/api/tasks/:id/status', desc: 'Update task status' },
      { method: 'PATCH', path: '/api/tasks/:id/assignees', desc: 'Update assignees' },
      { method: 'DELETE', path: '/api/tasks/:id', desc: 'Delete a task' },
    ]
  },
  {
    title: 'Products',
    desc: 'Manage your product catalog and inventory.',
    endpoints: [
      { method: 'GET', path: '/api/products', desc: 'List products' },
      { method: 'GET', path: '/api/products/:id', desc: 'Get product by ID' },
      { method: 'POST', path: '/api/products', desc: 'Create a product' },
      { method: 'PUT', path: '/api/products/:id', desc: 'Update a product' },
      { method: 'DELETE', path: '/api/products/:id', desc: 'Delete a product' },
      { method: 'GET', path: '/api/products/stats', desc: 'Product statistics' },
    ]
  },
  {
    title: 'Invoices',
    desc: 'Create, send, and track invoices.',
    endpoints: [
      { method: 'GET', path: '/api/invoices', desc: 'List invoices' },
      { method: 'POST', path: '/api/invoices', desc: 'Create an invoice' },
      { method: 'PUT', path: '/api/invoices/:id', desc: 'Update an invoice' },
      { method: 'PATCH', path: '/api/invoices/:id/status', desc: 'Update invoice status' },
      { method: 'GET', path: '/api/invoices/:id/pdf', desc: 'Download PDF' },
      { method: 'POST', path: '/api/invoices/:id/send', desc: 'Send via email' },
      { method: 'DELETE', path: '/api/invoices/:id', desc: 'Delete an invoice' },
    ]
  },
  {
    title: 'Email Campaigns',
    desc: 'Build and send email marketing campaigns.',
    endpoints: [
      { method: 'GET', path: '/api/campaigns', desc: 'List campaigns' },
      { method: 'POST', path: '/api/campaigns', desc: 'Create a campaign' },
      { method: 'PATCH', path: '/api/campaigns/:id', desc: 'Update a campaign' },
      { method: 'POST', path: '/api/campaigns/:id/send', desc: 'Send campaign' },
      { method: 'POST', path: '/api/campaigns/:id/schedule', desc: 'Schedule campaign' },
      { method: 'POST', path: '/api/campaigns/:id/test', desc: 'Send test email' },
      { method: 'DELETE', path: '/api/campaigns/:id', desc: 'Delete a campaign' },
    ]
  },
  {
    title: 'Contact Lists',
    desc: 'Manage contact lists for campaigns and outreach.',
    endpoints: [
      { method: 'GET', path: '/api/contact-lists', desc: 'List all contact lists' },
      { method: 'POST', path: '/api/contact-lists', desc: 'Create a contact list' },
      { method: 'POST', path: '/api/contact-lists/:id/contacts', desc: 'Add contacts' },
      { method: 'POST', path: '/api/contact-lists/import/csv', desc: 'Import from CSV' },
      { method: 'POST', path: '/api/contact-lists/:id/validate', desc: 'Validate contacts' },
      { method: 'DELETE', path: '/api/contact-lists/:id', desc: 'Delete a list' },
    ]
  },
  {
    title: 'WhatsApp',
    desc: 'WhatsApp Business API integration — accounts, messaging, and campaigns.',
    endpoints: [
      { method: 'GET', path: '/api/whatsapp/accounts', desc: 'List linked accounts' },
      { method: 'POST', path: '/api/whatsapp/accounts/link', desc: 'Link new account (QR)' },
      { method: 'POST', path: '/api/whatsapp/messages/send', desc: 'Send a message' },
      { method: 'GET', path: '/api/whatsapp/campaigns', desc: 'List campaigns' },
      { method: 'POST', path: '/api/whatsapp/campaigns', desc: 'Create a campaign' },
      { method: 'POST', path: '/api/whatsapp/campaigns/:id/start', desc: 'Start campaign' },
      { method: 'GET', path: '/api/whatsapp/chatbot', desc: 'Get chatbot config' },
      { method: 'PUT', path: '/api/whatsapp/chatbot', desc: 'Update chatbot config' },
    ]
  },
  {
    title: 'Trade Shows & Exhibitors',
    desc: 'Exhibit OS module — manage trade shows and exhibitor data.',
    endpoints: [
      { method: 'GET', path: '/api/trade-shows', desc: 'List trade shows' },
      { method: 'POST', path: '/api/trade-shows', desc: 'Create a trade show' },
      { method: 'GET', path: '/api/trade-shows/:tradeShowId/exhibitors', desc: 'List exhibitors' },
      { method: 'POST', path: '/api/trade-shows/:tradeShowId/exhibitors', desc: 'Add exhibitor' },
      { method: 'PUT', path: '/api/exhibitors/:id', desc: 'Update an exhibitor' },
      { method: 'DELETE', path: '/api/exhibitors/:id', desc: 'Delete an exhibitor' },
    ]
  },
  {
    title: 'Trending Services & Targeted Companies',
    desc: 'Agency OS module — manage services and targeted companies.',
    endpoints: [
      { method: 'GET', path: '/api/trending-services', desc: 'List trending services' },
      { method: 'POST', path: '/api/trending-services', desc: 'Create a service' },
      { method: 'GET', path: '/api/trending-services/:id/targeted-companies', desc: 'List companies' },
      { method: 'POST', path: '/api/trending-services/:id/targeted-companies', desc: 'Add company' },
      { method: 'PUT', path: '/api/targeted-companies/:id', desc: 'Update a company' },
      { method: 'DELETE', path: '/api/targeted-companies/:id', desc: 'Delete a company' },
    ]
  },
  {
    title: 'Modules',
    desc: 'Install and manage workspace modules.',
    endpoints: [
      { method: 'GET', path: '/api/modules/installed', desc: 'List installed modules' },
      { method: 'POST', path: '/api/modules/install', desc: 'Install a module' },
      { method: 'DELETE', path: '/api/modules/:moduleId/uninstall', desc: 'Uninstall a module' },
    ]
  },
  {
    title: 'Noxtm Mail',
    desc: 'Email infrastructure endpoints.',
    endpoints: [
      { method: 'GET', path: '/api/noxtm-mail/status', desc: 'Mail system status' },
      { method: 'POST', path: '/api/noxtm-mail/send', desc: 'Send an email' },
      { method: 'GET', path: '/api/noxtm-mail/logs', desc: 'View email logs' },
      { method: 'GET', path: '/api/noxtm-mail/stats', desc: 'Email statistics' },
      { method: 'GET', path: '/api/noxtm-mail/dns-check', desc: 'Check DNS records' },
    ]
  },
  {
    title: 'Blog',
    desc: 'Manage and publish blog content.',
    endpoints: [
      { method: 'GET', path: '/api/blogs', desc: 'List published blogs' },
      { method: 'GET', path: '/api/blogs/:slug', desc: 'Get blog by slug' },
      { method: 'POST', path: '/api/blogs', desc: 'Create blog post' },
      { method: 'PUT', path: '/api/blogs/:id', desc: 'Update blog post' },
      { method: 'DELETE', path: '/api/blogs/:id', desc: 'Delete blog post' },
    ]
  },
];

function ApiReferencePage() {
  return (
    <div className="public-page">
      <div className="public-page-container">
        {/* Hero */}
        <div className="public-hero">
          <span className="public-hero-badge">API Reference</span>
          <h1>Noxtm REST API</h1>
          <p>
            A complete reference for the Noxtm platform API. All endpoints require authentication via a Bearer token unless otherwise noted.
          </p>
        </div>

        {/* Auth Info */}
        <div className="docs-info-box" style={{ marginBottom: '40px' }}>
          <strong>Authentication:</strong> Include your JWT token in the <code style={{ background: '#dbeafe', padding: '2px 6px', borderRadius: '4px', fontSize: '12px' }}>Authorization</code> header as <code style={{ background: '#dbeafe', padding: '2px 6px', borderRadius: '4px', fontSize: '12px' }}>Bearer &lt;token&gt;</code>. Obtain a token via the <code style={{ background: '#dbeafe', padding: '2px 6px', borderRadius: '4px', fontSize: '12px' }}>POST /api/login</code> endpoint.
        </div>

        <div className="docs-code-block" style={{ marginBottom: '48px' }}>
          <code>
            <span className="code-comment">// Base URL</span>{'\n'}
            https://noxtm.com/api{'\n'}{'\n'}
            <span className="code-comment">// Example request</span>{'\n'}
            <span className="code-keyword">curl</span> -X GET https://noxtm.com/api/profile \{'\n'}
            {'  '}-H <span className="code-string">"Authorization: Bearer YOUR_TOKEN"</span> \{'\n'}
            {'  '}-H <span className="code-string">"Content-Type: application/json"</span>
          </code>
        </div>

        {/* Endpoint Groups */}
        {apiGroups.map((group, gi) => (
          <div className="api-endpoint-group" key={gi}>
            <h2>{group.title}</h2>
            <p>{group.desc}</p>
            {group.endpoints.map((ep, ei) => (
              <div className="api-endpoint-card" key={ei}>
                <span className={`api-method ${ep.method.toLowerCase()}`}>{ep.method}</span>
                <span className="api-path">{ep.path}</span>
                <span className="api-desc">{ep.desc}</span>
              </div>
            ))}
          </div>
        ))}

        <hr className="public-divider" />

        {/* Rate Limiting */}
        <h2 className="public-section-title">Rate Limiting</h2>
        <p className="public-section-subtitle" style={{ maxWidth: '100%' }}>
          API requests are rate-limited per user/IP. Email-related endpoints have stricter limits to prevent abuse. If you exceed the limit, you'll receive a <code style={{ background: '#f3f4f6', padding: '2px 6px', borderRadius: '4px', fontSize: '12px' }}>429 Too Many Requests</code> response.
        </p>

        {/* Error Codes */}
        <h2 className="public-section-title" style={{ marginTop: '40px' }}>Error Codes</h2>
        <div className="public-cards-grid public-cards-grid-2" style={{ marginBottom: '48px' }}>
          <div className="public-card">
            <h3>400 — Bad Request</h3>
            <p>Missing or invalid parameters. Check the request body and query parameters.</p>
          </div>
          <div className="public-card">
            <h3>401 — Unauthorized</h3>
            <p>Invalid or expired token. Re-authenticate via the login endpoint.</p>
          </div>
          <div className="public-card">
            <h3>403 — Forbidden</h3>
            <p>Insufficient permissions. Your role does not allow this action.</p>
          </div>
          <div className="public-card">
            <h3>404 — Not Found</h3>
            <p>The requested resource does not exist or belongs to a different company.</p>
          </div>
          <div className="public-card">
            <h3>429 — Rate Limited</h3>
            <p>Too many requests. Wait and retry after the cooldown period.</p>
          </div>
          <div className="public-card">
            <h3>500 — Server Error</h3>
            <p>An unexpected error occurred. Contact support if the issue persists.</p>
          </div>
        </div>

        {/* CTA */}
        <div className="public-cta">
          <h2>Need help integrating?</h2>
          <p>Check the documentation or reach out to our engineering team.</p>
          <div className="public-btn-group">
            <Link to="/documentation" className="public-btn public-btn-primary">Documentation</Link>
            <a href="mailto:hello@noxtm.com" className="public-btn public-btn-outline" style={{ textDecoration: 'none' }}>Contact Us</a>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ApiReferencePage;
