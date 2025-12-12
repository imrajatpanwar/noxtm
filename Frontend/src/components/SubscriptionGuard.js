import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRole } from '../contexts/RoleContext';
import { toast } from 'sonner';

const SubscriptionGuard = ({ children }) => {
  const navigate = useNavigate();
  const { currentUser } = useRole();
  const [loading, setLoading] = useState(true);
  const [hasValidSubscription, setHasValidSubscription] = useState(false);

  useEffect(() => {
    const checkSubscription = async () => {
      if (!currentUser) {
        setLoading(false);
        return;
      }

      // Admins bypass subscription checks
      if (currentUser.role && currentUser.role.toLowerCase() === 'admin') {
        setHasValidSubscription(true);
        setLoading(false);
        return;
      }

      try {
        const response = await fetch('/api/subscription/status', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });

        // If admin, always allow regardless of response
        if (currentUser.role && currentUser.role.toLowerCase() === 'admin') {
          setHasValidSubscription(true);
          setLoading(false);
          return;
        }

        const data = await response.json();
        // ...existing code...
        if (!data.subscription ||
          data.subscription.plan === 'None' ||
          (data.subscription.status !== 'active' &&
            data.subscription.status !== 'trial') ||
          (data.subscription.status === 'trial' &&
            data.subscription.endDate &&
            new Date(data.subscription.endDate) < new Date())) {
          toast.error('Please choose a subscription plan to access the dashboard');
          navigate('/pricing');
          return;
        }
        // ...existing code...
        if (window.location.pathname.startsWith('/solohq') &&
          currentUser.role === 'SOLOHQ' &&
          (!data.subscription ||
            data.subscription.plan !== 'SOLOHQ' ||
            data.subscription.status !== 'active')) {
          toast.error('SOLOHQ subscription required');
          navigate('/pricing');
          return;
        }
        setHasValidSubscription(true);
      } catch (error) {
        // If admin, always allow even on error
        if (currentUser.role && currentUser.role.toLowerCase() === 'admin') {
          setHasValidSubscription(true);
          setLoading(false);
          return;
        }
        console.error('Subscription check error:', error);
        toast.error('Failed to verify subscription status');
      } finally {
        setLoading(false);
      }
    };
    checkSubscription();
  }, [currentUser, navigate]);

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!currentUser || !hasValidSubscription) {
    return null;
  }

  return children;
};

export default SubscriptionGuard;