import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import api from './config/api';
import 'bootstrap/dist/css/bootstrap.min.css';
import { Toaster } from 'sonner';
import { RoleProvider } from './contexts/RoleContext';
import { MessagingProvider } from './contexts/MessagingContext';
import { ModuleProvider } from './contexts/ModuleContext';
import Header from './components/Header';
import Home from './components/Home';
import Login from './components/Login';
import Signup from './components/Signup';
import ForgotPassword from './components/ForgotPassword';
import Pricing from './components/Pricing';
import Dashboard from './components/Dashboard';
import AccessRestricted from './components/AccessRestricted';
import CompanySetup from './components/CompanySetup';
import JoinCompany from './components/JoinCompany';
import Footer from './components/Footer';
import PublicBlogList from './components/PublicBlogList';
import BlogPost from './components/BlogPost';
import Legal from './components/Legal/Legal';
import InviteAccept from './components/InviteAccept';
import ExtensionLogin from './components/ExtensionLogin';
import ExtensionAuthCallback from './components/ExtensionAuthCallback';
import CampaignDashboard from './components/CampaignDashboard';
import CampaignWizard from './components/CampaignWizard';
import CampaignDetails from './components/CampaignDetails';
import ContactListManager from './components/ContactListManager';

// API configuration is now handled in config/api.js

