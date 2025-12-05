import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

function CampaignSetup() {
  const navigate = useNavigate();

  useEffect(() => {
    // Redirect to the new Campaign Dashboard
    navigate('/campaigns');
  }, [navigate]);

  return (
    <div style={{ padding: '40px', textAlign: 'center' }}>
      <p>Redirecting to Campaign Dashboard...</p>
    </div>
  );
}

export default CampaignSetup;
