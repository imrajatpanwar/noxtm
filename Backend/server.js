const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const path = require('path');
const multer = require('multer');
const fs = require('fs');
const nodemailer = require('nodemailer');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const http = require('http');
const { Server } = require('socket.io');
require('dotenv').config();

const app = express();

// Trust proxy - MUST be set before importing rate limiters
app.set('trust proxy', true);

// Email security middleware
const {
  verificationEmailLimiter,
  passwordResetLimiter,
  invitationEmailLimiter,
  templateEmailLimiter,
  globalEmailLimiter
} = require('./middleware/emailRateLimit');
const { initializeEmailLogger, sendAndLogEmail, logEmail } = require('./middleware/emailLogger');
const { validateEmail, validateEmailMiddleware } = require('./middleware/emailValidator');
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: [
      'http://noxtm.com',
      'https://noxtm.com',
      'http://localhost:3000',
      'http://localhost:3001'
    ],
    credentials: true,
    methods: ['GET', 'POST', 'OPTIONS']
  },
  // Optimized Socket.IO configuration for low latency messaging
  transports: ['websocket', 'polling'],  // Prefer WebSocket first for lower latency
  pingInterval: 10000,          // Send ping every 10 seconds (faster connection check)
  pingTimeout: 20000,           // Wait 20 seconds for pong (faster disconnect detection)
  maxHttpBufferSize: 1e6,       // 1MB max buffer size
  allowEIO3: true,              // Support EIO3 protocol for compatibility
  connectTimeout: 10000,        // 10 second connection timeout (faster initial connection)
  allowUpgrades: true,          // Allow upgrading from polling to WebSocket
  upgradeTimeout: 3000,         // Upgrade to WebSocket within 3 seconds
  perMessageDeflate: false,     // Disable compression for lower latency
  httpCompression: false        // Disable HTTP compression for speed
});

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
    'http://noxtm.com',
    'https://noxtm.com',
    'chrome-extension://*', // Allow Chrome extension requests
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

// Extension authentication routes
const extensionAuthRoutes = require('./routes/extension-auth');
app.use('/api/extension-auth', extensionAuthRoutes);

// findr Extension routes (optimized endpoints)
const findrExtensionRoutes = require('./routes/findr-extension');
app.use('/api/findr', findrExtensionRoutes);

// Modules routes
const modulesRoutes = require('./routes/modules');
app.use('/api/modules', modulesRoutes);

// Trade Shows routes
const tradeShowsRoutes = require('./routes/trade-shows');
app.use('/api/trade-shows', tradeShowsRoutes);

// Client Management routes
const clientsRoutes = require('./routes/clients');
app.use('/api/clients', clientsRoutes);

// Invoice Management routes
const invoicesRoutes = require('./routes/invoices');
app.use('/api/invoices', invoicesRoutes);

// Leads Directory routes
const leadsRoutes = require('./routes/leads');
app.use('/api/leads', leadsRoutes);

// Exhibitors routes
const exhibitorsRoutes = require('./routes/exhibitors');
app.use('/api', exhibitorsRoutes);

// Backend API only - frontend served separately
// Comment out static file serving since frontend runs on different port
// app.use(express.static(path.join(__dirname, '../Frontend/build')));

console.log('✓ All routes loaded successfully');

// MongoDB Connection with timeout and fallback
let mongoConnected = false;

const connectWithTimeout = async () => {
  try {
    console.log('Step 1: Getting MongoDB URI...');
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/noxtm';
    console.log('Step 2: Attempting to connect to MongoDB...');
    
    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 10000, // 10 second timeout
      connectTimeoutMS: 10000,
      maxPoolSize: 10, // Maintain up to 10 socket connections
      socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
    });
    console.log('✅ Connected to MongoDB successfully');
    mongoConnected = true;
  } catch (err) {
    console.error('❌ MongoDB connection failed:', err.message);
    console.error('Full error:', err);
    console.warn('⚠️  Running without database - some features will be limited');
    mongoConnected = false;
  }
};

// Try to connect to MongoDB
console.log('Starting MongoDB connection...');
connectWithTimeout().then(() => {
  console.log('MongoDB connection attempt completed');
}).catch((err) => {
  console.error('Unexpected error in MongoDB connection:', err);
});

// Initialize Redis cache
const { initializeRedis } = require('./utils/emailCache');
console.log('Initializing Redis cache...');
initializeRedis().then((success) => {
  if (success) {
    console.log('✅ Redis cache initialized successfully');
  } else {
    console.warn('⚠️  Redis cache not available - running without cache');
  }
}).catch((err) => {
  console.error('Redis initialization error:', err);
});

// Lazy load template helper to avoid loading models before MongoDB connects
let sendTemplateEmail;
const getTemplateHelper = () => {
  if (!sendTemplateEmail) {
    sendTemplateEmail = require('./utils/emailTemplateHelper').sendTemplateEmail;
  }
  return sendTemplateEmail;
};

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
  fullName: { type: String, required: true },
  username: { type: String }, // Optional username
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, required: true, default: 'User' },
  // Profile fields
  profileImage: { type: String }, // Base64 or URL to profile image
  phoneNumber: { type: String },
  bio: { type: String, maxLength: 500 },
  lastLogin: { type: Date },
  // Company ID for multi-tenancy (Noxtm users only)
  companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company' },
  subscription: {
    plan: {
      type: String,
      enum: ['None', 'SoloHQ', 'Noxtm', 'Enterprise'],
      default: 'None'
    },
    status: {
      type: String,
      enum: ['active', 'inactive', 'pending'],
      default: 'inactive'
    },
    startDate: { type: Date },
    endDate: { type: Date }
  },
  // Custom permissions that override role defaults
  permissions: {
    dashboard: { type: Boolean, default: true },
    dataCenter: { type: Boolean },
    projects: { type: Boolean },
    teamCommunication: { type: Boolean },
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
    enum: ['Dashboard', 'Data Center', 'Projects', 'Team Communication', 'Digital Media Management', 'Marketing', 'HR Management', 'Finance Management', 'SEO Management', 'Internal Policies', 'Settings & Configuration']
  }],
  status: {
    type: String,
    required: true,
    default: 'Active',
    enum: ['Active', 'Inactive', 'Terminated', 'In Review']
  },
  // findr Chrome Extension Settings
  findrSettings: {
    selectedTradeShowId: { type: mongoose.Schema.Types.ObjectId, ref: 'TradeShow' },
    extractionType: { type: String, enum: ['exhibitors', 'companies'] },
    useCase: { type: String, enum: ['leads', 'tradeshow'] },
    fullDetails: { type: String, enum: ['yes', 'no'] },
    updatedAt: { type: Date }
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

// Company Schema (for Noxtm multi-tenancy)
const companySchema = new mongoose.Schema({
  companyName: { type: String, required: true },
  industry: { type: String },
  size: { type: String, enum: ['1-10', '11-50', '51-200', '201-500', '500+'] },
  address: { type: String },
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // User who created the company
  members: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    roleInCompany: { type: String, enum: ['Owner', 'Manager', 'Employee'], default: 'Employee' },
    department: {
      type: String,
      enum: [
        'Management Team',
        'Digital Team',
        'SEO Team',
        'Graphic Design Team',
        'Marketing Team',
        'Sales Team',
        'Development Team',
        'HR Team',
        'Finance Team',
        'Support Team',
        'Operations Team'
      ]
    },
    invitedAt: { type: Date, default: Date.now },
    joinedAt: { type: Date }
  }],
  invitations: [{
    email: { type: String, required: true },
    token: { type: String, required: true, unique: true },
    roleInCompany: { type: String, enum: ['Manager', 'Employee'], default: 'Employee' },
    department: {
      type: String,
      required: true,
      enum: [
        'Management Team',
        'Digital Team',
        'SEO Team',
        'Graphic Design Team',
        'Marketing Team',
        'Sales Team',
        'Development Team',
        'HR Team',
        'Finance Team',
        'Support Team',
        'Operations Team'
      ]
    },
    customPermissions: {
      dashboard: { type: Boolean },
      dataCenter: { type: Boolean },
      projects: { type: Boolean },
      teamCommunication: { type: Boolean },
      digitalMediaManagement: { type: Boolean },
      marketing: { type: Boolean },
      hrManagement: { type: Boolean },
      financeManagement: { type: Boolean },
      seoManagement: { type: Boolean },
      internalPolicies: { type: Boolean },
      settingsConfiguration: { type: Boolean }
    },
    invitedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    createdAt: { type: Date, default: Date.now },
    expiresAt: { type: Date, required: true, default: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) }, // 7 days
    status: { type: String, enum: ['pending', 'accepted', 'expired'], default: 'pending' }
  }],
  subscription: {
    plan: { type: String, enum: ['Noxtm', 'Enterprise'], default: 'Noxtm' },
    status: { type: String, enum: ['active', 'inactive', 'cancelled'], default: 'active' },
    startDate: { type: Date, default: Date.now },
    endDate: { type: Date }
  },
  // findr Chrome Extension Settings
  findrSettings: {
    selectedTradeShowId: { type: mongoose.Schema.Types.ObjectId, ref: 'TradeShow' },
    extractionType: { type: String, enum: ['exhibitors', 'companies'] },
    useCase: { type: String, enum: ['leads', 'tradeshow'] },
    fullDetails: { type: String, enum: ['yes', 'no'] },
    updatedAt: { type: Date }
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

companySchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

const Company = mongoose.model('Company', companySchema);

// Blog Category Schema
const categorySchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  slug: { type: String, required: true, unique: true },
  description: { type: String },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

categorySchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  if (!this.slug) {
    this.slug = this.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  }
  next();
});

const Category = mongoose.model('Category', categorySchema);

// Blog Schema
const blogSchema = new mongoose.Schema({
  title: { type: String, required: true, maxLength: 60 },
  slug: { type: String, required: true, unique: true },
  metaDescription: { type: String, required: true, maxLength: 160 },
  keywords: [{ type: String }], // Array of keywords/tags
  category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
  content: { type: String, required: true },
  featuredImage: {
    filename: String,
    altText: String,
    path: String
  },
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  status: { 
    type: String, 
    enum: ['draft', 'published', 'archived'], 
    default: 'draft' 
  },
  publishedAt: { type: Date },
  views: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

blogSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  if (!this.slug) {
    this.slug = this.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  }
  if (this.status === 'published' && !this.publishedAt) {
    this.publishedAt = new Date();
  }
  next();
});

const Blog = mongoose.model('Blog', blogSchema);

// Scraped Data Schema (findr integration)
const scrapedDataSchema = new mongoose.Schema({
  name: { type: String, trim: true },
  location: { type: String, trim: true },
  profileUrl: { type: String, required: true, unique: true, index: true },
  email: { type: String, trim: true },
  phone: { type: String, trim: true },
  role: { type: String, trim: true },
  timestamp: { type: Date, default: Date.now }
}, { timestamps: true });

