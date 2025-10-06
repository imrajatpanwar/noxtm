import React from 'react';
import './PolicyPages.css';

const TermsConditions = () => {
  return (
    <div className="policy-wrapper">
      <h1>Terms & Conditions</h1>
      <p className="intro">These Terms govern your access to and use of our platform, services, APIs, and related applications. By creating an account or using the platform you agree to be bound by them.</p>

      <section>
        <h2>1. Definitions</h2>
        <p>"Platform" refers to the software services we provide. "User" means any individual accessing the platform. "Workspace" refers to an account environment owned by a subscribing entity or individual.</p>
      </section>

      <section>
        <h2>2. Acceptable Use</h2>
        <ul>
          <li>No reverse engineering or unauthorized scraping.</li>
          <li>No transmission of malware, spam, or abusive automation.</li>
          <li>No storing of illegal, hateful, or infringing content.</li>
          <li>API keys must be kept confidential and rotated if compromised.</li>
        </ul>
      </section>

      <section>
        <h2>3. Accounts & Security</h2>
        <p>You are responsible for safeguarding credentials. Notify us immediately if you suspect unauthorized access. We may suspend accounts involved in security breaches.</p>
      </section>

      <section>
        <h2>4. Subscription & Payment</h2>
        <p>Paid plans auto-renew unless cancelled. Pricing may change; renewals use current pricing with at least 30 days prior notice for increases.</p>
      </section>

      <section>
        <h2>5. Intellectual Property</h2>
        <p>The platform, trademarks, and code remain our property. You retain rights to your content and grant us a limited license to host and process it for service delivery.</p>
      </section>

      <section>
        <h2>6. Data & Privacy</h2>
        <p>We process personal data according to our Privacy Policy. You must obtain lawful rights to any personal data you upload.</p>
      </section>

      <section>
        <h2>7. Service Availability</h2>
        <p>We aim for high uptime but do not guarantee uninterrupted service. Planned maintenance will be announced in advance when practical.</p>
      </section>

      <section>
        <h2>8. Warranties Disclaimer</h2>
        <p>The platform is provided "as is" without warranties of merchantability, fitness for a particular purpose, or non-infringement.</p>
      </section>

      <section>
        <h2>9. Limitation of Liability</h2>
        <p>To the fullest extent permitted by law, our aggregate liability for any claim is limited to the fees paid in the 3 months preceding the incident.</p>
      </section>

      <section>
        <h2>10. Termination</h2>
        <p>We may suspend or terminate access for breach. You may terminate by cancelling subscriptions and discontinuing use. Clauses related to IP, confidentiality, and liability survive termination.</p>
      </section>

      <section>
        <h2>11. Changes</h2>
        <p>We may modify these Terms. Continued use after the effective date constitutes acceptance.</p>
      </section>

      <section>
        <h2>12. Contact</h2>
        <p>Questions about these Terms may be sent to support via the Contact page.</p>
      </section>

      <footer className="policy-footer">Last updated: {new Date().getFullYear()}</footer>
    </div>
  );
};

export default TermsConditions;