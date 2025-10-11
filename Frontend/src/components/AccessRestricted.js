import React from 'react';
import { useNavigate } from 'react-router-dom';
import './AccessRestricted.css';
import icebergImage from './image/iceberg.svg';
import explorerImage from './image/explorer.svg';

function AccessRestricted() {
  const navigate = useNavigate();

  // Automatically redirect to pricing page after a short delay
  React.useEffect(() => {
    const timer = setTimeout(() => {
      navigate('/pricing');
    }, 2000);
    return () => clearTimeout(timer);
  }, [navigate]);

  const handleReturnHome = () => {
    navigate('/');
  };

  return (
    <div className="access-restricted-page">
      <div className="access-restricted-container">
        {/* Left Side - Illustration */}
        <div className="illustration-section">
          <div className="iceberg-container">
            <img src={icebergImage} alt="Iceberg" className="iceberg-image" />
            <img src={explorerImage} alt="Explorer" className="explorer-image" />
          </div>
        </div>

        {/* Right Side - Content */}
        <div className="content-section">
          <div className="content-header">
            <p className="association-text">In association with Noxtm</p>
            <h1 className="brand-title">Noxtm</h1>
          </div>
          
          <div className="restricted-message">
            <p className="main-message">
              Access to Dashboard Features Requires an Upgrade
            </p>
            <p className="sub-message">
              You are being redirected to our pricing page where you can upgrade your account to access all dashboard features. If you believe this is a mistake, please contact support.
            </p>
          </div>

          <div className="return-section">
            <p className="return-text">
              <span className="return-link" onClick={handleReturnHome}>
                Return Home
              </span>
              {' '}for public resources.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AccessRestricted;
