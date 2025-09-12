const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Security middleware
app.use((req, res, next) => {
  // Security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

// Middleware
app.use(cors({
  origin: [
    'http://noxtmstudio.com',
    'https://noxtmstudio.com',
    'http://localhost:3000', // Keep for local development if needed
    'http://localhost:3001'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Body parsing middleware with size limits
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Backend API only - frontend served separately
// Comment out static file serving since frontend runs on different port
// app.use(express.static(path.join(__dirname, '../Frontend/build')));

// MongoDB Connection with timeout and fallback
let mongoConnected = false;

const connectWithTimeout = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/noxtmstudio';
    console.log('Attempting to connect to MongoDB...');
    
    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 10000, // 10 second timeout
      connectTimeoutMS: 10000,
      maxPoolSize: 10, // Maintain up to 10 socket connections
      socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
    });
    console.log('✅ Connected to MongoDB successfully');
    mongoConnected = true;
  } catch (err) {
    console.error('❌ MongoDB connection failed:', err.message);
    console.warn('⚠️  Running without database - some features will be limited');
    mongoConnected = false;
  }
};

// Try to connect to MongoDB
connectWithTimeout();

const db = mongoose.connection;
db.on('error', (err) => {
  console.warn('MongoDB connection error:', err.message);
  mongoConnected = false;
});
db.once('open', () => {
  console.log('Connected to MongoDB');
  mongoConnected = true;
});

// User Schema
const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { 
    type: String, 
    required: true, 
    default: 'User',
    enum: [
      'User',
      'Admin',
      'Project Manager', 
      'Data Miner',
      'Data Analyst',
      'Social Media Manager',
      'Human Resource',
      'Graphic Designer',
      'Web Developer',
      'SEO Manager'
    ]
  },
  // Custom permissions that override role defaults
  permissions: {
    dashboard: { type: Boolean, default: true },
    dataCenter: { type: Boolean },
    projects: { type: Boolean },
    digitalMediaManagement: { type: Boolean },
    marketing: { type: Boolean },
    hrManagement: { type: Boolean },
    financeManagement: { type: Boolean },
    seoManagement: { type: Boolean },
    internalPolicies: { type: Boolean },
    settingsConfiguration: { type: Boolean }
  },
  access: [{
    type: String,
    enum: ['Data Cluster', 'Projects', 'Finance', 'Digital Media', 'Marketing']
  }],
  status: {
    type: String,
    required: true,
    default: 'Active',
    enum: ['Active', 'Inactive']
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Update the updatedAt field before saving
userSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

const User = mongoose.model('User', userSchema);

// JWT Secret - Use environment variable or generate a secure fallback
const JWT_SECRET = process.env.JWT_SECRET || 'noxtmstudio-fallback-secret-key-change-in-production';

if (!process.env.JWT_SECRET) {
  console.warn('⚠️  WARNING: Using fallback JWT secret. Set JWT_SECRET in environment variables for production!');
}

// Middleware to verify JWT token
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ message: 'Invalid token' });
    }
    req.user = user;
    next();
  });
};

// Middleware to require admin access
const requireAdmin = async (req, res, next) => {
  try {
    if (!mongoConnected) {
      return res.status(503).json({ 
        message: 'Database connection unavailable. Please try again later.' 
      });
    }

    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    if (user.role !== 'Admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }
    
    next();
  } catch (error) {
    console.error('Admin check error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Routes

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Server is running',
    timestamp: new Date().toISOString(),
    mongodb: mongoConnected ? 'connected' : 'disconnected'
  });
});

