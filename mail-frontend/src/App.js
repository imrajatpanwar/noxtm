import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Home from './components/Home';
import Inbox from './components/Inbox';
import ProtectedRoute from './components/ProtectedRoute';
import './App.css';
import { MAIL_LOGIN_URL } from './config/authConfig';

// Component to handle external redirects (can't use Navigate for external URLs)
const ExternalRedirect = ({ url }) => {
  useEffect(() => {
    window.location.href = url;
  }, [url]);

  return <div>Redirecting to login...</div>;
};

function App() {
  return (
    <Router>
      <Routes>
        {/* Root path - Mail Dashboard (Protected) */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Inbox />
            </ProtectedRoute>
          }
        />

        {/* Public home/landing page */}
        <Route path="/home" element={<Home />} />

        {/* Redirect /login to main app - use component that handles external redirect */}
        <Route path="/login" element={<ExternalRedirect url={MAIL_LOGIN_URL} />} />

        {/* Legacy /inbox route - redirect to root */}
        <Route
          path="/inbox"
          element={<Navigate to="/" replace />}
        />
      </Routes>
    </Router>
  );
}

export default App;
