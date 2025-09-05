import React from 'react';

function ExpenseManagement() {
  return (
    <div className="dashboard-card">
      <h2>Expense Management</h2>
      <p>Track, categorize, and manage business expenses and expenditures.</p>
      
      <div className="dashboard-grid">
        <div className="dashboard-card">
          <h3>Expense Tracking</h3>
          <p>Record and categorize business expenses and operational costs.</p>
        </div>
        
        <div className="dashboard-card">
          <h3>Expense Reports</h3>
          <p>Generate comprehensive expense reports and spending analysis.</p>
        </div>
        
        <div className="dashboard-card">
          <h3>Budget Management</h3>
          <p>Set budgets, track spending limits, and monitor expense allocations.</p>
        </div>
        
        <div className="dashboard-card">
          <h3>Receipt Management</h3>
          <p>Upload, store, and organize digital receipts and expense documentation.</p>
        </div>
      </div>
    </div>
  );
}

export default ExpenseManagement;