function ConditionalFooter() {
  const location = useLocation();
  const hideFooterRoutes = ['/login', '/signup', '/forgot-password', '/dashboard', '/access-restricted', '/pricing', '/company-setup', '/join-company', '/extension-login', '/extension-auth-callback'];

  // Also hide footer on invite pages
  if (hideFooterRoutes.includes(location.pathname) || location.pathname.startsWith('/invite/')) {
    return null;
  }

  return <Footer />;
}

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);


  // Listen for storage changes (when other components update localStorage)
  useEffect(() => {
    const handleStorageChange = () => {
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        const userData = JSON.parse(storedUser);
        setUser(userData);
      }
    };

    // Listen for custom storage event
    window.addEventListener('userUpdated', handleStorageChange);

    return () => {
      window.removeEventListener('userUpdated', handleStorageChange);
    };
  }, []);

  useEffect(() => {
    // Check if user is logged in on app start
    const token = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');
    
    if (token && storedUser) {
      // Load user from localStorage first for immediate display
      const userData = JSON.parse(storedUser);
      setUser(userData);
      setLoading(false);
      
      // Then verify with backend
      checkAuthStatus();
    } else if (token) {
      // Token exists but no user data, fetch from backend
      checkAuthStatus();
    } else {
      setLoading(false);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const checkAuthStatus = async () => {
    try {
      const response = await api.get('/profile');
      const userData = response.data;
      setUser(userData);
      localStorage.setItem('user', JSON.stringify(userData));
      setError(null);
    } catch (error) {
      console.error('Auth check failed:', error);
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      setUser(null);
      
      // Only set error for network issues, not auth failures
      if (error.code === 'NETWORK_ERROR' || !error.response) {
        setError('Unable to connect to server. Please check your connection.');
      }
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    try {
      console.log('Attempting login for:', email);

      // Validate input before sending
      if (!email || !password) {
        return {
          success: false,
          message: 'Please enter both email and password.'
        };
      }

      const response = await api.post('/login', {
        email: email.trim(),
        password: password
      });

      const { token, user } = response.data;

      if (!token || !user) {
        return {
          success: false,
          message: 'Invalid response from server. Please try again.'
        };
      }

      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      setUser(user);

      // Trigger userUpdated event so RoleContext picks up the new user immediately
      window.dispatchEvent(new Event('userUpdated'));

      return { success: true, user };
    } catch (error) {
      console.error('Login error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        url: error.config?.url
      });
      
      let errorMessage = 'Login failed. Please try again.';
      
      if (error.response) {
        // Server responded with error status
        const status = error.response.status;
        const serverMessage = error.response.data?.message;
        
        if (status === 400) {
          errorMessage = serverMessage || 'Invalid email or password.';
        } else if (status === 500) {
          errorMessage = 'Server error. Please try again later.';
        } else if (status === 401) {
          errorMessage = 'Invalid credentials. Please check your email and password.';
        } else {
          errorMessage = serverMessage || `Server error (${status}). Please try again.`;
        }
      } else if (error.request) {
        // Network error - no response received
        errorMessage = 'Cannot connect to server. Please check your internet connection.';
      } else {
        // Other error
        errorMessage = error.message || 'An unexpected error occurred.';
      }
      
      return { 
        success: false, 
        message: errorMessage
      };
    }
  };

  const signup = async (fullName, email, password, role, additionalData) => {
    try {
      const signupData = {
        fullName,
        email,
        password,
        role,
        ...additionalData
      };
      
      const response = await api.post('/register', signupData);
      const { token, user } = response.data;
      
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      setUser(user);
      
      return { success: true, user };
    } catch (error) {
      return { 
        success: false, 
        message: error.response?.data?.message || 'Registration failed' 
      };
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  };

  // Helper function to check if user has restricted access
  // Now based on subscription status OR company membership
  const isUserRestricted = (user) => {
    if (!user) {
      console.log('No user found, restricting access');
      return true;
    }

    // Admin always has access
    if (user.role === 'Admin' || user.role === 'Lord') {
      return false;
    }

    // Check if user is a company member (invited employee)
    if (user.companyId) {
      console.log(`User: ${user.email}, Company Member: true, Has Access: true`);
      return false; // Allow access for company members
    }

    // Check if user has active subscription
    const hasActiveSubscription = user.subscription &&
                                   user.subscription.status === 'active' &&
                                   user.subscription.plan !== 'None';

    console.log(`User: ${user.email}, Subscription: ${user.subscription?.plan}, Status: ${user.subscription?.status}, Has Access: ${hasActiveSubscription}`);

    // Restrict access if no active subscription and not a company member
    return !hasActiveSubscription;
  };



  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        flexDirection: 'column',
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        fontSize: '1.2rem',
        color: '#666',
        gap: '1rem'
      }}>
        <div>Loading...</div>
        {error && (
          <div style={{ 
            color: '#ef4444', 
            fontSize: '1rem',
            textAlign: 'center',
            maxWidth: '400px'
          }}>
            {error}
          </div>
        )}
      </div>
    );
  }

  return (
    <RoleProvider>
      <ModuleProvider>
        <MessagingProvider>
          <Router>
          <div className="App">
          <Toaster 
            position="top-right" 
            richColors 
            toastOptions={{ 
              style: { zIndex: 10000 },
              className: 'toast-notification'
            }} 
            style={{ zIndex: 10000 }}
          />
          <Header user={user} onLogout={logout} />
          <Routes>
            <Route path="/" element={<Home user={user} />} />
            <Route
              path="/login"
              element={user ? <Navigate to="/dashboard" /> : <Login onLogin={login} />}
            />
            <Route
              path="/signup"
              element={<Signup onSignup={signup} />}
            />
            <Route
              path="/forgot-password"
              element={user ? <Navigate to="/dashboard" /> : <ForgotPassword />}
            />
            <Route path="/pricing" element={<Pricing />} />
            <Route
              path="/company-setup"
              element={
                user ? (
                  <CompanySetup />
                ) : (
                  <Navigate to="/login" />
                )
              }
            />
            <Route
              path="/join-company"
              element={<JoinCompany onSignup={signup} />}
            />
            <Route
              path="/dashboard"
              element={
                user ? (
                  isUserRestricted(user) ? (
                    // No active subscription - redirect to pricing via AccessRestricted
                    <AccessRestricted />
                  ) : (
                    // Has active subscription - allow access
                    <Dashboard user={user} onLogout={logout} />
                  )
                ) : (
                  // No user logged in - redirect to login
                  <Navigate to="/login" />
                )
              }
            />
            <Route
              path="/access-restricted"
              element={<AccessRestricted />}
            />
            <Route
              path="/campaigns"
              element={
                user ? (
                  isUserRestricted(user) ? (
                    <AccessRestricted />
                  ) : (
                    <CampaignDashboard />
                  )
                ) : (
                  <Navigate to="/login" />
                )
              }
            />
            <Route
              path="/campaign/wizard"
              element={
                user ? (
                  isUserRestricted(user) ? (
                    <AccessRestricted />
                  ) : (
                    <CampaignWizard />
                  )
                ) : (
                  <Navigate to="/login" />
                )
              }
            />
            <Route
              path="/campaign/wizard/:id"
              element={
                user ? (
                  isUserRestricted(user) ? (
                    <AccessRestricted />
                  ) : (
                    <CampaignWizard />
                  )
                ) : (
                  <Navigate to="/login" />
                )
              }
            />
            <Route
              path="/campaign/:id"
              element={
                user ? (
                  isUserRestricted(user) ? (
                    <AccessRestricted />
                  ) : (
                    <CampaignDetails />
                  )
                ) : (
                  <Navigate to="/login" />
                )
              }
            />
            <Route
              path="/contact-lists"
              element={
                user ? (
                  isUserRestricted(user) ? (
                    <AccessRestricted />
                  ) : (
                    <ContactListManager />
                  )
                ) : (
                  <Navigate to="/login" />
                )
              }
            />
            <Route path="/blog" element={<PublicBlogList />} />
            <Route path="/blog/:slug" element={<BlogPost />} />
            <Route path="/legal/*" element={<Legal />} />
            <Route path="/invite/:token" element={<InviteAccept />} />
            <Route path="/extension-login" element={<ExtensionLogin />} />
            <Route path="/extension-auth-callback" element={<ExtensionAuthCallback />} />
          </Routes>
          <ConditionalFooter />
        </div>
          </Router>
        </MessagingProvider>
      </ModuleProvider>
    </RoleProvider>
  );
}

export default App;
