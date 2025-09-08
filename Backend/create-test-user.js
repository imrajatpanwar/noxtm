const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// User Schema (same as in server.js)
const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { 
    type: String, 
    required: true, 
    default: 'Web Developer',
    enum: [
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

const User = mongoose.model('User', userSchema);

async function createTestUser() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/noxtmstudio', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    
    console.log('Connected to MongoDB');

    // Check if admin user already exists
    const existingAdmin = await User.findOne({ email: 'admin@noxtmstudio.com' });
    if (existingAdmin) {
      console.log('Admin user already exists');
      await mongoose.connection.close();
      return;
    }

    // Create admin user
    const hashedPassword = await bcrypt.hash('admin123', 10);
    
    const adminUser = new User({
      username: 'Admin User',
      email: 'admin@noxtmstudio.com',
      password: hashedPassword,
      role: 'Admin',
      access: ['Data Cluster', 'Projects', 'Finance', 'Digital Media', 'Marketing'],
      status: 'Active'
    });

    await adminUser.save();
    console.log('Admin user created successfully!');
    console.log('Login credentials:');
    console.log('Email: admin@noxtmstudio.com');
    console.log('Password: admin123');

    // Create a regular user for testing
    const testUser = new User({
      username: 'Test User',
      email: 'test@noxtmstudio.com',
      password: await bcrypt.hash('test123', 10),
      role: 'Web Developer',
      access: ['Projects'],
      status: 'Active'
    });

    await testUser.save();
    console.log('Test user created successfully!');
    console.log('Login credentials:');
    console.log('Email: test@noxtmstudio.com');
    console.log('Password: test123');

  } catch (error) {
    console.error('Error creating test users:', error);
  } finally {
    await mongoose.connection.close();
    console.log('Database connection closed');
  }
}

createTestUser();
