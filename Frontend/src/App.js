import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { Toaster } from 'sonner';
import Header from './components/Header';
import Home from './components/Home';
import Login from './components/Login';
import Signup from './components/Signup';
import Dashboard from './components/Dashboard';
import Footer from './components/Footer';

// Set base URL for axios - use the current domain
// This will work both locally and in production
axios.defaults.baseURL = window.location.origin;

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

  useEffect(() => {
    // Check if user is logged in on app start
    const token = localStorage.getItem('token');
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      checkAuthStatus();
    } else {
      setLoading(false);
    }
  }, []);

  const checkAuthStatus = async () => {
    // For local development without backend, skip profile check
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      setLoading(false);
      return;
    }
    
    // Production code - actual API call
    try {
      const response = await axios.get('/api/profile');
      setUser(response.data);
    } catch (error) {
      localStorage.removeItem('token');
      delete axios.defaults.headers.common['Authorization'];
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    try {
      // For local development without backend, use mock data
      if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        // Mock successful login (you can customize this for testing)
        const mockUser = {
          id: 'mock-user-id-' + Date.now(),
          username: 'testuser',
          email: email
        };
        const mockToken = 'mock-token-' + Date.now();
        
        localStorage.setItem('token', mockToken);
        setUser(mockUser);
        
        return { success: true };
      }
      
      // Production code - actual API call
      console.log('Attempting login for:', email);
      console.log('API base URL:', axios.defaults.baseURL);
      
      // Validate input before sending
      if (!email || !password) {
        return { 
          success: false, 
          message: 'Please enter both email and password.' 
        };
      }
      
      const response = await axios.post('/api/login', { 
        email: email.trim(), 
        password: password 
      }, {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 10000 // 10 second timeout
      });
      
      const { token, user } = response.data;
      
      if (!token || !user) {
        return { 
          success: false, 
          message: 'Invalid response from server. Please try again.' 
        };
      }
      
      localStorage.setItem('token', token);
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
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
    // For local development without backend, use mock data
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      // Mock successful registration
      const mockUser = {
        id: 'mock-user-id-' + Date.now(),
        username: username,
        email: email
      };
      const mockToken = 'mock-token-' + Date.now();
      
      localStorage.setItem('token', mockToken);
      setUser(mockUser);
      
      return { success: true };
    }
    
    // Production code - actual API call
    try {
      const response = await axios.post('/api/register', { username, email, password });
      const { token, user } = response.data;
      
      localStorage.setItem('token', token);
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      setUser(user);
      
      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        message: error.response?.data?.message || 'Registration failed' 
      };
    }
  };



  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        fontSize: '1.2rem',
        color: '#666'
      }}>
        Loading...
      </div>
    );
  }

  return (
    <Router>
      <div className="App">
        <Toaster position="top-right" richColors />
        <Header />
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
            element={user ? <Dashboard user={user} /> : <Navigate to="/login" />} 
          />
        </Routes>
        <ConditionalFooter />
      </div>
    </Router>
  );
}

export default App;
