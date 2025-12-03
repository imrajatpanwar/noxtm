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
        {/* Public home page */}
        <Route path="/" element={<Home />} />

        {/* Redirect /login to main app login with mail redirect */}
        <Route
          path="/login"
          element={<Navigate to="https://noxtm.com/login?redirect=mail" replace />}
        />

        {/* Protected inbox - requires authentication */}
        <Route
          path="/inbox"
          element={
            <ProtectedRoute>
              <Inbox />
            </ProtectedRoute>
          }
        />
      </Routes>
    </Router>
  );
}

export default App;
