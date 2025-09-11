import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import api from './config/api';
import { Toaster } from 'sonner';
import { RoleProvider } from './contexts/RoleContext';
import Header from './components/Header';
import Home from './components/Home';
import Login from './components/Login';
import Signup from './components/Signup';
import Dashboard from './components/Dashboard';
import Footer from './components/Footer';

// API configuration is now handled in config/api.js

function ConditionalFooter() {
  const location = useLocation();
  const hideFooterRoutes = ['/login', '/signup', '/dashboard'];
  
  if (hideFooterRoutes.includes(location.pathname)) {
    return null;
  }
  
  return <Footer />;
}

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Check if user is logged in on app start
    const token = localStorage.getItem('token');
    if (token) {
      checkAuthStatus();
    } else {
      setLoading(false);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const checkAuthStatus = async () => {
    try {
      const response = await api.get('/profile');
      setUser(response.data);
      setError(null);
    } catch (error) {
      console.error('Auth check failed:', error);
      localStorage.removeItem('token');
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
      setUser(user);
      
      return { success: true };
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

  const signup = async (username, email, password) => {
    try {
      const response = await api.post('/register', { username, email, password });
      const { token, user } = response.data;
      
      localStorage.setItem('token', token);
      setUser(user);
      
      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        message: error.response?.data?.message || 'Registration failed' 
      };
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
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
      <Router>
        <div className="App">
          <Toaster position="top-right" richColors />
          <Header user={user} onLogout={logout} />
          <Routes>
            <Route path="/" element={<Home user={user} />} />
            <Route 
              path="/login" 
              element={user ? <Navigate to="/dashboard" /> : <Login onLogin={login} />} 
            />
            <Route 
              path="/signup" 
              element={user ? <Navigate to="/dashboard" /> : <Signup onSignup={signup} />} 
            />
            <Route 
              path="/dashboard" 
              element={user ? <Dashboard user={user} onLogout={logout} /> : <Navigate to="/login" />} 
            />
          </Routes>
          <ConditionalFooter />
        </div>
      </Router>
    </RoleProvider>
  );
}

export default App;
