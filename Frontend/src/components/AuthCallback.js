import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Login.css';

/**
 * AuthCallback component handles the OAuth callback from Google.
 * It extracts the token from URL params, stores it, and redirects to dashboard.
 */
function AuthCallback({ onAuthCallback }) {
    const navigate = useNavigate();
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const handleCallback = async () => {
            const urlParams = new URLSearchParams(window.location.search);
            const token = urlParams.get('token');
            const errorParam = urlParams.get('error');

            if (errorParam) {
                setError('Authentication failed. Please try again.');
                setLoading(false);
                setTimeout(() => navigate('/login'), 2000);
                return;
            }

            if (!token) {
                setError('No authentication token received.');
                setLoading(false);
                setTimeout(() => navigate('/login'), 2000);
                return;
            }

            try {
                // Store the token
                localStorage.setItem('token', token);

                // Decode JWT to get user info (basic decode, not verification)
                const payload = JSON.parse(atob(token.split('.')[1]));

                // Fetch full user data from backend
                const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/users/me`, {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });

                if (response.ok) {
                    const userData = await response.json();
                    localStorage.setItem('user', JSON.stringify(userData.user || userData));

                    // Call the onAuthCallback if provided (to update app state)
                    if (onAuthCallback) {
                        onAuthCallback(token, userData.user || userData);
                    }

                    // Check subscription status for redirect
                    const user = userData.user || userData;
                    const subscription = user.subscription;
                    const hasValidSubscription = subscription && (
                        subscription.status === 'active' ||
                        (subscription.status === 'trial' && subscription.endDate && new Date(subscription.endDate) > new Date())
                    );

                    // Redirect based on subscription
                    if (hasValidSubscription || user.role === 'Admin') {
                        navigate('/dashboard');
                    } else {
                        navigate('/pricing');
                    }
                } else {
                    // Even if we can't fetch user data, we have the token
                    // Store basic info from JWT
                    localStorage.setItem('user', JSON.stringify({
                        userId: payload.userId,
                        email: payload.email,
                        role: payload.role
                    }));

                    if (onAuthCallback) {
                        onAuthCallback(token, { userId: payload.userId, email: payload.email, role: payload.role });
                    }

                    navigate('/dashboard');
                }
            } catch (err) {
                console.error('Auth callback error:', err);
                setError('Failed to complete authentication.');
                setLoading(false);
                setTimeout(() => navigate('/login'), 2000);
            }
        };

        handleCallback();
    }, [navigate, onAuthCallback]);

    return (
        <div className="login-page">
            <div className="login-centered-container">
                <div className="login-form" style={{ textAlign: 'center' }}>
                    {loading ? (
                        <>
                            <h2 style={{ marginBottom: '16px', color: '#111827' }}>Completing Sign In...</h2>
                            <p style={{ color: '#6b7280' }}>Please wait while we set up your account.</p>
                            <div style={{
                                marginTop: '24px',
                                width: '40px',
                                height: '40px',
                                border: '3px solid #e5e7eb',
                                borderTopColor: '#111827',
                                borderRadius: '50%',
                                animation: 'spin 1s linear infinite',
                                margin: '24px auto'
                            }} />
                            <style>{`
                @keyframes spin {
                  to { transform: rotate(360deg); }
                }
              `}</style>
                        </>
                    ) : (
                        <>
                            <h2 style={{ marginBottom: '16px', color: '#dc2626' }}>Authentication Error</h2>
                            <p style={{ color: '#6b7280' }}>{error}</p>
                            <p style={{ color: '#9ca3af', marginTop: '16px', fontSize: '14px' }}>Redirecting to login...</p>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}

export default AuthCallback;
