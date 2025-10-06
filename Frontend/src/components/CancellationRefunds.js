import React from 'react';
import './PolicyPages.css';

const CancellationRefunds = () => {
  return (
    <div className="policy-wrapper">
      <h1>Cancellation & Refund Policy</h1>
      <p className="intro">We want you to feel confident using our platform. This policy explains how cancellations, downgrades, and refunds are handled for subscriptions and purchases.</p>

      <section>
        <h2>1. Subscription Billing Cycles</h2>
        <p>Subscriptions are billed either monthly or annually depending on the plan you selected. Each billing period begins immediately after a successful payment and renews automatically unless cancelled prior to renewal.</p>
      </section>

      <section>
        <h2>2. Free Tier & Trials</h2>
        <ul>
          <li>Our Solo HQ plan is free and can be used indefinitely.</li>
          <li>Trials (if offered) convert automatically to a paid plan unless cancelled before the trial ends.</li>
          <li>No charges occur until you explicitly upgrade from a free tier or trial.</li>
        </ul>
      </section>

      <section>
        <h2>3. Cancelling a Subscription</h2>
        <p>You may cancel at any time from the billing settings inside your dashboard. Cancellation stops the next renewal. Your current paid access remains active until the end of the billing period.</p>
        <ul>
          <li>No prorated credits are issued for unused time within an active billing cycle.</li>
          <li>After expiry, your workspace is downgraded to the free feature set; data remains securely stored.</li>
        </ul>
      </section>

      <section>
        <h2>4. Refund Eligibility</h2>
        <p>We stand behind the quality of our platform. Refunds are considered under the following circumstances:</p>
        <ul>
          <li>Duplicate payment or accidental double charge.</li>
          <li>Technical platform failure preventing core use for more than 72 consecutive hours.</li>
          <li>Unauthorized transaction (subject to verification).</li>
        </ul>
        <p>Change of mind, lack of use, or feature expectations that were not advertised do not qualify for refunds.</p>
      </section>

      <section>
        <h2>5. Annual Plan 14-Day Grace</h2>
        <p>Annual subscriptions may be refunded within 14 days of the initial charge if fewer than substantial usage thresholds (e.g., bulk export, automation runs) have been reached. This grace does not apply on renewal payments.</p>
      </section>

      <section>
        <h2>6. Downgrades</h2>
        <p>You can downgrade to a lower plan at any time. The downgrade will take effect at the start of the next billing cycle. Higher-tier features become read-only or hidden; no data is deleted for 30 days.</p>
      </section>

      <section>
        <h2>7. How to Request a Refund</h2>
        <ol>
          <li>Email support with subject: <strong>Refund Request</strong>.</li>
          <li>Include workspace name, invoice ID, and reason.</li>
          <li>Our team responds within 2–3 business days.</li>
        </ol>
        <p>Approved refunds are processed back to the original payment method. Processing times depend on your bank or card issuer.</p>
      </section>

      <section>
        <h2>8. Chargebacks</h2>
        <p>Initiating a chargeback without first contacting support may delay resolution. We reserve the right to suspend accounts engaged in fraudulent disputes.</p>
      </section>

      <section>
        <h2>9. Policy Updates</h2>
        <p>We may refine this policy as we expand services. Material changes will be communicated via email or in-app notifications prior to taking effect.</p>
      </section>

      <footer className="policy-footer">Last updated: {new Date().getFullYear()}</footer>
    </div>
  );
};

export default CancellationRefunds;