scrapedDataSchema.index({ profileUrl: 1 }, { unique: true });

const ScrapedData = mongoose.model('ScrapedData', scrapedDataSchema);

// Lead Schema (Miner Extension integration)
const leadSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, trim: true },
  phone: { type: String, trim: true },
  company: { type: String, trim: true },
  source: {
    type: String,
    enum: ['Website', 'Referral', 'Social Media', 'Email Campaign', 'LinkedIn', 'Miner Extension', 'Other'],
    default: 'Miner Extension'
  },
  status: {
    type: String,
    enum: ['New', 'In Progress', 'Qualified', 'Converted', 'Lost'],
    default: 'New'
  },
  notes: { type: String, trim: true },
  priority: {
    type: String,
    enum: ['High', 'Medium', 'Low'],
    default: 'Medium'
  },
  lastContact: { type: Date },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company' }
}, { timestamps: true });

// Index for faster queries by user
leadSchema.index({ userId: 1, createdAt: -1 });

const Lead = mongoose.model('Lead', leadSchema);

// Email Verification Schema
const emailVerificationSchema = new mongoose.Schema({
  email: { type: String, required: true, index: true },
  code: { type: String, required: true },
  userData: {
    fullName: String,
    email: String,
    password: String,
    role: String
  },
  // findr Chrome Extension Settings
  findrSettings: {
    selectedTradeShowId: { type: mongoose.Schema.Types.ObjectId, ref: 'TradeShow' },
    extractionType: { type: String, enum: ['exhibitors', 'companies'] },
    useCase: { type: String, enum: ['leads', 'tradeshow'] },
    fullDetails: { type: String, enum: ['yes', 'no'] },
    updatedAt: { type: Date }
  },
  createdAt: { type: Date, default: Date.now },
  expiresAt: { type: Date, required: true, default: () => new Date(Date.now() + 10 * 60 * 1000), index: true }
});

// Create TTL index to automatically delete expired documents
emailVerificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const EmailVerification = mongoose.model('EmailVerification', emailVerificationSchema);

// Password Reset Schema
const passwordResetSchema = new mongoose.Schema({
  email: { type: String, required: true, index: true },
  code: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  expiresAt: { type: Date, required: true, default: () => new Date(Date.now() + 10 * 60 * 1000), index: true }
});

// Create TTL index to automatically delete expired documents
passwordResetSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const PasswordReset = mongoose.model('PasswordReset', passwordResetSchema);

// Email Log Schema (for Noxtm Mail dashboard)
const emailLogSchema = new mongoose.Schema({
  from: { type: String, required: true },
  to: { type: String, required: true },
  subject: { type: String, required: true },
  body: String,
  htmlBody: String,
  status: {
    type: String,
    enum: ['queued', 'sent', 'failed', 'bounced'],
    default: 'queued',
    index: true
  },
  messageId: String,
  error: String,
  deliveryInfo: {
    relay: String,
    delay: String,
    dsnStatus: String
  },
  sentAt: { type: Date, default: Date.now, index: true },
  createdAt: { type: Date, default: Date.now }
});

// Add indexes for common queries
emailLogSchema.index({ status: 1, sentAt: -1 });
emailLogSchema.index({ to: 1 });
emailLogSchema.index({ from: 1 });

const EmailLog = mongoose.model('EmailLog', emailLogSchema);

// Initialize email logger with EmailLog model
initializeEmailLogger(EmailLog);

// Conversation Schema (for messaging system)
const conversationSchema = new mongoose.Schema({
  companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
  name: { type: String }, // For group chats
  type: { type: String, enum: ['direct', 'group'], required: true },
  groupIcon: { type: String }, // For group chats - stores filename like "group_icon (1).png"
  participants: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    joinedAt: { type: Date, default: Date.now },
    lastReadAt: { type: Date, default: Date.now }
  }],
  lastMessage: {
    content: String,
    sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    timestamp: Date
  },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Indexes for performance
conversationSchema.index({ companyId: 1, type: 1 });
conversationSchema.index({ 'participants.user': 1 });
conversationSchema.index({ updatedAt: -1 });

conversationSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

const Conversation = mongoose.model('Conversation', conversationSchema);

// Message Schema (for messaging system)
const messageSchema = new mongoose.Schema({
  conversationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Conversation', required: true, index: true },
  companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
  sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  content: { type: String, required: true },
  type: { type: String, enum: ['text', 'file', 'image'], default: 'text' },
  fileUrl: { type: String }, // For file/image messages
  fileName: { type: String },
  fileSize: { type: Number }, // File size in bytes
  readBy: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    readAt: { type: Date, default: Date.now }
  }],
  deliveredTo: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    deliveredAt: { type: Date, default: Date.now }
  }],
  reactions: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    emoji: { type: String },
    timestamp: { type: Date, default: Date.now }
  }],
  isEdited: { type: Boolean, default: false },
  editHistory: [{
    content: { type: String },
    editedAt: { type: Date, default: Date.now }
  }],
  isDeleted: { type: Boolean, default: false },
  deletedAt: { type: Date },
  createdAt: { type: Date, default: Date.now, index: true },
  updatedAt: { type: Date, default: Date.now }
});

// Indexes for performance
messageSchema.index({ conversationId: 1, createdAt: -1 });
messageSchema.index({ companyId: 1, createdAt: -1 });
messageSchema.index({ sender: 1 });

messageSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

const Message = mongoose.model('Message', messageSchema);

// JWT Secret - Use environment variable or generate a secure fallback
const JWT_SECRET = process.env.JWT_SECRET || 'noxtm-fallback-secret-key-change-in-production';

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

// Middleware to check SoloHQ subscription status
const checkSOLOHQSubscription = async (req, res, next) => {
  // Skip check for non-SoloHQ endpoints
  if (!req.path.startsWith('/api/solohq/')) {
    return next();
  }

  try {
    const user = await User.findById(req.user.userId);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if user has active SoloHQ subscription
    if (!user.subscription ||
        user.subscription.plan !== 'SoloHQ' ||
        user.subscription.status !== 'active') {
      return res.status(302).json({
        redirect: '/pricing',
        message: 'SoloHQ subscription required'
      });
    }

    next();
  } catch (error) {
    console.error('Subscription check error:', error);
    res.status(500).json({ message: 'Server error during subscription check' });
  }
};

// Middleware to check for active plan
const checkActivePlan = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.userId);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if user has any active subscription plan
    if (!user.subscription || 
        user.subscription.status !== 'active' || 
        user.subscription.plan === 'None') {
      return res.status(302).json({ 
        redirect: '/pricing'
      });
    }

    next();
  } catch (error) {
    console.error('Plan check error:', error);
    res.status(500).json({ message: 'Server error during plan check' });
  }
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

// Middleware to ensure company isolation (for messaging system)
const requireCompanyAccess = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.userId);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if user has a companyId
    if (!user.companyId) {
      return res.status(403).json({
        message: 'No company associated with this user. Please complete company setup.'
      });
    }

    // Attach companyId to request for use in route handlers
    req.companyId = user.companyId;
    req.userId = user._id;

    next();
  } catch (error) {
    console.error('Company access check error:', error);
    res.status(500).json({ message: 'Server error during company access check' });
  }
};

// Valid permission keys
const validPermissionKeys = [
  'dashboard', 'dataCenter', 'projects', 'teamCommunication', 'digitalMediaManagement',
  'marketing', 'hrManagement', 'financeManagement', 'seoManagement', 'internalPolicies', 'settingsConfiguration'
];

function normalizePermissions(permissions) {
  const normalized = {};
  validPermissionKeys.forEach(key => {
    normalized[key] = permissions && permissions[key] === true;
  });
  return normalized;
}

// Helper to sync access array with permissions
function syncAccessFromPermissions(permissions) {
  const accessArray = [];
  if (permissions.dashboard) accessArray.push('Dashboard');
  if (permissions.dataCenter) accessArray.push('Data Center');
  if (permissions.projects) accessArray.push('Projects');
  if (permissions.teamCommunication) accessArray.push('Team Communication');
  if (permissions.digitalMediaManagement) accessArray.push('Digital Media Management');
  if (permissions.marketing) accessArray.push('Marketing');
  if (permissions.hrManagement) accessArray.push('HR Management');
  if (permissions.financeManagement) accessArray.push('Finance Management');
  if (permissions.seoManagement) accessArray.push('SEO Management');
  if (permissions.internalPolicies) accessArray.push('Internal Policies');
  if (permissions.settingsConfiguration) accessArray.push('Settings & Configuration');
  return accessArray;
}

// Get default permissions based on subscription plan or role
function getDefaultPermissions(planOrRole) {
  // Admin and Lord get full access to everything
  if (planOrRole === 'Admin' || planOrRole === 'Lord') {
    return {
      dashboard: true,
      dataCenter: true,
      projects: true,
      teamCommunication: true,
      digitalMediaManagement: true,
      marketing: true,
      hrManagement: true,
      financeManagement: true,
      seoManagement: true,
      internalPolicies: true,
      settingsConfiguration: true
    };
  }
  // SoloHQ subscription plan: Only findr (projects), PROJECTS, and PROFILE access
  else if (planOrRole === 'SoloHQ') {
    return {
      dashboard: false,
      dataCenter: false,
      projects: true,
      teamCommunication: false,
      digitalMediaManagement: false,
      marketing: false,
      hrManagement: false,
      financeManagement: false,
      seoManagement: false,
      internalPolicies: false,
      settingsConfiguration: false
    };
  }
  // Noxtm subscription plan: All modules EXCEPT Noxtm Mail, Workspace Settings, and Settings & Configuration
  else if (planOrRole === 'Noxtm') {
    return {
      dashboard: true,
      dataCenter: true,
      projects: true,
      teamCommunication: true,
      digitalMediaManagement: true,
      marketing: true,
      hrManagement: true,
      financeManagement: true,
      seoManagement: true,
      internalPolicies: true,
      settingsConfiguration: false
    };
  }
  // Default User role: Only basic dashboard access
  return {
    dashboard: true,
    dataCenter: false,
    projects: false,
    teamCommunication: false,
    digitalMediaManagement: false,
    marketing: false,
    hrManagement: false,
    financeManagement: false,
    seoManagement: false,
    internalPolicies: false,
    settingsConfiguration: false
  };
}

// Routes

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // Determine upload directory based on the route
    let uploadDir;
    if (req.path.includes('profile')) {
      uploadDir = path.join(__dirname, 'uploads', 'profile-images');
    } else {
      uploadDir = path.join(__dirname, 'uploads', 'blog-images');
    }
    
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const prefix = req.path.includes('profile') ? 'profile-' : 'blog-';
    cb(null, prefix + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'), false);
    }
  }
});

