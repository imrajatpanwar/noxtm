import React from 'react';

function SeoInsights() {
  return (
    <div className="dashboard-card">
      <h2>SEO Insights</h2>
      
      <div className="seo-insights-container">
        <div className="seo-metrics">
          <h3>Search Engine Performance</h3>
          <div className="metrics-grid">
            <div className="metric-card">
              <h4>Organic Traffic</h4>
              <div className="metric-value">12,345</div>
              <div className="metric-change positive">+5.2%</div>
            </div>
            
            <div className="metric-card">
              <h4>Average Position</h4>
              <div className="metric-value">8.3</div>
              <div className="metric-change positive">+1.2</div>
            </div>
            
            <div className="metric-card">
              <h4>Click-Through Rate</h4>
              <div className="metric-value">3.1%</div>
              <div className="metric-change negative">-0.3%</div>
            </div>
            
            <div className="metric-card">
              <h4>Total Keywords</h4>
              <div className="metric-value">1,247</div>
              <div className="metric-change positive">+23</div>
            </div>
          </div>
        </div>
        
        <div className="seo-overview">
          <h3>SEO Overview</h3>
          <div className="overview-content">
            <div className="overview-item">
              <strong>Top Performing Keywords:</strong>
              <ul>
                <li>digital marketing agency - Position 3</li>
                <li>brand storytelling - Position 5</li>
                <li>creative marketing solutions - Position 7</li>
                <li>business growth strategy - Position 4</li>
              </ul>
            </div>
            
            <div className="overview-item">
              <strong>Recent Improvements:</strong>
              <ul>
                <li>Page load speed optimized (+15%)</li>
                <li>Mobile responsiveness enhanced</li>
                <li>Meta descriptions updated</li>
                <li>Internal linking structure improved</li>
              </ul>
            </div>
            
            <div className="overview-item">
              <strong>Recommendations:</strong>
              <ul>
                <li>Focus on long-tail keywords</li>
                <li>Improve content quality score</li>
                <li>Build more quality backlinks</li>
                <li>Optimize images with alt text</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
      
      <style jsx>{`
        .seo-insights-container {
          margin-top: 2rem;
        }
        
        .seo-metrics {
          margin-bottom: 2rem;
        }
        
        .metrics-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 1rem;
          margin-top: 1rem;
        }
        
        .metric-card {
          background: #f8f9fa;
          padding: 1.5rem;
          border-radius: 8px;
          text-align: center;
          border: 1px solid #e9ecef;
        }
        
        .metric-card h4 {
          margin: 0 0 0.5rem 0;
          color: #666;
          font-size: 0.875rem;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        
        .metric-value {
          font-size: 2rem;
          font-weight: bold;
          color: #333;
          margin-bottom: 0.5rem;
        }
        
        .metric-change {
          font-size: 0.875rem;
          font-weight: 500;
        }
        
        .metric-change.positive {
          color: #10b981;
        }
        
        .metric-change.negative {
          color: #ef4444;
        }
        
        .seo-overview h3 {
          margin-bottom: 1rem;
          color: #333;
        }
        
        .overview-content {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 2rem;
        }
        
        .overview-item {
          background: #f8f9fa;
          padding: 1.5rem;
          border-radius: 8px;
          border: 1px solid #e9ecef;
        }
        
        .overview-item strong {
          color: #333;
          display: block;
          margin-bottom: 1rem;
        }
        
        .overview-item ul {
          margin: 0;
          padding-left: 1.2rem;
        }
        
        .overview-item li {
          margin-bottom: 0.5rem;
          color: #666;
          line-height: 1.5;
        }
        
        @media (max-width: 768px) {
          .metrics-grid {
            grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
          }
          
          .overview-content {
            grid-template-columns: 1fr;
            gap: 1rem;
          }
          
          .metric-value {
            font-size: 1.5rem;
          }
        }
      `}</style>
    </div>
  );
}

export default SeoInsights;
