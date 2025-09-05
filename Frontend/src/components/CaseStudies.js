import React from 'react';

function CaseStudies() {
  return (
    <>
      <h1>Case Studies</h1>
      <div className="dashboard-card">
        <h3>Success Stories & Case Studies</h3>
        <p>Explore detailed case studies showcasing our successful projects and client outcomes.</p>
        <p>Learn about challenges faced, solutions implemented, and results achieved.</p>
        <ul>
          <li>Detailed project breakdowns</li>
          <li>Before and after comparisons</li>
          <li>Client testimonials</li>
          <li>Measurable results and ROI</li>
        </ul>
      </div>
      
      <div className="dashboard-grid">
        <div className="dashboard-card">
          <h3>Featured Case Study</h3>
          <p><strong>E-commerce Revenue Boost</strong></p>
          <p>How we increased online sales by 300% for a retail client through strategic UX redesign and marketing automation.</p>
          <p><strong>Results:</strong></p>
          <ul>
            <li>300% increase in online revenue</li>
            <li>150% improvement in conversion rate</li>
            <li>40% reduction in cart abandonment</li>
          </ul>
        </div>
        
        <div className="dashboard-card">
          <h3>Industry Case Studies</h3>
          <div style={{ marginBottom: '0.5rem' }}>
            <p><strong>Healthcare:</strong> Patient Portal Development</p>
            <small style={{ color: '#666' }}>Improved patient engagement by 250%</small>
          </div>
          <div style={{ marginBottom: '0.5rem' }}>
            <p><strong>Finance:</strong> Trading Platform Redesign</p>
            <small style={{ color: '#666' }}>Reduced user errors by 80%</small>
          </div>
          <div style={{ marginBottom: '0.5rem' }}>
            <p><strong>Education:</strong> Learning Management System</p>
            <small style={{ color: '#666' }}>Increased course completion by 60%</small>
          </div>
        </div>
        
        <div className="dashboard-card">
          <h3>Case Study Metrics</h3>
          <p><strong>Total Case Studies:</strong> 45</p>
          <p><strong>Average ROI Improvement:</strong> 180%</p>
          <p><strong>Client Retention Rate:</strong> 92%</p>
          <p><strong>Success Rate:</strong> 98%</p>
        </div>
      </div>
    </>
  );
}

export default CaseStudies;
