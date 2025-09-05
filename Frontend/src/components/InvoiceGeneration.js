import React from 'react';

function InvoiceGeneration() {
  return (
    <div className="dashboard-card">
      <h2>Invoice Generation</h2>
      <p>Create, customize, and manage professional invoices for clients.</p>
      
      <div className="dashboard-grid">
        <div className="dashboard-card">
          <h3>Create Invoice</h3>
          <p>Generate new invoices with customizable templates and billing details.</p>
        </div>
        
        <div className="dashboard-card">
          <h3>Invoice Templates</h3>
          <p>Design and manage professional invoice templates and layouts.</p>
        </div>
        
        <div className="dashboard-card">
          <h3>Recurring Invoices</h3>
          <p>Set up automatic recurring invoices for subscription-based services.</p>
        </div>
        
        <div className="dashboard-card">
          <h3>Invoice History</h3>
          <p>View, search, and manage previously generated invoices and records.</p>
        </div>
      </div>
    </div>
  );
}

export default InvoiceGeneration;
