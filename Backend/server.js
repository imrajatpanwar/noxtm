const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const path = require('path');
const multer = require('multer');
const fs = require('fs');
const nodemailer = require('nodemailer');
const emailRoutes = require('./routes/email');
const http = require('http');
const { Server } = require('socket.io');
require('dotenv').config();

const app = express();
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
    methods: ['GET', 'POST']
  }
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

// Email routes
app.use('/api/email', emailRoutes);

// Backend API only - frontend served separately
// Comment out static file serving since frontend runs on different port
// app.use(express.static(path.join(__dirname, '../Frontend/build')));

// MongoDB Connection with timeout and fallback
let mongoConnected = false;

const connectWithTimeout = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/noxtm';
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
  fullName: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, required: true, default: 'User' },
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
    roleInCompany: { type: String, enum: ['Owner', 'Admin', 'Member'], default: 'Member' },
    invitedAt: { type: Date, default: Date.now },
    joinedAt: { type: Date }
  }],
  invitations: [{
    email: { type: String, required: true },
    token: { type: String, required: true, unique: true },
    roleInCompany: { type: String, enum: ['Admin', 'Member'], default: 'Member' },
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

// Scraped Data Schema (Botgit integration)
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

// Conversation Schema (for messaging system)
const conversationSchema = new mongoose.Schema({
  companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
  name: { type: String }, // For group chats
  type: { type: String, enum: ['direct', 'group'], required: true },
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
  readBy: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    readAt: { type: Date, default: Date.now }
  }],
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
  // SoloHQ subscription plan: Only BOTGIT (projects), PROJECTS, and PROFILE access
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
    const uploadDir = path.join(__dirname, 'uploads', 'blog-images');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'blog-' + uniqueSuffix + path.extname(file.originalname));
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

// ===== SCRAPED DATA (BOTGIT) API ROUTES =====

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
app.post('/api/send-verification-code', async (req, res) => {
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

    // Configure nodemailer for local Postfix (no auth needed)
    const transportConfig = {
      host: process.env.EMAIL_HOST,
      port: parseInt(process.env.EMAIL_PORT) || 25,
      secure: false,
      tls: {
        rejectUnauthorized: false
      }
    };

    // Only add auth if credentials are provided
    if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
      transportConfig.auth = {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      };
    }

    const transporter = nodemailer.createTransport(transportConfig);

    // Send email
    const mailOptions = {
      from: `"Noxtm" <${process.env.EMAIL_FROM}>`,
      to: email,
      subject: 'Verify Your Email - Noxtm',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Welcome to Noxtm!</h2>
          <p>Hi ${fullName},</p>
          <p>Thank you for signing up. Please use the verification code below to complete your registration:</p>
          <div style="background-color: #f4f4f4; padding: 20px; text-align: center; margin: 20px 0;">
            <h1 style="color: #007bff; letter-spacing: 5px; margin: 0;">${verificationCode}</h1>
          </div>
          <p>This code will expire in 10 minutes.</p>
          <p>If you didn't request this, please ignore this email.</p>
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #ddd;">
          <p style="color: #666; font-size: 12px;">© 2025 Noxtm. All rights reserved.</p>
        </div>
      `
    };

    try {
      const info = await transporter.sendMail(mailOptions);
      console.log('✅ Email sent successfully:', info.messageId);

      res.status(200).json({
        success: true,
        message: 'Verification code sent to your email',
        email: email
      });
    } catch (mailError) {
      console.error('❌ Failed to send email:', mailError);
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
app.post('/api/forgot-password', async (req, res) => {
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

    // Configure nodemailer
    const transportConfig = {
      host: process.env.EMAIL_HOST,
      port: parseInt(process.env.EMAIL_PORT) || 25,
      secure: false,
      tls: {
        rejectUnauthorized: false
      }
    };

    if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
      transportConfig.auth = {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      };
    }

    const transporter = nodemailer.createTransport(transportConfig);

    // Send email
    const mailOptions = {
      from: `"Noxtm" <${process.env.EMAIL_FROM}>`,
      to: email,
      subject: 'Password Reset Code - Noxtm',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Password Reset Request</h2>
          <p>Hi ${user.fullName},</p>
          <p>You requested to reset your password. Please use the verification code below:</p>
          <div style="background-color: #f4f4f4; padding: 20px; text-align: center; margin: 20px 0;">
            <h1 style="color: #007bff; letter-spacing: 5px; margin: 0;">${resetCode}</h1>
          </div>
          <p>This code will expire in 10 minutes.</p>
          <p>If you didn't request this, please ignore this email and your password will remain unchanged.</p>
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #ddd;">
          <p style="color: #666; font-size: 12px;">© 2025 Noxtm. All rights reserved.</p>
        </div>
      `
    };

    try {
      const info = await transporter.sendMail(mailOptions);
      console.log('✅ Password reset email sent:', info.messageId);

      res.status(200).json({
        success: true,
        message: 'If an account exists with this email, a password reset code has been sent.',
        email: email
      });
    } catch (mailError) {
      console.error('❌ Failed to send email:', mailError);
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

    // Update user password
    user.password = hashedPassword;
    user.updatedAt = Date.now();
    await user.save();

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

    const user = await User.findById(req.user.userId).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Always normalize permissions and access before sending
    const normalizedPermissions = normalizePermissions(user.permissions);
    const normalizedAccess = syncAccessFromPermissions(normalizedPermissions);

    // Debug: Check other users with same companyId
    if (user.companyId) {
      const companyUsers = await User.find({
        companyId: user.companyId,
        _id: { $ne: user._id }
      }).select('fullName email');
      console.log(`👥 Users with same companyId (${user.companyId}):`, companyUsers.length);
      companyUsers.forEach(u => console.log(`  - ${u.fullName} (${u.email})`));
    } else {
      console.log('⚠️ User has NO companyId:', user.email);
    }

    res.json({
      id: user._id,
      fullName: user.fullName,
      email: user.email,
      role: user.role,
      access: normalizedAccess,
      permissions: normalizedPermissions,
      status: user.status,
      subscription: user.subscription || { plan: 'None', status: 'inactive' },
      companyId: user.companyId, // Include companyId for invited users
      createdAt: user.createdAt
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

// ===== NOXTM MAIL ROUTES =====
// Initialize Noxtm Mail routes with dependencies
const noxtmMailRoutes = require('./routes/noxtm-mail');
const noxtmMail = noxtmMailRoutes.initializeRoutes({
  EmailLog,
  authenticateToken,
  requireAdmin
});
app.use('/api/noxtm-mail', noxtmMail);

// ===== WEBMAIL ROUTES =====
// Initialize Webmail routes with dependencies
const webmailRoutes = require('./routes/webmail');
const webmail = webmailRoutes.initializeRoutes({
  authenticateToken
});
app.use('/api/webmail', webmail);

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
