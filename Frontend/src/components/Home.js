import React from 'react';
import { Link } from 'react-router-dom';
import './home.css';

function Home({ user }) {
  return (
    <div className="home">
      <div className="container">
        <h1>Welcome to React MongoDB App</h1>
        <p>
          A full-stack application built with React, Node.js, Express, and MongoDB.
          Perfect for deployment on Contabo servers.
        </p>
        
        {user ? (
          <div>
            <Link to="/dashboard" className="btn">
              Go to Dashboard
            </Link>
          </div>
        ) : (
          <div>
            <Link to="/login" className="btn">
              Login
            </Link>
            <Link to="/signup" className="btn btn-secondary">
              Sign Up
            </Link>
          </div>
        )}
        
        <div style={{ marginTop: '3rem', textAlign: 'left', maxWidth: '800px', margin: '3rem auto' }}>
          <h2>Features</h2>
          <ul style={{ fontSize: '1.1rem', lineHeight: '1.8' }}>
            <li>User authentication with JWT tokens</li>
            <li>Secure password hashing with bcrypt</li>
            <li>MongoDB database integration</li>
            <li>Responsive React frontend</li>
            <li>Express.js backend API</li>
            <li>Ready for production deployment</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

export default Home;
