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
  status: {
    type: String,
    required: true,
    default: 'Active',
    enum: ['Active', 'Inactive', 'Terminated', 'In Review']
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
