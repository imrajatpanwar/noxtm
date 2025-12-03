import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Home from './components/Home';
import Inbox from './components/Inbox';
import ProtectedRoute from './components/ProtectedRoute';
import './App.css';

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

        {/* Redirect /login to main app login with mail redirect */}
        <Route
          path="/login"
          element={<Navigate to="https://noxtm.com/login?redirect=mail" replace />}
        />

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
