const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// JWT Secret (same as main app)
const JWT_SECRET = process.env.JWT_SECRET || 'noxtm-fallback-secret-key-change-in-production';

// Get models (they're already registered in server.js)
const getUser = () => mongoose.model('User');

// Extension authentication - validates token
router.post('/validate', async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({
        success: false,
        message: 'Token is required'
      });
    }

    // Verify JWT token
    const decoded = jwt.verify(token, JWT_SECRET);

    // Get user from database
    const User = getUser();
    const user = await User.findById(decoded.userId).select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Return user data
    res.json({
      success: true,
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        companyId: user.companyId,
        subscription: user.subscription,
        permissions: user.permissions,
        access: user.access
      }
    });

  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token expired'
      });
    }
    console.error('Extension auth validation error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during validation'
    });
  }
});

// Extension login - same as regular login but optimized for extension
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required'
      });
    }

    // Get models
    const User = getUser();

    // Find user
    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password);

    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Generate JWT token (7 days for extension)
    const token = jwt.sign(
      {
        userId: user._id,
        fullName: user.fullName,
        email: user.email
      },
      JWT_SECRET,
      { expiresIn: '7d' } // 7 days for better extension UX
    );

    // Return token and user data
    res.json({
      success: true,
      token,
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        companyId: user.companyId,
        subscription: user.subscription,
        permissions: user.permissions,
        access: user.access
      }
    });

  } catch (error) {
    console.error('Extension login error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during login'
    });
  }
});

// Check if user has active session and return token if logged in
router.get('/check-session', async (req, res) => {
  try {
    // Check if user is authenticated via session
    if (!req.session || !req.session.userId) {
      return res.json({
        success: true,
        authenticated: false,
        message: 'No active session'
      });
    }

    // Get user from database
    const User = getUser();
    const user = await User.findById(req.session.userId).select('-password');

    if (!user) {
      return res.json({
        success: true,
        authenticated: false,
        message: 'User not found'
      });
    }

    // Generate JWT token (7 days for extension)
    const token = jwt.sign(
      {
        userId: user._id,
        fullName: user.fullName,
        email: user.email
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Return token and user data
    res.json({
      success: true,
      authenticated: true,
      token,
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        companyId: user.companyId,
        subscription: user.subscription,
        permissions: user.permissions,
        access: user.access
      }
    });

  } catch (error) {
    console.error('Extension session check error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during session check'
    });
  }
});

// Get user profile (requires valid token in Authorization header)
router.get('/profile', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'No token provided'
      });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Verify JWT token
    const decoded = jwt.verify(token, JWT_SECRET);

    // Get user from database
    const User = getUser();
    const user = await User.findById(decoded.userId).select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Return user data
    res.json({
      success: true,
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        companyId: user.companyId,
        subscription: user.subscription,
        permissions: user.permissions,
        access: user.access
      }
    });

  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token expired'
      });
    }
    console.error('Extension profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

module.exports = router;
