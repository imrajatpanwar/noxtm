import React from 'react';
import './PolicyPages.css';

const Shipping = () => {
  return (
    <div className="policy-wrapper">
      <h1>Shipping Policy</h1>
      <p className="intro">While our platform is primarily digital, certain plans or services may include physical onboarding kits, documents, or hardware tokens. This policy explains how those are handled.</p>

      <section>
        <h2>1. Digital Delivery</h2>
        <p>Access to the platform, credentials, and feature provisioning are delivered electronically immediately after successful payment or activation.</p>
      </section>

      <section>
        <h2>2. Physical Items (If Applicable)</h2>
        <ul>
          <li>Items ship within 5–7 business days unless otherwise stated.</li>
          <li>Tracking details are emailed once dispatched.</li>
          <li>Delivery windows vary by region (typically 5–14 business days).</li>
        </ul>
      </section>

      <section>
        <h2>3. Shipping Regions</h2>
        <p>We currently ship physical materials to major regions where our services are offered. Some remote locations may incur additional carrier surcharges.</p>
      </section>

      <section>
        <h2>4. Customs & Duties</h2>
        <p>International recipients are responsible for any import duties, taxes, or brokerage fees assessed by local authorities.</p>
      </section>

      <section>
        <h2>5. Address Accuracy</h2>
        <p>Please verify shipping addresses before finalizing orders. Reshipment due to incorrect addresses may incur additional fees.</p>
      </section>

      <section>
        <h2>6. Lost or Damaged Items</h2>
        <ul>
          <li>Report non-delivery within 15 days of the expected arrival date.</li>
          <li>Report damaged items within 3 days of receipt with photos.</li>
          <li>We may replace or credit at our discretion after carrier investigation.</li>
        </ul>
      </section>

      <section>
        <h2>7. Ownership Transfer</h2>
        <p>Risk of loss passes to you upon confirmed delivery by the carrier. Title transfers upon full payment.</p>
      </section>

      <section>
        <h2>8. Changes & Cancellations</h2>
        <p>Physical orders can be modified within 12 hours of placement. After fulfillment begins we cannot guarantee interception.</p>
      </section>

      <section>
        <h2>9. Contact</h2>
        <p>For shipping questions reach out through our Contact page with your order or workspace reference.</p>
      </section>

      <footer className="policy-footer">Last updated: {new Date().getFullYear()}</footer>
    </div>
  );
};

export default Shipping;