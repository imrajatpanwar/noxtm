import React from 'react';
import './PolicyPages.css';

const PrivacyPolicy = () => {
  return (
    <div className="policy-wrapper">
      <h1>Privacy Policy</h1>
      <p className="intro">We respect your privacy and are committed to transparent data practices. This policy describes what we collect, why, and how you control it.</p>

      <section>
        <h2>1. Data We Collect</h2>
        <ul>
          <li><strong>Account Data:</strong> Name, email, role, workspace metadata.</li>
          <li><strong>Usage Data:</strong> Feature interactions, device/browser info, timestamps.</li>
          <li><strong>Content Data:</strong> Information you intentionally store (projects, notes, files).</li>
          <li><strong>Support Data:</strong> Messages, attachments, diagnostic logs.</li>
        </ul>
      </section>

      <section>
        <h2>2. How We Use Data</h2>
        <ul>
          <li>Provide and secure the platform.</li>
          <li>Improve features via aggregated analytics.</li>
          <li>Communicate service updates and security notices.</li>
          <li>Comply with legal obligations and enforce policies.</li>
        </ul>
      </section>

      <section>
        <h2>3. Cookies & Tracking</h2>
        <p>We use essential cookies for authentication and session continuity, and optional analytics cookies for product improvement. You can control non-essential cookies in your browser.</p>
      </section>

      <section>
        <h2>4. Data Sharing</h2>
        <p>We do not sell personal data. Limited sharing occurs with infrastructure, analytics, and security vendors under strict contractual safeguards.</p>
      </section>

      <section>
        <h2>5. International Transfers</h2>
        <p>Data may be processed in multiple regions. We implement standard contractual clauses or equivalent safeguards where required.</p>
      </section>

      <section>
        <h2>6. Data Retention</h2>
        <p>Account data is retained while your subscription is active. Backups and logs are cycled on rotation schedules. Deleted workspaces enter a 30-day recovery window.</p>
      </section>

      <section>
        <h2>7. Your Rights</h2>
        <ul>
          <li>Access, export, rectify, or delete your personal data.</li>
          <li>Object to marketing communications.</li>
          <li>Request restriction in certain lawful cases.</li>
        </ul>
      </section>

      <section>
        <h2>8. Security</h2>
        <p>We apply encryption in transit, access controls, audit logging, and routine vulnerability reviews. No method is 100% secure, but we continually strengthen controls.</p>
      </section>

      <section>
        <h2>9. Third-Party Links</h2>
        <p>Linked external services are governed by their own privacy statements. Review those before sharing data.</p>
      </section>

      <section>
        <h2>10. Children</h2>
        <p>The platform is not directed to children under 16. We do not knowingly collect their data. If found, we will delete it.</p>
      </section>

      <section>
        <h2>11. Changes</h2>
        <p>Material changes to this policy will be announced via email or in-app notice before taking effect.</p>
      </section>

      <section>
        <h2>12. Contact</h2>
        <p>Privacy inquiries can be submitted through the Contact page.</p>
      </section>

      <footer className="policy-footer">Last updated: {new Date().getFullYear()}</footer>
    </div>
  );
};

export default PrivacyPolicy;