// Register
app.post('/api/register', async (req, res) => {
  try {
    const { username, email, password, role } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ $or: [{ email }, { username }] });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Hash password with configurable rounds
    const saltRounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Validate role if provided, otherwise default to 'User'
    const validRoles = ['User', 'Admin', 'Project Manager', 'Data Miner', 'Data Analyst', 'Social Media Manager', 'Human Resource', 'Graphic Designer', 'Web Developer', 'SEO Manager'];
    const userRole = role && validRoles.includes(role) ? role : 'User';

    // Get default permissions for the role
    const getDefaultPermissions = (userRole) => {
      const rolePermissions = {
        'User': {
          dashboard: false,
          dataCenter: false,
          projects: false,
          digitalMediaManagement: false,
          marketing: false,
          hrManagement: false,
          financeManagement: false,
          seoManagement: false,
          internalPolicies: false,
          settingsConfiguration: false
        },
        'Admin': {
          dashboard: true,
          dataCenter: true,
          projects: true,
          digitalMediaManagement: true,
          marketing: true,
          hrManagement: true,
          financeManagement: true,
          seoManagement: true,
          internalPolicies: true,
          settingsConfiguration: true
        },
        'Web Developer': {
          dashboard: true,
          dataCenter: false,
          projects: true,
          digitalMediaManagement: false,
          marketing: false,
          hrManagement: false,
          financeManagement: false,
          seoManagement: true,
          internalPolicies: false,
          settingsConfiguration: true
        },
        'Project Manager': {
          dashboard: true,
          dataCenter: true,
          projects: true,
          digitalMediaManagement: false,
          marketing: true,
          hrManagement: false,
          financeManagement: false,
          seoManagement: true,
          internalPolicies: false,
          settingsConfiguration: false
        },
        'Data Miner': {
          dashboard: true,
          dataCenter: true,
          projects: false,
          digitalMediaManagement: false,
          marketing: false,
          hrManagement: false,
          financeManagement: false,
          seoManagement: false,
          internalPolicies: false,
          settingsConfiguration: false
        },
        'Data Analyst': {
          dashboard: true,
          dataCenter: true,
          projects: false,
          digitalMediaManagement: false,
          marketing: false,
          hrManagement: false,
          financeManagement: false,
          seoManagement: true,
          internalPolicies: false,
          settingsConfiguration: false
        },
        'Social Media Manager': {
          dashboard: true,
          dataCenter: false,
          projects: false,
          digitalMediaManagement: true,
          marketing: true,
          hrManagement: false,
          financeManagement: false,
          seoManagement: true,
          internalPolicies: false,
          settingsConfiguration: false
        },
        'Human Resource': {
          dashboard: true,
          dataCenter: false,
          projects: false,
          digitalMediaManagement: false,
          marketing: false,
          hrManagement: true,
          financeManagement: false,
          seoManagement: false,
          internalPolicies: true,
          settingsConfiguration: false
        },
        'Graphic Designer': {
          dashboard: true,
          dataCenter: false,
          projects: true,
          digitalMediaManagement: true,
          marketing: true,
          hrManagement: false,
          financeManagement: false,
          seoManagement: false,
          internalPolicies: false,
          settingsConfiguration: false
        },
        'SEO Manager': {
          dashboard: true,
          dataCenter: true,
          projects: false,
          digitalMediaManagement: true,
          marketing: true,
          hrManagement: false,
          financeManagement: false,
          seoManagement: true,
          internalPolicies: false,
          settingsConfiguration: false
        }
      };
      return rolePermissions[userRole] || rolePermissions['User'];
    };

    // Get default access array based on permissions
    const getDefaultAccess = (permissions) => {
      const access = [];
      if (permissions.dataCenter) access.push('Data Cluster');
      if (permissions.projects) access.push('Projects');
      if (permissions.financeManagement) access.push('Finance');
      if (permissions.digitalMediaManagement) access.push('Digital Media');
      if (permissions.marketing) access.push('Marketing');
      return access;
    };

    const defaultPermissions = getDefaultPermissions(userRole);
    const defaultAccess = getDefaultAccess(defaultPermissions);

    // Create new user with specified role
    const user = new User({
      username,
      email,
      password: hashedPassword,
      role: userRole,
      access: defaultAccess,
      status: 'Active',
      permissions: defaultPermissions
    });

    await user.save();

    // Generate JWT token
    const token = jwt.sign({ userId: user._id, username: user.username }, JWT_SECRET);

    res.status(201).json({
      message: 'User created successfully',
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        access: user.access,
        permissions: user.permissions
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Login
app.post('/api/login', async (req, res) => {
  try {
    console.log('Login attempt:', { 
      body: req.body, 
      headers: req.headers['content-type'],
      timestamp: new Date().toISOString(),
      mongoConnected
    });

    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      console.log('Login failed: Missing email or password');
      return res.status(400).json({ message: 'Email and password are required' });
    }

    if (typeof email !== 'string' || typeof password !== 'string') {
      console.log('Login failed: Invalid data types');
      return res.status(400).json({ message: 'Invalid email or password format' });
    }

    // If MongoDB is not connected, return error
    if (!mongoConnected) {
      console.log('MongoDB not connected, cannot authenticate');
      return res.status(503).json({ 
        message: 'Database connection unavailable. Please try again later.' 
      });
    }

    // Find user in MongoDB
    const user = await User.findOne({ email: email.trim().toLowerCase() });
    if (!user) {
      console.log('Login failed: User not found for email:', email);
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Check password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      console.log('Login failed: Invalid password for email:', email);
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Generate JWT token
    const token = jwt.sign({ userId: user._id, username: user.username }, JWT_SECRET, {
      expiresIn: '24h'
    });

    console.log('Login successful for user:', user.email);

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        access: user.access,
        permissions: user.permissions
      }
    });
  } catch (error) {
    console.error('Login error:', {
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
    res.status(500).json({ message: 'Server error' });
  }
});

// Get user profile (protected route)
app.get('/api/profile', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    console.error('Profile error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Dashboard data (protected route)
app.get('/api/dashboard', authenticateToken, async (req, res) => {
  try {
    // This is where you would add dashboard-specific data
    // For now, just return some mock data
    res.json({
      message: 'Dashboard data retrieved successfully',
      data: {
        totalUsers: await User.countDocuments(),
        recentActivity: [
          { id: 1, action: 'User logged in', timestamp: new Date() },
          { id: 2, action: 'New user registered', timestamp: new Date() }
        ]
      }
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get user profile (protected route)
app.get('/api/profile', authenticateToken, async (req, res) => {
  try {
    if (!mongoConnected) {
      return res.status(503).json({ 
        message: 'Database connection unavailable. Please try again later.' 
      });
    }

    const user = await User.findById(req.user.userId).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({
      id: user._id,
      username: user.username,
      email: user.email,
      role: user.role,
      access: user.access,
      permissions: user.permissions,
      status: user.status,
      createdAt: user.createdAt
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get all users (protected route)
app.get('/api/users', authenticateToken, async (req, res) => {
  try {
    if (!mongoConnected) {
      return res.status(503).json({ 
        message: 'Database connection unavailable. Please try again later.' 
      });
    }

    const users = await User.find().select('-password').sort({ createdAt: -1 });
    
    // Ensure access array is synced with permissions for all users
    const usersWithSyncedAccess = users.map(user => {
      const accessArray = [];
      if (user.permissions.dataCenter) accessArray.push('Data Cluster');
      if (user.permissions.projects) accessArray.push('Projects');
      if (user.permissions.financeManagement) accessArray.push('Finance');
      if (user.permissions.digitalMediaManagement) accessArray.push('Digital Media');
      if (user.permissions.marketing) accessArray.push('Marketing');
      
      // Only update if access array is different
      if (JSON.stringify(user.access) !== JSON.stringify(accessArray)) {
        user.access = accessArray;
        user.save(); // Save in background, don't wait
      }
      
      return user;
    });
    
    res.json({
      message: 'Users retrieved successfully',
      users: usersWithSyncedAccess,
      total: usersWithSyncedAccess.length
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update user permissions (protected route - admin only)
app.put('/api/users/:userId/permissions', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    const { permissions } = req.body;

    console.log('Received permission update request:', { userId, permissions });

    if (!mongoConnected) {
      return res.status(503).json({ 
        message: 'Database connection unavailable. Please try again later.' 
      });
    }

    // Find user and update permissions
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Merge new permissions with existing ones
    user.permissions = { ...user.permissions, ...permissions };
    
    // Sync access array with permissions
    const accessArray = [];
    if (user.permissions.dataCenter) accessArray.push('Data Cluster');
    if (user.permissions.projects) accessArray.push('Projects');
    if (user.permissions.financeManagement) accessArray.push('Finance');
    if (user.permissions.digitalMediaManagement) accessArray.push('Digital Media');
    if (user.permissions.marketing) accessArray.push('Marketing');
    
    user.access = accessArray;
    user.updatedAt = new Date();
    
    console.log('Saving user with permissions:', user.permissions);
    console.log('Saving user with access:', user.access);
    
    await user.save();
    
    console.log('User saved successfully');

    res.json({
      message: 'User permissions updated successfully',
      user: {
        _id: user._id,
        permissions: user.permissions,
        access: user.access
      }
    });
  } catch (error) {
    console.error('Error updating user permissions:', error);
    if (error.name === 'ValidationError') {
      return res.status(400).json({ message: 'Invalid permissions data provided' });
    }
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Update user role and access (protected route)
app.put('/api/users/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { role, access, status } = req.body;

    if (!mongoConnected) {
      return res.status(503).json({ 
        message: 'Database connection unavailable. Please try again later.' 
      });
    }

    const updateData = {};
    if (role) updateData.role = role;
    if (access) updateData.access = access;
    if (status) updateData.status = status;
    updateData.updatedAt = new Date();

    const user = await User.findByIdAndUpdate(
      id, 
      updateData, 
      { new: true, runValidators: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({
      message: 'User updated successfully',
      user: user
    });
  } catch (error) {
    console.error('Update user error:', error);
    if (error.name === 'ValidationError') {
      return res.status(400).json({ message: 'Invalid data provided' });
    }
    res.status(500).json({ message: 'Server error' });
  }
});





// Delete user (protected route)
app.delete('/api/users/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoConnected) {
      return res.status(503).json({ 
        message: 'Database connection unavailable. Please try again later.' 
      });
    }

    const user = await User.findByIdAndDelete(id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({
      message: 'User deleted successfully'
    });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// API-only backend - no frontend serving
// Frontend is served on a different port

// Error handling for uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('❌ Uncaught Exception:', err);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM received, shutting down gracefully');
  mongoose.connection.close(() => {
    console.log('📦 MongoDB connection closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('🛑 SIGINT received, shutting down gracefully');
  mongoose.connection.close(() => {
    console.log('📦 MongoDB connection closed');
    process.exit(0);
  });
});

app.listen(PORT, () => {
  console.log('='.repeat(50));
  console.log(`🚀 Noxtm Studio Backend Server Started`);
  console.log('='.repeat(50));
  console.log(`🌐 Server running on port: ${PORT}`);
  console.log(`📡 API endpoints: http://noxtmstudio.com/api`);
  console.log(`🔍 Health check: http://noxtmstudio.com/api/health`);
  console.log(`🌐 MongoDB status: ${mongoConnected ? '✅ Connected' : '❌ Disconnected'}`);
  console.log(`🔐 JWT Secret: ${process.env.JWT_SECRET ? '✅ Set' : '⚠️  Using fallback'}`);
  console.log(`🏗️  Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log('='.repeat(50));
});