// Avatar uploads go to S3 so we keep them in memory until they are forwarded.
const avatarUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'), false);
    }
  }
});

const avatarBucket = process.env.AVATAR_S3_BUCKET || 'email-profile-avatar';
const avatarRegion = 'eu-north-1';
const avatarAccessKey = process.env.AWS_ACCESS_KEY_ID;
const avatarSecretKey = process.env.AWS_SECRET_ACCESS_KEY;
const getAvatarPublicUrl = key => `https://${avatarBucket}.s3.${avatarRegion}.amazonaws.com/${key}`;

if (!avatarAccessKey || !avatarSecretKey) {
  console.warn('⚠️  Avatar upload credentials are not configured. Set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY to enable S3 uploads.');
}

const s3Client = avatarAccessKey && avatarSecretKey ? new S3Client({
  region: avatarRegion,
  credentials: {
    accessKeyId: avatarAccessKey,
    secretAccessKey: avatarSecretKey
  }
}) : null;

// Trade Show file upload configuration
const tradeShowStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, 'uploads', 'trade-shows');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const prefix = file.fieldname === 'showLogo' ? 'logo-' : 'floorplan-';
    cb(null, prefix + uniqueSuffix + path.extname(file.originalname));
  }
});

// Logo upload with 100KB limit
const uploadLogo = multer({
  storage: tradeShowStorage,
  limits: {
    fileSize: 100 * 1024 // 100KB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/svg+xml'];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only JPG, PNG, and SVG files are allowed for logos!'), false);
    }
  }
});

// Floor plan upload with 10MB limit
const uploadFloorPlan = multer({
  storage: tradeShowStorage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedMimes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only PDF, JPG, and PNG files are allowed for floor plans!'), false);
    }
  }
});

// Combined upload for trade shows (logo + floor plan)
const uploadTradeShowFiles = multer({
  storage: tradeShowStorage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit for largest file
  },
  fileFilter: (req, file, cb) => {
    if (file.fieldname === 'showLogo') {
      const allowedMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/svg+xml'];
      if (allowedMimes.includes(file.mimetype)) {
        if (file.size && file.size > 100 * 1024) {
          cb(new Error('Logo file size must be less than 100KB!'), false);
        } else {
          cb(null, true);
        }
      } else {
        cb(new Error('Only JPG, PNG, and SVG files are allowed for logos!'), false);
      }
    } else if (file.fieldname === 'floorPlan') {
      const allowedMimes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
      if (allowedMimes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error('Only PDF, JPG, and PNG files are allowed for floor plans!'), false);
      }
    } else {
      cb(new Error('Unexpected field'), false);
    }
  }
});

// Serve uploaded images statically
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Base API endpoint
app.get('/api', (req, res) => {
  res.json({
    message: 'Noxtm API Server',
    version: '1.0.0',
    endpoints: {
      health: '/api/health',
      auth: '/api/auth/*',
      users: '/api/users/*',
      blogs: '/api/blogs/*',
      categories: '/api/categories'
    },
    documentation: 'https://noxtm.com/api/docs'
  });
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Server is running',
    timestamp: new Date().toISOString(),
    mongodb: mongoConnected ? 'connected' : 'disconnected'
  });
});

// ===== BLOG MANAGEMENT API ROUTES =====

