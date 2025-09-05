import React from 'react';

function PaymentRecords() {
  return (
    <div className="dashboard-card">
      <h2>Payment Records</h2>
      <p>Track and manage all payment transactions and financial records.</p>
      
      <div className="dashboard-grid">
        <div className="dashboard-card">
          <h3>Transaction History</h3>
          <p>Complete record of all payment transactions and financial activities.</p>
        </div>
        
        <div className="dashboard-card">
          <h3>Payment Tracking</h3>
          <p>Track payment status, processing dates, and transaction details.</p>
        </div>
        
        <div className="dashboard-card">
          <h3>Financial Reports</h3>
          <p>Generate detailed financial reports and payment summaries.</p>
        </div>
        
        <div className="dashboard-card">
          <h3>Audit Trail</h3>
          <p>Maintain audit trails for compliance and financial record keeping.</p>
        </div>
      </div>
    </div>
  );
}

export default PaymentRecords;
