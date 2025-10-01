const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const path = require('path');
const multer = require('multer');
const fs = require('fs');
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
    'http://noxtm.com',
    'https://noxtm.com',
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
      .populate('author', 'username')
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
      .populate('author', 'username');
    
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
      .populate('author', 'username');
    
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
      .populate('author', 'username');
    
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
      .populate('author', 'username')
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
      // Simplified: Only give Dashboard access for all roles
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
    };

    // Get default access array based on permissions
    const getDefaultAccess = (permissions) => {
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

    // Always normalize permissions and access before sending
    const normalizedPermissions = normalizePermissions(user.permissions);
    const normalizedAccess = syncAccessFromPermissions(normalizedPermissions);

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        access: normalizedAccess,
        permissions: normalizedPermissions
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

    res.json({
      id: user._id,
      username: user.username,
      email: user.email,
      role: user.role,
      access: normalizedAccess,
      permissions: normalizedPermissions,
      status: user.status,
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

    // Always normalize permissions and access before sending
    const normalizedPermissions = normalizePermissions(user.permissions);
    const normalizedAccess = syncAccessFromPermissions(normalizedPermissions);

    res.json({
      id: user._id,
      username: user.username,
      email: user.email,
      role: user.role,
      access: normalizedAccess,
      permissions: normalizedPermissions,
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
      user.permissions = normalizePermissions(user.permissions);
      const accessArray = [];
      if (user.permissions.dashboard) accessArray.push('Dashboard');
      if (user.permissions.dataCenter) accessArray.push('Data Center');
      if (user.permissions.projects) accessArray.push('Projects');
      if (user.permissions.teamCommunication) accessArray.push('Team Communication');
      if (user.permissions.digitalMediaManagement) accessArray.push('Digital Media Management');
      if (user.permissions.marketing) accessArray.push('Marketing');
      if (user.permissions.hrManagement) accessArray.push('HR Management');
      if (user.permissions.financeManagement) accessArray.push('Finance Management');
      if (user.permissions.seoManagement) accessArray.push('SEO Management');
      if (user.permissions.internalPolicies) accessArray.push('Internal Policies');
      if (user.permissions.settingsConfiguration) accessArray.push('Settings & Configuration');
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
  console.log(`📡 API endpoints: http://noxtm.com/api`);
  console.log(`🔍 Health check: http://noxtm.com/api/health`);
  console.log(`🌐 MongoDB status: ${mongoConnected ? '✅ Connected' : '❌ Disconnected'}`);
  console.log(`🔐 JWT Secret: ${process.env.JWT_SECRET ? '✅ Set' : '⚠️  Using fallback'}`);
  console.log(`🏗️  Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log('='.repeat(50));
});