// Get all categories
app.get('/api/categories', async (req, res) => {
  try {
    const categories = await Category.find().sort({ name: 1 });
    res.json(categories);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Create new category
app.post('/api/categories', authenticateToken, async (req, res) => {
  try {
    const { name, description } = req.body;
    
    if (!name) {
      return res.status(400).json({ message: 'Category name is required' });
    }

    const category = new Category({
      name,
      description,
      slug: name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
    });

    const savedCategory = await category.save();
    res.status(201).json(savedCategory);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: 'Category already exists' });
    }
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Upload blog image
app.post('/api/blogs/upload-image', authenticateToken, upload.single('image'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No image file provided' });
    }

    const imageUrl = `/uploads/blog-images/${req.file.filename}`;
    res.json({
      message: 'Image uploaded successfully',
      imageUrl: imageUrl,
      filename: req.file.filename
    });
  } catch (error) {
    res.status(500).json({ message: 'Image upload failed', error: error.message });
  }
});

// Get all blogs (with pagination and filtering)
app.get('/api/blogs', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const status = req.query.status;
    const category = req.query.category;
    
    const skip = (page - 1) * limit;
    
    // Build filter object
    const filter = {};
    if (status && status !== 'all') {
      filter.status = status;
    }
    if (category && category !== 'all') {
      filter.category = category;
    }

    const blogs = await Blog.find(filter)
      .populate('category', 'name slug')
      .populate('author', 'fullName')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Blog.countDocuments(filter);
    const totalPages = Math.ceil(total / limit);

    res.json({
      blogs,
      pagination: {
        currentPage: page,
        totalPages,
        totalBlogs: total,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get single blog by slug
app.get('/api/blogs/:slug', async (req, res) => {
  try {
    const blog = await Blog.findOne({ slug: req.params.slug })
      .populate('category', 'name slug')
      .populate('author', 'fullName');
    
    if (!blog) {
      return res.status(404).json({ message: 'Blog not found' });
    }

    // Increment views count
    await Blog.findByIdAndUpdate(blog._id, { $inc: { views: 1 } });
    
    res.json(blog);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Create new blog post
app.post('/api/blogs', authenticateToken, upload.single('featuredImage'), async (req, res) => {
  try {
    const { title, metaDescription, keywords, category, content, status, altText } = req.body;
    
    // Validation
    if (!title || title.length > 60) {
      return res.status(400).json({ message: 'Title is required and must be 60 characters or less' });
    }
    if (!metaDescription || metaDescription.length > 160) {
      return res.status(400).json({ message: 'Meta description is required and must be 160 characters or less' });
    }
    if (!category) {
      return res.status(400).json({ message: 'Category is required' });
    }
    if (!content) {
      return res.status(400).json({ message: 'Content is required' });
    }

    // Generate slug from title
    const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    
    // Check if slug already exists
    const existingBlog = await Blog.findOne({ slug });
    if (existingBlog) {
      return res.status(400).json({ message: 'A blog with this title already exists' });
    }

    // Parse keywords
    const keywordArray = keywords ? keywords.split(',').map(k => k.trim()) : [];
    
    // Handle featured image
    let featuredImage = {};
    if (req.file) {
      featuredImage = {
        filename: req.file.filename,
        altText: altText || title,
        path: `/uploads/blog-images/${req.file.filename}`
      };
    }

    const blog = new Blog({
      title,
      slug,
      metaDescription,
      keywords: keywordArray,
      category,
      content,
      featuredImage,
      author: req.user.userId,
      status: status || 'draft'
    });

    const savedBlog = await blog.save();
    const populatedBlog = await Blog.findById(savedBlog._id)
      .populate('category', 'name slug')
      .populate('author', 'fullName');
    
    res.status(201).json(populatedBlog);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Update blog post
app.put('/api/blogs/:id', authenticateToken, upload.single('featuredImage'), async (req, res) => {
  try {
    const { title, metaDescription, keywords, category, content, status, altText } = req.body;
    
    const blog = await Blog.findById(req.params.id);
    if (!blog) {
      return res.status(404).json({ message: 'Blog not found' });
    }

    // Update fields
    if (title) {
      if (title.length > 60) {
        return res.status(400).json({ message: 'Title must be 60 characters or less' });
      }
      blog.title = title;
      blog.slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    }
    
    if (metaDescription) {
      if (metaDescription.length > 160) {
        return res.status(400).json({ message: 'Meta description must be 160 characters or less' });
      }
      blog.metaDescription = metaDescription;
    }
    
    if (keywords) {
      blog.keywords = keywords.split(',').map(k => k.trim());
    }
    
    if (category) blog.category = category;
    if (content) blog.content = content;
    if (status) blog.status = status;

    // Handle featured image update
    if (req.file) {
      blog.featuredImage = {
        filename: req.file.filename,
        altText: altText || blog.title,
        path: `/uploads/blog-images/${req.file.filename}`
      };
    } else if (altText && blog.featuredImage.filename) {
      blog.featuredImage.altText = altText;
    }

    const updatedBlog = await blog.save();
    const populatedBlog = await Blog.findById(updatedBlog._id)
      .populate('category', 'name slug')
      .populate('author', 'fullName');
    
    res.json(populatedBlog);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Delete blog post
app.delete('/api/blogs/:id', authenticateToken, async (req, res) => {
  try {
    const blog = await Blog.findById(req.params.id);
    if (!blog) {
      return res.status(404).json({ message: 'Blog not found' });
    }

    // Delete associated image file if exists
    if (blog.featuredImage && blog.featuredImage.filename) {
      const imagePath = path.join(__dirname, 'uploads', 'blog-images', blog.featuredImage.filename);
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }
    }

    await Blog.findByIdAndDelete(req.params.id);
    res.json({ message: 'Blog deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get blog analytics/statistics
app.get('/api/blogs/analytics/stats', authenticateToken, async (req, res) => {
  try {
    const totalBlogs = await Blog.countDocuments();
    const publishedBlogs = await Blog.countDocuments({ status: 'published' });
    const draftBlogs = await Blog.countDocuments({ status: 'draft' });
    const totalViews = await Blog.aggregate([
      { $group: { _id: null, totalViews: { $sum: '$views' } } }
    ]);

    const popularBlogs = await Blog.find({ status: 'published' })
      .populate('category', 'name')
      .sort({ views: -1 })
      .limit(5)
      .select('title slug views');

    const recentBlogs = await Blog.find()
      .populate('category', 'name')
      .populate('author', 'fullName')
      .sort({ createdAt: -1 })
      .limit(5)
      .select('title slug status createdAt');

    res.json({
      stats: {
        totalBlogs,
        publishedBlogs,
        draftBlogs,
        totalViews: totalViews[0]?.totalViews || 0
      },
      popularBlogs,
      recentBlogs
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// ===== SCRAPED DATA (findr) API ROUTES =====

// Create or upsert scraped profile
app.post('/api/scraped-data', async (req, res) => {
  try {
    if (!mongoConnected) {
      return res.status(503).json({ message: 'Database unavailable' });
    }

    const payload = req.body;

    // Support single object or array batch
    const records = Array.isArray(payload) ? payload : [payload];

    if (!records.length) {
      return res.status(400).json({ message: 'No data provided' });
    }

    const results = { inserted: 0, duplicates: 0, errors: 0, details: [] };

    for (const rec of records) {
      const { profileUrl, name, location, email, phone, role, timestamp } = rec || {};
      if (!profileUrl || typeof profileUrl !== 'string') {
        results.errors++;
        results.details.push({ profileUrl, status: 'error', reason: 'profileUrl required' });
        continue;
      }
      try {
        // Check if profile already exists
        const existing = await ScrapedData.findOne({ profileUrl });
        if (existing) {
          // Update existing record ONLY with NEW non-empty data
          let updated = false;
          if (name && name.trim() && !existing.name) {
            existing.name = name.trim();
            updated = true;
          }
          if (email && email.trim() && !existing.email) {
            existing.email = email.trim();
            updated = true;
          }
          if (phone && phone.trim() && !existing.phone) {
            existing.phone = phone.trim();
            updated = true;
          }
          if (role && role.trim() && !existing.role) {
            existing.role = role.trim();
            updated = true;
          }
          if (location && location.trim() && !existing.location) {
            existing.location = location.trim();
            updated = true;
          }

          if (updated) {
            await existing.save();
            results.inserted++; // Count as inserted since we updated it
            results.details.push({ profileUrl, status: 'updated' });
          } else {
            results.duplicates++;
            results.details.push({ profileUrl, status: 'duplicate' });
          }
          continue;
        }

        // Create new record
        const doc = new ScrapedData({
          profileUrl: profileUrl.trim(),
          name: name || '',
          location: location || '',
          email: email || '',
          phone: phone || '',
          role: role || '',
          timestamp: timestamp ? new Date(timestamp) : new Date()
        });
        await doc.save();
        results.inserted++;
        results.details.push({ profileUrl, status: 'inserted' });
      } catch (err) {
        if (err.code === 11000) {
          results.duplicates++;
          results.details.push({ profileUrl, status: 'duplicate' });
        } else {
          results.errors++;
          results.details.push({ profileUrl, status: 'error', reason: err.message });
        }
      }
    }

    res.status(201).json({ message: 'Processed scraped data', ...results });
  } catch (error) {
    console.error('Scraped data POST error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get all scraped data (basic pagination optional)
app.get('/api/scraped-data', async (req, res) => {
  try {
    if (!mongoConnected) {
      return res.status(503).json({ message: 'Database unavailable' });
    }
    const total = await ScrapedData.countDocuments();
    const data = await ScrapedData.find().sort({ createdAt: -1 }).lean();
    res.json({
      data,
      total
    });
  } catch (error) {
    console.error('Scraped data GET error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// ==================== MINER EXTENSION - LEADS API ====================

// Create a new lead (Miner Extension)
app.post('/api/leads', authenticateToken, async (req, res) => {
  try {
    if (!mongoConnected) {
      return res.status(503).json({ message: 'Database unavailable' });
    }

    const { name, email, phone, company, source, status, notes, priority } = req.body;

    // Validate required fields
    if (!name || !email) {
      return res.status(400).json({ message: 'Name and email are required' });
    }

    // Get user from token
    const userId = req.user.userId;

    // Check if user exists and get companyId
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Create new lead
    const lead = new Lead({
      name: name.trim(),
      email: email.trim(),
      phone: phone ? phone.trim() : undefined,
      company: company ? company.trim() : undefined,
      source: source || 'Miner Extension',
      status: status || 'New',
      notes: notes ? notes.trim() : undefined,
      priority: priority || 'Medium',
      userId: userId,
      companyId: user.companyId || undefined,
      lastContact: new Date()
    });

    await lead.save();

    res.status(201).json({
      message: 'Lead created successfully',
      lead: lead
    });
  } catch (error) {
    console.error('Lead creation error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get all leads for authenticated user
app.get('/api/leads', authenticateToken, async (req, res) => {
  try {
    if (!mongoConnected) {
      return res.status(503).json({ message: 'Database unavailable' });
    }

    const userId = req.user.userId;
    const { page = 1, limit = 100, status, source } = req.query;

    // Build query filter
    const filter = { userId };
    if (status) filter.status = status;
    if (source) filter.source = source;

    // Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Get total count and leads
    const total = await Lead.countDocuments(filter);
    const leads = await Lead.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    res.json({
      leads,
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / parseInt(limit))
    });
  } catch (error) {
    console.error('Leads fetch error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Update lead status or details
app.put('/api/leads/:id', authenticateToken, async (req, res) => {
  try {
    if (!mongoConnected) {
      return res.status(503).json({ message: 'Database unavailable' });
    }

    const { id } = req.params;
    const userId = req.user.userId;
    const updates = req.body;

    // Find lead and verify ownership
    const lead = await Lead.findOne({ _id: id, userId });
    if (!lead) {
      return res.status(404).json({ message: 'Lead not found' });
    }

    // Update allowed fields
    const allowedFields = ['name', 'email', 'phone', 'company', 'status', 'notes', 'priority', 'source'];
    allowedFields.forEach(field => {
      if (updates[field] !== undefined) {
        lead[field] = updates[field];
      }
    });

    lead.lastContact = new Date();
    await lead.save();

    res.json({
      message: 'Lead updated successfully',
      lead
    });
  } catch (error) {
    console.error('Lead update error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Delete a lead
app.delete('/api/leads/:id', authenticateToken, async (req, res) => {
  try {
    if (!mongoConnected) {
      return res.status(503).json({ message: 'Database unavailable' });
    }

    const { id } = req.params;
    const userId = req.user.userId;

    // Find and delete lead (verify ownership)
    const lead = await Lead.findOneAndDelete({ _id: id, userId });
    if (!lead) {
      return res.status(404).json({ message: 'Lead not found' });
    }

    res.json({ message: 'Lead deleted successfully' });
  } catch (error) {
    console.error('Lead deletion error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Extension authentication verification endpoint
app.get('/api/extension-auth', authenticateToken, async (req, res) => {
  try {
    if (!mongoConnected) {
      return res.status(503).json({ message: 'Database unavailable' });
    }

    const userId = req.user.userId;
    const user = await User.findById(userId).select('-password');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({
      authenticated: true,
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        subscription: user.subscription
      }
    });
  } catch (error) {
    console.error('Extension auth verification error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// ==================== END MINER EXTENSION API ====================

// DEPRECATED: Check domain endpoint - no longer used (businessName/businessEmail/userType fields removed)
// app.post('/api/check-domain', async (req, res) => {
//   try {
//     const { domain } = req.body;
//
//     if (!domain) {
//       return res.status(400).json({ message: 'Domain is required' });
//     }
//
//     res.status(404).json({
//       message: 'Domain validation no longer supported. Please use subscription plans.'
//     });
//   } catch (error) {
//     console.error('Domain check error:', error);
//     res.status(500).json({ message: 'Server error' });
//   }
// });

// Send verification code
app.post('/api/send-verification-code', verificationEmailLimiter, validateEmailMiddleware('email', false), async (req, res) => {
  try {
    const { fullName, email, password, role } = req.body;

    // Validate input
    if (!fullName || !email || !password) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.trim().toLowerCase() });
    if (existingUser) {
      return res.status(400).json({ message: 'Email already registered' });
    }

    // Generate 6-digit verification code
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();

    // Hash password before storing
    const saltRounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Store verification data
    await EmailVerification.findOneAndDelete({ email: email.trim().toLowerCase() }); // Remove any existing verification
    const verification = new EmailVerification({
      email: email.trim().toLowerCase(),
      code: verificationCode,
      userData: {
        fullName,
        email: email.trim().toLowerCase(),
        password: hashedPassword,
        role: role || 'User'
      }
    });
    await verification.save();

    // Check if email configuration is set
    if (!process.env.EMAIL_HOST || !process.env.EMAIL_FROM) {
      console.error('Email configuration missing');
      return res.status(500).json({
        message: 'Email service not configured. Please contact administrator.',
        error: 'SMTP_CONFIG_MISSING'
      });
    }

    try {
      // Send email using template
      const sendTemplateEmail = getTemplateHelper();
      const result = await sendTemplateEmail(
        'email-verification',
        email,
        {
          firstName: fullName.split(' ')[0],
          fullName: fullName,
          verificationCode: verificationCode,
          userName: fullName,
          email: email
        },
        {
          logData: {
            userId: null,
            ip: req.ip,
            userAgent: req.headers['user-agent'],
            type: 'verification'
          }
        }
      );
      console.log('✅ Verification email sent successfully:', result.messageId);

      res.status(200).json({
        success: true,
        message: 'Verification code sent to your email',
        email: email
      });
    } catch (mailError) {
      console.error('❌ Failed to send verification email:', mailError);
      throw mailError; // Re-throw to be caught by outer catch
    }
  } catch (error) {
    console.error('Send verification code error:', error);

    // Provide more specific error messages
    let errorMessage = 'Failed to send verification code. Please try again.';
    if (error.code === 'EAUTH') {
      errorMessage = 'Email authentication failed. Please contact administrator.';
    } else if (error.code === 'ECONNECTION') {
      errorMessage = 'Cannot connect to email server. Please try again later.';
    } else if (error.code === 'ETIMEDOUT') {
      errorMessage = 'Email service timeout. Please try again.';
    }

    res.status(500).json({
      message: errorMessage,
      error: error.code || 'UNKNOWN_ERROR'
    });
  }
});

// Verify code and complete registration
app.post('/api/verify-code', async (req, res) => {
  try {
    console.log('=== VERIFY CODE REQUEST ===');
    console.log('Request body:', req.body);

    const { email, code } = req.body;

    if (!email || !code) {
      console.log('Missing email or code');
      return res.status(400).json({ message: 'Email and code are required' });
    }

    console.log('Searching for verification record:', { email: email.trim().toLowerCase(), code: code.trim() });

    // Find verification record
    const verification = await EmailVerification.findOne({
      email: email.trim().toLowerCase(),
      code: code.trim()
    });

    console.log('Verification record found:', verification ? 'YES' : 'NO');
    if (verification) {
      console.log('Verification details:', {
        email: verification.email,
        code: verification.code,
        createdAt: verification.createdAt,
        expiresAt: verification.expiresAt,
        isExpired: new Date() > verification.expiresAt
      });
    }

    if (!verification) {
      console.log('No verification record found - checking all records...');
      const allVerifications = await EmailVerification.find().limit(5);
      console.log('Recent verification records:', allVerifications.map(v => ({
        email: v.email,
        code: v.code,
        expiresAt: v.expiresAt
      })));
      return res.status(400).json({ message: 'Invalid or expired verification code' });
    }

    // Check if expired
    if (new Date() > verification.expiresAt) {
      console.log('Verification code has expired');
      return res.status(400).json({ message: 'Verification code has expired. Please request a new one.' });
    }

    // Create user with stored data
    const { fullName, password, role } = verification.userData;
    console.log('Creating user with data:', { fullName, email, role });

    // Get default permissions for the role
    const userRole = role || 'User';
    const defaultPermissions = getDefaultPermissions(userRole);
    const defaultAccess = syncAccessFromPermissions(defaultPermissions);

    const user = new User({
      fullName: fullName,
      email: email.trim().toLowerCase(),
      password: password, // Already hashed
      role: userRole,
      status: 'Active',
      permissions: defaultPermissions,
      access: defaultAccess
    });

    console.log('Saving user...');
    await user.save();
    console.log('User saved successfully:', user._id);

    // Delete verification record
    await EmailVerification.findByIdAndDelete(verification._id);
    console.log('Verification record deleted');

    // Generate JWT token
    const token = jwt.sign({ userId: user._id, fullName: user.fullName, email: user.email }, JWT_SECRET, {
      expiresIn: '24h'
    });

    console.log('=== VERIFICATION SUCCESS ===');
    res.status(201).json({
      success: true,
      message: 'Account created successfully',
      token,
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        access: user.access,
        permissions: user.permissions,
        subscription: user.subscription || { plan: 'None', status: 'inactive' }
      }
    });
  } catch (error) {
    console.error('=== VERIFY CODE ERROR ===');
    console.error('Verify code error:', error);
    console.error('Error details:', {
      name: error.name,
      message: error.message,
      code: error.code,
      stack: error.stack
    });
    res.status(500).json({
      message: 'Verification failed. Please try again.',
      error: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// ===== FORGOT PASSWORD ROUTES =====

// Send password reset code
app.post('/api/forgot-password', passwordResetLimiter, validateEmailMiddleware('email', false), async (req, res) => {
  try {
    const { email } = req.body;

    // Validate input
    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    // Check if user exists
    const user = await User.findOne({ email: email.trim().toLowerCase() });
    if (!user) {
      // Don't reveal if user exists or not for security
      return res.status(200).json({
        success: true,
        message: 'If an account exists with this email, a password reset code has been sent.'
      });
    }

    // Generate 6-digit reset code
    const resetCode = Math.floor(100000 + Math.random() * 900000).toString();

    // Store reset code
    await PasswordReset.findOneAndDelete({ email: email.trim().toLowerCase() }); // Remove any existing reset
    const passwordReset = new PasswordReset({
      email: email.trim().toLowerCase(),
      code: resetCode
    });
    await passwordReset.save();

    // Check if email configuration is set
    if (!process.env.EMAIL_HOST || !process.env.EMAIL_FROM) {
      console.error('Email configuration missing');
      return res.status(500).json({
        message: 'Email service not configured. Please contact administrator.',
        error: 'SMTP_CONFIG_MISSING'
      });
    }

    try {
      // Send email using template
      const sendTemplateEmail = getTemplateHelper();
      const result = await sendTemplateEmail(
        'password-reset',
        email,
        {
          firstName: user.fullName.split(' ')[0],
          fullName: user.fullName,
          verificationCode: resetCode,
          resetCode: resetCode,
          userName: user.fullName,
          email: email
        },
        {
          logData: {
            userId: user ? user._id : null,
            ip: req.ip,
            userAgent: req.headers['user-agent'],
            type: 'password-reset'
          }
        }
      );
      console.log('✅ Password reset email sent:', result.messageId);

      res.status(200).json({
        success: true,
        message: 'If an account exists with this email, a password reset code has been sent.',
        email: email
      });
    } catch (mailError) {
      console.error('❌ Failed to send password reset email:', mailError);
      throw mailError;
    }
  } catch (error) {
    console.error('Forgot password error:', error);

    let errorMessage = 'Failed to send password reset code. Please try again.';
    if (error.code === 'EAUTH') {
      errorMessage = 'Email authentication failed. Please contact administrator.';
    } else if (error.code === 'ECONNECTION') {
      errorMessage = 'Cannot connect to email server. Please try again later.';
    } else if (error.code === 'ETIMEDOUT') {
      errorMessage = 'Email service timeout. Please try again.';
    }

    res.status(500).json({
      message: errorMessage,
      error: error.code || 'UNKNOWN_ERROR'
    });
  }
});

// Verify reset code and update password
app.post('/api/reset-password', async (req, res) => {
  try {
    const { email, code, newPassword } = req.body;

    // Validate input
    if (!email || !code || !newPassword) {
      return res.status(400).json({ message: 'Email, code, and new password are required' });
    }

    // Validate password strength (minimum 6 characters)
    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters long' });
    }

    // Find reset record
    const resetRecord = await PasswordReset.findOne({
      email: email.trim().toLowerCase(),
      code: code.trim()
    });

    if (!resetRecord) {
      return res.status(400).json({ message: 'Invalid or expired reset code' });
    }

    // Check if expired
    if (new Date() > resetRecord.expiresAt) {
      await PasswordReset.findByIdAndDelete(resetRecord._id);
      return res.status(400).json({ message: 'Reset code has expired. Please request a new one.' });
    }

    // Find user
    const user = await User.findOne({ email: email.trim().toLowerCase() });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Hash new password
    const saltRounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

    // Update user password directly without triggering full validation
    await User.updateOne(
      { _id: user._id },
      { 
        $set: { 
          password: hashedPassword,
          updatedAt: Date.now()
        }
      }
    );

    // Delete reset record
    await PasswordReset.findByIdAndDelete(resetRecord._id);

    res.status(200).json({
      success: true,
      message: 'Password has been reset successfully. You can now login with your new password.'
    });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({
      message: 'Failed to reset password. Please try again.',
      error: error.message
    });
  }
});

// Register
app.post('/api/register', async (req, res) => {
  try {
    const { fullName, email, password, role } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Hash password with configurable rounds
    const saltRounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Validate role if provided, otherwise default to 'User'
    const validRoles = ['User', 'Admin', 'Lord'];
    const userRole = role && validRoles.includes(role) ? role : 'User';

    // Get default permissions and access for the role using global helper functions
    const defaultPermissions = getDefaultPermissions(userRole);
    const defaultAccess = syncAccessFromPermissions(defaultPermissions);

    // Create new user
    const user = new User({
      fullName,
      email,
      password: hashedPassword,
      role: userRole,
      access: defaultAccess,
      status: 'Active',
      permissions: defaultPermissions
    });

    await user.save();

    // Generate JWT token
    const token = jwt.sign({ userId: user._id, fullName: user.fullName, email: user.email }, JWT_SECRET);

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      token,
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        access: user.access,
        permissions: user.permissions,
        subscription: user.subscription || { plan: 'None', status: 'inactive' }
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});
// Handle SoloHQ subscription
app.post('/api/subscribe/solohq', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Set up subscription details
    const startDate = new Date();
    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + 1); // 1 month subscription

    user.subscription = {
      plan: 'SoloHQ',
      status: 'active',
      startDate,
      endDate
    };

    // Update permissions based on SoloHQ plan (role stays unchanged)
    user.permissions = getDefaultPermissions('SoloHQ');
    user.access = syncAccessFromPermissions(user.permissions);
    await user.save();

    res.json({
      success: true,
      message: 'Successfully subscribed to SoloHQ plan',
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        permissions: user.permissions,
        subscription: user.subscription
      }
    });
  } catch (error) {
    console.error('Subscription error:', error);
    res.status(500).json({ message: 'Server error during subscription' });
  }
});

// Handle Noxtm subscription
app.post('/api/subscribe/noxtm', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const { billingType } = req.body; // 'Monthly' or 'Annual'

    // Set up subscription details
    const startDate = new Date();
    const endDate = new Date();

    // Set end date based on billing type
    if (billingType === 'Annual') {
      endDate.setFullYear(endDate.getFullYear() + 1); // 1 year subscription
    } else {
      endDate.setMonth(endDate.getMonth() + 1); // 1 month subscription
    }

    user.subscription = {
      plan: 'Noxtm',
      status: 'active',
      startDate,
      endDate
    };

    // Update permissions based on Noxtm plan (role stays unchanged)
    user.permissions = getDefaultPermissions('Noxtm');
    user.access = syncAccessFromPermissions(user.permissions);
    await user.save();

    res.json({
      success: true,
      message: 'Successfully subscribed to Noxtm plan',
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        permissions: user.permissions,
        subscription: user.subscription
      }
    });
  } catch (error) {
    console.error('Noxtm subscription error:', error);
    res.status(500).json({ message: 'Server error during subscription' });
  }
});

// Check subscription status
app.get('/api/subscription/status', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    // Admins bypass subscription checks and are treated as active
    if (user.role && user.role.toLowerCase() === 'admin') {
      return res.json({
        subscription: { plan: 'Admin', status: 'active' },
        role: user.role
      });
    }

    res.json({
      subscription: user.subscription || { plan: 'None', status: 'inactive' },
      role: user.role
    });
  } catch (error) {
    console.error('Subscription status check error:', error);
    res.status(500).json({ message: 'Server error checking subscription status' });
  }
});

// Setup company details (for Noxtm subscribers)
app.post('/api/company/setup', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if user has Noxtm subscription
    if (!user.subscription || user.subscription.plan !== 'Noxtm') {
      return res.status(403).json({
        message: 'Noxtm subscription required to create a company'
      });
    }

    const {
      companyName,
      companyEmail,
      companyPhone,
      companyAddress,
      companyCity,
      companyState,
      companyCountry,
      companyZipCode,
      companyWebsite,
      industryType,
      companySize,
      gstin
    } = req.body;

    // Validate required fields
    if (!companyName || !companyEmail || !industryType) {
      return res.status(400).json({
        message: 'Company name, email, and industry type are required'
      });
    }

    // Check if user already has a company
    if (user.companyId) {
      const existingCompany = await Company.findById(user.companyId);
      if (existingCompany) {
        return res.status(400).json({
          message: 'Company already exists for this user',
          companyId: existingCompany._id
        });
      }
    }

    // Build company address object
    const address = [
      companyAddress,
      companyCity,
      companyState,
      companyZipCode,
      companyCountry
    ].filter(Boolean).join(', ');

    // Create new company
    const company = new Company({
      companyName,
      industry: industryType,
      size: companySize,
      address,
      owner: userId,
      members: [{
        user: userId,
        roleInCompany: 'Owner',
        joinedAt: new Date()
      }],
      subscription: {
        plan: user.subscription.plan,
        status: user.subscription.status,
        startDate: user.subscription.startDate,
        endDate: user.subscription.endDate
      }
    });

    await company.save();

    // Update user with company ID
    user.companyId = company._id;
    await user.save();

    res.json({
      success: true,
      message: 'Company setup completed successfully',
      companyId: company._id,
      companyName: company.companyName
    });
  } catch (error) {
    console.error('Company setup error:', error);
    res.status(500).json({
      message: 'Server error during company setup',
      error: error.message
    });
  }
});

// Get company details for current user
app.get('/api/company/details', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (!user.companyId) {
      return res.status(404).json({ message: 'No company associated with this user' });
    }

    const company = await Company.findById(user.companyId)
      .populate('owner', 'fullName email')
      .populate('members.user', 'fullName email role profileImage status');

    if (!company) {
      return res.status(404).json({ message: 'Company not found' });
    }

    res.json({
      success: true,
      company: {
        _id: company._id,
        companyName: company.companyName,
        industry: company.industry,
        size: company.size,
        address: company.address,
        owner: company.owner,
        memberCount: company.members.length,
        subscription: company.subscription
      }
    });
  } catch (error) {
    console.error('Get company details error:', error);
    res.status(500).json({
      message: 'Server error while fetching company details',
      error: error.message
    });
  }
});

// Get all members of user's company
app.get('/api/company/members', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (!user.companyId) {
      return res.status(404).json({
        message: 'No company associated with this user',
        members: []
      });
    }

    const company = await Company.findById(user.companyId)
      .populate('members.user', 'fullName email role profileImage status createdAt permissions');

    if (!company) {
      return res.status(404).json({ message: 'Company not found' });
    }

    // Format members data
    const members = company.members.map(member => ({
      _id: member.user._id,
      fullName: member.user.fullName,
      email: member.user.email,
      role: member.user.role,
      roleInCompany: member.roleInCompany,
      department: member.department,
      profileImage: member.user.profileImage,
      status: member.user.status,
      permissions: member.user.permissions,
      joinedAt: member.joinedAt,
      invitedAt: member.invitedAt,
      createdAt: member.user.createdAt
    }));

    res.json({
      success: true,
      members,
      total: members.length,
      companyName: company.companyName
    });
  } catch (error) {
    console.error('Get company members error:', error);
    res.status(500).json({
      message: 'Server error while fetching company members',
      error: error.message
    });
  }
});

// Department permission defaults
const DEPARTMENT_DEFAULTS = {
  'Management Team': {
    dashboard: true,
    dataCenter: true,
    projects: true,
    teamCommunication: true,
    digitalMediaManagement: true,
    marketing: true,
    hrManagement: true,
    financeManagement: true,
    seoManagement: true,
    internalPolicies: true,
    settingsConfiguration: true
  },
  'Digital Team': {
    dashboard: true,
    dataCenter: false,
    projects: true,
    teamCommunication: true,
    digitalMediaManagement: true,
    marketing: false,
    hrManagement: false,
    financeManagement: false,
    seoManagement: true,
    internalPolicies: false,
    settingsConfiguration: false
  },
  'SEO Team': {
    dashboard: true,
    dataCenter: false,
    projects: false,
    teamCommunication: true,
    digitalMediaManagement: true,
    marketing: true,
    hrManagement: false,
    financeManagement: false,
    seoManagement: true,
    internalPolicies: false,
    settingsConfiguration: false
  },
  'Graphic Design Team': {
    dashboard: true,
    dataCenter: false,
    projects: true,
    teamCommunication: true,
    digitalMediaManagement: true,
    marketing: false,
    hrManagement: false,
    financeManagement: false,
    seoManagement: false,
    internalPolicies: false,
    settingsConfiguration: false
  },
  'Marketing Team': {
    dashboard: true,
    dataCenter: false,
    projects: false,
    teamCommunication: true,
    digitalMediaManagement: true,
    marketing: true,
    hrManagement: false,
    financeManagement: false,
    seoManagement: true,
    internalPolicies: false,
    settingsConfiguration: false
  },
  'Sales Team': {
    dashboard: true,
    dataCenter: false,
    projects: false,
    teamCommunication: true,
    digitalMediaManagement: false,
    marketing: true,
    hrManagement: false,
    financeManagement: true,
    seoManagement: false,
    internalPolicies: false,
    settingsConfiguration: false
  },
  'Development Team': {
    dashboard: true,
    dataCenter: true,
    projects: true,
    teamCommunication: true,
    digitalMediaManagement: false,
    marketing: false,
    hrManagement: false,
    financeManagement: false,
    seoManagement: false,
    internalPolicies: false,
    settingsConfiguration: false
  },
  'HR Team': {
    dashboard: true,
    dataCenter: false,
    projects: false,
    teamCommunication: true,
    digitalMediaManagement: false,
    marketing: false,
    hrManagement: true,
    financeManagement: false,
    seoManagement: false,
    internalPolicies: true,
    settingsConfiguration: false
  },
  'Finance Team': {
    dashboard: true,
    dataCenter: false,
    projects: false,
    teamCommunication: true,
    digitalMediaManagement: false,
    marketing: false,
    hrManagement: false,
    financeManagement: true,
    seoManagement: false,
    internalPolicies: false,
    settingsConfiguration: false
  },
  'Support Team': {
    dashboard: true,
    dataCenter: false,
    projects: true,
    teamCommunication: true,
    digitalMediaManagement: false,
    marketing: false,
    hrManagement: false,
    financeManagement: false,
    seoManagement: false,
    internalPolicies: false,
    settingsConfiguration: false
  },
  'Operations Team': {
    dashboard: true,
    dataCenter: true,
    projects: true,
    teamCommunication: true,
    digitalMediaManagement: false,
    marketing: false,
    hrManagement: false,
    financeManagement: false,
    seoManagement: false,
    internalPolicies: true,
    settingsConfiguration: false
  }
};

// Generate invite link for company
app.post('/api/company/invite', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { email, roleInCompany, department, customPermissions } = req.body;

    // Validate inputs
    if (!email || !email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      return res.status(400).json({ message: 'Valid email is required' });
    }

    if (!roleInCompany || !['Manager', 'Employee'].includes(roleInCompany)) {
      return res.status(400).json({ message: 'Valid role is required (Manager or Employee)' });
    }

    const validDepartments = [
      'Management Team', 'Digital Team', 'SEO Team', 'Graphic Design Team',
      'Marketing Team', 'Sales Team', 'Development Team', 'HR Team',
      'Finance Team', 'Support Team', 'Operations Team'
    ];

    if (!department || !validDepartments.includes(department)) {
      return res.status(400).json({ message: 'Valid department is required' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (!user.companyId) {
      return res.status(403).json({ message: 'You must be part of a company to invite members' });
    }

    const company = await Company.findById(user.companyId);
    if (!company) {
      return res.status(404).json({ message: 'Company not found' });
    }

    // Check if user has permission to invite (Owner or Manager)
    const userMembership = company.members.find(m => m.user.toString() === userId);
    if (!userMembership || !['Owner', 'Manager'].includes(userMembership.roleInCompany)) {
      return res.status(403).json({
        message: 'Only company owners and managers can invite new members'
      });
    }

    // Check if user is already a member
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser && existingUser.companyId && existingUser.companyId.toString() === company._id.toString()) {
      return res.status(400).json({ message: 'This user is already a member of your company' });
    }

    // Check if there's already a pending invitation
    const existingInvite = company.invitations.find(
      inv => inv.email.toLowerCase() === email.toLowerCase() && inv.status === 'pending'
    );

    if (existingInvite) {
      // Return existing invite if not expired
      if (new Date() < existingInvite.expiresAt) {
        const frontendUrl = process.env.FRONTEND_URL || `${req.protocol}://${req.get('host')}`;
        const inviteUrl = `${frontendUrl}/invite/${existingInvite.token}`;
        return res.json({
          success: true,
          message: 'An active invitation already exists for this email',
          inviteToken: existingInvite.token,
          inviteUrl,
          expiresAt: existingInvite.expiresAt
        });
      } else {
        // Mark old invite as expired
        existingInvite.status = 'expired';
      }
    }

    // Generate unique token
    const crypto = require('crypto');
    const inviteToken = crypto.randomBytes(32).toString('hex');

    // Use custom permissions if provided, otherwise use department defaults
    const permissions = customPermissions || DEPARTMENT_DEFAULTS[department] || {};

    // Create invitation
    company.invitations.push({
      email: email.toLowerCase(),
      token: inviteToken,
      roleInCompany,
      department,
      customPermissions: permissions,
      invitedBy: userId,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      status: 'pending'
    });

    await company.save();

    // Generate full invite URL using FRONTEND_URL from environment
    const frontendUrl = process.env.FRONTEND_URL || `${req.protocol}://${req.get('host')}`;
    const inviteUrl = `${frontendUrl}/invite/${inviteToken}`;

    res.json({
      success: true,
      message: 'Invitation created successfully',
      inviteToken,
      inviteUrl,
      expiresAt: company.invitations[company.invitations.length - 1].expiresAt
    });
  } catch (error) {
    console.error('Create invitation error:', error);
    res.status(500).json({
      message: 'Server error while creating invitation',
      error: error.message
    });
  }
});

// Get invite details (validate token)
app.get('/api/company/invite/:token', async (req, res) => {
  try {
    const { token } = req.params;

    const company = await Company.findOne({ 'invitations.token': token })
      .populate('owner', 'fullName email');

    if (!company) {
      return res.status(404).json({
        valid: false,
        message: 'Invalid invitation link'
      });
    }

    const invitation = company.invitations.find(inv => inv.token === token);

    if (!invitation) {
      return res.status(404).json({
        valid: false,
        message: 'Invitation not found'
      });
    }

    // Check if expired
    if (new Date() > invitation.expiresAt) {
      invitation.status = 'expired';
      await company.save();
      return res.status(400).json({
        valid: false,
        message: 'This invitation link has expired'
      });
    }

    // Check if already accepted
    if (invitation.status === 'accepted') {
      return res.status(400).json({
        valid: false,
        message: 'This invitation has already been accepted'
      });
    }

    res.json({
      valid: true,
      invitation: {
        email: invitation.email,
        roleInCompany: invitation.roleInCompany,
        expiresAt: invitation.expiresAt,
        companyName: company.companyName,
        industry: company.industry,
        companyId: company._id
      }
    });
  } catch (error) {
    console.error('Validate invite error:', error);
    res.status(500).json({
      valid: false,
      message: 'Server error while validating invitation',
      error: error.message
    });
  }
});

// Accept company invitation
app.post('/api/company/invite/:token/accept', authenticateToken, async (req, res) => {
  try {
    const { token } = req.params;
    const userId = req.user.userId;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const company = await Company.findOne({ 'invitations.token': token });
    if (!company) {
      return res.status(404).json({ message: 'Invalid invitation link' });
    }

    const invitation = company.invitations.find(inv => inv.token === token);
    if (!invitation) {
      return res.status(404).json({ message: 'Invitation not found' });
    }

    // Validate invitation
    if (new Date() > invitation.expiresAt) {
      invitation.status = 'expired';
      await company.save();
      return res.status(400).json({ message: 'This invitation has expired' });
    }

    if (invitation.status === 'accepted') {
      return res.status(400).json({ message: 'This invitation has already been used' });
    }

    // Check if email matches
    if (invitation.email.toLowerCase() !== user.email.toLowerCase()) {
      return res.status(403).json({
        message: 'This invitation was sent to a different email address'
      });
    }

    // Check if user already has a company
    if (user.companyId) {
      return res.status(400).json({
        message: 'You are already part of a company. Please leave your current company first.'
      });
    }

    // Add user to company
    company.members.push({
      user: userId,
      roleInCompany: invitation.roleInCompany,
      department: invitation.department,
      invitedAt: invitation.createdAt,
      joinedAt: new Date()
    });

    // Mark invitation as accepted
    invitation.status = 'accepted';
    await company.save();

    // Update user with companyId and permissions
    user.companyId = company._id;

    // Apply custom permissions from invitation
    if (invitation.customPermissions) {
      user.permissions = {
        dashboard: invitation.customPermissions.dashboard || false,
        dataCenter: invitation.customPermissions.dataCenter || false,
        projects: invitation.customPermissions.projects || false,
        teamCommunication: invitation.customPermissions.teamCommunication || false,
        digitalMediaManagement: invitation.customPermissions.digitalMediaManagement || false,
        marketing: invitation.customPermissions.marketing || false,
        hrManagement: invitation.customPermissions.hrManagement || false,
        financeManagement: invitation.customPermissions.financeManagement || false,
        seoManagement: invitation.customPermissions.seoManagement || false,
        internalPolicies: invitation.customPermissions.internalPolicies || false,
        settingsConfiguration: invitation.customPermissions.settingsConfiguration || false
      };
    }

    await user.save();

    res.json({
      success: true,
      message: 'Successfully joined the company',
      company: {
        _id: company._id,
        companyName: company.companyName,
        industry: company.industry
      }
    });
  } catch (error) {
    console.error('Accept invitation error:', error);
    res.status(500).json({
      message: 'Server error while accepting invitation',
      error: error.message
    });
  }
});

// Remove member from company
app.delete('/api/company/members/:memberId', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { memberId } = req.params;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (!user.companyId) {
      return res.status(403).json({ message: 'You are not part of any company' });
    }

    const company = await Company.findById(user.companyId);
    if (!company) {
      return res.status(404).json({ message: 'Company not found' });
    }

    // Check if user has permission (Owner or Manager)
    const userMembership = company.members.find(m => m.user.toString() === userId);
    if (!userMembership || !['Owner', 'Manager'].includes(userMembership.roleInCompany)) {
      return res.status(403).json({
        message: 'Only company owners and managers can remove members'
      });
    }

    // Prevent removing the owner
    if (company.owner.toString() === memberId) {
      return res.status(403).json({
        message: 'Cannot remove the company owner'
      });
    }

    // Remove member from company
    const memberIndex = company.members.findIndex(m => m.user.toString() === memberId);
    if (memberIndex === -1) {
      return res.status(404).json({ message: 'Member not found in company' });
    }

    company.members.splice(memberIndex, 1);
    await company.save();

    // Remove companyId from user
    const memberUser = await User.findById(memberId);
    if (memberUser) {
      memberUser.companyId = null;
      await memberUser.save();
    }

    res.json({
      success: true,
      message: 'Member removed successfully'
    });
  } catch (error) {
    console.error('Remove member error:', error);
    res.status(500).json({
      message: 'Server error while removing member',
      error: error.message
    });
  }
});

// Update member permissions
app.put('/api/company/members/:memberId/permissions', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { memberId } = req.params;
    const { permissions } = req.body;

    // Validate permissions object
    if (!permissions || typeof permissions !== 'object') {
      return res.status(400).json({ message: 'Valid permissions object is required' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (!user.companyId) {
      return res.status(403).json({ message: 'You are not part of any company' });
    }

    const company = await Company.findById(user.companyId);
    if (!company) {
      return res.status(404).json({ message: 'Company not found' });
    }

    // Check if user has permission (Owner or Manager)
    const userMembership = company.members.find(m => m.user.toString() === userId);
    if (!userMembership || !['Owner', 'Manager'].includes(userMembership.roleInCompany)) {
      return res.status(403).json({
        message: 'Only company owners and managers can update permissions'
      });
    }

    // Check if target member exists in company
    const targetMemberInCompany = company.members.find(m => m.user.toString() === memberId);
    if (!targetMemberInCompany) {
      return res.status(404).json({ message: 'Member not found in company' });
    }

    // Prevent modifying owner permissions
    if (company.owner.toString() === memberId) {
      return res.status(403).json({
        message: 'Cannot modify company owner permissions'
      });
    }

    // Update member permissions
    const memberUser = await User.findById(memberId);
    if (!memberUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Update permissions
    memberUser.permissions = {
      dashboard: permissions.dashboard || false,
      dataCenter: permissions.dataCenter || false,
      projects: permissions.projects || false,
      teamCommunication: permissions.teamCommunication || false,
      digitalMediaManagement: permissions.digitalMediaManagement || false,
      marketing: permissions.marketing || false,
      hrManagement: permissions.hrManagement || false,
      financeManagement: permissions.financeManagement || false,
      seoManagement: permissions.seoManagement || false,
      internalPolicies: permissions.internalPolicies || false,
      settingsConfiguration: permissions.settingsConfiguration || false
    };

    await memberUser.save();

    res.json({
      success: true,
      message: 'Permissions updated successfully',
      permissions: memberUser.permissions
    });
  } catch (error) {
    console.error('Update permissions error:', error);
    res.status(500).json({
      message: 'Server error while updating permissions',
      error: error.message
    });
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
    const token = jwt.sign({ userId: user._id, fullName: user.fullName, email: user.email }, JWT_SECRET, {
      expiresIn: '24h'
    });

    // Always normalize permissions and access before sending
    const normalizedPermissions = normalizePermissions(user.permissions);
    const normalizedAccess = syncAccessFromPermissions(normalizedPermissions);

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        access: normalizedAccess,
        permissions: normalizedPermissions,
        subscription: user.subscription || { plan: 'None', status: 'inactive' },
        companyId: user.companyId // Include companyId for invited users
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
    if (!mongoConnected) {
      return res.status(503).json({
        message: 'Database connection unavailable. Please try again later.'
      });
    }

    const user = await User.findById(req.user.userId)
      .populate('companyId', 'companyName')
      .select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Always normalize permissions and access before sending
    const normalizedPermissions = normalizePermissions(user.permissions);
    const normalizedAccess = syncAccessFromPermissions(normalizedPermissions);

    // Debug: Check other users with same companyId
    if (user.companyId) {
      const companyUsers = await User.find({
        companyId: user.companyId._id || user.companyId,
        _id: { $ne: user._id }
      }).select('fullName email');
      console.log(`👥 Users with same companyId (${user.companyId._id || user.companyId}):`, companyUsers.length);
      companyUsers.forEach(u => console.log(`  - ${u.fullName} (${u.email})`));
    } else {
      console.log('⚠️ User has NO companyId:', user.email);
    }

    res.json({
      id: user._id,
      _id: user._id,
      fullName: user.fullName,
      email: user.email,
      role: user.role,
      access: normalizedAccess,
      permissions: normalizedPermissions,
      status: user.status,
      subscription: user.subscription || { plan: 'None', status: 'inactive' },
      companyId: user.companyId, // Populated with company details
      createdAt: user.createdAt,
      phoneNumber: user.phoneNumber,
      bio: user.bio,
      profileImage: user.profileImage
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Dashboard data (protected route)
app.get('/api/dashboard', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    
    // Check if user has an active subscription plan
    if (!user.subscription || user.subscription.status !== 'active' || user.subscription.plan === 'None') {
      return res.status(302).json({ 
        redirect: '/pricing'
      });
    }

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


// Get all users (protected route)
app.get('/api/users', authenticateToken, async (req, res) => {
  try {
    if (!mongoConnected) {
      return res.status(503).json({ 
        message: 'Database connection unavailable. Please try again later.' 
      });
    }

    // Add role filter if specified
    const roleFilter = req.query.role ? { role: req.query.role } : {};
    
    const users = await User.find(roleFilter)
      .select('-password')
      .sort({ createdAt: -1 })
      .lean(); // Use lean() for better performance
    
    // Process users in a single pass
    const usersWithSyncedAccess = users.map(user => {
      const normalizedPermissions = normalizePermissions(user.permissions);
      const accessArray = syncAccessFromPermissions(normalizedPermissions);
      
      return {
        ...user,
        permissions: normalizedPermissions,
        access: accessArray
      };
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

// Get available roles from MongoDB schema (protected route)
app.get('/api/roles', authenticateToken, async (req, res) => {
  try {
    // Get the available roles from the User schema enum
    const availableRoles = userSchema.paths.role.enumValues;
    
    res.json({ 
      roles: availableRoles,
      message: 'Available roles retrieved successfully'
    });
  } catch (error) {
    console.error('Get roles error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update user permissions (protected route - admin only)
app.put('/api/users/:userId/permissions', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    const body = req.body;
    console.log('Permission update request:', { userId, body });

    if (!mongoConnected) {
      return res.status(503).json({ success: false, message: 'Database connection unavailable. Please try again later.' });
    }

    const user = await User.findById(userId);
    if (!user) {
      console.log('User not found:', userId);
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Accept both { permissions: { ... } } and { key: value }
    let newPermissions = {};
    if (body.permissions && typeof body.permissions === 'object') {
      newPermissions = body.permissions;
    } else {
      newPermissions = body;
    }
    if (Object.keys(newPermissions).length === 0) {
      return res.status(400).json({ success: false, message: 'No permissions provided' });
    }

    // Only update valid permission keys
    validPermissionKeys.forEach(key => {
      if (newPermissions.hasOwnProperty(key)) {
        user.permissions[key] = newPermissions[key] === true;
      } else if (typeof user.permissions[key] === 'undefined') {
        user.permissions[key] = false;
      }
    });

    user.updatedAt = new Date();
    await user.save();
    user.permissions = normalizePermissions(user.permissions);
    console.log('Updated permissions:', user.permissions);

    res.json({ success: true, message: 'User permissions updated successfully', user: { _id: user._id, permissions: user.permissions } });
  } catch (error) {
    console.error('Error updating user permissions:', error);
    res.status(500).json({ success: false, message: 'Internal server error', error: error.message });
  }
});

// Update user role and access (protected route)
app.put('/api/users/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    let { role, access, status } = req.body;
    // Always default status to 'Active' if not provided
    if (!status) status = 'Active';

    console.log('PUT /api/users/:id - Request received:', { id, role, access, status });

    if (!mongoConnected) {
      return res.status(503).json({ 
        message: 'Database connection unavailable. Please try again later.' 
      });
    }

    const updateData = {};
    if (role) updateData.role = role;
    updateData.status = status;
    updateData.updatedAt = new Date();

    // Always sync access from permissions
    if (role) {
      const defaultPermissions = {
        dashboard: true,
        dataCenter: false,
        projects: false,
        teamCommunication: false,
        digitalMediaManagement: false,
        marketing: false,
        hrManagement: false,
        financeManagement: false,
        seoManagement: false,
        internalPolicies: false,
        settingsConfiguration: false
      };
      updateData.permissions = defaultPermissions;
      updateData.access = syncAccessFromPermissions(defaultPermissions);
    } else if (access) {
      updateData.access = Array.isArray(access) ? access : [];
    }

    const user = await User.findByIdAndUpdate(
      id, 
      updateData, 
      { new: true, runValidators: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Always normalize permissions and access before sending
    user.permissions = normalizePermissions(user.permissions);
    user.access = syncAccessFromPermissions(user.permissions);

    res.json({
      message: 'User updated successfully',
      user: user
    });
  } catch (error) {
    console.error('Update user error:', error);
    console.error('Request body:', req.body);
    console.error('Update data:', updateData);
    if (error.name === 'ValidationError') {
      console.error('Validation error details:', error.errors);
      return res.status(400).json({ message: 'Invalid data provided', details: error.errors });
    }
    res.status(500).json({ message: 'Server error' });
  }
});





// Delete user (protected route - admin only)
app.delete('/api/users/:id', authenticateToken, requireAdmin, async (req, res) => {
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

// ===== PROFILE MANAGEMENT ROUTES =====
// Get current user profile
app.get('/api/profile', authenticateToken, async (req, res) => {
  try {
    if (!mongoConnected) {
      return res.status(503).json({
        message: 'Database connection unavailable. Please try again later.'
      });
    }

    const user = await User.findById(req.user.userId)
      .populate('companyId', 'companyName')
      .select('-password');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({ user });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update user profile (own profile)
app.put('/api/profile', authenticateToken, async (req, res) => {
  try {
    const { fullName, username, phoneNumber, bio, email } = req.body;

    if (!mongoConnected) {
      return res.status(503).json({
        message: 'Database connection unavailable. Please try again later.'
      });
    }

    // Build update object with only allowed fields
    const updateData = {
      updatedAt: new Date()
    };

    if (fullName !== undefined) updateData.fullName = fullName;
    if (username !== undefined) updateData.username = username;
    if (phoneNumber !== undefined) updateData.phoneNumber = phoneNumber;
    if (bio !== undefined) updateData.bio = bio;
    if (email !== undefined) {
      // Check if email is already taken by another user
      const existingUser = await User.findOne({
        email,
        _id: { $ne: req.user.userId }
      });
      if (existingUser) {
        return res.status(400).json({ message: 'Email already in use' });
      }
      updateData.email = email;
    }

    const user = await User.findByIdAndUpdate(
      req.user.userId,
      updateData,
      { new: true, runValidators: true }
    )
      .populate('companyId', 'companyName')
      .select('-password');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({
      message: 'Profile updated successfully',
      user
    });
  } catch (error) {
    console.error('Update profile error:', error);
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        message: 'Invalid data provided',
        details: error.errors
      });
    }
    res.status(500).json({ message: 'Server error' });
  }
});

// Upload profile image (file upload)
app.post('/api/upload/avatar', authenticateToken, avatarUpload.single('avatar'), async (req, res) => {
  try {
    if (!mongoConnected) {
      return res.status(503).json({
        success: false,
        message: 'Database connection unavailable. Please try again later.'
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No image file provided'
      });
    }

    if (!s3Client) {
      return res.status(500).json({
        success: false,
        message: 'Avatar storage is not configured'
      });
    }

    if (!avatarAccessKey || !avatarSecretKey) {
      return res.status(500).json({
        success: false,
        message: 'Missing avatar storage credentials'
      });
    }

    const extension = path.extname(req.file.originalname || '').toLowerCase();
    const safeExtension = extension && extension.length <= 5 ? extension : '.jpg';
    const objectKey = `avatars/${req.user.userId}-${Date.now()}${safeExtension}`;

    const uploadParams = {
      Bucket: avatarBucket,
      Key: objectKey,
      Body: req.file.buffer,
      ContentType: req.file.mimetype
    };

    await s3Client.send(new PutObjectCommand(uploadParams));

    const imageUrl = getAvatarPublicUrl(objectKey);

    const user = await User.findByIdAndUpdate(
      req.user.userId,
      {
        profileImage: imageUrl,
        updatedAt: new Date()
      },
      { new: true, runValidators: true }
    )
      .populate('companyId', 'companyName')
      .select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      message: 'Avatar uploaded successfully',
      imageUrl,
      user
    });
  } catch (error) {
    console.error('Avatar upload error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while uploading avatar',
      error: error.message
    });
  }
});

app.post('/api/profile/upload-image', authenticateToken, upload.single('profileImage'), async (req, res) => {
  try {
    if (!mongoConnected) {
      return res.status(503).json({
        success: false,
        message: 'Database connection unavailable. Please try again later.'
      });
    }

    if (!req.file) {
      return res.status(400).json({ 
        success: false,
        message: 'No image file provided' 
      });
    }

    // Generate the URL for the uploaded image
    const imageUrl = `/uploads/profile-images/${req.file.filename}`;

    // Update user's profile image in database
    const user = await User.findByIdAndUpdate(
      req.user.userId,
      {
        profileImage: imageUrl,
        updatedAt: new Date()
      },
      { new: true, runValidators: true }
    )
      .populate('companyId', 'companyName')
      .select('-password');

    if (!user) {
      return res.status(404).json({ 
        success: false,
        message: 'User not found' 
      });
    }

    res.json({
      success: true,
      message: 'Profile image uploaded successfully',
      imageUrl: imageUrl,
      profileImage: imageUrl,
      user
    });
  } catch (error) {
    console.error('Upload profile image error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error while uploading image',
      error: error.message 
    });
  }
});

// Update profile picture
app.put('/api/profile/picture', authenticateToken, async (req, res) => {
  try {
    const { profileImage } = req.body;

    if (!mongoConnected) {
      return res.status(503).json({
        message: 'Database connection unavailable. Please try again later.'
      });
    }

    if (!profileImage) {
      return res.status(400).json({ message: 'Profile image is required' });
    }

    // Validate base64 image (optional - basic check)
    if (!profileImage.startsWith('data:image/')) {
      return res.status(400).json({ message: 'Invalid image format' });
    }

    const user = await User.findByIdAndUpdate(
      req.user.userId,
      {
        profileImage,
        updatedAt: new Date()
      },
      { new: true, runValidators: true }
    )
      .populate('companyId', 'companyName')
      .select('-password');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({
      message: 'Profile picture updated successfully',
      user
    });
  } catch (error) {
    console.error('Update profile picture error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete profile picture
app.delete('/api/profile/picture', authenticateToken, async (req, res) => {
  try {
    if (!mongoConnected) {
      return res.status(503).json({
        message: 'Database connection unavailable. Please try again later.'
      });
    }

    const user = await User.findByIdAndUpdate(
      req.user.userId,
      {
        profileImage: null,
        updatedAt: new Date()
      },
      { new: true }
    )
      .populate('companyId', 'companyName')
      .select('-password');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({
      message: 'Profile picture removed successfully',
      user
    });
  } catch (error) {
    console.error('Delete profile picture error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Change password
app.put('/api/profile/password', authenticateToken, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!mongoConnected) {
      return res.status(503).json({
        message: 'Database connection unavailable. Please try again later.'
      });
    }

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        message: 'Current password and new password are required'
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        message: 'New password must be at least 6 characters long'
      });
    }

    // Get user with password
    const user = await User.findById(req.user.userId);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Verify current password
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Current password is incorrect' });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password
    user.password = hashedPassword;
    user.updatedAt = new Date();
    await user.save();

    res.json({
      message: 'Password changed successfully'
    });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// ===== NOXTM MAIL ROUTES =====
// Initialize Noxtm Mail routes with dependencies
const noxtmMailRoutes = require('./routes/noxtm-mail');
const noxtmMail = noxtmMailRoutes.initializeRoutes({
  EmailLog,
  authenticateToken,
  requireAdmin
});
app.use('/api/noxtm-mail', noxtmMail);

// ===== MESSAGING ROUTES =====
// Initialize Messaging routes with dependencies
const messagingRoutes = require('./routes/messaging');
const messaging = messagingRoutes.initializeRoutes({
  User,
  Company,
  Conversation,
  Message,
  authenticateToken,
  requireCompanyAccess,
  io // Pass Socket.IO instance for real-time messaging
});
app.use('/api/messaging', messaging);

// ===== EXTENSION AUTHENTICATION ROUTES =====
// No authentication middleware - these routes handle their own auth
app.use('/api/auth/extension', extensionAuthRoutes);

// ===== EMAIL MANAGEMENT ROUTES =====
const emailAccountsRoutes = require('./routes/email-accounts');
const emailDomainsRoutes = require('./routes/email-domains');
const emailTemplatesRoutes = require('./routes/email-templates');
const emailLogsRoutes = require('./routes/email-logs');
const auditLogsRoutes = require('./routes/audit-logs');

// AWS SES User Verified Domains (SaaS "Bring Your Own Domain")
const userVerifiedDomainsRoutes = require('./routes/user-verified-domains');

// Apply authentication middleware to all email management routes
app.use('/api/email-accounts', authenticateToken, emailAccountsRoutes);
app.use('/api/email-domains', authenticateToken, emailDomainsRoutes);
app.use('/api/email-templates', authenticateToken, emailTemplatesRoutes);
app.use('/api/email-logs', authenticateToken, emailLogsRoutes);
app.use('/api/audit-logs', authenticateToken, auditLogsRoutes);

// AWS SES User Domain Management (with built-in rate limiting)
app.use('/api/user-domains', authenticateToken, userVerifiedDomainsRoutes);

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
async function gracefulShutdown(signal) {
  try {
    console.log(`🛑 ${signal} received, shutting down gracefully`);
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.close();
      console.log('📦 MongoDB connection closed');
    } else {
      console.log('� MongoDB was not connected (state:', mongoose.connection.readyState, ')');
    }
    process.exit(0);
  } catch (err) {
    console.error('Error during graceful shutdown:', err);
    process.exit(1);
  }
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

server.listen(PORT, () => {
  console.log('='.repeat(50));
  console.log(`🚀 Noxtm Studio Backend Server Started`);
  console.log('='.repeat(50));
  console.log(`🌐 Server running on port: ${PORT}`);
  console.log(`📡 API endpoints: http://noxtm.com/api`);
  console.log(`🔍 Health check: http://noxtm.com/api/health`);
  console.log(`🌐 MongoDB status: ${mongoConnected ? '✅ Connected' : '❌ Disconnected'}`);
  console.log(`🔐 JWT Secret: ${process.env.JWT_SECRET ? '✅ Set' : '⚠️  Using fallback'}`);
  console.log(`🏗️  Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`💬 Socket.IO: ✅ Enabled for real-time messaging`);
  console.log('='.repeat(50));
});
